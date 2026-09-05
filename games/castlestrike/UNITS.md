# Castle Strike — Field Manual

Castle Strike is an original fantasy army-building auto-battler inspired by the permanent recruitment and reinforcement rhythm of Direct Strike. All characters, models and faction identities are original.

## The battle

- Start with 280 gold and three permanent recruits. Preparation has no timer: inspect the codex, arrange your army and spend your opening gold before starting.
- Every 25 seconds, your complete permanent roster deploys again. Survivors stay on the field. A fallen fighter is replaced automatically in the next wave; the roster is never consumed.
- Armies advance and fight automatically. Destroy the opposing citadel to win. Each citadel has 8,500 health and two 1,800-health defensive towers.
- Base income is 7 gold per second. The central Sunwell provides its owner another 1.8 gold per second. Units within 8 meters along the lane and 9 meters across it contest the shrine; greater army supply captures it over time.
- Income does not grow from kills, so a lost wave still leaves an opportunity to counter the enemy.
- At 7:55, damage against structures begins increasing. At 12:00, the Sunwell fractures and damages both citadels continuously. Holding the center slows that damage on your castle and accelerates it on the enemy. Even a perfect stalemate ends by 15:00.
- Battle speed changes simulation time only when the interface advances it. Pause freezes combat, income, cooldowns and reinforcement timers. Recruitment, research and formation planning remain available while paused.
- Save and continue preserves the full battlefield, enemy plans, random seed, timers, treasury and both permanent armies. Old or damaged saves are rejected.

## Army planning

- Recruitment prices are fixed. Every purchase adds one permanent formation entry. A faction hero is unique and first becomes available at Citadel Age II.
- There are 30 positions in a six-row, five-column formation. The rightmost column, nearest the river, is the frontline. Keep melee troops forward, casters and archers behind them, and siege engines at the rear. Moving into an occupied position swaps those two units.
- A formation edit affects the next wave; it does not teleport deployed units. Dismissing a recruit refunds 70% of its purchase price. Its currently deployed soldiers finish the battle.
- Supply begins at 24. War Camp research increases it by 12 per level to a maximum of 72. Both armies follow the same limit.
- At most 90 active units per side are simulated, including summons. Reinforcements that cannot fit wait for future waves; no supply is permanently lost.
- Heroes gain a level every five waves, receiving 12% more base health and 10% more base damage per level when they next deploy.
- Flying units ignore attacks from ordinary melee and siege units. Archers, spellcasters, pikes, raiders and crypt stalkers can hit them. Towers and citadels can also attack flying units.

## Damage and counters

Attack damage is multiplied by the attack type’s effectiveness, then divided by `1 + armor × 0.055`. Abilities, research and temporary shields modify that result. Armor has diminishing returns; no unit becomes immune by stacking armor.

| Attack type | Light armor | Medium armor | Heavy armor | Fortified / structures |
|---|---:|---:|---:|---:|
| normal | 1.1× | 1× | 0.9× | 0.65× |
| piercing | 1.35× | 1× | 0.65× | 0.5× |
| magic | 0.85× | 1× | 1.4× | 0.7× |
| siege | 1× | 1× | 1.1× | 2.15× |

Piercing attacks excel against fragile troops and flyers. Magic breaks heavy armor. Siege weapons demolish structures and grouped ground armies, but need protection from cavalry and flying units. Formation and army composition matter more than raw unit count.

## Research

Upgrades take effect immediately in your economy or recruitment options. Weapons and armor research apply to newly deployed units, including future reinforcements of your current roster.

| Research | First cost | Levels | Effect |
|---|---:|---:|---|
| Gold Mine | 145 | 4 | +2.2 gold per second, permanently. Early investment pays for a larger army. |
| Citadel Age | 260 | 2 | Unlock the next tier of units. Age II unlocks your faction hero. |
| Forged Weapons | 180 | 3 | +12% attack damage for all future reinforcements. |
| Runic Armor | 170 | 3 | +2 armor and +8% health for all future reinforcements. |
| War Camp | 155 | 4 | +12 army supply, up to 72. Arrange your army across 30 formation positions. |

Each next level costs `round(first cost × 1.65^current level)`. Citadel Age begins at I; its two research levels unlock Ages II and III. Fully upgraded mines add 8.8 gold per second.

## Commander spells

Select a spell and click its target on the battlefield. Spells use the same gold treasury as recruiting, so their immediate impact comes at the cost of a permanent investment. Healing and rallying require allied troops in the target area.

| Spell | Gold | Cooldown | Effect |
|---|---:|---:|---|
| Starfall | 65 | 45s | Deal 145 magic damage to enemies in a 6-meter area. Deals reduced damage to structures. |
| War Cry | 45 | 38s | Allies within 9 meters gain 35% attack speed and a 70-point shield for 10 seconds. |
| Restoration | 50 | 42s | Restore 150 health to allied units in an 8-meter area. |

