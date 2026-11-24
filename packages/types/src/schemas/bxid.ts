import { z } from 'zod';
import { UsernameSchema } from './mojang';

/** The `serverId` a launcher passes to Mojang's `join`, issued per account by BX ID. */
export const ServerIdSchema = z.string().regex(/^[0-9a-f]{40}$/);

/** Sent once the launcher has called `join` with the challenge's `serverId`. */
export const MinecraftLinkSchema = z.object({ name: UsernameSchema, serverId: ServerIdSchema });

/** A Minecraft profile linked to a BX ID; `id` is the undashed online UUID. */
export const MinecraftProfileSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{32}$/),
  name: z.string(),
});

export const MinecraftProfilesSchema = z.object({ profiles: z.array(MinecraftProfileSchema) });

export type MinecraftProfile = z.infer<typeof MinecraftProfileSchema>;

/** An app this BX ID has signed in to through the device flow, such as `riven`. */
export const ConnectedAppSchema = z.object({ clientId: z.string(), connectedAt: z.string() });

export const ConnectedAppsSchema = z.object({ apps: z.array(ConnectedAppSchema) });

export type ConnectedApp = z.infer<typeof ConnectedAppSchema>;

/** Where the account picture comes from; `initial` clears it. */
export const PictureChoiceSchema = z.object({ source: z.enum(['discord', 'github', 'initial']) });

export type PictureSource = z.infer<typeof PictureChoiceSchema>['source'];

/** What can happen to a BX ID; `detail` holds the names involved, per kind. */
export const ActivityKindSchema = z.enum([
  'created',
  'signed-in',
  'signed-out',
  'device-removed',
  'name',
  'username',
  'picture',
  'linked',
  'unlinked',
  'minecraft-linked',
  'minecraft-unlinked',
  'skin',
  'app',
]);

export const ActivityEventSchema = z.object({
  id: z.string(),
  kind: ActivityKindSchema,
  detail: z.record(z.string(), z.string().nullable()).nullable(),
  ipAddress: z.string().nullable(),
  /** The device the event is about: the one signed in or out, else the one that made the change. */
  userAgent: z.string().nullable(),
  createdAt: z.string(),
});

export const ActivityPageSchema = z.object({ events: z.array(ActivityEventSchema), next: z.string().nullable() });

export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export type ActivityPage = z.infer<typeof ActivityPageSchema>;
