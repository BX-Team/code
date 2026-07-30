use serde::Deserialize;
use util::ApiError;

use crate::env::Config;

/// An identity provider. Only the two the site actually offers exist, so an unknown provider
/// is a routing error rather than a configuration lookup.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Provider {
    GitHub,
    Discord,
}

impl Provider {
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "github" => Some(Self::GitHub),
            "discord" => Some(Self::Discord),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::GitHub => "github",
            Self::Discord => "discord",
        }
    }

    fn credentials(self, config: &Config) -> Option<(&str, &str)> {
        let (id, secret) = match self {
            Self::GitHub => (&config.github_client_id, &config.github_client_secret),
            Self::Discord => (&config.discord_client_id, &config.discord_client_secret),
        };

        (!id.is_empty() && !secret.is_empty()).then_some((id.as_str(), secret.as_str()))
    }

    /// Registered with the provider as `/auth/callback/{provider}`; changing it breaks sign-in
    /// until the provider's own configuration is updated to match.
    pub fn redirect_uri(self, config: &Config) -> String {
        format!(
            "{}/auth/callback/{}",
            config.api_public_url.trim_end_matches('/'),
            self.as_str()
        )
    }

    pub fn authorize_url(self, config: &Config, state: &str) -> Result<String, ApiError> {
        let (client_id, _) = self.credentials(config).ok_or_else(|| {
            ApiError::BadRequest(format!("{} sign-in is not configured", self.as_str()))
        })?;

        let redirect = urlencode(&self.redirect_uri(config));
        let state = urlencode(state);

        Ok(match self {
            Self::GitHub => format!(
                "https://github.com/login/oauth/authorize\
                 ?client_id={client_id}&redirect_uri={redirect}&scope=read%3Auser%20user%3Aemail&state={state}"
            ),
            Self::Discord => format!(
                "https://discord.com/oauth2/authorize\
                 ?client_id={client_id}&redirect_uri={redirect}&response_type=code&scope=identify%20email&state={state}"
            ),
        })
    }

    /// Exchanges the code and reads the profile behind it.
    pub async fn identity(
        self,
        config: &Config,
        http: &reqwest::Client,
        code: &str,
    ) -> Result<Identity, ApiError> {
        let (client_id, client_secret) = self.credentials(config).ok_or_else(|| {
            ApiError::BadRequest(format!("{} sign-in is not configured", self.as_str()))
        })?;

        let token = self
            .exchange(
                http,
                client_id,
                client_secret,
                &self.redirect_uri(config),
                code,
            )
            .await?;

        match self {
            Self::GitHub => github_identity(http, &token).await,
            Self::Discord => discord_identity(http, &token).await,
        }
    }

    async fn exchange(
        self,
        http: &reqwest::Client,
        client_id: &str,
        client_secret: &str,
        redirect_uri: &str,
        code: &str,
    ) -> Result<String, ApiError> {
        let url = match self {
            Self::GitHub => "https://github.com/login/oauth/access_token",
            Self::Discord => "https://discord.com/api/oauth2/token",
        };

        let form = [
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("code", code),
            ("redirect_uri", redirect_uri),
            ("grant_type", "authorization_code"),
        ];

        #[derive(Deserialize)]
        struct TokenResponse {
            access_token: Option<String>,
        }

        let response: TokenResponse = http
            .post(url)
            .header("Accept", "application/json")
            .form(&form)
            .send()
            .await
            .map_err(|error| ApiError::ServiceUnavailable(error.to_string()))?
            .json()
            .await
            .map_err(|_| ApiError::Unauthorized("The provider rejected the sign-in".into()))?;

        response
            .access_token
            .ok_or_else(|| ApiError::Unauthorized("The provider rejected the sign-in".into()))
    }
}

/// Who the provider says the caller is.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Identity {
    pub account_id: String,
    pub email: String,
    pub name: String,
    pub image: Option<String>,
}

