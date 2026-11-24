import { z } from 'zod';

/** `classic` is Steve's 4-pixel arms, `slim` Alex's 3-pixel ones. */
export const SkinModelSchema = z.enum(['classic', 'slim']);

/** A skin a BX ID chose; `url` is immutable, so it may be cached forever. */
export const SkinSchema = z.object({
  model: SkinModelSchema,
  /** SHA-256 of the PNG, hex. */
  hash: z.string(),
  url: z.string(),
});

/** One BX ID's skin; `null` until they upload one, and clients fall back to their Minecraft profile. */
export const UserSkinSchema = z.object({ skin: SkinSchema.nullable() });

/** The signed-in BX ID's skin and the ones it used before, newest first. */
export const MySkinsSchema = z.object({ skin: SkinSchema.nullable(), recent: z.array(SkinSchema) });

export const SkinLookupSchema = z.object({ ids: z.array(z.string()).min(1).max(200) });

/** Skins by BX ID; ids without one are left out. */
export const SkinsByIdSchema = z.object({ skins: z.record(z.string(), SkinSchema) });

export const SelectSkinSchema = z.object({ hash: z.string().regex(/^[0-9a-f]{64}$/), model: SkinModelSchema });

export type SkinModel = z.infer<typeof SkinModelSchema>;
export type Skin = z.infer<typeof SkinSchema>;
export type UserSkin = z.infer<typeof UserSkinSchema>;
export type MySkins = z.infer<typeof MySkinsSchema>;
export type SkinsById = z.infer<typeof SkinsByIdSchema>;
