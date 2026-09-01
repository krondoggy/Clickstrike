(() => {
  "use strict";

  const HUD_MS = 100;
  const BATTLE_MS = 50;
  /** Soft DOM/perf ceiling; food upkeep is the real army limit. */
  const FIELD_SOFT_CAP = 40;
  const PLAYER_BASE_HP = 120;
  const MELEE_RANGE = 6;
  /** How far in Y (%) a unit may still lock a foe. */
  const LANE_TARGET_Y = 24;
  const PLAYER_SPAWN_X = 14;
  const ENEMY_SPAWN_X = 86;
  const BASE_EDGE_PLAYER = 12;
  const BASE_EDGE_ENEMY = 88;
  /** Vertical band of the field usable for troops (percent). */
  const FIELD_Y_MIN = 28;
  const FIELD_Y_MAX = 80;
  const LANE_COUNT = 7;
  const LANES = Array.from({ length: LANE_COUNT }, (_, i) =>
    FIELD_Y_MIN + (i / (LANE_COUNT - 1)) * (FIELD_Y_MAX - FIELD_Y_MIN)
  );
  const LANE_JITTER = 3.2;
  const SPAWN_X_JITTER = 2.4;
  /** Soft push so stacks break into a front. */
  const SEPARATION_DIST = 6.2;
  const SEPARATION_STRENGTH = 10;
  /** Base seconds to train one unit before it hits the field. */
  const BASE_TRAIN_TIME = 2;
  const TRAIN_RETRY = 0.25;
  const WAVE_TRANSITION_MS = 900;
  /** Seconds before wave 1 combat starts. */
  const OPENING_COUNTDOWN_S = 8;
  /** Multiplier applied to unit.spd when marching (lower = slower field pace). */
  const UNIT_MOVE_MULT = 0.9;
  /** Food drained per living player unit per second while battle is live. */
  const FOOD_UPKEEP_PER_UNIT = 0.35;
  const SAVE_KEY = "clickstrike-save-v1";
  const SAVE_VERSION = 3;
  const SAVE_THROTTLE_MS = 2000;
  const MUSIC_VOLUME_KEY = "clickstrike-music-volume";
  const MUSIC_MUTED_KEY = "clickstrike-music-muted";
  const MUSIC_TRACKS = [
    "assets/audio/music/07-human-1.mp3",
    "assets/audio/music/13-arrival-at-kalimdor.mp3",
  ];
  const FOOD_UPGRADE_IDS = { baskets: true, foragers: true };
  const MOBILE_MQ = "(max-width: 900px)";
  const MOBILE_PANE_KEY = "clickstrike-mobile-pane";
  /** Kill gold soft cap window (ms). */
  const KILL_GOLD_WINDOW_MS = 1000;

  const UPGRADES = [
    {
      id: "pickaxe",
      name: "Sharper Pick",
      desc: "+1 gold per click",
      baseCost: 15,
      growth: 1.55,
      apply(state) {
        state.clickPower += 1;
      },
    },
    {
      id: "traders",
      name: "Trade Routes",
      desc: "+0.5 gold / sec",
      baseCost: 40,
      growth: 1.65,
      apply(state) {
        state.goldPerSecond += 0.5;
      },
    },
    {
      id: "baskets",
      name: "Gather Baskets",
      desc: "+0.5 food per click",
      baseCost: 12,
      growth: 1.5,
      food: true,
      apply(state) {
        state.foodClickPower += 0.5;
      },
    },
    {
      id: "foragers",
      name: "Foraging Camp",
      desc: "+0.8 food / sec",
      baseCost: 35,
      growth: 1.6,
      food: true,
      apply(state) {
        state.foodPerSecond += 0.8;
      },
    },
    {
      id: "smithy",
      name: "Village Smithy",
      desc: "+2 gold click, +0.25 g/s",
      baseCost: 120,
      growth: 1.8,
      apply(state) {
        state.clickPower += 2;
        state.goldPerSecond += 0.25;
      },
    },
    {
      id: "granary",
      name: "Granary",
      desc: "−10% food upkeep / level",
      baseCost: 55,
      growth: 1.7,
      apply() {},
    },
    {
      id: "plunder",
      name: "Plunder Maps",
      desc: "+15% kill gold / level",
      baseCost: 65,
      growth: 1.65,
      apply() {},
    },
    {
      id: "caravan",
      name: "Caravan Guard",
      desc: "+12% win gold / level",
      baseCost: 70,
      growth: 1.7,
      apply() {},
    },
    {
      id: "weapons",
      name: "Forged Tips",
      desc: "+15% unit ATK",
      baseCost: 50,
      growth: 1.65,
      combat: true,
      apply() {},
    },
    {
      id: "armor",
      name: "Iron Plating",
      desc: "+1 unit armor",
      baseCost: 60,
      growth: 1.7,
      combat: true,
      apply() {},
    },
    {
      id: "vitality",
      name: "Field Rations",
      desc: "+12% unit max HP",
      baseCost: 55,
      growth: 1.65,
      combat: true,
      apply() {},
    },
    {
      id: "barracks",
      name: "Drill Yard",
      desc: "−12% recruit time",
      baseCost: 45,
      growth: 1.6,
      combat: true,
      apply() {},
    },
  ];

  const UNIT_TYPES = [
    {
      id: "spearman",
      name: "Spearman",
      cost: 12,
      foodCost: 18,
      hp: 28,
      atk: 5,
      spd: 3,
      armor: 1,
      atkCd: 0.55,
      range: 6,
      atkStyle: "melee",
      blurb: "Cheap front-liner",
    },
    {
      id: "archer",
      name: "Archer",
      cost: 40,
      foodCost: 20,
      hp: 14,
      atk: 11,
      spd: 4.5,
      armor: 0,
      atkCd: 0.4,
      range: 28,
      atkStyle: "ranged",
      blurb: "Shoots from afar",
    },
    {
      id: "knight",
      name: "Knight",
      cost: 100,
      foodCost: 52,
      hp: 45,
      atk: 13,
      spd: 2.5,
      armor: 3,
      atkCd: 0.7,
      range: 6,
      atkStyle: "melee",
      blurb: "Slow and sturdy",
    },
    {
      id: "rider",
      name: "Rider",
      cost: 55,
      foodCost: 28,
      hp: 22,
      atk: 9,
      spd: 5.5,
      armor: 0,
      atkCd: 0.45,
      range: 6,
      atkStyle: "melee",
      blurb: "Fast harasser",
      unlockWave: 3,
      unlockCost: 80,
    },
    {
      id: "mage",
      name: "Mage",
      cost: 85,
      foodCost: 35,
      hp: 12,
      atk: 18,
      spd: 3.2,
      armor: 0,
      atkCd: 0.75,
      range: 32,
      atkStyle: "magic",
      blurb: "Magic siege bolts",
      unlockWave: 5,
      unlockCost: 150,
    },
    {
      id: "guardian",
      name: "Guardian",
      cost: 70,
      foodCost: 60,
      hp: 70,
      atk: 6,
      spd: 1.8,
      armor: 5,
      atkCd: 0.85,
      range: 6,
      atkStyle: "melee",
      blurb: "Keep wall tank",
      unlockWave: 7,
      unlockCost: 120,
    },
  ];

  // Shared SVG portraits (field tokens + recruit cards)
  const UNIT_ART = {
    spearman:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<circle class="u-skin" cx="32" cy="22" r="9"/>` +
      `<path class="u-helm" d="M20 20c0-9 5-14 12-14s12 5 12 14v4H20z"/>` +
      `<path class="u-visor" d="M24 22h16v3H24z"/>` +
      `<path class="u-body" d="M22 32h20l3 22H19z"/>` +
      `<rect class="u-metal" x="29" y="8" width="3" height="48" rx="1"/>` +
      `<path class="u-point" d="M30.5 4l1.5-3 1.5 3z"/>` +
      `<path class="u-accent" d="M27 14h7v2h-7z"/>` +
      `</svg>`,
    archer:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-hood" d="M18 28c2-14 10-20 14-20s12 6 14 20l-4 4H22z"/>` +
      `<circle class="u-skin" cx="32" cy="26" r="7"/>` +
      `<path class="u-body" d="M23 34h18l2 20H21z"/>` +
      `<path class="u-bow" d="M14 18c-2 10-2 22 0 32 8-6 12-14 12-16S22 24 14 18z" fill="none"/>` +
      `<line class="u-string" x1="16" y1="20" x2="16" y2="48"/>` +
      `<line class="u-arrow" x1="16" y1="34" x2="42" y2="34"/>` +
      `<path class="u-point" d="M42 34l-4-2.5v5z"/>` +
      `<path class="u-accent" d="M28 38h8v2h-8z"/>` +
      `</svg>`,
    knight:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-crest" d="M30 4l2-3 2 3v8h-4z"/>` +
      `<path class="u-helm" d="M18 22c0-10 6-16 14-16s14 6 14 16v6H18z"/>` +
      `<path class="u-visor" d="M22 24h20v4H22z"/>` +
      `<circle class="u-skin" cx="32" cy="20" r="5"/>` +
      `<path class="u-body" d="M20 34h24l2 20H18z"/>` +
      `<path class="u-shield" d="M38 30h16v18c0 6-6 10-8 10s-8-4-8-10z"/>` +
      `<path class="u-accent" d="M44 36v12M40 42h8"/>` +
      `<rect class="u-metal" x="14" y="36" width="4" height="18" rx="1"/>` +
      `</svg>`,
    rider:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<ellipse class="u-body" cx="34" cy="42" rx="18" ry="10"/>` +
      `<path class="u-metal" d="M16 40c2-6 6-10 10-10 2 4 2 10 0 14z"/>` +
      `<circle class="u-skin" cx="28" cy="18" r="7"/>` +
      `<path class="u-helm" d="M20 18c0-8 4-12 8-12s8 4 8 12v3H20z"/>` +
      `<path class="u-visor" d="M23 19h10v2H23z"/>` +
      `<path class="u-accent" d="M24 28h10l2 10H22z"/>` +
      `<path class="u-point" d="M42 22l14 6-14 2z"/>` +
      `<path class="u-claw" d="M48 48l6 6M52 44l8 4"/>` +
      `</svg>`,
    mage:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-hood" d="M18 30c2-16 10-24 14-24s12 8 14 24l-4 6H22z"/>` +
      `<circle class="u-skin" cx="32" cy="28" r="7"/>` +
      `<path class="u-body" d="M22 36h20l4 22H18z"/>` +
      `<path class="u-accent" d="M28 42h8v14h-8z"/>` +
      `<circle class="u-gem" cx="32" cy="48" r="3"/>` +
      `<rect class="u-metal" x="44" y="20" width="3" height="28" rx="1"/>` +
      `<circle class="u-point" cx="45.5" cy="18" r="4"/>` +
      `</svg>`,
    guardian:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-helm" d="M18 20c0-10 6-16 14-16s14 6 14 16v8H18z"/>` +
      `<path class="u-visor" d="M22 24h20v5H22z"/>` +
      `<circle class="u-skin" cx="32" cy="18" r="5"/>` +
      `<path class="u-body" d="M16 34h32l3 24H13z"/>` +
      `<path class="u-shield" d="M8 28h18v26c0 4-4 8-9 8s-9-4-9-8z"/>` +
      `<path class="u-accent" d="M17 36v14M12 43h10"/>` +
      `<rect class="u-metal" x="42" y="32" width="5" height="22" rx="1"/>` +
      `<path class="u-point" d="M44.5 28l2.5-4 2.5 4z"/>` +
      `</svg>`,
    foe:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-horn" d="M18 18l-8-10 4 12zm28 0l8-10-4 12z"/>` +
      `<path class="u-hood" d="M16 26c2-12 10-18 16-18s14 6 16 18v6H16z"/>` +
      `<circle class="u-skin" cx="32" cy="28" r="8"/>` +
      `<path class="u-eye" d="M26 27h4v3h-4zm8 0h4v3h-4z"/>` +
      `<path class="u-body" d="M20 36h24l4 20H16z"/>` +
      `<path class="u-accent" d="M28 42h8v3h-8z"/>` +
      `<path class="u-claw" d="M18 48l-6 8h6zm28 0l6 8h-6z"/>` +
      `</svg>`,
    "foe-raider":
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-horn" d="M20 16l-6-8 2 10zm24 0l6-8-2 10z"/>` +
      `<path class="u-hood" d="M18 24c2-10 8-16 14-16s12 6 14 16v5H18z"/>` +
      `<circle class="u-skin" cx="32" cy="26" r="7"/>` +
      `<path class="u-eye" d="M27 25h3v2h-3zm7 0h3v2h-3z"/>` +
      `<path class="u-body" d="M22 34h20l2 18H20z"/>` +
      `<path class="u-point" d="M44 30l12 4-12 3z"/>` +
      `<path class="u-accent" d="M26 40h12v2H26z"/>` +
      `</svg>`,
    "foe-skirmisher":
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-hood" d="M18 28c2-14 10-20 14-20s12 6 14 20l-4 4H22z"/>` +
      `<circle class="u-skin" cx="32" cy="26" r="7"/>` +
      `<path class="u-eye" d="M27 25h3v2h-3zm7 0h3v2h-3z"/>` +
      `<path class="u-body" d="M23 34h18l2 20H21z"/>` +
      `<path class="u-bow" d="M48 18c2 10 2 22 0 32-8-6-12-14-12-16s4-10 12-16z" fill="none"/>` +
      `<line class="u-string" x1="46" y1="20" x2="46" y2="48"/>` +
      `<line class="u-arrow" x1="46" y1="34" x2="22" y2="34"/>` +
      `<path class="u-accent" d="M28 38h8v2h-8z"/>` +
      `</svg>`,
    "foe-brute":
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-horn" d="M14 20l-10-8 4 14zm36 0l10-8-4 14z"/>` +
      `<path class="u-hood" d="M12 28c2-12 12-18 20-18s18 6 20 18v8H12z"/>` +
      `<circle class="u-skin" cx="32" cy="30" r="10"/>` +
      `<path class="u-eye" d="M24 29h5v3h-5zm11 0h5v3h-5z"/>` +
      `<path class="u-body" d="M14 40h36l4 18H10z"/>` +
      `<path class="u-metal" d="M20 46h24v6H20z"/>` +
      `<path class="u-claw" d="M12 52l-8 8h8zm40 0l8 8h-8z"/>` +
      `<path class="u-accent" d="M26 44h12v3H26z"/>` +
      `</svg>`,
    "foe-cultist":
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-hood" d="M16 30c2-16 10-24 16-24s14 8 16 24l-5 6H21z"/>` +
      `<circle class="u-skin" cx="32" cy="28" r="7"/>` +
      `<path class="u-eye" d="M27 27h3v2h-3zm7 0h3v2h-3z"/>` +
      `<path class="u-body" d="M20 36h24l4 22H16z"/>` +
      `<circle class="u-gem" cx="32" cy="48" r="4"/>` +
      `<rect class="u-metal" x="46" y="18" width="3" height="30" rx="1"/>` +
      `<circle class="u-point" cx="47.5" cy="16" r="4"/>` +
      `<path class="u-accent" d="M28 40h8v3h-8z"/>` +
      `</svg>`,
    "foe-hound":
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<ellipse class="u-body" cx="34" cy="38" rx="18" ry="12"/>` +
      `<path class="u-hood" d="M12 34c2-8 8-14 14-14 2 4 2 10 0 14z"/>` +
      `<circle class="u-skin" cx="18" cy="30" r="6"/>` +
      `<path class="u-eye" d="M15 28h3v2h-3z"/>` +
      `<path class="u-horn" d="M14 22l-4-8 2 8zm8 0l4-8-2 8z"/>` +
      `<path class="u-claw" d="M44 46l6 8M50 42l8 6"/>` +
      `<path class="u-accent" d="M28 36h14v3H28z"/>` +
      `</svg>`,
    boss:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-crown" d="M16 16l6 8 6-10 6 10 6-8 4 14H12z"/>` +
      `<circle class="u-gem" cx="32" cy="18" r="3"/>` +
      `<path class="u-horn" d="M14 22l-8-8 2 12zm36 0l8-8-2 12z"/>` +
      `<path class="u-hood" d="M14 28c2-10 10-16 18-16s16 6 18 16v8H14z"/>` +
      `<circle class="u-skin" cx="32" cy="32" r="9"/>` +
      `<path class="u-eye" d="M25 31h5v3h-5zm9 0h5v3h-5z"/>` +
      `<path class="u-body" d="M16 40h32l4 18H12z"/>` +
      `<path class="u-accent" d="M26 46h12v4H26z"/>` +
      `<path class="u-metal" d="M22 52h20v4H22z"/>` +
      `</svg>`,
  };

  function unitArt(typeId, opts) {
    const boss = opts && opts.boss;
    if (boss) return UNIT_ART.boss;
    if (typeId && UNIT_ART[typeId]) return UNIT_ART[typeId];
    if (typeId && UNIT_ART["foe-" + typeId]) return UNIT_ART["foe-" + typeId];
    return UNIT_ART.foe;
  }

  const ENEMY_TYPES = {
    grunt: {
      id: "grunt",
      label: "Grunt",
      hp: 1,
      atk: 1,
      spd: 1,
      armorFlat: 0,
      atkCd: 1,
      range: 6,
      atkStyle: "melee",
      art: "foe",
    },
    raider: {
      id: "raider",
      label: "Raider",
      hp: 0.75,
      atk: 1.1,
      spd: 1.45,
      armorFlat: 0,
      atkCd: 0.95,
      range: 6,
      atkStyle: "melee",
      art: "foe-raider",
    },
    skirmisher: {
      id: "skirmisher",
      label: "Skirmisher",
      hp: 0.7,
      atk: 1.15,
      spd: 1.1,
      armorFlat: 0,
      atkCd: 0.9,
      range: 26,
      atkStyle: "ranged",
      art: "foe-skirmisher",
    },
    brute: {
      id: "brute",
      label: "Brute",
      hp: 1.55,
      atk: 0.9,
      spd: 0.7,
      armorFlat: 2,
      atkCd: 1.15,
      range: 6,
      atkStyle: "melee",
      art: "foe-brute",
    },
    cultist: {
      id: "cultist",
      label: "Cultist",
      hp: 0.65,
      atk: 1.35,
      spd: 0.95,
      armorFlat: 0,
      atkCd: 1.2,
      range: 30,
      atkStyle: "magic",
      art: "foe-cultist",
    },
    hound: {
      id: "hound",
      label: "Hound",
      hp: 0.55,
      atk: 0.95,
      spd: 1.7,
      armorFlat: 0,
      atkCd: 0.85,
      range: 6,
      atkStyle: "melee",
      art: "foe-hound",
    },
  };

  const DEFAULT_ENEMY_MIX = [
    { type: "grunt", w: 3 },
    { type: "raider", w: 1 },
  ];

  const LATE_ENEMY_MIX = [
    { type: "brute", w: 2 },
    { type: "skirmisher", w: 2 },
    { type: "cultist", w: 2 },
    { type: "raider", w: 1 },
    { type: "grunt", w: 1 },
  ];

  const WAVE_ROSTER = [
    {
      name: "Ragged Bandits",
      mix: [
        { type: "grunt", w: 3 },
        { type: "raider", w: 1 },
      ],
    },
    {
      name: "Wolf Pack",
      mix: [
        { type: "hound", w: 4 },
        { type: "raider", w: 1 },
      ],
      bossType: "hound",
    },
    {
      name: "Hill Raiders",
      mix: [
        { type: "raider", w: 3 },
        { type: "grunt", w: 2 },
      ],
      bossType: "raider",
    },
    {
      name: "Marsh Skirmishers",
      mix: [
        { type: "skirmisher", w: 3 },
        { type: "grunt", w: 2 },
        { type: "raider", w: 1 },
      ],
      bossType: "skirmisher",
    },
    {
      name: "Outlaw Captain",
      boss: true,
      bossType: "raider",
      mix: [
        { type: "raider", w: 2 },
        { type: "grunt", w: 2 },
        { type: "skirmisher", w: 1 },
      ],
    },
    {
      name: "Ogre Scout",
      mix: [
        { type: "brute", w: 2 },
        { type: "grunt", w: 2 },
        { type: "raider", w: 1 },
      ],
      bossType: "brute",
    },
    {
      name: "Bone Shamblers",
      mix: [
        { type: "grunt", w: 3 },
        { type: "brute", w: 1 },
        { type: "cultist", w: 1 },
      ],
    },
    {
      name: "Mercenary Company",
      mix: [
        { type: "grunt", w: 2 },
        { type: "skirmisher", w: 2 },
        { type: "raider", w: 1 },
      ],
      bossType: "skirmisher",
    },
    {
      name: "Ash Cultists",
      mix: [
        { type: "cultist", w: 3 },
        { type: "grunt", w: 2 },
        { type: "hound", w: 1 },
      ],
      bossType: "cultist",
    },
    {
      name: "Warband Chief",
      boss: true,
      bossType: "brute",
      mix: [
        { type: "brute", w: 2 },
        { type: "raider", w: 2 },
        { type: "grunt", w: 1 },
      ],
    },
    {
      name: "Ironclad Footmen",
      mix: [
        { type: "grunt", w: 2 },
        { type: "brute", w: 2 },
        { type: "skirmisher", w: 1 },
      ],
      bossType: "brute",
    },
    {
      name: "Night Stalkers",
      mix: [
        { type: "raider", w: 2 },
        { type: "hound", w: 2 },
        { type: "skirmisher", w: 1 },
      ],
      bossType: "raider",
    },
    {
      name: "Siege Brutes",
      mix: [
        { type: "brute", w: 4 },
        { type: "grunt", w: 1 },
      ],
      bossType: "brute",
    },
    {
      name: "Plague Bearers",
      mix: [
        { type: "grunt", w: 2 },
        { type: "cultist", w: 2 },
        { type: "brute", w: 1 },
      ],
      bossType: "cultist",
    },
    {
      name: "Dark Champion",
      boss: true,
      bossType: "brute",
      mix: [
        { type: "brute", w: 2 },
        { type: "cultist", w: 2 },
        { type: "skirmisher", w: 1 },
      ],
    },
    {
      name: "Frost Raiders",
      mix: [
        { type: "raider", w: 3 },
        { type: "skirmisher", w: 2 },
        { type: "hound", w: 1 },
      ],
      bossType: "raider",
    },
    {
      name: "Cinder Knights",
      mix: [
        { type: "brute", w: 3 },
        { type: "cultist", w: 1 },
        { type: "grunt", w: 1 },
      ],
      bossType: "brute",
    },
    {
      name: "Hollow Legion",
      mix: [
        { type: "grunt", w: 3 },
        { type: "skirmisher", w: 2 },
        { type: "brute", w: 1 },
      ],
    },
    {
      name: "Blood Hounds",
      mix: [
        { type: "hound", w: 4 },
        { type: "raider", w: 2 },
      ],
      bossType: "hound",
    },
    {
      name: "Tyrant of the Vale",
      boss: true,
      bossType: "brute",
      mix: [
        { type: "brute", w: 2 },
        { type: "cultist", w: 2 },
        { type: "raider", w: 1 },
        { type: "skirmisher", w: 1 },
      ],
    },
    {
      name: "Obsidian Guard",
      mix: [
        { type: "brute", w: 3 },
        { type: "skirmisher", w: 2 },
      ],
      bossType: "brute",
    },
    {
      name: "Storm Callers",
      mix: [
        { type: "cultist", w: 4 },
        { type: "skirmisher", w: 1 },
        { type: "grunt", w: 1 },
      ],
      bossType: "cultist",
    },
    {
      name: "Ruin Walkers",
      mix: [
        { type: "brute", w: 2 },
        { type: "grunt", w: 2 },
        { type: "cultist", w: 1 },
      ],
      bossType: "brute",
    },
    {
      name: "Dread Lancers",
      mix: [
        { type: "raider", w: 3 },
        { type: "brute", w: 1 },
        { type: "skirmisher", w: 1 },
      ],
      bossType: "raider",
    },
    {
      name: "Age Warden",
      boss: true,
      bossType: "brute",
      mix: LATE_ENEMY_MIX,
    },
  ];

  const el = {
    gold: document.getElementById("gold-display"),
    gps: document.getElementById("gps-display"),
    food: document.getElementById("food-display"),
    fps: document.getElementById("fps-display"),
    fpsPrefix: document.getElementById("fps-prefix"),
    wave: document.getElementById("wave-display"),
    clickPower: document.getElementById("click-power-display"),
    foodClickPower: document.getElementById("food-click-power-display"),
    clickBtn: document.getElementById("click-btn"),
    foodClickBtn: document.getElementById("food-click-btn"),
    upgradeList: document.getElementById("upgrade-list"),
    warChestList: document.getElementById("war-chest-list"),
    upgradeCatTabs: document.querySelectorAll(".upgrade-cat-tab"),
    recruitList: document.getElementById("recruit-list"),
    spawnHint: document.getElementById("spawn-hint"),
    wavePreview: document.getElementById("wave-preview"),
    loopStatus: document.getElementById("loop-status"),
    loopStatusText: document.getElementById("loop-status-text"),
    countdownBar: document.getElementById("countdown-bar"),
    countdownBarFill: document.getElementById("countdown-bar-fill"),
    statusLabel: document.getElementById("battle-status-label"),
    playerBaseFill: document.getElementById("player-base-fill"),
    playerBaseText: document.getElementById("player-base-text"),
    enemyBaseFill: document.getElementById("enemy-base-fill"),
    enemyBaseText: document.getElementById("enemy-base-text"),
    stripPlayerFill: document.getElementById("strip-player-fill"),
    stripEnemyFill: document.getElementById("strip-enemy-fill"),
    playerUnitCount: document.getElementById("player-unit-count"),
    enemyUnitCount: document.getElementById("enemy-unit-count"),
    battleStrip: document.getElementById("battle-strip"),
    basePlayer: document.getElementById("base-player"),
    baseEnemy: document.getElementById("base-enemy"),
    fieldUnits: document.getElementById("field-units"),
    bgMusic: document.getElementById("bg-music"),
    musicMuteBtn: document.getElementById("music-mute-btn"),
    newGameBtn: document.getElementById("new-game-btn"),
    goldPill: document.querySelector(".resource-gold"),
    foodPill: document.querySelector(".resource-food"),
    mobileNav: document.getElementById("mobile-nav"),
    upgradesTab: document.querySelector('#mobile-nav .mobile-tab[data-pane="upgrades"]'),
    upgradesTabBadge: document.querySelector(
      '#mobile-nav .mobile-tab[data-pane="upgrades"] .mobile-tab-badge'
    ),
    resourceDock: document.getElementById("resource-dock"),
    armyDockBtn: document.getElementById("army-dock-btn"),
    armySheet: document.getElementById("army-sheet"),
    armySheetBody: document.getElementById("army-sheet-body"),
    armySheetClose: document.getElementById("army-sheet-close"),
    armyHome: document.getElementById("army-home"),
    panelCommands: document.getElementById("panel-commands"),
    panelResource: document.getElementById("panel-resource"),
    hud: document.getElementById("hud"),
    topbar: document.getElementById("topbar"),
  };

  const state = {
    gold: 0,
    food: 36,
    clickPower: 1,
    foodClickPower: 1,
    goldPerSecond: 0,
    foodPerSecond: 0.2,
    upgradeLevels: defaultUpgradeLevelsDraft(),
    nextUnitId: 1,
    wave: 1,
    battle: null,
    laneCursor: 0,
    spawnCursor: 0,
    autoSpawn: defaultAutoSpawnDraft(),
    unlockedUnits: {},
    waveTransitioning: false,
    upgradeCategory: "economy",
  };

  function defaultUpgradeLevelsDraft() {
    const levels = {};
    for (const def of UPGRADES) levels[def.id] = 0;
    return levels;
  }

  function defaultAutoSpawnDraft() {
    const o = {};
    for (const t of UNIT_TYPES) o[t.id] = t.id === "spearman";
    return o;
  }

  function defaultAutoSpawn() {
    return defaultAutoSpawnDraft();
  }

  function defaultUnlockedUnits() {
    return {};
  }

  let lastSaveAt = 0;
  let lastRecruitSig = "";
  let lastRecruitStructureSig = "";
  let waveTransitionTimer = null;

  function defaultUpgradeLevels() {
    return defaultUpgradeLevelsDraft();
  }

  function isNonNegNum(n) {
    return typeof n === "number" && Number.isFinite(n) && n >= 0;
  }

  function serializeSave() {
    return {
      v: SAVE_VERSION,
      gold: state.gold,
      food: state.food,
      clickPower: state.clickPower,
      foodClickPower: state.foodClickPower,
      goldPerSecond: state.goldPerSecond,
      foodPerSecond: state.foodPerSecond,
      upgradeLevels: { ...state.upgradeLevels },
      wave: state.wave,
      nextUnitId: state.nextUnitId,
      autoSpawn: { ...state.autoSpawn },
      unlockedUnits: { ...state.unlockedUnits },
    };
  }

  function saveGame(force) {
    const now = Date.now();
    if (!force && now - lastSaveAt < SAVE_THROTTLE_MS) return;
    lastSaveAt = now;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(serializeSave()));
    } catch (_) {
      /* quota / private mode */
    }
  }

  function loadSave() {
    let raw;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (_) {
      return false;
    }
    if (!raw) return false;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      return false;
    }
    // Accept v1–v3 saves (migrate forward).
    if (!data || data.v < 1 || data.v > SAVE_VERSION) return false;
    if (
      !isNonNegNum(data.gold) ||
      !isNonNegNum(data.food) ||
      !isNonNegNum(data.clickPower) ||
      !isNonNegNum(data.foodClickPower) ||
      !isNonNegNum(data.goldPerSecond) ||
      !isNonNegNum(data.foodPerSecond) ||
      !isNonNegNum(data.wave) ||
      !isNonNegNum(data.nextUnitId)
    ) {
      return false;
    }
    const levels = defaultUpgradeLevels();
    if (data.upgradeLevels && typeof data.upgradeLevels === "object") {
      for (const id of Object.keys(levels)) {
        const lv = data.upgradeLevels[id];
        if (isNonNegNum(lv)) levels[id] = Math.floor(lv);
      }
    }
    const auto = defaultAutoSpawn();
    if (data.autoSpawn && typeof data.autoSpawn === "object") {
      for (const type of UNIT_TYPES) {
        if (typeof data.autoSpawn[type.id] === "boolean") {
          auto[type.id] = data.autoSpawn[type.id];
        }
      }
    }
    const unlocked = defaultUnlockedUnits();
    if (data.unlockedUnits && typeof data.unlockedUnits === "object") {
      for (const type of UNIT_TYPES) {
        if (type.unlockWave || type.unlockCost) {
          if (data.unlockedUnits[type.id] === true) unlocked[type.id] = true;
        }
      }
    }
    state.gold = data.gold;
    state.food = data.food;
    state.clickPower = data.clickPower;
    state.foodClickPower = data.foodClickPower;
    state.goldPerSecond = data.goldPerSecond;
    state.foodPerSecond = data.foodPerSecond;
    state.upgradeLevels = levels;
    state.wave = Math.max(1, Math.floor(data.wave));
    state.nextUnitId = Math.max(1, Math.floor(data.nextUnitId));
    state.autoSpawn = auto;
    state.unlockedUnits = unlocked;
    state.battle = null;
    state.waveTransitioning = false;
    return true;
  }

  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (_) {
      /* private mode */
    }
  }

  function resetMetaState() {
    if (waveTransitionTimer) {
      clearTimeout(waveTransitionTimer);
      waveTransitionTimer = null;
    }
    state.gold = 0;
    state.food = 36;
    state.clickPower = 1;
    state.foodClickPower = 1;
    state.goldPerSecond = 0;
    state.foodPerSecond = 0.2;
    state.upgradeLevels = defaultUpgradeLevels();
    state.nextUnitId = 1;
    state.wave = 1;
    state.battle = null;
    state.laneCursor = 0;
    state.spawnCursor = 0;
    state.autoSpawn = defaultAutoSpawn();
    state.unlockedUnits = defaultUnlockedUnits();
    state.waveTransitioning = false;
    el.fieldUnits.innerHTML = "";
  }

  function newGame() {
    if (
      !window.confirm(
        "Wipe save and start over? Music volume will be kept."
      )
    ) {
      return;
    }
    clearSave();
    resetMetaState();
    lastRecruitSig = "";
    lastRecruitStructureSig = "";
    appendLog("log-muted", "New game — wave 1 assault begins.");
    startBattle();
    renderHud();
  }

  function flashStatPills(mode) {
    const cls = mode === "win" ? "flash-win" : "flash-loss";
    const pills =
      mode === "win"
        ? [el.goldPill]
        : [el.goldPill, el.foodPill];
    for (const pill of pills) {
      if (!pill) continue;
      pill.classList.remove("flash-win", "flash-loss");
      void pill.offsetWidth;
      pill.classList.add(cls);
      setTimeout(() => pill.classList.remove(cls), 700);
    }
  }

  function format(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(1) + "k";
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.05) {
      return String(Math.round(n));
    }
    return n.toFixed(1);
  }

  function upgradeCost(def) {
    return Math.floor(def.baseCost * Math.pow(def.growth, state.upgradeLevels[def.id]));
  }

  function unitType(id) {
    return UNIT_TYPES.find((t) => t.id === id);
  }

  function unitNeedsUnlock(type) {
    return !!(type && (type.unlockWave || type.unlockCost));
  }

  function isUnitUnlocked(id) {
    const type = unitType(id);
    if (!type) return false;
    if (!unitNeedsUnlock(type)) return true;
    return !!state.unlockedUnits[id];
  }

  function unitUnlockWaveReached(type) {
    return state.wave >= (type.unlockWave || 1);
  }

  function canUnlockUnit(id) {
    const type = unitType(id);
    if (!type || !unitNeedsUnlock(type) || isUnitUnlocked(id)) return false;
    if (!unitUnlockWaveReached(type)) return false;
    return state.gold >= (type.unlockCost || 0);
  }

  function unlockUnit(id) {
    const type = unitType(id);
    if (!canUnlockUnit(id)) return false;
    state.gold -= type.unlockCost || 0;
    state.unlockedUnits[id] = true;
    appendLog("log-win", `Unlocked ${type.name} for the army.`);
    saveGame(true);
    return true;
  }

  function isBossWave(wave) {
    return wave % 5 === 0;
  }

  function isMiniBossWave(wave) {
    return wave % 5 === 3;
  }

  function isEliteWave(wave) {
    return isBossWave(wave) || isMiniBossWave(wave);
  }

  function waveKindLabel(wave) {
    if (isBossWave(wave)) return "Boss";
    if (isMiniBossWave(wave)) return "Mini-boss";
    return "Assault";
  }

  function waveRosterEntry(wave) {
    if (wave <= WAVE_ROSTER.length) return WAVE_ROSTER[wave - 1];
    return null;
  }

  function waveMeta(wave) {
    const entry = waveRosterEntry(wave);
    if (entry) {
      return {
        name: entry.name,
        boss: isBossWave(wave) || !!entry.boss,
        mini: isMiniBossWave(wave),
        mix: entry.mix || DEFAULT_ENEMY_MIX,
        bossType: entry.bossType || null,
      };
    }
    return {
      name: "Age Warden " + (wave - WAVE_ROSTER.length),
      boss: isBossWave(wave),
      mini: isMiniBossWave(wave),
      mix: LATE_ENEMY_MIX,
      bossType: "brute",
    };
  }

  function enemyBaseMaxHp(wave) {
    let hp = Math.floor(80 * Math.pow(1.16, wave - 1));
    if (isBossWave(wave)) hp = Math.floor(hp * 1.35);
    return hp;
  }

  function enemySpawnInterval(wave) {
    return Math.max(1.2, 2.8 - wave * 0.08);
  }

  function enemyBaseStats(wave) {
    // Shared wave curve; archetypes multiply on top.
    return {
      hp: Math.floor(15 * Math.pow(1.13, wave - 1)),
      atk: Math.floor(3.5 + wave * 1.15),
      spd: 2.5 + Math.floor((wave - 1) / 6) * 0.6,
      armor: Math.floor((wave - 1) / 4),
      atkCd: Math.max(0.35, 0.55 - wave * 0.008),
    };
  }

  function enemyTypeDef(typeId) {
    return ENEMY_TYPES[typeId] || ENEMY_TYPES.grunt;
  }

  function pickWeightedEnemyType(mix) {
    const list = mix && mix.length ? mix : DEFAULT_ENEMY_MIX;
    let total = 0;
    for (const entry of list) total += Math.max(0, entry.w || 0);
    if (total <= 0) return "grunt";
    let roll = Math.random() * total;
    for (const entry of list) {
      roll -= Math.max(0, entry.w || 0);
      if (roll <= 0) return entry.type in ENEMY_TYPES ? entry.type : "grunt";
    }
    const last = list[list.length - 1];
    return last && last.type in ENEMY_TYPES ? last.type : "grunt";
  }

  function pickEliteEnemyType(meta) {
    if (meta.bossType && ENEMY_TYPES[meta.bossType]) return meta.bossType;
    const mix = meta.mix || DEFAULT_ENEMY_MIX;
    const ids = mix.map((m) => m.type);
    if (ids.includes("brute")) return "brute";
    if (ids.includes("grunt")) return "grunt";
    return ids[0] && ENEMY_TYPES[ids[0]] ? ids[0] : "grunt";
  }

  /** @param {"normal"|"mini"|"boss"} rank */
  function enemyArchetypeStats(wave, typeId, rank) {
    const base = enemyBaseStats(wave);
    const arch = enemyTypeDef(typeId);
    let hp = Math.max(1, Math.floor(base.hp * arch.hp));
    let atk = Math.max(1, Math.floor(base.atk * arch.atk));
    let spd = Math.max(0.8, base.spd * arch.spd);
    let armor = Math.max(0, Math.floor(base.armor + (arch.armorFlat || 0)));
    let atkCd = Math.max(0.28, base.atkCd * (arch.atkCd || 1));

    if (rank === "boss") {
      hp = Math.floor(hp * 1.25);
      atk = Math.floor(atk * 1.15);
      armor += 1;
      atkCd += 0.05;
    } else if (rank === "mini") {
      hp = Math.floor(hp * 1.45);
      atk = Math.floor(atk * 1.2);
      armor += 1;
    }

    return {
      hp,
      atk,
      spd,
      armor,
      atkCd,
      range: arch.range || MELEE_RANGE,
      atkStyle: arch.atkStyle || "melee",
      typeId: arch.id,
      label: arch.label,
      art: arch.art,
      boss: rank === "boss",
      mini: rank === "mini",
    };
  }

  function playerUnitStats(type) {
    const w = state.upgradeLevels.weapons || 0;
    const a = state.upgradeLevels.armor || 0;
    const v = state.upgradeLevels.vitality || 0;
    return {
      maxHp: Math.max(1, Math.round(type.hp * (1 + 0.12 * v))),
      atk: Math.max(1, Math.round(type.atk * (1 + 0.15 * w))),
      armor: type.armor + a,
      spd: type.spd,
      atkCd: type.atkCd,
      range: type.range || MELEE_RANGE,
      atkStyle: type.atkStyle || "melee",
    };
  }

  function dealDamage(attacker, defender) {
    return Math.max(1, attacker.atk - (defender.armor || 0));
  }

  function winBonus(wave) {
    const base = Math.floor(25 + 14 * wave);
    const lv = state.upgradeLevels.caravan || 0;
    return Math.max(1, Math.floor(base * (1 + 0.12 * lv)));
  }

  function lossPenalty(wave) {
    return {
      gold: Math.floor(15 + 10 * wave),
      food: Math.floor(12 + 8 * wave),
    };
  }

  function inBattle() {
    return !!(state.battle && state.battle.active);
  }

  function inCountdown() {
    return !!(state.battle && state.battle.countdown > 0);
  }

  function setLoopStatusText(text) {
    if (el.loopStatusText) el.loopStatusText.textContent = text;
    else if (el.loopStatus) el.loopStatus.textContent = text;
  }

  function syncCountdownBar() {
    if (!el.countdownBar || !el.countdownBarFill) return;
    if (!inCountdown()) {
      el.countdownBar.hidden = true;
      el.countdownBar.setAttribute("aria-hidden", "true");
      el.countdownBarFill.style.width = "0%";
      if (el.loopStatus) el.loopStatus.classList.remove("is-countdown");
      return;
    }
    const b = state.battle;
    const max = Math.max(0.001, b.countdownMax || OPENING_COUNTDOWN_S);
    const pct = Math.max(0, Math.min(100, (b.countdown / max) * 100));
    el.countdownBar.hidden = false;
    el.countdownBar.setAttribute("aria-hidden", "false");
    el.countdownBarFill.style.width = pct + "%";
    if (el.loopStatus) el.loopStatus.classList.add("is-countdown");
  }

  function countSide(side) {
    if (!state.battle) return 0;
    return state.battle.units.filter((u) => u.side === side && u.hp > 0).length;
  }

  function clampFieldY(y) {
    return Math.max(FIELD_Y_MIN, Math.min(FIELD_Y_MAX, y));
  }

  function nextLane() {
    const living = state.battle
      ? state.battle.units.filter((u) => u.hp > 0)
      : [];
    let bestIdx = state.laneCursor % LANES.length;
    let bestCount = Infinity;
    for (let i = 0; i < LANES.length; i++) {
      const idx = (state.laneCursor + i) % LANES.length;
      const laneY = LANES[idx];
      const count = living.filter((u) => Math.abs(u.y - laneY) < 7).length;
      if (count < bestCount) {
        bestCount = count;
        bestIdx = idx;
      }
    }
    state.laneCursor = (bestIdx + 1) % LANES.length;
    const jitter = (Math.random() * 2 - 1) * LANE_JITTER;
    return clampFieldY(LANES[bestIdx] + jitter);
  }

  function spawnXFor(side) {
    const base = side === "player" ? PLAYER_SPAWN_X : ENEMY_SPAWN_X;
    return base + (Math.random() * 2 - 1) * SPAWN_X_JITTER;
  }

  function appendLog(cls, message) {
    if (!message) return;
    // Kill spam stays on floaters; muted hooks stay silent.
    if (cls === "log-kill" || cls === "log-muted") return;
    const statusCls =
      cls === "log-win" ? "won" : cls === "log-loss" ? "lost" : "fighting";
    setStatus(message, statusCls);
  }

  function setStatus(text, cls) {
    el.statusLabel.textContent = text;
    el.statusLabel.classList.remove("won", "lost", "fighting");
    if (cls) el.statusLabel.classList.add(cls);
  }

  function hpClass(hp, maxHp) {
    const pct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
    if (pct <= 25) return "critical";
    if (pct <= 50) return "low";
    return "";
  }

  function renderBaseBars() {
    const pb = state.battle
      ? state.battle.playerBase
      : { hp: PLAYER_BASE_HP, maxHp: PLAYER_BASE_HP };
    const ebMax = enemyBaseMaxHp(state.wave);
    const eb = state.battle
      ? state.battle.enemyBase
      : { hp: ebMax, maxHp: ebMax };

    const pPct = (Math.max(0, pb.hp) / pb.maxHp) * 100;
    const ePct = (Math.max(0, eb.hp) / eb.maxHp) * 100;

    el.playerBaseFill.style.width = pPct + "%";
    el.enemyBaseFill.style.width = ePct + "%";
    el.playerBaseText.textContent = Math.ceil(Math.max(0, pb.hp)) + "/" + pb.maxHp;
    el.enemyBaseText.textContent = Math.ceil(Math.max(0, eb.hp)) + "/" + eb.maxHp;

    el.playerBaseFill.classList.remove("low", "critical");
    el.enemyBaseFill.classList.remove("low", "critical");
    const pc = hpClass(pb.hp, pb.maxHp);
    const ec = hpClass(eb.hp, eb.maxHp);
    if (pc) el.playerBaseFill.classList.add(pc);
    if (ec) el.enemyBaseFill.classList.add(ec);

    el.basePlayer.classList.toggle("critical", pb.hp / pb.maxHp <= 0.25);
    el.baseEnemy.classList.toggle("critical", eb.hp / eb.maxHp <= 0.25);

    renderBattleStrip(pb, eb, pPct, ePct, pc, ec);
  }

  function renderBattleStrip(pb, eb, pPct, ePct, pc, ec) {
    if (!el.battleStrip) return;

    const playerUnits = countSide("player");
    const enemyUnits = countSide("enemy");

    if (el.stripPlayerFill) {
      el.stripPlayerFill.style.width = pPct + "%";
      el.stripPlayerFill.classList.remove("low", "critical");
      if (pc) el.stripPlayerFill.classList.add(pc);
    }
    if (el.stripEnemyFill) {
      el.stripEnemyFill.style.width = ePct + "%";
      el.stripEnemyFill.classList.remove("low", "critical");
      if (ec) el.stripEnemyFill.classList.add(ec);
    }
    if (el.playerUnitCount) el.playerUnitCount.textContent = String(playerUnits);
    if (el.enemyUnitCount) el.enemyUnitCount.textContent = String(enemyUnits);

    const pHp = Math.ceil(Math.max(0, pb.hp));
    const eHp = Math.ceil(Math.max(0, eb.hp));
    el.battleStrip.setAttribute(
      "aria-label",
      `Battle: you ${playerUnits} units, keep ${pHp}/${pb.maxHp}; foe ${enemyUnits} units, keep ${eHp}/${eb.maxHp}`
    );
  }

  function getTokenEl(id) {
    return el.fieldUnits.querySelector(`[data-fighter-id="${id}"]`);
  }

  function mountToken(u) {
    const existing = getTokenEl(u.id);
    if (existing) {
      updateTokenEl(u, existing);
      return existing;
    }
    const wrap = document.createElement("div");
    const pct = u.maxHp > 0 ? (Math.max(0, u.hp) / u.maxHp) * 100 : 0;
    let fill = "";
    if (u.hp <= 0) fill = "empty";
    else if (pct <= 25) fill = "critical";
    else if (pct <= 50) fill = "low";

    const typeClass =
      u.side === "player"
        ? "type-" + (u.typeId || "spearman")
        : "foe foe-" + (u.typeId || "grunt");
    const classes = [
      "unit-token",
      typeClass,
      u.side === "enemy" ? "enemy" : "player",
      u.boss ? "boss" : "",
      u.mini ? "elite" : "",
      "spawning",
    ]
      .filter(Boolean)
      .join(" ");

    const artKey =
      u.side === "player"
        ? u.typeId || "spearman"
        : u.art || "foe-" + (u.typeId || "grunt");
    wrap.className = classes;
    wrap.dataset.fighterId = u.id;
    wrap.style.setProperty("--x", u.x + "%");
    wrap.style.setProperty("--y", u.y + "%");
    wrap.innerHTML =
      `<div class="unit-sil" aria-hidden="true">${unitArt(artKey, { boss: !!u.boss })}</div>` +
      `<div class="unit-name">${u.name}</div>` +
      `<div class="hp-bar">` +
      `<div class="hp-bar-fill ${fill}" style="width:${pct}%"></div>` +
      `<span class="hp-bar-text">${Math.max(0, Math.ceil(u.hp))}/${u.maxHp}</span>` +
      `</div>`;
    el.fieldUnits.appendChild(wrap);
    setTimeout(() => wrap.classList.remove("spawning"), 300);
    return wrap;
  }

  function updateTokenEl(u, node) {
    if (!node) node = getTokenEl(u.id);
    if (!node) return;
    node.style.setProperty("--x", u.x + "%");
    node.style.setProperty("--y", u.y + "%");
    const pct = u.maxHp > 0 ? (Math.max(0, u.hp) / u.maxHp) * 100 : 0;
    const fill = node.querySelector(".hp-bar-fill");
    const text = node.querySelector(".hp-bar-text");
    if (fill) {
      fill.style.width = pct + "%";
      fill.classList.remove("empty", "low", "critical");
      if (u.hp <= 0) fill.classList.add("empty");
      else if (pct <= 25) fill.classList.add("critical");
      else if (pct <= 50) fill.classList.add("low");
    }
    if (text) text.textContent = Math.max(0, Math.ceil(u.hp)) + "/" + u.maxHp;
    node.classList.toggle("downed", u.hp <= 0);
  }

  function flashToken(id, kind) {
    const node = getTokenEl(id);
    if (!node) return;
    const cls = kind === "attack" ? "flash-attack" : "flash-hit";
    node.classList.remove("flash-attack", "flash-hit");
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), 180);
  }

  function lungeToken(id, side) {
    const node = getTokenEl(id);
    if (!node) return;
    const cls = side === "player" ? "lunge-right" : "lunge-left";
    node.classList.remove("lunge-right", "lunge-left");
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), 180);
  }

  function spawnFloater(x, y, amount, slain) {
    const d = document.createElement("div");
    d.className = "dmg-floater" + (slain ? " kill" : "");
    d.style.setProperty("--x", x + "%");
    d.style.setProperty("--y", y + "%");
    d.textContent = "−" + amount;
    el.fieldUnits.appendChild(d);
    setTimeout(() => d.remove(), 700);
  }

  function spawnGoldFloater(x, y, amount) {
    const d = document.createElement("div");
    d.className = "dmg-floater gold-gain";
    d.style.setProperty("--x", x + "%");
    d.style.setProperty("--y", y + "%");
    d.textContent = "+" + amount + "g";
    el.fieldUnits.appendChild(d);
    setTimeout(() => d.remove(), 700);
  }

  function killGoldPayout(target) {
    let amount = 2 + state.wave * 0.5;
    if (target && target.boss) amount *= 1.5;
    else if (target && target.mini) amount *= 1.25;
    const lv = state.upgradeLevels.plunder || 0;
    amount *= 1 + 0.15 * lv;
    return Math.max(1, Math.floor(amount));
  }

  function killGoldCap() {
    return 8 + state.wave;
  }

  function awardKillGold(target) {
    const b = state.battle;
    if (!b || !b.active) return;
    const now = Date.now();
    if (!b.killGoldWindow || now - b.killGoldWindow.t0 >= KILL_GOLD_WINDOW_MS) {
      b.killGoldWindow = { t0: now, accrued: 0 };
    }
    const want = killGoldPayout(target);
    const room = Math.max(0, killGoldCap() - b.killGoldWindow.accrued);
    const pay = Math.min(want, room);
    if (pay <= 0) return;
    b.killGoldWindow.accrued += pay;
    state.gold += pay;
    spawnGoldFloater(target.x, target.y, pay);
    syncResourceDisplays();
  }

  function markDead(u) {
    u.hp = 0;
    u.removeAt = Date.now() + 400;
    const node = getTokenEl(u.id);
    if (node) {
      node.classList.add("downed", "falling");
      updateTokenEl(u, node);
    }
  }

  function syncFieldPositions() {
    if (!state.battle) {
      el.fieldUnits.innerHTML = "";
      return;
    }
    const now = Date.now();
    for (const u of state.battle.units) {
      if (u.hp <= 0 && u.removeAt && now >= u.removeAt) {
        const node = getTokenEl(u.id);
        if (node) node.remove();
        continue;
      }
      if (!getTokenEl(u.id)) mountToken(u);
      else updateTokenEl(u);
    }
  }

  function createPlayerUnit(typeId) {
    if (!inBattle()) return false;
    const type = unitType(typeId);
    if (!type) return false;
    if (countSide("player") >= FIELD_SOFT_CAP) return false;

    const stats = playerUnitStats(type);
    const homeY = nextLane();
    const unit = {
      id: "p" + state.nextUnitId++,
      side: "player",
      typeId: type.id,
      name: type.name,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      atk: stats.atk,
      armor: stats.armor,
      spd: stats.spd,
      atkCdMax: stats.atkCd,
      range: stats.range,
      atkStyle: stats.atkStyle,
      x: spawnXFor("player"),
      y: homeY,
      homeY,
      attackCd: 0,
      boss: false,
    };
    state.battle.units.push(unit);
    mountToken(unit);
    return true;
  }

  function refundTraining() {
    const t = state.battle && state.battle.training;
    if (!t) return;
    state.gold += t.goldPaid || 0;
    state.food += t.foodPaid || 0;
    state.battle.training = null;
  }

  function startTraining(typeId) {
    if (!inBattle() || inCountdown()) return false;
    if (!isUnitUnlocked(typeId)) return false;
    const b = state.battle;
    if (!b || b.training) return false;
    const type = unitType(typeId);
    if (!type) return false;
    if (state.gold < type.cost || state.food < type.foodCost) return false;
    if (countSide("player") >= FIELD_SOFT_CAP) return false;

    state.gold -= type.cost;
    state.food -= type.foodCost;
    b.training = {
      typeId: type.id,
      elapsed: 0,
      duration: trainDuration(),
      goldPaid: type.cost,
      foodPaid: type.foodCost,
    };
    b.trainRetryAt = 0;
    saveGame(true);
    syncSpawnProgress();
    return true;
  }

  function trainBlockReason(typeId) {
    if (!inBattle() || inCountdown()) {
      return "Wait for the assault to begin";
    }
    if (!isUnitUnlocked(typeId)) return "Unit is locked";
    const b = state.battle;
    if (!b) return "No active battle";
    if (b.training) {
      const t = unitType(b.training.typeId);
      return t ? `Training ${t.name}…` : "Already training…";
    }
    const type = unitType(typeId);
    if (!type) return "Unknown unit";
    if (state.gold < type.cost && state.food < type.foodCost) {
      return "Need more gold and food";
    }
    if (state.gold < type.cost) return "Need more gold";
    if (state.food < type.foodCost) return "Need more food";
    if (countSide("player") >= FIELD_SOFT_CAP) return "Field is full";
    return "Can't train right now";
  }

  function pulseRecruitCard(card, cls) {
    if (!card) return;
    card.classList.remove("buy-flash", "buy-deny");
    void card.offsetWidth;
    card.classList.add(cls);
    setTimeout(() => card.classList.remove(cls), cls === "buy-flash" ? 480 : 320);
  }

  function tryBuyUnit(typeId, card) {
    if (startTraining(typeId)) {
      pulseRecruitCard(card, "buy-flash");
      renderHud();
      return true;
    }
    pulseRecruitCard(card, "buy-deny");
    if (el.spawnHint) {
      el.spawnHint.textContent = trainBlockReason(typeId);
    }
    return false;
  }

  function completeTraining() {
    const b = state.battle;
    if (!b || !b.training) return;
    const typeId = b.training.typeId;
    b.training = null;
    createPlayerUnit(typeId);
    saveGame(true);
  }

  function tryStartNextTraining() {
    const enabled = enabledSpawnTypes();
    if (enabled.length === 0) return false;
    if (countSide("player") >= FIELD_SOFT_CAP) return false;

    for (let i = 0; i < enabled.length; i++) {
      const idx = (state.spawnCursor + i) % enabled.length;
      const type = enabled[idx];
      if (startTraining(type.id)) {
        state.spawnCursor = (idx + 1) % enabled.length;
        return true;
      }
    }
    return false;
  }

  function tickTraining(dt) {
    const b = state.battle;
    if (!b || !b.active || inCountdown()) return;

    if (b.training) {
      b.training.elapsed += dt;
      if (b.training.elapsed >= b.training.duration) {
        completeTraining();
        tryStartNextTraining();
      }
      syncSpawnProgress();
      return;
    }

    b.trainRetryAt = Math.max(0, (b.trainRetryAt || 0) - dt);
    if (b.trainRetryAt <= 0) {
      if (!tryStartNextTraining()) {
        b.trainRetryAt = TRAIN_RETRY;
      }
    }
  }

  function syncSpawnProgress() {
    if (!el.recruitList) return;
    const training = state.battle && state.battle.training;
    const cards = el.recruitList.querySelectorAll(".recruit-card");
    for (const card of cards) {
      const fill = card.querySelector(".spawn-bar-fill");
      const track = card.querySelector(".spawn-bar");
      if (!fill || !track) continue;
      const active = !!(training && training.typeId === card.dataset.id);
      track.classList.toggle("active", active);
      card.classList.toggle("training", active);
      if (active) {
        const pct = Math.min(100, (training.elapsed / training.duration) * 100);
        fill.style.width = pct + "%";
      } else {
        fill.style.width = "0%";
      }
    }
  }

  function spawnEnemyUnit() {
    if (!inBattle()) return;
    if (countSide("enemy") >= FIELD_SOFT_CAP) return;

    const b = state.battle;
    const meta = waveMeta(state.wave);
    let rank = "normal";
    let typeId;

    if (b.elitePending) {
      b.elitePending = false;
      if (isBossWave(state.wave)) rank = "boss";
      else if (isMiniBossWave(state.wave)) rank = "mini";
      typeId = pickEliteEnemyType(meta);
    } else {
      typeId = pickWeightedEnemyType(meta.mix);
    }

    const stats = enemyArchetypeStats(state.wave, typeId, rank);
    let name;
    if (rank === "boss" || rank === "mini") {
      name = meta.name;
    } else {
      name = stats.label;
    }
    const homeY = nextLane();
    const unit = {
      id: "e" + state.nextUnitId++,
      side: "enemy",
      typeId: stats.typeId,
      art: stats.art,
      name,
      hp: stats.hp,
      maxHp: stats.hp,
      atk: stats.atk,
      armor: stats.armor,
      spd: stats.spd,
      atkCdMax: stats.atkCd,
      range: stats.range,
      atkStyle: stats.atkStyle,
      x: spawnXFor("enemy"),
      y: homeY,
      homeY,
      attackCd: 0,
      boss: !!stats.boss,
      mini: !!stats.mini,
    };
    b.enemySpawned = (b.enemySpawned || 0) + 1;
    b.units.push(unit);
    mountToken(unit);
  }

  function findTarget(unit) {
    const foes = state.battle.units.filter(
      (o) =>
        o.side !== unit.side &&
        o.hp > 0 &&
        Math.abs(o.y - unit.y) < LANE_TARGET_Y
    );
    if (foes.length === 0) return null;
    foes.sort((a, b) => {
      const da = Math.abs(a.x - unit.x) + Math.abs(a.y - unit.y) * 0.35;
      const db = Math.abs(b.x - unit.x) + Math.abs(b.y - unit.y) * 0.35;
      return da - db;
    });
    return foes[0];
  }

  function enabledSpawnTypes() {
    return UNIT_TYPES.filter(
      (t) => state.autoSpawn[t.id] && isUnitUnlocked(t.id)
    );
  }

  function toggleAutoSpawn(typeId) {
    if (!(typeId in state.autoSpawn)) return;
    if (!isUnitUnlocked(typeId)) return;
    state.autoSpawn[typeId] = !state.autoSpawn[typeId];
    if (state.autoSpawn[typeId]) {
      tryStartNextTraining();
    }
    saveGame(true);
    renderHud();
  }

  function endBattle(won) {
    if (!state.battle || !state.battle.active) return;
    refundTraining();
    state.battle.active = false;
    state.waveTransitioning = true;

    if (won) {
      const bonus = winBonus(state.wave);
      state.gold += bonus;
      setStatus("Victory", "won");
      appendLog(
        "log-win",
        `Enemy keep destroyed! +${format(bonus)} gold. Advancing to wave ${state.wave + 1}.`
      );
      state.wave += 1;
      flashStatPills("win");
    } else {
      const prev = state.wave;
      const penalty = lossPenalty(prev);
      const goldLost = Math.min(state.gold, penalty.gold);
      const foodLost = Math.min(state.food, penalty.food);
      state.gold = Math.max(0, state.gold - goldLost);
      state.food = Math.max(0, state.food - foodLost);
      state.wave = Math.max(1, state.wave - 1);
      setStatus("Defeat", "lost");
      const lossBits =
        `−${format(goldLost)} gold, −${format(foodLost)} food`;
      if (state.wave < prev) {
        appendLog(
          "log-loss",
          `Your keep fell. ${lossBits}. Pushed back to wave ${state.wave}.`
        );
      } else {
        appendLog(
          "log-loss",
          `Your keep fell. ${lossBits}. Holding wave 1.`
        );
      }
      flashStatPills("loss");
    }

    saveGame(true);
    renderHud();

    if (waveTransitionTimer) clearTimeout(waveTransitionTimer);
    waveTransitionTimer = setTimeout(() => {
      waveTransitionTimer = null;
      el.fieldUnits.innerHTML = "";
      state.battle = null;
      state.waveTransitioning = false;
      startBattle();
    }, WAVE_TRANSITION_MS);
  }

  function isRangedStyle(style) {
    return style === "ranged" || style === "magic";
  }

  function engageRange(unit) {
    return unit.range || MELEE_RANGE;
  }

  function spawnProjectile(fromX, fromY, toX, toY, style) {
    const d = document.createElement("div");
    const kind = style === "magic" ? "bolt" : "arrow";
    d.className = "projectile " + kind;
    d.style.setProperty("--x0", fromX + "%");
    d.style.setProperty("--y0", fromY + "%");
    d.style.setProperty("--x1", toX + "%");
    d.style.setProperty("--y1", toY + "%");
    const ang = (Math.atan2(toY - fromY, toX - fromX) * 180) / Math.PI;
    d.style.setProperty("--ang", ang + "deg");
    el.fieldUnits.appendChild(d);
    setTimeout(() => d.remove(), 280);
  }

  function applyUnitHit(attacker, target) {
    if (!target || target.hp <= 0) return;
    const dmg = dealDamage(attacker, target);
    target.hp -= dmg;
    flashToken(target.id, "hit");
    spawnFloater(target.x, target.y, dmg, target.hp <= 0);
    updateTokenEl(target);
    if (target.hp <= 0) {
      markDead(target);
      appendLog("log-kill", `${attacker.name} fells ${target.name}!`);
      if (attacker.side === "player" && target.side === "enemy") {
        awardKillGold(target);
      }
    }
  }

  function strikeUnit(attacker, target) {
    attacker.attackCd = attacker.atkCdMax;
    flashToken(attacker.id, "attack");
    if (isRangedStyle(attacker.atkStyle)) {
      spawnProjectile(attacker.x, attacker.y, target.x, target.y, attacker.atkStyle);
      applyUnitHit(attacker, target);
    } else {
      lungeToken(attacker.id, attacker.side);
      applyUnitHit(attacker, target);
    }
  }

  function strikeBase(unit, baseKey, baseX) {
    const b = state.battle;
    if (!b || !b.active) return false;
    const base = b[baseKey];
    unit.attackCd = unit.atkCdMax;
    flashToken(unit.id, "attack");
    if (isRangedStyle(unit.atkStyle)) {
      spawnProjectile(unit.x, unit.y, baseX, unit.y, unit.atkStyle);
    } else {
      lungeToken(unit.id, unit.side);
    }
    base.hp -= unit.atk;
    spawnFloater(baseX, unit.y, unit.atk, base.hp <= 0);
    if (base.hp <= 0) {
      base.hp = 0;
      renderBaseBars();
      endBattle(baseKey === "enemyBase");
      return true;
    }
    return false;
  }

  function moveTowardEngage(unit, targetX, targetY, engage, step, dt) {
    const dist = Math.abs(targetX - unit.x);
    const stopAt = Math.max(engage * 0.85, MELEE_RANGE * 0.5);
    if (dist > stopAt) {
      if (unit.x < targetX) unit.x = Math.min(unit.x + step, targetX - stopAt);
      else unit.x = Math.max(unit.x - step, targetX + stopAt);
    }
    const home = unit.homeY != null ? unit.homeY : unit.y;
    // Keep some lane identity so melees don't collapse into one file.
    const desiredY = targetY * 0.5 + home * 0.5;
    const dy = desiredY - unit.y;
    if (Math.abs(dy) > 1) {
      unit.y = clampFieldY(
        unit.y + Math.sign(dy) * Math.min(5.5 * dt, Math.abs(dy))
      );
    }
  }

  function applyUnitSeparation(living, dt) {
    for (let i = 0; i < living.length; i++) {
      const a = living[i];
      let pushX = 0;
      let pushY = 0;
      for (let j = 0; j < living.length; j++) {
        if (i === j) continue;
        const b = living[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy * 1.35);
        if (dist < 0.05 || dist >= SEPARATION_DIST) continue;
        const force = (SEPARATION_DIST - dist) / SEPARATION_DIST;
        const weight = a.side === b.side ? 1.2 : 0.45;
        pushX += (dx / dist) * force * weight;
        pushY += (dy / dist) * force * weight;
      }
      if (!pushX && !pushY) continue;
      a.x = Math.max(8, Math.min(92, a.x + pushX * SEPARATION_STRENGTH * dt));
      a.y = clampFieldY(a.y + pushY * SEPARATION_STRENGTH * 1.4 * dt);
    }
  }

  function beginCombat() {
    const b = state.battle;
    if (!b || !b.active) return;
    b.countdown = 0;
    b.countdownMax = 0;
    b.enemySpawnAt = 0.6;
    b.training = null;
    b.trainRetryAt = 0;
    syncCountdownBar();
    appendLog(
      "log-muted",
      `Wave ${state.wave}: ${waveMeta(state.wave).name} — keep the line fed!`
    );
    setStatus("Fighting", "fighting");
    spawnEnemyUnit();
    tryStartNextTraining();
    renderHud();
  }

  function battleTick(dt) {
    const b = state.battle;
    if (!b || !b.active) return;

    if (b.countdown > 0) {
      const prevCeil = Math.ceil(b.countdown);
      b.countdown = Math.max(0, b.countdown - dt);
      if (b.countdown <= 0) {
        beginCombat();
        return;
      }
      const nextCeil = Math.ceil(b.countdown);
      if (nextCeil !== prevCeil) {
        setStatus(`Starts in ${nextCeil}`, "fighting");
      }
      setLoopStatusText(`Starts in ${nextCeil}…`);
      syncCountdownBar();
      renderBaseBars();
      return;
    }

    b.enemySpawnAt -= dt;
    if (b.enemySpawnAt <= 0) {
      spawnEnemyUnit();
      b.enemySpawnAt = enemySpawnInterval(state.wave);
    }

    tickTraining(dt);

    const living = b.units.filter((u) => u.hp > 0);

    for (const unit of living) {
      unit.attackCd = Math.max(0, unit.attackCd - dt);
      const target = findTarget(unit);
      const dir = unit.side === "player" ? 1 : -1;
      const moveSpeed = unit.spd * UNIT_MOVE_MULT;
      const step = moveSpeed * dt;
      const engage = engageRange(unit);

      if (target) {
        const dist = Math.abs(target.x - unit.x);
        if (dist <= engage) {
          if (unit.attackCd <= 0) strikeUnit(unit, target);
        } else {
          moveTowardEngage(unit, target.x, target.y, engage, step, dt);
        }
      } else {
        const baseX = unit.side === "player" ? BASE_EDGE_ENEMY : BASE_EDGE_PLAYER;
        const distToBase = Math.abs(baseX - unit.x);
        if (distToBase <= engage) {
          if (unit.attackCd <= 0) {
            const baseKey = unit.side === "player" ? "enemyBase" : "playerBase";
            if (strikeBase(unit, baseKey, baseX)) return;
          }
        } else {
          unit.x += dir * step;
          if (unit.side === "player") unit.x = Math.min(unit.x, baseX);
          else unit.x = Math.max(unit.x, baseX);
          const home = unit.homeY != null ? unit.homeY : unit.y;
          const dy = home - unit.y;
          if (Math.abs(dy) > 0.8) {
            unit.y = clampFieldY(
              unit.y + Math.sign(dy) * Math.min(3.8 * dt, Math.abs(dy))
            );
          }
        }
      }
    }

    applyUnitSeparation(living, dt);

    const now = Date.now();
    b.units = b.units.filter((u) => u.hp > 0 || (u.removeAt && now < u.removeAt));
    syncFieldPositions();
    renderBaseBars();
  }

  function startBattle() {
    if (inBattle()) return;

    const eMax = enemyBaseMaxHp(state.wave);
    const opening = state.wave === 1;
    el.fieldUnits.innerHTML = "";
    state.battle = {
      active: true,
      playerBase: { hp: PLAYER_BASE_HP, maxHp: PLAYER_BASE_HP },
      enemyBase: { hp: eMax, maxHp: eMax },
      units: [],
      enemySpawnAt: 0.6,
      training: null,
      trainRetryAt: 0,
      foodStarvedWarned: false,
      countdown: opening ? OPENING_COUNTDOWN_S : 0,
      countdownMax: opening ? OPENING_COUNTDOWN_S : 0,
      catapultUsed: false,
      killGoldWindow: null,
      elitePending: isEliteWave(state.wave),
      enemySpawned: 0,
    };
    state.laneCursor = 0;
    state.waveTransitioning = false;

    if (opening) {
      appendLog(
        "log-muted",
        `Wave ${state.wave} assault begins in ${OPENING_COUNTDOWN_S}… prepare your economy.`
      );
      setStatus(`Starts in ${OPENING_COUNTDOWN_S}`, "fighting");
      renderHud();
    } else {
      appendLog(
        "log-muted",
        `Wave ${state.wave}: ${waveMeta(state.wave).name} — keep the line fed!`
      );
      setStatus("Fighting", "fighting");
      spawnEnemyUnit();
      tryStartNextTraining();
      renderHud();
    }
  }

  function buyUpgrade(id) {
    const def = UPGRADES.find((u) => u.id === id);
    const cost = upgradeCost(def);
    if (state.gold < cost) return;
    state.gold -= cost;
    state.upgradeLevels[id] += 1;
    def.apply(state);
    saveGame(true);
    renderHud();
  }

  function combatBonusText(def, level) {
    if (def.id === "weapons") return `+${Math.round(15 * level)}% ATK`;
    if (def.id === "armor") return `+${level} armor`;
    if (def.id === "vitality") return `+${Math.round(12 * level)}% HP`;
    if (def.id === "barracks") return `−${Math.round(100 * (1 - Math.pow(0.88, level)))}% time`;
    if (def.id === "granary") {
      const rate = upkeepPerUnit();
      return `${format(rate)} f/s per troop`;
    }
    if (def.id === "plunder") return `+${Math.round(15 * level)}% kill gold`;
    if (def.id === "caravan") return `+${Math.round(12 * level)}% win gold`;
    return def.desc;
  }

  function trainDuration() {
    const lv = state.upgradeLevels.barracks || 0;
    return Math.max(0.45, BASE_TRAIN_TIME * Math.pow(0.88, lv));
  }

  function upkeepPerUnit() {
    const lv = state.upgradeLevels.granary || 0;
    return Math.max(0.12, FOOD_UPKEEP_PER_UNIT * Math.pow(0.9, lv));
  }

  let lastAffordableUpgradeCount = -1;
  let lastAffordableEconomyCount = -1;
  let lastAffordableTroopsCount = -1;

  function upgradeMatchesCategory(def, category) {
    const isCombat = !!def.combat;
    return category === "troops" ? isCombat : !isCombat;
  }

  function countAffordableUpgrades(category) {
    let n = 0;
    for (const def of UPGRADES) {
      if (category && !upgradeMatchesCategory(def, category)) continue;
      if (state.gold >= upgradeCost(def)) n += 1;
    }
    return n;
  }

  function setUpgradeCategory(category) {
    if (category !== "economy" && category !== "troops") return;
    if (state.upgradeCategory === category) return;
    state.upgradeCategory = category;
    syncUpgradeCatTabs();
    renderUpgrades();
  }

  function syncUpgradeCatTabs() {
    const activeId =
      state.upgradeCategory === "troops"
        ? "upgrade-tab-troops"
        : "upgrade-tab-economy";
    el.upgradeCatTabs.forEach((tab) => {
      const on = tab.dataset.upgradeCat === state.upgradeCategory;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    if (el.upgradeList) {
      el.upgradeList.setAttribute("aria-labelledby", activeId);
    }
  }

  function updateUpgradeCatBadges() {
    const economyN = countAffordableUpgrades("economy");
    const troopsN = countAffordableUpgrades("troops");
    if (
      economyN === lastAffordableEconomyCount &&
      troopsN === lastAffordableTroopsCount
    ) {
      return;
    }
    lastAffordableEconomyCount = economyN;
    lastAffordableTroopsCount = troopsN;

    el.upgradeCatTabs.forEach((tab) => {
      const cat = tab.dataset.upgradeCat;
      const n = cat === "troops" ? troopsN : economyN;
      const badge = tab.querySelector(".upgrade-cat-badge");
      const label = cat === "troops" ? "Troops" : "Economy";
      const has = n > 0;
      tab.classList.toggle("has-available", has);
      if (!badge) return;
      if (has) {
        badge.hidden = false;
        badge.setAttribute("aria-hidden", "false");
        badge.textContent = String(n);
        tab.setAttribute(
          "aria-label",
          n === 1 ? `${label}, 1 available` : `${label}, ${n} available`
        );
      } else {
        badge.hidden = true;
        badge.setAttribute("aria-hidden", "true");
        badge.textContent = "";
        tab.setAttribute("aria-label", label);
      }
    });
  }

  function updateUpgradeTabBadge() {
    const tab = el.upgradesTab;
    const badge = el.upgradesTabBadge;
    if (tab && badge) {
      const n = countAffordableUpgrades();
      if (n !== lastAffordableUpgradeCount) {
        lastAffordableUpgradeCount = n;
        const has = n > 0;
        tab.classList.toggle("has-available", has);
        if (has) {
          badge.hidden = false;
          badge.setAttribute("aria-hidden", "false");
          badge.textContent = String(n);
          tab.setAttribute(
            "aria-label",
            n === 1 ? "Upgrades, 1 available" : `Upgrades, ${n} available`
          );
        } else {
          badge.hidden = true;
          badge.setAttribute("aria-hidden", "true");
          badge.textContent = "";
          tab.setAttribute("aria-label", "Upgrades");
        }
      }
    }
    updateUpgradeCatBadges();
  }

  function renderUpgrades() {
    const visible = UPGRADES.filter((def) =>
      upgradeMatchesCategory(def, state.upgradeCategory)
    );
    const existing = el.upgradeList.querySelectorAll(".shop-btn[data-id]");
    const canPatch =
      existing.length === visible.length &&
      Array.from(existing).every((btn, i) => btn.dataset.id === visible[i].id);

    if (!canPatch) {
      el.upgradeList.innerHTML = "";
      for (const def of visible) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.id = def.id;
        btn.className = "shop-btn";
        btn.innerHTML =
          `<span class="shop-btn-body">` +
          `<span class="item-name">${def.name}` +
          `<span class="level-badge"></span></span>` +
          `<span class="item-meta"></span></span>` +
          `<span class="item-cost"><span class="cost-gold"></span></span>`;
        btn.addEventListener("click", () => buyUpgrade(def.id));
        el.upgradeList.appendChild(btn);
      }
    }

    for (const def of visible) {
      const btn = el.upgradeList.querySelector(
        '.shop-btn[data-id="' + def.id + '"]'
      );
      if (!btn) continue;
      const cost = upgradeCost(def);
      const level = state.upgradeLevels[def.id];
      const meta = def.combat
        ? def.desc + (level > 0 ? ` (${combatBonusText(def, level)})` : "")
        : def.desc +
          (level > 0 &&
          (def.id === "granary" || def.id === "plunder" || def.id === "caravan")
            ? ` (${combatBonusText(def, level)})`
            : "");
      const foodTag = def.food || FOOD_UPGRADE_IDS[def.id];
      btn.classList.toggle("food-upgrade", !!foodTag);
      btn.classList.toggle("affordable", state.gold >= cost);
      btn.classList.toggle("has-level", level > 0);
      btn.disabled = state.gold < cost;
      const badge = btn.querySelector(".level-badge");
      const metaEl = btn.querySelector(".item-meta");
      const costEl = btn.querySelector(".cost-gold");
      if (badge) {
        badge.textContent = "Lv " + level;
        badge.title = "Level " + level;
      }
      if (metaEl) metaEl.textContent = meta;
      if (costEl) costEl.textContent = format(cost) + " g";
    }
    updateUpgradeTabBadge();
  }

  function repairKeepCost() {
    return 25 + 4 * state.wave;
  }

  function catapultCost() {
    return 45 + 8 * state.wave;
  }

  function catapultDamage() {
    return 18 + 4 * state.wave;
  }

  function canRepairKeep() {
    if (!inBattle() || inCountdown()) return false;
    const base = state.battle.playerBase;
    if (!base || base.hp >= base.maxHp) return false;
    return state.gold >= repairKeepCost();
  }

  function canCatapult() {
    if (!inBattle() || inCountdown()) return false;
    if (state.battle.catapultUsed) return false;
    return state.gold >= catapultCost();
  }

  function repairKeep() {
    if (!inBattle() || inCountdown()) return;
    const base = state.battle.playerBase;
    if (!base) return;
    const missing = base.maxHp - base.hp;
    if (missing <= 0) return;
    const cost = repairKeepCost();
    if (state.gold < cost) return;
    const heal = Math.min(30, missing);
    state.gold -= cost;
    base.hp += heal;
    appendLog("log-win", `Repaired the keep (+${heal} HP).`);
    saveGame(true);
    renderBaseBars();
    renderHud();
  }

  function catapultStrike() {
    if (!inBattle() || inCountdown()) return;
    const b = state.battle;
    if (!b || b.catapultUsed) return;
    const cost = catapultCost();
    if (state.gold < cost) return;
    const dmg = catapultDamage();
    state.gold -= cost;
    b.catapultUsed = true;
    const enemy = b.enemyBase;
    enemy.hp -= dmg;
    spawnFloater(BASE_EDGE_ENEMY, LANE_TARGET_Y + 40, dmg, enemy.hp <= 0);
    appendLog("log-win", `Catapult strike! −${dmg} keep HP.`);
    saveGame(true);
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      renderBaseBars();
      endBattle(true);
      return;
    }
    renderBaseBars();
    renderHud();
  }

  function renderWarChest() {
    if (!el.warChestList) return;
    const live = inBattle() && !inCountdown();
    const repairCost = repairKeepCost();
    const cataCost = catapultCost();
    const cataDmg = catapultDamage();
    const missing =
      live && state.battle.playerBase
        ? Math.max(0, state.battle.playerBase.maxHp - state.battle.playerBase.hp)
        : 0;
    const canRepair = canRepairKeep();
    const canCata = canCatapult();
    const used = !!(state.battle && state.battle.catapultUsed);

    let repairBtn = el.warChestList.querySelector('[data-war-chest="repair"]');
    let cataBtn = el.warChestList.querySelector('[data-war-chest="catapult"]');

    if (!repairBtn || !cataBtn) {
      el.warChestList.innerHTML = "";
      repairBtn = document.createElement("button");
      repairBtn.type = "button";
      repairBtn.dataset.warChest = "repair";
      repairBtn.className = "shop-btn war-chest-btn";
      repairBtn.innerHTML =
        `<span><span class="item-name">Repair Keep</span>` +
        `<br><span class="item-meta"></span></span>` +
        `<span class="item-cost"><span class="cost-gold"></span></span>`;
      repairBtn.addEventListener("click", repairKeep);
      el.warChestList.appendChild(repairBtn);

      cataBtn = document.createElement("button");
      cataBtn.type = "button";
      cataBtn.dataset.warChest = "catapult";
      cataBtn.className = "shop-btn war-chest-btn";
      cataBtn.innerHTML =
        `<span><span class="item-name">Catapult Strike</span>` +
        `<br><span class="item-meta"></span></span>` +
        `<span class="item-cost"><span class="cost-gold"></span></span>`;
      cataBtn.addEventListener("click", catapultStrike);
      el.warChestList.appendChild(cataBtn);
    }

    repairBtn.classList.toggle("affordable", canRepair);
    repairBtn.disabled = !canRepair;
    const repairMeta = repairBtn.querySelector(".item-meta");
    const repairCostEl = repairBtn.querySelector(".cost-gold");
    if (repairMeta) {
      repairMeta.textContent =
        "Restore up to 30 HP" +
        (live && missing > 0 ? ` · Missing ${missing}` : "");
    }
    if (repairCostEl) repairCostEl.textContent = format(repairCost) + " g";

    cataBtn.classList.toggle("affordable", canCata);
    cataBtn.disabled = !canCata;
    const cataMeta = cataBtn.querySelector(".item-meta");
    const cataCostEl = cataBtn.querySelector(".cost-gold");
    if (cataMeta) {
      cataMeta.textContent = used
        ? "Used this wave"
        : `Deal ${cataDmg} enemy keep damage · Once per wave`;
    }
    if (cataCostEl) cataCostEl.textContent = format(cataCost) + " g";
  }

  function foodUpkeepRate() {
    // No upkeep during opening countdown — field is empty until combat starts.
    if (!inBattle() || inCountdown()) return 0;
    return countSide("player") * upkeepPerUnit();
  }

  function netFoodPerSecond() {
    return state.foodPerSecond - foodUpkeepRate();
  }

  function applyFoodUpkeep(dt) {
    const drain = foodUpkeepRate() * dt;
    if (drain <= 0) return;
    const before = state.food;
    state.food = Math.max(0, state.food - drain);
    if (
      state.battle &&
      !state.battle.foodStarvedWarned &&
      before > 0 &&
      state.food <= 0 &&
      countSide("player") > 0
    ) {
      state.battle.foodStarvedWarned = true;
      appendLog(
        "log-loss",
        "Larder empty — upkeep drained your food. Forage or cut the field."
      );
    }
  }

  function formatCost(type) {
    return (
      `<span class="cost-gold">${format(type.cost)} g</span>` +
      `<span class="cost-sep">·</span>` +
      `<span class="cost-food">${format(type.foodCost)} f</span>`
    );
  }

  function formatUnlockCost(type) {
    return `<span class="cost-gold">Unlock ${format(type.unlockCost)} g</span>`;
  }

  function affordCount(type) {
    if (!type || type.cost <= 0 || type.foodCost <= 0) return 0;
    return Math.min(
      Math.floor(state.gold / type.cost),
      Math.floor(state.food / type.foodCost)
    );
  }

  function spawnHintText(live, playerCount) {
    const enabled = enabledSpawnTypes();
    const upkeep = foodUpkeepRate();
    const upkeepBit =
      playerCount > 0 ? ` · Upkeep ${format(upkeep)} f/s` : "";

    if (state.waveTransitioning) {
      return `Wave resolving — next assault shortly${upkeepBit}`;
    }
    if (inCountdown()) {
      const secs = Math.ceil(state.battle.countdown);
      return `Assault in ${secs}… turn Auto on — training starts when combat begins${upkeepBit}`;
    }
    if (!live) {
      return `Battle looping — train troops or enable Auto${upkeepBit}`;
    }
    if (playerCount >= FIELD_SOFT_CAP) {
      return `Field at capacity (${FIELD_SOFT_CAP}) — wait for space${upkeepBit}`;
    }
    const unlockable = UNIT_TYPES.filter(
      (t) => unitNeedsUnlock(t) && !isUnitUnlocked(t.id) && unitUnlockWaveReached(t)
    );
    if (unlockable.length > 0 && enabled.length === 0) {
      const u = unlockable[0];
      return `Unlock ${u.name} for ${format(u.unlockCost)} g (wave ${u.unlockWave}+)${upkeepBit}`;
    }
    if (enabled.length === 0) {
      return `Click a unit to train, or turn Auto on${upkeepBit}`;
    }
    const training = state.battle && state.battle.training;
    if (training) {
      const type = unitType(training.typeId);
      const left = Math.max(0, training.duration - training.elapsed);
      return `Training ${type ? type.name : "unit"}… ${left.toFixed(1)}s${upkeepBit}`;
    }
    const canAny = enabled.some(
      (t) => state.gold >= t.cost && state.food >= t.foodCost
    );
    if (!canAny) {
      const needGold = enabled.every((t) => state.gold < t.cost);
      const needFood = enabled.every((t) => state.food < t.foodCost);
      if (needGold && needFood) {
        return `Need more gold and food to spawn${upkeepBit}`;
      }
      if (needGold) return `Need more gold to spawn${upkeepBit}`;
      if (needFood) return `Need more food to spawn${upkeepBit}`;
      return `Can't afford enabled units yet${upkeepBit}`;
    }
    const names = enabled.map((t) => t.name).join(", ");
    return `Auto: ${names} · Field ${playerCount}${upkeepBit}`;
  }

  function renderSpawn() {
    const live = inBattle() && !inCountdown();
    const playerCount = countSide("player");
    const training = state.battle && state.battle.training;
    el.spawnHint.textContent = spawnHintText(inBattle(), playerCount);

    const trainDur = trainDuration().toFixed(1);
    const structureParts = [];
    for (const type of UNIT_TYPES) {
      structureParts.push(
        type.id + ":" + (isUnitUnlocked(type.id) ? "1" : "0")
      );
    }
    const structureSig = structureParts.join("|");

    const existing = el.recruitList.querySelectorAll(".recruit-card");
    const canPatch =
      existing.length === UNIT_TYPES.length &&
      structureSig === lastRecruitStructureSig &&
      Array.from(existing).every((card, i) => {
        const type = UNIT_TYPES[i];
        if (!type || card.dataset.id !== type.id) return false;
        const unlocked = isUnitUnlocked(type.id);
        return card.classList.contains("locked") === !unlocked;
      });

    if (canPatch) {
      for (const type of UNIT_TYPES) {
        const card = el.recruitList.querySelector(
          '.recruit-card[data-id="' + type.id + '"]'
        );
        if (!card) continue;
        const stats = playerUnitStats(type);
        const unlocked = isUnitUnlocked(type.id);
        const waveOk = !unitNeedsUnlock(type) || unitUnlockWaveReached(type);
        const autoOn = unlocked && !!state.autoSpawn[type.id];
        const isTraining = !!(training && training.typeId === type.id);
        const canUnlock = canUnlockUnit(type.id);
        const canQueue =
          unlocked &&
          live &&
          !training &&
          state.gold >= type.cost &&
          state.food >= type.foodCost &&
          playerCount < FIELD_SOFT_CAP;
        const pct = isTraining
          ? Math.min(100, (training.elapsed / training.duration) * 100)
          : 0;

        card.classList.toggle("auto-on", autoOn);
        card.classList.toggle("affordable", canQueue || canUnlock);
        card.classList.toggle("training", isTraining);

        const btn = card.querySelector(".recruit-btn");
        if (btn) {
          btn.title = !unlocked
            ? !waveOk
              ? `Unlocks at wave ${type.unlockWave}`
              : canUnlock
                ? `Unlock ${type.name} for ${type.unlockCost} gold`
                : `Need ${type.unlockCost} gold to unlock`
            : canQueue
              ? `Train ${type.name}`
              : trainBlockReason(type.id);
        }

        const fill = card.querySelector(".spawn-bar-fill");
        const bar = card.querySelector(".spawn-bar");
        if (fill) fill.style.width = pct + "%";
        if (bar) bar.classList.toggle("active", isTraining);

        const countEl = card.querySelector(".afford-count");
        if (unlocked && countEl) {
          const count = affordCount(type);
          countEl.textContent = "×" + count;
          countEl.classList.toggle("is-zero", count <= 0);
        }

        const metaEl = card.querySelector(".item-meta");
        const costEl = card.querySelector(".item-cost");
        if (!unlocked) {
          const lockBadge = card.querySelector(".lock-badge");
          if (lockBadge) {
            lockBadge.textContent = waveOk
              ? "LOCKED"
              : "WAVE " + type.unlockWave;
          }
          if (metaEl) {
            metaEl.textContent = waveOk
              ? `Unlock once · ${format(type.unlockCost)} g`
              : `Unlocks at wave ${type.unlockWave}`;
          }
          if (costEl) {
            costEl.innerHTML = waveOk
              ? formatUnlockCost(type)
              : `<span class="cost-muted">Wave ${type.unlockWave}</span>`;
          }
        } else {
          if (metaEl) {
            metaEl.textContent = `${stats.maxHp} HP · ${stats.atk} ATK · ${stats.armor} ARM · ${trainDur}s`;
          }
          if (costEl) costEl.innerHTML = formatCost(type);
        }

        const autoBtn = card.querySelector(".auto-toggle");
        if (autoBtn) {
          autoBtn.classList.toggle("is-on", autoOn);
          autoBtn.setAttribute("aria-pressed", autoOn ? "true" : "false");
          autoBtn.title = autoOn
            ? "Auto-train on — click to disable"
            : "Auto-train off — click to enable";
        }
      }
      return;
    }

    lastRecruitStructureSig = structureSig;
    lastRecruitSig = structureSig;
    const focused =
      document.activeElement &&
      document.activeElement.closest &&
      document.activeElement.closest(".recruit-card");
    const focusedId = focused ? focused.dataset.id : null;
    const focusedAuto =
      focused &&
      document.activeElement.classList.contains("auto-toggle");

    el.recruitList.innerHTML = "";
    for (const type of UNIT_TYPES) {
      const stats = playerUnitStats(type);
      const unlocked = isUnitUnlocked(type.id);
      const waveOk = !unitNeedsUnlock(type) || unitUnlockWaveReached(type);
      const autoOn = unlocked && !!state.autoSpawn[type.id];
      const isTraining = !!(training && training.typeId === type.id);
      const canUnlock = canUnlockUnit(type.id);
      const canQueue =
        unlocked &&
        live &&
        !training &&
        state.gold >= type.cost &&
        state.food >= type.foodCost &&
        playerCount < FIELD_SOFT_CAP;
      const canBuy = canQueue;
      const pct =
        isTraining
          ? Math.min(100, (training.elapsed / training.duration) * 100)
          : 0;
      const count = unlocked ? affordCount(type) : 0;

      const card = document.createElement("div");
      card.dataset.id = type.id;
      card.className =
        "recruit-card" +
        (unlocked ? "" : " locked") +
        (autoOn ? " auto-on" : "") +
        (canQueue || canUnlock ? " affordable" : "") +
        (isTraining ? " training" : "");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "recruit-btn";
      btn.title = !unlocked
        ? !waveOk
          ? `Unlocks at wave ${type.unlockWave}`
          : canUnlock
            ? `Unlock ${type.name} for ${type.unlockCost} gold`
            : `Need ${type.unlockCost} gold to unlock`
        : canBuy
          ? `Train ${type.name}`
          : trainBlockReason(type.id);

      let metaLine;
      let costHtml;
      let nameExtra;
      if (!unlocked) {
        nameExtra = `<span class="lock-badge">${waveOk ? "LOCKED" : "WAVE " + type.unlockWave}</span>`;
        metaLine = waveOk
          ? `Unlock once · ${format(type.unlockCost)} g`
          : `Unlocks at wave ${type.unlockWave}`;
        costHtml = waveOk
          ? formatUnlockCost(type)
          : `<span class="cost-muted">Wave ${type.unlockWave}</span>`;
      } else {
        nameExtra = `<span class="afford-count${count <= 0 ? " is-zero" : ""}">×${count}</span>`;
        metaLine = `${stats.maxHp} HP · ${stats.atk} ATK · ${stats.armor} ARM · ${trainDur}s`;
        costHtml = formatCost(type);
      }

      btn.innerHTML =
        `<span class="cmd-portrait type-${type.id}" aria-hidden="true">${unitArt(type.id)}</span>` +
        `<span class="cmd-body">` +
        `<span class="item-top">` +
        `<span class="item-name">${type.name}${nameExtra}</span>` +
        `<span class="item-cost">${costHtml}</span>` +
        `</span>` +
        `<span class="item-meta">${metaLine}</span>` +
        (unlocked
          ? `<span class="spawn-bar${isTraining ? " active" : ""}" aria-hidden="true">` +
            `<span class="spawn-bar-fill" style="width:${pct}%"></span></span>`
          : "") +
        `</span>`;

      if (!unlocked) {
        btn.addEventListener("click", () => {
          if (unitNeedsUnlock(type) && !unitUnlockWaveReached(type)) return;
          if (unlockUnit(type.id)) {
            pulseRecruitCard(card, "buy-flash");
            renderHud();
          } else {
            pulseRecruitCard(card, "buy-deny");
          }
        });
        card.appendChild(btn);
        el.recruitList.appendChild(card);
        if (focusedId === type.id && !focusedAuto) btn.focus();
        continue;
      }

      btn.addEventListener("click", () => {
        tryBuyUnit(type.id, card);
      });

      const autoBtn = document.createElement("button");
      autoBtn.type = "button";
      autoBtn.className = "auto-toggle" + (autoOn ? " is-on" : "");
      autoBtn.setAttribute("aria-pressed", autoOn ? "true" : "false");
      autoBtn.title = autoOn
        ? "Auto-train on — click to disable"
        : "Auto-train off — click to enable";
      autoBtn.innerHTML = `<span class="auto-toggle-label">Auto</span>`;
      autoBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        toggleAutoSpawn(type.id);
      });

      card.appendChild(btn);
      card.appendChild(autoBtn);
      el.recruitList.appendChild(card);
      if (focusedId === type.id) {
        if (focusedAuto) autoBtn.focus();
        else btn.focus();
      }
    }
  }

  function renderBattlePanel() {
    const meta = waveMeta(state.wave);
    const eMax = enemyBaseMaxHp(state.wave);
    const penalty = lossPenalty(state.wave);
    el.wavePreview.innerHTML =
      `<div class="wave-preview-main">` +
      `<span class="enemy-name">${meta.name}</span>` +
      `<span class="wave-subtitle">${waveKindLabel(state.wave)} · Keep ${eMax} · Yours ${PLAYER_BASE_HP}</span>` +
      `</div>` +
      `<div class="wave-stakes">` +
      `<span class="wave-win-hint">Win +${format(winBonus(state.wave))} g</span>` +
      `<span class="wave-stakes-sep">·</span>` +
      `<span class="wave-demote-hint">Loss −${format(penalty.gold)} g / −${format(penalty.food)} f · −1 wave</span>` +
      `</div>`;

    if (el.loopStatus) {
      if (state.waveTransitioning) {
        setLoopStatusText("Resolving…");
        syncCountdownBar();
      } else if (inCountdown()) {
        const secs = Math.ceil(state.battle.countdown);
        setLoopStatusText(`Starts in ${secs}…`);
        syncCountdownBar();
      } else if (inBattle()) {
        const enabled = enabledSpawnTypes().length;
        setLoopStatusText(
          `Wave ${state.wave} · ${enabled} auto-spawn`
        );
        syncCountdownBar();
      } else {
        setLoopStatusText(`Wave ${state.wave}`);
        syncCountdownBar();
      }
    }

    renderBaseBars();
  }

  function syncFoodRateDisplay() {
    const net = netFoodPerSecond();
    el.fps.textContent = format(Math.abs(net));
    el.fpsPrefix.textContent = net < -0.05 ? "−" : "+";
    const rate = el.fps.closest(".resource-fps");
    if (rate) rate.classList.toggle("is-drain", net < -0.05);
  }

  function renderHud() {
    el.gold.textContent = format(state.gold);
    el.gps.textContent = format(state.goldPerSecond);
    el.food.textContent = format(state.food);
    syncFoodRateDisplay();
    el.wave.textContent = String(state.wave);
    el.clickPower.textContent = format(state.clickPower);
    el.foodClickPower.textContent = format(state.foodClickPower);
    renderWarChest();
    renderUpgrades();
    renderSpawn();
    renderBattlePanel();
  }

  function syncResourceDisplays() {
    el.gold.textContent = format(state.gold);
    el.gps.textContent = format(state.goldPerSecond);
    el.food.textContent = format(state.food);
    syncFoodRateDisplay();
    updateUpgradeTabBadge();
  }

  function bindPress(btn, handler) {
    let ignoreClick = false;
    btn.addEventListener(
      "pointerdown",
      (ev) => {
        if (ev.isPrimary === false) return;
        if (ev.pointerType === "mouse" && ev.button !== 0) return;
        if (btn.disabled) return;
        ignoreClick = true;
        handler(ev);
      },
      { passive: true }
    );
    btn.addEventListener("click", (ev) => {
      if (ignoreClick) {
        ignoreClick = false;
        return;
      }
      if (btn.disabled) return;
      handler(ev);
    });
    const clearIgnore = () => {
      // Click usually follows pointerup in the same turn; clear any stale flag after.
      setTimeout(() => {
        ignoreClick = false;
      }, 50);
    };
    btn.addEventListener("pointerup", clearIgnore);
    btn.addEventListener("pointercancel", clearIgnore);
  }

  function pulseResourceClick(btn, amount, kind) {
    btn.classList.remove("click-pulse");
    void btn.offsetWidth;
    btn.classList.add("click-pulse");
    setTimeout(() => btn.classList.remove("click-pulse"), 220);

    const floater = document.createElement("span");
    floater.className = "click-floater " + kind;
    floater.textContent = "+" + format(amount);
    btn.appendChild(floater);
    setTimeout(() => floater.remove(), 650);
  }

  bindPress(el.clickBtn, () => {
    state.gold += state.clickPower;
    pulseResourceClick(el.clickBtn, state.clickPower, "gold");
    renderHud();
  });

  bindPress(el.foodClickBtn, () => {
    state.food += state.foodClickPower;
    pulseResourceClick(el.foodClickBtn, state.foodClickPower, "food");
    renderHud();
  });

  el.upgradeCatTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setUpgradeCategory(tab.dataset.upgradeCat);
    });
    tab.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      const tabs = Array.from(el.upgradeCatTabs);
      const idx = tabs.indexOf(tab);
      if (idx < 0) return;
      const next =
        ev.key === "ArrowRight"
          ? tabs[(idx + 1) % tabs.length]
          : tabs[(idx - 1 + tabs.length) % tabs.length];
      setUpgradeCategory(next.dataset.upgradeCat);
      next.focus();
    });
  });

  if (el.newGameBtn) {
    el.newGameBtn.addEventListener("click", newGame);
  }

  let lastBattle = Date.now();
  let hudAccum = 0;
  let saveAccum = 0;

  setInterval(() => {
    const now = Date.now();
    const dt = Math.min(0.1, (now - lastBattle) / 1000);
    lastBattle = now;

    hudAccum += dt;
    saveAccum += dt;
    if (state.goldPerSecond > 0) {
      state.gold += state.goldPerSecond * dt;
    }
    if (state.foodPerSecond > 0) {
      state.food += state.foodPerSecond * dt;
    }
    applyFoodUpkeep(dt);

    if (inBattle()) {
      battleTick(dt);
      syncResourceDisplays();
      if (hudAccum >= 0.15) {
        hudAccum = 0;
        renderWarChest();
        renderSpawn();
        renderBattlePanel();
      } else {
        renderBaseBars();
      }
    } else if (hudAccum >= HUD_MS / 1000) {
      hudAccum = 0;
      renderHud();
    }

    if (saveAccum >= SAVE_THROTTLE_MS / 1000) {
      saveAccum = 0;
      saveGame(false);
    }
  }, BATTLE_MS);

  window.addEventListener("beforeunload", () => saveGame(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame(true);
  });

  function initMusic() {
    const audio = el.bgMusic;
    if (!MUSIC_TRACKS.length || !audio) return;

    let trackIndex = 0;
    const DEFAULT_VOLUME = 35;

    const stored = localStorage.getItem(MUSIC_VOLUME_KEY);
    let preferred =
      stored !== null && !Number.isNaN(Number(stored))
        ? Math.max(0, Math.min(100, Number(stored)))
        : DEFAULT_VOLUME;
    // Legacy: volume 0 meant muted — keep a usable unmute level.
    if (preferred <= 0) preferred = DEFAULT_VOLUME;
    else {
      try {
        localStorage.setItem(MUSIC_VOLUME_KEY, String(preferred));
      } catch (_) {}
    }

    let muted = localStorage.getItem(MUSIC_MUTED_KEY) === "1";
    // Older saves stored 0 volume with no mute flag.
    if (stored !== null && Number(stored) === 0) muted = true;

    function applyVolume() {
      // Keep preferred gain separate from mute. Safari/iOS ignore volume=0
      // for silence; the muted property (+ pause) is what actually works.
      audio.volume = preferred / 100;
      audio.muted = muted;
      if (muted && !audio.paused) audio.pause();
      syncMuteBtn();
    }

    function syncMuteBtn() {
      const btn = el.musicMuteBtn;
      if (!btn) return;
      btn.setAttribute("aria-pressed", muted ? "true" : "false");
      btn.title = muted ? "Unmute music" : "Mute music";
      btn.textContent = muted ? "Muted" : "Music";
      btn.classList.toggle("is-muted", muted);
    }

    function setMuted(next) {
      muted = !!next;
      try {
        localStorage.setItem(MUSIC_MUTED_KEY, muted ? "1" : "0");
        localStorage.setItem(MUSIC_VOLUME_KEY, String(preferred));
      } catch (_) {}
      applyVolume();
      if (!muted) tryPlay();
    }

    applyVolume();
    const wantPlaying = () => !muted && preferred > 0;

    function trackUrl(index) {
      const path = MUSIC_TRACKS[index];
      try {
        return new URL(path, window.location.href).href;
      } catch (_) {
        return encodeURI(path);
      }
    }

    function loadTrack(index) {
      trackIndex = ((index % MUSIC_TRACKS.length) + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
      audio.src = trackUrl(trackIndex);
    }

    function tryPlay() {
      if (!wantPlaying()) return;
      audio.muted = false;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          /* Autoplay blocked until a gesture; unlock listeners retry. */
        });
      }
    }

    audio.addEventListener("ended", () => {
      loadTrack(trackIndex + 1);
      tryPlay();
    });

    audio.addEventListener("canplay", () => {
      if (wantPlaying()) tryPlay();
    });

    function unlockOnGesture() {
      if (!wantPlaying()) return;
      tryPlay();
    }

    document.addEventListener("pointerdown", unlockOnGesture, { passive: true });
    document.addEventListener("keydown", unlockOnGesture);
    document.addEventListener("touchstart", unlockOnGesture, { passive: true });

    if (el.musicMuteBtn) {
      el.musicMuteBtn.addEventListener("click", () => {
        setMuted(!muted);
      });
    }

    loadTrack(0);
    tryPlay();
  }

  function isArmySheetOpen() {
    return !!(el.armySheet && !el.armySheet.hidden);
  }

  function restoreArmyHome() {
    if (!el.armyHome || !el.panelCommands) return;
    if (el.armyHome.parentElement === el.panelCommands) return;
    const h2 = el.panelCommands.querySelector(":scope > h2");
    if (h2) h2.after(el.armyHome);
    else el.panelCommands.appendChild(el.armyHome);
  }

  function closeArmySheet() {
    if (!el.armySheet) return;
    restoreArmyHome();
    el.armySheet.hidden = true;
    el.armySheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("army-sheet-open");
    if (el.armyDockBtn) el.armyDockBtn.setAttribute("aria-expanded", "false");
  }

  function openArmySheet() {
    if (!el.armySheet || !el.armySheetBody || !el.armyHome) return;
    if (!window.matchMedia(MOBILE_MQ).matches) return;
    if (document.body.dataset.mobilePane === "army") return;
    el.armySheetBody.appendChild(el.armyHome);
    el.armySheet.hidden = false;
    el.armySheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("army-sheet-open");
    if (el.armyDockBtn) el.armyDockBtn.setAttribute("aria-expanded", "true");
    renderSpawn();
  }

  function toggleArmySheet() {
    if (isArmySheetOpen()) closeArmySheet();
    else openArmySheet();
  }

  function initMobileChrome() {
    const mq = window.matchMedia(MOBILE_MQ);
    const validPanes = { battle: true, upgrades: true, army: true };

    function setPane(pane) {
      if (!validPanes[pane]) pane = "battle";
      document.body.dataset.mobilePane = pane;
      try {
        sessionStorage.setItem(MOBILE_PANE_KEY, pane);
      } catch (_) {}
      if (pane === "army") closeArmySheet();
      if (!el.mobileNav) return;
      el.mobileNav.querySelectorAll(".mobile-tab").forEach((tab) => {
        const on = tab.dataset.pane === pane;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    function syncDockPlacement() {
      if (!el.resourceDock || !el.panelResource || !el.hud) return;
      if (mq.matches) {
        if (el.resourceDock.parentElement !== el.hud) {
          el.hud.appendChild(el.resourceDock);
        }
      } else {
        const h2 = el.panelResource.querySelector(":scope > h2");
        if (h2 && el.resourceDock.parentElement !== el.panelResource) {
          h2.after(el.resourceDock);
        } else if (
          h2 &&
          el.resourceDock.parentElement === el.panelResource &&
          el.resourceDock.previousElementSibling !== h2
        ) {
          h2.after(el.resourceDock);
        }
      }
    }

    function syncChromeOffsets() {
      const root = document.documentElement;
      if (el.topbar) {
        root.style.setProperty(
          "--topbar-offset",
          `${Math.ceil(el.topbar.getBoundingClientRect().height)}px`
        );
      }
      if (el.mobileNav && mq.matches) {
        root.style.setProperty(
          "--mobile-nav-offset",
          `${Math.ceil(el.mobileNav.getBoundingClientRect().height)}px`
        );
      } else {
        root.style.setProperty("--mobile-nav-offset", "0px");
      }
      if (el.resourceDock && mq.matches) {
        root.style.setProperty(
          "--dock-offset",
          `${Math.ceil(el.resourceDock.getBoundingClientRect().height)}px`
        );
      } else {
        root.style.setProperty("--dock-offset", "0px");
      }
    }

    if (el.mobileNav) {
      el.mobileNav.addEventListener("click", (ev) => {
        const tab = ev.target.closest(".mobile-tab");
        if (!tab || !tab.dataset.pane) return;
        setPane(tab.dataset.pane);
      });
    }

    let stored = "battle";
    try {
      stored = sessionStorage.getItem(MOBILE_PANE_KEY) || "battle";
    } catch (_) {}
    setPane(stored);
    syncDockPlacement();
    syncChromeOffsets();

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          syncChromeOffsets();
        })
      : null;
    if (ro) {
      if (el.topbar) ro.observe(el.topbar);
      if (el.mobileNav) ro.observe(el.mobileNav);
      if (el.resourceDock) ro.observe(el.resourceDock);
    }

    const onViewportChange = () => {
      syncDockPlacement();
      syncChromeOffsets();
      if (!mq.matches) {
        closeArmySheet();
        document.body.dataset.mobilePane = "battle";
      } else {
        setPane(document.body.dataset.mobilePane || stored);
      }
    };

    if (el.armyDockBtn) {
      el.armyDockBtn.addEventListener("click", () => {
        if (!mq.matches) return;
        toggleArmySheet();
        syncChromeOffsets();
      });
    }
    if (el.armySheetClose) {
      el.armySheetClose.addEventListener("click", closeArmySheet);
    }
    if (el.armySheet) {
      const backdrop = el.armySheet.querySelector(".army-sheet-backdrop");
      if (backdrop) backdrop.addEventListener("click", closeArmySheet);
    }
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && isArmySheetOpen()) closeArmySheet();
    });

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onViewportChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(onViewportChange);
    }
    window.addEventListener("resize", () => {
      syncChromeOffsets();
    });
  }

  const restored = loadSave();
  if (restored) {
    appendLog("log-muted", `Restored save · Wave ${state.wave}`);
  } else {
    appendLog(
      "log-muted",
      "Keep gold and food flowing — troops auto-spawn while the assault loops."
    );
  }
  initMobileChrome();
  startBattle();
  initMusic();
})();
