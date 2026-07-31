use std::sync::LazyLock;

use indexmap::IndexMap;
use regex::Regex;

static VERSION_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^([0-9]+)\.([0-9]+)(?:\.([0-9]+))?(?:-(pre|rc)([0-9]+))?$").unwrap()
});

/// A Minecraft or plugin version: legacy `1.X[.Y]` and modern `XX.Y[.Z]`, `pre` < `rc` < release.
///
/// Field order is the comparison order, so the derived `Ord` is the version order.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, PartialOrd, Ord)]
pub struct Version {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pre_rank: u8,
    pre_number: u32,
}

impl Version {
    pub fn parse(version: &str) -> Option<Self> {
        let captures = VERSION_RE.captures(version)?;
        let number = |index: usize| {
            captures
                .get(index)
                .and_then(|m| m.as_str().parse::<u32>().ok())
                .unwrap_or(0)
        };
        let pre_rank = match captures.get(4).map(|m| m.as_str()) {
            Some("pre") => 1,
            Some("rc") => 2,
            _ => 3,
        };
        Some(Self {
            major: number(1),
            minor: number(2),
            patch: number(3),
            pre_rank,
            pre_number: number(5),
        })
    }

    /// `major.minor`, the key versions are grouped under on the downloads page.
    pub fn group_key(&self) -> String {
        format!("{}.{}", self.major, self.minor)
    }

    fn parse_or_zero(version: &str) -> Self {
        Self::parse(version).unwrap_or_default()
    }
}

/// True when `a` is strictly newer than `b`; unparsable input compares as not newer.
pub fn is_newer(a: &str, b: &str) -> bool {
    match (Version::parse(a), Version::parse(b)) {
        (Some(a), Some(b)) => a > b,
        _ => false,
    }
}

/// Groups version keys by `major.minor`, newest first within and across groups.
///
/// The group order is the render order of the downloads page, so the map keeps insertion order.
pub fn group_versions<I, S>(keys: I) -> IndexMap<String, Vec<String>>
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    let mut sorted: Vec<String> = keys.into_iter().map(Into::into).collect();
    sorted.sort_by(|a, b| Version::parse_or_zero(b).cmp(&Version::parse_or_zero(a)));

    let mut groups: IndexMap<String, Vec<String>> = IndexMap::new();
    for version in sorted {
        let key = Version::parse_or_zero(&version).group_key();
        groups.entry(key).or_default().push(version);
    }
    groups
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_both_version_schemes() {
        assert_eq!(
            Version::parse("1.21.4").map(|v| (v.major, v.minor, v.patch)),
            Some((1, 21, 4))
        );
        assert_eq!(
            Version::parse("26.1").map(|v| (v.major, v.minor, v.patch)),
            Some((26, 1, 0))
        );
        assert_eq!(Version::parse("1.21.7-pre1").map(|v| v.patch), Some(7));
        assert!(Version::parse("not-a-version").is_none());
        assert!(Version::parse("1").is_none());
        assert!(Version::parse("1.21.4.5").is_none());
        assert!(Version::parse("1.21.4-beta1").is_none());
    }

    #[test]
    fn orders_prereleases_below_the_release() {
        assert!(is_newer("1.21.5", "1.21.4"));
        assert!(is_newer("1.22", "1.21.9"));
        assert!(is_newer("26.1.2", "26.1"));
        assert!(is_newer("1.21.4", "1.21.4-rc1"));
        assert!(is_newer("1.21.4-rc1", "1.21.4-pre9"));
        assert!(is_newer("1.21.4-pre2", "1.21.4-pre1"));
        assert!(!is_newer("1.21.4", "1.21.4"));
        assert!(!is_newer("1.21.3", "1.21.4"));
    }

    #[test]
    fn unparsable_input_is_never_newer() {
        assert!(!is_newer("dev", "1.21.4"));
        assert!(!is_newer("1.21.4", "dev"));
        assert!(!is_newer("dev", "dev"));
    }

    #[test]
    fn groups_are_ordered_newest_first() {
        let groups = group_versions(["1.20.1", "26.1", "1.21.4", "26.1.2", "1.20", "26.2-rc1"]);

        let keys: Vec<&str> = groups.keys().map(String::as_str).collect();
        assert_eq!(keys, ["26.2", "26.1", "1.21", "1.20"]);
        assert_eq!(groups["26.1"], ["26.1.2", "26.1"]);
        assert_eq!(groups["1.20"], ["1.20.1", "1.20"]);
        assert_eq!(groups["1.21"], ["1.21.4"]);
    }

    #[test]
    fn unparsable_keys_land_in_their_own_group() {
        let groups = group_versions(["1.21.4", "snapshot"]);
        assert_eq!(groups["0.0"], ["snapshot"]);
    }
}
