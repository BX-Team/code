-- Skins now belong to offline nicks, not to the BX ID; nothing was worn yet when this ran.
drop table "skin";
-- An offline nick held by a BX ID; a released one keeps its row until "heldUntil", so only its owner can take it back.
create table "profile" ("id" text not null primary key, "userId" text not null, "name" text not null, "nameKey" text not null unique, "model" text check ("model" in ('classic', 'slim')), "hash" text, "createdAt" text not null, "heldUntil" text);
create index "profile_userId_idx" on "profile" ("userId");
