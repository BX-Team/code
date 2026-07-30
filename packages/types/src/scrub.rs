use std::sync::LazyLock;

use md5::{Digest, Md5};
use regex::Regex;

// ASCII word boundaries, not Unicode ones: the TypeScript originals used JavaScript `\b`, and
// switching to Unicode semantics would silently stop matching next to Cyrillic text.
static UUID_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
        .unwrap()
});
static EMAIL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?-u:\b)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?-u:\b)").unwrap()
});
static IPV6_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?-u:\b)(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}(?-u:\b)").unwrap()
});
static IPV4_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?-u:\b)[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(?-u:\b)").unwrap()
});

static HEX_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"0x[0-9a-fA-F]+").unwrap());
static NUM_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"[0-9]+").unwrap());

/// Removes player-identifying data from text before it is persisted, at ingest and nowhere else.
pub fn scrub(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }
    let text = UUID_RE.replace_all(text, "<uuid>");
    let text = EMAIL_RE.replace_all(&text, "<email>");
    let text = IPV6_RE.replace_all(&text, "<ip>");
    IPV4_RE.replace_all(&text, "<ip>").into_owned()
}

/// Collapses hex blobs and line numbers so one logical error groups into one fingerprint.
pub fn normalize_for_fingerprint(text: &str) -> String {
    let text = HEX_RE.replace_all(text, "<hex>");
    NUM_RE.replace_all(&text, "<n>").into_owned()
}

/// Stable group key for an error, computed once at ingest from already-scrubbed text.
pub fn compute_fingerprint(plugin: &str, message: &str, level: &str, stacktrace: &str) -> String {
    // U+001F unit separator and MD5 are part of the stored contract: changing either
    // orphans every historical issue row and analytics point.
    let basis = format!(
        "{plugin}\u{1f}{}\u{1f}{level}\u{1f}{}",
        normalize_for_fingerprint(message),
        normalize_for_fingerprint(stacktrace)
    );
    hex::encode(Md5::digest(basis.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scrub_matches_the_typescript_implementation() {
        let vectors = [
            ("", ""),
            ("plain text with no PII", "plain text with no PII"),
            (
                "player 3f2504e0-4f89-11d3-9a0c-0305e82c3301 left",
                "player <uuid> left",
            ),
            (
                "PLAYER 3F2504E0-4F89-11D3-9A0C-0305E82C3301 left",
                "PLAYER <uuid> left",
            ),
            (
                "contact me at John.Doe+tag@example.co.uk please",
                "contact me at <email> please",
            ),
            (
                "connection from 203.0.113.7:25565 dropped",
                "connection from <ip>:25565 dropped",
            ),
            (
                "ipv6 2001:0db8:85a3:0000:0000:8a2e:0370:7334 seen",
                "ipv6 <ip> seen",
            ),
            ("short ipv6 fe80::1 here", "short ipv6 fe80::1 here"),
            (
                "mixed 3f2504e0-4f89-11d3-9a0c-0305e82c3301 a@b.com 10.0.0.1 2001:db8::1",
                "mixed <uuid> <email> <ip> 2001:db8::1",
            ),
            (
                "version 1.21.4 build 142 not an ip",
                "version 1.21.4 build 142 not an ip",
            ),
            ("a@b.c", "a@b.c"),
            (
                "e-mail: user_name%test@sub.domain.example.com!",
                "e-mail: <email>!",
            ),
            ("999.999.999.999 is matched too", "<ip> is matched too"),
            (
                "наш игрок 3f2504e0-4f89-11d3-9a0c-0305e82c3301 вышел",
                "наш игрок <uuid> вышел",
            ),
            ("путь 192.168.0.1 конец", "путь <ip> конец"),
            ("путь192.168.0.1конец", "путь<ip>конец"),
            ("ыuser@example.comы", "ы<email>ы"),
            ("ы2001:0db8:85a3:0000:0000:8a2e:0370:7334ы", "ы<ip>ы"),
            ("x192.168.0.1x", "x192.168.0.1x"),
        ];

        for (input, expected) in vectors {
            assert_eq!(scrub(input), expected, "scrub({input:?})");
        }
    }

    #[test]
    fn normalize_matches_the_typescript_implementation() {
        let vectors = [
            ("", ""),
            ("at Foo.bar(Foo.java:123)", "at Foo.bar(Foo.java:<n>)"),
            ("address 0xDEADBEEF and 0x1", "address <hex> and <hex>"),
            ("ticket 42 and 0x2A", "ticket <n> and <hex>"),
            ("no digits here", "no digits here"),
            ("1.21.4", "<n>.<n>.<n>"),
        ];

        for (input, expected) in vectors {
            assert_eq!(
                normalize_for_fingerprint(input),
                expected,
                "normalize({input:?})"
            );
        }
    }

    #[test]
    fn fingerprint_matches_the_typescript_implementation() {
        let vectors = [
            (
                (
                    "NDailyRewards",
                    "NullPointerException at line 42",
                    "error",
                    "at a.b.C(C.java:42)",
                ),
                "4008fc19d658847e3080d5cf30d88e68",
            ),
            (("", "", "error", ""), "e1c28572d6178bd914131a0290e29eb6"),
            (
                ("Quark", "msg", "warning", ""),
                "1724f9fc62f4238dabbf795e99667fcf",
            ),
            (
                ("Quark", "msg", "fatal", "at x"),
                "17949cbdb5e3adf1961deab469cfe04d",
            ),
            (
                (
                    "DivineMC",
                    "Cannot invoke \"String.length()\" because \"<local1>\" is null",
                    "error",
                    "at org.foo.Bar.baz(Bar.java:1234)\n\tat java.base/java.lang.Thread.run(Thread.java:840)",
                ),
                "2027d1a2b4dbca6319a8dccd130c38d3",
            ),
            (
                ("Плагин", "ошибка 5", "error", "трейс 0xFF"),
                "08997ad9e917a61c7b7144ac7b18530a",
            ),
        ];

        for ((plugin, message, level, stacktrace), expected) in vectors {
            assert_eq!(
                compute_fingerprint(plugin, message, level, stacktrace),
                expected,
                "fingerprint({plugin:?}, {message:?}, {level:?}, {stacktrace:?})"
            );
        }
    }
}
