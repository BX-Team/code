use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{Db, Error};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub email_verified: bool,
    pub image: Option<String>,
    pub role: Option<String>,
    pub banned: bool,
    pub ban_reason: Option<String>,
    pub ban_expires: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl User {
    pub fn is_admin(&self) -> bool {
        self.role.as_deref() == Some("admin")
    }

    /// A ban with an elapsed expiry no longer holds.
    pub fn is_banned(&self, now: DateTime<Utc>) -> bool {
        self.banned && self.ban_expires.is_none_or(|expires| expires > now)
    }
}

pub async fn user(db: &Db, id: Uuid) -> Result<Option<User>, Error> {
    sqlx::query_as!(
        User,
        "SELECT id, name, email, email_verified, image, role, banned, ban_reason, ban_expires,
                created_at, updated_at
           FROM auth.users WHERE id = $1",
        id,
    )
    .fetch_optional(db)
    .await
}

pub async fn user_by_email(db: &Db, email: &str) -> Result<Option<User>, Error> {
    sqlx::query_as!(
        User,
        "SELECT id, name, email, email_verified, image, role, banned, ban_reason, ban_expires,
                created_at, updated_at
           FROM auth.users WHERE lower(email) = lower($1)",
        email,
    )
    .fetch_optional(db)
    .await
}

pub async fn create_user(
    db: &Db,
    name: &str,
    email: &str,
    email_verified: bool,
    image: Option<&str>,
) -> Result<User, Error> {
    sqlx::query_as!(
        User,
        "INSERT INTO auth.users (id, name, email, email_verified, image)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, email_verified, image, role, banned, ban_reason, ban_expires,
                   created_at, updated_at",
        Uuid::new_v4(),
        name,
        email,
        email_verified,
        image,
    )
    .fetch_one(db)
    .await
}

pub async fn rename_user(db: &Db, id: Uuid, name: &str) -> Result<Option<User>, Error> {
    sqlx::query_as!(
        User,
        "UPDATE auth.users SET name = $2, updated_at = now() WHERE id = $1
         RETURNING id, name, email, email_verified, image, role, banned, ban_reason, ban_expires,
                   created_at, updated_at",
        id,
        name,
    )
    .fetch_optional(db)
    .await
}

