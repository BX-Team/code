---
icon: Wrench
title: Using DivineMC API
description: A basic guide to using the DivineMC API.
---

## API

DivineMC have some updates to default Paper API, including API changes from Purpur, so you can use DivineMC API to access some features that are not available in Paper API.

::code-group
```kotlin [build.gradle.kts]
repositories {
    maven {
        url = uri("https://repo.bxteam.org/snapshots")
    }
}

dependencies {
    compileOnly("org.bxteam.divinemc:divinemc-api:26.2.build.+")
}

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(25))
}
```
```xml [pom.xml]
<repository>
    <id>bx-team-snapshots</id>
    <name>BX Team Repository</name>
    <url>https://repo.bxteam.org/snapshots</url>
</repository>

<dependencies>
    <dependency>
        <groupId>org.bxteam.divinemc</groupId>
        <artifactId>divinemc-api</artifactId>
        <version>[26.2.build,)</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```
::

## Dev Bundle

Dev bundle is a tool provided by paperweight, which can easily access Minecraft NMS code during plugin development, See how to setup it and more details in [paperweight-userdev](https://docs.papermc.io/paper/dev/userdev).

To be able to use the dev bundle provided by DivineMC, you need to make following changes to the dependency that provides in the tutorial above.

```kotlin
repositories {
  maven {
    url = uri("https://repo.bxteam.org/snapshots")
  }
}

dependencies {
    paperweight.paperDevBundle("26.2.build.+") // [!code --]
    paperweight.devBundle("org.bxteam.divinemc", "26.2.build.+") // [!code ++]
}
```
