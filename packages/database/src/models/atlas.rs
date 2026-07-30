use chrono::{DateTime, Utc};

use crate::{Db, Error, Transaction};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Project {
    pub id: i64,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub latest_version: Option<String>,
    pub experimental_version: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Version {
    pub id: i64,
    pub project_id: i64,
    pub key: String,
    pub support_status: String,
    pub java_min_version: Option<i32>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Build {
    pub id: i64,
    pub version_id: i64,
    pub build_number: i64,
    pub channel: String,
    pub time: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Commit {
    pub build_id: i64,
    pub sha: String,
    pub message: String,
    pub time: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Download {
    pub build_id: i64,
    pub name: String,
    pub file_name: String,
    pub file_path: String,
    pub size: i64,
    pub sha256: String,
}

pub async fn projects(db: &Db) -> Result<Vec<Project>, Error> {
    sqlx::query_as!(
        Project,
        "SELECT id, key, name, description, latest_version, experimental_version
           FROM atlas.projects ORDER BY key",
    )
    .fetch_all(db)
    .await
}

pub async fn project(db: &Db, key: &str) -> Result<Option<Project>, Error> {
    sqlx::query_as!(
        Project,
        "SELECT id, key, name, description, latest_version, experimental_version
           FROM atlas.projects WHERE key = $1",
        key,
    )
    .fetch_optional(db)
    .await
}

pub async fn create_project(
    db: &Db,
    key: &str,
    name: &str,
    description: Option<&str>,
) -> Result<Project, Error> {
    sqlx::query_as!(
        Project,
        "INSERT INTO atlas.projects (key, name, description) VALUES ($1, $2, $3)
         RETURNING id, key, name, description, latest_version, experimental_version",
        key,
        name,
        description,
    )
    .fetch_one(db)
    .await
}

pub async fn versions_of(db: &Db, project_ids: &[i64]) -> Result<Vec<Version>, Error> {
    sqlx::query_as!(
        Version,
        "SELECT id, project_id, key, support_status, java_min_version
           FROM atlas.versions WHERE project_id = ANY($1)",
        project_ids,
    )
    .fetch_all(db)
    .await
}

pub async fn version(db: &Db, project_id: i64, key: &str) -> Result<Option<Version>, Error> {
    sqlx::query_as!(
        Version,
        "SELECT id, project_id, key, support_status, java_min_version
           FROM atlas.versions WHERE project_id = $1 AND key = $2",
        project_id,
        key,
    )
    .fetch_optional(db)
    .await
}

pub async fn create_version(
    db: &Db,
    project_id: i64,
    key: &str,
    support_status: &str,
    java_min_version: Option<i32>,
) -> Result<Version, Error> {
    sqlx::query_as!(
        Version,
        "INSERT INTO atlas.versions (project_id, key, support_status, java_min_version)
         VALUES ($1, $2, $3, $4)
         RETURNING id, project_id, key, support_status, java_min_version",
        project_id,
        key,
        support_status,
        java_min_version,
    )
    .fetch_one(db)
    .await
}

pub async fn build_numbers(db: &Db, version_id: i64) -> Result<Vec<i64>, Error> {
    sqlx::query_scalar!(
        "SELECT build_number FROM atlas.builds WHERE version_id = $1 ORDER BY build_number DESC",
        version_id,
    )
    .fetch_all(db)
    .await
}

pub async fn builds_of(
    db: &Db,
    version_id: i64,
    channel: Option<&str>,
) -> Result<Vec<Build>, Error> {
    sqlx::query_as!(
        Build,
        "SELECT id, version_id, build_number, channel, time
           FROM atlas.builds
          WHERE version_id = $1 AND ($2::text IS NULL OR channel = $2)
          ORDER BY build_number DESC",
        version_id,
        channel,
    )
    .fetch_all(db)
    .await
}

pub async fn build(db: &Db, version_id: i64, build_number: i64) -> Result<Option<Build>, Error> {
    sqlx::query_as!(
        Build,
        "SELECT id, version_id, build_number, channel, time
           FROM atlas.builds WHERE version_id = $1 AND build_number = $2",
        version_id,
        build_number,
    )
    .fetch_optional(db)
    .await
}

pub async fn latest_build(db: &Db, version_id: i64) -> Result<Option<Build>, Error> {
    sqlx::query_as!(
        Build,
        "SELECT id, version_id, build_number, channel, time
           FROM atlas.builds WHERE version_id = $1
          ORDER BY build_number DESC LIMIT 1",
        version_id,
    )
    .fetch_optional(db)
    .await
}

pub async fn commits_of(db: &Db, build_ids: &[i64]) -> Result<Vec<Commit>, Error> {
    sqlx::query_as!(
        Commit,
        "SELECT build_id, sha, message, time FROM atlas.commits
          WHERE build_id = ANY($1) ORDER BY id",
        build_ids,
    )
    .fetch_all(db)
    .await
}

pub async fn downloads_of(db: &Db, build_ids: &[i64]) -> Result<Vec<Download>, Error> {
    sqlx::query_as!(
        Download,
        "SELECT build_id, name, file_name, file_path, size, sha256 FROM atlas.downloads
          WHERE build_id = ANY($1) ORDER BY id",
        build_ids,
    )
    .fetch_all(db)
    .await
}

/// Reserves the next build number for a version inside the caller's transaction.
///
/// The row lock, not a read-then-write, is what stops two CI jobs from claiming the same number.
pub async fn next_build_number(tx: &mut Transaction<'_>, version_id: i64) -> Result<i64, Error> {
    sqlx::query_scalar!(
        "SELECT id FROM atlas.versions WHERE id = $1 FOR UPDATE",
        version_id
    )
    .fetch_one(&mut **tx)
    .await?;

    sqlx::query_scalar!(
        "SELECT coalesce(max(build_number), 0) + 1 FROM atlas.builds WHERE version_id = $1",
        version_id,
    )
    .fetch_one(&mut **tx)
    .await
    .map(|value| value.unwrap_or(1))
}

pub async fn insert_build(
    tx: &mut Transaction<'_>,
    version_id: i64,
    build_number: i64,
    channel: &str,
    time: DateTime<Utc>,
) -> Result<Build, Error> {
    sqlx::query_as!(
        Build,
        "INSERT INTO atlas.builds (version_id, build_number, channel, time)
         VALUES ($1, $2, $3, $4)
         RETURNING id, version_id, build_number, channel, time",
        version_id,
        build_number,
        channel,
        time,
    )
    .fetch_one(&mut **tx)
    .await
}

pub async fn insert_commits(
    tx: &mut Transaction<'_>,
    build_id: i64,
    shas: &[String],
    messages: &[String],
    times: &[DateTime<Utc>],
) -> Result<(), Error> {
    if shas.is_empty() {
        return Ok(());
    }
    sqlx::query!(
        "INSERT INTO atlas.commits (build_id, sha, message, time)
         SELECT $1, sha, message, time
           FROM unnest($2::text[], $3::text[], $4::timestamptz[]) AS c(sha, message, time)",
        build_id,
        shas,
        messages,
        times,
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn insert_download(
    tx: &mut Transaction<'_>,
    build_id: i64,
    name: &str,
    file_name: &str,
    file_path: &str,
    size: i64,
    sha256: &str,
) -> Result<(), Error> {
    sqlx::query!(
        "INSERT INTO atlas.downloads (build_id, name, file_name, file_path, size, sha256)
         VALUES ($1, $2, $3, $4, $5, $6)",
        build_id,
        name,
        file_name,
        file_path,
        size,
        sha256,
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}
