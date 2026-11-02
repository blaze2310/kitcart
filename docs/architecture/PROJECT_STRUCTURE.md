# KitCart Project Structure

## Application

src/app/
- (auth)/: Sign In and Sign Up routes
- (labs)/: Robot and visor development/testing routes
- (shop)/: Future e-commerce storefront routes
- account/: Authenticated account page
- api/auth/: Auth.js API endpoints

## Authentication

src/features/auth/
- components/: AuthShell and CodeSlots
- styles/: Authentication-specific styles
- providers/: Reserved for future provider-specific modules

src/auth.ts
- Central Auth.js configuration

src/proxy.ts
- Authentication middleware/proxy

## Robot

src/features/robot/
- 3d/: Main production 3D robot
- 3d/animation/: Animation registry and playback logic
- 3d/hooks/: Head tracking and automatic blinking
- 3d/visor/: Visor rendering and geometry
- 2d/: Legacy 2D robot components and experimental tools
- 2d/hooks/: Legacy robot interaction hooks

## Robot assets

public/models/kitcart/
- animations/master/: Original master-rigged GLB
- animations/stay-in-place/: Stationary robot animations
- animations/moving/: Movement animations
- kitcart-final.glb: Earlier model used by rigging scripts
- kitcart-rig-test.glb: Experimental rig
- kitcart-arm-rig-experiment.glb: Experimental arm rig
- kitcart-head-experiment.glb: Experimental head model
- kitcart-head-map.json: Head mapping output

public/mascot/
- Robot image layers and visor mask

## Development scripts

scripts/robot/
- rigging/: Python rigging and model inspection scripts
- mapping/: Geometry and component mapping scripts
- previews/: Generated HTML visualizations

Run development scripts from the project root unless their usage instructions specify otherwise.

## Styles

src/styles/
- Shared application styles

src/features/auth/styles/
- Authentication-specific styles

## Future storefront

src/features/shop/
- home/
- products/
- cart/
- checkout/

## Important conventions

- Keep Next.js page.tsx, layout.tsx and route.ts files in src/app.
- Keep production robot GLB URLs stable.
- Centralize OAuth configuration in src/auth.ts.
- Keep secrets in .env.local, never in Git.
- Never move production assets without updating every reference.
- Preserve existing robot expressions and animations.
- Test login, signup and robot interactions after structural changes.
