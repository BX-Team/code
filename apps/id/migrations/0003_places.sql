-- Where a session or event came from, as Cloudflare places it: a city and an ISO country code.
alter table "session" add column "city" text;
alter table "session" add column "country" text;
-- The app a device-flow session belongs to, so disconnecting the app ends exactly its sessions.
alter table "session" add column "clientId" text;
alter table "activity" add column "city" text;
alter table "activity" add column "country" text;
-- Who asked for a device code, shown on the approval page so a code sent by someone else stands out.
create table "deviceRequest" ("userCode" text not null primary key, "ipAddress" text, "city" text, "country" text, "userAgent" text, "createdAt" date not null);
