# Deploy bedolaga-cabinet для TrustNet

Инструкция описывает безопасную сборку и деплой кабинета `bedolaga-cabinet` на `app.zabugrom.net`.

## Важные правила

- Рабочая ветка для TrustNet: `trustnet-custom`.
- Не деплоить чистый upstream `BEDOLAGA-DEV/bedolaga-cabinet` напрямую, иначе можно потерять локальные правки TrustNet.
- Перед заменой файлов на сервере всегда делать backup.
- Не хранить в репозитории пароли, токены, приватные ключи и секреты платежек.
- После деплоя обязательно проверить публичный URL через `curl`.
- Если браузер показывает старую версию, сделать hard refresh: старые JS/CSS assets могли остаться в кэше.

## Что уже входит в trustnet-custom

Ветка `trustnet-custom` содержит локальные правки TrustNet:

- текст реферальной подсказки без `0% комиссии`;
- фикс URL логотипа через `/api/cabinet/branding/logo`.

Проверить последние коммиты:

```powershell
cd D:\projects\trustnet\bedolaga-cabinet
git log --oneline -5
```

## Сервер и пути

Сервер:

```text
Putty session: app
Host: 92.113.151.74
User: admin
Key: C:\Users\akoch\.ssh\tyomasun-hetzner-key.ppk
```

Публичный URL:

```text
https://app.zabugrom.net
```

Путь кабинета на сервере:

```text
/var/www/trustnet-cabinet
```

Временная папка для загрузки build:

```text
/tmp/trustnet-cabinet-dist
```

## Подготовка локального репозитория

Перейти в локальный fork:

```powershell
cd D:\projects\trustnet\bedolaga-cabinet
git checkout trustnet-custom
git status --short --branch
```

Рабочее дерево перед сборкой должно быть чистым, если нет сознательных незакоммиченных правок.

## Обновление из upstream

Если нужно подтянуть свежую версию оригинального `bedolaga-cabinet`, делать через `main`, затем мержить в `trustnet-custom`:

```powershell
cd D:\projects\trustnet\bedolaga-cabinet

git checkout main
git fetch upstream
git merge upstream/main
git push origin main

git checkout trustnet-custom
git merge main
```

Если Git покажет конфликт, разрешить его вручную. Особое внимание:

```text
src/locales/ru.json
src/api/branding.ts
```

После успешного merge:

```powershell
git status --short --branch
```

## Переменные сборки

Vite вшивает `VITE_*` переменные в JS на этапе build.

Для текущей схемы важен API-префикс:

```text
VITE_API_URL=/api
```

Можно создать локальный `.env.production`, но не коммитить его:

```powershell
@'
VITE_API_URL=/api
VITE_APP_NAME=TrustNet
VITE_APP_LOGO=T
VITE_REFERRAL_BASE_URL=https://zabugrom.net
VITE_TELEGRAM_BOT_USERNAME=your_bot_username_without_at
'@ | Set-Content -Path .env.production -Encoding UTF8
```

Если `.env.production` не создан, текущий TrustNet-fix для логотипа использует fallback `/api`.

## Сборка

```powershell
cd D:\projects\trustnet\bedolaga-cabinet
npm ci
npm run build
```

После сборки должен появиться каталог:

```text
D:\projects\trustnet\bedolaga-cabinet\dist
```

Проверить, что нужный текст попал в build:

```powershell
rg "После первой оплаты друг получит бонус" dist
```

Проверить, что logo URL идет через `/api`:

```powershell
Get-ChildItem dist\assets\index-*.js | ForEach-Object {
  rg "/api\\$\\{.*logo_url|/api/cabinet/branding/logo|getLogoUrl" $_.FullName
}
```

## Backup на сервере

Важно: в PowerShell команду с `$(date ...)` передавать в одинарных кавычках, иначе PowerShell попытается выполнить `date` локально.