## The opposing commander

The opponent pays the same prices from the same starting treasury and earns the same base income, mine income and shrine bonus. It cannot create free recruits or upgrades. It saves for expensive units, invests in mines, advances through the ages and builds a mixed army. Normal and Hard respond to the broad composition of your roster; Easy makes slower, less targeted decisions. Hard makes decisions more frequently. Commander spells are the player’s additional tactical advantage.

## Dawn Alliance

Disciplined shield lines, precision archers and spellcasters. Keep your healers behind a durable vanguard, then break the gates with siege engines.

**Faction trait:** Sanctuary · healing received +15%.

| Unit | Tier | Gold | Supply | Health | Damage | Armor | Range | Attack interval |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Dawnshield | 1 | 100 | 2 | 390 | 24 | 5 | 1.65 | 1.15s |
| Silverleaf Ranger | 1 | 120 | 2 | 215 | 32 | 1 | 10 | 1.25s |
| Kingsguard Pike | 1 | 90 | 2 | 290 | 25 | 3 | 2.7 | 1.25s |
| Sunward Cavalier | 2 | 245 | 4 | 640 | 47 | 7 | 1.9 | 1.2s |
| Lightkeeper | 2 | 190 | 3 | 260 | 13 | 1 | 8.5 | 1.6s |
| Tempest Arcanist | 2 | 225 | 3 | 255 | 50 | 0 | 9.5 | 1.6s |
| Stormbreak Ballista | 3 | 345 | 5 | 435 | 100 | 2 | 15 | 3.4s |
| Stormwing | 3 | 385 | 5 | 525 | 62 | 3 | 7.8 | 1.6s |
| Aldric, the Dawnbringer ★ | 2 | 470 | 6 | 1060 | 58 | 8 | 2 | 1.3s |

### Dawnshield

A steadfast shieldbearer who buys time for the back line. **normal damage; heavy armor.**

**Shieldwall:** Takes 22% less damage from ranged attacks.

**Strong against:** Archers, Light infantry. **Vulnerable to:** Spellcasters, Siege damage.

### Silverleaf Ranger

Longbows punish exposed skirmishers and airborne beasts. **piercing damage; light armor.**

**Skyhunter:** Deals 35% more damage to flying units.

**Strong against:** Flying units, Light armor. **Vulnerable to:** Heavy armor, Cavalry.

### Kingsguard Pike

An inexpensive answer to charging riders and aerial raids. **normal damage; medium armor.**

**Brace:** Deals 55% more damage to cavalry. Can strike low-flying units.

**Strong against:** Cavalry, Flying units. **Vulnerable to:** Archers, Area damage.

### Sunward Cavalier

A fast, heavily armored rider built to smash a vulnerable flank. **normal damage; heavy armor.**

**Lance Charge:** The first strike deals 90% bonus damage and stuns for 1 second.

**Strong against:** Archers, Support units. **Vulnerable to:** Pikes, Magic damage.

### Lightkeeper

A fragile healer who keeps expensive frontline units in the fight. **magic damage; light armor.**

**Renewal:** Every 4 seconds, heals the most wounded ally within 11 meters for 65 health.

**Strong against:** Sustained combat, Heavy armor. **Vulnerable to:** Cavalry, Burst damage.

### Tempest Arcanist

Crackling arcane bolts unravel clustered armored formations. **magic damage; light armor.**

**Chain Lightning:** Every third attack jumps to two nearby enemies for 55% damage.

**Strong against:** Heavy armor, Packed formations. **Vulnerable to:** Cavalry, Light skirmishers.

### Stormbreak Ballista

An imposing engine with the reach to dismantle castle defenses. **siege damage; fortified armor.**

**Shattershot:** Shots deal 55% splash damage within 3.5 meters. Siege damage devastates structures.

**Strong against:** Structures, Dense infantry. **Vulnerable to:** Flying units, Flanking cavalry.

### Stormwing

An armored storm rider who sails above the melee. **magic damage; light armor.**

**Thunderclap:** Attacks splash for 40% damage within 2.8 meters.

**Strong against:** Ground melee, Heavy armor. **Vulnerable to:** Skyhunters, Webs and nets.

### Aldric, the Dawnbringer

A radiant commander whose presence turns a shield line into a fortress. **normal damage; heavy armor.**

**Beacon of Dawn:** Nearby allies gain 2 armor. Every 7 seconds, heals allies within 6 meters for 55. Gains strength every 5 waves.

**Strong against:** Attrition, Physical armies. **Vulnerable to:** Magic focus fire, Dispersed fights.

