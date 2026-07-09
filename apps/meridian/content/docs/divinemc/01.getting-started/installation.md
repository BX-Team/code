---
icon: Download
title: Installation
description: Learn how to install and set up DivineMC on your machine.
---

## Requirements

To run DivineMC, you'll need:

- [Java 25](https://adoptium.net/temurin/releases?version=25) or newer
- At least 4GB of RAM (recommended)
- A stable internet connection

## Installation

DivineMC follows a similar installation process to other PaperMC-based server software, making it familiar for experienced server administrators.

### Downloading the Server

::steps
:::step
Visit our [Downloads page](/downloads/divinemc) and download the latest build of DivineMC.
:::

:::step
Make a new folder to keep your server files organized and easily accessible.
:::

:::step
Move the downloaded DivineMC jar file into your server directory.
:::
::

### Running the Server

::steps
:::step
Create a startup script in your server directory. For Linux, macOS and other Unix-like systems, create a file named `start.sh` with the following content:

```sh [start.sh]
#!/usr/bin/env bash
java -Xms4096M -Xmx4096M --add-modules=jdk.incubator.vector -jar server.jar --nogui # [!code word:server.jar]
```

For Windows, use the example above, but create a `start.bat` file instead and remove the `#!/usr/bin/env bash` line.
:::

:::step
The first launch creates an `eula.txt` file. Open it and change the following line:

```bash [eula.txt]
# By changing the setting below to TRUE, you agree to our EULA (https://aka.ms/MinecraftEULA).
# Thu Jan 1 00:00:00 UTC 1970
eula=false # [!code --]
eula=true # [!code ++]
```
:::

:::step
Run the server again using the startup script you created. Once it fully loads, your installation is complete!
:::
::

## Next Steps

Now that you have your DivineMC server running, you can start [adding plugins](/docs/divinemc/getting-started/plugins) and configuring it to your liking.
