---
title: Privacy Policy
description: How BX Team collects, uses, and protects your information when you use our website, BX ID, and Pulsify.
lastUpdated: May 3, 2026
---

## 1. Introduction

This Privacy Policy explains how **BX Team** ("we", "us", "our") collects, uses, and protects information when you use our website, the **BX ID** authentication system, and the **Pulsify** observability platform (collectively, the "Services").

BX Team is an informal open-source community that develops and maintains Minecraft server software and related developer tools. We are not a registered legal entity. Despite this, we take privacy seriously and aim to comply with the **EU General Data Protection Regulation (GDPR)**, the **UK GDPR**, and applicable privacy laws worldwide.

If you have any questions about this policy, contact us at **gdpr@bxteam.org** (privacy and data subject requests) or **support@bxteam.org** (general inquiries).

## 2. Who is the data controller?

For the purposes of GDPR Article 4(7), **BX Team acts as the data controller** for:

- BX ID accounts (authentication, profile data)
- Pulsify dashboard accounts and project metadata
- Website analytics (we currently do not collect any)

For data submitted **through the Pulsify SDK installed on a Minecraft server**, the **server operator** (the person or organization who installs Pulsify on their Minecraft server) acts as the **data controller**, and BX Team acts as the **data processor** under GDPR Article 28. Server operators are responsible for informing their players about data collection and obtaining any required consent.

If you are a player on a Minecraft server using Pulsify, please contact the server operator regarding data about you. We will assist server operators in fulfilling data subject requests.

## 3. What data we collect

### 3.1 BX ID account data

When you sign up or log in via BX ID, we collect:

- **Name** (display name from your provider or chosen by you)
- **Email address**
- **Profile image URL** (when signing in via Discord or GitHub)
- **OAuth provider identifier** (Discord ID or GitHub ID, used to link sessions)
- **IP address** of your active sessions
- **User agent** (browser and operating system) of your active sessions
- **Session tokens** (stored as session cookies in your browser)

We support three sign-in methods:

- **Discord OAuth** — Discord shares the data above per their privacy policy.
- **GitHub OAuth** — GitHub shares the data above per their privacy policy.
- **Magic link** — We send a one-time login link to your email address.

### 3.2 Pulsify dashboard data

When you use the Pulsify dashboard, we store:

- Projects you create (project name, type, description, settings)
- DSN keys generated for your projects
- Configuration data you submit (alerts, integrations, custom metric definitions)

### 3.3 Pulsify SDK data (server telemetry)

The Pulsify Java SDK transmits the following data from a Minecraft server to our servers, only when a server operator installs and configures it:

**Server heartbeat:**

- Online player count, max player count
- Server performance metrics (TPS, MSPT, memory usage)
- Minecraft version and server software (e.g., Paper, Spigot)
- Installed plugins (name, version, enabled state)

**Player events (join/quit):**

- Player UUID (the Minecraft account identifier)
- Client version
- A **hashed** representation of the player's IP address, used solely to derive a country code. **Raw IP addresses are never transmitted to or stored by us.** The IP hash is processed in transit, converted to a two-letter country code, and the hash itself is not retained.

**Error and stability data:**

- Stack traces and exception messages from the server and plugins
- Plugin and software version context

**Custom metrics:**

- Numeric or string metrics that the server operator or plugin author chooses to send

The SDK is **open source**. Server operators can inspect, audit, or fork it. Self-hosted or forked versions of the SDK that do not transmit data to our servers are not subject to this policy.

### 3.4 Email communications

When you contact us at gdpr@bxteam.org or support@bxteam.org, we receive and store the contents of your email and your email address. Email is delivered via Apple's iCloud Mail infrastructure (see Section 7).

## 4. Why we collect data and our legal basis

| Purpose | Legal basis (GDPR Art. 6) |
|---|---|
| Creating and operating your BX ID account | Contract (Art. 6(1)(b)) |
| Authenticating you and securing your sessions | Contract; legitimate interest in security (Art. 6(1)(f)) |
| Operating the Pulsify dashboard for you | Contract (Art. 6(1)(b)) |
| Processing telemetry on behalf of server operators | Processor relationship (Art. 28) — legal basis is the controller's responsibility |
| Aggregated, non-identifying product analytics | Legitimate interest (Art. 6(1)(f)) |
| Responding to support and legal requests | Legal obligation (Art. 6(1)(c)); legitimate interest |

We do **not** sell your data, use it for advertising, or share it with third parties for marketing.

## 5. Cookies

We use **only essential session cookies** required for authentication. We do not use analytics, advertising, or tracking cookies.

| Cookie | Purpose | Duration |
|---|---|---|
| Session cookie | Keeps you signed in | Until logout or expiration |

