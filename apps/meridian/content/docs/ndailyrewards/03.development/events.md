---
icon: CalendarClock
title: Events
description: Learn how to use NDailyRewards events in your plugin.
---

NDailyRewards provides a range of events for you to use. This page will detail the events that NDailyRewards have.

Registered events that you can listen to:

- `AutoClaimEvent` - called when a player joins the server and the reward is automatically claimed.
- `PlayerClaimRewardEvent` - called when a player claims a reward.
- `PlayerReceiveReminderEvent` - called when a player receives a reminder about available rewards.

::callout
View documentation for NDailyRewards events at our [Javadoc](https://repo.bxteam.org/javadoc/releases/org/bxteam/ndailyrewards/3.3.0/raw/index.html)
::

## Examples

### AutoClaimEvent

```java
@EventHandler
public void playerAutoClaimEvent(AutoClaimEvent event) {
    Player player = event.getPlayer();
    int day = event.getDay();

    player.sendMessage("You have claimed the reward for day " + day + " automatically!");
}
```

### PlayerClaimRewardEvent

```java
@EventHandler
public void playerClaimRewardEvent(PlayerClaimRewardEvent event) {
    Player player = event.getPlayer();
    int day = event.getDay();

    player.sendMessage("You have claimed the reward for day " + day + "!");
}
```

### PlayerReceiveReminderEvent

```java
@EventHandler
public void playerRemindEvent(PlayerReceiveReminderEvent event) {
    Player player = event.getPlayer();
    int day = event.getDay();

    player.sendMessage("You received a reminder for a new reward on day " + day);
}
```
