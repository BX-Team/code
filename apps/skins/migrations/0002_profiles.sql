-- Skins now belong to offline nicks, not to the BX ID; nothing was worn yet when this ran.
drop table "skin";
-- An offline nick held by a BX ID. "nameKey" is the lower-cased name, unique across everyone; a released nick keeps
-- its row until "heldUntil", so only its former owner can take it back. PNGs stay in R2 at <userId>/<model>/<sha256>.png.
create table "profile" ("id" text not null primary key, "userId" text not null, "name" text not null, "nameKey" text not null unique, "model" text check ("model" in ('classic', 'slim')), "hash" text, "createdAt" text not null, "heldUntil" text);
create index "profile_userId_idx" on "profile" ("userId");
