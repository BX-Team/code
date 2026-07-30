use axum::http::{HeaderValue, header};
use axum::response::Response;

use super::session::COOKIE_NAME;

/// A week. Long enough that the dashboard is not a login screen, short enough that a stolen
/// cookie is not forever.
pub const SESSION_DAYS: i64 = 7;

/// Session cookies live on the parent domain so the static site on `bxteam.org` can send them
/// to `api.bxteam.org`.
pub fn set(response: &mut Response, token: &str, domain: &str) {
    let value = format!(
        "{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age={}{}",
        SESSION_DAYS * 24 * 60 * 60,
        domain_attribute(domain),
    );
    append(response, &value);
}

pub fn clear(response: &mut Response, domain: &str) {
    let value = format!(
        "{COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0{}",
        domain_attribute(domain),
    );
    append(response, &value);
}

/// A bare host (localhost in development) must not get a Domain attribute at all.
fn domain_attribute(domain: &str) -> String {
    if domain.is_empty() || domain == "localhost" {
        String::new()
    } else {
        format!("; Domain={domain}")
    }
}

fn append(response: &mut Response, value: &str) {
    if let Ok(header) = HeaderValue::from_str(value) {
        response.headers_mut().append(header::SET_COOKIE, header);
    }
}

#[cfg(test)]
mod tests {
    use axum::response::IntoResponse;

    use super::*;

    fn cookie_of(build: impl Fn(&mut Response)) -> String {
        let mut response = ().into_response();
        build(&mut response);
        response
            .headers()
            .get(header::SET_COOKIE)
            .unwrap()
            .to_str()
            .unwrap()
            .to_owned()
    }

    #[test]
    fn the_session_cookie_is_locked_down() {
        let cookie = cookie_of(|response| set(response, "abc123", ".bxteam.org"));

        assert!(cookie.starts_with("bx_session=abc123;"));
        assert!(cookie.contains("HttpOnly"));
        assert!(cookie.contains("Secure"));
        assert!(cookie.contains("SameSite=Lax"));
        assert!(cookie.contains("Domain=.bxteam.org"));
        assert!(cookie.contains("Max-Age=604800"));
    }

    #[test]
    fn clearing_expires_the_cookie_on_the_same_domain() {
        let cookie = cookie_of(|response| clear(response, ".bxteam.org"));

        assert!(cookie.contains("Max-Age=0"));
        assert!(cookie.contains("Domain=.bxteam.org"));
    }

    #[test]
    fn a_bare_host_gets_no_domain_attribute() {
        assert!(!cookie_of(|response| set(response, "abc", "localhost")).contains("Domain"));
        assert!(!cookie_of(|response| set(response, "abc", "")).contains("Domain"));
    }
}
