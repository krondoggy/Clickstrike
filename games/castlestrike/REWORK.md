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

- **Income:** start with 280 gold. Both sides receive 100 gold every 20 battle seconds, with the first payment 20 seconds after launch. The gold panel shows the next payment and a countdown. Preparation and pause freeze the clock; gold does not trickle in between paydays.
- **Mines and map control:** each mine adds 10 gold to every payday, up to four mines. Wait 90 battle seconds between mine purchases. The first mine costs 145 and takes 15 paydays to earn its cost back; protect your army before investing. Holding the central Sunwell adds another 10 gold per payday. These rates follow [Warcraft III Direct Strike's economy](https://directstrike.net/guide/overview), while Castle Strike keeps its own prices and 25-second waves.
- **Supply:** improve the War Camp to raise army supply from 24 toward a maximum of 72.
- **Technology:** advance the Citadel Age to unlock stronger units. Age II unlocks your faction hero; only one can belong to your roster, and its future reinforcements grow stronger every five waves.
- **Research:** Forged Weapons improves the attack damage of future reinforcements. Runic Armor improves their armor and health. Troops already fighting retain the stats they had when they deployed.
- **Army composition:** combine complementary roles and consider the opposing roster when choosing your next recruits.
- **Commander spells:** spend resources on tactical abilities; their cooldowns limit how frequently they can be used.

The battlefield displays the fight in real time, while its event feed and match statistics make progress easier to follow. Pause and speed controls let you plan carefully or move through combat more quickly.

The AI uses the same treasury, payday, upgrade costs, and mine cooldown. It establishes its army before its first mine, considers a second only after eight minutes, and favors reinforcements when it is losing ground.

| Commander spell | Effect |
| --- | --- |
| **Starfall** | Area magic damage, with reduced damage to structures |
| **War Cry** | Temporary attack speed and shields for nearby allies |
| **Restoration** | Area healing for allied units |

## Automatic tactics and counters

Every attack has a committed windup, release, and impact. Death or stun cancels an unreleased strike; released missiles finish their journey to the original target. Siege weapons commit to a ground position. Starfall lands after 1.4 seconds and damages whoever occupies its area then. Simultaneous lethal attacks can trade.

Ground bodies and engagement positions make formations protective. Fast flankers seek exposed archers and casters without crossing intact defenders. Ranged troops briefly retreat, then commit to fighting; healers follow screens. Anti-air specialists favor reachable flyers, armor breakers prefer heavy targets, and protected siege seeks clusters and defenses. These behaviors are automatic.

A Cavalier needs a four-meter run-up. Pikes and Bone Sentinels standing still for half a second and facing the rider cancel its charge bonus and stun. Pikes keep their extra anti-cavalry damage. Stormcallers retain Bloodlust and apply a non-stacking three-point armor break for five seconds against heavy targets.

Roots prevent movement but permit attacks; stuns also interrupt attacks. Neither extends an active disable, and both respect a shared two-second recovery afterward. Poison and slow sources retain independent expiry times, so weaker effects cannot prolong a stronger magnitude. Duplicate buffs, auras, and armor breaks do not add their strengths. Ground cleaves, plague, stomps, and siege splash cannot damage flyers.

Scout recommendations name recruits from your faction, their price, required age, and why they help. **Last 25 seconds** reports actual damage, effective healing, absorbed shielding, and each side's leading damage source. It uses time because successive waves overlap. [BALANCE.md](BALANCE.md) records measured encounters and remaining limitations.

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
| Adjust sound, music, and their volume balance | Speaker button in the top bar |

## Saving

Castle Strike uses its own versioned browser save, separate from Clickstrike and the earlier Castle Strike prototype. Saves are local to the browser and site origin; changing browsers or moving between the local server and a hosted site does not transfer them. This rework does not migrate earlier prototype saves.

Existing version 2 campaigns survive the economy update. Gold, armies, research, and earned-gold totals are preserved; old continuous-income rates are replaced with the new payment preview and a countdown to the next 20-second boundary. New saves also preserve the exact payday and mine cooldown, including saves immediately before or after a payment.

| Browser storage key | Contents |
| --- | --- |
| `castlestrike-v2-save` | Current Castle Strike 2.0 match |
| `castlestrike-v2-settings` | Castle Strike preferences |
| `castlestrike-v2-record` | Castle Strike match records |

Combat saves use internal version 3 through the existing `castlestrike-v2-save` key. Version 2 migration preserves armies, treasury, research, records, and deployed health. Legacy cosmetic effects never replay damage. New saves retain windups, released missiles, ground impacts, control recovery, and individual status expirations; loading during an attack cannot skip or duplicate its hit.

## Presentation and assets

The battlefield uses a local copy of **Three.js** with original procedural fantasy unit models, animation, lighting, terrain, defensive structures, projectiles, and spell effects. The game does not fetch its rendering library from a CDN. If WebGL is unavailable, an illustrated Canvas battlefield keeps combat and formation interaction playable. Touch devices have a closer camera, drag and pinch controls, and a persistent battle command bar.

Movement and turning interpolate between simulation updates at every display frame. Attacks have windup, strike, and recovery poses; cavalry legs, siege wheels, projectile flight, and falling troops share the battle clock. Pause freezes these animations, and speed controls change their pace together with combat.

Attack animation, sound, health changes, and structure destruction share simulation event times. Arrows, bolts, siege ammunition, nets, lightning, healing links, and hero pulses use distinct effects. Persistent glyphs identify shields, poison, curse, haste, frost, roots, stuns, and armor breaks. Low quality caps overlapping effects; reduced motion suppresses decorative movement while preserving readable contact. Presentation limits cannot remove gameplay projectiles.

Each of the 27 units has a distinct painted portrait in its faction's `assets/portraits-alliance.png`, `assets/portraits-horde.png`, or `assets/portraits-undead.png` atlas. The portraits were created specifically for this project using the built-in ImageGen tool. The original twelve-portrait concept atlas is retained in `assets/portraits.png`. Their coordinates, generation prompts, and verification are documented in [faction-art-notes.md](assets/faction-art-notes.md) and [art-notes.md](assets/art-notes.md). Warcraft III and Direct Strike identify the gameplay and art-direction inspiration; this rework uses original unit models and portrait artwork.

Three.js is distributed under the MIT License. The bundled license and attribution are preserved in [vendor/THREE-LICENSE.txt](vendor/THREE-LICENSE.txt). Project source licensing is described in the repository's [LICENSE](../../LICENSE).

Cinzel and Inter are bundled locally under the SIL Open Font License, with their licenses in `assets/`. Interface icons and additional synthesized effect layers are original. Recorded vocal performances, swords, bows, and impact foley are bundled under CC BY 3.0 or CC0; attribution and adaptation notes are available in [Sound credits](../../assets/audio/sfx/credits.html) and from the audio settings. Castle Strike also plays the project's existing local `07-human-1.mp3` and `13-arrival-at-kalimdor.mp3` music tracks in a repeating playlist. Music begins after your first interaction. The speaker button opens independent master, battle effects, and music volume sliders, music and audio toggles, and a battle-sound preview; preferences persist between visits. Pause softens the music, and a hidden browser tab suspends it. Castle Strike requires no third-party network requests during play.

Battle effects include recorded human and creature death cries, armor and body falls, shattering bones, steel clashes, bow releases, arrow impacts, siege launches, and crumbling structures. Sounds pan with battlefield position. Casualties have priority in crowded fights, with bounded simultaneous voices and independent music/effect levels. Recordings preload once after the first gesture; loading never replays an old casualty. The audio preview sequences a weapon clash, bow release, arrow landing, and a falling warrior, including while the match is paused.

## Verification

`npm test` runs the deterministic simulation suite with Node's built-in test runner. It covers faction rosters, upgrades, counters, spells, healing, summons, shrine control, wave persistence, exact payday timing, mine limits and cooldowns, fair AI spending, legacy economy migration, save boundaries, victory, defeat, and bounded matches.

With the local server running, `npm run test:browser` exercises the desktop and mobile interface and captures screenshots. `npm run test:edge` checks real victories and defeats, completed-match reloads, disabled storage, and damaged saves. These optional browser checks use Playwright and Chrome; install Playwright with `npm install --no-save playwright`, or set `PLAYWRIGHT_MODULE` to an existing installation's `index.mjs`. Set `BROWSER_EXECUTABLE` to use another Chromium executable and `BASE_URL` to test a different host.

`npm run test:motion` checks frame-by-frame movement, weapon poses, projectiles, and pause behavior in the browser. `npm run test:audio` checks native music playback and playlist transitions, measured sound output, and audio lifecycle behavior. `npm run test:pacing` checks the payday and mine countdown interface, audio controls, and saved preferences on desktop and mobile.

Design references: [Direct Strike's gameplay overview](https://directstrike.net/guide/overview) and [Three.js documentation](https://threejs.org/manual/en/installation.html).

`npm run test:combat` checks damage/contact alignment, status markers, scouting, the battle report, reduced motion, mobile, and Canvas fallback. `npm run test:balance` runs seeded, mirrored, gold-matched encounters through the actual simulation and explicitly reports failed thresholds and untested budgets. `npm run test:performance` compares a fixed 180-model scene and crowded simulation steps in Chrome. These local timings are diagnostics, not a hardware-independent frame-rate guarantee.

## Code layout

- `src/data.js` defines factions, units, research, and spells.
- `src/engine.js` runs the simulation independently of the page.
- `src/battlefield.js` renders the battlefield and handles camera interaction.
- `src/render-motion.js` interpolates presentation snapshots without changing combat outcomes.
- `src/unit-models.js` builds the original unit models.
- `src/world-model.js` builds and textures the map and structures.
- `src/audio.js` mixes locally bundled recordings, synthesized effect layers, and the music playlist after a user gesture.
- `game.js` connects the interface, simulation, renderer, and browser save.
- `vendor/three.module.js` provides the local rendering library.

Clickstrike remains a separate game in `games/clickstrike/`.
