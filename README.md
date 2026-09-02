# Clickstrike

A hall of browser games. The first campaign is an idle clicker / continuous base assault: mine gold, forage food, train troops, destroy the enemy keep.

**Play online:** [https://krondoggy.github.io/Clickstrike/](https://krondoggy.github.io/Clickstrike/)

The home page lists every game. Clickstrike lives at [games/clickstrike](https://krondoggy.github.io/Clickstrike/games/clickstrike/). **Castle Strike** (Direct Strike-style roster tug-of-war) lives at [games/castlestrike](https://krondoggy.github.io/Clickstrike/games/castlestrike/).

## Castle Strike

Inspired by Warcraft III **Direct Strike**. Passive gold economy — buy units into a permanent roster (Militia through Catapult plus core counters), place each wave on the spawn grid while survivors keep fighting, and every ~30 seconds your army marches against an AI building under the same rules. Roster size starts at 2 and grows by 1 each wave, so early waves stay small. From wave 4 hire one **Champion** (Bulwark, Bonesinger, or Raid Captain) with team auras; rez with gold if they fall during the countdown. **Research** owned unit types (+16% HP / +14% ATK per level, up to 3) and upgrade your **towers** (+HP, +ATK, +range) from the Mercenary Camp Research tab — living fighters and standing towers get stronger immediately. Units use signature abilities (Brace, Volley, Charge, Aegis, etc.) and lane-aware combat AI. Destroy the enemy castle before yours falls.

Open `games/castlestrike/index.html` from the hall or directly.

## Clickstrike

Open `index.html` (or a local static server). No build step. From the hall, open a game card — or go straight to `games/clickstrike/index.html`.

1. **Mine Gold** / **Forage** and buy upgrades — the economy is the main game. Hire **miners** and **foragers** in Treasury (Economy): each one auto-clicks once per second at **40% of your manual click yield**. **Mining Drill** / **Forage Tools** make them click faster. Manual clicking stays full strength.
2. Wave 1 opens with a short **countdown**, then battle **always loops** — your keep (left) vs theirs (right). During countdown you can arm **Auto**, but training and War Chest wait until combat starts.
3. **Army** — hire an expensive **hero** (gold + food sink), then train troops. Click a unit card to train one (gold + food charged when training starts). Manual trains are faster than **Auto**; clicking while a train is in progress queues that type next. Toggle **Auto** on several cards to round-robin a mixed draft. **Drill Yard** shortens recruit time (with a floor so fights stay deliberate).
4. Troops exit your castle gate, fan out, and march on the enemy keep. Counter types matter: spears beat cavalry, archers beat infantry, knights beat ranged, riders beat backline (ranged, magic, support), mages shred armor, guardians beat magic, healers mend wounded allies and are soft vs cavalry. Fielding 2–3+ unit types grants a small damage bonus.
5. Deeper roster unlocks by wave (one-time gold fee): **Rider** (wave 3), **Healer** (wave 4), **Mage** (wave 5), **Guardian** (wave 7). Locked cards stay visible until you unlock them.
6. Your **army capacity** (base 10, raised by **Granary**) limits how many troops you can field (hero and bone minions do not count). Win the wave for a gold bonus and advance. Lose and you drop gold, food, and one wave (never below zero / wave 1).

### Heroes

Hire one champion from the Army panel (Bulwark, Bonesinger, or Raid Captain). Hire costs are a large gold + food sink. Heroes do **not** free-respawn — when they fall, pay **40%** of that hero's hire cost to **Rez** them. Replacing with a different hero costs the new hero's full hire.

| Hero | Role | Synergy |
|------|------|---------|
| **Bulwark** | Fat melee tank | Living ranged & magic allies deal +20% damage |
| **Bonesinger** | Necro magic DPS | Melee allies deal +15% damage; hero kills may raise short-lived bone minions (max 3) |
| **Raid Captain** | Fast cavalry commander | Allies +12% move speed; cavalry allies +20% damage |

## Mobile

On narrow screens the UI switches to tabs (**Battle** / **Upgrades** / **Army**) with **Mine Gold**, **Forage**, and an **Army** sheet button pinned in a bottom dock (safe-area aware). Recruit UX matches desktop: tap a card to train one, use **Auto** to keep recruiting.

## Economy

- **Gold** — upgrades, troop pay, unit unlocks, hero hire/rez, and War Chest tactics. Win bonuses and enemy kills drip gold (kills are soft-capped so mining still matters).
- **Food** — larder stock spent when you recruit or hire/rez heroes, plus **continuous army upkeep** while fighting (0.12 food/s per unit, 0.5 food/s for your hero). Forage and Foraging Camp fill the stockpile; kills scavenge a little food back. The top bar shows **net food rate** (income minus upkeep). At zero food with active upkeep, your army **starves**: −35% damage, healers stop, recruiting blocked, and units desert over time.
- **Hired Miner / Gather Crew** — each level hires one worker who auto-clicks once/sec at 40% yield. Toggle **Auto** on the dock button after your first hire. **Mining Drill** and **Forage Tools** speed them up (+15% per level). Orbiting cursors show how many you have.
- Unit costs lean different ways (spearman food-heavy early, knight/guardian food-heavy mid, mage gold-heavy).
- **Granary** raises army capacity (+3 per level; hard ceiling ~40 for performance) and reduces upkeep (−2% per level, max −40%).
- **Plunder Maps** / **Caravan Guard** boost kill gold and win gold.
- **War Chest** (Treasury) — spend gold mid-fight on **Repair Keep** (restore HP) or **Catapult Strike** (enemy keep damage, once per wave).
- Upgrades split into **Economy** and **Troops** tabs under Treasury.
- **Troops** tab also covers **War Drums** (attack speed), **Field Medicine** (healer potency), and **Siege Works** (keep damage), alongside weapons, armor, vitality, and Drill Yard.

## Notes

Enemy packs mix archetypes (grunts, raiders, skirmishers, brutes, cultists, hounds). Waves ending in **3** open with a mini-boss; every **5th** wave opens with a larger named boss that summons minions (two at a time from wave 15). Keep adds slow while the boss lives, then return to normal pace. Player units auto-spawn from enabled unlocked types while you can afford them; counter-pick manually when the wave mix demands it. Balance is tuned for v1.0.

Progress autosaves in the browser (`localStorage`). Refresh resumes meta progress (gold, food, upgrades, wave, unlocks, auto-spawn toggles, hired hero / down state); mid-battle fights are not restored — the next assault starts immediately.

## Music

Background tracks: `07-human-1.mp3`, `13-arrival-at-kalimdor.mp3` (included for personal use in this project).

## Site layout

- `index.html` — game hall (home)
- `shared/theme.css` — colors, fonts, stone/gold panel chrome used by every page
- `shared/hub.css` — home layout
- `games/<name>/` — one folder per game (`index.html`, scripts, game CSS)

To add a game: create `games/<name>/`, import `../../shared/theme.css`, and add a card on the home page.

## Deploy (GitHub Pages)

1. Push to `main` — the GitHub Action in `.github/workflows/deploy-pages.yml` deploys the site.
2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Live URL: [https://krondoggy.github.io/Clickstrike/](https://krondoggy.github.io/Clickstrike/)

## License

MIT — see [LICENSE](LICENSE).
