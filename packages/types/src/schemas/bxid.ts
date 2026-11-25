import { z } from 'zod';

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
  'skin',
  'nick-added',
  'nick-removed',
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

/** A line the site shows above every page, set from a Flagship flag; `null` shows nothing. */
export const BannerSchema = z.object({ text: z.string().min(1).max(300), tone: z.enum(['info', 'warning']) });

export const NoticeSchema = z.object({ banner: BannerSchema.nullable() });

export type Banner = z.infer<typeof BannerSchema>;
export type Notice = z.infer<typeof NoticeSchema>;
