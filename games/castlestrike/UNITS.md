# Castle Strike — Field Manual

Castle Strike is an original fantasy army-building auto-battler inspired by the permanent recruitment and reinforcement rhythm of Direct Strike. All characters, models and faction identities are original.

## The battle

- Start with 280 gold and three permanent recruits. Preparation has no timer: inspect the codex, arrange your army and spend your opening gold before starting.
- Every 25 seconds, your complete permanent roster deploys again. Survivors stay on the field. A fallen fighter is replaced automatically in the next wave; the roster is never consumed.
- Armies advance and fight automatically. Destroy the opposing citadel to win. Each citadel has 8,500 health and two 1,800-health defensive towers.
- Both armies receive 100 gold on a shared payday every 20 seconds, starting 20 seconds after the battle launches. Gold stays unchanged between paydays. Each mine adds 10 gold to that payment; owning the central Sunwell adds another 10. The gold panel shows the next payout and its countdown. Units within 8 meters along the lane and 9 meters across it contest the shrine; greater army supply captures it over time.
- Income does not grow from kills, so a lost wave still leaves an opportunity to counter the enemy.
- At 7:55, damage against structures begins increasing. At 12:00, the Sunwell fractures and damages both citadels continuously. Holding the center slows that damage on your castle and accelerates it on the enemy. Even a perfect stalemate ends by 15:00.
- Battle speed changes simulation time only when the interface advances it. Pause freezes combat, income, cooldowns and reinforcement timers. Recruitment, research and formation planning remain available while paused.
- Save and continue preserves the full battlefield, enemy plans, random seed, timers, treasury and both permanent armies. Earlier version 2 saves keep every existing coin and resume at the next 20-second payday under the new rates. Incompatible prototype saves and damaged saves are rejected.

## Army planning

- Recruitment prices are fixed. Every purchase adds one permanent formation entry. A faction hero is unique and first becomes available at Citadel Age II.
- There are 30 positions in a six-row, five-column formation. The rightmost column, nearest the river, is the frontline. Keep melee troops forward, casters and archers behind them, and siege engines at the rear. Moving into an occupied position swaps those two units.
- A formation edit affects the next wave; it does not teleport deployed units. Dismissing a recruit refunds 70% of its purchase price. Its currently deployed soldiers finish the battle.
- Supply begins at 24. War Camp research increases it by 12 per level to a maximum of 72. Both armies follow the same limit.
- At most 90 active units per side are simulated, including summons. Reinforcements that cannot fit wait for future waves; no supply is permanently lost.
- Heroes gain a level every five waves, receiving 12% more base health and 10% more base damage per level when they next deploy.
- Flying units ignore attacks from ordinary melee and siege units. Archers, spellcasters, pikes, raiders and crypt stalkers can hit them. Towers and citadels can also attack flying units.

## Automatic battlefield behavior

Attacks land at contact: melee during the swing, missiles at arrival, and siege at its committed ground position. Death and stun cancel unreleased attacks; released missiles continue toward their original target. Simultaneous lethal strikes can trade. Flying targets remain immune to ground-only abilities.

Ground bodies and bridge boundaries make screens matter. Frontliners take engagement positions; cavalry and raiders seek reachable exposed backlines; ranged troops retreat briefly and then fight. Keep healers behind durable allies. There are no standing orders or extra unit commands.

A Cavalier needs a four-meter run-up. A pike or Bone Sentinel that stands still for half a second and faces the charge cancels its bonus and stun. Roots stop movement but permit attacks. Roots and stuns cannot extend an active disable, and share a two-second recovery after expiration. Weaker poison or frost cannot extend a stronger effect; duplicate buffs and armor breaks do not stack their magnitude.

The Scout tab recommends your faction's relevant recruits with their age requirement and explanation. Its Last 25 seconds report shows actual damage, effective healing, absorbed shielding, and leading threats across overlapping waves. Version 3 saves retain attacks in flight and migrate existing version 2 campaigns through the same save key.

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
| Gold Mine | 145 | 4 | +10 gold every 20-second payday. Wait 90 battle seconds between mine upgrades. |
| Citadel Age | 260 | 2 | Unlock the next tier of units. Age II unlocks your faction hero. |
| Forged Weapons | 180 | 3 | +12% attack damage for all future reinforcements. |
| Runic Armor | 170 | 3 | +2 armor and +8% health for all future reinforcements. |
| War Camp | 155 | 4 | +12 army supply, up to 72. Arrange your army across 30 formation positions. |

