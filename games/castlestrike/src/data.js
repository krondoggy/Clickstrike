export const WAVE_INTERVAL = 25;
// Warcraft III Direct Strike's economy: discrete shared paydays, modest mine income.
export const INCOME_INTERVAL = 20;
export const BASE_INCOME = 100;
export const MINE_INCOME = 10;
export const SHRINE_INCOME = 10;
export const MINE_COOLDOWN = 90;

// Shared simulation and inspection values. Units retain their own attack interval.
export const ABILITY_RULES = Object.freeze(Object.fromEntries(Object.entries({
  controlRecovery: { duration: 2 },
  shieldwall: { rangedReduction: 0.22 },
  skyhunter: { airDamageMultiplier: 1.35 },
  brace: { cavalryDamageMultiplier: 1.55, cancelsCharge: true, braceHold: 0.5, braceFacingDot: 0.5, interceptRadius: 4 },
  charge: { minDistance: 4, damageMultiplier: 1.9, stunDuration: 1 },
  renewal: { cooldown: 4, radius: 11, heal: 65 },
  chain: { every: 3, radius: 5, targets: 2, damageRatio: 0.55, heavyDamageMultiplier: 1.7, canHitAir: true },
  splash: { radius: 3.5, damageRatio: 0.55, canHitAir: false },
  thunder: { radius: 3, damageRatio: 0.4, canHitAir: true },
  beacon: { cooldown: 7, radius: 6, auraRadius: 7, armor: 2, heal: 55 },
  fury: { threshold: 0.5, damageMultiplier: 1.35 },
  venom: { damage: 5, duration: 5, canHitAir: true },
  net: { cooldown: 5, duration: 2, canHitAir: true },
  bloodlust: { cooldown: 8, radius: 10, duration: 7, amount: 0.3, targets: 4, armorBreak: 3, armorBreakDuration: 5 },
  cleave: { radius: 3, damageRatio: 0.45, canHitAir: false },
  pitch: { radius: 3, damageRatio: 0.45, damage: 6, duration: 5, canHitAir: false },
  stomp: { cooldown: 6, radius: 4, damage: 55, duration: 1, canHitAir: false },
  sting: { damage: 9, duration: 6, canHitAir: true },
  bladestorm: { every: 3, radius: 3, damageMultiplier: 1.8, damageRatio: 0.45, canHitAir: false },
  ravenous: { healFraction: 0.24 },
  unbroken: { reviveFraction: 0.35, reviveStun: 0.6, cancelsCharge: true, braceHold: 0.5, braceFacingDot: 0.5, interceptRadius: 4 },
  web: { duration: 3, amount: 0.6, airDamageMultiplier: 1.3, canHitAir: true },
  raise: { cooldown: 12, radius: 14, summons: 2, limit: 4, lifespan: 22, healthFraction: 0.48 },
  curse: { duration: 6, damageReduction: 0.22 },
  plague: { radius: 3.5, damage: 8, canHitAir: false },
  frost: { radius: 3, damageRatio: 0.4, duration: 3, amount: 0.35, canHitAir: true },
  embrace: { cooldown: 6, radius: 5.5, triggerRange: 7, damage: 35, heal: 40, canHitAir: false },
}).map(([key, rule]) => [key, Object.freeze(rule)])));

export const FACTIONS = [
  { id: 'alliance', name: 'Dawn Alliance', title: 'Order. Steel. Radiance.', description: 'Disciplined shield lines, precision archers and spellcasters. Keep your healers behind a durable vanguard, then break the gates with siege engines.', color: '#67aaff', perk: 'Sanctuary · healing received +15%', heroId: 'paladin' },
  { id: 'horde', name: 'Ironclad Horde', title: 'Blood. Thunder. Victory.', description: 'Aggressive warriors, venomous hunters and colossal beasts. Overwhelm a flank with raiders and turn the entire warband loose with bloodlust.', color: '#e98554', perk: 'Warpath · movement speed +8%', heroId: 'blademaster' },
  { id: 'undead', name: 'Hollow Covenant', title: 'What falls shall rise.', description: 'Relentless revenants, unnatural plagues and frostbound monsters. Sustain a growing host while curses and summoned skeletons grind the enemy down.', color: '#a38ce9', perk: 'Unhallowed · regenerate 0.35% health each second', heroId: 'deathknight' },
];

