(() => {
  "use strict";

  const HUD_MS = 100;
  const BATTLE_MS = 50;
  /** Soft DOM/perf ceiling; Granary army capacity is the real player limit. */
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
  const SPAWN_X_JITTER = 1.4;
  /** Soft push so stacks break into a front. */
  const SEPARATION_DIST = 6.2;
  const SEPARATION_STRENGTH = 10;
  /** Seconds exiting the gate before normal AI (fan-out). */
  const SPAWN_SPREAD_S = 0.55;
  /** Y band used when scoring threatened lanes for spawn. */
  const LANE_THREAT_BAND = 9;
  /** Wider peel band when a foe threatens the home keep. */
  const LANE_KEEP_PEEL_Y = 36;
  /** Counter damage multipliers. */
  const COUNTER_STRONG = 1.4;
  const COUNTER_WEAK = 0.7;
  /** Auto trains slower than manual counter-picks. */
  const AUTO_TRAIN_MULT = 1.35;
  /** Drill Yard cannot shrink train time below this. */
  const MIN_TRAIN_TIME = 1.25;
  /** Base seconds to train one unit before it hits the field. */
  const BASE_TRAIN_TIME = 3.5;
  const TRAIN_RETRY = 0.25;
  const WAVE_TRANSITION_MS = 900;
  /** Seconds before wave 1 combat starts. */
  const OPENING_COUNTDOWN_S = 8;
  /** Multiplier applied to unit.spd when marching (lower = slower field pace). */
  const UNIT_MOVE_MULT = 0.9;
  /** Boss minion summon cadence (seconds). */
  const BOSS_SUMMON_BASE = 4.5;
  const BOSS_SUMMON_FLOOR = 3.2;
  /** Keep spawn slowdown while a living boss is on the field. */
  const BOSS_KEEP_SPAWN_MULT = 1.75;
  /** Wave at which bosses summon two minions per pulse. */
  const BOSS_SUMMON_DOUBLE_WAVE = 15;
  /** Base living player units before Granary. */
  const BASE_ARMY_CAPACITY = 10;
  /** Extra army slots per Granary level. */
  const GRANARY_CAPACITY_PER_LEVEL = 3;
  const SAVE_KEY = "clickstrike-save-v1";
  const SAVE_VERSION = 5;
  const SAVE_THROTTLE_MS = 2000;
  /** Seconds before a fallen hero returns at the gate. */
  const HERO_RESPAWN_S = 8;
  /** Bonesinger bone minions capped on the field. */
  const BONE_MINION_MAX = 3;
  const BONE_MINION_KILL_CHANCE = 0.3;
  const MUSIC_VOLUME_KEY = "clickstrike-music-volume";
  const MUSIC_MUTED_KEY = "clickstrike-music-muted";
  const MUSIC_TRACKS = [
    "assets/audio/music/07-human-1.mp3",
    "assets/audio/music/13-arrival-at-kalimdor.mp3",
  ];
  const FOOD_UPGRADE_IDS = {
    baskets: true,
    foragers: true,
    autoForager: true,
  };
  /** Clicks/sec added per Hired Miners / Gather Crew level. */
  const AUTO_CLICK_CPS_PER_LEVEL = 0.1;
  /** Max orbiting cursors rendered per resource button. */
  const MAX_VISIBLE_CURSORS = 8;
  /** Min seconds between auto-click floaters (pulse still fires). */
  const AUTO_FLOATER_MIN_INTERVAL = 0.25;
  const MOBILE_MQ = "(max-width: 900px)";
  const MOBILE_PANE_KEY = "clickstrike-mobile-pane";
  /** Kill gold / scavenge soft cap window (ms). */
  const KILL_GOLD_WINDOW_MS = 1000;

  const UPGRADES = [
    {
      id: "pickaxe",
      name: "Sharper Pick",
      desc: "+1 gold per click",
      icon: "pick",
      baseCost: 15,
      growth: 1.55,
      apply(state) {
        state.clickPower += 1;
      },
    },
    {
      id: "autoMiner",
      name: "Hired Miners",
      desc: "+0.1 gold clicks / sec",
      icon: "miner",
      baseCost: 25,
      growth: 1.5,
      apply() {},
    },
    {
      id: "traders",
      name: "Trade Routes",
      desc: "+0.5 gold / sec",
      icon: "routes",
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
      icon: "basket",
      baseCost: 12,
      growth: 1.5,
      food: true,
      apply(state) {
        state.foodClickPower += 0.5;
      },
    },
    {
      id: "autoForager",
      name: "Gather Crew",
      desc: "+0.1 food clicks / sec",
      icon: "gather",
      baseCost: 22,
      growth: 1.5,
      food: true,
      apply() {},
    },
    {
      id: "foragers",
      name: "Foraging Camp",
      desc: "+0.8 food / sec",
      icon: "camp",
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
      icon: "anvil",
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
      desc: "+3 army capacity / level",
      icon: "grain",
      baseCost: 55,
      growth: 1.7,
      apply() {},
    },
    {
      id: "plunder",
      name: "Plunder Maps",
      desc: "+15% kill gold / level",
      icon: "map",
      baseCost: 65,
      growth: 1.65,
      apply() {},
    },
    {
      id: "caravan",
      name: "Caravan Guard",
      desc: "+12% win gold / level",
      icon: "cart",
      baseCost: 70,
      growth: 1.7,
      apply() {},
    },
    {
      id: "weapons",
      name: "Forged Tips",
      desc: "+15% unit ATK",
      icon: "spear",
      baseCost: 50,
      growth: 1.65,
      combat: true,
      apply() {},
    },
    {
      id: "armor",
      name: "Iron Plating",
      desc: "+1 unit armor",
      icon: "shield",
      baseCost: 60,
      growth: 1.7,
      combat: true,
      apply() {},
    },
    {
      id: "vitality",
      name: "Field Rations",
      desc: "+12% unit max HP",
      icon: "heart",
      baseCost: 55,
      growth: 1.65,
      combat: true,
      apply() {},
    },
    {
      id: "barracks",
      name: "Drill Yard",
      desc: "−12% recruit time",
      icon: "drill",
      baseCost: 45,
      growth: 1.6,
      combat: true,
      apply() {},
    },
    {
      id: "drums",
      name: "War Drums",
      desc: "+6% unit attack speed",
      icon: "drums",
      baseCost: 75,
      growth: 1.7,
      combat: true,
      apply() {},
    },
    {
      id: "medicine",
      name: "Field Medicine",
      desc: "+20% healer potency",
      icon: "salve",
      baseCost: 60,
      growth: 1.65,
      combat: true,
      apply() {},
    },
    {
      id: "siege",
      name: "Siege Works",
      desc: "+15% keep damage",
      icon: "ram",
      baseCost: 80,
      growth: 1.75,
      combat: true,
      apply() {},
    },
  ];

  const UNIT_TYPES = [
    {
      id: "spearman",
      name: "Spearman",
      cost: 12,
      foodCost: 22,
      hp: 28,
      atk: 5,
      spd: 3,
      armor: 1,
      atkCd: 0.55,
      range: 6,
      atkStyle: "melee",
      tags: ["infantry"],
      strongVs: ["cavalry"],
      weakVs: ["ranged"],
      blurb: "Beats cavalry · Soft vs ranged",
    },
    {
      id: "archer",
      name: "Archer",
      cost: 40,
      foodCost: 28,
      hp: 14,
      atk: 11,
      spd: 4.5,
      armor: 0,
      atkCd: 0.4,
      range: 28,
      atkStyle: "ranged",
      tags: ["ranged"],
      strongVs: ["infantry"],
      weakVs: ["cavalry"],
      blurb: "Beats infantry · Soft vs cavalry",
    },
    {
      id: "knight",
      name: "Knight",
      cost: 100,
      foodCost: 64,
      hp: 45,
      atk: 13,
      spd: 2.5,
      armor: 3,
      atkCd: 0.7,
      range: 6,
      atkStyle: "melee",
      tags: ["infantry", "armored"],
      strongVs: ["ranged"],
      weakVs: ["magic"],
      blurb: "Beats ranged · Soft vs magic",
    },
    {
      id: "rider",
      name: "Rider",
      cost: 55,
      foodCost: 36,
      hp: 22,
      atk: 9,
      spd: 5.5,
      armor: 0,
      atkCd: 0.45,
      range: 6,
      atkStyle: "melee",
      tags: ["cavalry"],
      strongVs: ["ranged", "magic", "support"],
      weakVs: ["infantry"],
      blurb: "Beats ranged, magic & support · Soft vs spears",
      unlockWave: 3,
      unlockCost: 80,
    },
    {
      id: "healer",
      name: "Healer",
      cost: 60,
      foodCost: 55,
      hp: 18,
      atk: 6,
      spd: 3.0,
      armor: 0,
      atkCd: 0.9,
      range: 24,
      atkStyle: "heal",
      tags: ["support"],
      strongVs: [],
      weakVs: ["cavalry"],
      blurb: "Mends allies · Soft vs cavalry",
      unlockWave: 4,
      unlockCost: 100,
    },
    {
      id: "mage",
      name: "Mage",
      cost: 85,
      foodCost: 42,
      hp: 12,
      atk: 18,
      spd: 3.2,
      armor: 0,
      atkCd: 0.75,
      range: 32,
      atkStyle: "magic",
      tags: ["magic"],
      strongVs: ["armored"],
      weakVs: ["cavalry"],
      blurb: "Beats armored · Soft vs cavalry",
      unlockWave: 5,
      unlockCost: 150,
    },
    {
      id: "guardian",
      name: "Guardian",
      cost: 70,
      foodCost: 72,
      hp: 70,
      atk: 6,
      spd: 1.8,
      armor: 5,
      atkCd: 0.85,
      range: 6,
      atkStyle: "melee",
      tags: ["infantry", "armored"],
      strongVs: ["magic"],
      weakVs: ["cavalry"],
      blurb: "Beats magic · Soft vs cavalry",
      unlockWave: 7,
      unlockCost: 120,
    },
  ];

  const HEROES = [
    {
      id: "bulwark",
      name: "Bulwark",
      role: "Fat tank",
      blurb: "Holds the line so your archers and mages can shred.",
      synergy: "+20% damage for ranged & magic allies",
      hp: 160,
      atk: 10,
      spd: 2.2,
      armor: 6,
      atkCd: 0.85,
      range: 6,
      atkStyle: "melee",
      tags: ["infantry", "armored"],
      strongVs: ["ranged"],
      weakVs: ["magic"],
    },
    {
      id: "bonesinger",
      name: "Bonesinger",
      role: "Necro ranged",
      blurb: "Rains death while melee packs trade and rise again.",
      synergy: "+15% melee ally damage · kills may raise bones",
      hp: 55,
      atk: 16,
      spd: 3.4,
      armor: 1,
      atkCd: 0.7,
      range: 30,
      atkStyle: "magic",
      tags: ["magic"],
      strongVs: ["armored"],
      weakVs: ["cavalry"],
    },
    {
      id: "raidcaptain",
      name: "Raid Captain",
      role: "Cavalry commander",
      blurb: "Drives a fast push — riders carve the backline.",
      synergy: "+12% ally move speed · +20% cavalry damage",
      hp: 85,
      atk: 14,
      spd: 5.8,
      armor: 2,
      atkCd: 0.5,
      range: 6,
      atkStyle: "melee",
      tags: ["cavalry"],
      strongVs: ["ranged", "magic"],
      weakVs: ["infantry"],
    },
  ];

  const BONE_MINION = {
    id: "boneminion",
    name: "Bone Minion",
    hp: 16,
    atk: 5,
    spd: 3.6,
    armor: 0,
    atkCd: 0.5,
    range: 6,
    atkStyle: "melee",
    tags: ["infantry"],
    strongVs: [],
    weakVs: ["ranged"],
  };

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
    healer:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-hood" d="M18 28c2-14 10-20 14-20s12 6 14 20l-4 6H22z"/>` +
      `<circle class="u-skin" cx="32" cy="26" r="7"/>` +
      `<path class="u-body" d="M22 34h20l3 22H19z"/>` +
      `<path class="u-accent" d="M28 40h8v16h-8z"/>` +
      `<circle class="u-gem" cx="32" cy="48" r="3"/>` +
      `<rect class="u-metal" x="44" y="18" width="3" height="30" rx="1"/>` +
      `<path class="u-point" d="M41 16h9v3h-3v6h-3v-6h-3z"/>` +
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
    bulwark:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-crest" d="M28 2l4-2 4 2v10h-8z"/>` +
      `<path class="u-helm" d="M14 22c0-12 8-18 18-18s18 6 18 18v8H14z"/>` +
      `<path class="u-visor" d="M20 26h24v5H20z"/>` +
      `<circle class="u-skin" cx="32" cy="20" r="5"/>` +
      `<path class="u-body" d="M14 36h36l3 22H11z"/>` +
      `<path class="u-shield" d="M6 28h20v28c0 5-5 10-10 10s-10-5-10-10z"/>` +
      `<path class="u-accent" d="M16 36v16M11 44h10"/>` +
      `<rect class="u-metal" x="44" y="34" width="6" height="22" rx="1"/>` +
      `</svg>`,
    bonesinger:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-hood" d="M16 28c2-18 10-26 16-26s14 8 16 26l-5 8H21z"/>` +
      `<circle class="u-skin" cx="32" cy="26" r="7"/>` +
      `<path class="u-eye" d="M27 25h3v2h-3zm7 0h3v2h-3z"/>` +
      `<path class="u-body" d="M20 36h24l5 22H15z"/>` +
      `<circle class="u-gem" cx="32" cy="48" r="4"/>` +
      `<rect class="u-metal" x="46" y="16" width="3" height="32" rx="1"/>` +
      `<circle class="u-point" cx="47.5" cy="14" r="5"/>` +
      `<path class="u-accent" d="M26 40h12v3H26z"/>` +
      `</svg>`,
    raidcaptain:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<ellipse class="u-body" cx="34" cy="42" rx="20" ry="11"/>` +
      `<path class="u-metal" d="M14 40c2-7 7-12 12-12 2 4 2 11 0 15z"/>` +
      `<circle class="u-skin" cx="28" cy="16" r="7"/>` +
      `<path class="u-helm" d="M18 16c0-9 5-13 10-13s10 4 10 13v4H18z"/>` +
      `<path class="u-visor" d="M22 17h12v2H22z"/>` +
      `<path class="u-crest" d="M26 2l4-2 4 2v8h-8z"/>` +
      `<path class="u-accent" d="M22 26h14l2 10H20z"/>` +
      `<path class="u-point" d="M44 18l16 8-16 3z"/>` +
      `</svg>`,
    boneminion:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<circle class="u-skin" cx="32" cy="22" r="10"/>` +
      `<path class="u-eye" d="M26 20h4v3h-4zm8 0h4v3h-4z"/>` +
      `<path class="u-body" d="M22 34h20l3 22H19z"/>` +
      `<path class="u-metal" d="M28 14h8v3h-8z"/>` +
      `<path class="u-claw" d="M18 48l-6 8h6zm28 0l6 8h-6z"/>` +
      `<path class="u-accent" d="M28 42h8v3h-8z"/>` +
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
      tags: ["infantry"],
      strongVs: ["ranged"],
      weakVs: ["cavalry"],
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
      tags: ["cavalry"],
      strongVs: ["ranged", "magic", "support"],
      weakVs: ["infantry"],
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
      tags: ["ranged"],
      strongVs: ["infantry"],
      weakVs: ["cavalry"],
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
      tags: ["infantry", "armored"],
      strongVs: ["ranged"],
      weakVs: ["magic"],
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
      tags: ["magic"],
      strongVs: ["armored"],
      weakVs: ["cavalry"],
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
      tags: ["cavalry"],
      strongVs: ["ranged", "magic", "support"],
      weakVs: ["infantry"],
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
        { type: "hound", w: 3 },
        { type: "raider", w: 1 },
        { type: "grunt", w: 1 },
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
        { type: "brute", w: 3 },
        { type: "skirmisher", w: 1 },
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
        { type: "hound", w: 3 },
        { type: "raider", w: 2 },
        { type: "skirmisher", w: 1 },
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
    goldCursors: document.getElementById("gold-cursors"),
    foodCursors: document.getElementById("food-cursors"),
    goldAutoToggle: document.getElementById("gold-auto-toggle"),
    foodAutoToggle: document.getElementById("food-auto-toggle"),
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
    heroPick: document.getElementById("hero-pick"),
    heroPickGrid: document.getElementById("hero-pick-grid"),
    heroChip: document.getElementById("hero-chip"),
    heroChipName: document.getElementById("hero-chip-name"),
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
    autoClick: defaultAutoClickDraft(),
    unlockedUnits: {},
    waveTransitioning: false,
    upgradeCategory: "economy",
    heroId: null,
  };

  function defaultUpgradeLevelsDraft() {
    const levels = {};
    for (const def of UPGRADES) levels[def.id] = 0;
    return levels;
  }

  function defaultAutoClickDraft() {
    return { gold: true, food: true };
  }

  function defaultAutoSpawnDraft() {
    const o = {};
    for (const t of UNIT_TYPES) o[t.id] = t.id === "spearman";
    return o;
  }

  function defaultAutoSpawn() {
    return defaultAutoSpawnDraft();
  }

  function defaultAutoClick() {
    return defaultAutoClickDraft();
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

  function heroDef(id) {
    return HEROES.find((h) => h.id === id) || null;
  }

  function isValidHeroId(id) {
    return typeof id === "string" && !!heroDef(id);
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
      autoClick: { ...state.autoClick },
      unlockedUnits: { ...state.unlockedUnits },
      heroId: state.heroId,
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
    // Accept v1–v5 saves (migrate forward).
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
    const autoClick = defaultAutoClick();
    if (data.autoClick && typeof data.autoClick === "object") {
      if (typeof data.autoClick.gold === "boolean") {
        autoClick.gold = data.autoClick.gold;
      }
      if (typeof data.autoClick.food === "boolean") {
        autoClick.food = data.autoClick.food;
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
    state.autoClick = autoClick;
    state.unlockedUnits = unlocked;
    state.heroId = isValidHeroId(data.heroId) ? data.heroId : null;
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
    state.autoClick = defaultAutoClick();
    state.unlockedUnits = defaultUnlockedUnits();
    state.waveTransitioning = false;
    state.heroId = null;
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
    appendLog("log-muted", "New game — choose your hero.");
    renderHud();
    beginRun();
  }

  function beginRun() {
    if (!state.heroId) {
      showHeroPick();
      return;
    }
    hideHeroPick();
    startBattle();
  }

  function syncHeroChip() {
    const def = heroDef(state.heroId);
    if (el.heroChip) {
      el.heroChip.hidden = !def;
      el.heroChip.setAttribute("aria-hidden", def ? "false" : "true");
    }
    if (el.heroChipName) {
      el.heroChipName.textContent = def ? def.name : "";
    }
  }

  function showHeroPick() {
    if (!el.heroPick || !el.heroPickGrid) return;
    el.heroPickGrid.innerHTML = "";
    for (const hero of HEROES) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "hero-pick-card";
      card.dataset.heroId = hero.id;
      card.setAttribute("aria-label", `Choose ${hero.name}`);
      card.innerHTML =
        `<div class="hero-pick-portrait unit-sil type-${hero.id}" aria-hidden="true">` +
        unitArt(hero.id) +
        `</div>` +
        `<div class="hero-pick-body">` +
        `<span class="hero-pick-name">${hero.name}</span>` +
        `<span class="hero-pick-role">${hero.role}</span>` +
        `<span class="hero-pick-blurb">${hero.blurb}</span>` +
        `<span class="hero-pick-synergy">${hero.synergy}</span>` +
        `</div>` +
        `<span class="hero-pick-choose">Choose</span>`;
      card.addEventListener("click", () => selectHero(hero.id));
      el.heroPickGrid.appendChild(card);
    }
    el.heroPick.hidden = false;
    el.heroPick.setAttribute("aria-hidden", "false");
    document.body.classList.add("hero-pick-open");
    syncHeroChip();
  }

  function hideHeroPick() {
    if (!el.heroPick) return;
    el.heroPick.hidden = true;
    el.heroPick.setAttribute("aria-hidden", "true");
    document.body.classList.remove("hero-pick-open");
  }

  function selectHero(id) {
    if (!isValidHeroId(id)) return;
    state.heroId = id;
    saveGame(true);
    hideHeroPick();
    const def = heroDef(id);
    appendLog(
      "log-muted",
      `${def.name} takes the field — ${def.synergy}.`
    );
    syncHeroChip();
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

  function goldAutoCps() {
    return (state.upgradeLevels.autoMiner || 0) * AUTO_CLICK_CPS_PER_LEVEL;
  }

  function foodAutoCps() {
    return (state.upgradeLevels.autoForager || 0) * AUTO_CLICK_CPS_PER_LEVEL;
  }

  function goldAutoActive() {
    return state.autoClick.gold && goldAutoCps() > 0;
  }

  function foodAutoActive() {
    return state.autoClick.food && foodAutoCps() > 0;
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

  function bossSummonInterval(wave) {
    return Math.max(BOSS_SUMMON_FLOOR, BOSS_SUMMON_BASE - wave * 0.04);
  }

  function livingBosses() {
    if (!state.battle) return [];
    return state.battle.units.filter((u) => u.boss && u.hp > 0);
  }

  function hasLivingBoss() {
    return livingBosses().length > 0;
  }

  function keepSpawnInterval(wave) {
    const base = enemySpawnInterval(wave);
    return hasLivingBoss() ? base * BOSS_KEEP_SPAWN_MULT : base;
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
      hp = Math.floor(hp * 1.7);
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
      tags: arch.tags ? arch.tags.slice() : ["infantry"],
      strongVs: arch.strongVs ? arch.strongVs.slice() : [],
      weakVs: arch.weakVs ? arch.weakVs.slice() : [],
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
    const drums = state.upgradeLevels.drums || 0;
    return {
      maxHp: Math.max(1, Math.round(type.hp * (1 + 0.12 * v))),
      atk: Math.max(1, Math.round(type.atk * (1 + 0.15 * w))),
      armor: type.armor + a,
      spd: type.spd,
      atkCd: Math.max(0.25, type.atkCd * Math.pow(0.94, drums)),
      range: type.range || MELEE_RANGE,
      atkStyle: type.atkStyle || "melee",
      tags: type.tags ? type.tags.slice() : ["infantry"],
      strongVs: type.strongVs ? type.strongVs.slice() : [],
      weakVs: type.weakVs ? type.weakVs.slice() : [],
    };
  }

  function counterMult(attacker, defender) {
    if (!attacker || !defender) return 1;
    const defTags = defender.tags || [];
    if (!defTags.length) return 1;
    const strong = attacker.strongVs || [];
    const weak = attacker.weakVs || [];
    for (let i = 0; i < strong.length; i++) {
      if (defTags.indexOf(strong[i]) !== -1) return COUNTER_STRONG;
    }
    for (let i = 0; i < weak.length; i++) {
      if (defTags.indexOf(weak[i]) !== -1) return COUNTER_WEAK;
    }
    return 1;
  }

  function distinctPlayerTypes() {
    if (!state.battle) return 0;
    const seen = Object.create(null);
    let n = 0;
    for (const u of state.battle.units) {
      if (u.side !== "player" || u.hp <= 0 || !u.typeId) continue;
      if (u.hero || u.minion) continue;
      if (seen[u.typeId]) continue;
      seen[u.typeId] = true;
      n += 1;
    }
    return n;
  }

  function compositionDamageBonus() {
    const n = distinctPlayerTypes();
    if (n >= 3) return 1.1;
    if (n >= 2) return 1.05;
    return 1;
  }

  function livingHeroUnit() {
    if (!state.battle) return null;
    for (const u of state.battle.units) {
      if (u.side === "player" && u.hero && u.hp > 0) return u;
    }
    return null;
  }

  function heroAuraDamageMult(attacker) {
    if (!attacker || attacker.side !== "player" || attacker.hero || attacker.minion) {
      return 1;
    }
    if (!livingHeroUnit()) return 1;
    const id = state.heroId;
    if (id === "bulwark") {
      const tags = attacker.tags || [];
      if (tags.indexOf("ranged") !== -1 || tags.indexOf("magic") !== -1) {
        return 1.2;
      }
    } else if (id === "bonesinger") {
      if (!isRangedStyle(attacker.atkStyle)) return 1.15;
    } else if (id === "raidcaptain") {
      const tags = attacker.tags || [];
      if (tags.indexOf("cavalry") !== -1) return 1.2;
    }
    return 1;
  }

  function dealDamage(attacker, defender) {
    let mult = counterMult(attacker, defender);
    if (attacker && attacker.side === "player") {
      mult *= compositionDamageBonus();
      mult *= heroAuraDamageMult(attacker);
    }
    return Math.max(1, Math.round(attacker.atk * mult) - (defender.armor || 0));
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

  function countArmyUnits() {
    if (!state.battle) return 0;
    return state.battle.units.filter(
      (u) => u.side === "player" && u.hp > 0 && !u.hero && !u.minion
    ).length;
  }

  function countBoneMinions() {
    if (!state.battle) return 0;
    return state.battle.units.filter(
      (u) => u.side === "player" && u.minion && u.hp > 0
    ).length;
  }

  function clampFieldY(y) {
    return Math.max(FIELD_Y_MIN, Math.min(FIELD_Y_MAX, y));
  }

  function pickSpawnY(side) {
    const living = state.battle
      ? state.battle.units.filter((u) => u.hp > 0)
      : [];
    const allies = living.filter((u) => u.side === side);
    const foes = living.filter((u) => u.side !== side);
    const homeEdge = side === "player" ? BASE_EDGE_PLAYER : BASE_EDGE_ENEMY;

    let bestIdx = state.laneCursor % LANES.length;
    let bestScore = -Infinity;
    for (let i = 0; i < LANES.length; i++) {
      const idx = (state.laneCursor + i) % LANES.length;
      const laneY = LANES[idx];
      const crowd = allies.filter((u) => Math.abs(u.y - laneY) < 7).length;
      let threat = 0;

      if (side === "player") {
        for (const f of foes) {
          if (Math.abs(f.y - laneY) >= LANE_THREAT_BAND) continue;
          const proximity = Math.max(0, 92 - Math.abs(f.x - homeEdge));
          threat += proximity;
        }
      } else {
        const defenders = foes.filter((u) => Math.abs(u.y - laneY) < 7).length;
        threat = 28 - defenders * 10;
        for (const f of foes) {
          if (Math.abs(f.y - laneY) >= LANE_THREAT_BAND) continue;
          // Prefer lanes where the keep is less screened.
          threat += Math.max(0, 40 - Math.abs(f.x - BASE_EDGE_PLAYER) * 0.45);
        }
      }

      const score = threat - crowd * 14 + (i === 0 ? 0.01 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }

    state.laneCursor = (bestIdx + 1) % LANES.length;
    const jitter = (Math.random() * 2 - 1) * LANE_JITTER;
    return clampFieldY(LANES[bestIdx] + jitter);
  }

  function gateExitY(homeY) {
    const mid = (FIELD_Y_MIN + FIELD_Y_MAX) * 0.5;
    return clampFieldY(mid * 0.55 + homeY * 0.45);
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
      u.hero ? "hero" : "",
      u.minion ? "minion" : "",
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

  function spawnFloater(x, y, amount, slain, counterHit) {
    const d = document.createElement("div");
    d.className =
      "dmg-floater" +
      (slain ? " kill" : "") +
      (counterHit ? " counter" : "");
    d.style.setProperty("--x", x + "%");
    d.style.setProperty("--y", y + "%");
    d.textContent = "−" + amount + (counterHit ? "!" : "");
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

  function spawnHealFloater(x, y, amount) {
    const d = document.createElement("div");
    d.className = "dmg-floater heal-gain";
    d.style.setProperty("--x", x + "%");
    d.style.setProperty("--y", y + "%");
    d.textContent = "+" + amount;
    el.fieldUnits.appendChild(d);
    setTimeout(() => d.remove(), 700);
  }

  function spawnFoodFloater(x, y, amount) {
    const d = document.createElement("div");
    d.className = "dmg-floater food-gain";
    d.style.setProperty("--x", x + "%");
    d.style.setProperty("--y", (y - 4) + "%");
    d.textContent = "+" + amount + "f";
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

  function killFoodPayout(target) {
    let amount = 1 + Math.floor(state.wave / 4);
    if (target && target.boss) amount = Math.max(1, Math.floor(amount * 1.5));
    else if (target && target.mini) amount = Math.max(1, Math.floor(amount * 1.25));
    return amount;
  }

  function killFoodCap() {
    return 4 + Math.floor(state.wave / 2);
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
  }

  function awardKillFood(target) {
    const b = state.battle;
    if (!b || !b.active) return;
    const now = Date.now();
    if (!b.killFoodWindow || now - b.killFoodWindow.t0 >= KILL_GOLD_WINDOW_MS) {
      b.killFoodWindow = { t0: now, accrued: 0 };
    }
    const want = killFoodPayout(target);
    const room = Math.max(0, killFoodCap() - b.killFoodWindow.accrued);
    const pay = Math.min(want, room);
    if (pay <= 0) return;
    b.killFoodWindow.accrued += pay;
    state.food += pay;
    spawnFoodFloater(target.x, target.y, pay);
  }

  function awardKillRewards(target) {
    awardKillGold(target);
    awardKillFood(target);
    syncResourceDisplays();
  }

  function markDead(u) {
    u.hp = 0;
    if (u.hero) {
      u.respawnAt = Date.now() + HERO_RESPAWN_S * 1000;
      u.removeAt = Date.now() + 400;
    } else {
      u.removeAt = Date.now() + 400;
      u.respawnAt = 0;
    }
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

  function armyCapacity() {
    const lv = state.upgradeLevels.granary || 0;
    return Math.min(
      FIELD_SOFT_CAP,
      BASE_ARMY_CAPACITY + GRANARY_CAPACITY_PER_LEVEL * lv
    );
  }

  function createPlayerUnit(typeId) {
    if (!inBattle()) return false;
    const type = unitType(typeId);
    if (!type) return false;
    if (countArmyUnits() >= armyCapacity()) return false;

    const stats = playerUnitStats(type);
    const homeY = pickSpawnY("player");
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
      tags: stats.tags,
      strongVs: stats.strongVs,
      weakVs: stats.weakVs,
      x: spawnXFor("player"),
      y: gateExitY(homeY),
      homeY,
      spreadT: SPAWN_SPREAD_S,
      attackCd: 0,
      boss: false,
      hero: false,
      minion: false,
    };
    state.battle.units.push(unit);
    mountToken(unit);
    return true;
  }

  function createHeroUnit(heroId) {
    if (!inBattle()) return null;
    const def = heroDef(heroId || state.heroId);
    if (!def) return null;
    const stats = playerUnitStats(def);
    const homeY = pickSpawnY("player");
    const unit = {
      id: "h" + state.nextUnitId++,
      side: "player",
      typeId: def.id,
      name: def.name,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      atk: stats.atk,
      armor: stats.armor,
      spd: stats.spd,
      atkCdMax: stats.atkCd,
      range: stats.range,
      atkStyle: stats.atkStyle,
      tags: stats.tags,
      strongVs: stats.strongVs,
      weakVs: stats.weakVs,
      x: spawnXFor("player"),
      y: gateExitY(homeY),
      homeY,
      spreadT: SPAWN_SPREAD_S,
      attackCd: 0,
      boss: false,
      hero: true,
      minion: false,
      respawnAt: 0,
    };
    state.battle.units.push(unit);
    mountToken(unit);
    return unit;
  }

  function ensureHero() {
    if (!inBattle() || !state.heroId) return;
    const b = state.battle;
    const existing = b.units.find((u) => u.hero);
    if (existing) {
      if (existing.hp > 0) return;
      if (existing.respawnAt && Date.now() < existing.respawnAt) return;
      reviveHero(existing);
      return;
    }
    createHeroUnit(state.heroId);
  }

  function reviveHero(unit) {
    if (!unit || !unit.hero || !inBattle()) return;
    const def = heroDef(unit.typeId) || heroDef(state.heroId);
    if (!def) return;
    const stats = playerUnitStats(def);
    const homeY = pickSpawnY("player");
    unit.hp = stats.maxHp;
    unit.maxHp = stats.maxHp;
    unit.atk = stats.atk;
    unit.armor = stats.armor;
    unit.spd = stats.spd;
    unit.atkCdMax = stats.atkCd;
    unit.range = stats.range;
    unit.x = spawnXFor("player");
    unit.y = gateExitY(homeY);
    unit.homeY = homeY;
    unit.spreadT = SPAWN_SPREAD_S;
    unit.attackCd = 0;
    unit.removeAt = 0;
    unit.respawnAt = 0;
    const node = getTokenEl(unit.id);
    if (node) {
      node.classList.remove("downed", "falling");
      updateTokenEl(unit, node);
    } else {
      mountToken(unit);
    }
    appendLog("log-muted", `${unit.name} returns to the gate!`);
  }

  function createBoneMinion() {
    if (!inBattle()) return false;
    if (countBoneMinions() >= BONE_MINION_MAX) return false;
    const type = BONE_MINION;
    const stats = playerUnitStats(type);
    const homeY = pickSpawnY("player");
    const unit = {
      id: "m" + state.nextUnitId++,
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
      tags: stats.tags,
      strongVs: stats.strongVs,
      weakVs: stats.weakVs,
      x: spawnXFor("player"),
      y: gateExitY(homeY),
      homeY,
      spreadT: SPAWN_SPREAD_S * 0.6,
      attackCd: 0,
      boss: false,
      hero: false,
      minion: true,
    };
    state.battle.units.push(unit);
    mountToken(unit);
    return true;
  }

  function tryBonesingerRaise(attacker) {
    if (!attacker || !attacker.hero) return;
    if (state.heroId !== "bonesinger") return;
    if (Math.random() >= BONE_MINION_KILL_CHANCE) return;
    if (createBoneMinion()) {
      appendLog("log-muted", `${attacker.name} raises a bone minion!`);
    }
  }

  function refundTraining() {
    const t = state.battle && state.battle.training;
    if (!t) return;
    state.gold += t.goldPaid || 0;
    state.food += t.foodPaid || 0;
    state.battle.training = null;
    state.battle.preferType = null;
  }

  function startTraining(typeId, opts) {
    opts = opts || {};
    const fromAuto = !!opts.fromAuto;
    if (!inBattle() || inCountdown()) return false;
    if (!isUnitUnlocked(typeId)) return false;
    const b = state.battle;
    if (!b || b.training) return false;
    const type = unitType(typeId);
    if (!type) return false;
    if (state.gold < type.cost || state.food < type.foodCost) return false;
    if (countArmyUnits() >= armyCapacity()) return false;

    state.gold -= type.cost;
    state.food -= type.foodCost;
    const duration = trainDuration() * (fromAuto ? AUTO_TRAIN_MULT : 1);
    b.training = {
      typeId: type.id,
      elapsed: 0,
      duration,
      goldPaid: type.cost,
      foodPaid: type.foodCost,
      fromAuto,
    };
    b.trainRetryAt = 0;
    if (!fromAuto && b.preferType === typeId) b.preferType = null;
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
    if (countArmyUnits() >= armyCapacity()) return "Army at capacity";
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
    const b = state.battle;
    if (startTraining(typeId, { fromAuto: false })) {
      if (b) b.preferType = null;
      pulseRecruitCard(card, "buy-flash");
      renderHud();
      return true;
    }
    if (
      b &&
      b.training &&
      isUnitUnlocked(typeId) &&
      inBattle() &&
      !inCountdown() &&
      countArmyUnits() < armyCapacity()
    ) {
      const type = unitType(typeId);
      if (
        type &&
        state.gold >= type.cost &&
        state.food >= type.foodCost
      ) {
        b.preferType = typeId;
        pulseRecruitCard(card, "buy-flash");
        if (el.spawnHint) {
          el.spawnHint.textContent =
            `Queued ${type.name} next (manual)…`;
        }
        return true;
      }
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
    const b = state.battle;
    if (!b || b.training) return false;
    if (countArmyUnits() >= armyCapacity()) return false;

    if (b.preferType) {
      const prefer = b.preferType;
      if (startTraining(prefer, { fromAuto: false })) {
        b.preferType = null;
        return true;
      }
    }

    const enabled = enabledSpawnTypes();
    if (enabled.length === 0) return false;

    for (let i = 0; i < enabled.length; i++) {
      const idx = (state.spawnCursor + i) % enabled.length;
      const type = enabled[idx];
      if (startTraining(type.id, { fromAuto: true })) {
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

  /**
   * @param {{ typeId: string, rank?: "normal"|"mini"|"boss", x: number, y: number, homeY: number, name?: string, spreadT?: number }} opts
   */
  function createEnemyUnit(opts) {
    if (!inBattle()) return null;
    if (countSide("enemy") >= FIELD_SOFT_CAP) return null;

    const b = state.battle;
    const rank = opts.rank || "normal";
    const stats = enemyArchetypeStats(state.wave, opts.typeId, rank);
    const name =
      opts.name ||
      (rank === "boss" || rank === "mini"
        ? waveMeta(state.wave).name
        : stats.label);

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
      tags: stats.tags,
      strongVs: stats.strongVs,
      weakVs: stats.weakVs,
      x: opts.x,
      y: opts.y,
      homeY: opts.homeY,
      spreadT: opts.spreadT != null ? opts.spreadT : SPAWN_SPREAD_S,
      attackCd: 0,
      boss: !!stats.boss,
      mini: !!stats.mini,
    };

    if (rank === "boss") {
      const cd = bossSummonInterval(state.wave);
      unit.summonCdMax = cd;
      // First pulse after a short beat so the boss reads on the field first.
      unit.summonCd = Math.min(cd, 1.8);
    }

    b.enemySpawned = (b.enemySpawned || 0) + 1;
    b.units.push(unit);
    mountToken(unit);
    return unit;
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

    const homeY = pickSpawnY("enemy");
    createEnemyUnit({
      typeId,
      rank,
      name: rank === "boss" || rank === "mini" ? meta.name : undefined,
      x: spawnXFor("enemy"),
      y: gateExitY(homeY),
      homeY,
    });
  }

  function spawnBossMinion(boss) {
    if (!inBattle() || !boss || boss.hp <= 0) return null;
    if (countSide("enemy") >= FIELD_SOFT_CAP) return null;

    const meta = waveMeta(state.wave);
    const typeId = pickWeightedEnemyType(meta.mix);
    const homeY = clampFieldY(boss.y + (Math.random() * 2 - 1) * 8);
    const x = Math.max(
      BASE_EDGE_PLAYER + 4,
      Math.min(BASE_EDGE_ENEMY - 2, boss.x - (4 + Math.random() * 5))
    );
    const y = clampFieldY(boss.y + (Math.random() * 2 - 1) * 6);

    return createEnemyUnit({
      typeId,
      rank: "normal",
      x,
      y,
      homeY,
      spreadT: 0.2,
    });
  }

  function tickBossSummons(dt) {
    const b = state.battle;
    if (!b || !b.active) return;

    const bosses = livingBosses();
    for (const boss of bosses) {
      if (boss.summonCd == null) continue;
      boss.summonCd = Math.max(0, boss.summonCd - dt);
      if (boss.summonCd > 0) continue;

      const count = state.wave >= BOSS_SUMMON_DOUBLE_WAVE ? 2 : 1;
      let spawned = 0;
      for (let i = 0; i < count; i++) {
        if (spawnBossMinion(boss)) spawned++;
      }

      boss.summonCd = boss.summonCdMax || bossSummonInterval(state.wave);

      if (spawned > 0 && !b.bossSummonLogged) {
        b.bossSummonLogged = true;
        appendLog("log-muted", `${boss.name} summons minions!`);
      }
    }
  }

  function findTarget(unit) {
    const living = state.battle.units.filter(
      (o) => o.side !== unit.side && o.hp > 0
    );
    if (living.length === 0) return null;

    const laneFoes = living.filter(
      (o) => Math.abs(o.y - unit.y) < LANE_TARGET_Y
    );
    const pool = laneFoes.length ? laneFoes : null;

    if (pool) {
      pool.sort((a, b) => {
        const da = Math.abs(a.x - unit.x) + Math.abs(a.y - unit.y) * 0.35;
        const db = Math.abs(b.x - unit.x) + Math.abs(b.y - unit.y) * 0.35;
        return da - db;
      });
      return pool[0];
    }

    // Peel toward foes threatening the home keep in a wider Y band.
    const homeEdge =
      unit.side === "player" ? BASE_EDGE_PLAYER : BASE_EDGE_ENEMY;
    const threats = living.filter((o) => {
      if (Math.abs(o.y - unit.y) >= LANE_KEEP_PEEL_Y) return false;
      return Math.abs(o.x - homeEdge) + 8 < Math.abs(unit.x - homeEdge);
    });
    if (threats.length === 0) return null;
    threats.sort((a, b) => {
      const da =
        Math.abs(a.x - homeEdge) * 1.2 +
        Math.abs(a.x - unit.x) +
        Math.abs(a.y - unit.y) * 0.4;
      const db =
        Math.abs(b.x - homeEdge) * 1.2 +
        Math.abs(b.x - unit.x) +
        Math.abs(b.y - unit.y) * 0.4;
      return da - db;
    });
    return threats[0];
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

  function isHealStyle(style) {
    return style === "heal";
  }

  function engageRange(unit) {
    return unit.range || MELEE_RANGE;
  }

  function healAmount(unit) {
    const med = state.upgradeLevels.medicine || 0;
    return Math.max(1, Math.round(unit.atk * (1 + 0.2 * med)));
  }

  function findHealTarget(healer) {
    if (!state.battle) return null;
    let best = null;
    let bestRatio = 2;
    for (const u of state.battle.units) {
      if (u.side !== healer.side || u.hp <= 0 || u.id === healer.id) continue;
      if (u.hp >= u.maxHp) continue;
      if (Math.abs(u.y - healer.y) > LANE_TARGET_Y) continue;
      const ratio = u.hp / Math.max(1, u.maxHp);
      if (ratio < bestRatio) {
        bestRatio = ratio;
        best = u;
      }
    }
    return best;
  }

  function healerHoldX(healer, living) {
    let frontX = null;
    for (const u of living) {
      if (u.side !== healer.side || u.hp <= 0 || u.id === healer.id) continue;
      if (isHealStyle(u.atkStyle)) continue;
      if (frontX == null || u.x > frontX) frontX = u.x;
    }
    if (frontX == null) return Math.min(healer.x + 1, BASE_EDGE_ENEMY - 12);
    return Math.max(PLAYER_SPAWN_X, Math.min(BASE_EDGE_ENEMY - 10, frontX - 8));
  }

  function healAlly(healer, target) {
    if (!target || target.hp <= 0 || target.hp >= target.maxHp) return;
    healer.attackCd = healer.atkCdMax;
    flashToken(healer.id, "attack");
    spawnProjectile(healer.x, healer.y, target.x, target.y, "heal");
    const amt = healAmount(healer);
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + amt);
    const gained = Math.max(0, Math.round(target.hp - before));
    if (gained > 0) spawnHealFloater(target.x, target.y, gained);
    updateTokenEl(target);
  }

  function spawnProjectile(fromX, fromY, toX, toY, style) {
    const d = document.createElement("div");
    let kind = "arrow";
    if (style === "magic") kind = "bolt";
    else if (style === "heal") kind = "heal";
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
    const counter = counterMult(attacker, target);
    const dmg = dealDamage(attacker, target);
    target.hp -= dmg;
    flashToken(target.id, "hit");
    spawnFloater(target.x, target.y, dmg, target.hp <= 0, counter >= COUNTER_STRONG);
    updateTokenEl(target);
    if (target.hp <= 0) {
      markDead(target);
      appendLog("log-kill", `${attacker.name} fells ${target.name}!`);
      if (attacker.side === "player" && target.side === "enemy") {
        awardKillRewards(target);
        tryBonesingerRaise(attacker);
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
    let dmg = unit.atk;
    if (unit.side === "player") {
      const siege = state.upgradeLevels.siege || 0;
      dmg = Math.max(1, Math.round(unit.atk * (1 + 0.15 * siege)));
    }
    base.hp -= dmg;
    spawnFloater(baseX, unit.y, dmg, base.hp <= 0);
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
    const homeEdge =
      unit.side === "player" ? BASE_EDGE_PLAYER : BASE_EDGE_ENEMY;
    const foeCloserToKeep =
      Math.abs(targetX - homeEdge) < Math.abs(unit.x - homeEdge);
    // Defend the breach: chase foe Y harder when they are nearer your keep.
    const yBlend = foeCloserToKeep ? 0.85 : 0.5;
    const desiredY = targetY * yBlend + home * (1 - yBlend);
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
    b.preferType = null;
    b.trainRetryAt = 0;
    syncCountdownBar();
    appendLog(
      "log-muted",
      `Wave ${state.wave}: ${waveMeta(state.wave).name} — keep the line fed!`
    );
    setStatus("Fighting", "fighting");
    ensureHero();
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
      b.enemySpawnAt = keepSpawnInterval(state.wave);
    }

    tickBossSummons(dt);

    tickTraining(dt);

    tickHeroRespawn();

    const living = b.units.filter((u) => u.hp > 0);
    const raidSpeed =
      state.heroId === "raidcaptain" && livingHeroUnit() ? 1.12 : 1;

    for (const unit of living) {
      unit.attackCd = Math.max(0, unit.attackCd - dt);
      const dir = unit.side === "player" ? 1 : -1;
      const moveSpeed =
        unit.spd *
        UNIT_MOVE_MULT *
        (unit.side === "player" ? raidSpeed : 1);
      const step = moveSpeed * dt;
      const engage = engageRange(unit);

      if (unit.spreadT > 0) {
        unit.spreadT = Math.max(0, unit.spreadT - dt);
        unit.x += dir * step * 0.9;
        if (unit.side === "player") {
          unit.x = Math.min(unit.x, BASE_EDGE_ENEMY);
        } else {
          unit.x = Math.max(unit.x, BASE_EDGE_PLAYER);
        }
        const home = unit.homeY != null ? unit.homeY : unit.y;
        const dy = home - unit.y;
        if (Math.abs(dy) > 0.5) {
          unit.y = clampFieldY(
            unit.y + Math.sign(dy) * Math.min(9 * dt, Math.abs(dy))
          );
        }
        if (!isHealStyle(unit.atkStyle)) {
          const early = findTarget(unit);
          if (early && Math.abs(early.x - unit.x) <= engage && unit.attackCd <= 0) {
            strikeUnit(unit, early);
          }
        }
        continue;
      }

      if (isHealStyle(unit.atkStyle)) {
        const ally = findHealTarget(unit);
        if (ally) {
          const dist = Math.abs(ally.x - unit.x);
          if (dist <= engage) {
            if (unit.attackCd <= 0) healAlly(unit, ally);
          } else {
            moveTowardEngage(unit, ally.x, ally.y, engage, step, dt);
          }
        } else {
          const holdX = healerHoldX(unit, living);
          if (Math.abs(holdX - unit.x) > 0.6) {
            if (unit.x < holdX) unit.x = Math.min(unit.x + step, holdX);
            else unit.x = Math.max(unit.x - step, holdX);
          }
          const home = unit.homeY != null ? unit.homeY : unit.y;
          const dy = home - unit.y;
          if (Math.abs(dy) > 2.5) {
            unit.y = clampFieldY(
              unit.y + Math.sign(dy) * Math.min(1.6 * dt, Math.abs(dy))
            );
          }
        }
        continue;
      }

      const target = findTarget(unit);

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
          // Light lane drift only — prioritize marching on the keep.
          const home = unit.homeY != null ? unit.homeY : unit.y;
          const dy = home - unit.y;
          if (Math.abs(dy) > 2.5) {
            unit.y = clampFieldY(
              unit.y + Math.sign(dy) * Math.min(1.6 * dt, Math.abs(dy))
            );
          }
        }
      }
    }

    applyUnitSeparation(living, dt);

    const now = Date.now();
    b.units = b.units.filter((u) => {
      if (u.hero && (u.hp > 0 || u.respawnAt)) return true;
      return u.hp > 0 || (u.removeAt && now < u.removeAt);
    });
    syncFieldPositions();
    renderBaseBars();
  }

  function tickHeroRespawn() {
    if (!state.battle || !state.heroId) return;
    const hero = state.battle.units.find((u) => u.hero);
    if (!hero) {
      ensureHero();
      return;
    }
    if (hero.hp > 0) return;
    if (!hero.respawnAt || Date.now() < hero.respawnAt) return;
    reviveHero(hero);
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
      preferType: null,
      trainRetryAt: 0,
      countdown: opening ? OPENING_COUNTDOWN_S : 0,
      countdownMax: opening ? OPENING_COUNTDOWN_S : 0,
      catapultUsed: false,
      killGoldWindow: null,
      killFoodWindow: null,
      elitePending: isEliteWave(state.wave),
      enemySpawned: 0,
      bossSummonLogged: false,
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
      ensureHero();
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
    if (id === "autoMiner" || id === "autoForager") {
      syncAutoCursorRings();
      syncResourceAutoToggles();
    }
    saveGame(true);
    renderHud();
  }

  function combatBonusText(def, level) {
    if (def.id === "weapons") return `+${Math.round(15 * level)}% ATK`;
    if (def.id === "armor") return `+${level} armor`;
    if (def.id === "vitality") return `+${Math.round(12 * level)}% HP`;
    if (def.id === "barracks") return `−${Math.round(100 * (1 - Math.pow(0.88, level)))}% time`;
    if (def.id === "drums") {
      return `−${Math.round(100 * (1 - Math.pow(0.94, level)))}% atk cd`;
    }
    if (def.id === "medicine") return `+${Math.round(20 * level)}% heal`;
    if (def.id === "siege") return `+${Math.round(15 * level)}% keep dmg`;
    if (def.id === "granary") return `Army cap ${armyCapacity()}`;
    if (def.id === "plunder") return `+${Math.round(15 * level)}% kill gold`;
    if (def.id === "caravan") return `+${Math.round(12 * level)}% win gold`;
    return def.desc;
  }

  function economyEffectText(def, level) {
    if (level <= 0) return "";
    if (def.id === "pickaxe") return `+${level} gold/click`;
    if (def.id === "autoMiner") {
      return `${format(level * AUTO_CLICK_CPS_PER_LEVEL)} clicks/sec`;
    }
    if (def.id === "traders") return `+${format(level * 0.5)} g/s`;
    if (def.id === "baskets") return `+${format(level * 0.5)} food/click`;
    if (def.id === "autoForager") {
      return `${format(level * AUTO_CLICK_CPS_PER_LEVEL)} clicks/sec`;
    }
    if (def.id === "foragers") return `+${format(level * 0.8)} food/s`;
    if (def.id === "smithy") {
      return `+${level * 2} click, +${format(level * 0.25)} g/s`;
    }
    if (
      def.id === "granary" ||
      def.id === "plunder" ||
      def.id === "caravan"
    ) {
      return combatBonusText(def, level);
    }
    return "";
  }

  function trainDuration() {
    const lv = state.upgradeLevels.barracks || 0;
    return Math.max(MIN_TRAIN_TIME, BASE_TRAIN_TIME * Math.pow(0.88, lv));
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
        if (def.icon) btn.dataset.icon = def.icon;
        btn.innerHTML =
          `<span class="shop-icon" aria-hidden="true"></span>` +
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
      let meta = def.desc;
      if (def.combat) {
        if (level > 0) meta = def.desc + ` (${combatBonusText(def, level)})`;
      } else {
        const effect = economyEffectText(def, level);
        if (effect) meta = def.desc + ` (${effect})`;
      }
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

  function foodIncomePerSecond() {
    return (
      state.foodPerSecond +
      (foodAutoActive() ? foodAutoCps() * state.foodClickPower : 0)
    );
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
    const cap = armyCapacity();
    const fieldBit = ` · Field ${playerCount}/${cap}`;
    const typesN = distinctPlayerTypes();
    const mixBit =
      typesN >= 3
        ? " · Mixed army +10% dmg"
        : typesN >= 2
          ? " · Mixed army +5% dmg"
          : "";

    if (state.waveTransitioning) {
      return `Wave resolving — next assault shortly`;
    }
    if (inCountdown()) {
      const secs = Math.ceil(state.battle.countdown);
      return `Assault in ${secs}… turn Auto on — training starts when combat begins`;
    }
    if (!live) {
      return `Battle looping — train troops or enable Auto${fieldBit}`;
    }
    if (playerCount >= cap) {
      return `Army at capacity (${cap}) — wait for space or buy Granary${mixBit}`;
    }
    const unlockable = UNIT_TYPES.filter(
      (t) => unitNeedsUnlock(t) && !isUnitUnlocked(t.id) && unitUnlockWaveReached(t)
    );
    if (unlockable.length > 0 && enabled.length === 0) {
      const u = unlockable[0];
      return `Unlock ${u.name} for ${format(u.unlockCost)} g (wave ${u.unlockWave}+)${fieldBit}`;
    }
    const prefer =
      state.battle && state.battle.preferType
        ? unitType(state.battle.preferType)
        : null;
    const training = state.battle && state.battle.training;
    if (training) {
      const type = unitType(training.typeId);
      const left = Math.max(0, training.duration - training.elapsed);
      const nextBit = prefer ? ` · Next ${prefer.name}` : "";
      const autoBit = training.fromAuto ? " (Auto)" : "";
      return `Training ${type ? type.name : "unit"}${autoBit}… ${left.toFixed(1)}s${nextBit}${fieldBit}${mixBit}`;
    }
    if (prefer) {
      return `Queued ${prefer.name} (manual)${fieldBit}${mixBit}`;
    }
    if (enabled.length === 0) {
      return `Click a unit to train (faster than Auto), or turn Auto on${fieldBit}${mixBit}`;
    }
    const canAny = enabled.some(
      (t) => state.gold >= t.cost && state.food >= t.foodCost
    );
    if (!canAny) {
      const needGold = enabled.every((t) => state.gold < t.cost);
      const needFood = enabled.every((t) => state.food < t.foodCost);
      if (needGold && needFood) {
        return `Need more gold and food to spawn${fieldBit}${mixBit}`;
      }
      if (needGold) return `Need more gold to spawn${fieldBit}${mixBit}`;
      if (needFood) return `Need more food to spawn${fieldBit}${mixBit}`;
      return `Can't afford enabled units yet${fieldBit}${mixBit}`;
    }
    const names = enabled.map((t) => t.name).join(", ");
    return `Auto: ${names}${fieldBit}${mixBit}`;
  }

  function renderSpawn() {
    const live = inBattle() && !inCountdown();
    const playerCount = countArmyUnits();
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
          playerCount < armyCapacity();
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
          const blurbEl = card.querySelector(".item-blurb");
          if (blurbEl) blurbEl.textContent = type.blurb || "";
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
        playerCount < armyCapacity();
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
        (unlocked && type.blurb
          ? `<span class="item-blurb">${type.blurb}</span>`
          : "") +
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
    const kind = waveKindLabel(state.wave);
    const kindHint = isBossWave(state.wave)
      ? `${kind} (summons) · Keep ${eMax} · Yours ${PLAYER_BASE_HP}`
      : `${kind} · Keep ${eMax} · Yours ${PLAYER_BASE_HP}`;
    el.wavePreview.innerHTML =
      `<div class="wave-preview-main">` +
      `<span class="enemy-name">${meta.name}</span>` +
      `<span class="wave-subtitle">${kindHint}</span>` +
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
    const income = foodIncomePerSecond();
    el.fps.textContent = format(income);
    el.fpsPrefix.textContent = "+";
    const rate = el.fps.closest(".resource-fps");
    if (rate) rate.classList.remove("is-drain");
  }

  function renderHud() {
    el.gold.textContent = format(state.gold);
    el.gps.textContent = format(
      state.goldPerSecond +
        (goldAutoActive() ? goldAutoCps() * state.clickPower : 0)
    );
    el.food.textContent = format(state.food);
    syncFoodRateDisplay();
    el.wave.textContent = String(state.wave);
    syncHeroChip();
    syncAutoCursorRings();
    syncResourceAutoToggles();
    renderWarChest();
    renderUpgrades();
    renderSpawn();
    renderBattlePanel();
  }

  function syncResourceDisplays() {
    el.gold.textContent = format(state.gold);
    el.gps.textContent = format(
      state.goldPerSecond +
        (goldAutoActive() ? goldAutoCps() * state.clickPower : 0)
    );
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

  function pulseResourceClick(btn, amount, kind, opts) {
    opts = opts || {};
    btn.classList.remove("click-pulse");
    void btn.offsetWidth;
    btn.classList.add("click-pulse");
    setTimeout(() => btn.classList.remove("click-pulse"), 220);

    if (opts.showFloater === false) return;

    const floater = document.createElement("span");
    floater.className = "click-floater " + kind;
    floater.textContent = "+" + format(amount);
    btn.appendChild(floater);
    setTimeout(() => floater.remove(), 650);
  }

  let goldAutoAccum = 0;
  let foodAutoAccum = 0;
  let goldFloaterCooldown = 0;
  let foodFloaterCooldown = 0;
  let goldCursorJabIdx = 0;
  let foodCursorJabIdx = 0;

  function jabAutoCursor(kind) {
    const ring = kind === "food" ? el.foodCursors : el.goldCursors;
    if (!ring) return;
    const cursors = ring.querySelectorAll(".auto-cursor");
    if (!cursors.length) return;
    const idx =
      kind === "food"
        ? foodCursorJabIdx % cursors.length
        : goldCursorJabIdx % cursors.length;
    if (kind === "food") foodCursorJabIdx += 1;
    else goldCursorJabIdx += 1;
    const cursor = cursors[idx];
    cursor.classList.remove("jab");
    void cursor.offsetWidth;
    cursor.classList.add("jab");
    setTimeout(() => cursor.classList.remove("jab"), 280);
  }

  function syncAutoCursorRing(ring, level, kind) {
    if (!ring) return;
    const count = Math.min(MAX_VISIBLE_CURSORS, Math.max(0, level | 0));
    const existing = ring.querySelectorAll(".auto-cursor");
    if (existing.length !== count) {
      ring.innerHTML = "";
      for (let i = 0; i < count; i++) {
        const cursor = document.createElement("span");
        cursor.className = "auto-cursor auto-cursor-" + kind;
        const angle = (360 / count) * i - 90;
        cursor.style.setProperty("--cursor-angle", angle + "deg");
        cursor.style.animationDelay = (i * 0.12).toFixed(2) + "s";
        ring.appendChild(cursor);
      }
    }
    ring.hidden = count === 0;
  }

  function syncAutoCursorRings() {
    syncAutoCursorRing(
      el.goldCursors,
      state.upgradeLevels.autoMiner || 0,
      "gold"
    );
    syncAutoCursorRing(
      el.foodCursors,
      state.upgradeLevels.autoForager || 0,
      "food"
    );
    const goldSlot = el.clickBtn && el.clickBtn.closest(".resource-click-slot");
    const foodSlot =
      el.foodClickBtn && el.foodClickBtn.closest(".resource-click-slot");
    if (goldSlot) {
      goldSlot.classList.toggle("auto-on", goldAutoActive());
      goldSlot.classList.toggle(
        "has-cursors",
        (state.upgradeLevels.autoMiner || 0) > 0
      );
    }
    if (foodSlot) {
      foodSlot.classList.toggle("auto-on", foodAutoActive());
      foodSlot.classList.toggle(
        "has-cursors",
        (state.upgradeLevels.autoForager || 0) > 0
      );
    }
  }

  function syncResourceAutoToggles() {
    const goldLv = state.upgradeLevels.autoMiner || 0;
    const foodLv = state.upgradeLevels.autoForager || 0;
    if (el.goldAutoToggle) {
      const show = goldLv > 0;
      el.goldAutoToggle.hidden = !show;
      el.goldAutoToggle.classList.toggle("is-on", state.autoClick.gold);
      el.goldAutoToggle.setAttribute(
        "aria-pressed",
        state.autoClick.gold ? "true" : "false"
      );
      el.goldAutoToggle.title = state.autoClick.gold
        ? `Auto mine on (${format(goldAutoCps())}/s)`
        : "Auto mine off";
    }
    if (el.foodAutoToggle) {
      const show = foodLv > 0;
      el.foodAutoToggle.hidden = !show;
      el.foodAutoToggle.classList.toggle("is-on", state.autoClick.food);
      el.foodAutoToggle.setAttribute(
        "aria-pressed",
        state.autoClick.food ? "true" : "false"
      );
      el.foodAutoToggle.title = state.autoClick.food
        ? `Auto forage on (${format(foodAutoCps())}/s)`
        : "Auto forage off";
    }
    updateResourceClickSubs();
  }

  function updateResourceClickSubs() {
    if (el.clickPower) {
      const sub = el.clickBtn && el.clickBtn.querySelector(".click-btn-sub");
      if (sub && goldAutoActive()) {
        sub.innerHTML =
          `+<span id="click-power-display">${format(state.clickPower)}</span>` +
          ` · auto ${format(goldAutoCps())}/s`;
        el.clickPower = document.getElementById("click-power-display");
      } else if (sub) {
        sub.innerHTML =
          `+<span id="click-power-display">${format(state.clickPower)}</span> per click`;
        el.clickPower = document.getElementById("click-power-display");
      } else {
        el.clickPower.textContent = format(state.clickPower);
      }
    }
    if (el.foodClickPower) {
      const sub =
        el.foodClickBtn && el.foodClickBtn.querySelector(".click-btn-sub");
      if (sub && foodAutoActive()) {
        sub.innerHTML =
          `+<span id="food-click-power-display">${format(state.foodClickPower)}</span>` +
          ` · auto ${format(foodAutoCps())}/s`;
        el.foodClickPower = document.getElementById("food-click-power-display");
      } else if (sub) {
        sub.innerHTML =
          `+<span id="food-click-power-display">${format(state.foodClickPower)}</span> food`;
        el.foodClickPower = document.getElementById("food-click-power-display");
      } else {
        el.foodClickPower.textContent = format(state.foodClickPower);
      }
    }
  }

  function toggleAutoClick(kind) {
    if (kind === "gold") {
      if ((state.upgradeLevels.autoMiner || 0) <= 0) return;
      state.autoClick.gold = !state.autoClick.gold;
      if (!state.autoClick.gold) goldAutoAccum = 0;
    } else if (kind === "food") {
      if ((state.upgradeLevels.autoForager || 0) <= 0) return;
      state.autoClick.food = !state.autoClick.food;
      if (!state.autoClick.food) foodAutoAccum = 0;
    } else {
      return;
    }
    saveGame(true);
    syncAutoCursorRings();
    syncResourceAutoToggles();
  }

  function doMineClick(opts) {
    opts = opts || {};
    const amount = state.clickPower;
    state.gold += amount;
    pulseResourceClick(el.clickBtn, amount, "gold", {
      showFloater: opts.showFloater !== false,
    });
    if (opts.jabCursor) jabAutoCursor("gold");
  }

  function doForageClick(opts) {
    opts = opts || {};
    const amount = state.foodClickPower;
    state.food += amount;
    pulseResourceClick(el.foodClickBtn, amount, "food", {
      showFloater: opts.showFloater !== false,
    });
    if (opts.jabCursor) jabAutoCursor("food");
  }

  function tickAutoClicks(dt) {
    goldFloaterCooldown = Math.max(0, goldFloaterCooldown - dt);
    foodFloaterCooldown = Math.max(0, foodFloaterCooldown - dt);

    if (goldAutoActive()) {
      goldAutoAccum += goldAutoCps() * dt;
      let fired = 0;
      while (goldAutoAccum >= 1 && fired < 40) {
        goldAutoAccum -= 1;
        fired += 1;
        const showFloater = goldFloaterCooldown <= 0;
        if (showFloater) goldFloaterCooldown = AUTO_FLOATER_MIN_INTERVAL;
        doMineClick({ showFloater, jabCursor: true });
      }
    } else {
      goldAutoAccum = 0;
    }

    if (foodAutoActive()) {
      foodAutoAccum += foodAutoCps() * dt;
      let fired = 0;
      while (foodAutoAccum >= 1 && fired < 40) {
        foodAutoAccum -= 1;
        fired += 1;
        const showFloater = foodFloaterCooldown <= 0;
        if (showFloater) foodFloaterCooldown = AUTO_FLOATER_MIN_INTERVAL;
        doForageClick({ showFloater, jabCursor: true });
      }
    } else {
      foodAutoAccum = 0;
    }
  }

  bindPress(el.clickBtn, () => {
    doMineClick({ showFloater: true });
    renderHud();
  });

  bindPress(el.foodClickBtn, () => {
    doForageClick({ showFloater: true });
    renderHud();
  });

  if (el.goldAutoToggle) {
    el.goldAutoToggle.addEventListener("click", (ev) => {
      ev.stopPropagation();
      toggleAutoClick("gold");
    });
  }
  if (el.foodAutoToggle) {
    el.foodAutoToggle.addEventListener("click", (ev) => {
      ev.stopPropagation();
      toggleAutoClick("food");
    });
  }

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
    tickAutoClicks(dt);

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
  beginRun();
  initMusic();
})();
