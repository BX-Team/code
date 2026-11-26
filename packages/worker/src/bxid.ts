/** What a product offers BX ID over a `PRODUCT_<NAME>` binding, so BX ID can act on accounts without knowing it. */
export interface BxIdProduct {
  /** Deletes everything the product keeps for this BX ID; it may be called again for the same id. */
  forget(userId: string): Promise<void>;
}

/** The product bindings among a Worker's bindings. */
export function products(env: object): BxIdProduct[] {
  return Object.entries(env).flatMap(([name, binding]) =>
    name.startsWith('PRODUCT_') && typeof (binding as Partial<BxIdProduct>)?.forget === 'function'
      ? [binding as BxIdProduct]
      : [],
  );
}

/** What BX ID offers products over their `ID` service binding (its `IdService` entrypoint). */
export interface BxIdService {
  /** The BX ID signed in by a request's `Cookie` (the site) or `Authorization` (an app), if any. */
  userId(credentials: { cookie?: string | null; authorization?: string | null }): Promise<string | null>;
  /** Logs a change a product made for this BX ID in its activity, and tells the player's own launchers. */
  profilesChanged(
    userId: string,
    event: {
      kind: 'nick-added' | 'nick-removed' | 'skin';
      detail: Record<string, string>;
      ipAddress: string | null;
      userAgent: string | null;
    },
  ): Promise<void>;
}

/** The `ID` binding of a product, typed by the contract rather than by BX ID's own code. */
export function bxid(env: { ID: unknown }): BxIdService {
  return env.ID as BxIdService;
}