const unit = (id, faction, name, role, tier, cost, supply, hp, damage, armor, range, speed, attackSpeed, model, portrait, extras) => ({
  id, faction, name, role, tier, cost, supply, hp, damage, armor, range, speed, attackSpeed, model, portrait,
  attackType: 'normal', armorType: 'medium', canHitAir: range > 3, hero: false, ...extras,
});

export const UNITS = [
  unit('footman', 'alliance', 'Dawnshield', 'frontline', 1, 100, 2, 390, 24, 5, 1.65, 2.1, 1.15, 'footman', 0, { armorType: 'heavy', ability: 'Shieldwall', abilityId: 'shieldwall', abilityDescription: 'Takes 22% less damage from ranged attacks.', description: 'A steadfast shieldbearer who buys time for the back line.', strongVs: ['Archers', 'Light infantry'], weakVs: ['Spellcasters', 'Siege damage'] }),
  unit('archer', 'alliance', 'Silverleaf Ranger', 'ranged', 1, 120, 2, 215, 32, 1, 10, 2.15, 1.25, 'archer', 1, { attackType: 'piercing', armorType: 'light', ability: 'Skyhunter', abilityId: 'skyhunter', abilityDescription: 'Deals 35% more damage to flying units.', description: 'Longbows punish exposed skirmishers and airborne beasts.', strongVs: ['Flying units', 'Light armor'], weakVs: ['Heavy armor', 'Cavalry'] }),
  unit('spearman', 'alliance', 'Kingsguard Pike', 'frontline', 1, 90, 2, 290, 25, 3, 2.7, 2.15, 1.25, 'spearman', 0, { canHitAir: true, ability: 'Brace', abilityId: 'brace', abilityDescription: 'Deals 55% more damage to cavalry. Can strike low-flying units.', description: 'An inexpensive answer to charging riders and aerial raids.', strongVs: ['Cavalry', 'Flying units'], weakVs: ['Archers', 'Area damage'] }),
  unit('knight', 'alliance', 'Sunward Cavalier', 'cavalry', 2, 245, 4, 640, 47, 7, 1.9, 3.4, 1.2, 'knight', 3, { armorType: 'heavy', ability: 'Lance Charge', abilityId: 'charge', abilityDescription: 'The first strike deals 90% bonus damage and stuns for 1 second.', description: 'A fast, heavily armored rider built to smash a vulnerable flank.', strongVs: ['Archers', 'Support units'], weakVs: ['Pikes', 'Magic damage'] }),
  unit('priest', 'alliance', 'Lightkeeper', 'support', 2, 190, 3, 260, 13, 1, 8.5, 2.05, 1.6, 'priest', 2, { attackType: 'magic', armorType: 'light', ability: 'Renewal', abilityId: 'renewal', abilityDescription: 'Every 4 seconds, heals the most wounded ally within 11 meters for 65 health.', description: 'A fragile healer who keeps expensive frontline units in the fight.', strongVs: ['Sustained combat', 'Heavy armor'], weakVs: ['Cavalry', 'Burst damage'] }),
  unit('mage', 'alliance', 'Tempest Arcanist', 'magic', 2, 225, 3, 255, 50, 0, 9.5, 2, 1.6, 'mage', 3, { attackType: 'magic', armorType: 'light', ability: 'Chain Lightning', abilityId: 'chain', abilityDescription: 'Every third attack jumps to two nearby enemies for 55% damage.', description: 'Crackling arcane bolts unravel clustered armored formations.', strongVs: ['Heavy armor', 'Packed formations'], weakVs: ['Cavalry', 'Light skirmishers'] }),
  unit('ballista', 'alliance', 'Stormbreak Ballista', 'siege', 3, 345, 5, 435, 100, 2, 15, 1.5, 3.4, 'catapult', 3, { attackType: 'siege', armorType: 'fortified', canHitAir: false, ability: 'Shattershot', abilityId: 'splash', abilityDescription: 'Shots deal 55% splash damage within 3.5 meters. Siege damage devastates structures.', description: 'An imposing engine with the reach to dismantle castle defenses.', strongVs: ['Structures', 'Dense infantry'], weakVs: ['Flying units', 'Flanking cavalry'] }),
  unit('gryphon', 'alliance', 'Stormwing', 'flying', 3, 385, 5, 525, 62, 3, 7.8, 2.9, 1.6, 'gryphon', 3, { attackType: 'magic', armorType: 'light', ability: 'Thunderclap', abilityId: 'thunder', abilityDescription: 'Attacks splash for 40% damage within 2.8 meters.', description: 'An armored storm rider who sails above the melee.', strongVs: ['Ground melee', 'Heavy armor'], weakVs: ['Skyhunters', 'Webs and nets'] }),
  unit('paladin', 'alliance', 'Aldric, the Dawnbringer', 'hero', 2, 470, 6, 1060, 58, 8, 2, 2.3, 1.3, 'paladin', 2, { hero: true, armorType: 'heavy', ability: 'Beacon of Dawn', abilityId: 'beacon', abilityDescription: 'Nearby allies gain 2 armor. Every 7 seconds, heals allies within 6 meters for 55. Gains strength every 5 waves.', description: 'A radiant commander whose presence turns a shield line into a fortress.', strongVs: ['Attrition', 'Physical armies'], weakVs: ['Magic focus fire', 'Dispersed fights'] }),
  unit('grunt', 'horde', 'Ironhide Grunt', 'frontline', 1, 105, 2, 420, 29, 3, 1.7, 2.25, 1.3, 'grunt', 4, { armorType: 'heavy', ability: 'Blood Fury', abilityId: 'fury', abilityDescription: 'Deals 35% more damage while below half health.', description: 'A brutal axe fighter who becomes deadlier as the battle wears on.', strongVs: ['Light infantry', 'Close combat'], weakVs: ['Magic damage', 'Kiting'] }),
  unit('headhunter', 'horde', 'Venom Hunter', 'ranged', 1, 115, 2, 230, 28, 1, 9, 2.25, 1.25, 'headhunter', 5, { attackType: 'piercing', armorType: 'light', ability: 'Venom Tips', abilityId: 'venom', abilityDescription: 'Attacks poison their target for 5 damage per second over 5 seconds. Poison refreshes; it does not stack.', description: 'Thrown spears leave a lingering sting in beasts and fragile troops.', strongVs: ['Flying units', 'Light armor'], weakVs: ['Heavy armor', 'Healing'] }),
  unit('raider', 'horde', 'Warg Raider', 'cavalry', 1, 170, 3, 365, 34, 2, 2.4, 3.6, 1.15, 'raider', 5, { canHitAir: true, ability: 'Ensnare', abilityId: 'net', abilityDescription: 'Every 5 seconds, roots the target for 2 seconds. Can attack flying units.', description: 'Fast wolf riders drag flying prey into reach and harry back lines.', strongVs: ['Flying units', 'Exposed support'], weakVs: ['Pikes', 'Heavy frontline'] }),
  unit('shaman', 'horde', 'Stormcaller', 'support', 2, 195, 3, 275, 24, 1, 8.5, 2.1, 1.6, 'shaman', 6, { attackType: 'magic', armorType: 'light', ability: 'Bloodlust', abilityId: 'bloodlust', abilityDescription: 'Every 8 seconds, grants 30% attack speed to up to 4 nearby allies for 7 seconds.', description: 'An elemental mystic who drives warriors into a killing frenzy.', strongVs: ['Large warbands', 'Heavy armor'], weakVs: ['Cavalry', 'Area damage'] }),
  unit('ironmaw', 'horde', 'Ironmaw Berserker', 'frontline', 2, 220, 3, 570, 49, 4, 1.9, 2.4, 1.45, 'grunt', 4, { armorType: 'heavy', ability: 'Sweeping Cleave', abilityId: 'cleave', abilityDescription: 'Melee attacks deal 45% damage to enemies within 2.8 meters of the target.', description: 'A veteran wielding a great axe that cuts through crowded ranks.', strongVs: ['Mass infantry', 'Summons'], weakVs: ['Flying units', 'Magic damage'] }),
  unit('demolisher', 'horde', 'Ember Demolisher', 'siege', 2, 290, 4, 380, 82, 1, 13.5, 1.5, 3.1, 'catapult', 7, { attackType: 'siege', armorType: 'fortified', canHitAir: false, ability: 'Burning Pitch', abilityId: 'pitch', abilityDescription: 'Shots splash for 45% damage within 3 meters and burn the main target for 6 damage per second.', description: 'A lumbering siege cart hurling cauldrons of burning pitch.', strongVs: ['Structures', 'Packed formations'], weakVs: ['Flying units', 'Cavalry'] }),
  unit('tauren', 'horde', 'Earthshaker', 'frontline', 3, 360, 5, 1000, 66, 6, 2.2, 1.8, 1.9, 'tauren', 7, { armorType: 'heavy', ability: 'War Stomp', abilityId: 'stomp', abilityDescription: 'Every 6 seconds in melee, deals 55 damage and stuns enemies within 4 meters for 1 second.', description: 'A towering horned guardian who breaks enemy lines underfoot.', strongVs: ['Mass infantry', 'Melee armies'], weakVs: ['Flying units', 'Focused magic'] }),
  unit('wyvern', 'horde', 'Plaguewing', 'flying', 3, 350, 5, 450, 63, 2, 8, 3.15, 1.5, 'wyvern', 7, { attackType: 'piercing', armorType: 'light', ability: 'Virulent Sting', abilityId: 'sting', abilityDescription: 'Attacks poison their target for 9 damage per second over 6 seconds.', description: 'A venomous drake that hunts archers and unguarded siege engines.', strongVs: ['Ground melee', 'Light armor'], weakVs: ['Archers', 'Healing and nets'] }),
  unit('blademaster', 'horde', 'Korr, the Ashblade', 'hero', 2, 470, 6, 865, 68, 5, 2.2, 3.2, 1.1, 'blademaster', 4, { hero: true, armorType: 'heavy', ability: 'Bladestorm', abilityId: 'bladestorm', abilityDescription: 'Every third strike deals 180% damage and cleaves nearby enemies. Gains strength every 5 waves.', description: 'A relentless duelist whose whirling blade carves open the enemy flank.', strongVs: ['Support units', 'Grouped melee'], weakVs: ['Crowd control', 'Focused magic'] }),
  unit('ghoul', 'undead', 'Graveborn', 'frontline', 1, 85, 2, 305, 25, 1, 1.6, 2.75, 1.0, 'ghoul', 8, { ability: 'Ravenous', abilityId: 'ravenous', abilityDescription: 'Heals for 24% of attack damage dealt to units.', description: 'A tireless scavenger whose claws sustain it through the melee.', strongVs: ['Exposed archers', 'Small skirmishes'], weakVs: ['Heavy armor', 'Area damage'] }),
  unit('skeleton', 'undead', 'Bone Sentinel', 'frontline', 1, 95, 2, 300, 24, 4, 1.8, 2.1, 1.3, 'skeleton', 8, { armorType: 'heavy', ability: 'Unbroken', abilityId: 'unbroken', abilityDescription: 'Reassembles once with 35% health when slain. Summoned skeletons cannot reassemble.', description: 'A rusted shield and ancient bones, sworn to serve beyond death.', strongVs: ['Physical damage', 'Attrition'], weakVs: ['Magic damage', 'Siege splash'] }),
  unit('cryptfiend', 'undead', 'Crypt Stalker', 'ranged', 1, 145, 3, 320, 37, 2, 9, 2.05, 1.4, 'cryptfiend', 9, { attackType: 'piercing', ability: 'Graveweb', abilityId: 'web', abilityDescription: 'Attacks slow flying units by 60% and deal 30% bonus damage to them.', description: 'An armored arachnid that pins aerial threats beneath barbed webs.', strongVs: ['Flying units', 'Light armor'], weakVs: ['Heavy armor', 'Siege splash'] }),
  unit('necromancer', 'undead', 'Graveweaver', 'support', 2, 210, 3, 245, 23, 0, 9, 2, 1.55, 'necromancer', 9, { attackType: 'magic', armorType: 'light', ability: 'Raise the Fallen', abilityId: 'raise', abilityDescription: 'Every 12 seconds in battle, summons 2 fragile skeletons for 22 seconds. At most 4 per caster.', description: 'A dark ritualist who swells the ranks with expendable servants.', strongVs: ['Single-target armies', 'Attrition'], weakVs: ['Area damage', 'Cavalry'] }),
  unit('banshee', 'undead', 'Veil Siren', 'magic', 2, 205, 3, 280, 41, 1, 10, 2.15, 1.5, 'banshee', 10, { attackType: 'magic', armorType: 'light', ability: 'Withering Curse', abilityId: 'curse', abilityDescription: 'Attacks reduce the target’s damage by 22% for 6 seconds.', description: 'A sorrowful spirit whose curse cripples powerful enemy champions.', strongVs: ['Heroes', 'Heavy armor'], weakVs: ['Mass infantry', 'Light skirmishers'] }),
  unit('abomination', 'undead', 'Plague Colossus', 'frontline', 2, 275, 4, 835, 47, 4, 2.1, 1.8, 1.8, 'abomination', 10, { armorType: 'heavy', ability: 'Carrion Cloud', abilityId: 'plague', abilityDescription: 'Deals 8 magic damage per second to ground enemies within 3.5 meters.', description: 'A shambling wall of stitched flesh, surrounded by choking decay.', strongVs: ['Mass infantry', 'Long melees'], weakVs: ['Flying units', 'Focused magic'] }),
  unit('graveengine', 'undead', 'Sepulcher Engine', 'siege', 3, 335, 5, 470, 94, 2, 14.5, 1.45, 3.3, 'catapult', 11, { attackType: 'siege', armorType: 'fortified', canHitAir: false, ability: 'Soulburst', abilityId: 'splash', abilityDescription: 'Shots deal 55% splash damage within 3.5 meters. Siege damage devastates structures.', description: 'A bone-bound engine that hurls restless souls at castle walls.', strongVs: ['Structures', 'Mass infantry'], weakVs: ['Flying units', 'Cavalry'] }),
  unit('frostwyrm', 'undead', 'Frostbound Wyrm', 'flying', 3, 410, 6, 650, 73, 3, 8.5, 2.45, 1.9, 'frostwyrm', 11, { attackType: 'magic', armorType: 'light', ability: 'Winter’s Breath', abilityId: 'frost', abilityDescription: 'Attacks splash for 40% damage within 3 meters and slow victims by 35% for 3 seconds.', description: 'An ancient skeletal dragon trailing a storm of killing frost.', strongVs: ['Heavy armor', 'Ground armies'], weakVs: ['Archers', 'Webs and nets'] }),
  unit('deathknight', 'undead', 'Morvath, the Hollow King', 'hero', 2, 470, 6, 1025, 61, 7, 2.2, 2.7, 1.4, 'deathknight', 8, { hero: true, armorType: 'heavy', ability: 'Death’s Embrace', abilityId: 'embrace', abilityDescription: 'Every 6 seconds, heals nearby allies for 40 and strikes nearby enemies for 35 magic damage. Gains strength every 5 waves.', description: 'An immortal king leading his cursed host toward one final conquest.', strongVs: ['Attrition', 'Grouped melee'], weakVs: ['Ranged focus fire', 'Magic damage'] }),
];