Each next level costs `round(first cost × 1.65^current level)`. Citadel Age begins at I; its two research levels unlock Ages II and III. Four mines raise the base payment from 100 to 140 gold; holding the Sunwell makes it 150. Mines are a long-term choice: the first 145-gold mine needs 15 paydays to repay its cost through its extra income. Preparation and pause do not advance the mine cooldown. The research button displays the remaining wait.

The 280-gold start, 20-second payments, 10-gold mine and center bonuses, and 90-second mine cooldown follow [Warcraft III Direct Strike's economy](https://directstrike.net/guide/overview). Castle Strike retains its own unit prices, upgrade prices, and 25-second reinforcement rhythm.

## Commander spells

Select a spell and click its target on the battlefield. Spells use the same gold treasury as recruiting, so their immediate impact comes at the cost of a permanent investment. Healing and rallying require allied troops in the target area.

| Spell | Gold | Cooldown | Effect |
|---|---:|---:|---|
| Starfall | 65 | 45s | After 1.4 seconds, deal 145 magic damage to enemies still in a 6-meter area; 75 base damage against structures. |
| War Cry | 45 | 38s | Allies within 9 meters gain 35% attack speed and a 70-point shield for 10 seconds. |
| Restoration | 50 | 42s | Restore 150 health to allied units in an 8-meter area. |

## The opposing commander

The opponent pays the same prices from the same starting treasury and receives income on the same payday, with identical mine income and shrine bonuses. It cannot create free recruits or upgrades. It builds a core army before considering its first mine after 90 seconds, and a second mine becomes an option after eight minutes with a larger army. It avoids economic investment while losing ground or its castle is threatened, and never waits for an unaffordable mine instead of buying an available planned reinforcement. It also saves for expensive units, advances through the ages and builds a mixed army. Normal and Hard use the shared counter relationships, weighting your invested gold and their existing army coverage; Easy makes slower, less targeted decisions. Hard makes decisions more frequently. Commander spells are the player’s additional tactical advantage.

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

**Automatic behavior:** Screens nearby ranged allies and holds the closest ground threat.

**Counter purpose:** Shieldwall reduces incoming ranged hits. Durable shields survive fragile skirmishers.


### Silverleaf Ranger

Longbows punish exposed skirmishers and airborne beasts. **piercing damage; light armor.**

**Skyhunter:** Deals 35% more damage to flying units.

**Automatic behavior:** Keeps distance behind the frontline and prioritizes exposed flyers.

**Counter purpose:** Skyhunter adds damage against flying units. Piercing arrows punish light armor.


### Kingsguard Pike

An inexpensive answer to charging riders and aerial raids. **normal damage; medium armor.**

**Brace:** Deals 55% more damage to cavalry. Standing still for 0.5 seconds and facing a charge cancels its bonus damage and stun. Can strike flyers within pike reach.

**Automatic behavior:** Intercepts charging cavalry near the frontline and protects nearby allies.

**Counter purpose:** A stationary, facing brace cancels charge bonuses; pikes deal bonus damage to riders. Long pikes can strike flyers that enter melee reach.


### Sunward Cavalier

A fast, heavily armored rider built to smash a vulnerable flank. **normal damage; heavy armor.**

**Lance Charge:** After moving at least 4 meters into a charge, the strike deals 90% bonus damage and stuns for 1 second. Braced defenders reduce the charge.

**Automatic behavior:** Looks for an open flank and charges exposed ranged or support units.

**Counter purpose:** A moving charge closes the gap to vulnerable archers. Flanks unprotected healers and casters.


### Lightkeeper

A fragile healer who keeps expensive frontline units in the fight. **magic damage; light armor.**

**Renewal:** Every 4 seconds, heals the most wounded ally within 11 meters for 65 health.

**Automatic behavior:** Follows behind the frontline and heals the most wounded reachable ally.

**Counter purpose:** Repeated healing keeps a protected frontline alive. Sustained healing helps valuable allies survive focused attacks.


### Tempest Arcanist

Crackling arcane bolts unravel clustered armored formations. **magic damage; light armor.**

**Chain Lightning:** Bolts deal 70% extra damage against heavy armor. Every third attack jumps to two nearby enemies for 55% damage. Requires a protective frontline.

**Automatic behavior:** Casts from behind allied screens, favoring armored elites and packed targets.

**Counter purpose:** Arcane bolts deal 70% extra damage against heavy armor; protect the caster from a rush. Chain lightning hits additional enemies in a close group.


### Stormbreak Ballista

An imposing engine with the reach to dismantle castle defenses. **siege damage; fortified armor.**

**Shattershot:** Shots deal 55% splash damage within 3.5 meters. Siege damage devastates structures.

**Automatic behavior:** Stays behind allied troops and favors structures or dense ground groups.

**Counter purpose:** Siege damage has a large bonus against fortified defenses. A wide impact damages clustered ground troops.


### Stormwing

An armored storm rider who sails above the melee. **magic damage; light armor.**

**Thunderclap:** Attacks splash for 40% damage within 3 meters, including flying targets.

**Automatic behavior:** Flies around the ground screen and attacks armored clusters.

**Counter purpose:** Magic attacks damage heavy armor effectively. Thunderclap splashes through nearby enemies.


### Aldric, the Dawnbringer

A radiant commander whose presence turns a shield line into a fortress. **normal damage; heavy armor.**

**Beacon of Dawn:** Nearby allies gain 2 armor. Every 7 seconds, heals allies within 6 meters for 55. Gains strength every 5 waves.

**Automatic behavior:** Anchors the frontline near wounded allies so his armor aura and healing can protect them.

**Counter purpose:** An armor aura reduces nearby allies’ physical damage taken. Repeated area healing supports long fights.


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

**Automatic behavior:** Holds the frontline and presses the closest ground opponent.

**Counter purpose:** Heavy armor and Blood Fury punish fragile ground troops. A durable body trades efficiently in a close fight.


### Venom Hunter

Thrown spears leave a lingering sting in beasts and fragile troops. **piercing damage; light armor.**

**Venom Tips:** Attacks poison their target for 5 damage per second over 5 seconds. Poison refreshes; it does not stack.

**Automatic behavior:** Keeps a screen between himself and melee threats, favoring flyers and light armor.

**Counter purpose:** Thrown spears and poison can reach flying units. Piercing damage and poison punish fragile troops.


### Warg Raider

Fast wolf riders drag flying prey into reach and harry back lines. **normal damage; medium armor.**

**Ensnare:** Every 5 seconds, roots the target for 2 seconds. Rooted units can still attack. Can strike flyers within reach.

**Automatic behavior:** Flanks exposed enemies and roots reachable flyers or vulnerable backline units.

**Counter purpose:** Ensnare stops a flyer from moving while the raider closes. Fast movement and roots catch exposed support units. A flank reaches slow, unprotected siege engines.


### Stormcaller

An elemental mystic who drives warriors into a killing frenzy. **magic damage; light armor.**

**Bloodlust:** Every 8 seconds, grants 30% attack speed to up to 4 nearby allies for 7 seconds. Attacks reduce heavy armor by 3 for 5 seconds; armor breaks do not stack.

**Automatic behavior:** Stays behind allies, empowers strong attackers and marks heavy armor for the warband.

**Counter purpose:** Attacks weaken heavy armor by 3 for 5 seconds. Bloodlust increases nearby warriors’ attack speed.


### Ironmaw Berserker

A veteran wielding a great axe that cuts through crowded ranks. **normal damage; heavy armor.**

**Sweeping Cleave:** Melee attacks deal 45% splash damage to ground enemies within 3 meters of the target.

**Automatic behavior:** Screens allies and seeks clustered ground enemies for cleaving swings.

**Counter purpose:** Cleave spreads damage across adjacent ground troops. A strong frontline punishes armies that cannot clear groups.


### Ember Demolisher

A lumbering siege cart hurling cauldrons of burning pitch. **siege damage; fortified armor.**

**Burning Pitch:** Shots splash for 45% damage within 3 meters and burn the main target for 6 damage per second.

**Automatic behavior:** Bombards structures or compact ground formations from behind the frontline.

**Counter purpose:** Siege attacks break fortified defenses. Burning pitch splashes through grouped ground troops.


### Earthshaker

A towering horned guardian who breaks enemy lines underfoot. **normal damage; heavy armor.**

**War Stomp:** Every 6 seconds in melee, deals 55 magic damage and stuns ground enemies within 4 meters for 1 second.

**Automatic behavior:** Holds a contested frontline and stomps packed ground attackers.

**Counter purpose:** War Stomp damages and briefly stuns nearby ground enemies. A large body and ground stun interrupt exposed riders.


### Plaguewing

A venomous drake that hunts archers and unguarded siege engines. **piercing damage; light armor.**

**Virulent Sting:** Attacks poison their target for 9 damage per second over 6 seconds.

**Automatic behavior:** Flies around the melee and hunts light armor or exposed siege.

**Counter purpose:** Piercing attacks and venom punish light armor. Flying avoids siege retaliation.


### Korr, the Ashblade

A relentless duelist whose whirling blade carves open the enemy flank. **normal damage; heavy armor.**

**Bladestorm:** Every third strike deals 180% damage and cleaves nearby ground enemies. Gains strength every 5 waves.

**Automatic behavior:** Seeks an open route to vulnerable enemies and cleaves every third strike.

**Counter purpose:** Fast movement reaches unprotected support units. Every third strike cleaves nearby ground enemies.


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

**Automatic behavior:** Seeks an open flank toward exposed ranged or support units.

**Counter purpose:** Fast movement and lifesteal reward access to exposed archers. Punishes support units left outside a protective screen.


### Bone Sentinel

A rusted shield and ancient bones, sworn to serve beyond death. **normal damage; heavy armor.**

**Unbroken:** Reassembles once with 35% health when slain. Standing still for 0.5 seconds and facing a charge cancels its bonus damage and stun. Summoned skeletons cannot reassemble.

**Automatic behavior:** Screens allies, braces against charges and reassembles once when destroyed.

**Counter purpose:** A stationary sentinel facing a charge cancels its bonus damage and stun. Armor and reassembly absorb repeated physical attacks.


### Crypt Stalker

An armored arachnid that pins aerial threats beneath barbed webs. **piercing damage; medium armor.**

**Graveweb:** Attacks slow flying units by 60% and deal 30% bonus damage to them.

**Automatic behavior:** Stays behind the screen and prioritizes flyers with its slowing web.

**Counter purpose:** Graveweb slows flyers and adds anti-air damage. Piercing attacks punish lightly armored targets.


### Graveweaver

A dark ritualist who swells the ranks with expendable servants. **magic damage; light armor.**

**Raise the Fallen:** Every 12 seconds in battle, summons 2 fragile skeletons for 22 seconds. At most 4 per caster.

**Automatic behavior:** Stays behind the screen and raises disposable troops near an active battle.

**Counter purpose:** Summons occupy opponents that can attack only one body at a time. Repeated summons replace an expendable frontline.


### Veil Siren

A sorrowful spirit whose curse cripples powerful enemy champions. **magic damage; light armor.**

**Withering Curse:** Attacks reduce the target’s damage by 22% for 6 seconds.

**Automatic behavior:** Keeps behind allied screens and curses powerful armored attackers or heroes.

**Counter purpose:** Magic damage is effective against heavy armor. Withering Curse reduces a powerful target’s attack damage.


### Plague Colossus

A shambling wall of stitched flesh, surrounded by choking decay. **normal damage; heavy armor.**

**Carrion Cloud:** Deals 8 magic damage per second to ground enemies within 3.5 meters.

**Automatic behavior:** Anchors a ground engagement and keeps packed enemies inside its plague cloud.

**Counter purpose:** Carrion Cloud damages every nearby ground enemy. A large armored body absorbs sustained frontline pressure.


### Sepulcher Engine

A bone-bound engine that hurls restless souls at castle walls. **siege damage; fortified armor.**

**Soulburst:** Shots deal 55% splash damage within 3.5 meters. Siege damage devastates structures.

**Automatic behavior:** Bombards defenses or grouped ground enemies while staying behind its screen.

**Counter purpose:** Siege attacks damage fortified defenses effectively. Soulburst splashes across dense ground formations.


### Frostbound Wyrm

An ancient skeletal dragon trailing a storm of killing frost. **magic damage; light armor.**

**Winter’s Breath:** Attacks splash for 40% damage within 3 meters and slow victims by 35% for 3 seconds.

**Automatic behavior:** Flies over the screen and slows armored clusters from range.

**Counter purpose:** Magic breath is effective against heavy armor. Winter’s Breath damages and slows neighboring enemies.


### Morvath, the Hollow King

An immortal king leading his cursed host toward one final conquest. **normal damage; heavy armor.**

**Death’s Embrace:** Every 6 seconds, heals nearby allies for 40 and strikes nearby ground enemies for 35 magic damage. Gains strength every 5 waves.

**Automatic behavior:** Stays near the frontline so nearby allies receive healing while ground enemies take damage.

**Counter purpose:** Death’s Embrace sustains nearby allies. Death’s Embrace also strikes nearby ground enemies.


## Opening suggestions

- **Dawn Alliance:** add a Dawnshield and a ranger, then decide whether your frontline can spare the cost of a mine. Its slow return rewards a stable position. Age II Lightkeepers turn a durable frontline into a sustained push; Tempest Arcanists answer armored opponents.
- **Ironclad Horde:** build a core of grunts and hunters before overinvesting in raiders. A Stormcaller rewards a larger melee force. Mix siege into the warband once the opposing army is contained.
- **Hollow Covenant:** Bone Sentinels hold enemies in place for Crypt Stalkers. At Age II, choose Graveweavers against single-target armies or Veil Sirens against armored elites. Protect casters from flanking cavalry.

**Source of truth:** `src/data.js` contains unit and upgrade definitions; `src/engine.js` contains the deterministic simulation. This manual describes the reworked game, save version 2.
