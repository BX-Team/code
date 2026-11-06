import { z } from 'zod';

/** Mojang accepts nothing else, so a name failing this is a bad request, not a miss. */
export const UsernameSchema = z
  .string()
  .regex(/^[A-Za-z0-9_]{1,16}$/, 'A Minecraft username is 1 to 16 letters, digits or underscores');

const TextureSchema = z.object({
  url: z.string(),
  metadata: z.object({ model: z.string() }).optional(),
});

/** The base64 payload inside the session profile's `textures` property. */
export const TexturesSchema = z.object({
  textures: z.object({
    SKIN: TextureSchema.optional(),
    CAPE: TextureSchema.optional(),
  }),
});

const PropertySchema = z.object({ name: z.string(), value: z.string() });

/** Mojang's session profile, which crafthead.net serves unchanged. */
export const SessionProfileSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{32}$/i),
  name: z.string(),
  properties: z.array(PropertySchema).default([]),
});

/** playerdb.co wraps the same profile in an envelope of its own. */
export const PlayerDbResponseSchema = z.object({
  success: z.boolean(),
  code: z.string(),
  data: z
    .object({
      player: z
        .object({
          username: z.string(),
          raw_id: z.string().regex(/^[0-9a-f]{32}$/i),
          properties: z.array(PropertySchema).default([]),
        })
        .optional(),
    })
    .default({}),
});

export type SessionProfile = z.infer<typeof SessionProfileSchema>;
