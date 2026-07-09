---
title: Isolated Class Loaders
description: Use isolated class loaders to prevent dependency conflicts.
icon: Shield
---

Isolated class loaders provide complete dependency isolation, preventing conflicts between different versions of the same library by loading them in separate class loading contexts.

## Why Use Isolated Class Loaders?

Isolated class loaders solve several problems:

- **Version conflicts**: Load different versions of the same library
- **Namespace pollution**: Keep main classpath clean
- **Plugin isolation**: Separate plugin dependencies from each other
- **Runtime flexibility**: Load and unload dependencies as needed

## Creating Isolated Class Loaders

### Named Isolated Class Loaders

```java
// Create a named isolated class loader
IsolatedClassLoader isolatedLoader = libraryManager.createNamedIsolatedClassLoader("my-feature");

// Load dependencies into it
List<Dependency> dependencies = List.of(
    Dependency.of("com.google.code.gson", "gson", "2.10.1"),
    Dependency.of("org.yaml", "snakeyaml", "2.0")
);

libraryManager.loadDependencies(isolatedLoader, dependencies, Collections.emptyList());

// Use classes from the isolated loader
Class<?> gsonClass = isolatedLoader.loadClass("com.google.gson.Gson");
Object gson = gsonClass.getDeclaredConstructor().newInstance();

// Don't forget to close when done
isolatedLoader.close();
```

### Alternative: Named Isolated Class Loaders (Auto-create)

```java
// Load dependencies into a named isolated class loader (auto-created if doesn't exist)
List<Dependency> dependencies = List.of(
    Dependency.of("com.google.code.gson", "gson", "2.10.1")
);

List<Relocation> relocations = Collections.emptyList();

libraryManager.loadDependenciesIsolated("my-feature", dependencies, relocations);

// Retrieve the class loader
IsolatedClassLoader isolatedLoader = libraryManager.getIsolatedClassLoader("my-feature");
Class<?> gsonClass = isolatedLoader.loadClass("com.google.gson.Gson");
```

### Global Isolated Class Loader

```java
// Get the shared global isolated class loader
IsolatedClassLoader globalLoader = libraryManager.getGlobalIsolatedClassLoader();

// Load dependencies into global isolated loader
List<Dependency> dependencies = List.of(
    Dependency.of("org.yaml", "snakeyaml", "2.0")
);

libraryManager.loadDependencies(globalLoader, dependencies, Collections.emptyList());

// Access classes (no need to close global loader)
Class<?> yamlClass = globalLoader.loadClass("org.yaml.snakeyaml.Yaml");
```

## Working with Isolated Classes

### Reflection with Isolated Classes

```java
// Load class from isolated loader
Class<?> gsonClass = isolatedLoader.loadClass("com.google.gson.Gson");

// Create instance
Object gson = gsonClass.getDeclaredConstructor().newInstance();

// Call methods via reflection
Method toJson = gsonClass.getMethod("toJson", Object.class);
String json = (String) toJson.invoke(gson, myObject);

Method fromJson = gsonClass.getMethod("fromJson", String.class, Class.class);
Object obj = fromJson.invoke(gson, json, MyClass.class);
```

### Interface-based Integration

When possible, use interfaces to work with isolated classes:

```java
// Define interface in main classpath
public interface JsonProcessor {
    String toJson(Object obj);
    <T> T fromJson(String json, Class<T> type);
}

// Implementation loaded in isolated class loader
public class GsonJsonProcessor implements JsonProcessor {
    private final Gson gson = new Gson();
    
    @Override
    public String toJson(Object obj) {
        return gson.toJson(obj);
    }
    
    @Override
    public <T> T fromJson(String json, Class<T> type) {
        return gson.fromJson(json, type);
    }
}
```

### Defining Classes at Runtime

```java
// Define a class from bytecode
InputStream classBytes = getClassBytesFromSomewhere();
Class<?> definedClass = isolatedLoader.defineClass("com.example.MyClass", classBytes);

// The InputStream will be automatically closed
Object instance = definedClass.getDeclaredConstructor().newInstance();
```

## Combining with Relocation

### Isolated + Relocated Dependencies

