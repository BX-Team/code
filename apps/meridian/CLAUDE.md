# apps/meridian - BX Team website

Nuxt 4 application serving the main BX Team website. Uses Vue 3, Tailwind CSS v4, and file-based routing.

## Architecture
Nuxt 4 with SSR — pages are server-rendered and hydrated on the client. Tailwind CSS for styling, with shadcn-vue for UI components, and Better Auth for authentication. The project follows a modular structure with clear separation of concerns between pages, components, layouts, and server-side logic.

## Key Directories
- **`app/pages/`** — file-based routing
- **`app/components/`** — website-specific components (shadcn-vue)
- **`app/middleware/`** — route guards and auth checks
- **`app/layouts/`** — Nuxt layout components
- **`app/server/`** — server-side plugins, routes, and utilities
- **`app/lib/`** — utility functions
- **`app/assets/`** — static assets like images, fonts, and styles

## Components
We use shadcn-vue for UI components, which are located in `app/components/`. These components are designed to be reusable and customizable across the website.

When developing new pages or features, you can add new components from shadcn-vue using `bunx --bun shadcn-vue@latest add <component-name>` command. Don't create custom components unless necessary; prefer using shadcn-vue components for consistency.

## Running dev server
Don't start the dev server via Bash commands, user will run development server by himself. Just make sure to run `bun install` in the project root to install dependencies, and then the user can start the dev server with `bun --bun dev`.
