use axum::Json;
use axum::extract::State;
use serde::Serialize;
use types::build_info::ServiceCard;

use crate::state::AppState;

pub mod ingest;

#[derive(Debug, Serialize)]
pub struct Health {
    pub status: &'static str,
    pub service: &'static str,
}

pub async fn health() -> Json<Health> {
    Json(Health {
        status: "ok",
        service: "influx",
    })
}

pub async fn card(State(state): State<AppState>) -> Json<ServiceCard> {
    Json(state.card)
}
