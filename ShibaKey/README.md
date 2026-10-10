# Shiba.Client — key backend (Vercel)

Серверная проверка ключей. Делает платные/постоянные ключи
по-настоящему защищёнными: список ключей лежит на сервере, не в
скрипте, ключ привязывается к устройству и может быть отозван.

## Деплой за 5 шагов

1. Положи папку `shiba-backend` в новый репозиторий на GitHub.
2. На vercel.com -> Add New -> Project -> импортируй этот репозиторий.
3. В проекте: Storage -> Create -> KV (Upstash Redis) -> Connect.
   Vercel сам добавит переменные `KV_REST_API_URL` и `KV_REST_API_TOKEN`.
4. Settings -> Environment Variables -> добавь `ADMIN_SECRET` = любой
   длинный пароль (им ты создаёшь ключи).
5. Deploy. Твои адреса:
   - `https://ТВОЙ-ПРОЕКТ.vercel.app/api/verify`
   - `https://ТВОЙ-ПРОЕКТ.vercel.app/api/admin`

## Подключение к клиенту

В скрипте, в `KEY_CONFIG`:

```lua
UseServer = true,
ServerURL = "https://ТВОЙ-ПРОЕКТ.vercel.app/api/verify",
```

Теперь любой ключ проверяется на сервере. HTTP в executor'ах идёт
через `request` / `syn.request` / `http.request` — клиент уже умеет
все три.

## Создать ключ (пример)

POST на `/api/admin`:

```json
{ "secret": "ТВОЙ_ADMIN_SECRET", "action": "create", "type": "perm", "days": 0 }
```

Ответ вернёт сгенерированный ключ, например `SHIBA-PERM-AB3K-9XQ2-...`.
Его и продаёшь. `days: 0` — бессрочный, `days: 30` — на месяц.

Типы: `temp` (временный), `paid` (платный), `perm` (постоянный), `dev`.

## Отозвать ключ

```json
{ "secret": "ТВОЙ_ADMIN_SECRET", "action": "revoke", "key": "SHIBA-PERM-..." }
```

После этого ключ перестаёт работать у всех.

## Как связать с сайтом выдачи (временные ключи)

Чтобы сайт выдавал серверные временные ключи вместо локальных:
на последнем шаге сайт должен делать `fetch` на `/api/admin` с
`action:"create", type:"temp", days:1`. Я могу дописать это в
`index.html`, когда скажешь, — но тогда `ADMIN_SECRET` нельзя класть
в сайт; для этого нужен отдельный публичный эндпоинт выдачи с
rate-limit. Обсудим отдельно.
