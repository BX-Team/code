use std::sync::LazyLock;

use chrono::Utc;
use serde::Serialize;
use serde_json::{Value, json};

use crate::truncate;

pub mod spikes;

/// Discord rejects a plain webhook body, so those URLs get an embed instead.
static DISCORD_WEBHOOK: LazyLock<regex_lite::Regex> = LazyLock::new(|| {
    regex_lite::Regex::new(r"(?i)^https://(?:[a-z]+\.)?discord(?:app)?\.com/api/webhooks/").unwrap()
});

const NEW_ISSUE_COLOUR: u32 = 0x00F5_9E0B;
const ALARM_COLOUR: u32 = 0x00EF_4444;

#[derive(Debug, Clone, Serialize)]
pub struct Project {
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertPayload {
    #[serde(rename = "type")]
    pub kind: String,
    pub project: Project,
    pub title: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub level: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plugin: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window_minutes: Option<i32>,
    pub url: String,
    pub timestamp: String,
}

impl AlertPayload {
    pub fn new(kind: &str, project: Project, message: String, app_url: &str) -> Self {
        let url = format!(
            "{}/dashboard/{}/errors",
            app_url.trim_end_matches('/'),
            project.slug
        );

        Self {
            title: title_for(kind).to_owned(),
            kind: kind.to_owned(),
            project,
            message,
            level: None,
            plugin: None,
            version: None,
            count: None,
            window_minutes: None,
            url,
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

fn title_for(kind: &str) -> &'static str {
    match kind {
        "new_issue" => "New issue",
        "regression" => "Regression",
        _ => "Error spike",
    }
}

/// Posts one alert. Delivery problems are logged, never propagated: a broken webhook must not
/// stall the ingest pipeline.
pub async fn deliver(http: &reqwest::Client, webhook_url: &str, payload: &AlertPayload) {
    let body = if DISCORD_WEBHOOK.is_match(webhook_url) {
        discord_embed(payload)
    } else {
        serde_json::to_value(payload).unwrap_or(Value::Null)
    };

    match http.post(webhook_url).json(&body).send().await {
        Ok(response) if response.status().is_success() => {}
        Ok(response) => {
            tracing::warn!(status = %response.status(), "webhook rejected the alert");
        }
        Err(error) => tracing::warn!(%error, "webhook delivery failed"),
    }
}

fn discord_embed(payload: &AlertPayload) -> Value {
    let colour = if payload.kind == "new_issue" {
        NEW_ISSUE_COLOUR
    } else {
        ALARM_COLOUR
    };

    let mut fields = Vec::new();
    if let Some(plugin) = &payload.plugin {
        fields.push(json!({ "name": "Plugin", "value": plugin, "inline": true }));
    }
    if let Some(level) = &payload.level {
        fields.push(json!({ "name": "Level", "value": level, "inline": true }));
    }
    if let Some(version) = &payload.version {
        fields.push(json!({ "name": "Version", "value": version, "inline": true }));
    }
    if let Some(count) = payload.count {
        fields.push(json!({ "name": "Events", "value": count.to_string(), "inline": true }));
    }

    let description = if payload.message.chars().count() > 1800 {
        format!("{}…", truncate(&payload.message, 1800))
    } else {
        payload.message.clone()
    };

    json!({
        "embeds": [{
            "title": format!("{} · {}", payload.title, payload.project.name),
            "description": description,
            "url": payload.url,
            "color": colour,
            "fields": fields,
            "footer": { "text": "Pulsify" },
            "timestamp": payload.timestamp,
        }]
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn payload(kind: &str) -> AlertPayload {
        let mut payload = AlertPayload::new(
            kind,
            Project {
                name: "DivineMC".into(),
                slug: "divinemc".into(),
            },
            "boom".into(),
            "https://bxteam.org/",
        );
        payload.plugin = Some("NDailyRewards".into());
        payload.level = Some("error".into());
        payload
    }

    #[test]
    fn discord_urls_are_recognised_in_all_their_shapes() {
        for url in [
            "https://discord.com/api/webhooks/1/abc",
            "https://discordapp.com/api/webhooks/1/abc",
            "https://ptb.discord.com/api/webhooks/1/abc",
            "https://DISCORD.com/api/webhooks/1/abc",
        ] {
            assert!(DISCORD_WEBHOOK.is_match(url), "{url}");
        }

        for url in [
            "https://example.com/api/webhooks/1/abc",
            "https://notdiscord.com/api/webhooks/1",
            "http://discord.com/api/webhooks/1/abc",
        ] {
            assert!(!DISCORD_WEBHOOK.is_match(url), "{url}");
        }
    }

    #[test]
    fn the_alert_links_back_to_the_project_errors_page() {
        assert_eq!(
            payload("new_issue").url,
            "https://bxteam.org/dashboard/divinemc/errors"
        );
    }

    #[test]
    fn each_transition_gets_its_own_title_and_colour() {
        assert_eq!(payload("new_issue").title, "New issue");
        assert_eq!(payload("regression").title, "Regression");
        assert_eq!(payload("error_spike").title, "Error spike");

        assert_eq!(
            discord_embed(&payload("new_issue"))["embeds"][0]["color"],
            NEW_ISSUE_COLOUR
        );
        assert_eq!(
            discord_embed(&payload("regression"))["embeds"][0]["color"],
            ALARM_COLOUR
        );
    }

    #[test]
    fn long_messages_are_cut_to_fit_a_discord_embed() {
        let mut long = payload("new_issue");
        long.message = "п".repeat(5000);

        let embed = discord_embed(&long);
        let description = embed["embeds"][0]["description"].as_str().unwrap();
        assert_eq!(description.chars().count(), 1801);
        assert!(description.ends_with('…'));
    }

    #[test]
    fn a_plain_webhook_receives_the_payload_itself() {
        let json = serde_json::to_value(payload("new_issue")).unwrap();
        assert_eq!(json["type"], "new_issue");
        assert_eq!(json["project"]["slug"], "divinemc");
        assert!(json.get("count").is_none());
    }
}
