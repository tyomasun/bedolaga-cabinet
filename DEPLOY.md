# Deploy bedolaga-cabinet для TrustNet

Канонический service ID — `app.cabinet`. Host alias, endpoint и production path находятся в [infra inventory](../infra/inventory.yaml), общая политика — в [operations](../infra/operations.md).

## Правила

- Рабочая ветка кастомизации — `trustnet-custom`; чистый upstream напрямую не деплоить.
- Не переключать ветку и не обновлять upstream при незакоммиченных правках.
- Vite вшивает `VITE_*` в public JS: секреты в build variables запрещены.
- До замены production обязателен timestamped backup, после — health-check, smoke-test и готовый rollback.
- Подключаться через OpenSSH alias `app`, подготовленный по [access guide](../infra/access/README.md); PuTTY registry и пользовательский путь к ключу не требуются.

## Подготовка исходников

Из каталога `bedolaga-cabinet`:

```text
git status --short --branch
git log --oneline -5
```

Если требуется upstream update, сначала обновить `main`, затем вручную merge в `trustnet-custom`. Конфликты разрешить до сборки и повторно проверить локальные TrustNet-кастомизации. Деплоить только понятное, проверенное состояние working tree.

Build-time конфигурация задаётся локальным, некоммитимым `.env.production`. Для текущей схемы API prefix — `/api`; значения branding/referral/bot username сверять с владельцем продукта. Не копировать production secrets в frontend env.

## Сборка

```text
npm ci
npm run build
```

Проверить наличие `dist/`, ожидаемый реферальный текст, branding URL через `/api` и отсутствие секретов/source maps, если они не предусмотрены release policy.

## Backup и загрузка

Production path в командах должен совпадать с `app.cabinet.path` в inventory.

```powershell
ssh app 'set -e; ts=$(date +%Y%m%d-%H%M%S); sudo cp -a /var/www/trustnet-cabinet /var/www/trustnet-cabinet.backup-$ts; rm -rf /tmp/trustnet-cabinet-dist; mkdir -p /tmp/trustnet-cabinet-dist'
scp -r ./dist/. app:/tmp/trustnet-cabinet-dist/
ssh app 'set -e; sudo rsync -a --delete /tmp/trustnet-cabinet-dist/ /var/www/trustnet-cabinet/; rm -rf /tmp/trustnet-cabinet-dist'
```

Если `rsync` отсутствует, остановиться и подготовить отдельно проверенную атомарную замену. Не очищать production directory без подтверждённого backup.

## Smoke-test

Выполнить профиль `public` и проверки `app_nginx`, `app_bot_tunnel`, `oracle_bedolaga_bot` из [health checks](../infra/health-checks.yaml). Дополнительно проверить:

```powershell
curl.exe -I https://app.zabugrom.net
curl.exe -s -D - https://app.zabugrom.net/api/cabinet/branding/logo -o NUL
```

Убедиться, что HTML ссылается на существующие hash-assets, кабинет загружается без ошибок, branding работает, а read-only API-вызов проходит через tunnel. Не выполнять реальную оплату как smoke-test.

## Откат

Выбрать конкретный timestamped backup, затем:

```powershell
ssh app 'sudo rsync -a --delete /var/www/trustnet-cabinet.backup-YYYYMMDD-HHMMSS/ /var/www/trustnet-cabinet/'
curl.exe -I https://app.zabugrom.net
```

После success или rollback записать production-результат по [change log](../infra/changes/README.md). Локальные изменения сохранить в `trustnet-custom` отдельным коммитом только после проверки; инструкция сама коммит не создаёт.