const tacticalProfiles = {
  footman: ['Screens nearby ranged allies and holds the closest ground threat.', [['ranged', 'Shieldwall reduces incoming ranged hits.'], ['lightArmor', 'Durable shields survive fragile skirmishers.']]],
  archer: ['Keeps distance behind the frontline and prioritizes exposed flyers.', [['air', 'Skyhunter adds damage against flying units.'], ['lightArmor', 'Piercing arrows punish light armor.']]],
  spearman: ['Intercepts charging cavalry near the frontline and protects nearby allies.', [['cavalry', 'A stationary, facing brace cancels charge bonuses; pikes deal bonus damage to riders.'], ['air', 'Long pikes can strike flyers that enter melee reach.']]],
  knight: ['Looks for an open flank and charges exposed ranged or support units.', [['ranged', 'A moving charge closes the gap to vulnerable archers.'], ['support', 'Flanks unprotected healers and casters.']]],
  priest: ['Follows behind the frontline and heals the most wounded reachable ally.', [['attrition', 'Repeated healing keeps a protected frontline alive.'], ['singleTarget', 'Sustained healing helps valuable allies survive focused attacks.']]],
  mage: ['Casts from behind allied screens, favoring armored elites and packed targets.', [['armorHeavy', 'Arcane bolts deal 70% extra damage against heavy armor; protect the caster from a rush.'], ['swarm', 'Chain lightning hits additional enemies in a close group.']]],
  ballista: ['Stays behind allied troops and favors structures or dense ground groups.', [['structures', 'Siege damage has a large bonus against fortified defenses.'], ['swarm', 'A wide impact damages clustered ground troops.']]],
  gryphon: ['Flies around the ground screen and attacks armored clusters.', [['armorHeavy', 'Magic attacks damage heavy armor effectively.'], ['swarm', 'Thunderclap splashes through nearby enemies.']]],
  paladin: ['Anchors the frontline near wounded allies so his armor aura and healing can protect them.', [['physical', 'An armor aura reduces nearby allies’ physical damage taken.'], ['attrition', 'Repeated area healing supports long fights.']]],
  grunt: ['Holds the frontline and presses the closest ground opponent.', [['lightArmor', 'Heavy armor and Blood Fury punish fragile ground troops.'], ['physical', 'A durable body trades efficiently in a close fight.']]],
  headhunter: ['Keeps a screen between himself and melee threats, favoring flyers and light armor.', [['air', 'Thrown spears and poison can reach flying units.'], ['lightArmor', 'Piercing damage and poison punish fragile troops.']]],
  raider: ['Flanks exposed enemies and roots reachable flyers or vulnerable backline units.', [['air', 'Ensnare stops a flyer from moving while the raider closes.'], ['support', 'Fast movement and roots catch exposed support units.'], ['siege', 'A flank reaches slow, unprotected siege engines.']]],
  shaman: ['Stays behind allies, empowers strong attackers and marks heavy armor for the warband.', [['armorHeavy', 'Attacks weaken heavy armor by 3 for 5 seconds.'], ['physical', 'Bloodlust increases nearby warriors’ attack speed.']]],
  ironmaw: ['Screens allies and seeks clustered ground enemies for cleaving swings.', [['swarm', 'Cleave spreads damage across adjacent ground troops.'], ['singleTarget', 'A strong frontline punishes armies that cannot clear groups.']]],
  demolisher: ['Bombards structures or compact ground formations from behind the frontline.', [['structures', 'Siege attacks break fortified defenses.'], ['swarm', 'Burning pitch splashes through grouped ground troops.']]],
  tauren: ['Holds a contested frontline and stomps packed ground attackers.', [['swarm', 'War Stomp damages and briefly stuns nearby ground enemies.'], ['cavalry', 'A large body and ground stun interrupt exposed riders.']]],
  wyvern: ['Flies around the melee and hunts light armor or exposed siege.', [['lightArmor', 'Piercing attacks and venom punish light armor.'], ['siege', 'Flying avoids siege retaliation.']]],
  blademaster: ['Seeks an open route to vulnerable enemies and cleaves every third strike.', [['support', 'Fast movement reaches unprotected support units.'], ['swarm', 'Every third strike cleaves nearby ground enemies.']]],
  ghoul: ['Seeks an open flank toward exposed ranged or support units.', [['ranged', 'Fast movement and lifesteal reward access to exposed archers.'], ['support', 'Punishes support units left outside a protective screen.']]],
  skeleton: ['Screens allies, braces against charges and reassembles once when destroyed.', [['cavalry', 'A stationary sentinel facing a charge cancels its bonus damage and stun.'], ['physical', 'Armor and reassembly absorb repeated physical attacks.']]],
  cryptfiend: ['Stays behind the screen and prioritizes flyers with its slowing web.', [['air', 'Graveweb slows flyers and adds anti-air damage.'], ['lightArmor', 'Piercing attacks punish lightly armored targets.']]],
  necromancer: ['Stays behind the screen and raises disposable troops near an active battle.', [['singleTarget', 'Summons occupy opponents that can attack only one body at a time.'], ['attrition', 'Repeated summons replace an expendable frontline.']]],
  banshee: ['Keeps behind allied screens and curses powerful armored attackers or heroes.', [['armorHeavy', 'Magic damage is effective against heavy armor.'], ['hero', 'Withering Curse reduces a powerful target’s attack damage.']]],
  abomination: ['Anchors a ground engagement and keeps packed enemies inside its plague cloud.', [['swarm', 'Carrion Cloud damages every nearby ground enemy.'], ['physical', 'A large armored body absorbs sustained frontline pressure.']]],
  graveengine: ['Bombards defenses or grouped ground enemies while staying behind its screen.', [['structures', 'Siege attacks damage fortified defenses effectively.'], ['swarm', 'Soulburst splashes across dense ground formations.']]],
  frostwyrm: ['Flies over the screen and slows armored clusters from range.', [['armorHeavy', 'Magic breath is effective against heavy armor.'], ['swarm', 'Winter’s Breath damages and slows neighboring enemies.']]],
  deathknight: ['Stays near the frontline so nearby allies receive healing while ground enemies take damage.', [['attrition', 'Death’s Embrace sustains nearby allies.'], ['swarm', 'Death’s Embrace also strikes nearby ground enemies.']]],
};
for (const u of UNITS) {
  const [tactics, counters] = tacticalProfiles[u.id];
  u.tactics = tactics;
  u.counters = counters.map(([threat, reason]) => Object.freeze({ threat, reason }));
  // Machine-readable automatic policy, distinct from explanatory tactics copy.
  u.targeting = Object.freeze({
    flanker: u.role === 'cavalry' || ['ghoul', 'blademaster'].includes(u.id),
    antiArmor: ['mage', 'banshee', 'shaman'].includes(u.id),
    antiAir: u.role === 'ranged',
    healer: u.id === 'priest',
    heroHunter: u.id === 'banshee',
    clusterHunter: u.role === 'siege',
    structureHunter: u.role === 'siege',
  });
}
const abilityCopy = {
  mage: 'Bolts deal 70% extra damage against heavy armor. Every third attack jumps to two nearby enemies for 55% damage. Requires a protective frontline.',
  spearman: 'Deals 55% more damage to cavalry. Standing still for 0.5 seconds and facing a charge cancels its bonus damage and stun. Can strike flyers within pike reach.',
  knight: 'After moving at least 4 meters into a charge, the strike deals 90% bonus damage and stuns for 1 second. Braced defenders reduce the charge.',
  gryphon: 'Attacks splash for 40% damage within 3 meters, including flying targets.',
  raider: 'Every 5 seconds, roots the target for 2 seconds. Rooted units can still attack. Can strike flyers within reach.',
  shaman: 'Every 8 seconds, grants 30% attack speed to up to 4 nearby allies for 7 seconds. Attacks reduce heavy armor by 3 for 5 seconds; armor breaks do not stack.',
  ironmaw: 'Melee attacks deal 45% splash damage to ground enemies within 3 meters of the target.',
  tauren: 'Every 6 seconds in melee, deals 55 magic damage and stuns ground enemies within 4 meters for 1 second.',
  blademaster: 'Every third strike deals 180% damage and cleaves nearby ground enemies. Gains strength every 5 waves.',
  skeleton: 'Reassembles once with 35% health when slain. Standing still for 0.5 seconds and facing a charge cancels its bonus damage and stun. Summoned skeletons cannot reassemble.',
  deathknight: 'Every 6 seconds, heals nearby allies for 40 and strikes nearby ground enemies for 35 magic damage. Gains strength every 5 waves.',
};
for (const u of UNITS) if (abilityCopy[u.id]) u.abilityDescription = abilityCopy[u.id];

