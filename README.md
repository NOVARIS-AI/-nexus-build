# Nexus Build

**Turn ideas into playable worlds.**

Nexus Build is an independent AI-assisted game creation studio. The long-term goal is to let creators describe a game in natural language, generate and edit its world, add gameplay systems, test it, and export it.

## Current foundation (0.1.0)

- React + TypeScript + Vite studio shell.
- Three.js live procedural 3D blockout preview.
- Prompt capture for the future AI Game Director.
- World / Assets / Logic workspace navigation.
- Responsive layout for desktop and mobile screens.
- Clear prototype status: prompt capture is local UI state; it does not yet call an AI model or generate a complete game.

## Architecture direction

- `apps/web`: creator studio interface.
- `apps/api`: project and generation API (to be added).
- `engine/three`: interactive browser preview and scene tools.
- `engine/godot`: export/runtime integration (planned).
- `packages/ai-director`: prompt understanding and game-plan schema (planned).
- `packages/world-generator`: procedural world generation (planned).
- `packages/asset-pipeline`: import, validation and asset processing (planned).
- `workers/`: optional Cloudflare services (planned).

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Principles

1. Build real, inspectable systems—not fake buttons or mock feature claims.
2. Keep the core usable without paid APIs; optional cloud providers must be replaceable.
3. Make project data portable and keep creators in control of their assets.
4. Treat Lagos Life as an early reference project and source of reusable systems, not as a dependency or the whole product.
5. Clearly label what is implemented, experimental, or planned.

## Roadmap

1. Scene graph, selection, transform gizmos and save/load.
2. Structured game-plan schema and deterministic prompt-to-plan flow.
3. Procedural terrain, roads, buildings and reusable asset packs.
4. Gameplay components and testable runtime preview.
5. Godot project generation and export pipeline.
6. Optional AI providers, collaboration and multiplayer foundations.

## Cost and capability notes

The project targets open-source tools and free tiers. Free tiers have limits and can change. Unlimited hosted AI generation, cloud builds and hosting cannot be promised at a zero budget. Heavy local 3D processing may require a computer; the mobile-friendly web studio is being built first.
