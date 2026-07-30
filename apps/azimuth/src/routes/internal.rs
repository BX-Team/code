use axum::Json;
use axum::extract::State;
use serde::Serialize;
use types::build_info::ServiceCard;
use utoipa::ToSchema;

use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct Health {
    pub status: &'static str,
}

#[utoipa::path(get, path = "/health", tag = "internal", responses((status = 200, body = Health)))]
pub async fn health() -> Json<Health> {
    Json(Health { status: "ok" })
}

#[utoipa::path(get, path = "/", tag = "internal", responses((status = 200, body = ServiceCard)))]
pub async fn card(State(state): State<AppState>) -> Json<ServiceCard> {
    Json(state.card)
}
