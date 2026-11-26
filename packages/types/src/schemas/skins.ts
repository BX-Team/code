import { z } from 'zod';

/** `classic` is Steve's 4-pixel arms, `slim` Alex's 3-pixel ones. */
export const SkinModelSchema = z.enum(['classic', 'slim']);

/** A skin a nick wears; `url` is immutable, so it may be cached forever. */
export const SkinSchema = z.object({
  model: SkinModelSchema,
  /** SHA-256 of the PNG, hex. */
  hash: z.string(),
  url: z.string(),
});

/** The skins this BX ID uploaded, newest first: the library any of its nicks can wear. */
export const MySkinsSchema = z.object({ recent: z.array(SkinSchema) });

export const SelectSkinSchema = z.object({ hash: z.string().regex(/^[0-9a-f]{64}$/), model: SkinModelSchema });

/** An offline nick as the vanilla client allows it; unique without regard to case. */
export const NickSchema = z.string().regex(/^[A-Za-z0-9_]{3,16}$/, 'A nick is 3 to 16 letters, digits or underscores');

export const ClaimNickSchema = z.object({ name: NickSchema });

/** The body the game sends to Mojang's `join`, which the Riven agent sends here for an offline account instead. */
export const JoinSchema = z.object({
  accessToken: z.string().min(1),
  selectedProfile: z.string().regex(/^[0-9a-f]{32}$/i),
  serverId: z.string().min(1).max(64),
});

export const HasJoinedQuerySchema = z.object({ username: z.string().min(1), serverId: z.string().min(1) });

export const GameTokenSchema = z.object({ token: z.string(), expiresAt: z.string() });

/** An offline nick held by one BX ID; `id` is its offline UUID, undashed, as a server derives it. */
export const ProfileSchema = z.object({ id: z.string(), name: z.string(), skin: SkinSchema.nullable() });

/** A nick its owner removed: until `until` only they can take it back. */
export const HeldNickSchema = z.object({ name: z.string(), until: z.string() });

export const MyProfilesSchema = z.object({
  profiles: z.array(ProfileSchema),
  held: z.array(HeldNickSchema),
  /** How many nicks one BX ID may hold. */
  limit: z.number(),
});

export type SkinModel = z.infer<typeof SkinModelSchema>;
export type Skin = z.infer<typeof SkinSchema>;
export type MySkins = z.infer<typeof MySkinsSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type HeldNick = z.infer<typeof HeldNickSchema>;
export type MyProfiles = z.infer<typeof MyProfilesSchema>;
export type GameToken = z.infer<typeof GameTokenSchema>;
