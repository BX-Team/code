use analytics::Analytics;
use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use azimuth::auth::session::hash_token;
use azimuth::{AppState, Config, card, router};
use chrono::{Duration, Utc};
use database::Db;
use database::models::auth;
use http_body_util::BodyExt;
use mail::Mailer;
use serde_json::{Value, json};
use storage::Storage;
use tower::ServiceExt;
use uuid::Uuid;

struct Fixture {
    app: Router,
    db: Db,
    user_id: Uuid,
    admin_id: Uuid,
    token: String,
    admin_token: String,
    email: String,
}

async fn sign_in(db: &Db, user_id: Uuid) -> String {
    let token = Uuid::new_v4().to_string();
    auth::create_session(
        db,
        user_id,
        &hash_token(&token),
        Utc::now() + Duration::days(7),
        None,
        None,
    )
    .await
    .expect("session");
    token
}

async fn fixture() -> Option<Fixture> {
    let database_url = std::env::var("DATABASE_URL").ok()?;

    let db = database::connect(&database_url, 4).expect("connect");
    database::migrate(&db).await.expect("migrate");

    let suffix = Uuid::new_v4().simple().to_string();
    let email = format!("owner-{suffix}@example.com");
    let user = auth::create_user(&db, "Owner", &email, true, None)
        .await
        .expect("user");
    let admin = auth::create_user(
        &db,
        "Admin",
        &format!("admin-{suffix}@example.com"),
        true,
        None,
    )
    .await
    .expect("admin");
    sqlx::query("UPDATE auth.users SET role = 'admin' WHERE id = $1")
        .bind(admin.id)
        .execute(&db)
        .await
        .unwrap();

    let config = Config {
        bind: "127.0.0.1:0".parse().unwrap(),
        database_url,
        clickhouse_url: "http://127.0.0.1:8123".into(),
        clickhouse_database: "bx_team".into(),
        clickhouse_user: "default".into(),
        clickhouse_password: String::new(),
        app_url: "https://bxteam.org".into(),
        api_public_url: "https://api.bxteam.org".into(),
        trusted_origins: vec!["https://bxteam.org".into()],
        api_secret_key: "test-secret".into(),
        cookie_domain: ".bxteam.org".into(),
        // Nothing listens here: tests that would send mail assert on the failure instead.
        smtp_url: "smtp://127.0.0.1:1".into(),
        email_from: "BX Team <no-reply@bxteam.org>".into(),
        github_client_id: "gh-id".into(),
        github_client_secret: "gh-secret".into(),
        discord_client_id: String::new(),
        discord_client_secret: String::new(),
        storage: storage::Config {
            endpoint: "http://127.0.0.1:1".into(),
            access_key_id: "x".into(),
            secret_access_key: "x".into(),
            builds_bucket: "builds".into(),
            error_payloads_bucket: "error-payloads".into(),
            public_url: "https://files.bxteam.org".into(),
        },
        max_upload_bytes: 1024,
    };

    let analytics = Analytics::new(&config.clickhouse_url, "bx_team", "default", "");
    let storage = Storage::new(&config.storage);
    let mailer = Mailer::new(&config.smtp_url, &config.email_from).expect("mailer");

    Some(Fixture {
        app: router(AppState::new(
            db.clone(),
            analytics,
            storage,
            mailer,
            card(),
            config,
        )),
        token: sign_in(&db, user.id).await,
        admin_token: sign_in(&db, admin.id).await,
        db,
        user_id: user.id,
        admin_id: admin.id,
        email,
    })
}

fn request(method: &str, path: &str, token: Option<&str>, body: Option<Value>) -> Request<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(path)
        .header(header::CONTENT_TYPE, "application/json");

    if let Some(token) = token {
        builder = builder.header(header::COOKIE, format!("bx_session={token}"));
    }

    match body {
        Some(body) => builder.body(Body::from(body.to_string())).unwrap(),
        None => builder.body(Body::empty()).unwrap(),
    }
}

async fn call(app: &Router, request: Request<Body>) -> (StatusCode, Value, Vec<String>) {
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let cookies = response
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().to_owned())
        .collect();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let body = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).unwrap_or(Value::Null)
    };
    (status, body, cookies)
}

async fn redirect_of(
    app: &Router,
    request: Request<Body>,
) -> (StatusCode, Option<String>, Vec<String>) {
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let location = response
        .headers()
        .get(header::LOCATION)
        .map(|value| value.to_str().unwrap().to_owned());
    let cookies = response
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().to_owned())
        .collect();
    (status, location, cookies)
}