async fn github_identity(http: &reqwest::Client, token: &str) -> Result<Identity, ApiError> {
    #[derive(Deserialize)]
    struct User {
        id: i64,
        login: String,
        name: Option<String>,
        email: Option<String>,
        avatar_url: Option<String>,
    }

    #[derive(Deserialize)]
    struct Email {
        email: String,
        primary: bool,
        verified: bool,
    }

    let user: User = get_json(http, "https://api.github.com/user", token).await?;

    // A GitHub profile can hide its email, so fall back to the verified primary address.
    let email = match user.email {
        Some(email) => email,
        None => {
            let emails: Vec<Email> =
                get_json(http, "https://api.github.com/user/emails", token).await?;
            emails
                .into_iter()
                .find(|entry| entry.primary && entry.verified)
                .map(|entry| entry.email)
                .ok_or_else(|| {
                    ApiError::BadRequest("Your GitHub account has no verified email".into())
                })?
        }
    };

    Ok(Identity {
        account_id: user.id.to_string(),
        name: user.name.unwrap_or(user.login),
        email,
        image: user.avatar_url,
    })
}

async fn discord_identity(http: &reqwest::Client, token: &str) -> Result<Identity, ApiError> {
    #[derive(Deserialize)]
    struct User {
        id: String,
        username: String,
        global_name: Option<String>,
        email: Option<String>,
        verified: Option<bool>,
        avatar: Option<String>,
    }

    let user: User = get_json(http, "https://discord.com/api/users/@me", token).await?;

    let email = user
        .email
        .filter(|_| user.verified.unwrap_or(false))
        .ok_or_else(|| ApiError::BadRequest("Your Discord account has no verified email".into()))?;

    let image = user
        .avatar
        .map(|hash| format!("https://cdn.discordapp.com/avatars/{}/{hash}.png", user.id));

    Ok(Identity {
        account_id: user.id,
        name: user.global_name.unwrap_or(user.username),
        email,
        image,
    })
}

async fn get_json<T: serde::de::DeserializeOwned>(
    http: &reqwest::Client,
    url: &str,
    token: &str,
) -> Result<T, ApiError> {
    http.get(url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        // GitHub rejects requests without one.
        .header("User-Agent", "bx-team-azimuth")
        .send()
        .await
        .map_err(|error| ApiError::ServiceUnavailable(error.to_string()))?
        .json()
        .await
        .map_err(|_| ApiError::Unauthorized("The provider returned an unusable profile".into()))
}

fn urlencode(value: &str) -> String {
    urlencoding::encode(value).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> Config {
        Config {
            bind: "127.0.0.1:0".parse().unwrap(),
            database_url: String::new(),
            clickhouse_url: String::new(),
            clickhouse_database: String::new(),
            clickhouse_user: String::new(),
            clickhouse_password: String::new(),
            app_url: "https://bxteam.org".into(),
            api_public_url: "https://api.bxteam.org".into(),
            trusted_origins: vec!["https://bxteam.org".into()],
            api_secret_key: String::new(),
            cookie_domain: ".bxteam.org".into(),
            smtp_url: String::new(),
            email_from: String::new(),
            github_client_id: "gh-id".into(),
            github_client_secret: "gh-secret".into(),
            discord_client_id: String::new(),
            discord_client_secret: String::new(),
            storage: storage::Config {
                endpoint: String::new(),
                access_key_id: String::new(),
                secret_access_key: String::new(),
                builds_bucket: String::new(),
                error_payloads_bucket: String::new(),
                public_url: String::new(),
            },
            max_upload_bytes: 0,
        }
    }

    #[test]
    fn the_callback_url_is_the_one_registered_with_the_provider() {
        assert_eq!(
            Provider::GitHub.redirect_uri(&config()),
            "https://api.bxteam.org/auth/callback/github"
        );
        assert_eq!(
            Provider::Discord.redirect_uri(&config()),
            "https://api.bxteam.org/auth/callback/discord"
        );
    }

    #[test]
    fn the_authorize_url_carries_an_escaped_redirect_and_state() {
        let url = Provider::GitHub
            .authorize_url(&config(), "st/ate+1")
            .unwrap();

        assert!(url.contains("client_id=gh-id"));
        assert!(
            url.contains("redirect_uri=https%3A%2F%2Fapi.bxteam.org%2Fauth%2Fcallback%2Fgithub")
        );
        assert!(url.contains("state=st%2Fate%2B1"), "{url}");
    }

    #[test]
    fn an_unconfigured_provider_is_refused_rather_than_half_attempted() {
        assert!(Provider::Discord.authorize_url(&config(), "state").is_err());
    }

    #[test]
    fn only_the_two_offered_providers_parse() {
        assert_eq!(Provider::parse("github"), Some(Provider::GitHub));
        assert_eq!(Provider::parse("discord"), Some(Provider::Discord));
        assert_eq!(Provider::parse("google"), None);
    }
}