## Ironclad Horde

Aggressive warriors, venomous hunters and colossal beasts. Overwhelm a flank with raiders and turn the entire warband loose with bloodlust.

**Faction trait:** Warpath · movement speed +8%.

| Unit | Tier | Gold | Supply | Health | Damage | Armor | Range | Attack interval |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Ironhide Grunt | 1 | 105 | 2 | 420 | 29 | 3 | 1.7 | 1.3s |
| Venom Hunter | 1 | 115 | 2 | 230 | 28 | 1 | 9 | 1.25s |
| Warg Raider | 1 | 170 | 3 | 365 | 34 | 2 | 2.4 | 1.15s |
| Stormcaller | 2 | 195 | 3 | 275 | 24 | 1 | 8.5 | 1.6s |
| Ironmaw Berserker | 2 | 220 | 3 | 570 | 49 | 4 | 1.9 | 1.45s |
| Ember Demolisher | 2 | 290 | 4 | 380 | 82 | 1 | 13.5 | 3.1s |
| Earthshaker | 3 | 360 | 5 | 1000 | 66 | 6 | 2.2 | 1.9s |
| Plaguewing | 3 | 350 | 5 | 450 | 63 | 2 | 8 | 1.5s |
| Korr, the Ashblade ★ | 2 | 470 | 6 | 865 | 68 | 5 | 2.2 | 1.1s |

### Ironhide Grunt

A brutal axe fighter who becomes deadlier as the battle wears on. **normal damage; heavy armor.**

**Blood Fury:** Deals 35% more damage while below half health.

**Strong against:** Light infantry, Close combat. **Vulnerable to:** Magic damage, Kiting.

### Venom Hunter

Thrown spears leave a lingering sting in beasts and fragile troops. **piercing damage; light armor.**

**Venom Tips:** Attacks poison their target for 5 damage per second over 5 seconds. Poison refreshes; it does not stack.

**Strong against:** Flying units, Light armor. **Vulnerable to:** Heavy armor, Healing.

### Warg Raider

Fast wolf riders drag flying prey into reach and harry back lines. **normal damage; medium armor.**

**Ensnare:** Every 5 seconds, roots the target for 2 seconds. Can attack flying units.

**Strong against:** Flying units, Exposed support. **Vulnerable to:** Pikes, Heavy frontline.

### Stormcaller

An elemental mystic who drives warriors into a killing frenzy. **magic damage; light armor.**

**Bloodlust:** Every 8 seconds, grants 30% attack speed to up to 4 nearby allies for 7 seconds.

**Strong against:** Large warbands, Heavy armor. **Vulnerable to:** Cavalry, Area damage.

### Ironmaw Berserker

A veteran wielding a great axe that cuts through crowded ranks. **normal damage; heavy armor.**

**Sweeping Cleave:** Melee attacks deal 45% damage to enemies within 2.8 meters of the target.

**Strong against:** Mass infantry, Summons. **Vulnerable to:** Flying units, Magic damage.

### Ember Demolisher

A lumbering siege cart hurling cauldrons of burning pitch. **siege damage; fortified armor.**

**Burning Pitch:** Shots splash for 45% damage within 3 meters and burn the main target for 6 damage per second.

**Strong against:** Structures, Packed formations. **Vulnerable to:** Flying units, Cavalry.

### Earthshaker

A towering horned guardian who breaks enemy lines underfoot. **normal damage; heavy armor.**

**War Stomp:** Every 6 seconds in melee, deals 55 damage and stuns enemies within 4 meters for 1 second.

**Strong against:** Mass infantry, Melee armies. **Vulnerable to:** Flying units, Focused magic.

### Plaguewing

A venomous drake that hunts archers and unguarded siege engines. **piercing damage; light armor.**

**Virulent Sting:** Attacks poison their target for 9 damage per second over 6 seconds.

**Strong against:** Ground melee, Light armor. **Vulnerable to:** Archers, Healing and nets.

### Korr, the Ashblade

A relentless duelist whose whirling blade carves open the enemy flank. **normal damage; heavy armor.**

**Bladestorm:** Every third strike deals 180% damage and cleaves nearby enemies. Gains strength every 5 waves.

**Strong against:** Support units, Grouped melee. **Vulnerable to:** Crowd control, Focused magic.

## Hollow Covenant

Relentless revenants, unnatural plagues and frostbound monsters. Sustain a growing host while curses and summoned skeletons grind the enemy down.

**Faction trait:** Unhallowed · regenerate 0.35% health each second.