Because we use only strictly necessary cookies, we do not display a cookie consent banner under ePrivacy Directive Article 5(3).

## 6. Data retention

- **BX ID account data** is retained for as long as your account exists. You can delete your account from the dashboard at any time.
- **Pulsify project data and telemetry** is retained for as long as the project exists in your dashboard. Deleting a project deletes all associated telemetry. There is no automatic time-based expiration.
- **Email correspondence** is retained for up to 24 months after the issue is resolved, unless required for legal reasons.
- **Backups** may retain deleted data for up to 30 days before being overwritten.

If you wish to have all data associated with you deleted earlier, contact gdpr@bxteam.org.

## 7. Where we store data and sub-processors

All primary data is stored on **servers physically located in Sweden (European Union)**. Because storage is within the EU/EEA, no international transfer mechanisms (such as Standard Contractual Clauses) are required for EU/EEA data subjects.

We rely on the following sub-processors:

| Sub-processor | Purpose | Location |
|---|---|---|
| Our Swedish hosting provider | Database, application hosting | Sweden (EU) |
| Apple Inc. (iCloud Mail) | Outgoing email delivery (magic links, support replies) | United States |
| Discord Inc. | OAuth login (only if you choose Discord sign-in) | United States |
| GitHub, Inc. | OAuth login (only if you choose GitHub sign-in) | United States |

For transfers to the United States (Apple, Discord, GitHub), we rely on the **EU-U.S. Data Privacy Framework** and/or **Standard Contractual Clauses** as adopted by those providers.

## 8. Your rights under GDPR

If you are located in the European Economic Area, the United Kingdom, or another jurisdiction with similar laws, you have the following rights:

- **Right of access** (Art. 15) — request a copy of your data
- **Right to rectification** (Art. 16) — correct inaccurate data
- **Right to erasure** (Art. 17) — request deletion ("right to be forgotten")
- **Right to restriction** (Art. 18) — limit how we process your data
- **Right to data portability** (Art. 20) — receive your data in a machine-readable format
- **Right to object** (Art. 21) — object to processing based on legitimate interest
- **Right to withdraw consent** (Art. 7(3)) — where processing is based on consent
- **Right to lodge a complaint** with a supervisory authority (Art. 77)

To exercise any of these rights, email **gdpr@bxteam.org**. We will respond within **30 days** as required by GDPR Article 12(3). We may ask you to verify your identity before fulfilling certain requests.

You can also exercise most of these rights directly from your dashboard (export data, delete projects, delete your account).

### 8.1 EU representative

We do not currently designate an EU representative under GDPR Article 27. EU/EEA data subjects may contact us directly at gdpr@bxteam.org for any matter relating to the processing of their personal data.

## 9. Players on Minecraft servers using Pulsify

If you play on a Minecraft server that uses Pulsify, the **server operator** is the data controller for telemetry collected from that server. To exercise your rights regarding that data:

1. Contact the server operator first. They control the project in our dashboard and can delete data about you directly.
2. If the server operator is unresponsive, you may contact us at gdpr@bxteam.org. We will assist within the bounds of our processor role.

We do not maintain a central registry mapping player UUIDs to real-world identities. Player UUIDs are pseudonymous identifiers issued by Mojang/Microsoft.

## 10. Children's privacy

Our Services are not directed at children. You must be at least:

- **16 years old** if you reside in the European Economic Area or the United Kingdom (per GDPR Article 8)
- **13 years old** in all other jurisdictions

By using the Services, you confirm that you meet the applicable minimum age. We do not knowingly collect data from children below the applicable age. If you believe a child has provided us with personal data, contact gdpr@bxteam.org and we will delete it.

We do not perform active age verification. Server operators using Pulsify are responsible for the data of players on their servers, including any minors.

## 11. Security

We implement reasonable technical and organizational measures to protect your data, including:

- TLS encryption for all data in transit
- Access controls and authentication for our infrastructure
- Hashing of player IP addresses on the SDK side before transmission
- Regular software updates and security patches

No system is perfectly secure. If we become aware of a personal data breach affecting you, we will notify you and the relevant supervisory authority as required by GDPR Articles 33–34.

## 12. Automated decision-making

We do not use your personal data for automated decision-making or profiling that produces legal or similarly significant effects under GDPR Article 22.

## 13. Changes to this policy

We may update this Privacy Policy from time to time. Material changes will be announced on our website and, where appropriate, by email. The "Last updated" date at the top reflects the most recent revision. Continued use of the Services after changes take effect constitutes acceptance of the updated policy.

## 14. Contact

- **Privacy and data protection:** gdpr@bxteam.org
- **General support:** support@bxteam.org
- **Website:** https://bxteam.org

Because we operate as a distributed open-source community without a central physical office, all correspondence should be made via email. We aim to respond within 30 days.