```java
// Create isolated loader
IsolatedClassLoader isolatedLoader = libraryManager.createNamedIsolatedClassLoader("gson-v2");

// Define dependencies
List<Dependency> dependencies = List.of(
    Dependency.of("com.google.code.gson", "gson", "2.10.1")
);

// Define relocations
List<Relocation> relocations = List.of(
    Relocation.of("com.google.gson", "com.myplugin.gson.v2")
);

// Load with both isolation and relocation
libraryManager.loadDependencies(isolatedLoader, dependencies, relocations);

// Use relocated classes in isolated environment
Class<?> gsonClass = isolatedLoader.loadClass("com.myplugin.gson.v2.Gson");
```

## Class Loader Management

### Resource Management

```java
// Use try-with-resources for automatic cleanup
try (IsolatedClassLoader loader = libraryManager.createNamedIsolatedClassLoader("temp")) {
    List<Dependency> deps = List.of(Dependency.of("com.example", "library", "1.0"));
    libraryManager.loadDependencies(loader, deps, Collections.emptyList());
    
    // Use the loader
    Class<?> clazz = loader.loadClass("com.example.MyClass");
    // ... work with class
    
} // Automatically closed here
```

### Managing Multiple Loaders

```java
// Create specialized loaders
IsolatedClassLoader jsonLoader = libraryManager.createNamedIsolatedClassLoader("json-processing");
IsolatedClassLoader xmlLoader = libraryManager.createNamedIsolatedClassLoader("xml-processing");
IsolatedClassLoader dbLoader = libraryManager.createNamedIsolatedClassLoader("database-drivers");

// Load different dependencies into each
libraryManager.loadDependencies(jsonLoader, 
    List.of(Dependency.of("com.google.code.gson", "gson", "2.10.1")),
    Collections.emptyList()
);

libraryManager.loadDependencies(xmlLoader, 
    List.of(Dependency.of("com.fasterxml.jackson.dataformat", "jackson-dataformat-xml", "2.15.2")),
    Collections.emptyList()
);

// Retrieve loaders later by ID
IsolatedClassLoader retrievedLoader = libraryManager.getIsolatedClassLoader("json-processing");

// Clean up when done
jsonLoader.close();
xmlLoader.close();
dbLoader.close();
```

### Checking Class Loader Existence

```java
// Check if a named class loader exists
IsolatedClassLoader loader = libraryManager.getIsolatedClassLoader("my-feature");
if (loader != null) {
    // Loader exists, use it
    Class<?> clazz = loader.loadClass("com.example.MyClass");
}
```

## Loading from Gradle Metadata

### Into Named Isolated Class Loader

```java
// Load Gradle metadata into a named isolated class loader
libraryManager.loadFromGradleIsolated("gradle-deps");

// Retrieve the class loader
IsolatedClassLoader loader = libraryManager.getIsolatedClassLoader("gradle-deps");
```

### Into Specific Isolated Class Loader

```java
// Create an isolated class loader
IsolatedClassLoader isolatedLoader = libraryManager.createNamedIsolatedClassLoader("my-loader");

// Load Gradle metadata into it
libraryManager.loadFromGradle(isolatedLoader);
```

## Statistics and Monitoring

```java
// Get statistics about isolated class loaders
LibraryManager.LibraryManagerStats stats = libraryManager.getStats();
System.out.println("Active isolated class loaders: " + stats.getIsolatedClassLoaderCount());

// This count includes all named isolated class loaders (not the global one)
```

## Best Practices

### When to Use Isolated Class Loaders

- **Different library versions**: When you need multiple versions of the same library
- **Plugin systems**: To isolate plugin dependencies from each other
- **Optional features**: For features that can be enabled/disabled at runtime
- **Temporary operations**: For one-time operations that need specific dependencies

### Resource Management

Always close isolated class loaders when they're no longer needed to prevent memory leaks:

```java
// Manual cleanup
IsolatedClassLoader loader = libraryManager.createNamedIsolatedClassLoader("temp");
try {
    // Use loader
} finally {
    loader.close();
}

// Or use try-with-resources (recommended)
try (IsolatedClassLoader loader = libraryManager.createNamedIsolatedClassLoader("temp")) {
    // Use loader
}
```
