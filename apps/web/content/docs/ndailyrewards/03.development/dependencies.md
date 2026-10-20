---
icon: Hammer
title: Dependencies
description: Learn how to add NDailyRewards to your project.
---

If you want to use NDailyRewards in your project, you need to add the following dependencies to your project.

Depending on the build system you are using, add the following code to your project:

## Repository

::code-group
```kotlin [Gradle Kotlin]
maven("https://repo.bxteam.org/releases")
```
```groovy [Gradle Groovy]
maven { url "https://repo.bxteam.org/releases" }
```
```xml [Maven]
<repository>
    <id>bx-team-releases</id>
    <url>https://repo.bxteam.org/releases</url>
</repository>
```
::

## Dependency

::code-group
```kotlin [Gradle Kotlin]
dependencies {
    implementation("org.bxteam:ndailyrewards:3.4.0")
}
```
```groovy [Gradle Groovy]
dependencies {
    implementation "org.bxteam:ndailyrewards:3.4.0"
}
```
```xml [Maven]
<dependency>
    <groupId>org.bxteam</groupId>
    <artifactId>ndailyrewards</artifactId>
    <version>3.4.0</version>
    <scope>provided</scope>
</dependency>
```
::

## Next Steps

You can find the documentation for NDailyRewards API in the following sections:

<Cards>
  <Card title="Events" href="/docs/ndailyrewards/development/events">
    Learn how to use NDailyRewards events in your plugin.
  </Card>
</Cards>
