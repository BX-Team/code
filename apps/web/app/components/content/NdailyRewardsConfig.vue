<script setup lang="ts">
const config = {
  'check-updates': true,
  debug: false,
  database: {
    type: 'sqlite',
    sqlite: { file: 'ndailyrewards.db' },
    mariadb: {
      jdbc: 'jdbc:mariadb://localhost:3306/ndailyrewards',
      username: 'root',
      password: 'password',
    },
    cachePrepStmts: true,
    prepStmtCacheSize: 250,
    prepStmtCacheSqlLimit: 2048,
    useServerPrepStmts: true,
    useLocalSessionState: true,
    rewriteBatchedStatements: true,
    cacheResultSetMetadata: true,
    cacheServerConfiguration: true,
    elideSetAutoCommits: true,
    maintainTimeStats: false,
  },
  events: {
    'auto-claim-reward': false,
    'auto-claim-delay': 10,
    'open-gui-when-available': false,
    'notify-when-available': true,
  },
  rewards: {
    'reset-when-all-claimed': true,
    'first-join-reward': false,
    cooldown: 24,
    'reset-time': 24,
    'unlock-after-midnight': false,
    timezone: 'system',
    days: {
      '1': {
        position: 10,
        lore: ['&7&lRewards:', '&6- &e1x &6Diamond'],
        actions: [
          '[console] give <player> diamond 1',
          '[message] &6You have claimed your reward!',
          '[sound] ENTITY_EXPERIENCE_ORB_PICKUP:1:1',
        ],
      },
      '2': {
        position: 11,
        lore: ['&7&lRewards:', '&6- &e2x &6Diamond'],
        actions: [
          '[console] give <player> diamond 2',
          '[message] &6You have claimed your reward!',
          '[sound] ENTITY_EXPERIENCE_ORB_PICKUP:1:1',
        ],
      },
      '3': {
        position: 12,
        lore: ['&7&lRewards:', '&6- &e3x &6Diamond'],
        actions: [
          '[console] give <player> diamond 3',
          '[message] &6You have claimed your reward!',
          '[sound] ENTITY_EXPERIENCE_ORB_PICKUP:1:1',
        ],
      },
      '7': {
        position: 16,
        lore: ['&7&lRewards:', '&6- &e7x &6Diamond'],
        actions: [
          '[console] give <player> diamond 7',
          '[message] &6You have claimed your reward!',
          '[sound] ENTITY_EXPERIENCE_ORB_PICKUP:1:1',
        ],
      },
    },
  },
  gui: {
    reward: {
      title: '&6Daily Rewards',
      size: 27,
      display: {
        available: {
          material: 'EMERALD_BLOCK:1',
          name: '&aDay <dayNum>',
          lore: ['&7Your Reward Awaits', '&7Click Me to claim your prize!', '', '<reward-lore>'],
        },
        claimed: {
          material: 'COAL_BLOCK:1',
          name: '&aDay <dayNum>',
          lore: ['&7You have claimed this reward', '', '<reward-lore>'],
        },
        next: {
          material: 'COAL_BLOCK:1',
          name: '&aDay <dayNum>',
          lore: ['&7Your Reward Will Be Here Soon', '&7Wait <time-left>', '', '<reward-lore>'],
        },
        unavailable: {
          material: 'BARRIER:1',
          name: '&aDay <dayNum>',
          lore: ['&7You have not reached this day yet', '', '<reward-lore>'],
        },
        filler: { enable: true, material: 'GRAY_STAINED_GLASS_PANE:1', name: '&7', lore: [] },
      },
      custom: [],
    },
  },
  sound: { open: { enabled: true, type: 'BLOCK_BARREL_OPEN:1:1' } },
};

const comments: Record<string, string> = {
  'check-updates': 'Whether the plugin should check for updates on startup',
  debug: 'Enable verbose debug logging.',
  database: 'Database configuration settings',
  'database.type': 'Select the database type: sqlite (default) or mariadb',
  'database.sqlite.file': 'The filename for the SQLite database file',
  'database.mariadb.jdbc': 'JDBC connection string for MariaDB',
  'database.mariadb.username': 'Username for MariaDB connection',
  'database.mariadb.password': 'Password for MariaDB connection',
  'events.auto-claim-reward': 'Whether rewards should automatically be claimed when a player joins',
  'events.auto-claim-delay': 'Delay in seconds before the reward is automatically claimed',
  'events.open-gui-when-available': 'Whether to open the reward GUI when player joins and has available rewards',
  'events.notify-when-available': 'Whether to notify player about available rewards when they join',
  'rewards.reset-when-all-claimed': 'When a player reaches the day limit, should it reset to the first day?',
  'rewards.first-join-reward': 'Whether the reward should be available when player joins for the first time',
  'rewards.cooldown': 'Time the player has to wait before claiming the next reward (in hours)',
  'rewards.reset-time': 'Time without claiming after which the streak resets to day 1 (in hours)',
  'rewards.unlock-after-midnight': 'Should next day unlock after midnight?',
  'rewards.timezone': "Timezone for midnight checks. Use 'system' for server JVM default.",
  'rewards.days':
    'Daily reward configurations. Actions: [console], [player], [message], [actionbar], [title], [subtitle], [sound], [permission], [luck], [close]',
  'gui.reward.title': 'Title of the reward GUI',
  'gui.reward.size': 'Size of the GUI inventory (must be multiple of 9)',
  'sound.open.enabled': 'Whether to play sound when GUI opens',
  'sound.open.type': 'Sound type to play (format: SOUND_NAME:volume:pitch)',
};
</script>

<template>
	<ConfigViewer :config="config" :comments="comments" title="NDailyRewards Configuration" />
</template>
