# BX Team Platform — полная спецификация архитектуры и план переписи на Rust

> **Назначение документа.** Это исчерпывающее описание того, что представляет собой
> веб-платформа BX Team на момент коммита `a7f80f9` (ветка `master`, TypeScript +
> Cloudflare Workers), плюс целевая архитектура и план полной переписи бэкенда на Rust
> с нуля.
>
> Документ самодостаточен: он писался так, чтобы в **новом пустом репозитории**, где
> из старого кода остались только `apps/meridian` и `packages/ui`, можно было
> восстановить всё поведение бэкенда, не заглядывая в удалённый TypeScript.
>
> Всё, что здесь описано как «сейчас», — это реально работающий и задеплоенный код,
> а не намерения.

---

## Содержание

1. [Продукт: что это вообще такое](#1-продукт-что-это-вообще-такое)
2. [Текущая топология](#2-текущая-топология)
3. [Модель данных: реляционная часть](#3-модель-данных-реляционная-часть)
4. [Модель данных: аналитическая часть](#4-модель-данных-аналитическая-часть)
5. [Модель данных: объектное хранилище и прочие сторы](#5-модель-данных-объектное-хранилище-и-прочие-сторы)
6. [Wire-формат ingest и контракт с SDK](#6-wire-формат-ingest-и-контракт-с-sdk)
7. [Пайплайн приёма событий](#7-пайплайн-приёма-событий)
8. [Обработка ошибок: скрабинг, фингерпринт, issues, алерты](#8-обработка-ошибок-скрабинг-фингерпринт-issues-алерты)
9. [Полный инвентарь HTTP-эндпоинтов](#9-полный-инвентарь-http-эндпоинтов)
10. [Аутентификация и авторизация](#10-аутентификация-и-авторизация)
11. [Atlas: публикация и раздача сборок](#11-atlas-публикация-и-раздача-сборок)
12. [Frontend (meridian)](#12-frontend-meridian)
13. [Бизнес-инварианты и правила, которые нельзя потерять](#13-бизнес-инварианты-и-правила-которые-нельзя-потерять)
14. [Что в текущей архитектуре плохо](#14-что-в-текущей-архитектуре-плохо)
15. [Целевая архитектура на Rust](#15-целевая-архитектура-на-rust)
16. [Развёртывание: NixOS-хост](#16-развёртывание-nixos-хост)
17. [Релизы, CI/CD и ченджлог](#17-релизы-cicd-и-ченджлог)
18. [Соглашения по коду и комментариям](#18-соглашения-по-коду-и-комментариям)
19. [План переписи по фазам](#19-план-переписи-по-фазам)
20. [Приложение A: карта соответствия старого кода новому](#приложение-a-карта-соответствия-старого-кода-новому)
21. [Приложение B: переменные окружения и инфраструктурные идентификаторы](#приложение-b-переменные-окружения-и-инфраструктурные-идентификаторы)
22. [Приложение C: что физически удалить из репозитория](#приложение-c-что-физически-удалить-из-репозитория)

> **Три вещи, которые важнее всех остальных в этом документе:**
>
> 1. **Всё, кроме `meridian`, уезжает на собственный VPS под NixOS.** `meridian` остаётся
>    статикой на Cloudflare, R2 остаётся хранилищем артефактов Atlas и payload'ов ошибок.
>    Конфигурация хоста уже написана и лежит в `/etc/nixos` — см. §16.
> 2. **Java SDK (`~/Projects/Pulsify`) менять нельзя.** Бэкенд обязан заработать с уже
>    выпущенным SDK без единой правки на его стороне — см. §6.6.
> 3. **Комментариев должно быть мало.** Никакой документации сборочных файлов, workflow'ов
>    и очевидного кода — см. §18.

---

## 1. Продукт: что это вообще такое

BX Team — open source сообщество вокруг Minecraft: серверное ПО, плагины, библиотеки.
Сами проекты (DivineMC, Quark, NDailyRewards и т.д.) живут в отдельных репозиториях
организации. Этот монорепозиторий содержит **веб-платформу**, которая состоит из трёх
логически независимых продуктов (bounded contexts) и одного общего слоя аутентификации.

### 1.1 Meridian — сайт

Публичный сайт `bxteam.org`: лендинг, документация по проектам, страница загрузок,
roadmap, страница команды, юридические документы. Плюс приватная часть — дашборд
Pulsify и админ-панель.

### 1.2 Atlas — API загрузок

Публичный неаутентифицированный API метаданных сборок в стиле Paper/Purpur:
`проект → версия → сборка → артефакт`. Артефакты (`.jar`) лежат в объектном хранилище
и раздаются по прямым ссылкам. Публикация сборок — из CI по общему bearer-секрету.
Читающая часть задокументирована в OpenAPI и отрендерена через Scalar.

**Ключевое свойство:** Atlas — единственный контекст с реальными продакшн-данными.
Всё остальное (auth, pulsify) на момент переписи пустое.

### 1.3 Pulsify — observability для Minecraft

Основной продукт. Смесь Sentry + bStats + Plan, специализированная под Minecraft:

- **Heartbeat** — раз в N секунд сервер шлёт TPS, MSPT, память, онлайн, версию,
  ПО сервера и список установленных плагинов.
- **События игроков** — join/quit, из которых собираются завершённые сессии
  (длительность, версия клиента, страна по IP).
- **Ошибки** — исключения плагинов со стектрейсами, дедуплицированные по фингерпринту
  в «issues» с жизненным циклом (open / resolved / ignored / muted) и детектом регрессий.
- **Кастомные метрики** — произвольные именованные числовые значения с метками.
- **Алерты** — вебхуки (с отдельным форматированием под Discord) на новый issue,
  регрессию и всплеск ошибок.
- **Кросс-серверная агрегация ошибок** — автор плагина видит краши своего плагина со
  **всех** серверов, где он установлен, полностью анонимизированно. Это то, ради чего
  вообще существует различение типов проектов.

Проекты в Pulsify бывают трёх типов: `server`, `plugin`, `mod`. Сервер репортит
heartbeat со списком плагинов; по совпадению **имени** плагина из heartbeat с именем
зарегистрированного проекта типа `plugin`/`mod` система строит граф установок
(`plugin_installations`), который и питает кросс-серверную агрегацию.

### 1.4 Auth — общий слой

Единый аккаунт на `bxteam.org`. Только passwordless: magic link по почте, GitHub OAuth,
Discord OAuth. Есть роль `admin` и бан пользователей. Пароли не поддерживаются в принципе.

---

## 2. Текущая топология

Всё, кроме статики, — Cloudflare Workers. Bun-воркспейсы, четыре приложения, три пакета.

> Это состояние **на сегодня**. Целевая топология — один VPS под NixOS, на Cloudflare
> остаются только статика `meridian`, R2 и DNS; см. §16.

```
Пользователь ──► bxteam.org        (meridian)  Workers Static Assets, nuxt generate
                 │
                 ├─► api.bxteam.org   (azimuth) Hono Worker — /auth, /atlas, /pulsify
                 │      ├─ D1 auth-db, atlas-db, pulsify-db
                 │      ├─ R2 builds, error-payloads
                 │      ├─ Analytics Engine SQL API (внешний HTTPS!)
                 │      └─ send_email binding
                 │
                 └─► files.bxteam.org (R2 public bucket `builds`)

Minecraft SDK ──► ingest.bxteam.org (influx)  Hono Worker — приём событий
                     ├─ D1 pulsify-db (проверка токена, дневная квота)
                     ├─ Rate Limiting binding
                     └─ Queue producer `pulsify-ingest`
                                │
                                ▼
                        (cinder) Queue consumer + cron `* * * * *`
                     ├─ D1 pulsify-db
                     ├─ Analytics Engine × 5 datasets (запись)
                     ├─ R2 error-payloads
                     ├─ KV GEOIP_CACHE + IPinfo Lite API
                     └─ Durable Object SessionBridge
```

| Приложение | Домен | Роль | Runtime-зависимости |
|---|---|---|---|
| `apps/meridian` | `bxteam.org` | Nuxt 4, полностью статический | ASSETS binding |
| `apps/azimuth` | `api.bxteam.org` | Application API (Hono) | AUTH_DB, ATLAS_DB, PULSIFY_DB, ATLAS_BUCKET, ERROR_PAYLOADS, EMAIL, AE SQL API |
| `apps/influx` | `ingest.bxteam.org` | Ingest gateway (Hono) | PULSIFY_DB, INGEST_QUEUE, RATE_LIMITER |
| `apps/cinder` | — | Queue consumer + cron | PULSIFY_DB, ERROR_PAYLOADS, GEOIP_CACHE, 5 × AE dataset, SESSION_BRIDGE (DO) |

| Пакет | Роль |
|---|---|
| `packages/stratus` | Drizzle-схемы трёх D1-баз + миграции |
| `packages/types` | Zod-схемы wire-формата, `scrub`, `computeFingerprint` |
| `packages/ui` | Vue 3 дизайн-система (остаётся) |

Разделение на **три** D1-базы — артефакт платформы (у D1 нет мультибазовых запросов
внутри одного биндинга), а не доменное решение. Оно вынуждает делать кросс-базовые
ссылки «плоским TEXT без FK» (`pulsify_projects.owner_id` → `auth_users.id`) и
компенсировать это руками (см. §13.6).

Cron `* * * * *` (каждую минуту) в `cinder` нужен ровно для одной вещи — оценки
правил `error_spike` (объёмный порог нельзя оценить по одному событию).

---

## 3. Модель данных: реляционная часть

Три базы D1 (SQLite). Все временные метки — `integer` unix-секунды, режим Drizzle
`timestamp`. Значение по умолчанию везде `(unixepoch())`.

### 3.1 `auth-db` — схема Better Auth

Схема продиктована Better Auth 1.6 (drizzleAdapter, provider `sqlite`), имена таблиц
переопределены на `auth_*`.

**`auth_users`**

| Колонка | Тип | Ограничения |
|---|---|---|
| `id` | text | PK |
| `name` | text | NOT NULL |
| `email` | text | NOT NULL, UNIQUE |
| `email_verified` | integer(bool) | NOT NULL, default false |
| `image` | text | nullable |
| `created_at` | integer(ts) | NOT NULL, default now |
| `updated_at` | integer(ts) | NOT NULL, default now, `$onUpdate` |
| `role` | text | nullable (`admin` или NULL) |
| `banned` | integer(bool) | default false |
| `ban_reason` | text | nullable |
| `ban_expires` | integer(ts) | nullable |

**`auth_sessions`** — `id` PK, `expires_at` NOT NULL, `token` NOT NULL UNIQUE,
`created_at`, `updated_at`, `ip_address`, `user_agent`, `user_id` → `auth_users.id`
ON DELETE CASCADE, `impersonated_by`. Индекс `session_userId_idx(user_id)`.

**`auth_accounts`** — `id` PK, `account_id` NOT NULL, `provider_id` NOT NULL,
`user_id` → CASCADE, `access_token`, `refresh_token`, `id_token`,
`access_token_expires_at`, `refresh_token_expires_at`, `scope`, `password` (не
используется, `emailAndPassword.enabled = false`), `created_at`, `updated_at`.
Индекс `account_userId_idx(user_id)`.

**`auth_verifications`** — `id` PK, `identifier` NOT NULL, `value` NOT NULL,
`expires_at` NOT NULL, `created_at`, `updated_at`. Индекс
`verification_identifier_idx(identifier)`. Здесь живут одноразовые magic link токены.

### 3.2 `atlas-db`

**`atlas_projects`**

| Колонка | Тип | Ограничения |
|---|---|---|
| `id` | integer | PK autoincrement |
| `key` | text | NOT NULL, UNIQUE — человекочитаемый ключ (`divinemc`) |
| `name` | text | NOT NULL |
| `description` | text | nullable |
| `latest_version` | text | nullable — витринное поле, не FK |
| `experimental_version` | text | nullable |
| `created_at`, `updated_at` | integer(ts) | NOT NULL |

**`atlas_versions`** — `id` PK autoincrement, `project_id` → `atlas_projects.id`
CASCADE, `key` (`1.21.4`, `26.1.2`), `support_status` ∈ {`SUPPORTED`, `DEPRECATED`,
`UNSUPPORTED`} default `SUPPORTED` (+ CHECK), `java_min_version` integer nullable,
`created_at`, `updated_at`. Индекс `(project_id, key)` — **не уникальный** (это баг,
см. §14).

**`atlas_builds`** — `id` PK autoincrement, `version_id` → CASCADE, `build_number`
integer NOT NULL, `channel` ∈ {`ALPHA`, `BETA`, `STABLE`} default `STABLE` (+ CHECK),
`time` NOT NULL, `created_at`, `updated_at`. Индекс `(version_id, build_number)` —
тоже не уникальный.

**`atlas_commits`** — `id` PK, `build_id` → CASCADE, `sha`, `message`, `time`,
`created_at`. Индекс `(build_id)`.

**`atlas_downloads`** — `id` PK, `build_id` → CASCADE, `name` (логическое имя
артефакта, сейчас всегда `application`), `file_name`, `file_path` (ключ в R2),
`size` integer, `sha256` text, `created_at`. Индекс `(build_id)`.

### 3.3 `pulsify-db`

**`pulsify_projects`**

| Колонка | Тип | Ограничения |
|---|---|---|
| `id` | text | PK, `crypto.randomUUID()` |
| `owner_id` | text | NOT NULL — ссылка на `auth_users.id`, **без FK** (другая база) |
| `name` | text | NOT NULL |
| `slug` | text | NOT NULL, UNIQUE |
| `type` | text | NOT NULL, ∈ {`server`, `plugin`, `mod`} + CHECK |
| `description` | text | nullable |
| `verified` | integer(bool) | NOT NULL, default false |
| `created_at`, `updated_at` | integer(ts) | NOT NULL |

Частичный уникальный индекс `pulsify_plugin_name_unique(name) WHERE type IN
('plugin','mod')` — имя плагина/мода глобально уникально, потому что имя это ключ,
по которому heartbeat матчит установки.

**`pulsify_dsn_tokens`** — `id` PK (uuid), `project_id` → CASCADE, `key` NOT NULL
UNIQUE (32 случайных байта в hex), `label` nullable, `revoked` bool default false,
`last_used_at` nullable, `created_at`. Токены не удаляются, а помечаются `revoked`.

**`pulsify_plugin_installations`** — `id` PK (uuid), `plugin_id` → `pulsify_projects.id`
CASCADE, `server_id` → `pulsify_projects.id` CASCADE, `version` NOT NULL,
`enabled` bool default true, `share_errors` bool default true, `last_seen_at`.
UNIQUE `(plugin_id, server_id)`.

> `share_errors` записывается в `true` при каждом upsert из heartbeat и **нигде в UI не
> переключается** — то есть флаг существует в схеме и читается в кросс-агрегации, но
> управлять им пока нельзя. Это незакрытая дыра в приватности, которую надо закрыть в
> новой версии (см. §13.3).

**`pulsify_server_metadata`** — `id` PK (uuid), `project_id` → CASCADE UNIQUE,
`last_seen_at`, `software`, `mc_version`, `country_code`. Одна строка на проект,
обновляется каждым heartbeat.

**`pulsify_quotas`** — `user_id` text PK (ссылка на `auth_users.id`, без FK),
`max_projects` default 10, `max_events_per_day` default 100000, `reset_at` nullable,
`created_at`, `updated_at`. Строка создаётся лениво при первом обращении к `/billing`.

**`pulsify_resolved_issues`** (реестр issue; имя таблицы историческое)

| Колонка | Тип | Смысл |
|---|---|---|
| `id` | text PK (uuid) | |
| `project_id` | text → CASCADE | |
| `fingerprint` | text NOT NULL | md5-хэш группы ошибок |
| `plugin` | text NOT NULL default `''` | |
| `status` | text default `open` | ∈ {`open`,`resolved`,`ignored`,`muted`} + CHECK |
| `status_version` | text nullable | версия, в которой issue был закрыт — база для детекта регрессии |
| `muted_until` | integer(ts) nullable | |
| `first_version`, `last_version` | text nullable | |
| `first_seen_at`, `last_seen_at` | integer(ts) NOT NULL | |
| `resolved_at` | integer(ts) nullable | |
| `resolved_by` | text nullable | user id |

UNIQUE `(project_id, fingerprint)`.

**`pulsify_alert_rules`** — `id` PK (uuid), `project_id` → CASCADE, `type` ∈
{`new_issue`, `regression`, `error_spike`} + CHECK, `enabled` bool default true,
`threshold` integer default 10, `window_minutes` integer default 5, `webhook_url`
NOT NULL, `last_fired_at` nullable, `created_at`.

**`pulsify_daily_usage`** — `token` text, `day` text (`YYYY-MM-DD`), `count` integer
default 0. PK `(token, day)`. Счётчик дневной квоты, инкрементируется атомарным
`INSERT ... ON CONFLICT DO UPDATE SET count = count + N RETURNING count`.
Строки никогда не чистятся (нет TTL — это тоже надо исправить).

---

## 4. Модель данных: аналитическая часть

Пять датасетов Cloudflare Analytics Engine. У AE фиксированная форма точки:
`indexes` (максимум один, строка), `blobs` (строки), `doubles` (числа), плюс системные
`timestamp` и `_sample_interval` (коэффициент сэмплирования, при агрегации всегда надо
суммировать `_sample_interval`, а не `count()`).

**Везде `index1 = project_id`.** Это единственный ключ, по которому AE умеет
эффективно фильтровать, поэтому вся мультитенантность построена на нём.

### 4.1 `events` — сырое зеркало всех событий

| Слот | Содержимое |
|---|---|
| `index1` | `project_id` |
| `blob1` | тип события (`heartbeat` / `event` / `error` / `metric`) |
| `blob2` | JSON всего события, обрезанный до 5000 символов |

Используется только для подсчёта общего объёма событий (`SUM(_sample_interval)`) в
`/pulsify/overview` и `/pulsify/billing`.

### 4.2 `server_stats` — телеметрия сервера

| Слот | Содержимое |
|---|---|
| `index1` | `project_id` |
| `double1` | онлайн игроков |
| `double2` | TPS |
| `double3` | MSPT |
| `double4` | использованная память, МБ |
| `double5` | максимальная память, МБ |

### 4.3 `sessions` — завершённые сессии игроков

| Слот | Содержимое |
|---|---|
| `index1` | `project_id` |
| `blob1` | UUID игрока |
| `blob2` | версия клиента |
| `blob3` | код страны (ISO, `''` если неизвестно) |
| `blob4` | `'1'` если сессия «брошенная» (закрыта по таймауту), иначе `'0'` |
| `double1` | длительность в секундах |

**Строка пишется в момент выхода игрока, не входа.** `timestamp` строки — это конец
сессии; время входа реконструируется как `timestamp - double1`.

### 4.4 `errors` — поисковый индекс ошибок

| Слот | Содержимое |
|---|---|
| `index1` | `project_id` |
| `blob1` | имя плагина |
| `blob2` | уровень (`warning`/`error`/`fatal`) |
| `blob3` | fingerprint |
| `blob4` | версия сервера |
| `blob5` | ПО сервера |
| `blob6` | сообщение, обрезанное до 1000 символов |
| `blob7` | версия плагина |
| `double1` | `1` |

Полный стектрейс сюда **не пишется** — у AE лимит 16 КБ на все blob'ы точки. Он
уходит в R2 (см. §5.2).

### 4.5 `custom_metrics` — пользовательские метрики

| Слот | Содержимое |
|---|---|
| `index1` | `project_id` |
| `blob1` | имя метрики |
| `blob2`, `blob3`, `blob4` | «слоты меток», строки вида `key=value` |
| `blob5` | JSON всех меток (только для отображения), обрезан до 5000 |
| `double1` | значение |

Слоты заполняются **первыми тремя метками в алфавитном порядке ключа**. У AE нет
map-типа, поэтому это единственный способ сделать метки фильтруемыми — и одновременно
источник тихого бага: метрика с метками `currency/extra/tier/world` не может быть
разбита по `world` вообще (см. §14.1).

### 4.6 Как это читается

Читающая сторона — **внешний HTTPS-вызов** к
`https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/analytics_engine/sql`
с bearer-токеном (`AE_SQL_TOKEN`, права Account Analytics: Read) и SQL в теле
запроса `text/plain`. Диалект — ClickHouse.

У API **нет bind-параметров**, поэтому все динамические значения инлайнятся через
самописные экранирующие хелперы (`sqlString`, `sqlStringList`, `sqlDateTime`).
Значения времени возвращаются строками `'YYYY-MM-DD HH:MM:SS'` в UTC.

Диапазоны времени, общие для дашборда:

| Ключ | Интервал | Функция бакета (`server_stats`, `overview`) | Бакет для метрик |
|---|---|---|---|
| `24h` | `INTERVAL '24' HOUR` | `toStartOfFiveMinutes` | `toStartOfFifteenMinutes` |
| `7d` | `INTERVAL '7' DAY` | `toStartOfHour` | `toStartOfHour` |
| `30d` | `INTERVAL '30' DAY` | `toStartOfHour` | `toStartOfDay` |

---

## 5. Модель данных: объектное хранилище и прочие сторы

### 5.1 R2 `builds` (публичный, `files.bxteam.org`)

Ключ: `{projectKey}/versions/{versionKey}/{buildNumber}/{fileName}`

Пример: `divinemc/versions/1.21.4/142/divinemc-1.21.4-142.jar`.
`Content-Type`: `application/java-archive` для `.jar`, иначе `application/octet-stream`.

**Эти ключи — публичные URL загрузок.** Любая перенумерация `buildNumber` или
изменение ключей проекта/версии ломает существующие ссылки. При миграции данных
Atlas это жёсткое ограничение.

### 5.2 R2 `error-payloads` (приватный)

Ключ: `{projectId}/{fingerprint}/{epochMillis}.json`

Тело — JSON `{plugin, message, stacktrace, level, server_version, server_software,
plugin_version, timestamp}`, уже проскрабленный.

Чтение: список по префиксу `{projectId}/{fingerprint}/`, берётся **последний ключ**
(суффикс epoch-ms фиксированной ширины → лексикографический порядок = хронологический),
с пагинацией до конца (страница листинга — максимум 1000 ключей).

TTL/очистки нет. Каждое событие ошибки создаёт объект — это неограниченный рост.

### 5.3 KV `GEOIP_CACHE`

Ключ `ip:{normalizedIp}` → код страны (может быть пустой строкой). TTL 24 часа.

### 5.4 Queue `pulsify-ingest`

Producer — influx, consumer — cinder. Настройки консьюмера: `max_batch_size: 20`,
`max_batch_timeout: 5` секунд, `max_retries: 3`, DLQ `pulsify-ingest-dlq`.
Producer шлёт `sendBatch` чанками по 100 (лимит платформы).

Тело сообщения:

```ts
interface IngestMessage {
  event: unknown;        // одно невалидированное событие
  projectId: string;
  receivedAt: number;    // epoch ms, момент приёма influx'ом
  ip: string | null;     // cf-connecting-ip или первый из x-forwarded-for
}
```

### 5.5 Durable Object `SessionBridge`

Один инстанс на проект: `idFromName(projectId)`. Хранилище:

- `projectId` → строка
- `s:{playerUuid}` → `{ joinedAt: number, clientVersion: string, countryCode: string }`

`join()` кладёт запись и, если алярма ещё нет, ставит её на `now + 24h`.
`quit()` достаёт запись, удаляет её и пишет строку в AE `sessions` с
`durationSeconds = max(0, round((leftAt - joinedAt) / 1000))`, `abandoned = false`.
`alarm()` подметает всё старше 24 часов, записывая эти сессии как `abandoned = true`,
и перевзводит алярму, если что-то осталось.

Смысл конструкции: в AE не должно попадать ни одной полуоткрытой сессии, и
«зависшие» сессии не должны исчезать молча.

### 5.6 Rate Limiting binding

`namespace_id: 2001`, `simple: { limit: 100, period: 60 }`. Ключ — сам bearer-токен.
То есть 100 запросов в минуту на токен (не на событие).

---

## 6. Wire-формат ingest и контракт с SDK

Валидируется Zod-схемами в `packages/types/src/schemas/pulsify.ts`. Тело запроса —
одно событие или **массив** событий (дискриминированное объединение по полю `type`).

> **Источник истины — Java SDK** (отдельный репозиторий `~/Projects/Pulsify`), а не эти
> схемы. Jackson там настроен на `PropertyNamingStrategies.SNAKE_CASE` и
> `JsonInclude.NON_NULL`, поэтому опциональные поля **отсутствуют**, а не приходят как
> `null`. `ErrorLevel` сериализуется в нижнем регистре через `@JsonValue`. Онлайн
> игроков — `int`, TPS/MSPT — `double`, память — `long`. При переписи типы надо сверять
> с records в SDK.

### 6.1 `heartbeat`

```jsonc
{
  "type": "heartbeat",
  "timestamp": 1751234567890,
  "server": {
    "online": 42,
    "max": 100,
    "tps": 19.8,
    "mspt": 12.4,
    "memory_used_mb": 4096,
    "memory_max_mb": 8192,
    "version": "1.21.4",
    "software": "DivineMC"
  },
  "plugins": [
    { "name": "NDailyRewards", "version": "1.4.2", "enabled": true }
  ]
}
```

### 6.2 `event` (игроки)

```jsonc
{
  "type": "event",
  "timestamp": 1751234567890,
  "event": "player_join",            // либо "player_quit"
  "payload": {
    "player_uuid": "…uuid…",         // обязателен, валидируется как UUID
    "client_version": "1.21.4",      // опционально
    "player_ip": "203.0.113.7"       // опционально
  }
}
```

### 6.3 `error`

```jsonc
{
  "type": "error",
  "timestamp": 1751234567890,
  "plugin": "NDailyRewards",
  "error": {
    "message": "…",
    "stacktrace": "…",               // опционально
    "level": "error",                // warning | error | fatal, default "error"
    "server_version": "1.21.4",      // опционально
    "server_software": "DivineMC",   // опционально
    "plugin_version": "1.4.2"        // опционально
  }
}
```

### 6.4 `metric`

```jsonc
{
  "type": "metric",
  "timestamp": 1751234567890,
  "name": "economy.balance.total",
  "value": 1234567.0,
  "labels": { "world": "overworld", "currency": "coins" }   // опционально
}
```

### 6.5 DSN

Пользователь получает в UI строку вида:

```
https://{token}@ingest.bxteam.org/api/v1/{projectId}
```

Токен идёт в `Authorization: Bearer {token}`, `projectId` — в path.

`Dsn.parse` в SDK берёт `userInfo` как токен, **последний сегмент пути** как `projectId`
и собирает `scheme://host[:port]` + `/api/v1/e/{projectId}`. То есть в DSN значим только
хост и последний сегмент — путь `/api/v1/` в середине игнорируется.

### 6.6 Контракт с Java SDK — менять SDK нельзя

`~/Projects/Pulsify` — уже выпущенный SDK (`org.bxteam.pulsify:sdk`, публикуется в
`repo.bxteam.org`, есть на Modrinth), с обвязками под Paper, BungeeCord, Velocity,
Fabric и NeoForge. Он стоит на чужих серверах. **Новый бэкенд обязан заработать с ним
как есть** — это не «желательно», а граничное условие задачи.

Из этого следуют жёсткие требования к ingest-сервису.

**Транспорт**

| Свойство | Значение | Следствие для бэкенда |
|---|---|---|
| Метод и путь | `POST {base}/api/v1/e/{projectId}` | путь фиксирован |
| Проверка связи | `GET {base}/api/v1/ping/{projectId}`, успех = ровно `200` | любой другой код читается как «не работает» |
| Авторизация | `Authorization: Bearer {token}` | |
| Content-Type | `application/json` | |
| Тело | **всегда JSON-массив** событий | одиночный объект слать нужно продолжать поддерживать — старые версии |
| Таймаут запроса | 30 с (connect 10 с) | ответ должен укладываться |
| Размер батча | до 100 событий (`maxBatchSize`, default 100) | |
| Буфер | 10 000 событий, при переполнении дропаются **самые старые** | |
| Период флаша | по умолчанию **5 минут**, либо немедленно при заполнении батча | нагрузка пиковая, не равномерная |

**Семантика кодов ответа — самое важное.** SDK различает три исхода:

| Ответ | Поведение SDK |
|---|---|
| `2xx` | успех, счётчик отказов сбрасывается |
| `429` или `5xx` | батч **возвращается в очередь**, открывается окно backoff |
| Любой другой `4xx` | батч **молча выбрасывается навсегда** |

Отсюда: **временные проблемы бэкенда нельзя отдавать как 4xx** — это потеря данных на
стороне клиента без возможности восстановления. Перегрузка, недоступность базы,
таймаут очереди — только `429` или `5xx`.

`Retry-After` (в секундах, числом) читается и имеет приоритет над экспоненциальным
backoff, с потолком в 1 час. Без заголовка backoff растёт как `5с × 2^n`, максимум 120 с.
Текущий influx отдаёт `Retry-After: 60` на rate limit и «секунды до конца UTC-суток» на
дневную квоту — **это надо сохранить**, иначе клиент будет долбиться каждые 5 секунд.

**Сериализация**

- `PropertyNamingStrategies.SNAKE_CASE` — `memoryUsedMb` → `memory_used_mb`,
  `playerUuid` → `player_uuid`, `serverVersion` → `server_version`.
- `JsonInclude.NON_NULL` — опциональные поля **отсутствуют в JSON**, а не приходят
  как `null`. Десериализатор в Rust должен принимать отсутствие, и не обязан принимать
  `null` (но лучше принимать оба).
- `WRITE_DATES_AS_TIMESTAMPS = false`, но все временные метки в событиях — `long`
  epoch-миллисекунды, а не строки.
- Типы: `online`/`max` — `int`; `tps`/`mspt`/`value` — `double`;
  `memory_used_mb`/`memory_max_mb` — `long`; `timestamp` — `long`.
- `level` — строчными: `warning` / `error` / `fatal`.
- `player_quit` несёт **только** `player_uuid` — `client_version` и `player_ip` в нём
  отсутствуют.

**Прочее, что видно из SDK и влияет на бэкенд**

- Ошибки не сэмплируются никогда; события игроков и метрики могут приходить
  прореженными (`sampleRate`) — значит абсолютные счётчики игроков могут быть занижены,
  и на это нельзя опираться в биллинге.
- `stacktrace` может быть пустой строкой, но не `null` в типичном пути.
- SDK ничего не знает про версии API и не шлёт заголовка версии. Если когда-нибудь
  понадобится ломающее изменение ingest — это новый путь (`/api/v2/e/...`), а старый
  живёт вечно.

**Проверка при переписи:** взять реальный дамп батча, который шлёт SDK (или собрать его
Jackson'ом в тесте), и прогнать через десериализатор — это должен быть отдельный тест,
а не «вроде совпадает».

---

## 7. Пайплайн приёма событий

### 7.1 influx: приём

`POST /api/v1/e/:projectId`

1. **Rate limit.** Токен из `Authorization` (без токена шаг пропускается — 401 придёт
   дальше). При превышении — `429` + `Retry-After: 60`.
2. **Аутентификация.** Токен ищется в `pulsify_dsn_tokens` по `key` при
   `revoked = false`. Если не найден **или** `record.projectId !== param('projectId')`
   — `401` + `WWW-Authenticate: Bearer`. Обновление `last_used_at` — через
   `waitUntil`, вне критического пути.
3. **Парс тела.** Невалидный JSON → `400`. Пустой массив → `400`. Одиночный объект
   оборачивается в массив.
4. **Дневная квота.** `day = new Date().toISOString().slice(0,10)` (UTC).
   Атомарный upsert в `pulsify_daily_usage` с `count = count + N`, возвращающий новое
   значение. Если `count > 100_000` → `429` + `Retry-After` до конца UTC-суток.
   Квота **захардкожена константой в influx**, а `pulsify_quotas.max_events_per_day`
   при этом не читается — рассинхрон, который надо устранить.
5. **Постановка в очередь.** По одному сообщению на событие, чанками по 100.
6. Ответ `202 { "accepted": N }`.

Обрати внимание: **влияние структуры события на приём отсутствует** — influx не
валидирует событие вообще, только считает их количество. Валидация — в cinder.

Прочее: `GET /api/v1/ping/:projectId` (тот же auth, отвечает `{ok:true}`),
`GET /health` → `{status:"ok", service:"influx"}`.

### 7.2 cinder: обработка батча

На каждый батч (до 20 сообщений):

1. Каждое сообщение парсится Zod-схемой. **Невалидное сообщение сразу `ack()`** —
   то есть молча выбрасывается, без DLQ и без метрики. (Тоже надо исправить.)
2. Из всего батча собираются IP: `message.body.ip` для heartbeat'ов и
   `payload.player_ip` для `player_join`. Одним bulk-вызовом резолвятся страны.
3. Для каждого валидного события: запись сырого зеркала в AE `events`, затем
   диспетчеризация в хендлер по типу, затем `ack()`. Исключение в хендлере →
   `retry()` **только этого сообщения** (после `max_retries: 3` → DLQ).

### 7.3 GeoIP

`resolveCountries(env, ips)`:

- Нормализация: `::ffff:` префикс отрезается.
- Приватные/локальные адреса (`127.*`, `10.*`, `192.168.*`, `169.254.*`,
  `172.16–31.*`, `::1`, `fc*`, `fd*`, `fe80:*`) сразу → `''`.
- Остальные ищутся в KV (`ip:{ip}`), промахи собираются.
- Промахи резолвятся одним `POST https://api.ipinfo.io/batch/lite?token=…` с массивом
  IP в теле (лимит 1000 адресов, таймаут 5 секунд). Ответ — объект `{ip: {country_code}}`.
- Успешные результаты кладутся в KV на 24 часа.
- Любая ошибка/таймаут → пустые коды стран, **приём не блокируется**.

### 7.4 Хендлер `heartbeat`

1. Upsert `pulsify_server_metadata` по `project_id`: `software`, `mc_version`,
   `country_code`, `last_seen_at = now`.
2. Запись точки в AE `server_stats`.
3. Матчинг плагинов: имена из `event.plugins` ищутся в `pulsify_projects`
   `WHERE name IN (…) AND type IN ('plugin','mod')`. Для найденных — batch-upsert в
   `pulsify_plugin_installations` по ключу `(plugin_id, server_id)` с обновлением
   `version`, `enabled`, `last_seen_at`. `share_errors` при вставке — `true`.
4. Весь шаг 3 обёрнут в `try/catch` с логом — сбой матчинга не роняет heartbeat.

### 7.5 Хендлер `event` (игроки)

Идёт в `SessionBridge` (см. §5.5). На `player_join` — `stub.join(projectId, uuid,
timestamp, clientVersion, countryCode)`. На `player_quit` — `stub.quit(projectId,
uuid, timestamp)`.

**Время берётся из `event.timestamp`, то есть с часов Minecraft-сервера** — это
недоверенный ввод, и длительность сессии им управляема. В новой версии длительность
должна меряться серверными часами на обоих концах.

### 7.6 Хендлер `metric`

Просто пишет точку в AE `custom_metrics` (см. §4.5). Никакой персистентности.

---

## 8. Обработка ошибок: скрабинг, фингерпринт, issues, алерты

Самая нетривиальная часть системы. Порядок операций важен.

### 8.1 Скрабинг (GDPR)

```
scrub(text):
  UUID   /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi → "<uuid>"
  EMAIL  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g            → "<email>"
  IPv6   /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi                     → "<ip>"
  IPv4   /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g                        → "<ip>"
```

Порядок применения именно такой (IPv6 до IPv4). Скрабятся `message` и `stacktrace`
**до любой записи** — ни в AE, ни в R2 нечищеные данные не попадают никогда.

Отдельно есть `anonymize()` в azimuth — более узкий набор (только UUID и IPv4),
применяется к тексту, который отдаётся автору плагина в кросс-серверной агрегации.
**Два разных набора регулярок для одной задачи — это дефект**, в новой версии должна
быть одна функция.

### 8.2 Фингерпринт

```
normalizeForFingerprint(text):
  /0x[0-9a-fA-F]+/g → "<hex>"
  /\d+/g            → "<n>"

computeFingerprint(plugin, message, level, stacktrace):
  basis = [plugin, norm(message), level, norm(stacktrace)].join("\x1F")
  return md5(basis).hex()
```

Считается **один раз на ingest**, из уже проскрабленного текста, и записывается и в AE
(`blob3`), и в реестр issues в D1. Это принципиально: две стороны не пересчитывают его
независимо, поэтому не может возникнуть расхождения между нормализацией в SQL и в коде.

Разделитель `\x1F` (ASCII Unit Separator) и алгоритм MD5 — часть контракта: при
переписи менять их нельзя без пересчёта всех исторических данных. Для новой реализации
нужны **тестовые векторы parity** (вход → ожидаемый хэш).

### 8.3 Полный поток обработки ошибки

1. `message = scrub(error.message)`, `stacktrace = scrub(error.stacktrace ?? '')`.
2. `fingerprint = computeFingerprint(plugin, message, level, stacktrace)`.
3. Запись индекса в AE `errors`.
4. Запись полного payload в R2 `error-payloads`.
5. `recordIssue(...)` — upsert реестра, возвращает переход (`new_issue` / `regression` / `null`).
6. Если переход есть — `notifyIssue(...)`, доставка вебхуков.

### 8.4 Жизненный цикл issue

`recordIssue`:

- Пытается вставить строку с `status='open'`, `first_version = last_version = version`,
  `ON CONFLICT (project_id, fingerprint) DO NOTHING ... RETURNING id`.
  Если вставилось → переход **`new_issue`**.
- Иначе читает текущее состояние и:
  - `status = 'resolved'` **и** `isRegression(version, status_version)` →
    `status='open'`, `resolved_at=NULL`, `status_version=NULL`, переход **`regression`**.
  - `status = 'muted'` **и** `muted_until < now` → `status='open'`, `muted_until=NULL`,
    **без алерта** (мьют просто истёк).
  - Иначе — только `last_seen_at` и `last_version`.

`isRegression(incoming, fixedIn)`:
- нет `incoming` → `false` (нет свидетельств, что что-то изменилось);
- нет `fixedIn` → `true` (закрыли без версии — любое повторение переоткрывает);
- иначе `isNewerVersion(incoming, fixedIn)`.

### 8.5 Сравнение версий

Регулярка: `^(\d+)\.(\d+)(?:\.(\d+))?(?:-(pre|rc)(\d+))?$`

Покрывает и легаси-схему Minecraft (`1.21.4`), и современную (`26.1.2`).
Ранг пререлиза: `pre` = 1, `rc` = 2, релиз без суффикса = 3 (то есть `pre < rc < release`).
Сравнение по порядку: major → minor → patch → ранг → номер пререлиза.
Непарсящийся вход → «не новее».

**Эта логика продублирована в двух местах** — `apps/cinder/src/lib/version.ts`
(детект регрессий) и `apps/azimuth/src/lib/versions.ts` (сортировка/группировка версий
на странице загрузок, там же `groupVersions`). Расхождение между ними было бы тихо
неверным в обоих. В новой версии — один модуль.

`groupVersions(keys)`: сортирует по убыванию (новые первыми) и группирует по
`major.minor` (`1.20.1` → `"1.20"`, `26.1.2` → `"26.1"`). **Порядок групп значим** —
это порядок рендера страницы загрузок.

### 8.6 Алерты

`notifyIssue` — на переход. Ищет правила проекта с совпадающим `type` и `enabled`,
подтягивает имя/slug проекта, собирает payload и рассылает параллельно.

`evaluateSpikes` — по cron раз в минуту. Для каждого правила `error_spike` с
`enabled = true`:
- если `now - last_fired_at < window_minutes * 60_000` — пропуск (одно срабатывание
  на окно);
- иначе запрос в AE:
  `SELECT count() AS c FROM errors WHERE index1 = '{projectId}' AND timestamp >= NOW() - INTERVAL '{windowMinutes}' MINUTE`;
- если `count >= threshold` — доставка и обновление `last_fired_at`.

Формат payload:

```ts
interface AlertPayload {
  type: 'new_issue' | 'regression' | 'error_spike';
  project: { name: string; slug: string };
  title: string;            // "New issue" | "Regression" | "Error spike"
  message: string;
  level?: string; plugin?: string; version?: string;
  count?: number; windowMinutes?: number;
  url: string;              // {APP_URL}/dashboard/{slug}/errors
  timestamp: string;        // ISO
}
```

Доставка (`deliver`): `POST` с таймаутом 8 секунд. Если URL матчит
`^https://(?:[a-z]+\.)?discord(?:app)?\.com/api/webhooks/`i — тело преобразуется в
Discord-эмбед: заголовок `"{title} · {project.name}"`, описание = сообщение,
обрезанное до 1800 символов с многоточием, цвет `new_issue = 0xF59E0B`,
`regression`/`error_spike` = `0xEF4444`, поля Plugin/Level/Version/Events (inline),
footer `"Pulsify"`. Иначе отправляется исходный JSON. Любая ошибка логируется
и глотается.

---

## 9. Полный инвентарь HTTP-эндпоинтов

### 9.1 influx (`ingest.bxteam.org`)

| Метод | Путь | Auth | Ответ |
|---|---|---|---|
| GET | `/health` | — | `{status, service}` |
| GET | `/api/v1/ping/:projectId` | DSN bearer | `{ok:true}` |
| POST | `/api/v1/e/:projectId` | DSN bearer | `202 {accepted:N}` |

### 9.2 azimuth (`api.bxteam.org`) — общее

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| GET | `/health` | — | `{status:"ok"}` |
| GET | `/location` | — | `{colo, city, country}` из `request.cf` — показывается в футере сайта |
| GET | `/` | — | **в новой версии** — карточка сервиса с версией, см. §15.6 |
| GET | `/openapi.json` | — | OpenAPI 3.1 (только Atlas + `/health` + `/location`) |
| GET | `/reference` | — | Scalar UI |
| GET/POST | `/auth/*` | — | Better Auth handler |
| GET | `/auth/me` | сессия | `{user}` — зарегистрирован **до** catch-all `/auth/*` |

CORS:
- `/auth/*` и `/pulsify/*` — credentialed CORS, origin ограничен списком
  `TRUSTED_ORIGINS`; при несовпадении отдаётся первый origin из списка.
  Разрешённые методы: `GET, POST, PATCH, DELETE, OPTIONS`, заголовки
  `Content-Type, Authorization`.
- `/atlas/*` — CORS **без credentials** (публичное чтение из браузера).
- `/location`, `/openapi.json` — открытый CORS.

### 9.3 azimuth — Atlas

Все GET проходят через edge-кэш (`Cache-Control: public, max-age=300,
stale-while-revalidate=60`, Cache API, ключ = полный URL запроса; кэшируются только
ответы `200`; на `*.workers.dev` Cache API не работает — нужен кастомный домен).

| Метод | Путь | Auth | Ответ |
|---|---|---|---|
| GET | `/atlas/projects` | — | `{projects: [{project, version_groups}]}` |
| GET | `/atlas/projects/:project` | — | `{project, version_groups}` |
| GET | `/atlas/projects/:project/versions` | — | `[{version, builds:[int]}]` |
| POST | `/atlas/projects/:project/versions/create` | `API_SECRET_KEY` | `201 {message, version}` |
| GET | `/atlas/projects/:project/versions/:version` | — | `{version, builds}` |
| GET | `/atlas/projects/:project/versions/:version/builds` | — | `[build]`, фильтр `?channel=` |
| GET | `…/builds/latest` | — | `build` |
| GET | `…/builds/:build` | — | `build` |
| POST | `…/builds/upload` | `API_SECRET_KEY` | `{message, build}` |

Формы ответов:

```jsonc
// project
{ "project": { "id": "divinemc", "name": "DivineMC",
               "description": "…", "latestVersion": "…", "experimentalVersion": "…" },
  "version_groups": { "26.1": ["26.1.2", "26.1"], "1.21": ["1.21.4"] } }

// version
{ "version": { "id": "1.21.4",
               "java": { "version": { "minimum": 21 } },
               "support": { "status": "SUPPORTED" } },
  "builds": [142, 141, 140] }        // по убыванию

// build
{ "id": 142, "time": "2026-01-01T00:00:00.000Z", "channel": "STABLE",
  "commits": [{ "sha": "…", "message": "…", "time": "…" }],
  "downloads": { "application": { "name": "divinemc-1.21.4-142.jar",
                                  "checksums": { "sha256": "…" },
                                  "size": 52428800,
                                  "url": "https://files.bxteam.org/…" } } }
```

Опциональные поля (`description`, `latestVersion`, `experimentalVersion`, `java`)
**опускаются**, если пусты, а не отдаются как `null`.

Формат ошибки Atlas: `{ ok: false, error: "Not Found", message: "…" }`.
Формат ошибки Pulsify — другой: `{ message: "…" }`. Унифицировать.

### 9.4 azimuth — Pulsify

Все требуют сессию (middleware `requireAuth` на группе). Ошибки группы
перехватываются `onError` → `500 {message:"Internal Server Error"}`.

**Обзор и биллинг**

| Метод | Путь | Описание |
|---|---|---|
| GET | `/pulsify/overview?range=24h\|7d\|30d` | Сводка по всем проектам пользователя |
| GET | `/pulsify/billing` | План, лимиты, использование |

`/overview` возвращает:
```jsonc
{ "summary": { "projects":N, "servers":N, "plugins":N, "mods":N,
               "totalErrors":N, "totalEvents24h":N,
               "peakOnline24h":N, "uniquePlayers24h":N },
  "timeseries": [{ "time":"…", "online":N, "tps":N }],
  "projects": [{ id, type, name, slug, lastSeenAt, software, mcVersion, errors }],
  "range": "7d" }
```
Тонкости: `totalEvents24h` и `peakOnline24h`/`uniquePlayers24h` считаются жёстко за
24 часа независимо от `range` (`range` влияет только на `timeseries`).
`peakOnline`/`uniquePlayers` считаются только по проектам типа `server`.
`totalErrors` = количество **неподавленных** фингерпринтов: AE группирует
`(project_id, fingerprint)`, а затем из результата вычитаются фингерпринты, у которых
в реестре issues `status != 'open'`. Ряды `timeseries` приходят из AE в разрезе по
проектам и **склеиваются в коде** (сумма онлайна, среднее TPS) — у AE нет вложенных
агрегаций.

**Проекты**

| Метод | Путь | Описание |
|---|---|---|
| GET | `/pulsify/projects` | Список своих проектов + `lastSeenAt` + `errors` |
| GET | `/pulsify/projects?owner={userId}` | То же для чужого пользователя — **только `role=admin`**, иначе 403 |
| POST | `/pulsify/projects` | Создание |
| DELETE | `/pulsify/projects/:id` | Удаление (только владельцем) |
| PATCH | `/pulsify/projects/:id/verify` | `{verified:bool}`, **только admin** |
| GET | `/pulsify/projects/:id/plugins` | Статистика установок плагина/мода |

Создание: `{name (1..64), slug (1..64, /^[a-z0-9-]+$/), type, description? (≤256)}`.
Проверки по порядку: пользователь всё ещё существует в `auth-db` (403), квота
`max_projects` (403), глобальная уникальность имени для `plugin`/`mod` (409).
**Уникальность slug перед вставкой не проверяется** — дубликат приводит к 500.

`/plugins` (только для `plugin`/`mod`, для `server` — 400): считает установки,
включённые установки, распределение по версиям с процентами (округление до 0.1),
`latest_version` = версия с наибольшим числом установок (не «самая новая»!) и
её adoption.

**Аналитика проекта**

| Метод | Путь | Описание |
|---|---|---|
| GET | `/pulsify/projects/:id/stats?range` | Метаданные + временной ряд server_stats + всего ошибок |
| GET | `/pulsify/projects/:id/players` | Последние 100 сессий (24ч) + уникальные + новички |
| GET | `/pulsify/projects/:id/geography?range` | Топ-20 стран с процентами |
| GET | `/pulsify/projects/:id/client-versions?range` | Топ-20 версий клиента |
| GET | `/pulsify/projects/:id/session-duration?range` | Среднее, медиана, гистограмма 0–5/5–15/15–30/30–60/60+ мин |
| GET | `/pulsify/projects/:id/retention` | D1 и D7 когорты |

`session-duration` считает только завершённые сессии (`blob4='0'`) с `double1 > 0`,
использует `quantileWeighted(0.5, double1, _sample_interval)` и `sumIf` по бакетам.

`retention` берёт четыре посуточных множества игроков (UTC-сутки: −2..−1, −1..0,
−8..−7, −7..−6) и **пересекает их в коде**, потому что у AE нет JOIN и подзапросов.
Каждое множество тянется с `LIMIT 10000` — за этим порогом результат тихо неверен.
`players` считает «новичков» тем же способом: множество за последние 24 часа минус
множество за всё время до этого.

**Ошибки**

| Метод | Путь | Описание |
|---|---|---|
| GET | `/pulsify/projects/:id/errors?status=&sort=` | Список групп ошибок |
| GET | `/pulsify/projects/:id/errors/payload?fingerprint=` | Последний полный payload из R2 |
| POST | `/pulsify/projects/:id/errors/status` | Смена статуса issue |
| GET | `/pulsify/projects/:id/errors/versions?fingerprint=` | Разбивка группы по версиям плагина |
| GET | `/pulsify/projects/:id/cross-errors` | Кросс-серверная агрегация (для plugin/mod) |
| GET | `/pulsify/projects/:id/cross-errors/payload?fingerprint=` | Payload для кросс-агрегации |

`GET /errors`: AE группирует по `blob3` (fingerprint) с `argMax(…, timestamp)` для
всех атрибутов, `SUM(_sample_interval)` как счётчик, `MIN/MAX(timestamp)` как
first/last seen, `LIMIT 200`. Сортировка `?sort=last_seen|first_seen|events`
(default `last_seen`). Параллельно читается реестр issues, статусы накладываются
в коде. **Истёкший мьют отображается как `open` немедленно**, не дожидаясь
следующего события. Фильтр `?status=unresolved|resolved|ignored|all`
(default `unresolved`); `counts` считаются по всем 200 строкам до фильтрации.
Поле `stacktrace` в списке всегда `''` — стектрейсы догружаются лениво.

`POST /errors/status`: `{fingerprint, action: resolve|ignore|mute|reopen, hours?}`.
`resolve` пишет `status_version = issues.last_version` (база для регрессии),
`mute` ставит `muted_until = now + hours` (default 24, максимум 720).
Если строки реестра нет — она создаётся здесь же (`ON CONFLICT DO NOTHING`).

`GET /cross-errors`: доступно только для `plugin`/`mod` (иначе 400). Если проект
**не `verified`** — возвращается пустой результат с `verified:false` (не ошибка).
Иначе берутся все установки с `share_errors = true`, и AE группирует по фингерпринту
события из `index1 IN (serverIds) AND blob1 = '{имя проекта}'`, `LIMIT 100`,
с `COUNT(DISTINCT index1)` как числом затронутых серверов. Все сообщения проходят
через `anonymize()`.

`GET /cross-errors/payload`: перебирает **до 20** серверов-установок, ищет в R2
последний payload по фингерпринту, берёт самый свежий, анонимизирует message и
stacktrace.

**Метрики**

| Метод | Путь | Описание |
|---|---|---|
| GET | `/pulsify/projects/:id/metrics?range` | Список метрик со сводкой |
| GET | `/pulsify/projects/:id/metrics/:name?range` | Ряд + разбивка по меткам |

Список доступен только для `plugin`/`mod` (для `server` — 400), а детальный
эндпоинт этой проверки почему-то не делает. Разбивка по меткам — **три отдельных
запроса** к слотам `blob2/blob3/blob4`, результаты разбираются по `key=value`
и перегруппировываются в коде.

**Токены**

| Метод | Путь | Описание |
|---|---|---|
| GET | `/pulsify/projects/:id/tokens` | Список (без ключа!) |
| POST | `/pulsify/projects/:id/tokens` | Создание, `{label?}` → ключ отдаётся **один раз** |
| DELETE | `/pulsify/projects/:id/tokens/:tokenId` | Отзыв (`revoked = true`), `204` |

**Алерты**

| Метод | Путь | Описание |
|---|---|---|
| GET | `/pulsify/projects/:id/alerts` | Список правил |
| POST | `/pulsify/projects/:id/alerts` | Создание; лимит 20 правил на проект |
| PATCH | `/pulsify/projects/:id/alerts/:alertId` | Частичное обновление |
| DELETE | `/pulsify/projects/:id/alerts/:alertId` | Удаление |

Валидация: `type` ∈ трёх значений, `webhookUrl` — URL ≤512, `threshold` 1..1_000_000,
`windowMinutes` 1..1440.

---

## 10. Аутентификация и авторизация

### 10.1 Конфигурация Better Auth

- `basePath: '/auth'` (не дефолтный `/api/auth`) — **OAuth callback URL у провайдеров
  зарегистрированы как `/auth/callback/{provider}`**.
- `baseURL = https://api.bxteam.org`.
- `emailAndPassword: { enabled: false }` — паролей нет вообще.
- Провайдеры: GitHub, Discord (clientId/clientSecret из секретов).
- Плагины: `admin()` (роли, бан, list/impersonate) и `magicLink()`.
- `trustedOrigins` — из `TRUSTED_ORIGINS` через запятую.
- `advanced.crossSubDomainCookies = { enabled: true, domain: '.bxteam.org' }` —
  куки сессии живут на всём домене, поэтому статический фронт на `bxteam.org` может
  ходить с credentials на `api.bxteam.org`.
- `user.deleteUser.enabled = true` с хуком `afterDelete`, который **вручную** удаляет
  из `pulsify-db` все `projects` с `owner_id = deleted.id` и строку `quotas` — потому
  что кросс-базового каскада нет.

**Инстанс Better Auth создаётся на каждый запрос** (`buildAuth(env)`), потому что
биндинги D1 и секреты в Workers доступны только per-request.

### 10.2 Эндпоинты, которые реально использует фронт

Их надо воспроизвести при переписи один в один (остальную поверхность Better Auth
можно не реализовывать):

| Вызов клиента | Что делает |
|---|---|
| `authClient.getSession()` | текущая сессия (+ `user.role`) |
| `authClient.signIn.magicLink({email, callbackURL})` | отправка письма |
| `authClient.signIn.social({provider, callbackURL})` | редирект в OAuth |
| `authClient.signOut()` | выход |
| `authClient.updateUser({name})` | смена имени |
| `authClient.deleteUser()` | удаление аккаунта |
| `authClient.admin.listUsers({query})` | список с `limit`/`offset`, поиск по `email` (`contains`), фильтр по `banned` (`eq`) |
| `authClient.admin.banUser` / `unbanUser` / `removeUser` | админ-операции |
| `GET /auth/me` | `{user}` — собственный эндпоинт, не Better Auth |

### 10.3 Письмо magic link

Отправляется через Cloudflare `send_email` binding, отправитель
`account@bxteam.org` (имя `BX Team`), тема `Sign in to BX Team`.
Есть и HTML (тёмная тема, таблично-вёрстанное письмо с брендовой кнопкой-градиентом
`#22B8C4 → #2CC0A0`), и text-часть. URL экранируется, адрес получателя показывается
в подвале.

**Magic link — единственный механизм входа по почте, то есть доставляемость почты
это доступность аутентификации.** Любая замена транспорта должна это учитывать.

### 10.4 Модель авторизации

Всего три уровня, никакой ролевой системы за пределами этого:

1. **Владелец проекта.** Практически каждый Pulsify-эндпоинт делает
   `ownedProject(db, id, session.user.id)` — читает проект и сверяет `owner_id`.
   Несовпадение = `404` (а не 403 — намеренно, чтобы не подтверждать существование).
2. **Админ.** `session.user.role === 'admin'`, проверяется прямо в хендлере
   (`/projects?owner=`, `/projects/:id/verify`, вся админка через Better Auth).
3. **Машинные секреты.** `API_SECRET_KEY` (bearer, публикация Atlas из CI) и
   DSN-токены (bearer, ingest).

Организаций/команд/совместного доступа нет — один проект принадлежит ровно одному
пользователю.

---

## 11. Atlas: публикация и раздача сборок

### 11.1 Создание проекта

**Эндпоинта нет.** Строки `atlas_projects` создаются вручную прямо в базе.
В новой версии это должно стать нормальным admin-эндпоинтом.

### 11.2 Создание версии

`POST /atlas/projects/:project/versions/create` с bearer `API_SECRET_KEY`,
тело `{key, supportStatus?, javaMinVersion?}`. Дубликат версии → `409`.

### 11.3 Загрузка сборки

`POST /atlas/projects/:project/versions/:version/builds/upload`, `multipart/form-data`:

- `file` — артефакт (обязателен);
- `metadata` — JSON `{buildNumber?, channel?, commits?}`;
- либо отдельные поля `buildNumber`, `channel`, `commits` (fallback, если `metadata`
  не передан — поля разбираются по одному).

Последовательность:
1. Парс и валидация метаданных (Zod).
2. Поиск проекта и версии (404 при отсутствии).
3. Если `buildNumber` не задан — `последний + 1`, начиная с 1
   (**check-then-insert без блокировки — гонка двух CI-джоб перезаписывает сборку**).
4. `file.arrayBuffer()` — **весь файл буферизуется в памяти**, считается SHA-256.
5. `PUT` в R2 по ключу `{projectKey}/versions/{versionKey}/{buildNumber}/{fileName}`.
6. `INSERT` в `atlas_builds` → `RETURNING`.
7. `INSERT` коммитов и записи download — через `db.batch()` (у D1 нет интерактивных
   транзакций, `batch` — единственная атомарная единица). При ошибке строка сборки
   удаляется компенсирующим `DELETE`.

Итог: артефакт может остаться в R2 без строки в базе, и наоборот — гонка на шаге 3
может перезаписать чужой объект. В Rust-версии это должно быть: **стриминговая
загрузка в R2 + одна транзакция + уникальные ограничения** `(project_id, key)` и
`(version_id, build_number)`.

---

## 12. Frontend (meridian)

Остаётся как есть — TypeScript, Nuxt 4, Vue 3, Tailwind v4. Здесь описано то, что
бэкенд обязан ему предоставить.

### 12.1 Сборка и деплой

`nuxt generate` (`nitro.preset: 'static'`) → `.output/public` → Cloudflare Workers
Static Assets. Никакого рантайма Nitro нет. `worker.ts` — 15 строк: отдать ассет, а
если 404 и путь не похож на файл — отдать `/200.html` (SPA fallback).

`routeRules` делает `ssr: false` для `/dashboard/**`, `/admin/**`, `/downloads/**`,
`/login` — эти разделы рендерятся только в браузере и тянут данные из API.
Всё остальное (лендинг, документация, roadmap, legal, team) пререндерится.

### 12.2 Клиент API

```ts
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.bxteam.org';

// credentialed — для /auth и /pulsify
export function api<T>(path, opts) {
  return $fetch<T>(path, { baseURL: API_BASE, credentials: 'include', ...opts });
}
```

Atlas дёргается обычным `fetch` без credentials (`app/lib/atlas.ts` — типизированные
обёртки над всеми Atlas-эндпоинтами плюс форматтеры размера/даты, цвета каналов и
`getOrderedVersionGroups`).

Better Auth клиент: `createAuthClient({ baseURL: `${API_BASE}/auth`,
plugins: [adminClient(), magicLinkClient()], fetchOptions: { credentials: 'include' } })`.

### 12.3 Карта маршрутов

| Маршрут | Layout | Middleware | Данные |
|---|---|---|---|
| `/` | — | — | статика |
| `/docs`, `/docs/[...slug]` | `docs` | — | `@nuxt/content` коллекция `docs` |
| `/downloads`, `/downloads/[project]` | — | — | Atlas API |
| `/roadmap` | — | — | коллекция `roadmap` |
| `/team` | — | — | статика |
| `/legal/[slug]` | — | — | коллекция `legal` |
| `/login` | — | `disabled.global` | Better Auth |
| `/dashboard` | `dashboard` | `auth` | `/pulsify/overview`, `/pulsify/projects` |
| `/dashboard/settings` | `dashboard` | `auth` | `/pulsify/billing`, Better Auth |
| `/dashboard/[slug]` | `dashboard` | `auth` | `/stats`, `/players` |
| `/dashboard/[slug]/players` | `dashboard` | `auth` | `/players`, `/geography`, `/client-versions`, `/session-duration`, `/retention` |
| `/dashboard/[slug]/errors` | `dashboard` | `auth` | `/errors`, `/errors/payload`, `/errors/status`, `/errors/versions`, `/cross-errors` |
| `/dashboard/[slug]/metrics` | `dashboard` | `auth` | `/metrics`, `/metrics/:name` |
| `/dashboard/[slug]/alerts` | `dashboard` | `auth` | `/alerts` CRUD |
| `/dashboard/[slug]/settings` | `dashboard` | `auth` | `/tokens` CRUD |
| `/admin` | `admin` | `admin` | Better Auth admin + `/pulsify/projects?owner=`, `/verify` |

Проекты в дашборде адресуются по **slug** в URL, но все API-запросы идут по **id** —
фронт держит список проектов (`useProjects`) и резолвит slug → id локально.
То есть `/pulsify/projects` — обязательная предзагрузка для любой страницы проекта.

`middleware/disabled.global.ts` + `config/pages.ts` — механизм точечного выключения
страниц (сейчас выключен `/login`), с префиксным матчингом.

### 12.4 Контент

Три коллекции `@nuxt/content` (`content.config.ts`):

- `docs` — `content/docs/**/*.md`, схема `{title, description?, icon?, badge?}`.
  Разделы: `divinemc`, `ndailyrewards`, `quark`, с числовыми префиксами папок для
  порядка (`01.getting-started/`).
- `legal` — `content/legal/**/*.md`, `{title, description?, lastUpdated?}`.
- `roadmap` — `content/roadmap/*.md`, `{title, slug, icon, accent?, order, blurb,
  items: [{id, title, status: planned|progress|review|shipped, progress?, description?}]}`.

Поиск по документации — полностью клиентский, поверх `queryCollectionSearchSections`,
подгружается один раз и фильтруется локально. Есть command palette (Cmd/Ctrl+K).

Кастомные MDC-компоненты в `app/components/content/`: `Callout`, `Cards`/`Card`,
`CodeGroup`, `CodeTabs`, `Steps`/`Step`, `ProseH2`/`ProseH3`, `ConfigViewer`,
`DivineMcConfig`, `NdailyRewardsConfig`. Подсветка — Shiki, тема `github-dark`,
фиксированный список языков в `nuxt.config.ts`.

### 12.5 Дизайн-система

`packages/ui` — 12 Vue-компонентов + `tokens.css` (CSS custom properties, oklch,
тёмная тема first). Собственной сборки нет: `.vue` потребляются напрямую,
Nuxt транспилирует через `build.transpile: ['@bx-team/ui']`. Правила подробно
описаны в `packages/ui/CLAUDE.md` — при переписи бэкенда этот файл не трогаем.

Мелочь, которую легко потерять: футер показывает Cloudflare edge-локацию визитёра,
для чего есть плагин `location.client.ts`, дёргающий `GET /location`.
Если бэкенд переезжает с edge — этот эндпоинт либо переосмысливается, либо убирается
вместе с элементом UI.

---

## 13. Бизнес-инварианты и правила, которые нельзя потерять

Список того, что в новой реализации обязано вести себя точно так же.

### 13.1 Приватность игроков — не опция

Скрабинг происходит **на приёме**, а не на выдаче. Никакие UUID, IP и e-mail не
должны попадать в хранилище в принципе. Мотивация двойная: GDPR и то, что через
кросс-серверную агрегацию текст ошибки виден автору плагина, который **не должен**
узнать, кто был игрок и какой был сервер.

### 13.2 Фингерпринт считается один раз

Он общий ключ для AE-индекса, R2-объекта и реестра issues. Обе стороны никогда не
пересчитывают его независимо.

### 13.3 Кросс-агрегация под двойным замком

- Проект должен быть `verified` (иначе кто угодно зарегистрирует проект с именем
  `EssentialsX` и соберёт чужие краши).
- Сервер должен иметь `share_errors = true`.

Верификация делается только админом руками. **`share_errors` сейчас нельзя выключить
из UI — это надо починить.**

### 13.4 Имя plugin/mod глобально уникально

Потому что имя — единственный ключ матчинга heartbeat → установка.

### 13.5 Квоты

| Квота | Значение | Где enforced |
|---|---|---|
| Проектов на пользователя | 10 (`pulsify_quotas.max_projects`) | azimuth, POST /projects |
| Событий в сутки | 100 000 | influx (константа), не читает `max_events_per_day` |
| Запросов в минуту на токен | 100 | influx, rate limiter |
| Правил алертов на проект | 20 | azimuth, константа |
| Payload'ов при кросс-поиске | 20 серверов | azimuth, константа |

### 13.6 Целостность через границы баз

Нет FK между `pulsify_projects.owner_id` и `auth_users.id`. Компенсации:
`userExists()` перед созданием проекта (валидная сессия может пережить удалённого
пользователя) и `afterDelete` хук Better Auth. В новой версии, где база одна,
это становится обычным FK — и обе компенсации исчезают.

### 13.7 Статусы issue

Подавленными (не попадают в счётчик ошибок) считаются все статусы кроме `open`.
Истёкший `muted` показывается как `open` немедленно и переводится в `open` при
следующем событии — без алерта.

### 13.8 Порядок версий значим

Группы версий на странице загрузок должны идти новыми первыми. Это порядок рендера,
а не косметика.

---

## 14. Что в текущей архитектуре плохо

Мотивация переписи. Разделено на «неправильные числа» и «неправильная инженерия».

### 14.1 Analytics Engine выдаёт неверные результаты, а не просто медленные

Это главный пункт. Три конкретных случая:

1. **Retention и «новички» считаются в приложении с `LIMIT 10000`.** У AE нет JOIN и
   подзапросов, поэтому множества игроков вытягиваются в воркер и пересекаются в JS.
   За порогом 10 000 игроков цифры молча неверны.
2. **Метки метрик живут в трёх слотах, заполняемых по алфавиту.** Метрика с метками
   `currency/extra/tier/world` не может быть разбита по `world` — четвёртая метка
   просто не попадает в фильтруемый слот.
3. **Дубликат slug приводит к 500** — перед вставкой проверяется только имя.

### 14.2 Latency: каждый виджет дашборда — внешний HTTPS

Чтение аналитики идёт запросом на `api.cloudflare.com`, то есть выходом из воркера
в публичную сеть. D1 — сетевая реплицируемая SQLite. Основной выигрыш от переезда
даёт **локальность хранилища**, а не сам Rust.

### 14.3 SQL склеивается строками

`aeQuery` принимает готовую строку, значения инлайнятся через самописные
экранирующие функции. Bind-параметров у AE SQL API нет вовсе. Всё держится на том,
что `projectId` — UUID из базы, а не пользовательский ввод.

### 14.4 Дублирование логики

- Парсинг/сравнение версий — в `cinder/lib/version.ts` и `azimuth/lib/versions.ts`.
- Очистка PII — `scrub()` в `packages/types` и `anonymize()` в `azimuth/lib/pulsify.ts`
  с разными наборами регулярок.
- `if (!session) return c.json({message:'Unauthorized'}, 401)` — скопирован в каждый
  из ~25 хендлеров, хотя `requireAuth` уже стоит на группе. Типобезопасного
  экстрактора нет.
- Подсчёт «неподавленных ошибок» реализован дважды (в `/overview` и в
  `countOpenErrors` в `projects.ts`).

### 14.5 Транзакционные дыры

- Загрузка сборки: R2 PUT + INSERT сборки + batch дочерних вставок, с компенсирующим
  DELETE вместо транзакции.
- Гонка на автоинкременте `buildNumber`.
- `atlas_versions (project_id, key)` и `atlas_builds (version_id, build_number)` — не
  уникальные индексы.

### 14.6 Ресурсы и эксплуатация

- Загрузка `.jar` целиком в память (безопасно в изоляте Workers на 128 МБ, опасно на
  VPS с 4 ГБ).
- `pulsify_daily_usage` растёт бесконечно, TTL нет.
- Объекты `error-payloads` в R2 не чистятся никогда.
- Невалидное сообщение в очереди `ack()`-ается молча: ни DLQ, ни счётчика.
- Длительность сессии берётся с часов Minecraft-сервера — недоверенный ввод.
- Дневная квота в influx захардкожена и не сходится с `pulsify_quotas`.

### 14.7 Инженерная гигиена

- **Тестов нет вообще ни одного.**
- **CI нет** (`.github/` отсутствует).
- Два разных формата ошибок API (`{ok,error,message}` у Atlas, `{message}` у Pulsify).
- OpenAPI написан руками отдельным файлом на 339 строк и покрывает только Atlas —
  расходится с кодом по определению.
- Три D1-базы вместо одной — артефакт платформы, протёкший в доменную модель.

---

## 15. Целевая архитектура на Rust

За образец берётся `~/Projects/modrinth-code` — и по раскладке репозитория, и по
внутренней структуре сервиса (`apps/labrinth`).

### 15.1 Раскладка репозитория

```
/
├── Cargo.toml                # workspace: members, workspace.dependencies,
│                             #            workspace.package, workspace.lints, profiles
├── Cargo.lock
├── rust-toolchain.toml       # channel = "1.9x", profile = "default"
├── rustfmt.toml              # edition = "2024", max_width = 100
├── clippy.toml               # msrv
├── _typos.toml
├── biome.json                # для TS-части (meridian + ui)
├── package.json              # bun workspaces: apps/meridian, packages/ui — и всё
├── docker-compose.yml        # postgres + clickhouse + minio для локальной разработки
├── ARCHITECTURE.md           # этот документ
│
├── .github/
│   ├── changelog_configuration.json   # группировка коммитов, см. §17.3
│   └── workflows/            # см. §17
│
├── apps/
│   ├── meridian/             # TypeScript, Nuxt 4 — без изменений
│   ├── azimuth/              # Rust: публичный + сессионный API  (+ Dockerfile)
│   ├── influx/               # Rust: ingest gateway              (+ Dockerfile)
│   └── cinder/               # Rust: консьюмер очереди + планировщик (+ Dockerfile)
│
└── packages/
    ├── ui/                   # TypeScript, Vue — без изменений
    ├── types/             # wire-формат, fingerprint, scrub, версии, build_info
    ├── database/                # Postgres: миграции, модели, .sqlx
    ├── analytics/         # ClickHouse: схема + типизированные запросы
    ├── storage/           # S3/R2
    ├── mail/              # SMTP + шаблоны писем
    ├── geoip/             # IPinfo Lite mmdb
    └── util/              # ошибки, extractors, cors, rate limit, tracing
```

Соглашения, скопированные с modrinth:
- Все зависимости объявляются **один раз** в `[workspace.dependencies]`, крейты
  подключают их как `foo = { workspace = true }`.
- `[workspace.package]` c `edition = "2024"`, `rust-version`, `repository`,
  `version` — **одна версия на весь воркспейс**, один тег релиза.
- `[workspace.lints.clippy]` — общий набор запретов (`dbg_macro`, `todo`,
  `redundant_clone`, `uninlined_format_args`, `manual_let_else` и т.д.).
- Профили: `release` (`opt-level = "s"`, `strip`, `lto`, `panic = "abort"`) и
  отдельный `release-service`, наследующий release, но с `panic = "unwind"` и
  сохранёнными символами — для продакшн-бинарей, которые не должны падать целиком
  из-за паники в одном запросе.
- `[profile.dev.package.sqlx-macros] opt-level = 3` — иначе компиляция невыносимо
  медленная.

### 15.2 Внутренняя структура сервиса (по образцу labrinth)

```
apps/azimuth/
├── Cargo.toml
├── migrations/            # если решим держать миграции рядом с сервисом, а не в database
├── .sqlx/                 # закоммиченные offline-запросы sqlx
├── src/
│   ├── main.rs            # только запуск: конфиг → пул → роутер → listener
│   ├── lib.rs             # сборка приложения, чтобы тесты могли поднимать его целиком
│   ├── env.rs             # типизированный конфиг из окружения, валидируется на старте
│   ├── state.rs           # AppState: пулы, клиенты, конфиг
│   ├── routes/
│   │   ├── mod.rs
│   │   ├── atlas/         # projects.rs, versions.rs, builds.rs, upload.rs
│   │   ├── pulsify/       # projects.rs, analytics.rs, errors.rs, metrics.rs,
│   │   │                  # tokens.rs, alerts.rs, overview.rs, billing.rs
│   │   ├── auth/          # magic_link.rs, oauth.rs, session.rs, admin.rs
│   │   └── internal.rs    # /health, /location, /
│   ├── models/            # API-модели: то, что сериализуется в ответ
│   ├── database/models/   # строки БД + запросы к ним (по образцу *_item.rs)
│   ├── analytics/         # запросы к ClickHouse, по одному модулю на виджет
│   ├── auth/              # проверка сессии, extractors, RBAC
│   ├── util/              # ошибки, guards, валидация, cors, ratelimit
│   └── scheduler.rs       # периодические задачи (если нужны в этом сервисе)
└── tests/                 # интеграционные тесты через lib.rs
```

Ключевое разделение, которое стоит перенять у labrinth: **`models/` и
`database/models/` — разные вещи.** Первое — контракт API (то, что видит фронт),
второе — строки таблиц и запросы. Их смешение как раз и делает рефакторинг схемы
ломающим изменением API.

### 15.3 Замены платформенных примитивов

| Cloudflare | Замена | Почему |
|---|---|---|
| D1 × 3 | один PostgreSQL `bx_team`, 3 схемы (`auth`, `atlas`, `pulsify`) | разделение было артефактом D1; FK между схемами работают |
| Analytics Engine × 5 | ClickHouse, 5 таблиц | AE SQL — уже диалект ClickHouse, запросы переносятся почти буквально |
| AE SQL API (внешний HTTPS) | локальный ClickHouse | главный выигрыш по latency |
| Queues + DLQ | Postgres `FOR UPDATE SKIP LOCKED` | без отдельного демона; сообщение и его эффекты в одной транзакции |
| DO `SessionBridge` | таблица `pulsify.open_sessions` | открытие/закрытие сессии коммитится в той же транзакции, что и сообщение очереди — редоставка не задваивает |
| KV + IPinfo API | локальная IPinfo Lite mmdb | geoip уходит из горячего пути; HTTPS-вызов внутри транзакции недопустим |
| Rate Limiting binding | `tower-governor` | на одной ноде точнее |
| `send_email` binding | `lettre` → локальный SMTP-релей | Workers Paid не нужен |
| Cron trigger | `tokio::time::interval` в cinder | меньше движущихся частей |
| Workers Static Assets | **остаётся** | статика — идеальная нагрузка для CDN |
| R2 | **остаётся** | S3 API работает откуда угодно, egress бесплатный |
| Edge cache (Atlas GET) | CDN + `Cache-Control` | тот же эффект без Cache API |

### 15.4 Технологические решения

| Решение | Выбор | Обоснование |
|---|---|---|
| HTTP-фреймворк | **axum** | tower-экосистема (governor, tracing, timeout, cors) даёт middleware бесплатно; у modrinth actix-web по историческим причинам |
| Слой БД | **sqlx, без ORM** | использование Drizzle было тривиальным (`eq`/`and`/`inArray`, ноль динамических условий) — сохранять нечего; `query!` даёт проверку схемы на компиляции |
| Миграции | одна плоская папка `.sql`, `sqlx::migrate!()`, запуск на старте бинаря | нет отдельного шага деплоя |
| ClickHouse | крейт `clickhouse` | типизированные строки, HTTP-интерфейс |
| Валидация | `serde` + явные проверки, `validator` где нужно | zod-схемы становятся структурами с `#[serde(deny_unknown_fields)]` там, где это уместно |
| OpenAPI | **`utoipa`, генерируемый из хендлеров** | 339 строк ручного JSON расходятся с кодом by design |
| Ошибки | `thiserror` + один тип ошибки на сервис с `IntoResponse` | **единый формат ошибки для всех групп маршрутов** |
| Логи | `tracing` + `tracing-subscriber` | |
| Тесты | интеграционные через `lib.rs` + `sqlx::test` | сейчас тестов ноль — это надо изменить в первую очередь |

### 15.5 Именование хранилищ

Имя `bx` слишком короткое и ни о чём не говорит в списке баз рядом с системными.

| Что | Имя |
|---|---|
| База PostgreSQL | `bx_team` |
| Роль PostgreSQL | `bx_team` |
| База ClickHouse | `bx_team` |
| Схемы в PostgreSQL | `auth`, `atlas`, `pulsify` |
| Бакеты R2 | `builds`, `error-payloads` (без изменений) |
| Образы | `ghcr.io/bx-team/{azimuth,influx,cinder}` |

Подчёркивание, а не дефис: `bx-team` в PostgreSQL пришлось бы кавычить в любом DDL и в
`psql`, а `bx_team` работает везде без экранирования.

**Это расходится с текущим `/etc/nixos`**, где база, роль и пользователь называются `bx`
(`postgres.nix`, `secrets.nix`: `DATABASE_URL=postgres://bx:…@127.0.0.1:5432/bx`).
При переписи хостовую конфигурацию надо поправить синхронно. Ключи sops
(`stockholm/bx/...`) и имена юнитов (`podman-bx-*`) переименовывать не обязательно —
они не пересекаются с чужими сущностями.

Имена крейтов остаются короткими (`types`, `database`, …) — это внутренние Rust-имена,
которые нигде не соседствуют с чужими.

### 15.6 Версия сервиса и карточка на `/`

Каждый HTTP-сервис отвечает на `GET /` карточкой в стиле labrinth:

```jsonc
{
  "name": "bx-team-azimuth",
  "version": "0.1.0",
  "documentation": "https://bxteam.org/docs/api",
  "about": "Welcome traveler!",
  "build_info": {
    "git_hash": "366f528",
    "comp_date": "2026-08-01T12:00:00Z",
    "profile": "release-service"
  }
}
```

- `version` — `env!("CARGO_PKG_VERSION")`, то есть **общая версия воркспейса**: один тег
  `vX.Y.Z` покрывает все три сервиса.
- `git_hash` — `option_env!("BX_GIT_HASH")` с фолбэком `"unknown"`; переменная
  проставляется только в сборке сервиса, не в сборке зависимостей, иначе каждый коммит
  инвалидирует кэш зависимостей.
- `comp_date` и `profile` — через `build.rs` (`dotenv-build` или ручной `println!`).

Строка для логов и заголовка `Server` собирается оттуда же:
`Azimuth (v0.1.0/366f528)`.

Функция сборки карточки живёт в `types::build_info` **обычной функцией, а не макросом** —
`CARGO_PKG_VERSION` там резолвится в самом `types`, а версия всё равно общая на
воркспейс.

### 15.7 Обязательные архитектурные правила новой версии

Это прямые ответы на §14 — то, что должно быть заложено в фундамент, а не
починено потом:

1. **Один модуль версий** (`types::version`), используемый и детектом регрессий,
   и сортировкой загрузок.
2. **Одна функция скрабинга** с одним набором правил. Уровни «что видит владелец» и
   «что видит автор плагина» различаются политикой, а не второй регуляркой.
3. **Аутентификация — extractor, а не строчка в теле хендлера.**
   `Session`, `AdminSession`, `OwnedProject` как типы: если хендлер принимает
   `OwnedProject`, проверка владения уже произошла, забыть её нельзя.
4. **Ни одного склеенного SQL.** Всё через bind-параметры (в том числе ClickHouse).
5. **Один формат ошибки** для всего API.
6. **OpenAPI генерируется из кода.**
7. **Транзакции реальные.** Загрузка сборки — одна транзакция + стриминг в R2 +
   уникальные ограничения вместо check-then-insert.
8. **Ни одной агрегации, вытянутой в приложение из-за ограничений хранилища.**
   Retention, новички, разбивка по меткам — всё считается в ClickHouse.
9. **Метки метрик — настоящий `Map(String, String)`**, а не три слота.
10. **Квоты в одном месте.** `pulsify.quotas` — источник истины, influx читает
    оттуда (с кэшем), а не из константы.
11. **Ретеншен данных явный.** TTL на `daily_usage`, политика жизни объектов в R2,
    TTL таблиц ClickHouse.
12. **Невалидное событие — наблюдаемое событие**, а не молчаливый `ack`.
13. **Тесты на всё, где есть арифметика или контракт:** fingerprint (parity-векторы
    со старой реализацией), сравнение версий, группировка версий, жизненный цикл
    issue, квоты, скрабинг, **десериализация реального батча SDK**.
14. **CI с первого дня:** `cargo fmt --check`, `cargo clippy -D warnings`,
    `cargo test`, `cargo sqlx prepare --check`, `biome ci .`.
15. **Совместимость с SDK — граничное условие.** Ни одно решение в ingest не имеет
    права требовать правки в `~/Projects/Pulsify` (§6.6). В частности: временная
    недоступность отдаётся как `429`/`5xx`, никогда как `4xx`.
16. **`GET /` с версией и git-хэшем на каждом HTTP-сервисе** (§15.6).
17. **Комментариев мало.** Сборочные файлы, workflow'ы и Nix-модули не документируются
    вообще (§18).

---

## 16. Развёртывание: NixOS-хост

Бэкенд полностью съезжает с Cloudflare Workers на **собственный VPS под NixOS**.
На Cloudflare остаются ровно три вещи: статика `meridian`, R2 и DNS.

### 16.1 Что где живёт

```
VPS (NixOS, хост `stockholm`)
├── nginx                       :443  → TLS-терминация, реверс-прокси
│     ├── api.bxteam.org        → 127.0.0.1:8080  (azimuth)
│     └── ingest.bxteam.org     → 127.0.0.1:8081  (influx)
├── podman
│     ├── bx-azimuth            ghcr.io/bx-team/azimuth
│     ├── bx-influx             ghcr.io/bx-team/influx
│     └── bx-cinder             ghcr.io/bx-team/cinder
├── postgresql 17               :5432 (loopback) — база bx_team, схемы auth/atlas/pulsify
├── clickhouse                  :8123 (loopback) — аналитика
├── postfix + opendkim          :25   (loopback) — исходящая почта
└── systemd-таймеры             geoip-обновление, бэкапы

Cloudflare (остаётся)
├── bxteam.org                  → Workers Static Assets (meridian, nuxt generate)
├── files.bxteam.org            → R2 `builds` — артефакты Atlas
├── R2 `error-payloads`         → полные payload'ы ошибок (приватный)
├── R2 `bx-backups`             → offsite-копии дампов
├── DNS proxy на api. и ingest.
└── Email Routing (входящая почта) — бесплатно, не трогаем
```

**R2 остаётся** и для Atlas, и для payload'ов ошибок: S3 API работает откуда угодно,
исходящий трафик бесплатный, а объектное хранилище на 4-гигабайтной машине рядом с
ClickHouse — плохая идея. Ключи объектов не меняются, значит публичные ссылки на
загрузки продолжают работать.

### 16.2 Конфигурация хоста уже написана

Она лежит в **`/etc/nixos`** (отдельный приватный репозиторий, не в этом монорепо) и уже
содержит рабочую базу для деплоя:

```
/etc/nixos/bxteam/
├── default.nix       # авто-импорт соседних модулей, общий `bx` (домен, image, container,
│                     # secret/placeholder), backend = podman
├── versions.json     # версия релиза + образы + digest'ы — источник истины о том,
│                     # что именно крутится на хосте
├── azimuth.nix       # контейнер + env + ordering после postgres/clickhouse
├── influx.nix        # то же
├── cinder.nix        # то же + монтирование geoip-каталога
├── postgres.nix      # PG 17, тюнинг под 4 ГБ, scram-sha-256 по loopback
├── clickhouse.nix    # лимиты памяти, UTC, mark_cache урезан
├── nginx.nix         # ACME DNS-01 для проксируемых доменов, лимиты, отключённая
│                     # буферизация тела для стриминговой загрузки
├── mail.nix          # postfix smarthost + opendkim
├── geoip.nix         # systemd-таймер обновления IPinfo Lite
├── backups.nix       # ночные дампы PG + ClickHouse → R2 через rclone
└── secrets.nix       # sops-шаблон общего env-файла
```

Из этого следует несколько вещей, которые надо принять как данность при написании кода:

- **Сервисы получают конфигурацию только через переменные окружения** — общий
  env-файл рендерится sops-шаблоном и подсовывается всем трём контейнерам,
  плюс per-service `environment` в модуле. Никаких конфиг-файлов.
- **Все слушают loopback** (`AZIMUTH_BIND=127.0.0.1:8080`, `INFLUX_BIND=127.0.0.1:8081`),
  контейнеры запускаются с `--network=host`, потому что Postgres, ClickHouse и postfix
  доступны только по петле.
- **Контейнер read-only, без capabilities, `no-new-privileges`, от `nobody`.** Значит:
  бинарь статический, никаких временных файлов в ФС, всё состояние — в базах и R2.
  Единственный смонтированный путь — каталог geoip, и тот `:ro`.
- **Образы пинуются по digest'у** (`versions.json`), чтобы перезалитый тег не поменял
  то, что запускается при следующей пересборке хоста.
- **Порядок запуска задаётся в модулях** (`after`/`wants` на postgres/clickhouse), но
  сервис всё равно должен переживать недоступность базы на старте без краш-лупа.
- **Миграции применяются самим бинарём при старте** (`sqlx::migrate!()`) — отдельного
  шага деплоя нет, потому что деплой это `nixos-rebuild` с новым digest'ом.

### 16.3 Почта: relay Hostup

Исходящая почта уходит через SMTP-релей хостера. Его условия:

```
relay.hostup.se, порт 25 или 587, TLS, без логина
```

Авторизация — **по IP отправителя**, поэтому домен нужно подтвердить DNS-записями:

```
_hostup.bxteam.org.  TXT  "v=mc1 auth=h_NjQuMTEyLjEyNC4xMzU=_385aca9b89e1"
```

и добавить в SPF домена:

```
include:spf.hostup.se
```

(`auth=` — это base64 от IP `64.112.124.135`, к которому привязан релей. Пока
`_hostup` TXT не опубликован, релей принимает почту для домена от любого клиента
Hostup — то есть запись нужна не «для галочки».)

**Релей не может подписывать за нас.** Логина нет, значит нет и способа сообщить ему,
чьим ключом подписывать, — DKIM ложится на нас. Отсюда конструкция на хосте:

```
azimuth ──smtp://127.0.0.1:25──► postfix ──milter──► opendkim
                                    │
                                    └──[relay.hostup.se]:587──► интернет
```

Что это даёт кроме DKIM: очередь с повторными попытками (а magic link — это и есть
вход, так что доставляемость почты равна доступности аутентификации) и `sendmail` для
вывода cron/systemd.

Детали, которые уже учтены в `mail.nix` и которые легко сломать обратно:

- `smtp_tls_security_level = encrypt`, **не `secure`** — под релеем MailChannels, и имя
  в предъявляемом сертификате не наше.
- Скобки в `relayhost = [relay.hostup.se]:587` отключают MX-lookup. Порт 587, потому что
  исходящий 25 провайдеры режут первым делом.
- `always_add_missing_headers = true` — `lettre` не проставляет `Message-ID`, а его
  отсутствие получатели считают спам-сигналом.
- `milter_default_action = tempfail` — неподписанное письмо лучше подержать в очереди,
  чем отправить.
- **opendkim и postfix пишут один и тот же сокет по-разному:** у opendkim `-p` это
  `inet:порт@хост`, у postfix milter-адрес это `inet:хост:порт`. Ошибка проходит
  вычисление молча и всплывает только в рантайме.
- DKIM-ключ лежит в sops и устанавливается в `preStart` через `lib.mkBefore`, чтобы
  модуль не сгенерировал свой и не инвалидировал опубликованную DNS-запись.
- Отправитель — `no-reply@bxteam.org` (`EMAIL_FROM`), входящая почта остаётся на
  Cloudflare Email Routing.

Со стороны Rust это просто `lettre` c `SMTP_URL=smtp://127.0.0.1:25` — без TLS и без
аутентификации, потому что это петля. Замена провайдера (Resend, Postmark) — это смена
одной переменной, а не кода.

### 16.4 GeoIP

Вместо KV + IPinfo API — локальная база **IPinfo Lite в формате mmdb** (~25 МБ),
читается в память при старте (`open_readfile`, не `mmap`), путь в `IPINFO_MMDB_PATH`.

База обновляется systemd-таймером раз в сутки, который тянет её из rolling-релиза
`geoip` в GitHub, сверяет sha256 с опубликованным `SHA256SUMS` **до** скачивания
25 мегабайт и перезапускает cinder только если файл действительно изменился.

Ловушка: у IPinfo Lite **плоская схема записи** (`country_code`), а не вложенная
`country.iso_code` как у GeoLite2. Файл от MaxMind не упадёт, а тихо вернёт `None` для
каждого адреса — поэтому при открытии надо проверять, что `metadata().database_type`
начинается с `ipinfo`.

### 16.5 Бэкапы

Ночью: `pg_dump` базы `bx_team` + `BACKUP DATABASE` ClickHouse, затем `rclone` в R2
(`bx-backups/postgresql/…`, `bx-backups/clickhouse/…`), локальные копии старше двух
суток удаляются.

---

## 17. Релизы, CI/CD и ченджлог

За основу берётся CI modrinth (сборка + публикация образов в GHCR), устройство
PR-проверок — nixpkgs (оркестратор + переиспользуемые workflow'ы), генерация
ченджлога — Nyx (JSON-конфигурация группировки коммитов).

### 17.1 Форма поставки

Релиз — это **три Docker-образа** в `ghcr.io/bx-team/{azimuth,influx,cinder}`, а не
бинарники и не Nix-замыкание.

- Бинарь собирается один раз в CI (`cargo build --profile release-service`), затем
  копируется в минимальный образ. Как у modrinth: `Dockerfile` берёт **готовый бинарь**
  из staging-каталога, а не собирает внутри — иначе кэш Rust не переживает слой Docker.
- Обязательные метки: `org.opencontainers.image.source=https://github.com/BX-Team/code`
  (именно она связывает пакет с репозиторием и даёт `GITHUB_TOKEN` право на push),
  `title`, `description`, `licenses=AGPL-3.0-only`.
- Тег `vX.Y.Z` + `latest`; в артефакт релиза кладётся `deploy.json` с digest'ами
  трёх образов — его содержимое целиком переносится в `/etc/nixos/bxteam/versions.json`.
- **Один тег на весь воркспейс.** `version.workspace = true`, релизный workflow падает,
  если тег не совпадает с версией в `Cargo.toml`.

### 17.2 Устройство workflow'ов

Логика PR-проверки — многоступенчатая, по образцу nixpkgs: один оркестратор вызывает
переиспользуемые workflow'ы через `workflow_call`, а не одна плоская простыня.

```
.github/workflows/
├── pull-request.yml     # оркестратор: prepare → lint / check / build / test → summary
├── lint.yml             # workflow_call: fmt, clippy -D warnings, biome ci, typos, cargo-shear
├── check.yml            # workflow_call: cargo check, sqlx prepare --check, проверка
│                        #                заголовков коммитов под changelog-конфиг
├── build.yml            # workflow_call: сборка трёх бинарей, артефакты для test.yml
├── test.yml             # workflow_call: cargo test + интеграционные на service containers
│                        #                (postgres + clickhouse + minio)
├── docker.yml           # workflow_call: сборка и push образов
├── release.yml          # workflow_dispatch: bump → tag → build → push → changelog → release
├── web.yml              # meridian: biome, nuxt build, деплой на Cloudflare
└── geoip.yml            # ежедневное обновление rolling-релиза geoip
```

Принципы, которые стоит взять у nixpkgs:

- **Job `prepare` первым.** Он определяет, что вообще затронуто (`rust` / `web` /
  `workflows` / `docs`), и отдаёт это в `outputs`. Дальше `if:` на каждом вызове —
  правка документации не должна собирать три образа.
- **Переиспользуемые workflow'ы вместо копипасты**, вход через типизированные `inputs`,
  секреты передаются явно и по минимуму.
- **`permissions: {}` по умолчанию** в каждом workflow, права поднимаются точечно на
  конкретном job.
- **Concurrency-группа с фолбэком:**
  `group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.run_id }}`,
  `cancel-in-progress: true`. Фолбэк на `run_id` гарантирует, что прогоны вне PR
  никогда не отменяют друг друга.
- **Порядок гейтов:** дешёвое раньше дорогого — сначала `lint`, потом `check`, потом
  `build`, потом `test`, и только на релизе `docker`.
- **Actions пинуются по SHA**, а не по тегу (как в modrinth и nixpkgs).
- Один финальный job-«зонтик» со `needs` на все остальные — именно он ставится
  required-проверкой в настройках ветки, чтобы список не приходилось править при
  каждом новом job'е.

Кэширование и переменные окружения — как у modrinth: `SQLX_OFFLINE=true`,
`CARGO_INCREMENTAL=0`, `swatinem/rust-cache`, `mold` как линкер, `sccache` при наличии.

### 17.3 Ченджлог

Берётся система из `~/Projects/Nyx`: `mikepenz/release-changelog-builder-action` в
режиме `COMMIT` + JSON-конфигурация в `.github/changelog_configuration.json`.

Как это работает: `label_extractor` вытаскивает тип из заголовка коммита регуляркой по
Conventional Commits, `categories` раскладывает по разделам, `commit_template` рендерит
строку со ссылкой на коммит.

```jsonc
{
  "template": "#{{CHANGELOG}}",
  "commit_template": "- [`#{{SHORT_MERGE_SHA}}`](https://github.com/BX-Team/code/commit/#{{MERGE_SHA}}) #{{TITLE}}",
  "categories": [
    { "title": "## 🚀 Features",      "labels": ["feat", "feature"] },
    { "title": "## 🐛 Fixes",         "labels": ["fix", "bug"] },
    { "title": "## 🏎️ Performance",   "labels": ["perf"] },
    { "title": "## 🏗 Refactor",      "labels": ["refactor"] },
    { "title": "## 📝 Documentation", "labels": ["docs"] },
    { "title": "## 🔨 Build",         "labels": ["build", "chore", "ci"] },
    { "title": "## 💅 Style",         "labels": ["style"] },
    { "title": "## 💬 Other",         "labels": [] }
  ],
  "label_extractor": [
    {
      "pattern": "^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style){1}(\\([\\w\\-\\.]+\\))?(!)?: ([\\w ])+([\\s\\S]*)",
      "on_property": "title",
      "target": "$1"
    }
  ],
  "custom_placeholders": [
    {
      "name": "SHORT_MERGE_SHA",
      "source": "MERGE_SHA",
      "transformer": { "pattern": "^([0-9a-f]{7})[0-9a-f]*$", "target": "$1" }
    }
  ]
}
```

Из этого следует требование к коммитам: **заголовки в Conventional Commits**, иначе
коммит уезжает в «Other». Проверку заголовков имеет смысл повесить в `check.yml` —
тогда конфиг ченджлога и правила коммитов не разъедутся.

### 17.4 Релизный workflow

По схеме Nyx, но с образами вместо инсталляторов:

1. **`prepare`** — валидация формата версии (semver, с опциональным пререлизным
   суффиксом), проставление версии в `Cargo.toml` и `Cargo.lock`, коммит бампа,
   тег `vX.Y.Z`, поиск предыдущего тега, генерация ченджлога, создание **черновика**
   релиза.
2. **`build`** — сборка трёх бинарей на теге.
3. **`docker`** — сборка и push трёх образов, сбор `deploy.json` с digest'ами.
4. **`publish`** — публикация релиза с телом-ченджлогом, прикладывание `deploy.json`.

Ручной шаг после релиза: `deploy.json` целиком вставляется в
`/etc/nixos/bxteam/versions.json` и делается `nixos-rebuild switch`. Автоматического
пуша из CI на хост **намеренно нет** — это потребовало бы SSH из GitHub внутрь машины.

---

## 18. Соглашения по коду и комментариям

### 18.1 Комментарии

**Комментариев должно быть мало.** Это не стилистическое пожелание, а правило.

Не документируется вообще:

- сборочные файлы — `Cargo.toml`, `Dockerfile`, `build.rs`, `flake.nix`;
- CI-скрипты и GitHub Actions workflow'ы;
- конфигурация — `biome.json`, `rustfmt.toml`, `clippy.toml`, `docker-compose.yml`;
- Nix-модули, если только речь не о ловушке уровня «postfix и opendkim пишут один
  сокет по-разному»;
- очевидный код: `// создаём пул`, `// цикл по проектам`, `// возвращаем ответ`.

Запрещены:

- шапки файлов («блок с названием модуля и описанием»);
- разделители-заголовки вида `// ---- helpers ----`;
- комментарии, пересказывающие следующую строку.

Уместен комментарий только тогда, когда код правильный, но выглядит неправильным:
особенность формата на проводе, порядок операций в миграции, ограничение платформы,
намеренно странное решение. Одна-две строки, не абзац.

Doc-комментарии на публичных элементах — одна строка про намерение, не пересказ
сигнатуры.

### 18.2 Прочее

- Форматирование — `rustfmt` для Rust, `biome` для TS/CSS/JSON. Обсуждению не подлежит.
- Заголовки коммитов — Conventional Commits (см. §17.3).
- Всё, что можно проверить в CI, проверяется в CI; всё, что нельзя, не является правилом.

---

## 19. План переписи по фазам

Порядок выбран так, чтобы каждая фаза заканчивалась чем-то проверяемым, и чтобы
самое рискованное (аутентификация и миграция реальных данных Atlas) шло последним.

### Фаза 0 — фундамент

- Новый репозиторий, в нём только `apps/meridian` и `packages/ui` из старого.
- `Cargo.toml` воркспейса, `rust-toolchain.toml`, `rustfmt.toml`, `clippy.toml`.
- `docker-compose.yml`: postgres, clickhouse, minio.
- CI по структуре из §17.2: оркестратор + `lint`/`check`, остальное добавляется по мере
  появления кода.
- `.github/changelog_configuration.json` (§17.3).
- **Готово, когда:** `cargo check` и `biome ci .` зелёные на пустом воркспейсе,
  фронт собирается, PR-проверка проходит.

### Фаза 1 — `packages/types`

Чистая логика без ввода-вывода, поэтому идёт первой и покрывается тестами полностью.

- Типы wire-формата — **сверять с records в `~/Projects/Pulsify`, не с Zod** (§6.6).
- `scrub`, `normalize_for_fingerprint`, `compute_fingerprint` — **с parity-векторами**
  относительно текущей TS-реализации.
- `version`: парсинг, сравнение, `group_versions`.
- `build_info` (§15.6).
- API-модели, общие между сервисами.
- **Готово, когда:** тесты проходят, включая векторы фингерпринта и десериализацию
  реального батча SDK.

### Фаза 2 — хранилища

- `packages/database`: миграции (одна плоская последовательность), схемы `auth`,
  `atlas`, `pulsify` в одной базе, FK между схемами, уникальные ограничения из §15.5,
  таблица очереди, таблица открытых сессий.
- `packages/analytics`: схема ClickHouse (пять таблиц), ключи сортировки
  подбираются под реальные запросы дашборда.
- Перенос всех запросов дашборда из §9.4 в ClickHouse и проверка их на живой базе.
- `.sqlx/` закоммичен.
- **Готово, когда:** миграции применяются с нуля, все запросы дашборда выполняются.

### Фаза 3 — `apps/influx`

Самый маленький сервис и вход всей системы.

- Bearer-аутентификация по `pulsify.dsn_tokens`.
- Rate limit, дневная квота (из `quotas`, не из константы), `Retry-After` на обоих.
- Постановка в очередь Postgres.
- **Готово, когда:** реальный SDK, собранный из `~/Projects/Pulsify` и направленный на
  локальный influx, шлёт батч и получает `202`; лимиты отдают `429` с `Retry-After`;
  есть тесты.

### Фаза 4 — `apps/cinder`

- Забор из очереди `FOR UPDATE SKIP LOCKED`, savepoint на сообщение.
- Четыре хендлера, сессии в таблице, geoip из mmdb.
- Реестр issues, алерты, оценка всплесков по таймеру.
- **Готово, когда:** сквозной прогон influx → очередь → cinder → ClickHouse + Postgres
  даёт ожидаемые строки во всех таблицах.

### Фаза 5 — `apps/azimuth`, Atlas

- Чтение (кэшируемое CDN), создание версии, **стриминговая** загрузка сборки.
- Admin-эндпоинт создания проекта, которого раньше не было.
- OpenAPI из хендлеров.
- **Готово, когда:** ответы байт-в-байт совпадают со старым API для тех же данных
  (порядок групп версий проверять на **сыром** тексте ответа).

### Фаза 6 — `apps/azimuth`, Pulsify

- Все эндпоинты из §9.4.
- Retention/новички/разбивка меток — целиком в ClickHouse.
- **Готово, когда:** дашборд meridian работает против нового API без правок фронта
  (кроме `API_BASE`).

### Фаза 7 — аутентификация

Самая рискованная фаза: Better Auth заменяется своей реализацией.

- Сессии на куках, домен `.bxteam.org`, cross-subdomain.
- Magic link: генерация, письмо, одноразовая верификация, TTL.
- OAuth GitHub и Discord с теми же callback-URL (`/auth/callback/{provider}`).
- Админ-операции: список с пагинацией и поиском, бан/разбан, удаление.
- Удаление аккаунта с каскадом (теперь настоящим FK).
- **Готово, когда:** все вызовы из §10.2 работают, вход обоими способами проходит.

### Фаза 8 — поставка

- `Dockerfile` на каждый сервис, `docker.yml` и `release.yml` (§17).
- Первый релиз `v0.1.0`, три образа в GHCR, `deploy.json`.
- Приведение `/etc/nixos/bxteam` в соответствие: имя базы `bx_team`, актуальные
  переменные окружения, digest'ы в `versions.json`.
- **Готово, когда:** `nixos-rebuild switch` поднимает три контейнера, каждый отвечает
  на `GET /` своей версией и git-хэшем.

### Фаза 9 — данные и cutover

- Публикация DNS-записей для почты (`_hostup` TXT + `include:spf.hostup.se`),
  проверка DKIM и реальной доставки magic link.
- Перенос пяти таблиц Atlas из D1 в Postgres **с сохранением** `build_number` и
  ключей проектов/версий (иначе ломаются публичные ссылки на R2).
- `auth` и `pulsify` стартуют пустыми.
- Переключение DNS `api.` и `ingest.` на VPS.
- **Готово, когда:** существующие ссылки на загрузки работают, вход по magic link
  проходит, реальный сервер с SDK шлёт события и они видны в дашборде.

### Фаза 10 — эксплуатация

- Метрики, трейсинг, алертинг на сами сервисы.
- Ретеншен-политики (`daily_usage`, R2, TTL ClickHouse).
- Проверка восстановления из бэкапа, а не только его создания.

---

## Приложение A: карта соответствия старого кода новому

| Было (TypeScript) | Стало (Rust) |
|---|---|
| `packages/types/src/schemas/pulsify.ts` | `types::ingest` |
| `packages/types/src/schemas/atlas.ts` | `types::atlas` |
| `packages/types/src/scrub.ts` | `types::scrub` |
| `apps/cinder/src/lib/version.ts` + `apps/azimuth/src/lib/versions.ts` | `types::version` (**слияние двух**) |
| `packages/stratus/src/d1/*.ts` | `database` (миграции + `database/models`) |
| `apps/influx/src/routes/ingest.ts` | `apps/influx/src/routes/ingest.rs` |
| `apps/influx/src/middleware/auth.ts` | `apps/influx/src/auth.rs` (extractor) |
| `apps/influx/src/lib/queue.ts` | `database::queue` (producer) |
| `apps/cinder/src/worker.ts` | `apps/cinder/src/main.rs` + `consumer.rs` |
| `apps/cinder/src/handlers/*.ts` | `apps/cinder/src/handlers/*.rs` |
| `apps/cinder/src/lib/analytics.ts` | `analytics` (writer) |
| `apps/cinder/src/lib/session.ts` (DO) | таблица `pulsify.open_sessions` + `sessions.rs` |
| `apps/cinder/src/lib/geoip.ts` | `geoip` (mmdb) |
| `apps/cinder/src/lib/issues.ts` | `apps/cinder/src/issues.rs` |
| `apps/cinder/src/lib/alerts.ts` + `spikes.ts` | `apps/cinder/src/alerts/` + `scheduler.rs` |
| `apps/cinder/src/lib/error-payloads.ts` | `storage::error_payloads` |
| `apps/azimuth/src/worker.ts` | `apps/azimuth/src/{main,lib}.rs` |
| `apps/azimuth/src/lib/auth.ts` (Better Auth) | `apps/azimuth/src/auth/` (**своя реализация**) |
| `apps/azimuth/src/middleware/auth.ts` | `apps/azimuth/src/auth/extractor.rs` |
| `apps/azimuth/src/middleware/cache.ts` | заголовки `Cache-Control` + CDN |
| `apps/azimuth/src/lib/email.ts` | `mail` |
| `apps/azimuth/src/lib/analytics-sql.ts` | `analytics` (типизированные запросы) |
| `apps/azimuth/src/lib/pulsify.ts` | `apps/azimuth/src/{auth/extractor.rs, util/}` |
| `apps/azimuth/src/lib/openapi.ts` | `utoipa` из аннотаций хендлеров |
| `apps/azimuth/src/routes/atlas.ts` | `apps/azimuth/src/routes/atlas/` |
| `apps/azimuth/src/routes/pulsify/*.ts` | `apps/azimuth/src/routes/pulsify/` |

---

## Приложение B: переменные окружения и инфраструктурные идентификаторы

### B.1 Текущие (Cloudflare)

Cloudflare Account ID: `6c19bad5e3a3ea0820bb7b1fa745e6c2`

D1:
- `auth-db` — `9f2cc9c6-5d69-4ad0-b873-81238a4b5b5a`
- `atlas-db` — `f10f7ede-1373-403a-8149-62b6772532ba`
- `pulsify-db` — `25fe9461-a10d-4a07-bfce-c34b32c99336`

KV `GEOIP_CACHE` — `8d4d151f824643c6ae28fd1612140f98`
R2 — `builds`, `error-payloads`
Queue — `pulsify-ingest`, DLQ `pulsify-ingest-dlq`
Rate limit namespace — `2001`

**azimuth**

| Имя | Тип | Значение / назначение |
|---|---|---|
| `BETTER_AUTH_URL` | var | `https://api.bxteam.org` |
| `TRUSTED_ORIGINS` | var | `https://bxteam.org,http://localhost:3000` |
| `COOKIE_DOMAIN` | var | `.bxteam.org` |
| `R2_PUBLIC_URL` | var | `https://files.bxteam.org` |
| `ACCOUNT_ID` | var | Cloudflare account |
| `BETTER_AUTH_SECRET` | secret | подпись сессий |
| `API_SECRET_KEY` | secret | bearer для публикации Atlas |
| `GITHUB_CLIENT_ID` / `_SECRET` | secret | OAuth |
| `DISCORD_CLIENT_ID` / `_SECRET` | secret | OAuth |
| `AE_SQL_TOKEN` | secret | Cloudflare API token, Account Analytics: Read |

**cinder**

| Имя | Тип | Назначение |
|---|---|---|
| `ACCOUNT_ID` | var | Cloudflare account |
| `APP_URL` | var | `https://bxteam.org` — база для ссылок в алертах |
| `AE_SQL_TOKEN` | secret | чтение AE для оценки всплесков |
| `IPINFO_TOKEN` | secret | IPinfo Lite batch API |

**influx** — секретов нет, только биндинги.

**meridian** — `VITE_API_BASE` на этапе сборки (default `https://api.bxteam.org`).

### B.2 Новая версия

Имена ниже — те, что уже прописаны в `/etc/nixos/bxteam`. Их надо реализовать как есть,
а не придумывать свои.

**Общий env-файл** (sops-шаблон `bx-services.env`, отдаётся всем трём контейнерам):

| Имя | Назначение |
|---|---|
| `DATABASE_URL` | `postgres://bx_team:…@127.0.0.1:5432/bx_team` (сейчас в модуле `bx`, см. §15.5) |
| `API_SECRET_KEY` | bearer для публикации Atlas из CI |
| `R2_ENDPOINT` | S3-совместимый эндпоинт R2 |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | ключи R2 |
| `R2_BUILDS_BUCKET` | `builds` |
| `R2_ERROR_PAYLOADS_BUCKET` | `error-payloads` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | OAuth |

**azimuth**

| Имя | Значение |
|---|---|
| `AZIMUTH_BIND` | `127.0.0.1:8080` |
| `CLICKHOUSE_URL` | `http://127.0.0.1:8123` |
| `CLICKHOUSE_DATABASE` | база аналитики |
| `APP_URL` | `https://bxteam.org` |
| `API_PUBLIC_URL` | `https://api.bxteam.org` |
| `TRUSTED_ORIGINS` | `https://bxteam.org` |
| `R2_PUBLIC_URL` | `https://files.bxteam.org` |
| `EMAIL_FROM` | `BX Team <no-reply@bxteam.org>` |
| `COOKIE_DOMAIN` | `.bxteam.org` |
| `SMTP_URL` | `smtp://127.0.0.1:25` |
| `RUST_LOG` | `info` |

Плюс секрет подписи сессий — его в текущем шаблоне ещё нет, надо добавить
(`SESSION_SECRET`).

**influx**

| Имя | Значение |
|---|---|
| `INFLUX_BIND` | `127.0.0.1:8081` |
| `RUST_LOG` | `info` |

**cinder**

| Имя | Значение |
|---|---|
| `CLICKHOUSE_URL` / `CLICKHOUSE_DATABASE` | как у azimuth |
| `APP_URL` | база для ссылок в алертах |
| `IPINFO_MMDB_PATH` | `/var/lib/geoip/ipinfo_lite.mmdb` |
| `RUST_LOG` | `info` |

**Сборка** — `BX_GIT_HASH` проставляется только при сборке сервиса, не зависимостей (§15.6).

Конфиг валидируется целиком на старте (`env.rs`), а не читается по месту: сервис,
которому не хватает переменной, должен падать сразу с внятным сообщением, а не через
час на первом запросе.

---

## Приложение C: что физически удалить из репозитория

Удаляется:

```
apps/azimuth/          apps/cinder/          apps/influx/
packages/stratus/      packages/types/
bun.lock               (пересоздать — останутся только meridian и ui)
```

Остаётся и не трогается:

```
apps/meridian/         packages/ui/
biome.json             LICENSE                .gitattributes
```

Правится:

```
package.json           # workspaces: только apps/meridian, packages/ui;
                       # скрипты dev:influx / dev:cinder / dev:azimuth убрать
CLAUDE.md              # переписать раздел архитектуры под Rust + правила из §18
README.md              # то же
.gitignore             # добавить /target, .sqlx оставить в индексе
apps/meridian/app/lib/api.ts   # только если меняется базовый URL
```

Добавляется:

```
Cargo.toml  rust-toolchain.toml  rustfmt.toml  clippy.toml  _typos.toml
docker-compose.yml
.github/workflows/           # §17.2
.github/changelog_configuration.json
apps/{azimuth,influx,cinder}/Dockerfile
```

Отдельно: `apps/meridian/app/plugins/location.client.ts` и `GET /location` завязаны на
Cloudflare edge (`request.cf`) — после переезда на один VPS этот эндпоинт теряет смысл.
Либо убрать элемент из футера, либо заменить на что-то осмысленное (например, регион
хоста константой).
