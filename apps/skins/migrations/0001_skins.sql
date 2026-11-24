-- The skin each BX ID wears now; the PNGs, current and earlier, live in R2 at <userId>/<model>/<sha256>.png.
create table "skin" ("userId" text not null primary key, "model" text not null check ("model" in ('classic', 'slim')), "hash" text not null, "updatedAt" text not null);
