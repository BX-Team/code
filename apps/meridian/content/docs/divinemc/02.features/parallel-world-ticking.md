---
icon: Repeat
title: Parallel World Ticking
description: More info about a parallel world ticking system.
---

::callout{type="info"}
  This feature was originally took from [SparklyPaper](https://github.com/SparklyPower/SparklyPaper), all credits go to them for the original implementation.
::

## About Parallel World Ticking

DivineMC implements Parallel World Ticking as an alternative to the traditional sequential (Vanilla) approach. In sequential ticking, worlds are processed one after the other. In contrast, Parallel World Ticking executes each world’s tick in a separate thread while ensuring that all worlds complete their tick before the next cycle begins. This method is beneficial when players are distributed across multiple worlds, as it balances the processing load more effectively.

### Ticking Methods Comparison

There are several approaches to handling concurrent world ticking:

- **Sequential World Ticking (Vanilla):** Worlds are ticked one after the other.
- **Parallel World Ticking:** Worlds are ticked concurrently, with each tick cycle waiting for all worlds to complete.
- **Asynchronous World Ticking:** Worlds are ticked asynchronously, each running at its own tick rate.
- **Asynchronous Region Ticking:** Worlds are divided into regions that are ticked asynchronously (this is implemented by [Folia](https://github.com/PaperMC/Folia)).
- **Truly Independent Servers:** Each world operates on a separate server instance, completely isolating them.

DivineMC uses Parallel World Ticking as a balanced solution between the simplicity of sequential ticking and the complexities of fully asynchronous or multi-server setups.

### Implementation Details

DivineMC transitions from the traditional sequential approach by allocating a dedicated tick thread for each world. 
This design allows multiple worlds to be processed simultaneously while ensuring that the tick cycle only advances when every world has finished processing. 
As a result, the overall ticks per second (TPS) are determined by the world with the highest processing demand.

A multi-server approach (one server per world) was considered; however, the complexities involved—such as inventory synchronization, cross-server player queries, and command handling—led to the adoption of Parallel World Ticking within a single server instance.

### Threading and Synchronization

To maintain data integrity, only the tick thread associated with a specific world is permitted to modify that world’s data. 
Any attempts to modify another world from an incorrect thread will result in an error. 
Plugin developers must ensure that any cross-world interactions are scheduled to run on the appropriate main thread.

Disabling off-main-thread exceptions is possible using the configuration setting `settings.parallel-world-ticking.disable-hard-throw` in `divinemc.yml`. 
However, this is not recommended because bypassing these checks may lead to data corruption. 
Addressing thread synchronization issues directly is the preferred approach.

### Compatibility and Limitations

Parallel World Ticking is designed to work with most plugins, as events are generally processed within the world in which they are triggered. 
However, certain operations—particularly those involving cross-world interactions (for example, teleporting players or entities between worlds during a server-level tick)—may encounter issues. 
Such operations should be scheduled to run on the correct thread to avoid conflicts.

If you want to make all your plugins compatible with Parallel World Ticking, you can set `settings.parallel-world-ticking.compatability-mode` to `true` in `divinemc.yml` to make the server run all tasks synchronously, instead of asynchronously.
But be aware, with that option enabled, the server will lag more than usual, and the performance will be drastically reduced.

### Rationale for the Approach

Integrating Parallel World Ticking directly into the base server software would require extensive modifications that might lead to compatibility issues with existing plugins and server configurations. 
DivineMC offers this experimental feature as a managed solution, enabling improved performance in multi-world setups without the complexity of a multi-server architecture.

For further technical details and implementation rationale, please refer to the [Notes](#notes) below.

## Notes

### Opening an Inventory After a World Switch

When an event teleports a player and also opens a BlockEntity inventory, the server may lock up while waiting for chunks from another world. For example, consider the following Java code:

```java
@EventHandler
public void onInteract(PlayerInteractEvent event) {
    event.getPlayer().teleport(new Location(Bukkit.getWorld("..."), 0.0, 0.0, 0.0));
}
```

In this scenario, if a player right-clicks on a chest, the player is teleported and then the chest inventory is opened, which can lead to a server lock-up. This issue occurs because the teleportation is executed before the inventory is opened; the inventory opens only after the player has been teleported.

In a standard Paper server, this is not a critical issue since the inventory is closed when the player is ticked in the new world (due to failing the `stillValid` check). However, in a parallel ticking environment, the `stillValid` check and plugins listening for `InventoryCloseEvent` may load chunks from another world on a different ServerLevel tick thread. This results in a deadlock, as chunk loading from other worlds is not permitted in this context.

To mitigate this issue:
- The `openMenu` method will ignore any open menu requests until the player has ticked at least once in the new world.
- Additional checks have been implemented in `BaseContainerBlockEntity#canUnlock` to reject containers that are attempted to be opened after a world switch.

In future improvements, it may be advantageous for `openMenu` to verify whether the container is still valid in the new world and decide if it should be closed. As a temporary workaround, a one-tick delay is required before opening inventories after a teleport.

### TickThread Checks in NMS Level `setBlockEntity` and `getBlockEntity`

Attempts were made to add TickThread checks to both `setBlockEntity` and `getBlockEntity`. However, it has been observed that StarLight accesses these block entities using a separate "Tuinity Chunk System Worker" thread, and some plugins (for example, CoreProtect) access these block entities from an asynchronous thread.

Folia’s implementation includes thread checks in these methods, but they only verify whether the current thread is a tick thread instead of ensuring it corresponds to the current world’s tick thread. In practice, `getBlockEntity` appears to be thread-safe except when it is accessed from a separate `ServerLevelTickThread`. Such access can trigger a main thread chunk load, potentially freezing the server.

Additionally, the `capturedTileEntities` map is a point of concern. Although it is not frequently iterated—being accessed only via its `entrySet()`—synchronizing access to it may be beneficial for safety. Folia does not implement such synchronization.

To address these issues, instead of following Folia’s exact approach, the implementation now uses `ensureTickThreadOrAsyncThread` for `getBlockEntity`, while `setBlockEntity` continues to use the `ensureTickThread` check.
