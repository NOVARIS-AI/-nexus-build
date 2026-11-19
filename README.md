# Nexus Build

**Turn ideas into playable worlds.**

Nexus Build is an independent AI-assisted game creation studio. The long-term goal is to let creators describe a game in natural language, generate and edit its world, add gameplay systems, test it, and export it.

## Current foundation (0.1.0)

- React + TypeScript + Vite studio shell.
- Three.js live procedural 3D blockout preview.
- AI Game Director with structured game-blueprint generation and local fallback.
- Engine registry with active Three.js preview and a clearly marked planned Godot export adapter.
- Persistent generation-task lifecycle in Cloudflare D1 (queued, running, completed, failed).
- Blueprint validation, JSON export and save-as-project workflow.
- Hybrid processing policy: local-first for simple plans, optional Cloudflare Workers AI for complex plans.
- World / Assets / Logic workspace navigation.
- Responsive layout for desktop and mobile screens.
- Clear prototype status: the Director generates and validates a game plan; it does not yet generate a complete playable game or export a Godot project.

## Core foundation implemented\n\nThe first NEXUS Core Foundation milestone now includes a versioned blueprint schema, engine registry, task persistence API, AI Director planning endpoint with a deterministic fallback, a local-first/hybrid processing decision, and validation before saving a blueprint as a project. The asset library currently stores imported files in browser IndexedDB; shared cloud asset storage and the full generation pipeline remain future work.\n\n## Architecture direction

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

## Project account isolation

Saved project endpoints require a verified Cloudflare Access identity. The Worker validates the `Cf-Access-Jwt-Assertion` signature, issuer, audience, expiry, and subject, then filters every project read, update, and delete by that subject.

### One-time Cloudflare setup

1. In Cloudflare, open **Workers & Pages → nexus-build → Settings → Domains & Routes**.
2. Enable **Cloudflare Access** for the production `workers.dev` URL and choose an allow policy for the intended account(s).
3. Open **Manage Cloudflare Access** and copy the application's **AUD tag**.
4. In **Workers & Pages → nexus-build → Settings → Variables and Secrets**, add `ACCESS_TEAM_DOMAIN` as a text variable containing the Zero Trust team domain (for example, `your-team.cloudflareaccess.com`, without `https://`).
5. Add `ACCESS_AUD` as a secret containing the application's AUD tag.
6. Redeploy the Worker after saving the variables.

Until both variables are configured and Access is enabled, project endpoints deliberately fail closed (503/401) rather than exposing shared projects. Existing rows are retained with the `legacy-unassigned` owner and are not visible to signed-in users until a deliberate ownership-recovery step is implemented.

Do not expose the AUD secret in client-side code or commit it to Git.