export const UNIT_MAP = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(UNITS.map(u => [u.id, u]))));

// A counter score counts declared matchup strengths; it is not a win probability.
// Keep inspection, scouting and opponent recruitment on the same threat vocabulary.
export function threatMatches(target, threat) {
  const u = typeof target === 'string' ? UNIT_MAP[target] : target;
  if (!u) return false;
  switch (threat) {
    case 'armorHeavy': return u.armorType === 'heavy';
    case 'air': return u.role === 'flying';
    case 'cavalry': return u.role === 'cavalry';
    case 'swarm': return !u.kind && (u.supply <= 2 || u.abilityId === 'raise');
    case 'siege': return u.role === 'siege';
    case 'structures': return ['castle', 'tower'].includes(u.kind);
    case 'sustain': return ['renewal', 'beacon', 'embrace', 'ravenous', 'raise'].includes(u.abilityId);
    case 'support': return ['support', 'magic'].includes(u.role);
    case 'hero': return u.hero === true;
    case 'ranged': return u.role === 'ranged';
    case 'lightArmor': return u.armorType === 'light';
    case 'physical': return ['normal', 'piercing'].includes(u.attackType);
    case 'attrition': return !u.kind && ['frontline', 'support', 'hero'].includes(u.role);
    case 'singleTarget': return !u.kind && !['splash', 'pitch', 'thunder', 'cleave', 'frost', 'chain', 'plague', 'stomp', 'bladestorm', 'embrace'].includes(u.abilityId);
    default: return false;
  }
}