#[tokio::test]
async fn the_session_endpoint_answers_for_signed_out_visitors_too() {
    let Some(fixture) = fixture().await else {
        eprintln!("DATABASE_URL not set, skipping");
        return;
    };

    let (status, body, _) = call(&fixture.app, request("GET", "/auth/session", None, None)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, Value::Null);

    let (status, body, _) = call(
        &fixture.app,
        request("GET", "/auth/session", Some(&fixture.token), None),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["user"]["email"], fixture.email);
    assert_eq!(body["user"]["role"], Value::Null);
}

#[tokio::test]
async fn me_is_unauthorized_without_a_session() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _, _) = call(&fixture.app, request("GET", "/auth/me", None, None)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    let (status, body, _) = call(
        &fixture.app,
        request("GET", "/auth/me", Some(&fixture.token), None),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["user"]["id"], fixture.user_id.to_string());
}

#[tokio::test]
async fn a_magic_link_signs_in_once_and_only_once() {
    let Some(fixture) = fixture().await else {
        return;
    };

    // The mail relay is unreachable in tests, so the token is taken from the row it wrote.
    let token = azimuth::routes::auth::random_token().unwrap();
    auth::create_verification(
        &fixture.db,
        &format!("{}\u{1f}https://bxteam.org/dashboard", fixture.email),
        &hash_token(&token),
        Utc::now() + Duration::minutes(15),
    )
    .await
    .unwrap();

    let (status, location, cookies) = redirect_of(
        &fixture.app,
        request(
            "GET",
            &format!("/auth/magic-link/verify?token={token}"),
            None,
            None,
        ),
    )
    .await;

    assert!(status.is_redirection(), "{status}");
    assert_eq!(location.as_deref(), Some("https://bxteam.org/dashboard"));

    let cookie = cookies.first().expect("a session cookie");
    assert!(cookie.contains("HttpOnly"));
    assert!(cookie.contains("Secure"));
    assert!(cookie.contains("Domain=.bxteam.org"));

    let session_token = cookie
        .strip_prefix("bx_session=")
        .and_then(|rest| rest.split(';').next())
        .unwrap();
    let (status, body, _) = call(
        &fixture.app,
        request("GET", "/auth/me", Some(session_token), None),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["user"]["email"], fixture.email);

    let (status, _, _) = call(
        &fixture.app,
        request(
            "GET",
            &format!("/auth/magic-link/verify?token={token}"),
            None,
            None,
        ),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::UNAUTHORIZED,
        "a link must not work twice"
    );
}

