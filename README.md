# Clickstrike

Browser idle clicker / continuous base assault. Mine gold, forage food, train troops, destroy the enemy keep.

## Play

Open `index.html` (or a local static server). No build step.

1. **Choose a hero** once per run (Bulwark, Bonesinger, or Raid Captain). New Game re-picks. Your champion is a capacity-free field unit each wave and buffs a playstyle.
2. **Mine Gold** / **Forage** and buy upgrades — the economy is the main game.
3. Wave 1 opens with a short **countdown**, then battle **always loops** — your keep (left) vs theirs (right). During countdown you can arm **Auto**, but training and War Chest wait until combat starts.
4. **Army** — click a unit card to train one (gold + food charged when training starts). Manual trains are faster than **Auto**; clicking while a train is in progress queues that type next. Toggle **Auto** on several cards to round-robin a mixed draft. **Drill Yard** shortens recruit time (with a floor so fights stay deliberate).
5. Troops exit your castle gate, fan out, and march on the enemy keep. Counter types matter: spears beat cavalry, archers beat infantry, knights beat ranged, riders beat backline (ranged, magic, support), mages shred armor, guardians beat magic, healers mend wounded allies and are soft vs cavalry. Fielding 2–3+ unit types grants a small damage bonus.
6. Deeper roster unlocks by wave (one-time gold fee): **Rider** (wave 3), **Healer** (wave 4), **Mage** (wave 5), **Guardian** (wave 7). Locked cards stay visible until you unlock them.
7. Your **army capacity** (base 10, raised by **Granary**) limits how many troops you can field (hero and bone minions do not count). Win the wave for a gold bonus and advance. Lose and you drop gold, food, and one wave (never below zero / wave 1).

### Heroes

| Hero | Role | Synergy |
|------|------|---------|
| **Bulwark** | Fat melee tank | Living ranged & magic allies deal +20% damage |
| **Bonesinger** | Necro magic DPS | Melee allies deal +15% damage; hero kills may raise short-lived bone minions (max 3) |
| **Raid Captain** | Fast cavalry commander | Allies +12% move speed; cavalry allies +20% damage |

Fallen heroes respawn at your gate after a short delay.

## Mobile

On narrow screens the UI switches to tabs (**Battle** / **Upgrades** / **Army**) with **Mine Gold**, **Forage**, and an **Army** sheet button pinned in a bottom dock (safe-area aware). Recruit UX matches desktop: tap a card to train one, use **Auto** to keep recruiting.

## Economy

- **Gold** — upgrades, troop pay, unit unlocks, and War Chest tactics. Win bonuses and enemy kills drip gold (kills are soft-capped so mining still matters).
- **Food** — larder stock spent only when you recruit. Forage and Foraging Camp fill the stockpile; kills scavenge a little food back. No continuous upkeep drain.
- **Hired Miners / Gather Crew** — buy auto-clickers in Treasury (Economy). Each level adds clicks/sec that fire real Mine / Forage actions (so they scale with Sharper Pick and Gather Baskets). Orbiting cursors jab the dock buttons while Auto is on; toggle Auto on the button once you own at least one level.
- Unit costs lean different ways (spearman food-heavy early, knight/guardian food-heavy mid, mage gold-heavy).
- **Granary** raises army capacity (+3 per level; hard ceiling ~40 for performance).
- **Plunder Maps** / **Caravan Guard** boost kill gold and win gold.
- **War Chest** (Treasury) — spend gold mid-fight on **Repair Keep** (restore HP) or **Catapult Strike** (enemy keep damage, once per wave).
- Upgrades split into **Economy** and **Troops** tabs under Treasury.
- **Troops** tab also covers **War Drums** (attack speed), **Field Medicine** (healer potency), and **Siege Works** (keep damage), alongside weapons, armor, vitality, and Drill Yard.

## Notes

Enemy packs mix archetypes (grunts, raiders, skirmishers, brutes, cultists, hounds). Waves ending in **3** open with a mini-boss; every **5th** wave opens with a larger named boss that summons minions (two at a time from wave 15). Keep adds slow while the boss lives, then return to normal pace. Player units auto-spawn from enabled unlocked types while you can afford them; counter-pick manually when the wave mix demands it. Numbers are placeholders to tune.

Progress autosaves in the browser (`localStorage`). Refresh resumes meta progress (gold, food, upgrades, wave, unlocks, auto-spawn toggles, hero); mid-battle fights are not restored — the next assault starts immediately.
