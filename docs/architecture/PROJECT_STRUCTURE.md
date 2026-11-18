# KitCart Project Structure

KitCart is one Next.js App Router application. Route entry points live in
`src/app/`, reusable feature code lives in `src/features/`, and runtime
assets live in `public/`.

## Routes and layouts

- `src/app/(marketplace)/` contains Discover (`/`), Explore, About, Help,
  and their shared layout and background styles.
- `src/app/(auth)/` contains Login, Sign Up, and their shared layout.
- `src/app/(labs)/` contains Aurora, Light Pillar, design, render, robot,
  and visor test routes.
- `src/app/account/` contains the account page.
- `src/app/api/auth/[...nextauth]/` contains the Auth.js API handler.

Parenthesized route groups organize files without changing public URLs.
The marketplace background lives in the shared layout so it stays mounted
when navigating between marketplace pages.

## Features and styles

- `src/features/shop/marketplace/` contains the marketplace shell, demo
  catalogue, and reusable marketplace styles.
- `src/features/auth/` contains the authentication shell, verification UI,
  and auth-specific styles.
- `src/features/robot/3d/` contains the production robot, animation playback,
  head tracking, and visor rendering. `src/features/robot/2d/` contains
  the legacy 2D implementation and experiments.
- `src/components/` contains shared effects such as Aurora and LightPillar.
- `src/app/globals.css` and `src/styles/kitcart.css` contain global and
  shared styles.

## Backend entry points

- `src/auth.ts` contains the central Auth.js configuration.
- `src/proxy.ts` is the Next.js proxy entry point.
- API handlers stay in `src/app/api/`. Secrets stay in local environment
  files, never in Git.

## Assets, tooling, and backups

- `public/models/kitcart/`, `public/mascot/`, and `public/animations/`
  contain runtime robot assets. Keep production asset URLs stable.
- `assets/references/` contains design references.
- `scripts/robot/` contains rigging, mapping, and preview tools.
- `backups/` contains recovery snapshots, not live application code.
  Review snapshots before committing them and leave credentials and
  environment files out of Git.

## Local development

Start KitCart on port 3000 with `npm run dev -- --port 3000`.

After moving route files, run `npx next typegen && npx tsc --noEmit`
to regenerate route types and check TypeScript.
