---
title: Repository Configuration
description: Configure Maven repositories for dependency resolution in Quark.
icon: Database
---

Quark supports multiple Maven repositories for dependency resolution, allowing access to libraries from various sources.

## Built-in Repository Methods

### Google Maven Central Mirror (Recommended)

```java
// Add Google Maven Central mirror (recommended for Maven Central access)
libraryManager.addGoogleMavenCentralMirror();
```

**Recommended** for accessing Maven Central artifacts. Complies with Maven Central's Terms of Service and provides fast, reliable access.

### Other Built-in Repositories

```java
// Sonatype OSS repository (for SNAPSHOT versions)
libraryManager.addSonatype();

// JitPack repository (for Git-based projects)
libraryManager.addJitPack();

// Local Maven repository (~/.m2/repository)
libraryManager.addMavenLocal();
```

### Legacy Maven Central (Deprecated)

```java
// ⚠️ DEPRECATED: Use addGoogleMavenCentralMirror() instead
libraryManager.addMavenCentral();
```

::callout{type="warn" title="Warning"}
  Direct use of Maven Central may violate their Terms of Service. Use `addGoogleMavenCentralMirror()` instead.
::

## Custom Repository Configuration

### Adding Custom Repositories

```java
// Add custom repository by URL
libraryManager.addRepository("https://custom-repo.com/maven/");

// Add multiple repositories
libraryManager.addRepository("https://repo1.example.com/maven/");
libraryManager.addRepository("https://repo2.example.com/maven/");
```

### Fallback Repositories

Specify fallback repositories for specific dependencies:

```java
Dependency dependency = Dependency.builder()
    .groupId("com.example")
    .artifactId("my-library")
    .version("1.0.0")
    .fallbackRepository("https://fallback-repo.com/maven/")
    .build();

libraryManager.loadDependency(dependency);
```

This is useful when a dependency might not be available in your primary repositories.

## Repository Management

### Viewing Configured Repositories

```java
// Get all configured repositories
Collection<Repository> repositories = libraryManager.getRepositories();

for (Repository repo : repositories) {
    System.out.println("Repository URL: " + repo.getUrl());
}

// Get repository count from stats
LibraryManager.LibraryManagerStats stats = libraryManager.getStats();
System.out.println("Total repositories configured: " + stats.repositoryCount());
```

### Repository Priority

Repositories are checked in the order they were added:

1. **Local repository** (if added with `addMavenLocal()`)
2. **Primary repositories** (added with `addRepository()` or built-in methods)
3. **Fallback repositories** (specified per-dependency)

## Troubleshooting Repository Issues

### Common Problems

- **404 Not Found**: Dependency doesn't exist in configured repositories
- **Connection timeouts**: Repository server is unreachable
- **Authentication failures**: Private repositories require credentials
