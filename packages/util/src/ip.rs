use http::HeaderMap;

/// Caller address as seen through nginx: `X-Forwarded-For`'s first hop, else `X-Real-IP`.
pub fn client_ip(headers: &HeaderMap) -> Option<String> {
    headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|value| value.to_str().ok())
                .map(str::trim)
                .filter(|value| !value.is_empty())
        })
        .map(ToOwned::to_owned)
}

#[cfg(test)]
mod tests {
    use http::HeaderValue;

    use super::*;

    fn headers(pairs: &[(&'static str, &str)]) -> HeaderMap {
        let mut headers = HeaderMap::new();
        for (name, value) in pairs {
            headers.insert(*name, HeaderValue::from_str(value).unwrap());
        }
        headers
    }

    #[test]
    fn the_first_hop_is_the_client() {
        let headers = headers(&[("x-forwarded-for", "203.0.113.7, 10.0.0.1")]);
        assert_eq!(client_ip(&headers).as_deref(), Some("203.0.113.7"));
    }

    #[test]
    fn falls_back_to_real_ip_and_then_to_nothing() {
        assert_eq!(
            client_ip(&headers(&[("x-real-ip", "203.0.113.7")])).as_deref(),
            Some("203.0.113.7")
        );
        assert_eq!(client_ip(&HeaderMap::new()), None);
    }
}
