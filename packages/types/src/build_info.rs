use serde::Serialize;
use utoipa::ToSchema;

/// Compile-time provenance of a service binary, filled in by that service's `build.rs`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, ToSchema)]
pub struct BuildInfo {
    pub git_hash: &'static str,
    pub comp_date: &'static str,
    pub profile: &'static str,
}

/// The `GET /` card every HTTP service answers with.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, ToSchema)]
pub struct ServiceCard {
    pub name: &'static str,
    pub version: &'static str,
    pub documentation: &'static str,
    pub build_info: BuildInfo,
}

impl ServiceCard {
    /// `Azimuth (v0.1.0/366f528)` — the log banner and `Server` header.
    pub fn banner(&self, display_name: &str) -> String {
        format!(
            "{display_name} (v{}/{})",
            self.version, self.build_info.git_hash
        )
    }
}

/// Builds the service card; the version is the workspace version, shared by all three services.
pub fn service_card(name: &'static str, build_info: BuildInfo) -> ServiceCard {
    ServiceCard {
        name,
        version: env!("CARGO_PKG_VERSION"),
        documentation: "https://bxteam.org/docs/api",
        build_info,
    }
}

/// Reads the commit stamped by `build.rs`; an unstamped build reports `unknown`.
pub const fn git_hash(stamped: Option<&'static str>) -> &'static str {
    match stamped {
        Some(hash) if !hash.is_empty() => hash,
        _ => "unknown",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const BUILD: BuildInfo = BuildInfo {
        git_hash: "366f528",
        comp_date: "2026-08-01T12:00:00Z",
        profile: "release-service",
    };

    #[test]
    fn card_is_named_and_versioned() {
        let card = service_card("azimuth", BUILD);
        assert_eq!(card.name, "azimuth");
        assert_eq!(card.version, env!("CARGO_PKG_VERSION"));
        assert_eq!(
            card.banner("Azimuth"),
            format!("Azimuth (v{}/366f528)", env!("CARGO_PKG_VERSION"))
        );
    }

    #[test]
    fn an_unstamped_build_reports_an_unknown_commit() {
        assert_eq!(git_hash(Some("366f528")), "366f528");
        assert_eq!(git_hash(Some("")), "unknown");
        assert_eq!(git_hash(None), "unknown");
    }
}
