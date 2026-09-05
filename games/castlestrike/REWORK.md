# Castle Strike 2.0

Castle Strike is a single-player fantasy army-building auto-battler inspired by the roster planning and continuous wave combat of Warcraft III's Direct Strike. Buy a permanent army, arrange its formation, develop its economy and technology, and break the enemy castle. The opposing army is controlled by the AI. There is no online multiplayer or matchmaking.

## Run locally

From the repository root:

```sh
npm start
```

Open the local address printed by the server, then choose **Castle Strike** from the game hall. The game uses native JavaScript modules and requires a static HTTP server rather than opening its HTML file directly. There is no build step and no game backend. Any static host that serves the repository's files can host it.

## Build an army

Choose one of three factions: **Dawn Alliance**, **Ironclad Horde**, or **Hollow Covenant**. Each has eight regular unit types, a hero, and a distinct faction perk: stronger healing for the Alliance, faster movement for the Horde, and regeneration for the Covenant. Roles include frontline, ranged, cavalry, magic, support, siege, and flying units. Unit cards describe costs, supply, abilities, and favorable or unfavorable matchups. Easy, normal, and hard difficulty change how the AI builds its army.

Recruitment adds a unit to your permanent roster. Your roster deploys again on later waves, so an investment keeps contributing even after an individual fighter falls. Arrange units on the formation grid to screen vulnerable attackers with tougher frontline troops and give support units room to work. You can sell a selected roster unit for **70% of its purchase price**, rounded down; units already deployed finish the current battle, while that roster slot stops producing future reinforcements.

The match begins in preparation. Build and arrange your opening army, then launch the first wave. Subsequent waves deploy every **25 seconds**, with surviving units still on the battlefield. Several generations of troops can fight together. Each side has a castle and two defending towers; destroying the opposing castle wins the match.

## Develop your strategy

- **Income:** spend some of your gold on mines to improve the economy that funds later waves. Holding the central Sunwell grants an additional 1.8 gold per second.
- **Supply:** improve the War Camp to raise army supply from 24 toward a maximum of 72.
- **Technology:** advance the Citadel Age to unlock stronger units. Age II unlocks your faction hero; only one can belong to your roster, and its future reinforcements grow stronger every five waves.
- **Research:** Forged Weapons improves the attack damage of future reinforcements. Runic Armor improves their armor and health. Troops already fighting retain the stats they had when they deployed.
- **Army composition:** combine complementary roles and consider the opposing roster when choosing your next recruits.
- **Commander spells:** spend resources on tactical abilities; their cooldowns limit how frequently they can be used.

The battlefield displays the fight in real time, while its event feed and match statistics make progress easier to follow. Pause and speed controls let you plan carefully or move through combat more quickly.

| Commander spell | Effect |
| --- | --- |
| **Starfall** | Area magic damage, with reduced damage to structures |
| **War Cry** | Temporary attack speed and shields for nearby allies |
| **Restoration** | Area healing for allied units |

## Controls

Use the on-screen recruitment, research, formation, spell, and match controls. Clicking a unit card's portrait inspects the unit; its gold-and-plus purchase button recruits it. In formation view, click an occupied cell to select the unit, then click an empty cell to move its deployment position for future waves. The selected formation unit can also be sold.

Choose a commander spell, then click its target on the battlefield. War Cry and Restoration need allied units in the selected area. Spells become available once combat begins and require the battle to be running.

| Action | Control |
| --- | --- |
| Inspect a unit | Left-click or tap a unit or a card portrait |
| Recruit a unit | Click its gold-and-plus purchase button |
| Move a formation unit | Click its cell, then an empty destination cell |
| Zoom the battlefield | Mouse wheel or two-finger pinch |
| Pan the battlefield | Right-button drag or one-finger drag |
| Reset camera and zoom | Center-camera button |
| Change between battle and formation views | **F** or the on-screen view controls |
| Begin combat or pause/resume | **Space** or the on-screen match controls |
| Change combat speed | On-screen speed control |
| Target Starfall | **Q**, then click the battlefield |
| Target War Cry | **W**, then click near allied units |
| Target Restoration | **E**, then click near allied units |
| Cancel spell targeting or close a dialog | **Escape** |

## Saving

Castle Strike uses its own versioned browser save, separate from Clickstrike and the earlier Castle Strike prototype. Saves are local to the browser and site origin; changing browsers or moving between the local server and a hosted site does not transfer them. This rework does not migrate earlier prototype saves.

| Browser storage key | Contents |
| --- | --- |
| `castlestrike-v2-save` | Current Castle Strike 2.0 match |
| `castlestrike-v2-settings` | Castle Strike preferences |
| `castlestrike-v2-record` | Castle Strike match records |

## Presentation and assets

The battlefield uses a local copy of **Three.js** with original procedural fantasy unit models, animation, lighting, terrain, defensive structures, projectiles, and spell effects. The game does not fetch its rendering library from a CDN. If WebGL is unavailable, an illustrated Canvas battlefield keeps combat and formation interaction playable. Touch devices have a closer camera, drag and pinch controls, and a persistent battle command bar.

Each of the 27 units has a distinct painted portrait in its faction's `assets/portraits-alliance.png`, `assets/portraits-horde.png`, or `assets/portraits-undead.png` atlas. The portraits were created specifically for this project using the built-in ImageGen tool. The original twelve-portrait concept atlas is retained in `assets/portraits.png`. Their coordinates, generation prompts, and verification are documented in [faction-art-notes.md](assets/faction-art-notes.md) and [art-notes.md](assets/art-notes.md). Warcraft III and Direct Strike identify the gameplay and art-direction inspiration; this rework uses original unit models and portrait artwork.

Three.js is distributed under the MIT License. The bundled license and attribution are preserved in [vendor/THREE-LICENSE.txt](vendor/THREE-LICENSE.txt). Project source licensing is described in the repository's [LICENSE](../../LICENSE).

Cinzel and Inter are bundled locally under the SIL Open Font License, with their licenses in `assets/`. Interface icons and synthesized battle audio are original. Castle Strike requires no third-party network requests during play.

## Verification

`npm test` runs the deterministic simulation suite with Node's built-in test runner. It covers faction rosters, upgrades, counters, spells, healing, summons, shrine control, wave persistence, resource accounting, save validation, victory, defeat, and bounded matches.

With the local server running, `npm run test:browser` exercises the desktop and mobile interface and captures screenshots. `npm run test:edge` checks real victories and defeats, completed-match reloads, disabled storage, and damaged saves. These optional browser checks use Playwright and Chrome; install Playwright with `npm install --no-save playwright`, or set `PLAYWRIGHT_MODULE` to an existing installation's `index.mjs`. Set `BROWSER_EXECUTABLE` to use another Chromium executable and `BASE_URL` to test a different host.

Design references: [Direct Strike's gameplay overview](https://directstrike.net/guide/overview) and [Three.js documentation](https://threejs.org/manual/en/installation.html).

## Code layout

- `src/data.js` defines factions, units, research, and spells.
- `src/engine.js` runs the simulation independently of the page.
- `src/battlefield.js` renders the battlefield and handles camera interaction.
- `src/unit-models.js` builds the original unit models.
- `src/world-model.js` builds and textures the map and structures.
- `src/audio.js` synthesizes original sound effects after a user gesture.
- `game.js` connects the interface, simulation, renderer, and browser save.
- `vendor/three.module.js` provides the local rendering library.

Clickstrike remains a separate game in `games/clickstrike/`.
