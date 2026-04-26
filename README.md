# Missile Defence Multiplayer

A browser-based arcade defence game inspired by the strategic tension of classic missile defence gameplay, rebuilt as a maintainable JavaScript/Canvas project with local multiplayer roles, AI assistance, factories, upgrades, escalating waves and a coherent 1980s-inspired 2D pixel-art direction.

The game is designed to run as a static site, so it can be deployed directly on Netlify or any static hosting provider.

## Play Online

The game is playable here:

https://missiledefencegame.netlify.app/

## Current Gameplay

The battlefield is split into three defensive zones. Each zone contains:

- one defence base;
- factories that generate construction credits between waves;
- four weapon slots:
  - two missile launcher slots;
  - two turret slots.

Incoming threats include missiles, split missiles, drones, bombers and heavy falling bombs. The player must survive increasingly difficult waves while deciding how to spend construction credits on repairs, factories, weapons, ammunition and upgrades.

## Game Modes

The first screen asks the player to choose the match type:

- **Human launchers**: the player controls missile launchers with the mouse, while the AI controls turrets.
- **Human turrets**: the player controls turrets with the mouse, while the AI controls missile launchers.
- **Human co-op**: one player controls missile launchers with the mouse, while another controls turrets with keyboard arrows and space.
- **AI co-op**: the AI controls all combat systems; the player only manages construction, upgrades and resupply between waves.

## Controls

### Missile launchers

- Click on the battlefield to launch a missile salvo.
- Ballistic missiles converge on the clicked point and create blast clouds.
- Seeker missiles track targets with prediction and improved steering.

### Turrets

Turrets can be configured depending on the selected game mode:

- **Keyboard mode**:
  - Left / right arrows rotate all turret lines of fire in parallel.
  - Space fires all installed and ready turrets.
- **Mouse mode**:
  - Mouse movement aligns turret aim.
  - Mouse click fires turrets immediately.
  - Aim can be parallel or independently directed toward the clicked point.

## Interface And Online Manual

The interface includes a readable in-game manual, a schematic city/arsenal status panel and compact footer telemetry for base health, factory production, weapon slots, ammunition and weapon durability.

The online manual is available from the `?` button in the top-right toolbar. It covers the objective, game modes, controls, weapon roles, enemies, economy, difficulty and practical survival tips.

## Localization

The UI currently ships with Italian and English dictionaries through `src/i18n.js`. Additional languages can be added by extending the dictionary object without changing game logic.

## Weapons

Each weapon can be upgraded up to level 3.

- **Ballistic missile**: explodes at the selected target point; upgrade paths increase blast impact and cluster behaviour.
- **Seeker missile**: tracks priority targets, has stronger guidance, but reloads more slowly.
- **Cannon**: slower firing rate, high damage per shot.
- **Machine gun**: high rate of fire, useful against drones and agile low-health targets.
- **Laser**: precise, immediate and piercing, but with the slowest fire rate of all weapons.

Each installed weapon has mechanical durability. Firing consumes durability; when it reaches zero, the weapon breaks and the slot becomes available again. Ammunition resupply does not repair durability, while upgrading a weapon restores it to the maximum value for the new level.

## Economy And Upgrades

Factories produce construction credits between waves. Credits can be spent on:

- repairing damaged bases and factories;
- building or upgrading factories;
- installing and upgrading missile launchers and turrets;
- replenishing ammunition;
- increasing magazine capacity;
- improving ballistic blast radius and blast persistence;
- adding shields.

The wave-clear bonus is always granted, and factory production adds additional credits depending on surviving factory levels.

## Visual Direction

The renderer uses a coherent 2D pixel-art style:

- block-based missile trails, smoke and particles;
- filled pixel blast clouds with dark overlap cancellation;
- pixel-style enemies, bombers, bombs, drones, weapons and bases;
- no soft Canvas gradients or oval enemy placeholders in the main renderer.

The intent is not 3D voxel art, but 2D pixel art with suggested volume through hard-edged highlights, shadows and block shapes.

## Local Development

The game uses native ES modules, so it must be served over HTTP instead of opened directly from the filesystem.

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/
```

There is no build step required.

## Netlify Deployment

The project is ready for Netlify as a static site.

Recommended settings:

- **Build command**: leave empty
- **Publish directory**: `.`

The included `netlify.toml` already matches this setup.

## Project Structure

```text
src/
  main.js                  Entry point: bootstrap, game loop and top-level flow
  state.js                 Centralized observable game state
  i18n.js                  Translation dictionaries and DOM translation helpers
  config.js                Constants for difficulty, weapons, enemies and costs
  utils.js                 Shared utility functions
  styles.css               UI layout and visual system
  assets/
    logo-missile-defence.svg
  core/
    wave.js                Wave start/finish and wave rewards
    economy.js             Construction credits, upgrades and repairs
  entities/
    weapons.js             Missile launches, turret firing and player turret aiming
    enemies.js             Enemy spawning and enemy behaviour
    projectiles.js         Friendly missile and bullet movement
    effects.js             Blast clouds, particles and cleanup
  systems/
    combat.js              Targeting, damage and collision helpers
    ai.js                  Allied AI for launchers and turrets
    input.js               Mouse and keyboard routing
  rendering/
    renderer.js            Canvas renderer and pixel-art drawing routines
  ui/
    ui.js                  DOM references, HUD updates and dialogs
  debug/
    logger.js              Debug logging, snapshots and FPS metrics
docs/
  design.md                Design notes, balancing and roadmap
```

## Architecture Notes

The codebase is intentionally modular:

- game state is centralized in `state.js`;
- systems receive state through imports rather than hidden globals;
- rendering is isolated in `rendering/renderer.js`;
- combat logic, AI, input, economy and wave management are separate modules;
- the project remains static-hosting friendly.

This structure is intended to make balancing, debugging and future expansion practical.

## Roadmap Ideas

- Additional enemy behaviours and boss-style waves.
- More visible weapon-level states on bases.
- Improved AI build strategy for full AI co-op mode.
- Persistent high scores.
- Optional sound effects and music with arcade-style audio.
- Mobile/touch control exploration.

## License

This project is distributed under the MIT License. See `LICENSE` for details.