export function counterScore(candidate, target) {
  const u = typeof candidate === 'string' ? UNIT_MAP[candidate] : candidate;
  const t = typeof target === 'string' ? UNIT_MAP[target] : target;
  if (!u || !t || (t.role === 'flying' && !u.canHitAir)) return 0;
  return u.counters.reduce((score, counter) => score + (threatMatches(t, counter.threat) ? 1 : 0), 0);
}

export const RESEARCH = [
  { id: 'mines', name: 'Gold Mine', description: '+10 gold each 20-second payday. 90 seconds between mines; up to 4. A long-term investment that delays your next troops.', maxLevel: 4, baseCost: 145 },
  { id: 'tier', name: 'Citadel Age', description: 'Unlock the next tier of units. Age II unlocks your faction hero.', maxLevel: 2, baseCost: 260 },
  { id: 'weapons', name: 'Forged Weapons', description: '+12% attack damage for all future reinforcements.', maxLevel: 3, baseCost: 180 },
  { id: 'armor', name: 'Runic Armor', description: '+2 armor and +8% health for all future reinforcements.', maxLevel: 3, baseCost: 170 },
  { id: 'barracks', name: 'War Camp', description: '+12 army supply, up to 72. Arrange your army across 30 formation positions.', maxLevel: 4, baseCost: 155 },
];

export const SPELLS = [
  { id: 'meteor', name: 'Starfall', description: 'After a 1.4-second warning, strike a 6-meter area for 145 magic damage to enemy units and 75 magic damage to structures.', cost: 65, cooldown: 45, radius: 6, color: '#ffac62' },
  { id: 'rally', name: 'War Cry', description: 'Allies within 9 meters gain 35% attack speed and a 70-point shield for 10 seconds.', cost: 45, cooldown: 38, radius: 9, color: '#e5bd62' },
  { id: 'mend', name: 'Restoration', description: 'Restore 150 health to allied units in an 8-meter area.', cost: 50, cooldown: 42, radius: 8, color: '#77e6aa' },
];

export const DAMAGE_MULTIPLIERS = {
  normal: { light: 1.1, medium: 1, heavy: 0.9, fortified: 0.65 },
  piercing: { light: 1.35, medium: 1, heavy: 0.65, fortified: 0.5 },
  magic: { light: 0.85, medium: 1, heavy: 1.4, fortified: 0.7 },
  siege: { light: 1, medium: 1, heavy: 1.1, fortified: 2.15 },
};
