import { z } from 'zod';

/** A BX ID as other players see it: no email, nothing private. */
export const PlayUserSchema = z.object({
  id: z.string(),
  /** The display name; empty when the player set none. */
  name: z.string(),
  username: z.string().nullable(),
  image: z.string().nullable(),
});

/** What a player is doing, set by their launcher; `null` while it is only open. */
export const ActivitySchema = z
  .object({
    /** The pack or instance name the launcher shows. */
    name: z.string().max(64),
    minecraft: z.string().max(32),
    /** A lobby the player hosts that friends may join without an invite. */
    lobby: z.string().max(64).optional(),
  })
  .nullable();

/** What a player chose to show: `invisible` looks offline to friends. */
export const StatusSchema = z.enum(['online', 'busy', 'invisible']);

export const PresenceSchema = z.object({
  online: z.boolean(),
  /** `busy` asks friends not to disturb; absent means `online`. Never `invisible`: that reads as offline. */
  status: z.enum(['online', 'busy']).optional(),
  activity: ActivitySchema,
  /** When the player was last seen online, while offline; ISO 8601. */
  lastSeen: z.string().nullable().optional(),
});

export const FriendSchema = z.object({ user: PlayUserSchema, presence: PresenceSchema });

export const FriendsSchema = z.object({
  friends: z.array(FriendSchema),
  incoming: z.array(PlayUserSchema),
  outgoing: z.array(PlayUserSchema),
});

/** A friend code as typed; the server drops dashes and spaces and fixes look-alike letters. */
export const FriendRequestSchema = z.object({ code: z.string().min(1).max(20) });

/** The answer to a friend request: `accepted` when the other side had already asked. */
export const FriendAddedSchema = z.object({
  status: z.enum(['requested', 'accepted', 'exists']),
  user: PlayUserSchema,
});

/** How the guests reach the host's world: the launcher fills it in once the world is open to LAN. */
export const LobbyGameSchema = z.object({
  minecraft: z.string().max(32),
  loader: z.string().max(32).optional(),
  /** An install link for the pack, so a guest without it can get the same files. */
  pack: z.string().url().max(512).optional(),
});

export const CreateLobbySchema = z.object({
  name: z.string().min(1).max(64),
  game: LobbyGameSchema,
  /** Friends of the host may join without an invite. */
  open: z.boolean().optional(),
});

export const LobbyOpenSchema = z.object({ open: z.boolean() });

export const LobbySchema = z.object({
  id: z.string(),
  name: z.string(),
  host: z.string(),
  game: LobbyGameSchema,
  members: z.array(z.string()),
  invited: z.array(z.string()),
  open: z.boolean().default(false),
  createdAt: z.string(),
});

export const InviteSchema = z.object({ userId: z.string() });

/** Messages a launcher sends on its `/connect` socket. */
export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('activity'), activity: ActivitySchema }),
  z.object({ type: z.literal('status'), status: StatusSchema }),
  /** WebRTC offers, answers and candidates between two members of one lobby; opaque to the server. */
  z.object({ type: z.literal('signal'), lobby: z.string(), to: z.string(), data: z.unknown() }),
  z.object({ type: z.literal('ping') }),
]);

/** Events the server pushes on the same socket. */
export const ServerEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('presence'), userId: z.string(), presence: PresenceSchema }),
  /** This account's own status, on connect and whenever one of its launchers changes it. */
  z.object({ type: z.literal('status'), status: StatusSchema }),
  z.object({ type: z.literal('friend_request'), user: PlayUserSchema }),
  z.object({ type: z.literal('friend_added'), user: PlayUserSchema }),
  z.object({ type: z.literal('friend_removed'), userId: z.string() }),
  /** A player changed their skin: their own launchers and their friends' fetch it again. */
  z.object({ type: z.literal('skin'), userId: z.string() }),
  z.object({ type: z.literal('invite'), lobby: LobbySchema, from: PlayUserSchema }),
  z.object({ type: z.literal('lobby'), lobby: LobbySchema }),
  z.object({ type: z.literal('lobby_closed'), lobby: z.string() }),
  z.object({ type: z.literal('signal'), lobby: z.string(), from: z.string(), data: z.unknown() }),
  z.object({ type: z.literal('pong') }),
]);

export const IceServersSchema = z.object({
  iceServers: z.array(
    z.object({
      urls: z.union([z.string(), z.array(z.string())]),
      username: z.string().optional(),
      credential: z.string().optional(),
    }),
  ),
});

export type PlayUser = z.infer<typeof PlayUserSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Presence = z.infer<typeof PresenceSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type Friend = z.infer<typeof FriendSchema>;
export type Friends = z.infer<typeof FriendsSchema>;
export type FriendAdded = z.infer<typeof FriendAddedSchema>;
export type Lobby = z.infer<typeof LobbySchema>;
export type ServerEvent = z.infer<typeof ServerEventSchema>;
