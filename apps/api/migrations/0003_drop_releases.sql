drop table if exists release_downloads;
drop table if exists release_commits;
drop table if exists releases;

alter table projects drop column kind;
