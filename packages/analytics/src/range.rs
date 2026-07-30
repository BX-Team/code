/// Dashboard time window. The interval and bucket functions are fixed per variant, so no
/// dashboard input is ever interpolated into SQL.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Range {
    #[default]
    H24,
    D7,
    D30,
}

impl Range {
    pub fn from_query(value: Option<&str>, fallback: Range) -> Range {
        match value {
            Some("24h") => Range::H24,
            Some("7d") => Range::D7,
            Some("30d") => Range::D30,
            _ => fallback,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Range::H24 => "24h",
            Range::D7 => "7d",
            Range::D30 => "30d",
        }
    }

    pub fn hours(self) -> u32 {
        match self {
            Range::H24 => 24,
            Range::D7 => 24 * 7,
            Range::D30 => 24 * 30,
        }
    }

    pub(crate) fn bucket(self) -> &'static str {
        match self {
            Range::H24 => "toStartOfFiveMinutes",
            Range::D7 | Range::D30 => "toStartOfHour",
        }
    }

    pub(crate) fn metric_bucket(self) -> &'static str {
        match self {
            Range::H24 => "toStartOfFifteenMinutes",
            Range::D7 => "toStartOfHour",
            Range::D30 => "toStartOfDay",
        }
    }
}
