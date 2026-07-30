use axum::extract::{FromRequestParts, Path};
use axum::http::request::Parts;
use database::models::auth::User;
use database::models::pulsify::Project;
use serde::Deserialize;
use util::ApiError;
use uuid::Uuid;

use super::session::Session;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
struct ProjectPath {
    id: Uuid,
}

/// A project the caller owns. Handlers take this instead of an id, so the ownership check
/// cannot be left out of one of them.
#[derive(Debug, Clone)]
pub struct OwnedProject {
    pub project: Project,
    pub user: User,
}

impl OwnedProject {
    /// Installable projects are the only ones with cross-server aggregation and metrics.
    pub fn require_installable(&self) -> Result<(), ApiError> {
        if self.project.is_installable() {
            Ok(())
        } else {
            Err(ApiError::BadRequest(
                "This endpoint is only available for plugins and mods".into(),
            ))
        }
    }

    pub fn require_server(&self) -> Result<(), ApiError> {
        if self.project.kind == "server" {
            Ok(())
        } else {
            Err(ApiError::BadRequest(
                "This endpoint is only available for servers".into(),
            ))
        }
    }
}

impl FromRequestParts<AppState> for OwnedProject {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let Session { user } = Session::from_request_parts(parts, state).await?;

        let Path(ProjectPath { id }) = Path::<ProjectPath>::from_request_parts(parts, state)
            .await
            .map_err(|_| ApiError::NotFound("Project not found".into()))?;

        // 404 rather than 403 on purpose: a wrong owner must not confirm that the id exists.
        let project = database::models::pulsify::owned_project(&state.db, id, user.id)
            .await?
            .ok_or_else(|| ApiError::NotFound("Project not found".into()))?;

        Ok(Self { project, user })
    }
}
