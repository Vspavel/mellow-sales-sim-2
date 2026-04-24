import fs from 'fs';
import path from 'path';

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

function createFileStorage({ dataDir, sessionsDir, personasFile }) {
  return {
    driver: 'file',
    init() {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.mkdirSync(sessionsDir, { recursive: true });
    },
    loadPersonas({ seedFactory }) {
      const parsed = readJson(personasFile);
      if (parsed && typeof parsed === 'object') return parsed;
      const seeded = seedFactory();
      writeJson(personasFile, seeded);
      return seeded;
    },
    savePersonas(personas) {
      writeJson(personasFile, personas);
      return personas;
    },
    loadSession(sessionId) {
      return readJson(path.join(sessionsDir, `${sessionId}.json`));
    },
    saveSession(session) {
      writeJson(path.join(sessionsDir, `${session.session_id}.json`), session);
      return session;
    },
    listSessions() {
      if (!fs.existsSync(sessionsDir)) return [];
      return fs.readdirSync(sessionsDir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => readJson(path.join(sessionsDir, name)))
        .filter(Boolean);
    },
    sessionFilePath(sessionId) {
      return path.join(sessionsDir, `${sessionId}.json`);
    }
  };
}

function createPostgresScaffoldStorage(config = {}) {
  const baseMessage = 'STORAGE_DRIVER=postgres is scaffolded but not fully wired yet. Add the pg client and implement the SQL adapter before enabling it in production.';
  return {
    driver: 'postgres',
    config: clone(config),
    init() {
      throw new Error(baseMessage);
    },
    loadPersonas() {
      throw new Error(baseMessage);
    },
    savePersonas() {
      throw new Error(baseMessage);
    },
    loadSession() {
      throw new Error(baseMessage);
    },
    saveSession() {
      throw new Error(baseMessage);
    },
    listSessions() {
      throw new Error(baseMessage);
    },
    sessionFilePath(sessionId) {
      return path.join(config.sessionsDir || '', `${sessionId}.json`);
    }
  };
}

export function createStorage(config) {
  const driver = String(process.env.STORAGE_DRIVER || 'file').trim().toLowerCase();
  if (driver === 'postgres') return createPostgresScaffoldStorage(config);
  return createFileStorage(config);
}
