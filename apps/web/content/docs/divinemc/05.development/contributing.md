---
icon: GitPullRequest
title: Contributing to DivineMC
description: DivineMC is happy you're willing to contribute to our projects. We are ready to accept almost any feature in our project in order to make it better.
---

## Use a Personal Fork and not an Organization

DivineMC will routinely modify your PR, whether it's a quick rebase or to take care
of any minor nitpicks we might have. Often, it's better for us to solve these
problems for you than make you go back and forth trying to fix them yourself.

Unfortunately, if you use an organization for your PR, it prevents DivineMC from
modifying it. To avoid this, please do not use repositories on organizations
for PRs.

## Requirements

To get started with making changes, you'll need the following software, most of
which can be obtained in (most) package managers such as `apt` (Debian / Ubuntu;
you will most likely use this for WSL), `homebrew` (macOS / Linux), and more:

- `git` (package `git` everywhere);
- A Java 25 or later JDK (packages vary, use Google/DuckDuckGo/etc.).
  - [Adoptium](https://adoptium.net/) has builds for most operating systems.
  - DivineMC requires JDK 25 to build, however, makes use of Gradle's
    [Toolchains](https://docs.gradle.org/current/userguide/toolchains.html)
    feature to allow building with only JRE 21 or later installed. (Gradle will
    automatically provision JDK 25 for compilation if it cannot find an existing
    installation).

If you're on Windows, check
[the section on WSL](#patching-and-building-is-really-slow-what-can-i-do).

If you're compiling with Docker, you can use Adoptium's
[`eclipse-temurin`](https://hub.docker.com/_/eclipse-temurin/) images like so:

```console
# docker run -it -v "$(pwd)":/data --rm eclipse-temurin:25.0.2_10-jdk bash
Pulling image...

root@abcdefg1234:/# javac -version
javac 25.0.2
```

## Understanding Patches

Unlike the DivineMC API and its implementation, modifications to Paper, Purpur and Minecraft source files
are done through patches. These patches/extensions are split into three different sets of two
categories, which are formatted like so:

Under `divinemc-api`:

- `paper-patches` (applies to the `paper-api/` git repo)
    - `features`: Larger feature patches that modify multiple Paper API classes.
    - `files`: Per-file patches to Paper API classes;

Under `divinemc-server`:

- `minecraft-patches` (applies to the `divinemc-server//` git repo)
  - `sources`: Per-file patches to Minecraft classes;
  - `resources`: Per-file patches to Minecraft data files;
  - `features`: Larger feature patches that modify multiple classes.
- `paper-patches`
  - `sources`: Per-file patches to Paper Server classes;
  - `features`: Larger feature patches that modify multiple Paper Server classes.
- `purpur-patches`
  - `sources`: Per-file patches to Purpur Server classes;
  - `features`: Larger feature patches that modify multiple Purpur Server classes.

Because this entire structure is based on patches and git, a basic understanding
of how to use git is required. A basic tutorial can be found here:
https://git-scm.com/docs/gittutorial.

Assuming you have already forked the repository:

1. Clone your fork to your local machine;
2. Type `./gradlew applyAllPatches` in a terminal to apply the patches to both paper and minecraft classes.
   On Windows, remove `./` from the beginning of `gradlew` commands;
3. cd into `divinemc-server` for server changes, `divinemc-api` for API changes,
   `paper-api` for Paper API changes, and `paper-server` for Paper Server changes,
   and finally `purpur-api` and `purpur-server` for Purpur API and Server changes;

`divinemc-server/src/minecraft/java` and `divinemc-server/src/minecraft/java/resources` are not git repositories in the traditional sense.
Its initial commits are the decompiled and deobfuscated Minecraft source and resource files. The per-file
patches are applied on top of these files as a single, large commit, which is then followed
by the individual feature-patch commits. `paper-api/` and `paper-server/`
follow the same concept; each paper "project" has its own git repository that also includes it's own feature and per-file patches.

## Understanding the Gradle Tasks

It can be overwhelming when you look over all the available gradle tasks, but it's pretty straightforward.
Each "project" that includes a local git repository has the following available gradle tasks attached to it:

- `./gradlew apply[project]FeaturePatches` - Applies [project] feature patches
- `./gradlew apply[project]FilePatches` - Applies [project] file patches
- `./gradlew apply[project]Patches` - Applies all [project] patches
- `./gradlew fixup[project]FilePatches` - Puts the currently tracked source changes into the [project] file patches commit
- `./gradlew rebuild[project]FeaturePatches` - Rebuilds [project] feature patches
- `./gradlew rebuild[project]FilePatches` - Rebuilds [project] file patches
- `./gradlew rebuild[project]Patches` - Rebuilds all [project] patches

Some additional useful tasks are listed below:

- `./gradlew applyAllPatches` - Applies all patches defined in the paperweight-patcher project and the server project. (equivalent to running `applyPaperPatches` and then `applyAllServerPatches` in a second Gradle invocation)
- `./gradlew applyAllServerFeaturePatches` - Applies all Minecraft and upstream server feature patches (equivalent to `applyMinecraftFeaturePatches applyServerFeaturePatches`)
- `./gradlew applyAllServerFilePatches` - Applies all Minecraft and upstream server file patches (equivalent to `applyMinecraftFilePatches applyServerFilePatches`)
- `./gradlew applyAllServerPatches` - Applies all Minecraft and upstream server patches (equivalent to `applyMinecraftPatches applyServerPatches`)

- `./gradlew rebuildPurpurSingleFilePatches` - Fixups and rebuilds all paper single-file patches. This is how you'd make changes to the `build.gradle.kts` files located under `divinemc-api` and `divinemc-server`

You can also run `./gradlew tasks` to see all available tasks.

## Modifying (per-file) patches

This is generally what you need to do when editing files. Updating our
per-file patches is as easy as:
1. Making your changes;
2. Running `./gradlew fixup[project]FilePatches` in the root directory;
3. If nothing went wrong, rebuilding patches with `./gradlew rebuild[project]FilePatches`;

### Resolving rebase conflicts
If you run into conflicts while running `fixup[project]FilePatches`, you need to go a more
manual route:

This method works by temporarily resetting your `HEAD` to the desired commit to
edit it using `git rebase`.

0. If you have changes you are working on, type `git stash` to store them for
   later;
    - You can type `git stash pop` to get them back at any point.
1. cd into the relevant local git repo and run `git rebase -i base`;
    - It should show something like
      [this](https://gist.github.com/zachbr/21e92993cb99f62ffd7905d7b02f3159) in
      the text editor you get.
    - If your editor does not have a "menu" at the bottom, you're using `vim`.  
      If you don't know how to use `vim` and don't want to
      learn, enter `:q!` and press enter. Before redoing this step, do
      `export EDITOR=nano` for an easier editor to use.
1. Replace `pick` with `edit` for the commit/patch you want to modify (in this
   case the very first commit, `divinemc File Patches`), and
   "save" the changes;
1. Make the changes you want to make to the patch;
1. Run `git add .` to add your changes;
1. Run `git commit --amend` to commit;
1. Run `git rebase --continue` to finish rebasing;
1. Run `./gradlew rebuild[project]FilePatches` in the root directory;

## Adding larger feature patches

Feature patches are exclusively used for large-scale changes that are hard to
track and maintain and that can be optionally dropped, such as the more involved
optimizations we have. This makes it easier to update DivineMC during Minecraft updates,
since we can temporarily drop these patches and reapply them later.

There is only a very small chance that you will have to use this system, but adding
such patches is very simple:

1. Modify the relevant local git repo with the appropriate changes;
1. Run `git add .` inside that directory to add your changes;
1. Run `git commit` with the desired patch message;
1. Run `./gradlew rebuild[project]FeaturePatches` in the root directory.

Your commit will be converted into a patch that you can then PR into DivineMC.

::callout{type="warning"}
Please note that if you have some specific implementation detail you'd like to document, you should do so in the patch message *or* in comments.
::

## Modifying larger feature patches

One way of modifying feature patches is to reset to the patch commit and follow
the instructions from the [rebase section](#resolving-rebase-conflicts). If you
are sure there won't be any conflicts from later patches, you can also use the
fixup method.

### Fixup method

#### Manual method

1. Make your changes;
1. Make a temporary commit. You don't need to make a message for this;
1. Type `git rebase -i base`, move (cut) your temporary commit and
   move it under the line of the patch you wish to modify;
1. Change the `pick` to the appropriate action:
    1. `f`/`fixup`: Merge your changes into the patch without touching the
       message.
    1. `s`/`squash`: Merge your changes into the patch and use your commit message
       and subject.
1. Run `./gradlew rebuild[project]Patches` in the root directory;
    - This will modify the appropriate patches based on your commits.

#### Automatic method

1. Make your changes;
1. Make a fixup commit: `git commit -a --fixup <hash of patch to fix>`;
    - If you want to modify a per-file patch, use `git commit -a --fixup file`
    - You can also use `--squash` instead of `--fixup` if you want the commit
      message to also be changed.
    - You can get the hash by looking at `git log` or `git blame`; your IDE can
      assist you too.
    - Alternatively, if you only know the name of the patch, you can do
      `git commit -a --fixup "Subject of Patch name"`.
1. Rebase with autosquash: `git rebase -i --autosquash base`.
   This will automatically move your fixup commit to the right place, and you just
   need to "save" the changes.
1. Run `./gradlew rebuild[project]Patches` in the root directory. This will modify the
   appropriate patches based on your commits.

## Rebasing PRs

Steps to rebase a PR to include the latest changes from `main`.  
These steps assume the `origin` remote is your fork of this repository and `upstream` is the official DivineMC repository.

1. Fetch the latest changes from upstream's main: `git fetch upstream`.
1. Checkout your feature/fix branch and rebase on main: `git switch patch-branch && git rebase upstream/main`.
1. Apply updated patches: `./gradlew applyAllPatches`.
1. If there are conflicts, fix them.
1. If your PR creates new feature patches instead of modifying existing ones, ensure your newly-created patch is the last commit by either:
    * Renaming the patch file with a large 4-digit number in front (e.g. 9999-Patch-to-add-some-new-stuff.patch), and re-applying patches.
    * Running `git rebase --interactive base` and moving the commits to the end.
1. Rebuild patches: `./gradlew rebuildPatches`.
1. Commit modified patches.
1. Force push changes: `git push --force`. Make sure you're not deleting any of your commits or changes here!

## PR Policy

We'll accept changes that make sense. You should be able to justify their
existence, along with any maintenance costs that come with them. Using
[obfuscation helpers](#obfuscation-helpers) aids in the maintenance costs.
Remember that these changes will affect everyone who runs DivineMC, not just you
and your server.

While we will fix minor formatting issues, you should stick to the guide below
when making and submitting changes.

## Formatting

All modifications to Minecraft files and Paper files should be marked. For historical reasons,
API and API-implementation contain a lot of these too, but they are no longer
required.

- You need to add a comment with a short and identifiable description of the patch:
  `// DivineMC start - <COMMIT DESCRIPTION>`
    - The comments should generally be about the reason the change was made, what
      it was before, or what the change is.
    - After the general commit description, you can add additional information either
      after a `;` or in the next line.
- Multi-line changes start with `// DivineMC start - <COMMIT DESCRIPTION>` and end
  with `// DivineMC end - <COMMIT DESCRIPTION>`.
- One-line changes should have `// DivineMC - <COMMIT DESCRIPTION>` at the end of the line.

::callout{type="info"}
These comments are incredibly important to be able to keep track of changes across files and to remember what they are for, even a decade into the future.
::

Here's an example of how to mark changes by DivineMC:

```java
entity.getWorld().dontBeStupid(); // DivineMC - Move away from beStupid()
entity.getFriends().forEach(Entity::explode);
entity.updateFriends();

// DivineMC start - Use plugin-set spawn
// entity.getWorld().explode(entity.getWorld().getSpawn());
Location spawnLocation = ((CraftWorld) entity.getWorld()).getSpawnLocation();
entity.getWorld().explode(new BlockPosition(spawnLocation.getX(), spawnLocation.getY(), spawnLocation.getZ()));
// DivineMC end - Use plugin-set spawn
```

We generally follow the usual Java style (aka. Oracle style), or what is programmed
into most IDEs and formatters by default. There are a few notes, however:
- It is fine to go over 80 lines as long as it doesn't hurt readability.  
  There are exceptions, especially in Spigot-related files
- When in doubt or the code around your change is in a clearly different style,
  use the same style as the surrounding code.
- Usage of the `var` keyword is discouraged, as it makes reading patch files a
  lot harder and can lead to confusion during updates due to changed return types.
  The only exception to this is if a line would otherwise be way too long/filled with
  hard to parse generics in a case where the base type itself is already obvious.

### Imports
When adding new imports to a Minecraft or Paper class, use the fully qualified class name
instead of adding a new import to the top of the file. If you are using a type a significant number of times, you
can add an import with a comment. However, if it's only used a couple of times, the FQN is preferred to prevent future
patch conflicts in the import section of the file.


```java
import net.minecraft.server.MinecraftServer;
// don't add import here, use FQN like below

public class SomeVanillaClass {
    public final org.bukkit.Location newLocation; // DivineMC - add location
}
```

### Nullability annotations

We are in the process of switching nullability annotation libraries, so you might need to use one or the other:

**For classes we add**: Fields, method parameters and return types that are nullable should be marked via the
`@Nullable` annotation from `org.jspecify.annotations`. Whenever you create a new class, add `@NullMarked`, meaning types
are assumed to be non-null by default. For less obvious placing such as on generics or arrays, see the [JSpecify docs](https://jspecify.dev/docs/user-guide/).

**For other classes**: Keep using both `@Nullable` and `@NotNull` from `org.jetbrains.annotations`. These
will be replaced later.

## Access Transformers
Sometimes, Vanilla code already contains a field, method, or type you want to access
but the visibility is too low (e.g. a private field in an entity class). DivineMC can use access transformers
to change the visibility or remove the final modifier from fields, methods, and classes. Inside the `build-data/divinemc.at`
file, you can add ATs that are applied when you `./gradlew applyAllPatches`. You can read about the format of ATs
[here](https://mcforge.readthedocs.io/en/latest/advanced/accesstransformers/#access-modifiers).

## Obfuscation Helpers

While rarely needed, obfuscation helpers are sometimes useful when it comes
to unmapped local variables, or poorly named method parameters. In an effort
to make future updates easier on ourselves, DivineMC tries to use obfuscation
helpers wherever it makes sense. The purpose of these helpers is to make the
code more readable and maintainable. These helpers should be made easy to
inline by the JVM wherever possible.

An example of an obfuscation helper for a local variable:
```java
double d0 = entity.getX(); final double fromX = d0; // DivineMC - OBFHELPER
// ...   
this.someMethod(fromX); // DivineMC
```

While they may not always be done in exactly the same way, the general goal is
always to improve readability and maintainability. Use your best judgment and do
what fits best in your situation.

## Configuration files

To use a configurable value in your patch, add a new entry in either the
`DivineConfig` or `DivineWorldConfig` classes. Use `DivineConfig` if a value
must remain the same throughout all worlds, or the latter if it can change
between worlds. World-specific configuration options are preferred whenever
possible.

### DivineConfig example

```java
public static boolean saveEmptyScoreboardTeams = false;
private static void saveEmptyScoreboardTeams() {
    saveEmptyScoreboardTeams = getBoolean("settings.save-empty-scoreboard-teams", saveEmptyScoreboardTeams,
          "Example config option with comments");
}
```

Notice that the field is always public, but the setter is always private. This
is important to the way the configuration generation system works. To access
this value, reference it as you would any other static value:

```java
if (!DivineConfig.saveEmptyScoreboardTeams) {
```

It is often preferred that you use the fully qualified name for the
configuration class when accessing it, like so:
`org.bxteam.divinemc.DivineConfig.valueHere`.  
If this is not done, a developer for DivineMC might fix that for you before
merging, but it's always nice if you make it a habit where you only need 1-2
lines changed.

### DivineWorldConfig example

```java
public boolean useInhabitedTime = true;
private void useInhabitedTime() {
    useInhabitedTime = getBoolean("use-chunk-inhabited-timer", useInhabitedTime,
          "Example config option with comments");
}
```

Again, notice that the field is always public, but the setter is always private.
To access this value, you'll need an instance of the `net.minecraft.world.level.Level`
object:

```java
return this.level.divinemcConfig.useInhabitedTime ? this.inhabitedTime : 0;
```

## Tips and Tricks

### IntelliJ IDEA

- Under `Settings > Appearance & Behavior > System Settings`, disable
  `Sync external changes: Periodically when the IDE is inactive (experimental)`.
  When disabled, the IDE will not attempt to reindex files while patches are applying
  unless you interact with the IDE during the process. This avoids severe slowdowns and freezes.
- Under `Settings > Appearance & Behavior > System Settings`, you may also want to
  disable `Reopen projects on startup` to avoid freeze loops.

## Frequently Asked Questions

### My commit doesn't need a build, what do I do?

Quite simple: You add `[ci-skip]` to the start of your commit subject.

This case most often applies to changes to files like `README.md` and the `LICENSE.md` file, and so forth.

### Patching and building is *really* slow, what can I do?

This only applies if you're running Windows. If you're running a prior Windows
release, either update to Windows 10/11 or move to macOS/Linux/BSD.

In order to speed up patching process on Windows, it's recommended you get WSL 2.
This is available in Windows 10 v2004, build 19041 or higher. (You can check
your version by running `winver` in the run window (Windows key + R)). If you're
using an out of date version of Windows 10, update your system with the
[Windows 10 Update Assistant](https://www.microsoft.com/en-us/software-download/windows10) or [Windows 11 Update Assistant](https://www.microsoft.com/en-us/software-download/windows11).

To set up WSL 2, follow the information here:
https://docs.microsoft.com/en-us/windows/wsl/install

You will most likely want to use the Ubuntu apps. Once it's set up, install the
required tools with `sudo apt-get update && sudo apt-get install $TOOL_NAMES
-y`. Replace `$TOOL_NAMES` with the packages found in the
[requirements](#requirements). You can now clone the repository and do
everything like usual.

::callout{type="warning"}
Do not use the `/mnt/` directory in WSL! Instead, mount the WSL directories in Windows like described [here](https://docs.microsoft.com/en-us/windows/wsl/filesystems#view-your-current-directory-in-windows-file-explorer)
::