/// Deletes a user; projects and quotas follow through real foreign keys.
pub async fn delete_user(db: &Db, id: Uuid) -> Result<bool, Error> {
    let result = sqlx::query!("DELETE FROM auth.users WHERE id = $1", id)
        .execute(db)
        .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn list_users(
    db: &Db,
    query: Option<&str>,
    banned: Option<bool>,
    limit: i64,
    offset: i64,
) -> Result<Vec<User>, Error> {
    sqlx::query_as!(
        User,
        "SELECT id, name, email, email_verified, image, role, banned, ban_reason, ban_expires,
                created_at, updated_at
           FROM auth.users
          WHERE ($1::text IS NULL OR email ILIKE '%' || $1 || '%')
            AND ($2::bool IS NULL OR banned = $2)
          ORDER BY created_at DESC
          LIMIT $3 OFFSET $4",
        query,
        banned,
        limit,
        offset,
    )
    .fetch_all(db)
    .await
}

pub async fn count_users(db: &Db, query: Option<&str>, banned: Option<bool>) -> Result<i64, Error> {
    let count = sqlx::query_scalar!(
        "SELECT count(*) FROM auth.users
          WHERE ($1::text IS NULL OR email ILIKE '%' || $1 || '%')
            AND ($2::bool IS NULL OR banned = $2)",
        query,
        banned,
    )
    .fetch_one(db)
    .await?;
    Ok(count.unwrap_or(0))
}

pub async fn set_ban(
    db: &Db,
    id: Uuid,
    banned: bool,
    reason: Option<&str>,
    expires: Option<DateTime<Utc>>,
) -> Result<bool, Error> {
    let result = sqlx::query!(
        "UPDATE auth.users
            SET banned = $2, ban_reason = $3, ban_expires = $4, updated_at = now()
          WHERE id = $1",
        id,
        banned,
        reason,
        expires,
    )
    .execute(db)
    .await?;
    Ok(result.rows_affected() > 0)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    pub expires_at: DateTime<Utc>,
    pub impersonated_by: Option<Uuid>,
}

/// Sessions are stored hashed: a leaked database dump must not be a set of usable cookies.
pub async fn create_session(
    db: &Db,
    user_id: Uuid,
    token_hash: &[u8],
    expires_at: DateTime<Utc>,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
) -> Result<Session, Error> {
    sqlx::query_as!(
        Session,
        "INSERT INTO auth.sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, expires_at, impersonated_by",
        Uuid::new_v4(),
        user_id,
        token_hash,
        expires_at,
        ip_address,
        user_agent,
    )
    .fetch_one(db)
    .await
}

pub async fn session_user(db: &Db, token_hash: &[u8]) -> Result<Option<User>, Error> {
    sqlx::query_as!(
        User,
        "SELECT u.id, u.name, u.email, u.email_verified, u.image, u.role, u.banned,
                u.ban_reason, u.ban_expires, u.created_at, u.updated_at
           FROM auth.sessions s
           JOIN auth.users u ON u.id = s.user_id
          WHERE s.token_hash = $1 AND s.expires_at > now()",
        token_hash,
    )
    .fetch_optional(db)
    .await
}

pub async fn delete_session(db: &Db, token_hash: &[u8]) -> Result<(), Error> {
    sqlx::query!(
        "DELETE FROM auth.sessions WHERE token_hash = $1",
        token_hash
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn prune_sessions(db: &Db) -> Result<u64, Error> {
    let result = sqlx::query!("DELETE FROM auth.sessions WHERE expires_at < now()")
        .execute(db)
        .await?;
    Ok(result.rows_affected())
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Account {
    pub id: Uuid,
    pub user_id: Uuid,
    pub provider_id: String,
    pub account_id: String,
}

pub async fn account(
    db: &Db,
    provider_id: &str,
    account_id: &str,
) -> Result<Option<Account>, Error> {
    sqlx::query_as!(
        Account,
        "SELECT id, user_id, provider_id, account_id FROM auth.accounts
          WHERE provider_id = $1 AND account_id = $2",
        provider_id,
        account_id,
    )
    .fetch_optional(db)
    .await
}

pub async fn link_account(
    db: &Db,
    user_id: Uuid,
    provider_id: &str,
    account_id: &str,
    access_token: Option<&str>,
    scope: Option<&str>,
) -> Result<(), Error> {
    sqlx::query!(
        "INSERT INTO auth.accounts (id, user_id, provider_id, account_id, access_token, scope)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (provider_id, account_id) DO UPDATE
             SET access_token = EXCLUDED.access_token,
                 scope = EXCLUDED.scope,
                 updated_at = now()",
        Uuid::new_v4(),
        user_id,
        provider_id,
        account_id,
        access_token,
        scope,
    )
    .execute(db)
    .await?;
    Ok(())
}

/// Stores a magic link challenge; only its hash is kept, like a session token.
pub async fn create_verification(
    db: &Db,
    identifier: &str,
    value_hash: &[u8],
    expires_at: DateTime<Utc>,
) -> Result<(), Error> {
    sqlx::query!(
        "INSERT INTO auth.verifications (id, identifier, value_hash, expires_at)
         VALUES ($1, $2, $3, $4)",
        Uuid::new_v4(),
        identifier,
        value_hash,
        expires_at,
    )
    .execute(db)
    .await?;
    Ok(())
}

/// Burns a magic link challenge, returning its identifier exactly once.
pub async fn consume_verification(db: &Db, value_hash: &[u8]) -> Result<Option<String>, Error> {
    sqlx::query_scalar!(
        "UPDATE auth.verifications SET consumed_at = now()
          WHERE value_hash = $1 AND consumed_at IS NULL AND expires_at > now()
          RETURNING identifier",
        value_hash,
    )
    .fetch_optional(db)
    .await
}

pub async fn prune_verifications(db: &Db) -> Result<u64, Error> {
    let result = sqlx::query!("DELETE FROM auth.verifications WHERE expires_at < now()")
        .execute(db)
        .await?;
    Ok(result.rows_affected())
}
