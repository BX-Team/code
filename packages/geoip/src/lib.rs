use std::net::IpAddr;
use std::path::Path;

use maxminddb::Reader;
use serde::Deserialize;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("cannot read the geoip database: {0}")]
    Read(#[from] maxminddb::MaxMindDbError),

    #[error("{path} is a {database_type} database, not an IPinfo one")]
    WrongDatabase { path: String, database_type: String },
}

/// IPinfo Lite record. The schema is flat — GeoLite2 nests this under `country.iso_code`.
#[derive(Debug, Deserialize)]
struct Record {
    country_code: Option<String>,
}

/// Country lookups from a local IPinfo Lite database, loaded into memory at startup.
pub struct Geoip {
    reader: Reader<Vec<u8>>,
}

impl Geoip {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, Error> {
        let path = path.as_ref();
        let reader = Reader::open_readfile(path)?;

        // A MaxMind file would not fail here, it would silently resolve every address to None.
        let database_type = &reader.metadata().database_type;
        if !database_type.to_ascii_lowercase().starts_with("ipinfo") {
            return Err(Error::WrongDatabase {
                path: path.display().to_string(),
                database_type: database_type.clone(),
            });
        }

        Ok(Self { reader })
    }

    /// ISO country code, or an empty string when unknown, private or unparseable.
    ///
    /// Lookups never fail the caller: an unknown country is worth less than a dropped event.
    pub fn country(&self, ip: &str) -> String {
        let Some(address) = parse_public(ip) else {
            return String::new();
        };

        match self.reader.lookup(address).map(|result| result.decode()) {
            Ok(Ok(Some(Record {
                country_code: Some(code),
            }))) => code,
            Ok(_) => String::new(),
            Err(error) => {
                tracing::debug!(%error, ip, "geoip lookup failed");
                String::new()
            }
        }
    }
}

/// Parses an address, rejecting anything that cannot belong to a real player.
fn parse_public(ip: &str) -> Option<IpAddr> {
    // Minecraft servers report IPv4 clients as IPv4-mapped IPv6 addresses.
    let ip = ip.trim().strip_prefix("::ffff:").unwrap_or(ip.trim());
    let address: IpAddr = ip.parse().ok()?;

    let private = match address {
        IpAddr::V4(v4) => {
            v4.is_private() || v4.is_loopback() || v4.is_link_local() || v4.is_unspecified()
        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || v6.is_unspecified()
                || matches!(v6.segments()[0] & 0xfe00, 0xfc00)
                || matches!(v6.segments()[0] & 0xffc0, 0xfe80)
        }
    };

    (!private).then_some(address)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn private_and_local_addresses_never_reach_the_database() {
        for ip in [
            "127.0.0.1",
            "10.0.0.1",
            "192.168.1.1",
            "169.254.0.1",
            "172.16.0.1",
            "172.31.255.255",
            "0.0.0.0",
            "::1",
            "fc00::1",
            "fd12:3456::1",
            "fe80::1",
            "::ffff:127.0.0.1",
            "not an ip",
            "",
        ] {
            assert_eq!(parse_public(ip), None, "{ip} should be rejected");
        }
    }

    #[test]
    fn public_addresses_are_looked_up() {
        assert!(parse_public("203.0.113.7").is_some());
        assert!(parse_public("2001:db8::1").is_some());
        assert!(parse_public("172.32.0.1").is_some());
    }

    #[test]
    fn mapped_ipv4_is_unwrapped_before_lookup() {
        assert_eq!(
            parse_public("::ffff:203.0.113.7"),
            Some("203.0.113.7".parse().unwrap())
        );
    }

    #[test]
    fn a_maxmind_database_is_rejected_rather_than_silently_useless() {
        let Ok(path) = std::env::var("GEOLITE2_TEST_MMDB") else {
            return;
        };
        assert!(matches!(
            Geoip::open(path),
            Err(Error::WrongDatabase { .. })
        ));
    }
}
