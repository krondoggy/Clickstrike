# Clickstrike

Browser idle clicker / continuous base assault. Mine gold, forage food, train troops, destroy the enemy keep.

## Play

Open `index.html` (or a local static server). No build step.

1. **Mine Gold** / **Forage** and buy upgrades — the economy is the main game.
2. Wave 1 opens with a short **countdown**, then battle **always loops** — your keep (left) vs theirs (right). During countdown you can arm **Auto**, but training and War Chest wait until combat starts.
3. **Army** — click a unit card to train one (gold + food charged when training starts). Manual trains are faster than **Auto**; clicking while a train is in progress queues that type next. Toggle **Auto** on several cards to round-robin a mixed draft. **Drill Yard** shortens recruit time (with a floor so fights stay deliberate).
4. Troops exit your castle gate, fan out, and march on the enemy keep. Counter types matter: spears beat cavalry, archers beat infantry, knights beat ranged, riders beat backline, mages shred armor, guardians beat magic. Fielding 2–3+ unit types grants a small damage bonus.
5. Deeper roster unlocks by wave (one-time gold fee): **Rider** (wave 3), **Mage** (wave 5), **Guardian** (wave 7). Locked cards stay visible until you unlock them.
6. Living troops drain food (upkeep). Win the wave for a gold bonus and advance. Lose and you drop gold, food, and one wave (never below zero / wave 1).

## Mobile

On narrow screens the UI switches to tabs (**Battle** / **Upgrades** / **Army**) with **Mine Gold**, **Forage**, and an **Army** sheet button pinned in a bottom dock (safe-area aware). Recruit UX matches desktop: tap a card to train one, use **Auto** to keep recruiting.

## Economy

- **Gold** — upgrades, troop pay, unit unlocks, and War Chest tactics. Win bonuses and enemy kills drip gold (kills are soft-capped so mining still matters).
- **Food** — troop recruit cost + field upkeep. Stronger passive farms than gold; weaker click upgrades.
- Unit costs lean different ways (spearman food-heavy early, knight/guardian food-heavy mid, mage gold-heavy).
- Food upkeep is the real army limit (soft field cap ~40 per side for performance). **Granary** cuts upkeep per level.
- **Plunder Maps** / **Caravan Guard** boost kill gold and win gold.
- **War Chest** (Treasury) — spend gold mid-fight on **Repair Keep** (restore HP) or **Catapult Strike** (enemy keep damage, once per wave).
- Upgrades split into **Economy** and **Troops** tabs under Treasury.

## Notes

Enemy packs mix archetypes (grunts, raiders, skirmishers, brutes, cultists, hounds). Waves ending in **3** open with a mini-boss; every **5th** wave opens with a named boss. Player units auto-spawn from enabled unlocked types while you can afford them; counter-pick manually when the wave mix demands it. Numbers are placeholders to tune.

Progress autosaves in the browser (`localStorage`). Refresh resumes meta progress (gold, food, upgrades, wave, unlocks, auto-spawn toggles); mid-battle fights are not restored — the next assault starts immediately.
