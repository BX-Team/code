create table if not exists projects (
    key                  text primary key,
    name                 text not null,
    kind                 text not null check (kind in ('versioned', 'release')),
    description          text,
    repo                 text,
    latest_version       text,
    experimental_version text,
    created_at           text not null default (datetime('now'))
);

create table if not exists tokens (
    id         integer primary key,
    project    text    not null references projects(key) on delete cascade,
    token_hash text    not null unique,
    title      text,
    last_used  text,
    created_at text    not null default (datetime('now'))
);

create table if not exists versions (
    id         integer primary key,
    project    text    not null references projects(key) on delete cascade,
    key        text    not null,
    support    text    not null default 'supported'
               check (support in ('supported', 'deprecated', 'unsupported')),
    java_min   integer,
    created_at text    not null default (datetime('now')),
    unique (project, key)
);

-- `created_at` on a build and on a release is written by the application as an ISO 8601
-- instant, because the default below has no zone and these two are the ones served.
create table if not exists builds (
    id         integer primary key,
    version_id integer not null references versions(id) on delete cascade,
    number     integer not null,
    channel    text    not null default 'stable'
               check (channel in ('alpha', 'beta', 'stable')),
    commit_sha text,
    created_at text    not null default (datetime('now')),
    unique (version_id, number)
);

create index if not exists builds_newest on builds(version_id, number desc);

create table if not exists releases (
    id         integer primary key,
    project    text    not null references projects(key) on delete cascade,
    tag        text    not null,
    channel    text    not null default 'stable'
               check (channel in ('alpha', 'beta', 'stable')),
    commit_sha text,
    notes      text,
    created_at text    not null default (datetime('now')),
    unique (project, tag)
);

create index if not exists releases_newest on releases(project, id desc);

create table if not exists build_commits (
    build_id integer not null references builds(id) on delete cascade,
    position integer not null,
    sha      text    not null,
    summary  text    not null,
    at       text    not null,
    primary key (build_id, position)
);

create table if not exists release_commits (
    release_id integer not null references releases(id) on delete cascade,
    position   integer not null,
    sha        text    not null,
    summary    text    not null,
    at         text    not null,
    primary key (release_id, position)
);

create table if not exists build_downloads (
    build_id  integer not null references builds(id) on delete cascade,
    name      text    not null,
    file_name text    not null,
    file_path text    not null,
    size      integer not null,
    sha256    text    not null,
    primary key (build_id, name)
);

create table if not exists release_downloads (
    release_id integer not null references releases(id) on delete cascade,
    name       text    not null,
    file_name  text    not null,
    file_path  text    not null,
    size       integer not null,
    sha256     text    not null,
    primary key (release_id, name)
);
