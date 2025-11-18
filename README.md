# dosmundos-web

Веб‑приложение (Vite + React) для Dos Mundos, с интеграцией Supabase. Репозиторий подготовлен для деплоя на VPS напрямую из GitHub.

## Структура

- `src/`, `public/` — фронтенд (Vite + React)
- Конфигурация: `package.json`, `vite.config.js`, `postcss.config.js`, `tailwind.config.js`

## Требования

- Node.js 18+

## Работа

```bash
npm install
npm run dev        # разработка
npm run build      # production-сборка
npm run preview    # просмотр сборки
```

## Переменные окружения

Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Деплой на VPS из GitHub Actions

В репозитории добавлен workflow `.github/workflows/deploy.yml`, который:
- собирает проект (`npm ci && npm run build`)
- заливает содержимое `dist/` на ваш VPS по SSH

Необходимые секреты репозитория (Settings → Secrets and variables → Actions):
- `VPS_HOST`: хост/IP
- `VPS_USER`: SSH пользователь
- `VPS_SSH_KEY`: приватный ключ (PEM) с доступом к серверу
- `VPS_PATH`: путь на сервере, куда копировать (например `/var/www/dosmundos-web`)
- `VPS_PORT` (опционально): порт SSH (по умолчанию 22)

VPS должен обслуживать статические файлы из `VPS_PATH` (например, через Nginx). После первого деплоя настройте виртуальный хост домена на этот каталог.


