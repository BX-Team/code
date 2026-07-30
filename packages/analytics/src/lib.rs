use clickhouse::Client;

pub mod queries;
pub mod range;
pub mod schema;
pub mod writer;

pub use clickhouse::error::Error;
pub use range::Range;

/// Handle on the analytics store. Cheap to clone — the client pools connections internally.
#[derive(Clone)]
pub struct Analytics {
    client: Client,
    database: String,
}

impl Analytics {
    pub fn new(url: &str, database: &str, user: &str, password: &str) -> Self {
        let client = Client::default()
            .with_url(url)
            .with_user(user)
            .with_password(password)
            .with_database(database);

        Self {
            client,
            database: database.to_owned(),
        }
    }

    pub fn client(&self) -> &Client {
        &self.client
    }

    pub fn database(&self) -> &str {
        &self.database
    }
}
