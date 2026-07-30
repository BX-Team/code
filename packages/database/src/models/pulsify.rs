use chrono::{DateTime, NaiveDate, Utc};
use uuid::Uuid;

use crate::{Db, Error, Transaction};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Project {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub name: String,
    pub slug: String,
    pub kind: String,
    pub description: Option<String>,
    pub verified: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Project {
    /// True for the project types that can be installed on a server and aggregated across them.
    pub fn is_installable(&self) -> bool {
        self.kind == "plugin" || self.kind == "mod"
    }
}

pub async fn project(db: &Db, id: Uuid) -> Result<Option<Project>, Error> {
    sqlx::query_as!(
        Project,
        r#"SELECT id, owner_id, name, slug, type AS kind, description, verified,
                  created_at, updated_at
             FROM pulsify.projects WHERE id = $1"#,
        id,
    )
    .fetch_optional(db)
    .await
}

/// Fetches a project only if the given user owns it — the standard access check.
pub async fn owned_project(db: &Db, id: Uuid, owner_id: Uuid) -> Result<Option<Project>, Error> {
    sqlx::query_as!(
        Project,
        r#"SELECT id, owner_id, name, slug, type AS kind, description, verified,
                  created_at, updated_at
             FROM pulsify.projects WHERE id = $1 AND owner_id = $2"#,
        id,
        owner_id,
    )
    .fetch_optional(db)
    .await
}

pub async fn projects_of(db: &Db, owner_id: Uuid) -> Result<Vec<Project>, Error> {
    sqlx::query_as!(
        Project,
        r#"SELECT id, owner_id, name, slug, type AS kind, description, verified,
                  created_at, updated_at
             FROM pulsify.projects WHERE owner_id = $1 ORDER BY created_at"#,
        owner_id,
    )
    .fetch_all(db)
    .await
}

pub async fn create_project(
    db: &Db,
    owner_id: Uuid,
    name: &str,
    slug: &str,
    kind: &str,
    description: Option<&str>,
) -> Result<Project, Error> {
    sqlx::query_as!(
        Project,
        r#"INSERT INTO pulsify.projects (id, owner_id, name, slug, type, description)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, owner_id, name, slug, type AS kind, description, verified,
                     created_at, updated_at"#,
        Uuid::new_v4(),
        owner_id,
        name,
        slug,
        kind,
        description,
    )
    .fetch_one(db)
    .await
}

pub async fn delete_project(db: &Db, id: Uuid, owner_id: Uuid) -> Result<bool, Error> {
    let result = sqlx::query!(
        "DELETE FROM pulsify.projects WHERE id = $1 AND owner_id = $2",
        id,
        owner_id,
    )
    .execute(db)
    .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn set_verified(db: &Db, id: Uuid, verified: bool) -> Result<bool, Error> {
    let result = sqlx::query!(
        "UPDATE pulsify.projects SET verified = $2, updated_at = now() WHERE id = $1",
        id,
        verified,
    )
    .execute(db)
    .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn count_projects(db: &Db, owner_id: Uuid) -> Result<i64, Error> {
    let count = sqlx::query_scalar!(
        "SELECT count(*) FROM pulsify.projects WHERE owner_id = $1",
        owner_id,
    )
    .fetch_one(db)
    .await?;
    Ok(count.unwrap_or(0))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DsnToken {
    pub id: Uuid,
    pub project_id: Uuid,
    pub label: Option<String>,
    pub revoked: bool,
    pub last_used_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Resolves a bearer token to its project; revoked tokens never resolve.
pub async fn authenticate_token(db: &Db, key: &str) -> Result<Option<(Uuid, Uuid)>, Error> {
    let row = sqlx::query!(
        "SELECT id, project_id FROM pulsify.dsn_tokens WHERE key = $1 AND NOT revoked",
        key,
    )
    .fetch_optional(db)
    .await?;
    Ok(row.map(|row| (row.id, row.project_id)))
}

pub async fn touch_token(db: &Db, id: Uuid) -> Result<(), Error> {
    sqlx::query!(
        "UPDATE pulsify.dsn_tokens SET last_used_at = now() WHERE id = $1",
        id,
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn tokens_of(db: &Db, project_id: Uuid) -> Result<Vec<DsnToken>, Error> {
    sqlx::query_as!(
        DsnToken,
        "SELECT id, project_id, label, revoked, last_used_at, created_at
           FROM pulsify.dsn_tokens WHERE project_id = $1 ORDER BY created_at DESC",
        project_id,
    )
    .fetch_all(db)
    .await
}

pub async fn create_token(
    db: &Db,
    project_id: Uuid,
    key: &str,
    label: Option<&str>,
) -> Result<DsnToken, Error> {
    sqlx::query_as!(
        DsnToken,
        "INSERT INTO pulsify.dsn_tokens (id, project_id, key, label)
         VALUES ($1, $2, $3, $4)
         RETURNING id, project_id, label, revoked, last_used_at, created_at",
        Uuid::new_v4(),
        project_id,
        key,
        label,
    )
    .fetch_one(db)
    .await
}

pub async fn revoke_token(db: &Db, project_id: Uuid, id: Uuid) -> Result<bool, Error> {
    let result = sqlx::query!(
        "UPDATE pulsify.dsn_tokens SET revoked = true WHERE id = $1 AND project_id = $2",
        id,
        project_id,
    )
    .execute(db)
    .await?;
    Ok(result.rows_affected() > 0)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Quota {
    pub max_projects: i32,
    pub max_events_per_day: i64,
}

/// Reads a user's quota, creating the default row on first access.
pub async fn quota(db: &Db, user_id: Uuid) -> Result<Quota, Error> {
    let row = sqlx::query!(
        "INSERT INTO pulsify.quotas (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
         RETURNING max_projects, max_events_per_day",
        user_id,
    )
    .fetch_one(db)
    .await?;

    Ok(Quota {
        max_projects: row.max_projects,
        max_events_per_day: row.max_events_per_day,
    })
}

/// The owning user's daily event allowance — the single source of truth influx enforces.
pub async fn project_event_quota(db: &Db, project_id: Uuid) -> Result<Option<i64>, Error> {
    let row = sqlx::query_scalar!(
        "SELECT coalesce(q.max_events_per_day, 100000)
           FROM pulsify.projects p
           LEFT JOIN pulsify.quotas q ON q.user_id = p.owner_id
          WHERE p.id = $1",
        project_id,
    )
    .fetch_optional(db)
    .await?;
    Ok(row.flatten())
}

/// Atomically books `count` events against a token's day and returns the new total.
pub async fn consume_daily_usage(
    db: &Db,
    token: &str,
    day: NaiveDate,
    count: i64,
) -> Result<i64, Error> {
    sqlx::query_scalar!(
        "INSERT INTO pulsify.daily_usage (token, day, count) VALUES ($1, $2, $3)
         ON CONFLICT (token, day) DO UPDATE SET count = pulsify.daily_usage.count + $3
         RETURNING count",
        token,
        day,
        count,
    )
    .fetch_one(db)
    .await
}

/// Events a user's tokens have booked today, across all of their projects.
pub async fn events_today(db: &Db, user_id: Uuid) -> Result<i64, Error> {
    let total = sqlx::query_scalar!(
        "SELECT coalesce(sum(u.count), 0)::bigint
           FROM pulsify.daily_usage u
           JOIN pulsify.dsn_tokens t ON t.key = u.token
           JOIN pulsify.projects p ON p.id = t.project_id
          WHERE p.owner_id = $1 AND u.day = current_date",
        user_id,
    )
    .fetch_one(db)
    .await?;
    Ok(total.unwrap_or(0))
}

/// Drops usage counters older than the retention window; there is no unbounded growth.
pub async fn prune_daily_usage(db: &Db, keep_days: i32) -> Result<u64, Error> {
    let result = sqlx::query!(
        "DELETE FROM pulsify.daily_usage WHERE day < current_date - $1::integer",
        keep_days,
    )
    .execute(db)
    .await?;
    Ok(result.rows_affected())
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ServerMetadata {
    pub project_id: Uuid,
    pub last_seen_at: DateTime<Utc>,
    pub software: Option<String>,
    pub mc_version: Option<String>,
    pub country_code: Option<String>,
}

pub async fn upsert_server_metadata(
    tx: &mut Transaction<'_>,
    project_id: Uuid,
    software: &str,
    mc_version: &str,
    country_code: &str,
) -> Result<(), Error> {
    sqlx::query!(
        "INSERT INTO pulsify.server_metadata
             (project_id, last_seen_at, software, mc_version, country_code)
         VALUES ($1, now(), $2, $3, $4)
         ON CONFLICT (project_id) DO UPDATE
             SET last_seen_at = now(),
                 software = EXCLUDED.software,
                 mc_version = EXCLUDED.mc_version,
                 country_code = EXCLUDED.country_code",
        project_id,
        software,
        mc_version,
        country_code,
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn server_metadata_for(
    db: &Db,
    project_ids: &[Uuid],
) -> Result<Vec<ServerMetadata>, Error> {
    sqlx::query_as!(
        ServerMetadata,
        "SELECT project_id, last_seen_at, software, mc_version, country_code
           FROM pulsify.server_metadata WHERE project_id = ANY($1)",
        project_ids,
    )
    .fetch_all(db)
    .await
}

/// Records the plugins a heartbeat reported, matching them to registered projects by name.
pub async fn upsert_installations(
    tx: &mut Transaction<'_>,
    server_id: Uuid,
    names: &[String],
    versions: &[String],
    enabled: &[bool],
) -> Result<u64, Error> {
    if names.is_empty() {
        return Ok(0);
    }

    let result = sqlx::query!(
        "INSERT INTO pulsify.plugin_installations
             (plugin_id, server_id, version, enabled, last_seen_at)
         SELECT p.id, $1, reported.version, reported.enabled, now()
           FROM unnest($2::text[], $3::text[], $4::bool[]) AS reported(name, version, enabled)
           JOIN pulsify.projects p ON p.name = reported.name AND p.type IN ('plugin', 'mod')
         ON CONFLICT (plugin_id, server_id) DO UPDATE
             SET version = EXCLUDED.version,
                 enabled = EXCLUDED.enabled,
                 last_seen_at = now()",
        server_id,
        names,
        versions,
        enabled,
    )
    .execute(&mut **tx)
    .await?;

    Ok(result.rows_affected())
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Installation {
    pub plugin_id: Uuid,
    pub server_id: Uuid,
    pub version: String,
    pub enabled: bool,
    pub share_errors: bool,
    pub last_seen_at: DateTime<Utc>,
}

pub async fn installations_of(db: &Db, plugin_id: Uuid) -> Result<Vec<Installation>, Error> {
    sqlx::query_as!(
        Installation,
        "SELECT plugin_id, server_id, version, enabled, share_errors, last_seen_at
           FROM pulsify.plugin_installations WHERE plugin_id = $1",
        plugin_id,
    )
    .fetch_all(db)
    .await
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InstalledPlugin {
    pub plugin_id: Uuid,
    pub name: String,
    pub slug: String,
    pub version: String,
    pub enabled: bool,
    pub share_errors: bool,
    pub last_seen_at: DateTime<Utc>,
}

/// Plugins reported by one server, with the sharing flag its owner controls.
pub async fn installations_on(db: &Db, server_id: Uuid) -> Result<Vec<InstalledPlugin>, Error> {
    sqlx::query_as!(
        InstalledPlugin,
        "SELECT i.plugin_id, p.name, p.slug, i.version, i.enabled, i.share_errors, i.last_seen_at
           FROM pulsify.plugin_installations i
           JOIN pulsify.projects p ON p.id = i.plugin_id
          WHERE i.server_id = $1
          ORDER BY p.name",
        server_id,
    )
    .fetch_all(db)
    .await
}

/// Servers that opted in to sharing a plugin's errors with its author.
pub async fn sharing_servers(db: &Db, plugin_id: Uuid) -> Result<Vec<Uuid>, Error> {
    sqlx::query_scalar!(
        "SELECT server_id FROM pulsify.plugin_installations
          WHERE plugin_id = $1 AND share_errors",
        plugin_id,
    )
    .fetch_all(db)
    .await
}

pub async fn set_share_errors(
    db: &Db,
    server_id: Uuid,
    plugin_id: Uuid,
    share: bool,
) -> Result<bool, Error> {
    let result = sqlx::query!(
        "UPDATE pulsify.plugin_installations SET share_errors = $3
          WHERE server_id = $1 AND plugin_id = $2",
        server_id,
        plugin_id,
        share,
    )
    .execute(db)
    .await?;
    Ok(result.rows_affected() > 0)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenSession {
    pub project_id: Uuid,
    pub player_uuid: Uuid,
    pub joined_at: DateTime<Utc>,
    pub client_version: String,
    pub country_code: String,
}

/// Opens a session; a duplicate join replaces the previous one rather than leaking it.
pub async fn open_session(
    tx: &mut Transaction<'_>,
    project_id: Uuid,
    player_uuid: Uuid,
    client_version: &str,
    country_code: &str,
) -> Result<(), Error> {
    sqlx::query!(
        "INSERT INTO pulsify.open_sessions
             (project_id, player_uuid, joined_at, client_version, country_code)
         VALUES ($1, $2, now(), $3, $4)
         ON CONFLICT (project_id, player_uuid) DO UPDATE
             SET joined_at = now(),
                 client_version = EXCLUDED.client_version,
                 country_code = EXCLUDED.country_code",
        project_id,
        player_uuid,
        client_version,
        country_code,
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn close_session(
    tx: &mut Transaction<'_>,
    project_id: Uuid,
    player_uuid: Uuid,
) -> Result<Option<OpenSession>, Error> {
    sqlx::query_as!(
        OpenSession,
        "DELETE FROM pulsify.open_sessions WHERE project_id = $1 AND player_uuid = $2
         RETURNING project_id, player_uuid, joined_at, client_version, country_code",
        project_id,
        player_uuid,
    )
    .fetch_optional(&mut **tx)
    .await
}

/// Sweeps sessions that never got a quit; they are recorded as abandoned, never dropped.
pub async fn sweep_open_sessions(
    tx: &mut Transaction<'_>,
    older_than_hours: i32,
) -> Result<Vec<OpenSession>, Error> {
    sqlx::query_as!(
        OpenSession,
        "DELETE FROM pulsify.open_sessions
          WHERE joined_at < now() - make_interval(hours => $1)
         RETURNING project_id, player_uuid, joined_at, client_version, country_code",
        older_than_hours,
    )
    .fetch_all(&mut **tx)
    .await
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Issue {
    pub id: Uuid,
    pub project_id: Uuid,
    pub fingerprint: String,
    pub plugin: String,
    pub status: String,
    pub status_version: Option<String>,
    pub muted_until: Option<DateTime<Utc>>,
    pub first_version: Option<String>,
    pub last_version: Option<String>,
    pub first_seen_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub resolved_by: Option<Uuid>,
}

impl Issue {
    /// Everything but `open` is suppressed; an expired mute reads as open immediately.
    pub fn is_suppressed(&self, now: DateTime<Utc>) -> bool {
        match self.status.as_str() {
            "open" => false,
            "muted" => self.muted_until.is_some_and(|until| until > now),
            _ => true,
        }
    }

    /// Status as shown in the UI, with expired mutes already folded back to `open`.
    pub fn effective_status(&self, now: DateTime<Utc>) -> &str {
        if self.status == "muted" && !self.muted_until.is_some_and(|until| until > now) {
            "open"
        } else {
            &self.status
        }
    }
}

/// What happened to an issue when an error arrived — the trigger alert rules fire on.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IssueTransition {
    NewIssue,
    Regression,
    None,
}

pub async fn issues_of(db: &Db, project_id: Uuid) -> Result<Vec<Issue>, Error> {
    sqlx::query_as!(
        Issue,
        "SELECT id, project_id, fingerprint, plugin, status, status_version, muted_until,
                first_version, last_version, first_seen_at, last_seen_at, resolved_at, resolved_by
           FROM pulsify.issues WHERE project_id = $1",
        project_id,
    )
    .fetch_all(db)
    .await
}

pub async fn suppressed_fingerprints(db: &Db, project_ids: &[Uuid]) -> Result<Vec<String>, Error> {
    sqlx::query_scalar!(
        "SELECT fingerprint FROM pulsify.issues
          WHERE project_id = ANY($1)
            AND (status IN ('resolved', 'ignored')
                 OR (status = 'muted' AND muted_until > now()))",
        project_ids,
    )
    .fetch_all(db)
    .await
}

pub async fn find_issue(
    db: &Db,
    project_id: Uuid,
    fingerprint: &str,
) -> Result<Option<Issue>, Error> {
    sqlx::query_as!(
        Issue,
        "SELECT id, project_id, fingerprint, plugin, status, status_version, muted_until,
                first_version, last_version, first_seen_at, last_seen_at, resolved_at, resolved_by
           FROM pulsify.issues WHERE project_id = $1 AND fingerprint = $2",
        project_id,
        fingerprint,
    )
    .fetch_optional(db)
    .await
}

/// Inserts or refreshes the issue for a fingerprint and reports the resulting transition.
pub async fn record_issue(
    tx: &mut Transaction<'_>,
    project_id: Uuid,
    fingerprint: &str,
    plugin: &str,
    version: Option<&str>,
) -> Result<IssueTransition, Error> {
    let inserted = sqlx::query_scalar!(
        "INSERT INTO pulsify.issues
             (id, project_id, fingerprint, plugin, status, first_version, last_version,
              first_seen_at, last_seen_at)
         VALUES ($1, $2, $3, $4, 'open', $5, $5, now(), now())
         ON CONFLICT (project_id, fingerprint) DO NOTHING
         RETURNING id",
        Uuid::new_v4(),
        project_id,
        fingerprint,
        plugin,
        version,
    )
    .fetch_optional(&mut **tx)
    .await?;

    if inserted.is_some() {
        return Ok(IssueTransition::NewIssue);
    }

    let current = sqlx::query!(
        "SELECT status, status_version, muted_until FROM pulsify.issues
          WHERE project_id = $1 AND fingerprint = $2
          FOR UPDATE",
        project_id,
        fingerprint,
    )
    .fetch_one(&mut **tx)
    .await?;

    let regressed =
        current.status == "resolved" && is_regression(version, current.status_version.as_deref());
    let mute_expired = current.status == "muted"
        && !current
            .muted_until
            .is_some_and(|until| until > chrono::Utc::now());

    if regressed || mute_expired {
        sqlx::query!(
            "UPDATE pulsify.issues
                SET status = 'open', resolved_at = NULL, status_version = NULL,
                    muted_until = NULL, last_seen_at = now(),
                    last_version = coalesce($3, last_version)
              WHERE project_id = $1 AND fingerprint = $2",
            project_id,
            fingerprint,
            version,
        )
        .execute(&mut **tx)
        .await?;
    } else {
        sqlx::query!(
            "UPDATE pulsify.issues
                SET last_seen_at = now(), last_version = coalesce($3, last_version)
              WHERE project_id = $1 AND fingerprint = $2",
            project_id,
            fingerprint,
            version,
        )
        .execute(&mut **tx)
        .await?;
    }

    // An expired mute reopens silently: nothing regressed, the suppression just ran out.
    Ok(if regressed {
        IssueTransition::Regression
    } else {
        IssueTransition::None
    })
}

/// A resolved issue reopens only on a version strictly newer than the one it was fixed in.
pub fn is_regression(incoming: Option<&str>, fixed_in: Option<&str>) -> bool {
    match (incoming, fixed_in) {
        (None, _) => false,
        (Some(_), None) => true,
        (Some(incoming), Some(fixed_in)) => types::version::is_newer(incoming, fixed_in),
    }
}

pub async fn set_issue_status(
    db: &Db,
    project_id: Uuid,
    fingerprint: &str,
    status: &str,
    status_version: Option<&str>,
    muted_until: Option<DateTime<Utc>>,
    resolved_by: Option<Uuid>,
) -> Result<(), Error> {
    sqlx::query!(
        "INSERT INTO pulsify.issues
             (id, project_id, fingerprint, status, status_version, muted_until, resolved_at,
              resolved_by, first_seen_at, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6,
                 CASE WHEN $4 = 'resolved' THEN now() END, $7, now(), now())
         ON CONFLICT (project_id, fingerprint) DO UPDATE
             SET status = EXCLUDED.status,
                 status_version = EXCLUDED.status_version,
                 muted_until = EXCLUDED.muted_until,
                 resolved_at = EXCLUDED.resolved_at,
                 resolved_by = EXCLUDED.resolved_by",
        Uuid::new_v4(),
        project_id,
        fingerprint,
        status,
        status_version,
        muted_until,
        resolved_by,
    )
    .execute(db)
    .await?;
    Ok(())
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AlertRule {
    pub id: Uuid,
    pub project_id: Uuid,
    pub kind: String,
    pub enabled: bool,
    pub threshold: i32,
    pub window_minutes: i32,
    pub webhook_url: String,
    pub last_fired_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

pub async fn alert_rules_of(db: &Db, project_id: Uuid) -> Result<Vec<AlertRule>, Error> {
    sqlx::query_as!(
        AlertRule,
        r#"SELECT id, project_id, type AS kind, enabled, threshold, window_minutes,
                  webhook_url, last_fired_at, created_at
             FROM pulsify.alert_rules WHERE project_id = $1 ORDER BY created_at"#,
        project_id,
    )
    .fetch_all(db)
    .await
}

pub async fn matching_alert_rules(
    db: &Db,
    project_id: Uuid,
    kind: &str,
) -> Result<Vec<AlertRule>, Error> {
    sqlx::query_as!(
        AlertRule,
        r#"SELECT id, project_id, type AS kind, enabled, threshold, window_minutes,
                  webhook_url, last_fired_at, created_at
             FROM pulsify.alert_rules
            WHERE project_id = $1 AND type = $2 AND enabled"#,
        project_id,
        kind,
    )
    .fetch_all(db)
    .await
}

/// Spike rules whose cooldown window has elapsed — one firing per window.
pub async fn due_spike_rules(db: &Db) -> Result<Vec<AlertRule>, Error> {
    sqlx::query_as!(
        AlertRule,
        r#"SELECT id, project_id, type AS kind, enabled, threshold, window_minutes,
                  webhook_url, last_fired_at, created_at
             FROM pulsify.alert_rules
            WHERE type = 'error_spike'
              AND enabled
              AND (last_fired_at IS NULL
                   OR last_fired_at < now() - make_interval(mins => window_minutes))"#,
    )
    .fetch_all(db)
    .await
}

pub async fn mark_alert_fired(db: &Db, id: Uuid) -> Result<(), Error> {
    sqlx::query!(
        "UPDATE pulsify.alert_rules SET last_fired_at = now() WHERE id = $1",
        id,
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn count_alert_rules(db: &Db, project_id: Uuid) -> Result<i64, Error> {
    let count = sqlx::query_scalar!(
        "SELECT count(*) FROM pulsify.alert_rules WHERE project_id = $1",
        project_id,
    )
    .fetch_one(db)
    .await?;
    Ok(count.unwrap_or(0))
}

pub async fn create_alert_rule(
    db: &Db,
    project_id: Uuid,
    kind: &str,
    webhook_url: &str,
    threshold: i32,
    window_minutes: i32,
) -> Result<AlertRule, Error> {
    sqlx::query_as!(
        AlertRule,
        r#"INSERT INTO pulsify.alert_rules
               (id, project_id, type, webhook_url, threshold, window_minutes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, project_id, type AS kind, enabled, threshold, window_minutes,
                     webhook_url, last_fired_at, created_at"#,
        Uuid::new_v4(),
        project_id,
        kind,
        webhook_url,
        threshold,
        window_minutes,
    )
    .fetch_one(db)
    .await
}

pub async fn update_alert_rule(
    db: &Db,
    project_id: Uuid,
    id: Uuid,
    enabled: Option<bool>,
    threshold: Option<i32>,
    window_minutes: Option<i32>,
    webhook_url: Option<&str>,
) -> Result<Option<AlertRule>, Error> {
    sqlx::query_as!(
        AlertRule,
        r#"UPDATE pulsify.alert_rules
              SET enabled = coalesce($3, enabled),
                  threshold = coalesce($4, threshold),
                  window_minutes = coalesce($5, window_minutes),
                  webhook_url = coalesce($6, webhook_url)
            WHERE id = $2 AND project_id = $1
            RETURNING id, project_id, type AS kind, enabled, threshold, window_minutes,
                      webhook_url, last_fired_at, created_at"#,
        project_id,
        id,
        enabled,
        threshold,
        window_minutes,
        webhook_url,
    )
    .fetch_optional(db)
    .await
}

pub async fn delete_alert_rule(db: &Db, project_id: Uuid, id: Uuid) -> Result<bool, Error> {
    let result = sqlx::query!(
        "DELETE FROM pulsify.alert_rules WHERE id = $1 AND project_id = $2",
        id,
        project_id,
    )
    .execute(db)
    .await?;
    Ok(result.rows_affected() > 0)
}
