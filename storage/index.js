import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

let pgModulePromise = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

async function loadPgModule() {
  if (!pgModulePromise) pgModulePromise = import('pg');
  return pgModulePromise;
}

function resolvePostgresConnection() {
  const connectionString = process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.POSTGRES_URL_NON_POOLING
    || '';
  const source = process.env.DATABASE_URL
    ? 'DATABASE_URL'
    : process.env.POSTGRES_URL
    ? 'POSTGRES_URL'
    : process.env.POSTGRES_PRISMA_URL
    ? 'POSTGRES_PRISMA_URL'
    : process.env.POSTGRES_URL_NON_POOLING
    ? 'POSTGRES_URL_NON_POOLING'
    : null;
  return { connectionString, source };
}

function shouldUsePostgresSsl(connectionString) {
  if (!connectionString) return false;
  try {
    const url = new URL(connectionString);
    if (url.searchParams.get('sslmode') === 'disable') return false;
    return !['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return !/localhost|127\.0\.0\.1/.test(connectionString);
  }
}

function createFileStorage({ dataDir, sessionsDir, personasFile }) {
  return {
    driver: 'file',
    async init() {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.mkdirSync(sessionsDir, { recursive: true });
    },
    async loadPersonas({ seedFactory }) {
      const parsed = readJson(personasFile);
      if (parsed && typeof parsed === 'object') return parsed;
      const seeded = seedFactory();
      writeJson(personasFile, seeded);
      return seeded;
    },
    async savePersonas(personas) {
      writeJson(personasFile, personas);
      return personas;
    },
    async loadSession(sessionId) {
      return readJson(path.join(sessionsDir, `${sessionId}.json`));
    },
    async saveSession(session) {
      writeJson(path.join(sessionsDir, `${session.session_id}.json`), session);
      return session;
    },
    async listSessions() {
      if (!fs.existsSync(sessionsDir)) return [];
      return fs.readdirSync(sessionsDir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => readJson(path.join(sessionsDir, name)))
        .filter(Boolean);
    },
    sessionFilePath(sessionId) {
      return path.join(sessionsDir, `${sessionId}.json`);
    },
    async getInfo() {
      return {
        driver: 'file',
        persistence: 'local-json',
        sessions_dir: sessionsDir,
        personas_file: personasFile,
      };
    }
  };
}

function createPostgresStorage(config = {}) {
  const resolved = resolvePostgresConnection();
  const state = {
    pool: null,
    migrations: [],
    initialized: false,
    bootstrapped: false,
    connectionString: resolved.connectionString,
    connectionSource: resolved.source,
  };

  function bootstrapEnabled() {
    return String(process.env.POSTGRES_BOOTSTRAP_FROM_FILE || 'true').trim().toLowerCase() !== 'false';
  }

  async function getPool() {
    if (state.pool) return state.pool;
    if (!state.connectionString) {
      throw new Error('STORAGE_DRIVER=postgres requires DATABASE_URL or one of POSTGRES_URL / POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING.');
    }

    if (globalThis.__mellowSalesSimPgPool) {
      state.pool = globalThis.__mellowSalesSimPgPool;
      return state.pool;
    }

    const { Pool } = await loadPgModule();
    const ssl = shouldUsePostgresSsl(state.connectionString)
      ? { rejectUnauthorized: String(process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED || 'false').trim().toLowerCase() === 'true' }
      : false;

    state.pool = new Pool({
      connectionString: state.connectionString,
      ssl,
      max: Math.max(1, Number(process.env.PG_POOL_MAX || 3)),
      idleTimeoutMillis: Math.max(1000, Number(process.env.PG_IDLE_TIMEOUT_MS || 10000)),
      connectionTimeoutMillis: Math.max(1000, Number(process.env.PG_CONNECT_TIMEOUT_MS || 5000)),
      allowExitOnIdle: true,
    });
    globalThis.__mellowSalesSimPgPool = state.pool;
    return state.pool;
  }

  async function withClient(fn) {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }

  async function ensureMigrationTable(client) {
    await client.query(`
      create table if not exists storage_migrations (
        migration_id text primary key,
        applied_at timestamptz not null default now()
      )
    `);
  }

  async function loadMigrationState(client) {
    const result = await client.query('select migration_id, applied_at from storage_migrations order by migration_id asc');
    state.migrations = result.rows.map((row) => ({
      migration_id: row.migration_id,
      applied_at: row.applied_at,
    }));
    return new Set(state.migrations.map((row) => row.migration_id));
  }

  async function applyMigrations() {
    await withClient(async (client) => {
      await ensureMigrationTable(client);
      const applied = await loadMigrationState(client);
      const files = fs.existsSync(migrationsDir)
        ? fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()
        : [];

      for (const fileName of files) {
        if (applied.has(fileName)) continue;
        const sql = fs.readFileSync(path.join(migrationsDir, fileName), 'utf8').trim();
        if (!sql) continue;
        await client.query('begin');
        try {
          await client.query(sql);
          await client.query('insert into storage_migrations (migration_id) values ($1)', [fileName]);
          await client.query('commit');
          applied.add(fileName);
        } catch (error) {
          await client.query('rollback');
          throw new Error(`Failed to apply migration ${fileName}: ${error.message}`);
        }
      }

      await loadMigrationState(client);
    });
  }

  async function upsertRuntimeMeta(client, key, value) {
    await client.query(`
      insert into storage_runtime_meta (meta_key, meta_value, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (meta_key) do update
      set meta_value = excluded.meta_value,
          updated_at = now()
    `, [key, JSON.stringify(value)]);
  }

  async function upsertPersona(client, persona) {
    const payload = clone(persona);
    await client.query(`
      insert into personas (id, name, role, archetype, tone, payload, created_at, updated_at)
      values ($1, $2, $3, $4, $5, $6::jsonb, now(), now())
      on conflict (id) do update
      set name = excluded.name,
          role = excluded.role,
          archetype = excluded.archetype,
          tone = excluded.tone,
          payload = excluded.payload,
          updated_at = now()
    `, [
      payload.id,
      payload.name || payload.id,
      payload.role || payload.name || payload.id,
      payload.archetype || 'custom',
      payload.tone || 'balanced',
      JSON.stringify(payload),
    ]);
  }

  async function upsertSession(client, session) {
    const payload = clone(session);
    await client.query(`
      insert into sales_sessions (
        session_id,
        persona_id,
        status,
        started_at,
        finished_at,
        payload,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, now(), now())
      on conflict (session_id) do update
      set persona_id = excluded.persona_id,
          status = excluded.status,
          started_at = excluded.started_at,
          finished_at = excluded.finished_at,
          payload = excluded.payload,
          updated_at = now()
    `, [
      payload.session_id,
      payload.bot_id || payload.persona_id || 'unknown',
      payload.status || 'in_progress',
      payload.started_at || null,
      payload.finished_at || null,
      JSON.stringify(payload),
    ]);
  }

  async function tableCount(tableName) {
    const pool = await getPool();
    const result = await pool.query(`select count(*)::int as count from ${tableName}`);
    return result.rows[0]?.count || 0;
  }

  async function bootstrapIfNeeded() {
    if (state.bootstrapped || !bootstrapEnabled()) return;

    const [personaCount, sessionCount] = await Promise.all([
      tableCount('personas'),
      tableCount('sales_sessions'),
    ]);

    const shouldImportPersonas = personaCount === 0;
    const shouldImportSessions = sessionCount === 0;
    if (!shouldImportPersonas && !shouldImportSessions) {
      state.bootstrapped = true;
      return;
    }

    const filePersonas = readJson(config.personasFile);
    const sessionFiles = fs.existsSync(config.sessionsDir)
      ? fs.readdirSync(config.sessionsDir).filter((name) => name.endsWith('.json')).sort()
      : [];

    await withClient(async (client) => {
      await client.query('begin');
      try {
        if (shouldImportPersonas && filePersonas && typeof filePersonas === 'object') {
          const personaEntries = Array.isArray(filePersonas)
            ? filePersonas.map((persona) => [persona.id, persona])
            : Object.entries(filePersonas);
          for (const [, persona] of personaEntries) {
            if (persona?.id) await upsertPersona(client, persona);
          }
        }

        if (shouldImportSessions) {
          for (const fileName of sessionFiles) {
            const session = readJson(path.join(config.sessionsDir, fileName));
            if (session?.session_id) await upsertSession(client, session);
          }
        }

        await upsertRuntimeMeta(client, 'bootstrap', {
          enabled: true,
          imported_personas: shouldImportPersonas,
          imported_sessions: shouldImportSessions,
          persona_file_present: Boolean(filePersonas),
          session_file_count: sessionFiles.length,
        });

        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    });

    state.bootstrapped = true;
  }

  async function ensureReady() {
    if (state.initialized) return;
    await applyMigrations();
    await bootstrapIfNeeded();
    await withClient((client) => upsertRuntimeMeta(client, 'storage_driver', {
      driver: 'postgres',
      connection_source: state.connectionSource,
      bootstrap_from_file: bootstrapEnabled(),
    }));
    state.initialized = true;
  }

  return {
    driver: 'postgres',
    config: clone(config),
    async init() {
      await ensureReady();
    },
    async loadPersonas({ seedFactory }) {
      await ensureReady();
      const pool = await getPool();
      const result = await pool.query('select payload from personas order by id asc');
      if (result.rowCount > 0) {
        return Object.fromEntries(result.rows.map((row) => [row.payload.id, row.payload]));
      }

      const seeded = seedFactory ? seedFactory() : {};
      if (seeded && Object.keys(seeded).length > 0) {
        await this.savePersonas(seeded);
      }
      return seeded;
    },
    async savePersonas(personas) {
      await ensureReady();
      const sourceEntries = Array.isArray(personas)
        ? personas.map((persona) => [persona.id, persona])
        : Object.entries(personas || {});
      const ids = sourceEntries.map(([id, persona]) => String(id || persona?.id || '')).filter(Boolean);

      await withClient(async (client) => {
        await client.query('begin');
        try {
          if (ids.length > 0) {
            await client.query('delete from personas where not (id = any($1::text[]))', [ids]);
          } else {
            await client.query('delete from personas');
          }

          for (const [id, persona] of sourceEntries) {
            const payload = persona && typeof persona === 'object' ? { ...persona, id: persona.id || id } : null;
            if (payload?.id) await upsertPersona(client, payload);
          }

          await client.query('commit');
        } catch (error) {
          await client.query('rollback');
          throw error;
        }
      });

      return personas;
    },
    async loadSession(sessionId) {
      await ensureReady();
      const pool = await getPool();
      const result = await pool.query('select payload from sales_sessions where session_id = $1', [sessionId]);
      if (result.rowCount > 0) return result.rows[0].payload;

      const fileBacked = readJson(path.join(config.sessionsDir, `${sessionId}.json`));
      if (fileBacked?.session_id && bootstrapEnabled()) {
        await this.saveSession(fileBacked);
        return fileBacked;
      }
      return null;
    },
    async saveSession(session) {
      await ensureReady();
      const pool = await getPool();
      await upsertSession(pool, session);
      return session;
    },
    async listSessions() {
      await ensureReady();
      const pool = await getPool();
      const result = await pool.query(`
        select payload
        from sales_sessions
        order by coalesce(finished_at, started_at, created_at) desc, session_id desc
      `);
      return result.rows.map((row) => row.payload).filter(Boolean);
    },
    sessionFilePath(sessionId) {
      return path.join(config.sessionsDir || '', `${sessionId}.json`);
    },
    async getInfo() {
      await ensureReady();
      const pool = await getPool();
      const meta = await pool.query('select meta_key, meta_value, updated_at from storage_runtime_meta order by meta_key asc');
      return {
        driver: 'postgres',
        persistence: 'postgres-jsonb',
        connection_source: state.connectionSource,
        migrations: state.migrations.map((entry) => entry.migration_id),
        bootstrap_from_file: bootstrapEnabled(),
        runtime_meta: meta.rows.map((row) => ({
          key: row.meta_key,
          value: row.meta_value,
          updated_at: row.updated_at,
        })),
      };
    }
  };
}

export function createStorage(config) {
  const driver = String(process.env.STORAGE_DRIVER || 'file').trim().toLowerCase();
  if (driver === 'postgres') return createPostgresStorage(config);
  return createFileStorage(config);
}
