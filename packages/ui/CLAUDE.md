# packages/ui — shared components

BX Team's Vue 3 component library and design tokens, consumed as raw `.vue` files (Nuxt transpiles them through `build.transpile`). `src/components/` holds the components, `src/styles/tokens.css` the CSS custom properties and utility classes, `src/index.ts` the one export barrel.

## Rules

- Colours, radii, spacing and fonts come only from the tokens in `tokens.css`; never hard-code them. The legacy token names are aliases — use the current ones.
- Consuming apps import `@bx-team/ui/styles` before `tailwindcss`.
- The accent is rationed to focus rings, link hover, active markers and the one gradient phrase per hero; buttons, borders, fields and body text never take it.
- Cards have borders, not shadows; shadows are for floating things only.
- The name is always written **BX Team**, and the mark is `BrandMark` on whole 2px multiples.
- A component's props, slots and emits are its documentation: keep them typed in the SFC.