| Unit | Tier | Gold | Supply | Health | Damage | Armor | Range | Attack interval |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Graveborn | 1 | 85 | 2 | 305 | 25 | 1 | 1.6 | 1s |
| Bone Sentinel | 1 | 95 | 2 | 300 | 24 | 4 | 1.8 | 1.3s |
| Crypt Stalker | 1 | 145 | 3 | 320 | 37 | 2 | 9 | 1.4s |
| Graveweaver | 2 | 210 | 3 | 245 | 23 | 0 | 9 | 1.55s |
| Veil Siren | 2 | 205 | 3 | 280 | 41 | 1 | 10 | 1.5s |
| Plague Colossus | 2 | 275 | 4 | 835 | 47 | 4 | 2.1 | 1.8s |
| Sepulcher Engine | 3 | 335 | 5 | 470 | 94 | 2 | 14.5 | 3.3s |
| Frostbound Wyrm | 3 | 410 | 6 | 650 | 73 | 3 | 8.5 | 1.9s |
| Morvath, the Hollow King ★ | 2 | 470 | 6 | 1025 | 61 | 7 | 2.2 | 1.4s |

### Graveborn

A tireless scavenger whose claws sustain it through the melee. **normal damage; medium armor.**

**Ravenous:** Heals for 24% of attack damage dealt to units.

**Strong against:** Exposed archers, Small skirmishes. **Vulnerable to:** Heavy armor, Area damage.

### Bone Sentinel

A rusted shield and ancient bones, sworn to serve beyond death. **normal damage; heavy armor.**

**Unbroken:** Reassembles once with 35% health when slain. Summoned skeletons cannot reassemble.

**Strong against:** Physical damage, Attrition. **Vulnerable to:** Magic damage, Siege splash.

### Crypt Stalker

An armored arachnid that pins aerial threats beneath barbed webs. **piercing damage; medium armor.**

**Graveweb:** Attacks slow flying units by 60% and deal 30% bonus damage to them.

**Strong against:** Flying units, Light armor. **Vulnerable to:** Heavy armor, Siege splash.

### Graveweaver

A dark ritualist who swells the ranks with expendable servants. **magic damage; light armor.**

**Raise the Fallen:** Every 12 seconds in battle, summons 2 fragile skeletons for 22 seconds. At most 4 per caster.

**Strong against:** Single-target armies, Attrition. **Vulnerable to:** Area damage, Cavalry.

### Veil Siren

A sorrowful spirit whose curse cripples powerful enemy champions. **magic damage; light armor.**

**Withering Curse:** Attacks reduce the target’s damage by 22% for 6 seconds.

**Strong against:** Heroes, Heavy armor. **Vulnerable to:** Mass infantry, Light skirmishers.

### Plague Colossus

A shambling wall of stitched flesh, surrounded by choking decay. **normal damage; heavy armor.**

**Carrion Cloud:** Deals 8 magic damage per second to ground enemies within 3.5 meters.

**Strong against:** Mass infantry, Long melees. **Vulnerable to:** Flying units, Focused magic.

### Sepulcher Engine

A bone-bound engine that hurls restless souls at castle walls. **siege damage; fortified armor.**

**Soulburst:** Shots deal 55% splash damage within 3.5 meters. Siege damage devastates structures.

**Strong against:** Structures, Mass infantry. **Vulnerable to:** Flying units, Cavalry.

### Frostbound Wyrm

An ancient skeletal dragon trailing a storm of killing frost. **magic damage; light armor.**

**Winter’s Breath:** Attacks splash for 40% damage within 3 meters and slow victims by 35% for 3 seconds.

**Strong against:** Heavy armor, Ground armies. **Vulnerable to:** Archers, Webs and nets.

### Morvath, the Hollow King

An immortal king leading his cursed host toward one final conquest. **normal damage; heavy armor.**

**Death’s Embrace:** Every 6 seconds, heals nearby allies for 40 and strikes nearby enemies for 35 magic damage. Gains strength every 5 waves.

**Strong against:** Attrition, Grouped melee. **Vulnerable to:** Ranged focus fire, Magic damage.

## Opening suggestions

- **Dawn Alliance:** add a Dawnshield and a ranger, then invest in a mine. Age II Lightkeepers turn a durable frontline into a sustained push; Tempest Arcanists answer armored opponents.
- **Ironclad Horde:** build a core of grunts and hunters before overinvesting in raiders. A Stormcaller rewards a larger melee force. Mix siege into the warband once the opposing army is contained.
- **Hollow Covenant:** Bone Sentinels hold enemies in place for Crypt Stalkers. At Age II, choose Graveweavers against single-target armies or Veil Sirens against armored elites. Protect casters from flanking cavalry.

**Source of truth:** `src/data.js` contains unit and upgrade definitions; `src/engine.js` contains the deterministic simulation. This manual describes the reworked game, save version 2.
