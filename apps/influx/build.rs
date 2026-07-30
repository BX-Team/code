fn main() {
    println!("cargo:rerun-if-env-changed=BX_GIT_HASH");
    println!("cargo:rerun-if-env-changed=PROFILE");
    println!(
        "cargo:rustc-env=BX_COMP_DATE={}",
        chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
    );
    println!(
        "cargo:rustc-env=BX_PROFILE={}",
        std::env::var("PROFILE").unwrap_or_else(|_| "unknown".into())
    );
}
