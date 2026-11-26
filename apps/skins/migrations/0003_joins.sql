-- A game's `join` with a Riven game token, kept until the server's `hasJoined` asks a moment later.
create table "join" ("serverId" text not null, "nameKey" text not null, "profileId" text not null, "createdAt" integer not null, primary key ("serverId", "nameKey"));
create index "join_createdAt_idx" on "join" ("createdAt");
