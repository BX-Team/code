---
title: Dependency Management
description: Load and manage Maven dependencies at runtime with Quark.
icon: Package
---

Quark provides comprehensive dependency management with runtime Maven dependency loading and full transitive dependency resolution.

## Basic Dependency Loading

### Simple Loading Methods

```java
// Load single dependency by coordinates
libraryManager.loadDependency("com.google.code.gson", "gson", "2.10.1");

// Load using coordinates string
libraryManager.loadDependency("org.yaml:snakeyaml:2.0");

// Load dependency from coordinates string
Dependency dependency = Dependency.fromCoordinates("com.google.code.gson:gson:2.10.1");
libraryManager.loadDependency(dependency);

// Load multiple dependencies
List<Dependency> dependencies = List.of(
    Dependency.of("com.google.code.gson", "gson", "2.10.1"),
    Dependency.of("org.yaml", "snakeyaml", "2.0")
);
libraryManager.loadDependencies(dependencies);
```

## Advanced Dependency Configuration

### Using the Dependency Builder

```java
Dependency dependency = Dependency.builder()
    .groupId("com.example")
    .artifactId("my-library")
    .version("1.0.0")
    .classifier("sources")                                    // Optional classifier
    .optional(true)                                          // Mark as optional
    .scope("runtime")                                        // Set scope
    .fallbackRepository("https://custom-repo.com/maven/")    // Fallback repository
    .build();

libraryManager.loadDependency(dependency);
```

### Working with Classifiers

```java
// Load main JAR
libraryManager.loadDependency("com.example:library:1.0.0");

// Load sources JAR using coordinates
libraryManager.loadDependency("com.example:library:1.0.0:sources");

// Using builder for classifier
Dependency withSources = Dependency.builder()
    .groupId("com.example")
    .artifactId("library")
    .version("1.0.0")
    .classifier("sources")
    .build();
```

### Dependency Information and Utilities

```java
Dependency dep = Dependency.of("com.example", "library", "1.0.0");

// Get coordinate representations
String coords = dep.getCoordinates();           // "com.example:library:1.0.0"
String groupArtifact = dep.getGroupArtifactId(); // "com.example:library"

// Get file information
String jarFileName = dep.getJarFileName();      // "library-1.0.0.jar"
String pomFileName = dep.getPomFileName();      // "library-1.0.0.pom"

// Get repository paths
String repoPath = dep.getRepositoryPath();      // "com/example/library/1.0.0"

// Create variations
Dependency newVersion = Dependency.builder()
    .groupId(dep.getGroupId())
    .artifactId(dep.getArtifactId())
    .version("2.0.0")
    .build();
```

## Dependency Resolution Configuration

### Control Transitive Dependencies

```java
// Limit transitive dependency depth
libraryManager.maxTransitiveDepth(2);

// Exclude specific group IDs from resolution
libraryManager.excludeGroupIds("javax.servlet", "log4j");

// Exclude specific artifact patterns
libraryManager.excludeArtifacts("*:commons-logging", "org.slf4j:*");

// Skip optional dependencies
libraryManager.skipOptionalDependencies(true);

// Skip test dependencies  
libraryManager.skipTestDependencies(true);

// Include dependency management from POMs
libraryManager.includeDependencyManagement(true);
```

### Advanced Configuration

```java
// Apply optimization defaults for faster downloads
libraryManager.optimizeDependencyDownloads();

// Set log level for debugging
libraryManager.setLogLevel(LogLevel.DEBUG);
```

## Isolated Class Loading

### Creating Named Isolated Class Loaders

```java
// Create named isolated class loader
IsolatedClassLoader isolatedLoader = libraryManager.createNamedIsolatedClassLoader("gson-loader");

// Load dependencies into isolated loader
List<Dependency> gsonDeps = List.of(
    Dependency.of("com.google.code.gson", "gson", "2.10.1")
);
libraryManager.loadDependencies(isolatedLoader, gsonDeps);

// Load class from isolated loader
Class<?> gsonClass = isolatedLoader.loadClass("com.google.gson.Gson");

// Don't forget to close
isolatedLoader.close();
```

### Global Isolated Class Loader

```java
// Use the global isolated class loader
IsolatedClassLoader globalLoader = libraryManager.getGlobalIsolatedClassLoader();

// Load dependencies into global isolated loader
libraryManager.loadDependencies(globalLoader, dependencies);
```

## Checking Loaded Dependencies

### Dependency Status

```java
// Check if dependency is loaded
Dependency gson = Dependency.of("com.google.code.gson", "gson", "2.10.1");
if (libraryManager.isDependencyLoaded(gson)) {
    System.out.println("Gson is loaded!");
}

// Get all loaded dependencies with their paths
Map<Dependency, Path> loaded = libraryManager.getLoadedDependencies();
for (Map.Entry<Dependency, Path> entry : loaded.entrySet()) {
    System.out.println(entry.getKey().getCoordinates() + " -> " + entry.getValue());
}
```

## Gradle Integration

### Loading from Gradle Metadata

```java
// Load dependencies configured via Gradle plugin
libraryManager.loadFromGradle();

// This will automatically load all dependencies and relocations
// configured in your build file with the quark configuration
```

## Error Handling

Handle dependency loading failures:

```java
try {
    libraryManager.loadDependency("com.example:nonexistent:1.0.0");
} catch (LibraryManager.LibraryLoadException e) {
    logger.error("Failed to load dependency: " + e.getMessage());
    // Handle appropriately - maybe load fallback or disable feature
}
```

## Statistics and Monitoring

```java
// Get library manager statistics
LibraryManager.LibraryManagerStats stats = libraryManager.getStats();
System.out.println("Repositories: " + stats.repositoryCount());
System.out.println("Loaded dependencies: " + stats.loadedDependencyCount());
System.out.println("Isolated class loaders: " + stats.isolatedClassLoaderCount());
```