#[tokio::test]
async fn an_expired_magic_link_is_refused() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let token = azimuth::routes::auth::random_token().unwrap();
    auth::create_verification(
        &fixture.db,
        &format!("{}\u{1f}https://bxteam.org/dashboard", fixture.email),
        &hash_token(&token),
        Utc::now() - Duration::minutes(1),
    )
    .await
    .unwrap();

    let (status, _, _) = call(
        &fixture.app,
        request(
            "GET",
            &format!("/auth/magic-link/verify?token={token}"),
            None,
            None,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn a_first_sign_in_creates_the_account() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let email = format!("newcomer-{}@example.com", Uuid::new_v4().simple());
    let token = azimuth::routes::auth::random_token().unwrap();
    auth::create_verification(
        &fixture.db,
        &format!("{email}\u{1f}https://bxteam.org/dashboard"),
        &hash_token(&token),
        Utc::now() + Duration::minutes(15),
    )
    .await
    .unwrap();

    let (status, _, _) = redirect_of(
        &fixture.app,
        request(
            "GET",
            &format!("/auth/magic-link/verify?token={token}"),
            None,
            None,
        ),
    )
    .await;
    assert!(status.is_redirection());

    let created = auth::user_by_email(&fixture.db, &email).await.unwrap();
    assert!(
        created.is_some(),
        "clicking the link should have created the account"
    );
    assert!(created.unwrap().email_verified);
}

#[tokio::test]
async fn a_malformed_address_never_reaches_the_mail_relay() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _, _) = call(
        &fixture.app,
        request(
            "POST",
            "/auth/sign-in/magic-link",
            None,
            Some(json!({ "email": "not-an-email" })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn an_undeliverable_email_is_reported_rather_than_swallowed() {
    let Some(fixture) = fixture().await else {
        return;
    };

    // Deliverability is availability of sign-in, so a relay failure must not look like success.
    let (status, _, _) = call(
        &fixture.app,
        request(
            "POST",
            "/auth/sign-in/magic-link",
            None,
            Some(json!({ "email": "someone@example.com" })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
}

#[tokio::test]
async fn oauth_starts_at_the_provider_with_a_one_time_state() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, location, _) = redirect_of(
        &fixture.app,
        request(
            "GET",
            "/auth/sign-in/github?callbackURL=/dashboard",
            None,
            None,
        ),
    )
    .await;

    assert!(status.is_redirection());
    let location = location.expect("a redirect to GitHub");
    assert!(location.starts_with("https://github.com/login/oauth/authorize?"));
    assert!(location.contains("client_id=gh-id"));
    assert!(
        location.contains("redirect_uri=https%3A%2F%2Fapi.bxteam.org%2Fauth%2Fcallback%2Fgithub")
    );

    let state = location
        .split("state=")
        .nth(1)
        .and_then(|rest| rest.split('&').next())
        .expect("state");

    let identifier = auth::consume_verification(&fixture.db, &hash_token(state))
        .await
        .unwrap()
        .expect("the state should be stored");
    assert_eq!(identifier, "github\u{1f}https://bxteam.org/dashboard");

    assert!(
        auth::consume_verification(&fixture.db, &hash_token(state))
            .await
            .unwrap()
            .is_none(),
        "the state must be single use"
    );
}

#[tokio::test]
async fn an_unconfigured_or_unknown_provider_is_refused() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _, _) = call(
        &fixture.app,
        request("GET", "/auth/sign-in/google", None, None),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    let (status, _, _) = call(
        &fixture.app,
        request("GET", "/auth/sign-in/discord", None, None),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn a_forged_oauth_callback_finds_no_state_to_consume() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _, _) = call(
        &fixture.app,
        request(
            "GET",
            "/auth/callback/github?code=abc&state=forged",
            None,
            None,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn a_state_issued_for_one_provider_cannot_be_used_at_another() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let state = azimuth::routes::auth::random_token().unwrap();
    auth::create_verification(
        &fixture.db,
        "discord\u{1f}https://bxteam.org/dashboard",
        &hash_token(&state),
        Utc::now() + Duration::minutes(10),
    )
    .await
    .unwrap();

    let (status, _, _) = call(
        &fixture.app,
        request(
            "GET",
            &format!("/auth/callback/github?code=abc&state={state}"),
            None,
            None,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn signing_out_drops_the_session_and_the_cookie() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _, cookies) = call(
        &fixture.app,
        request("POST", "/auth/sign-out", Some(&fixture.token), None),
    )
    .await;

    assert_eq!(status, StatusCode::NO_CONTENT);
    assert!(cookies[0].contains("Max-Age=0"), "{cookies:?}");

    let (status, _, _) = call(
        &fixture.app,
        request("GET", "/auth/me", Some(&fixture.token), None),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn renaming_yourself_is_validated() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, body, _) = call(
        &fixture.app,
        request(
            "POST",
            "/auth/update-user",
            Some(&fixture.token),
            Some(json!({ "name": "  New Name  " })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["user"]["name"], "New Name");

    let (status, _, _) = call(
        &fixture.app,
        request(
            "POST",
            "/auth/update-user",
            Some(&fixture.token),
            Some(json!({ "name": "   " })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn deleting_an_account_takes_its_projects_with_it() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let suffix = Uuid::new_v4().simple().to_string();
    database::models::pulsify::create_project(
        &fixture.db,
        fixture.user_id,
        &format!("Server {suffix}"),
        &format!("server-{suffix}"),
        "server",
        None,
    )
    .await
    .unwrap();

    let (status, _, cookies) = call(
        &fixture.app,
        request("POST", "/auth/delete-user", Some(&fixture.token), None),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    assert!(cookies[0].contains("Max-Age=0"));

    assert!(
        auth::user(&fixture.db, fixture.user_id)
            .await
            .unwrap()
            .is_none()
    );
    // A real foreign key does the cascade now, not an afterDelete hook.
    assert!(
        database::models::pulsify::projects_of(&fixture.db, fixture.user_id)
            .await
            .unwrap()
            .is_empty()
    );
}

#[tokio::test]
async fn the_admin_list_paginates_searches_and_filters() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _, _) = call(
        &fixture.app,
        request("GET", "/auth/admin/users", Some(&fixture.token), None),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::FORBIDDEN,
        "a plain user must not list accounts"
    );

    let (status, body, _) = call(
        &fixture.app,
        request(
            "GET",
            &format!("/auth/admin/users?limit=10&searchValue={}", fixture.email),
            Some(&fixture.admin_token),
            None,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["total"], 1);
    assert_eq!(body["users"][0]["email"], fixture.email);

    let (_, body, _) = call(
        &fixture.app,
        request(
            "GET",
            "/auth/admin/users?filterValue=true",
            Some(&fixture.admin_token),
            None,
        ),
    )
    .await;
    let banned = body["users"].as_array().unwrap();
    assert!(banned.iter().all(|user| user["banned"] == true));
}

#[tokio::test]
async fn banning_ends_access_and_unbanning_restores_it() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _, _) = call(
        &fixture.app,
        request(
            "POST",
            &format!("/auth/admin/users/{}/ban", fixture.user_id),
            Some(&fixture.admin_token),
            Some(json!({ "banReason": "spam" })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    let (status, body, _) = call(
        &fixture.app,
        request("GET", "/auth/me", Some(&fixture.token), None),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(body["message"], "spam");

    let (status, _, _) = call(
        &fixture.app,
        request(
            "POST",
            &format!("/auth/admin/users/{}/unban", fixture.user_id),
            Some(&fixture.admin_token),
            None,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    let (status, _, _) = call(
        &fixture.app,
        request("GET", "/auth/me", Some(&fixture.token), None),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn an_admin_cannot_lock_themselves_out() {
    let Some(fixture) = fixture().await else {
        return;
    };

    for path in ["ban", "unban"] {
        let (status, _, _) = call(
            &fixture.app,
            request(
                "POST",
                &format!("/auth/admin/users/{}/{path}", fixture.admin_id),
                Some(&fixture.admin_token),
                Some(json!({})),
            ),
        )
        .await;

        if path == "ban" {
            assert_eq!(status, StatusCode::BAD_REQUEST);
        }
    }

    let (status, _, _) = call(
        &fixture.app,
        request(
            "DELETE",
            &format!("/auth/admin/users/{}", fixture.admin_id),
            Some(&fixture.admin_token),
            None,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn an_admin_can_remove_an_account() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _, _) = call(
        &fixture.app,
        request(
            "DELETE",
            &format!("/auth/admin/users/{}", fixture.user_id),
            Some(&fixture.admin_token),
            None,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    assert!(
        auth::user(&fixture.db, fixture.user_id)
            .await
            .unwrap()
            .is_none()
    );
}

#[tokio::test]
async fn an_expired_session_no_longer_resolves() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let token = Uuid::new_v4().to_string();
    auth::create_session(
        &fixture.db,
        fixture.user_id,
        &hash_token(&token),
        Utc::now() - Duration::hours(1),
        None,
        None,
    )
    .await
    .unwrap();

    let (status, _, _) = call(&fixture.app, request("GET", "/auth/me", Some(&token), None)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn admin_mail_is_validated_before_it_reaches_the_relay() {
    let Some(fixture) = fixture().await else {
        return;
    };

    for body in [
        json!({ "template": "plain", "subject": "  ", "body": "hello" }),
        json!({ "template": "plain", "subject": "Hello", "body": "" }),
        json!({
            "template": "announcement",
            "subject": "Hello",
            "body": "hello",
            "actionLabel": "Open",
            "actionUrl": "javascript:alert(1)"
        }),
    ] {
        let (status, _, _) = call(
            &fixture.app,
            request(
                "POST",
                &format!("/auth/admin/users/{}/mail", fixture.user_id),
                Some(&fixture.admin_token),
                Some(body.clone()),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{body} was accepted");
    }

    let (status, _, _) = call(
        &fixture.app,
        request(
            "POST",
            &format!("/auth/admin/users/{}/mail", Uuid::new_v4()),
            Some(&fixture.admin_token),
            Some(json!({ "template": "plain", "subject": "Hello", "body": "hello" })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    let (status, _, _) = call(
        &fixture.app,
        request(
            "POST",
            &format!("/auth/admin/users/{}/mail", fixture.user_id),
            Some(&fixture.token),
            Some(json!({ "template": "plain", "subject": "Hello", "body": "hello" })),
        ),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::FORBIDDEN,
        "a plain user must not send mail"
    );
}
