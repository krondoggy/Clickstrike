# Clickstrike

Browser idle clicker / continuous base assault. Mine gold, forage food, auto-spawn troops, destroy the enemy keep.

## Play

Open `index.html` (or a local static server). No build step.

1. **Mine Gold** / **Forage** and buy upgrades — the economy is the main game.
2. Wave 1 opens with a short **countdown**, then battle **always loops** — your keep (left) vs theirs (right).
3. **Army** — tap Spearman / Archer / Knight to toggle auto-train (gold + food charged when training starts). A progress bar fills, then the unit deploys. Shift+click queues one train. **Drill Yard** upgrades shorten recruit time.
4. Living troops drain food (upkeep). Win the wave for a gold bonus and advance. Lose and you drop gold, food, and one wave (never below zero / wave 1).

## Economy

- **Gold** — upgrades and troop pay. Win bonuses are gold-only.
- **Food** — troop recruit cost + field upkeep. Stronger passive farms than gold; weaker click upgrades.
- Unit costs lean different ways (spearman food-heavy, knight gold-heavy).
- Food upkeep is the real army limit (soft field cap ~40 per side for performance).

## Notes

Enemy auto-spawns. Player units auto-spawn from enabled types while you can afford them. Numbers are placeholders to tune.

Progress autosaves in the browser (`localStorage`). Refresh resumes meta progress (gold, food, upgrades, wave, auto-spawn toggles); mid-battle fights are not restored — the next assault starts immediately.
