---
title: Package Relocation
description: Use package relocation to avoid namespace conflicts between libraries.
icon: GitBranch
---

Package relocation renames packages in library JARs to prevent namespace conflicts, especially important in plugin environments where multiple plugins might bundle different versions of the same library.

## Why Package Relocation?

When multiple plugins use the same library, conflicts can occur if they're loaded into the same classpath:

- **Problem**: Plugin A loads Gson 2.8.9, Plugin B loads Gson 2.10.1 → version conflicts
- **Solution**: Plugin A uses `com.google.gson`, Plugin B uses `com.pluginb.libs.gson`

## Creating Relocations

### Simple Relocation

```java
// Create a simple relocation rule
Relocation relocation = Relocation.of("com.google.gson", "com.myplugin.libs.gson");

// Check if relocation would actually change anything
if (relocation.isEffective()) {
    System.out.println("Relocation: " + relocation.getDescription());
}
```

### Using the Builder Pattern

```java
Relocation relocation = Relocation.builder()
    .from("com.google.gson")
    .to("com.myplugin.libs.gson")
    .build();

// Get human-readable description
String description = relocation.getDescription(); // "com.google.gson -> com.myplugin.libs.gson"
```

## Loading Dependencies with Relocation

### Basic Relocation Loading

```java
// Create dependencies and relocations
List<Dependency> dependencies = List.of(
    Dependency.of("com.google.code.gson", "gson", "2.10.1")
);

List<Relocation> relocations = List.of(
    Relocation.of("com.google.gson", "com.myplugin.libs.gson")
);

// Load with relocation applied to main classpath
libraryManager.loadDependencies(dependencies, relocations);
```

### Multiple Package Relocation

```java
// Relocate multiple related packages
List<Relocation> relocations = List.of(
    Relocation.of("com.google.gson", "com.myplugin.libs.gson"),
    Relocation.of("com.google.gson.reflect", "com.myplugin.libs.gson.reflect"),
    Relocation.of("com.google.gson.stream", "com.myplugin.libs.gson.stream")
);

libraryManager.loadDependencies(dependencies, relocations);
```

### Isolated Class Loaders with Relocation

```java
// Create isolated class loader
IsolatedClassLoader isolatedLoader = libraryManager.createNamedIsolatedClassLoader("gson-loader");

List<Dependency> gsonDeps = List.of(
    Dependency.of("com.google.code.gson", "gson", "2.10.1")
);

List<Relocation> gsonRelocations = List.of(
    Relocation.of("com.google.gson", "com.myplugin.libs.gson")
);

// Load into isolated class loader with relocation
libraryManager.loadDependencies(isolatedLoader, gsonDeps, gsonRelocations);

// Use the relocated classes
Class<?> gsonClass = isolatedLoader.loadClass("com.myplugin.libs.gson.Gson");
```

## Working with Relocated Classes

### Loading Relocated Classes

```java
// After relocation, use the new package name
try {
    // Original: com.google.gson.Gson
    // Relocated: com.myplugin.libs.gson.Gson
    Class<?> gsonClass = Class.forName("com.myplugin.libs.gson.Gson");
    Object gson = gsonClass.getDeclaredConstructor().newInstance();
    
    // Use reflection to work with relocated classes
    Method toJson = gsonClass.getMethod("toJson", Object.class);
    String json = (String) toJson.invoke(gson, myObject);
} catch (Exception e) {
    logger.error("Failed to use relocated Gson", e);
}
```

## Relocation Implementation Details

### Automatic Caching

Quark automatically caches relocated JARs to avoid repeated processing:

```java
// First call - JAR is relocated and cached
libraryManager.loadDependencies(dependencies, relocations);

// Second call - Uses cached relocated JAR (much faster)
libraryManager.loadDependencies(dependencies, relocations);
```

### Relocation Dependencies

Relocation requires additional dependencies that are loaded automatically:

- **ASM 9.7**: For bytecode manipulation
- **jar-relocator 1.7**: For performing the actual relocation

These are loaded into an isolated class loader to avoid conflicts.

## Best Practices

### Naming Conventions

```java
// Good: Use your plugin/organization namespace
Relocation.of("com.google.gson", "com.myplugin.libs.gson");
Relocation.of("org.yaml", "com.myplugin.libs.yaml");

// Good: Version-specific names for multiple versions
Relocation.of("com.google.gson", "com.myplugin.libs.gson.v2_10");

// Avoid: Generic suffixes that might conflict
// Relocation.of("com.google.gson", "com.google.gson.relocated");
```

### Performance Considerations

```java
// Reuse relocations for multiple dependency loads
List<Relocation> commonRelocations = List.of(
    Relocation.of("com.google.gson", "com.myplugin.libs.gson")
);

// Apply to multiple dependency sets
libraryManager.loadDependencies(configDeps, commonRelocations);
libraryManager.loadDependencies(utilityDeps, commonRelocations);
```

## Troubleshooting

### Common Issues

- **ClassNotFoundException**: Ensure you're using the correct relocated package name
- **NoSuchMethodError**: Relocated classes might have different method signatures
- **Serialization issues**: Relocated classes might not be compatible with existing serialized data
- **Reflection errors**: Update reflection code to use relocated class names

### Debug Relocation

```java
// Enable debug logging to see relocation process
libraryManager.setLogLevel(LogLevel.DEBUG);

// Check what dependencies were loaded and where
Map<Dependency, Path> loaded = libraryManager.getLoadedDependencies();
for (Map.Entry<Dependency, Path> entry : loaded.entrySet()) {
    Path jarPath = entry.getValue();
    if (jarPath.toString().contains("relocated")) {
        System.out.println("Relocated JAR: " + entry.getKey().getCoordinates() + " -> " + jarPath);
    }
}

// Verify relocation effectiveness
Relocation relocation = Relocation.of("com.google.gson", "com.myplugin.libs.gson");
if (relocation.isEffective()) {
    System.out.println("Relocation is effective: " + relocation.getDescription());
} else {
    System.out.println("Relocation would have no effect");
}
```

### Error Handling

```java
try {
    libraryManager.loadDependencies(dependencies, relocations);
} catch (RelocationHandler.RelocationException e) {
    logger.error("Relocation failed: " + e.getMessage(), e);
    // Fallback: load without relocation
    libraryManager.loadDependencies(dependencies);
}
```
