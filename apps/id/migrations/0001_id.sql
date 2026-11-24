-- The Better Auth tables follow getMigrations for src/auth.ts; a plugin change means a new migration.
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null, "username" text unique, "displayUsername" text, "friendCode" text);
create table "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);
create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);
create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);
create table "deviceCode" ("id" text not null primary key, "deviceCode" text not null, "userCode" text not null, "userId" text, "expiresAt" date not null, "status" text not null, "lastPolledAt" date, "pollingInterval" integer, "clientId" text, "scope" text);
create table "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);
create unique index "user_friendCode_uidx" on "user" ("friendCode");
create index "session_userId_idx" on "session" ("userId");
create index "account_userId_idx" on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");
create unique index "deviceCode_deviceCode_uidx" on "deviceCode" ("deviceCode");
create unique index "deviceCode_userCode_uidx" on "deviceCode" ("userCode");
-- One Mojang profile belongs to at most one BX ID; an account may link several.
create table "minecraftProfile" ("id" text not null primary key, "userId" text not null references "user" ("id") on delete cascade, "name" text not null, "createdAt" date not null, "updatedAt" date not null);
create index "minecraftProfile_userId_idx" on "minecraftProfile" ("userId");
-- A pair has one row: the asker's, pending until the other side accepts it.
create table "friendship" ("userId" text not null references "user" ("id") on delete cascade, "friendId" text not null references "user" ("id") on delete cascade, "status" text not null check ("status" in ('pending', 'accepted')), "createdAt" text not null, primary key ("userId", "friendId"));
create index "friendship_friendId_idx" on "friendship" ("friendId");
-- Apps a BX ID has signed in to through the device flow; the row stays when their sessions end.
create table "connectedApp" ("userId" text not null references "user" ("id") on delete cascade, "clientId" text not null, "createdAt" date not null, primary key ("userId", "clientId"));
-- `detail` is JSON, its fields depend on `kind`.
create table "activity" ("id" text not null primary key, "userId" text not null references "user" ("id") on delete cascade, "kind" text not null, "detail" text, "ipAddress" text, "userAgent" text, "createdAt" date not null);
create index "activity_userId_createdAt_idx" on "activity" ("userId", "createdAt");
