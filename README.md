# Mellow Sales Simulator v1

Первая рабочая web-версия Mellow Sales Simulator. Сейчас поддерживает 8 buyer personas: Андрей, Алексей, CFO before fundraising, champion / Engineering Manager, Ops Manager, Head of Finance, internal legal, external legal.

## Что внутри
- web UI: выбор персоны → SDE-card → диалог → assessment
- backend на Node.js + Express
- хранение сессий в `data/sessions/*.json`
- 8 buyer personas, сведённых к 3 рабочим archetypes: finance, ops/champion, legal
- детерминированная roleplay-логика без внешних LLM
- единый assessment по 5 критериям

## Локальный запуск
```bash
cd mellow-sales-sim
npm install
npm start
```

Приложение поднимется на `http://localhost:3210`.

## Структура
- `server.js` — API, сессии, roleplay logic, assessment
- `public/` — frontend
- `data/sessions/` — сохранённые прогоны

## Замечание по v1
Это сознательно узкая первая версия: без auth, без CRM, без history UI, без внешнего LLM runtime. Зато один полный run до assessment реально работает и доступен по web URL после публикации.