```powershell
plink -batch -load app 'ts=$(date +%Y%m%d-%H%M%S); sudo cp -a /var/www/trustnet-cabinet /var/www/trustnet-cabinet.backup-$ts; echo backup=/var/www/trustnet-cabinet.backup-$ts; rm -rf /tmp/trustnet-cabinet-dist; mkdir -p /tmp/trustnet-cabinet-dist'
```

Проверить backup при необходимости:

```powershell
plink -batch -load app 'ls -ld /var/www/trustnet-cabinet.backup-* | tail -5'
```

## Загрузка build на сервер

```powershell
pscp -batch -P 22 -i C:\Users\akoch\.ssh\tyomasun-hetzner-key.ppk -r D:\projects\trustnet\bedolaga-cabinet\dist\* admin@92.113.151.74:/tmp/trustnet-cabinet-dist/
```

Проверить, что файлы загрузились:

```powershell
plink -batch -load app 'find /tmp/trustnet-cabinet-dist -maxdepth 2 -type f | wc -l; ls -la /tmp/trustnet-cabinet-dist | head'
```

## Замена текущего кабинета

Основной вариант через `rsync`:

```powershell
plink -batch -load app 'sudo rsync -a --delete /tmp/trustnet-cabinet-dist/ /var/www/trustnet-cabinet/ && rm -rf /tmp/trustnet-cabinet-dist && echo deployed'
```

Если на сервере нет `rsync`, использовать fallback:

```powershell
plink -batch -load app 'sudo find /var/www/trustnet-cabinet -mindepth 1 -maxdepth 1 -exec rm -rf {} + && sudo cp -a /tmp/trustnet-cabinet-dist/. /var/www/trustnet-cabinet/ && rm -rf /tmp/trustnet-cabinet-dist && echo deployed'
```

## Проверка после деплоя

Проверить, что кабинет отдает HTML:

```powershell
curl.exe -I https://app.zabugrom.net
```

Ожидаемо:

```text
HTTP/1.1 200 OK
```

Проверить branding API:

```powershell
curl.exe -s https://app.zabugrom.net/api/cabinet/branding
curl.exe -s -D - https://app.zabugrom.net/api/cabinet/branding/logo -o NUL
```

Ожидаемо для логотипа:

```text
HTTP/1.1 200 OK
Content-Type: image/png
```

Проверить, что публичный JS содержит новый текст:

```powershell
curl.exe -s https://app.zabugrom.net/assets/ru-CBZN2WHo.js | rg "После первой оплаты друг получит бонус|зарегистрируются и оплатят"
```

Если имя `ru-*.js` изменилось после будущей сборки, найти актуальный файл:

```powershell
curl.exe -s https://app.zabugrom.net | rg -o 'assets/ru-[^" ]+\.js'
```

Проверить, что актуальный `index-*.js` содержит `/api${logo_url}`:

```powershell
curl.exe -s https://app.zabugrom.net | rg -o 'assets/index-[^" ]+\.js'
```

Затем подставить найденный файл:

```powershell
curl.exe -s https://app.zabugrom.net/assets/<index-file>.js | rg 'getLogoUrl|/api\\$\\{.*logo_url|/api/cabinet/branding/logo'
```

## Откат

Если после деплоя что-то сломалось, найти последний backup:

```powershell
plink -batch -load app 'ls -ld /var/www/trustnet-cabinet.backup-* | tail -10'
```

Восстановить нужный backup:

```powershell
plink -batch -load app 'sudo rsync -a --delete /var/www/trustnet-cabinet.backup-YYYYMMDD-HHMMSS/ /var/www/trustnet-cabinet/'
curl.exe -I https://app.zabugrom.net
```

## Коммит и push локальных правок

Если после деплоя менялись исходники, сохранить их в fork:

```powershell
cd D:\projects\trustnet\bedolaga-cabinet
git status --short --branch
git add <changed-files>
git commit -m "Describe TrustNet cabinet change"
git push
```

Деплоить в production следует только изменения, которые сохранены в `trustnet-custom`, чтобы следующий update не потерял локальные кастомизации.
