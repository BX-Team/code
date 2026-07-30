use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;

use crate::{Db, Error, Transaction};

/// Maximum delivery attempts before a message is moved to `ingest_dead_letters`.
pub const MAX_ATTEMPTS: i32 = 3;

/// One queued event, exactly as influx received it — unvalidated.
#[derive(Debug, Clone)]
pub struct QueuedEvent {
    pub id: i64,
    pub project_id: Uuid,
    pub payload: Value,
    pub received_at: DateTime<Utc>,
    pub ip: Option<String>,
    pub attempts: i32,
}

/// Enqueues one event per element in a single statement.
pub async fn enqueue(
    db: &Db,
    project_id: Uuid,
    events: &[Value],
    received_at: DateTime<Utc>,
    ip: Option<&str>,
) -> Result<u64, Error> {
    if events.is_empty() {
        return Ok(0);
    }

    let result = sqlx::query!(
        "INSERT INTO pulsify.ingest_queue (project_id, payload, received_at, ip)
         SELECT $1, payload, $3, $4 FROM unnest($2::jsonb[]) AS payload",
        project_id,
        events,
        received_at,
        ip,
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected())
}

/// Claims up to `limit` due messages for this worker; other workers skip them.
pub async fn claim(tx: &mut Transaction<'_>, limit: i64) -> Result<Vec<QueuedEvent>, Error> {
    let rows = sqlx::query_as!(
        QueuedEvent,
        r#"SELECT id, project_id, payload, received_at, ip, attempts
           FROM pulsify.ingest_queue
           WHERE available_at <= now()
           ORDER BY id
           LIMIT $1
           FOR UPDATE SKIP LOCKED"#,
        limit,
    )
    .fetch_all(&mut **tx)
    .await?;

    Ok(rows)
}

/// Drops handled messages; called inside the same transaction that applied their effects.
pub async fn complete(tx: &mut Transaction<'_>, ids: &[i64]) -> Result<(), Error> {
    if ids.is_empty() {
        return Ok(());
    }
    sqlx::query!("DELETE FROM pulsify.ingest_queue WHERE id = ANY($1)", ids)
        .execute(&mut **tx)
        .await?;
    Ok(())
}

/// Reschedules a failed message, or dead-letters it once it is out of attempts.
///
/// Runs on its own connection: the transaction that failed is rolled back by then.
pub async fn fail(db: &Db, event: &QueuedEvent, reason: &str) -> Result<(), Error> {
    let mut tx = db.begin().await?;

    if event.attempts + 1 >= MAX_ATTEMPTS {
        sqlx::query!(
            "INSERT INTO pulsify.ingest_dead_letters
                 (project_id, payload, received_at, attempts, reason)
             VALUES ($1, $2, $3, $4, $5)",
            event.project_id,
            event.payload,
            event.received_at,
            event.attempts + 1,
            reason,
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!("DELETE FROM pulsify.ingest_queue WHERE id = $1", event.id)
            .execute(&mut *tx)
            .await?;
    } else {
        let backoff = format!("{} seconds", 5 * (1 << event.attempts));
        sqlx::query!(
            "UPDATE pulsify.ingest_queue
                SET attempts = attempts + 1, available_at = now() + $2::interval
              WHERE id = $1",
            event.id,
            backoff as _,
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await
}

/// Records an event that could not be parsed at all, so bad payloads stay observable.
pub async fn dead_letter(
    tx: &mut Transaction<'_>,
    event: &QueuedEvent,
    reason: &str,
) -> Result<(), Error> {
    sqlx::query!(
        "INSERT INTO pulsify.ingest_dead_letters
             (project_id, payload, received_at, attempts, reason)
         VALUES ($1, $2, $3, $4, $5)",
        event.project_id,
        event.payload,
        event.received_at,
        event.attempts,
        reason,
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Queue depth, for the health endpoint and operational metrics.
pub async fn depth(db: &Db) -> Result<i64, Error> {
    let count = sqlx::query_scalar!("SELECT count(*) FROM pulsify.ingest_queue")
        .fetch_one(db)
        .await?;
    Ok(count.unwrap_or(0))
}
