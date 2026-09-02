(() => {
  "use strict";

  const GAME_VERSION = "0.7.5";
  const HUD_MS = 100;
  const BATTLE_MS = 50;
  const MOBILE_MQ = "(max-width: 900px)";
  const MOBILE_PANE_KEY = "castlestrike-mobile-pane";
  const HOVER_TOOLTIP_MQ = "(hover: hover) and (pointer: fine)";
  const LONG_PRESS_MS = 400;

  const CASTLE_HP = 140;
  const GRID_COLS = 4;
  const GRID_ROWS = 5;
  const MELEE_RANGE = 7;
  const COUNTER_STRONG = 1.4;
  const COUNTER_WEAK = 0.7;
  const UNIT_MOVE_MULT = 0.88;
  const FIELD_SOFT_CAP = 48;
  const LANE_TARGET_Y = 24;
  const LANE_KEEP_PEEL_Y = 36;
  const SEPARATION_DIST = 6.2;
  const SEPARATION_STRENGTH = 10;
  const PROJ_FLIGHT_S = 0.25;
  const DEATH_FADE_MS = 850;
  const KITE_MIN_RANGE = 10;
  const TARGET_STICK_LEASH = 30;
  const HERO_UNLOCK_ROUND = 4;
  const GUARDIAN_UNLOCK_ROUND = 6;
  const ARCHER_UNLOCK_ROUND = 3;
  const RIDER_UNLOCK_ROUND = 4;
  const HEALER_UNLOCK_ROUND = 4;
  const ASSASSIN_UNLOCK_ROUND = 5;
  const GRENADIER_UNLOCK_ROUND = 5;
  const KNIGHT_UNLOCK_ROUND = 6;
  const MAGE_UNLOCK_ROUND = 6;
  const CATAPULT_UNLOCK_ROUND = 7;
  const HERO_REZ_COST_MULT = 0.4;
  const BONE_MINION_MAX = 3;
  const BONE_MINION_KILL_CHANCE = 0.3;
  const MAGE_SPLASH_FRAC = 0.45;
  const CHARGE_BONUS = 1.35;
  const BRACE_BONUS = 1.5;
  const STUN_S = 0.35;
  const SLOW_S = 0.6;
  const AEGIS_S = 2.2;
  const SHIELD_BASH_CD = 4.5;

  const PLAYER_SPAWN = { x0: 5, x1: 19, y0: 26, y1: 82 };
  const ENEMY_SPAWN = { x0: 68, x1: 90, y0: 22, y1: 86 };
  const CASTLE_X_PLAYER = 7;
  const CASTLE_X_ENEMY = 93;
  const CASTLE_Y = 55;
  const BASE_EDGE_PLAYER = CASTLE_X_PLAYER;
  const BASE_EDGE_ENEMY = CASTLE_X_ENEMY;

  const TOWER_HP = 75;
  const TOWER_ATK = 7;
  const TOWER_RANGE = 15;
  const TOWER_CD = 1.05;
  const MAX_UNIT_RESEARCH = 3;
  const MAX_TOWER_RESEARCH = 3;
  const UNIT_RESEARCH_COST_MULT = 2.1;
  const UNIT_RESEARCH_COST_GROWTH = 1.6;
  const UNIT_RESEARCH_HP_MULT = 0.16;
  const UNIT_RESEARCH_ATK_MULT = 0.14;
  const TOWER_RESEARCH_BASE_COST = 45;
  const TOWER_RESEARCH_GROWTH = 1.55;
  const TOWER_RESEARCH_HP = 20;
  const TOWER_RESEARCH_ATK = 2;
  const TOWER_RESEARCH_RANGE = 3;

  const START_GOLD = 10;
  const BASE_GPS = 0.85;
  const ECONOMY_BASE_COST = 30;
  const ECONOMY_GROWTH = 1.45;
  const ECONOMY_GPS = 0.85;
  const STREAK_GPS = 0.35;
  const MAX_ECONOMY = 8;
  const AI_BUY_INTERVAL = 1.6;
  const UNIT_COST_GROWTH = 1.22;
  const SPLASH_DAMAGE_FRAC = 0.45;
  const BACKLINE_TAGS = new Set(["ranged", "magic", "support", "siege"]);
  const ROSTER_MAX = 24;
  const WAVE_INTERVAL_S = 30;
  const WAVE_ROSTER_START = 2;
  const MUSIC_VOLUME_KEY = "clickstrike-music-volume";
  const MUSIC_MUTED_KEY = "clickstrike-music-muted";
  const SFX_MUTED_KEY = "clickstrike-sfx-muted";
  const SFX_VOLUME_KEY = "clickstrike-sfx-volume";
  const BEST_RECORD_KEY = "castlestrike-best-record";
  const TIMER_URGENT_S = 5;
  const MUSIC_TRACKS = [
    "../../assets/audio/music/07-human-1.mp3",
    "../../assets/audio/music/13-arrival-at-kalimdor.mp3",
  ];
  const UNIT_TYPES = [
    {
      id: "militia",
      name: "Militia",
      baseCost: 10,
      costGrowth: 1.32,
      accent: "#90a4ae",
      hp: 16,
      atk: 3,
      spd: 3.4,
      armor: 0,
      atkCd: 0.5,
      range: 6,
      atkStyle: "melee",
      tags: ["infantry"],
      strongVs: ["support"],
      weakVs: ["ranged"],
      blurb: "Cheap frontline soak · Soft vs ranged",
    },
    {
      id: "spearman",
      name: "Spearman",
      baseCost: 18,
      accent: "#6b9bd1",
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
      blurb: "Brace vs cavalry charge",
      ability: "brace",
    },
    {
      id: "archer",
      name: "Archer",
      baseCost: 38,
      accent: "#7cb342",
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
      blurb: "Volley every 4th shot",
      ability: "volley",
      unlockRound: ARCHER_UNLOCK_ROUND,
    },
    {
      id: "knight",
      name: "Knight",
      baseCost: 85,
      accent: "#9575cd",
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
      blurb: "Shield bash stuns",
      ability: "shieldbash",
      unlockRound: KNIGHT_UNLOCK_ROUND,
    },
    {
      id: "rider",
      name: "Rider",
      baseCost: 52,
      accent: "#ffb74d",
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
      blurb: "Charge after a sprint",
      ability: "charge",
      unlockRound: RIDER_UNLOCK_ROUND,
    },
    {
      id: "healer",
      name: "Healer",
      baseCost: 58,
      accent: "#4db6ac",
      hp: 18,
      atk: 6,
      spd: 3,
      armor: 0,
      atkCd: 0.9,
      range: 24,
      atkStyle: "heal",
      tags: ["support"],
      strongVs: [],
      weakVs: ["cavalry"],
      blurb: "Sanctuary group heal",
      ability: "sanctuary",
      unlockRound: HEALER_UNLOCK_ROUND,
    },
    {
      id: "mage",
      name: "Mage",
      baseCost: 78,
      accent: "#ba68c8",
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
      blurb: "Arcane splash on impact",
      ability: "arcane",
      unlockRound: MAGE_UNLOCK_ROUND,
    },
    {
      id: "guardian",
      name: "Guardian",
      baseCost: 72,
      accent: "#5c6bc0",
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
      blurb: "Fat anti-mage wall · Soft vs cavalry",
      ability: "aegis",
      unlockRound: GUARDIAN_UNLOCK_ROUND,
    },
    {
      id: "assassin",
      name: "Assassin",
      baseCost: 64,
      accent: "#ef5350",
      hp: 16,
      atk: 12,
      spd: 6.2,
      armor: 0,
      atkCd: 0.42,
      range: 6,
      atkStyle: "melee",
      tags: ["cavalry"],
      strongVs: ["support", "magic"],
      weakVs: ["infantry"],
      targetPriority: "backline",
      blurb: "Dives for backline · Soft vs spears",
      unlockRound: ASSASSIN_UNLOCK_ROUND,
    },
    {
      id: "grenadier",
      name: "Grenadier",
      baseCost: 68,
      accent: "#ff7043",
      hp: 24,
      atk: 8,
      spd: 2.8,
      armor: 1,
      atkCd: 0.65,
      range: 18,
      atkStyle: "ranged",
      tags: ["ranged"],
      strongVs: ["infantry"],
      weakVs: ["cavalry"],
      splash: 10,
      blurb: "Splash punishes clumps · Soft vs cavalry",
      unlockRound: GRENADIER_UNLOCK_ROUND,
    },
    {
      id: "catapult",
      name: "Catapult",
      baseCost: 96,
      accent: "#8d6e63",
      hp: 20,
      atk: 7,
      spd: 1.6,
      armor: 0,
      atkCd: 1.1,
      range: 36,
      atkStyle: "ranged",
      tags: ["siege"],
      strongVs: [],
      weakVs: ["cavalry"],
      structureMult: 2.6,
      blurb: "Melts towers & keeps · Soft vs cavalry",
      unlockRound: CATAPULT_UNLOCK_ROUND,
    },
  ];

  const HEROES = [
    {
      id: "bulwark",
      name: "Bulwark",
      blurb: "+20% ranged & magic ally damage",
      hireGold: 180,
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
      blurb: "+15% melee damage · raises bones",
      hireGold: 195,
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
      blurb: "+12% speed · +20% cavalry damage",
      hireGold: 190,
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
    weakVs: [],
  };

  const HERO_IDS = new Set(HEROES.map((h) => h.id));

  const ENEMY_ART = {
    militia: "foe",
    spearman: "foe",
    archer: "foe-skirmisher",
    knight: "foe-brute",
    rider: "foe-raider",
    healer: "foe",
    mage: "foe-cultist",
    guardian: "foe-brute",
    assassin: "foe-raider",
    grenadier: "foe-skirmisher",
    catapult: "foe-brute",
    bulwark: "foe-brute",
    bonesinger: "foe-cultist",
    raidcaptain: "foe-raider",
  };

  const UNIT_ART = {
    militia:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<circle class="u-skin" cx="32" cy="24" r="8"/>` +
      `<path class="u-hood" d="M20 26c2-10 8-16 12-16s10 6 12 16v4H20z"/>` +
      `<path class="u-body" d="M22 34h20l2 22H20z"/>` +
      `<path class="u-shield" d="M12 32h12v20c0 3-3 6-6 6s-6-3-6-6z"/>` +
      `<rect class="u-metal" x="38" y="30" width="3" height="20" rx="1"/>` +
      `<path class="u-accent" d="M26 40h12v2H26z"/>` +
      `</svg>`,
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
    assassin:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path class="u-hood" d="M16 30c2-16 10-22 16-22s14 6 16 22l-5 6H21z"/>` +
      `<circle class="u-skin" cx="32" cy="28" r="7"/>` +
      `<path class="u-body" d="M22 36h20l3 20H19z"/>` +
      `<path class="u-point" d="M44 26l12 8-12 2z"/>` +
      `<path class="u-claw" d="M18 44l-4 10M46 44l4 10"/>` +
      `<path class="u-accent" d="M28 42h8v2h-8z"/>` +
      `</svg>`,
    grenadier:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<circle class="u-skin" cx="32" cy="22" r="8"/>` +
      `<path class="u-helm" d="M20 20c0-8 5-12 12-12s12 4 12 12v4H20z"/>` +
      `<path class="u-body" d="M20 34h24l3 20H17z"/>` +
      `<rect class="u-accent" x="38" y="36" width="14" height="12" rx="2"/>` +
      `<path class="u-point" d="M45 32l2-4 2 4z"/>` +
      `<line class="u-string" x1="48" y1="28" x2="52" y2="20"/>` +
      `</svg>`,
    catapult:
      `<svg class="unit-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<rect class="u-body" x="10" y="44" width="44" height="8" rx="2"/>` +
      `<circle class="u-metal" cx="18" cy="48" r="5"/>` +
      `<circle class="u-metal" cx="46" cy="48" r="5"/>` +
      `<path class="u-metal" d="M22 44l18-16 6 4-18 16z"/>` +
      `<circle class="u-accent" cx="44" cy="24" r="5"/>` +
      `<path class="u-point" d="M48 20l6-2-2 6z"/>` +
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
  /* ---- helpers ---- */
  function unitType(id) {
    return UNIT_TYPES.find((t) => t.id === id) || null;
  }

  function heroDef(id) {
    return HEROES.find((h) => h.id === id) || null;
  }

  function isHeroId(id) {
    return HERO_IDS.has(id);
  }

  function isUnitUnlocked(typeId) {
    const t = unitType(typeId);
    if (!t) return false;
    if (!t.unlockRound) return true;
    return state.round >= t.unlockRound;
  }

  function heroesUnlocked() {
    return state.round >= HERO_UNLOCK_ROUND;
  }

  function canPlaceUnits() {
    return !state.over && state.waveTimer > 0;
  }

  function isRangedStyle(style) {
    return style === "ranged" || style === "magic";
  }

  function isHealStyle(style) {
    return style === "heal";
  }

  function clampFieldY(y) {
    return Math.max(6, Math.min(94, y));
  }

  function emptyRoster() {
    const r = Object.create(null);
    for (const t of UNIT_TYPES) r[t.id] = 0;
    return r;
  }

  function emptyUnitLevels() {
    const r = Object.create(null);
    for (const t of UNIT_TYPES) r[t.id] = 0;
    return r;
  }

  function actorForSide(side) {
    return side === "player" ? state : state.ai;
  }

  function unitLevelFor(actor, typeId) {
    return (actor.unitLevels && actor.unitLevels[typeId]) || 0;
  }

  function unitUpgradeCost(typeId, level) {
    const type = unitType(typeId);
    if (!type) return Infinity;
    return Math.floor(
      type.baseCost * UNIT_RESEARCH_COST_MULT * Math.pow(UNIT_RESEARCH_COST_GROWTH, level)
    );
  }

  function towerUpgradeCost(level) {
    return Math.floor(TOWER_RESEARCH_BASE_COST * Math.pow(TOWER_RESEARCH_GROWTH, level));
  }

  function unitStatsAtLevel(type, level) {
    return {
      hp: Math.round(type.hp * (1 + UNIT_RESEARCH_HP_MULT * level)),
      atk: Math.round(type.atk * (1 + UNIT_RESEARCH_ATK_MULT * level)),
    };
  }

  function towerStatsAtLevel(level) {
    return {
      maxHp: TOWER_HP + TOWER_RESEARCH_HP * level,
      atk: TOWER_ATK + TOWER_RESEARCH_ATK * level,
      range: TOWER_RANGE + TOWER_RESEARCH_RANGE * level,
    };
  }

  function applyTowerStatsToSide(side, level) {
    const stats = towerStatsAtLevel(level);
    for (const tower of state.towers || []) {
      if (tower.side !== side) continue;
      const wasDead = tower.hp <= 0;
      const ratio = wasDead || tower.maxHp <= 0 ? 0 : tower.hp / tower.maxHp;
      tower.maxHp = stats.maxHp;
      tower.atk = stats.atk;
      tower.range = stats.range;
      if (!wasDead) {
        tower.hp = Math.max(1, Math.round(stats.maxHp * ratio));
      }
    }
    lastTowerSig = "";
  }

  function retargetLivingUnitsOfType(side, typeId) {
    const actor = actorForSide(side);
    const type = unitType(typeId);
    if (!type) return;
    const level = unitLevelFor(actor, typeId);
    const stats = unitStatsAtLevel(type, level);
    for (const u of state.battle.units) {
      if (u.side !== side || u.typeId !== typeId || u.hero || u.minion || u.hp <= 0) continue;
      const ratio = u.maxHp > 0 ? u.hp / u.maxHp : 1;
      u.maxHp = stats.hp;
      u.atk = stats.atk;
      u.researchLevel = level;
      u.hp = Math.min(u.maxHp, Math.max(1, Math.round(u.maxHp * ratio)));
      const node = getTokenEl(u.id);
      if (node) {
        const plate = node.querySelector(".unit-plate");
        if (plate) plate.textContent = unitPlateName(u);
      }
      updateCombatToken(u);
    }
  }

  function canBuyUnitUpgrade(actor, typeId) {
    if (!actor || state.over) return false;
    const type = unitType(typeId);
    if (!type) return false;
    if ((actor.roster[typeId] || 0) < 1) return false;
    if (!isUnitUnlocked(typeId)) return false;
    const level = unitLevelFor(actor, typeId);
    if (level >= MAX_UNIT_RESEARCH) return false;
    return actor.gold >= unitUpgradeCost(typeId, level);
  }

  function canBuyTowerUpgrade(actor) {
    if (!actor || state.over) return false;
    const level = actor.towerLevel || 0;
    if (level >= MAX_TOWER_RESEARCH) return false;
    return actor.gold >= towerUpgradeCost(level);
  }

  function buyUnitUpgrade(typeId, forPlayer) {
    const actor = forPlayer ? state : state.ai;
    if (!canBuyUnitUpgrade(actor, typeId)) return false;
    const level = unitLevelFor(actor, typeId);
    const cost = unitUpgradeCost(typeId, level);
    actor.gold -= cost;
    if (forPlayer) spendGold(cost);
    if (!actor.unitLevels) actor.unitLevels = emptyUnitLevels();
    actor.unitLevels[typeId] = level + 1;
    retargetLivingUnitsOfType(forPlayer ? "player" : "enemy", typeId);
    lastShopSig = "";
    return true;
  }

  function buyTowerUpgrade(forPlayer) {
    const actor = forPlayer ? state : state.ai;
    if (!canBuyTowerUpgrade(actor)) return false;
    const level = actor.towerLevel || 0;
    const cost = towerUpgradeCost(level);
    actor.gold -= cost;
    if (forPlayer) spendGold(cost);
    actor.towerLevel = level + 1;
    applyTowerStatsToSide(forPlayer ? "player" : "enemy", actor.towerLevel);
    lastShopSig = "";
    lastTowerSig = "";
    return true;
  }

  function rosterTotal(roster) {
    let n = 0;
    for (const t of UNIT_TYPES) n += roster[t.id] || 0;
    return n;
  }

  function rosterCap(round) {
    const r = round == null ? (state && state.round) || 1 : round;
    return Math.min(ROSTER_MAX, WAVE_ROSTER_START + Math.max(0, r - 1));
  }

  function rosterHasRoom(roster, round) {
    return rosterTotal(roster) < rosterCap(round);
  }

  function economyCost(level) {
    return Math.floor(ECONOMY_BASE_COST * Math.pow(ECONOMY_GROWTH, level));
  }

  function unitCost(typeId, roster) {
    const type = unitType(typeId);
    if (!type) return Infinity;
    const owned = roster[typeId] || 0;
    const growth = type.costGrowth || UNIT_COST_GROWTH;
    return Math.floor(type.baseCost * Math.pow(growth, owned));
  }

  function gpsFor(actor) {
    return (
      BASE_GPS +
      (actor.economy || 0) * ECONOMY_GPS +
      (actor.winStreak || 0) * STREAK_GPS
    );
  }

  function tickEconomy(dt) {
    state.gold += gpsFor(state) * dt;
    state.ai.gold += gpsFor(state.ai) * dt;
  }

  function aiTryBuy() {
    const ai = state.ai;
    if (state.over) return;
    if (heroesUnlocked() && !ai.heroId) {
      const hid = pickAiHeroId();
      const def = heroDef(hid);
      if (def && ai.gold >= def.hireGold + 20) {
        buyHero(hid, false);
        buildAiFormation();
        return;
      }
    }
    const econCost = economyCost(ai.economy || 0);
    if (
      (ai.economy || 0) < MAX_ECONOMY &&
      ai.gold >= econCost &&
      ai.gold >= econCost + 12
    ) {
      buyEconomy(false);
      buildAiFormation();
      return;
    }
    if (aiTryResearch()) return;
    const counterId = counterTypeId(dominantTag(state.roster));
    if (isUnitUnlocked(counterId)) {
      const counterCost = unitCost(counterId, ai.roster);
      if (ai.gold >= counterCost && rosterHasRoom(ai.roster)) {
        buyUnit(counterId, false);
        buildAiFormation();
        return;
      }
    }
    const affordable = UNIT_TYPES.filter((t) => {
      if (!isUnitUnlocked(t.id)) return false;
      const c = unitCost(t.id, ai.roster);
      return ai.gold >= c && rosterHasRoom(ai.roster);
    });
    if (!affordable.length) return;
    affordable.sort((a, b) => unitCost(a.id, ai.roster) - unitCost(b.id, ai.roster));
    buyUnit(affordable[0].id, false);
    buildAiFormation();
  }

  function aiTryResearch() {
    const ai = state.ai;
    const rosterFull = !rosterHasRoom(ai.roster);
    const oneSlotLeft = rosterTotal(ai.roster) >= rosterCap() - 1;

    const heavyTypes = UNIT_TYPES.filter((t) => {
      if ((ai.roster[t.id] || 0) < 2) return false;
      if (!isUnitUnlocked(t.id)) return false;
      const lvl = unitLevelFor(ai, t.id);
      if (lvl >= MAX_UNIT_RESEARCH) return false;
      return ai.gold >= unitUpgradeCost(t.id, lvl) + 15;
    });
    if (heavyTypes.length) {
      heavyTypes.sort(
        (a, b) =>
          unitUpgradeCost(a.id, unitLevelFor(ai, a.id)) -
          unitUpgradeCost(b.id, unitLevelFor(ai, b.id))
      );
      if (buyUnitUpgrade(heavyTypes[0].id, false)) return true;
    }

    const aiTower = ai.towerLevel || 0;
    const playerTower = state.towerLevel || 0;
    const totalUnits = rosterTotal(ai.roster);
    if (
      state.round >= 3 &&
      totalUnits >= 2 &&
      aiTower < MAX_TOWER_RESEARCH &&
      ai.gold >= towerUpgradeCost(aiTower) &&
      (aiTower < playerTower - 1 || rosterFull)
    ) {
      if (buyTowerUpgrade(false)) return true;
    }

    if (rosterFull || oneSlotLeft) {
      const owned = UNIT_TYPES.filter((t) => canBuyUnitUpgrade(ai, t.id));
      if (owned.length) {
        owned.sort(
          (a, b) =>
            unitUpgradeCost(a.id, unitLevelFor(ai, a.id)) -
            unitUpgradeCost(b.id, unitLevelFor(ai, b.id))
        );
        if (buyUnitUpgrade(owned[0].id, false)) return true;
      }
      if (canBuyTowerUpgrade(ai) && buyTowerUpgrade(false)) return true;
    }

    return false;
  }

  function cellKey(col, row) {
    return col + "," + row;
  }

  function cellToPercent(col, row, side) {
    const z = side === "enemy" ? ENEMY_SPAWN : PLAYER_SPAWN;
    return {
      x: z.x0 + ((col + 0.5) / GRID_COLS) * (z.x1 - z.x0),
      y: z.y0 + ((row + 0.5) / GRID_ROWS) * (z.y1 - z.y0),
    };
  }

  function isPlayerCell(col) {
    return col >= 0 && col < GRID_COLS;
  }

  function createTowers() {
    const spec = [
      { id: "pt1", side: "player", x: 26, y: 30 },
      { id: "pt2", side: "player", x: 38, y: 55 },
      { id: "pt3", side: "player", x: 26, y: 74 },
      { id: "et1", side: "enemy", x: 74, y: 30 },
      { id: "et2", side: "enemy", x: 62, y: 55 },
      { id: "et3", side: "enemy", x: 74, y: 74 },
    ];
    return spec.map((t) => ({
      ...t,
      hp: TOWER_HP,
      maxHp: TOWER_HP,
      atk: TOWER_ATK,
      range: TOWER_RANGE,
      atkCd: 0,
      atkCdMax: TOWER_CD,
    }));
  }

  function livingTowers(side) {
    return (state.towers || []).filter(
      (t) => t.hp > 0 && (!side || t.side === side)
    );
  }

  function formationAt(formation, col, row) {
    return formation.find((s) => s.col === col && s.row === row) || null;
  }

  function syncBench() {
    const bench = emptyRoster();
    for (const t of UNIT_TYPES) {
      const placed = state.playerFormation.filter((s) => s.typeId === t.id).length;
      bench[t.id] = Math.max(0, (state.roster[t.id] || 0) - placed);
    }
    state.bench = bench;
  }

  function isBacklineType(typeId) {
    const t = unitType(typeId);
    if (!t) return false;
    if (t.targetPriority === "backline") return true;
    if (t.tags && t.tags.includes("siege")) return true;
    return t.atkStyle === "ranged" || t.atkStyle === "magic" || t.atkStyle === "heal";
  }

  function pickAiCell(occupied, typeId) {
    const cols = [];
    for (let c = 0; c < GRID_COLS; c++) cols.push(c);
    if (isBacklineType(typeId)) cols.reverse();
    for (const col of cols) {
      for (let row = 0; row < GRID_ROWS; row++) {
        const key = cellKey(col, row);
        if (!occupied.has(key)) return { col, row };
      }
    }
    return null;
  }

  function buildAiFormation() {
    const formation = [];
    const occupied = new Set();
    const pool = [];
    for (const t of UNIT_TYPES) {
      const n = state.ai.roster[t.id] || 0;
      for (let i = 0; i < n; i++) pool.push(t.id);
    }
    const counterId = counterTypeId(dominantTag(state.roster));
    pool.sort((a, b) => {
      if (a === counterId) return -1;
      if (b === counterId) return 1;
      return (isBacklineType(a) ? 1 : 0) - (isBacklineType(b) ? 1 : 0);
    });
    for (const typeId of pool) {
      const slot = pickAiCell(occupied, typeId);
      if (!slot) continue;
      formation.push({ typeId, col: slot.col, row: slot.row });
      occupied.add(cellKey(slot.col, slot.row));
    }
    state.aiFormation = formation;
    const ai = state.ai;
    if (ai.heroId && !ai.heroDown && ai.heroBench) {
      const slot = pickAiCell(occupied, isBacklineType(ai.heroId) ? ai.heroId : "knight");
      if (slot) {
        ai.heroPlacement = { col: slot.col, row: slot.row };
        ai.heroBench = false;
      }
    }
  }

  function autoFillPlayerBench() {
    syncBench();
    const empty = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (!formationAt(state.playerFormation, col, row)) empty.push({ col, row });
      }
    }
    for (const t of UNIT_TYPES) {
      while ((state.bench[t.id] || 0) > 0 && empty.length) {
        const idx = Math.floor(Math.random() * empty.length);
        const cell = empty.splice(idx, 1)[0];
        state.playerFormation.push({ typeId: t.id, col: cell.col, row: cell.row });
        state.bench[t.id] -= 1;
      }
    }
  }

  function placeOnGrid(typeId, col, row) {
    if (!canPlaceUnits() || !isPlayerCell(col)) return false;
    if (isHeroId(typeId)) {
      if (!state.heroId || typeId !== state.heroId || !state.heroBench || state.heroDown) return false;
      if (state.heroPlacement) return false;
      if (formationAt(state.playerFormation, col, row)) return false;
      state.heroPlacement = { col, row };
      state.heroBench = false;
      return true;
    }
    if ((state.bench[typeId] || 0) <= 0) return false;
    if (formationAt(state.playerFormation, col, row)) return false;
    if (state.heroPlacement && state.heroPlacement.col === col && state.heroPlacement.row === row) return false;
    state.playerFormation.push({ typeId, col, row });
    state.bench[typeId] -= 1;
    return true;
  }

  function removeFromGrid(col, row) {
    if (!canPlaceUnits()) return false;
    if (state.heroPlacement && state.heroPlacement.col === col && state.heroPlacement.row === row) {
      state.heroPlacement = null;
      state.heroBench = true;
      return true;
    }
    const idx = state.playerFormation.findIndex((s) => s.col === col && s.row === row);
    if (idx < 0) return false;
    const slot = state.playerFormation[idx];
    state.playerFormation.splice(idx, 1);
    state.bench[slot.typeId] = (state.bench[slot.typeId] || 0) + 1;
    return true;
  }

  function moveOnGrid(fromCol, fromRow, toCol, toRow) {
    if (!canPlaceUnits() || !isPlayerCell(toCol)) return false;
    if (state.heroPlacement && state.heroPlacement.col === fromCol && state.heroPlacement.row === fromRow) {
      if (formationAt(state.playerFormation, toCol, toRow)) return false;
      if (state.heroPlacement.col === toCol && state.heroPlacement.row === toRow) return true;
      state.heroPlacement = { col: toCol, row: toRow };
      return true;
    }
    const slot = formationAt(state.playerFormation, fromCol, fromRow);
    if (!slot) return false;
    if (state.heroPlacement && state.heroPlacement.col === toCol && state.heroPlacement.row === toRow) return false;
    if (formationAt(state.playerFormation, toCol, toRow)) return false;
    slot.col = toCol;
    slot.row = toRow;
    return true;
  }

  function swapOnGrid(aCol, aRow, bCol, bRow) {
    if (!canPlaceUnits() || !isPlayerCell(bCol)) return false;
    if (heroAt(aCol, aRow) || heroAt(bCol, bRow)) return false;
    const a = formationAt(state.playerFormation, aCol, aRow);
    const b = formationAt(state.playerFormation, bCol, bRow);
    if (!a || !b) return false;
    if (aCol === bCol && aRow === bRow) return true;
    a.col = bCol;
    a.row = bRow;
    b.col = aCol;
    b.row = aRow;
    return true;
  }

  function heroAt(col, row) {
    return !!(
      state.heroPlacement &&
      state.heroPlacement.col === col &&
      state.heroPlacement.row === row &&
      state.heroId
    );
  }

  function occupantKind(col, row) {
    if (heroAt(col, row)) return "hero";
    if (formationAt(state.playerFormation, col, row)) return "unit";
    return null;
  }

  function cellIsOccupied(col, row) {
    return !!occupantKind(col, row);
  }

  function boardSelectionValid() {
    const sel = state.selectedBoard;
    if (!sel) return false;
    return !!occupantKind(sel.col, sel.row);
  }

  function canMoveSelectedTo(col, row) {
    const sel = state.selectedBoard;
    if (!sel || !canPlaceUnits() || !isPlayerCell(col)) return false;
    if (sel.col === col && sel.row === row) return false;
    return !cellIsOccupied(col, row);
  }

  function canSwapSelectedTo(col, row) {
    const sel = state.selectedBoard;
    if (!sel || !canPlaceUnits() || !isPlayerCell(col)) return false;
    if (sel.col === col && sel.row === row) return false;
    if (heroAt(sel.col, sel.row) || heroAt(col, row)) return false;
    return !!(
      formationAt(state.playerFormation, sel.col, sel.row) &&
      formationAt(state.playerFormation, col, row)
    );
  }

  function canPlaceSelectedBenchAt(col, row) {
    if (!state.selectedBenchType || !canPlaceUnits() || !isPlayerCell(col)) return false;
    return !cellIsOccupied(col, row);
  }

  function dominantTag(roster) {
    const counts = Object.create(null);
    for (const t of UNIT_TYPES) {
      const n = roster[t.id] || 0;
      if (n <= 0) continue;
      for (const tag of t.tags) counts[tag] = (counts[tag] || 0) + n;
    }
    let best = null;
    let bestN = 0;
    for (const k in counts) {
      if (counts[k] > bestN) {
        bestN = counts[k];
        best = k;
      }
    }
    return best;
  }

  function counterTypeId(tag) {
    if (tag === "cavalry") return "spearman";
    if (tag === "infantry") return "archer";
    if (tag === "ranged") return "knight";
    if (tag === "magic" || tag === "support") return "guardian";
    if (tag === "armored") return "mage";
    if (tag === "siege") return "assassin";
    return "spearman";
  }

  function typeAccentStyle(typeId) {
    const t = unitType(typeId);
    if (!t || !t.accent) return "";
    return ` style="--type-accent:${t.accent}"`;
  }

  function isBacklineFighter(unit) {
    return unit.tags.some((tag) => BACKLINE_TAGS.has(tag));
  }

  function pickAiHeroId() {
    const tag = dominantTag(state.roster);
    if (tag === "cavalry") return "raidcaptain";
    if (tag === "armored" || tag === "infantry") return "bonesinger";
    if (tag === "ranged" || tag === "magic") return "bulwark";
    return "bulwark";
  }

  function buyEconomy(forPlayer) {
    const actor = forPlayer ? state : state.ai;
    if (state.over) return false;
    if ((actor.economy || 0) >= MAX_ECONOMY) return false;
    const cost = economyCost(actor.economy || 0);
    if (actor.gold < cost) return false;
    actor.gold -= cost;
    if (forPlayer) spendGold(cost);
    actor.economy = (actor.economy || 0) + 1;
    return true;
  }

  function buyUnit(typeId, forPlayer) {
    const actor = forPlayer ? state : state.ai;
    if (state.over) return false;
    const type = unitType(typeId);
    if (!type) return false;
    if (!forPlayer && !isUnitUnlocked(typeId)) return false;
    if (forPlayer && !isUnitUnlocked(typeId)) return false;
    if (!rosterHasRoom(actor.roster)) return false;
    const cost = unitCost(typeId, actor.roster);
    if (actor.gold < cost) return false;
    actor.gold -= cost;
    if (forPlayer) spendGold(cost);
    actor.roster[typeId] = (actor.roster[typeId] || 0) + 1;
    if (forPlayer) {
      state.unitsBought += 1;
      syncBench();
    }
    return true;
  }

  function buyHero(heroId, forPlayer) {
    const def = heroDef(heroId);
    if (!def || !heroesUnlocked()) return false;
    if (forPlayer) {
      if (state.heroId || state.gold < def.hireGold) return false;
      state.gold -= def.hireGold;
      spendGold(def.hireGold);
      state.heroId = heroId;
      state.heroDown = false;
      state.heroBench = true;
      return true;
    }
    const ai = state.ai;
    if (ai.heroId || ai.gold < def.hireGold) return false;
    ai.gold -= def.hireGold;
    ai.heroId = heroId;
    ai.heroDown = false;
    ai.heroBench = true;
    return true;
  }

  function rezHero() {
    if (!state.heroId || !state.heroDown || !canPlaceUnits()) return false;
    const def = heroDef(state.heroId);
    if (!def) return false;
    const cost = Math.floor(def.hireGold * HERO_REZ_COST_MULT);
    if (state.gold < cost) return false;
    state.gold -= cost;
    spendGold(cost);
    state.heroDown = false;
    state.heroBench = true;
    return true;
  }

  function heroRezCost() {
    const def = heroDef(state.heroId);
    if (!def) return 0;
    return Math.floor(def.hireGold * HERO_REZ_COST_MULT);
  }

  function format(n) {
    return String(Math.floor(n));
  }

  function initState() {
    return {
      gold: START_GOLD,
      economy: 0,
      roster: emptyRoster(),
      unitLevels: emptyUnitLevels(),
      towerLevel: 0,
      shopTab: "hire",
      bench: emptyRoster(),
      playerFormation: [],
      aiFormation: [],
      selectedBenchType: null,
      selectedBoard: null,
      playerCastleHp: CASTLE_HP,
      playerCastleMax: CASTLE_HP,
      round: 1,
      waveTimer: WAVE_INTERVAL_S,
      fighting: false,
      winStreak: 0,
      over: false,
      won: false,
      matchTime: 0,
      unitsBought: 0,
      roundsPlayed: 0,
      bannerText: "",
      bannerKind: "",
      lastCountdownTick: -1,
      stats: {
        playerKills: 0,
        enemyKills: 0,
        towersDestroyed: 0,
        damageDealt: 0,
      },
      ai: {
        gold: START_GOLD,
        economy: 0,
        roster: emptyRoster(),
        unitLevels: emptyUnitLevels(),
        towerLevel: 0,
        winStreak: 0,
        castleHp: CASTLE_HP,
        castleMax: CASTLE_HP,
        heroId: null,
        heroDown: false,
        heroBench: false,
        heroPlacement: null,
      },
      heroId: null,
      heroDown: false,
      heroBench: false,
      heroPlacement: null,
      towers: createTowers(),
      battle: { units: [], active: false, projectiles: [] },
      nextUnitId: 1,
    };
  }

  const el = {
    goldDisplay: document.getElementById("gold-display"),
    gpsDisplay: document.getElementById("gps-display"),
    roundDisplay: document.getElementById("round-display"),
    phaseLabel: document.getElementById("phase-label"),
    phaseTimer: document.getElementById("phase-timer"),
    phaseStatus: document.getElementById("phase-status"),
    streakPill: document.getElementById("streak-pill"),
    streakDisplay: document.getElementById("streak-display"),
    streakGps: document.getElementById("streak-gps"),
    goldPill: document.getElementById("gold-pill"),
    goldFloatLayer: document.getElementById("gold-float-layer"),
    gameTooltip: document.getElementById("game-tooltip"),
    keepPlayer: document.getElementById("keep-player"),
    keepEnemy: document.getElementById("keep-enemy"),
    playerCastleFill: document.getElementById("player-castle-fill"),
    playerCastleText: document.getElementById("player-castle-text"),
    enemyCastleFill: document.getElementById("enemy-castle-fill"),
    enemyCastleText: document.getElementById("enemy-castle-text"),
    versionLabel: document.getElementById("version-label"),
    board: document.getElementById("board"),
    boardGrid: document.getElementById("board-grid"),
    combatLayer: document.getElementById("combat-layer"),
    towerLayer: document.getElementById("tower-layer"),
    keepPlayerFill: document.getElementById("keep-player-fill"),
    keepEnemyFill: document.getElementById("keep-enemy-fill"),
    benchTray: document.getElementById("bench-tray"),
    shopBar: document.getElementById("shop-bar"),
    shopHint: document.getElementById("shop-hint"),
    shopCatTabs: document.querySelectorAll(".shop-cat-tab"),
    roundBanner: document.getElementById("round-banner"),
    benchHint: document.getElementById("bench-hint"),
    mobileNav: document.getElementById("mobile-nav"),
    helpBtn: document.getElementById("help-btn"),
    helpModal: document.getElementById("help-modal"),
    helpClose: document.getElementById("help-close"),
    musicMuteBtn: document.getElementById("music-mute-btn"),
    sfxMuteBtn: document.getElementById("sfx-mute-btn"),
    bgMusic: document.getElementById("bg-music"),
    restartBtn: document.getElementById("restart-btn"),
    endModal: document.getElementById("end-modal"),
    endTitle: document.getElementById("end-title"),
    endBody: document.getElementById("end-body"),
    endStats: document.getElementById("end-stats"),
    endRestart: document.getElementById("end-restart"),
  };

  let state = null;
  let lastNow = 0;
  let lastHud = 0;
  let lastShopSig = "";
  let lastBenchSig = "";
  let lastBoardSig = "";
  let lastTowerSig = "";
  const tokenEls = new Map();
  let gridCells = [];
  let setMobilePane = null;

  function isMobileLayout() {
    try {
      return window.matchMedia(MOBILE_MQ).matches;
    } catch (_) {
      return false;
    }
  }

  function goToBattlePaneIfMobile() {
    if (isMobileLayout() && setMobilePane) setMobilePane("battle");
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- polish: sfx, fx, tooltips ---- */
  let sfxCtx = null;
  let sfxMuted = false;
  let sfxVolume = 0.55;
  let sfxVoices = 0;
  const sfxLastPlayed = Object.create(null);
  const SFX_MAX_VOICES = 12;
  const SFX_COOLDOWN_MS = 45;

  function unlockSfx() {
    if (!sfxCtx) {
      try {
        sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) {}
    }
    if (sfxCtx && sfxCtx.state === "suspended") sfxCtx.resume();
  }

  function playSfx(name) {
    if (sfxMuted) return;
    unlockSfx();
    if (!sfxCtx) return;
    const now = performance.now();
    if (sfxLastPlayed[name] && now - sfxLastPlayed[name] < SFX_COOLDOWN_MS) return;
    if (sfxVoices >= SFX_MAX_VOICES) return;
    sfxLastPlayed[name] = now;
    sfxVoices += 1;

    const t0 = sfxCtx.currentTime;
    const master = sfxCtx.createGain();
    master.gain.value = sfxVolume;
    master.connect(sfxCtx.destination);

    function voiceDone() {
      sfxVoices = Math.max(0, sfxVoices - 1);
    }

    function tone(freq, type, dur, vol, freqEnd) {
      const osc = sfxCtx.createOscillator();
      const g = sfxCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
      osc.onended = voiceDone;
    }

    function noise(dur, vol) {
      const len = Math.floor(sfxCtx.sampleRate * dur);
      const buf = sfxCtx.createBuffer(1, len, sfxCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = sfxCtx.createBufferSource();
      src.buffer = buf;
      const g = sfxCtx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(g);
      g.connect(master);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
      src.onended = voiceDone;
    }

    switch (name) {
      case "melee":
        noise(0.07, 0.35);
        break;
      case "arrow":
        tone(900, "triangle", 0.07, 0.18, 220);
        break;
      case "magic":
        tone(520, "sine", 0.14, 0.22, 1040);
        break;
      case "heal":
        tone(640, "sine", 0.16, 0.2, 960);
        break;
      case "coin":
        tone(880, "sine", 0.09, 0.28, 1320);
        break;
      case "error":
        tone(200, "square", 0.12, 0.18, 120);
        break;
      case "death":
        tone(240, "sawtooth", 0.2, 0.22, 70);
        break;
      case "tower":
        noise(0.28, 0.42);
        tone(90, "sine", 0.25, 0.2, 50);
        break;
      case "keep":
        noise(0.35, 0.48);
        tone(70, "sine", 0.3, 0.25, 40);
        break;
      case "wave":
        tone(220, "sine", 0.12, 0.25, 330);
        tone(330, "sine", 0.18, 0.22, 440);
        break;
      case "tick":
        tone(720, "sine", 0.05, 0.14);
        break;
      case "heroDown":
        tone(320, "sawtooth", 0.35, 0.3, 90);
        break;
      case "victory":
        [523, 659, 784].forEach((f, i) => tone(f, "sine", 0.55, 0.2 - i * 0.03));
        break;
      case "defeat":
        tone(160, "sawtooth", 0.9, 0.28, 55);
        break;
      case "click":
        tone(620, "sine", 0.04, 0.12);
        break;
      default:
        tone(440, "sine", 0.06, 0.12);
        voiceDone();
    }
  }

  function initSfx() {
    const storedVol = localStorage.getItem(SFX_VOLUME_KEY);
    if (storedVol !== null && !Number.isNaN(Number(storedVol))) {
      sfxVolume = Math.max(0, Math.min(1, Number(storedVol)));
    }
    sfxMuted = localStorage.getItem(SFX_MUTED_KEY) === "1";

    function syncSfxBtn() {
      const btn = el.sfxMuteBtn;
      if (!btn) return;
      btn.setAttribute("aria-pressed", sfxMuted ? "true" : "false");
      btn.title = sfxMuted ? "Unmute sound effects" : "Mute sound effects";
      btn.textContent = sfxMuted ? "SFX Off" : "SFX";
      btn.classList.toggle("is-muted", sfxMuted);
    }

    function setSfxMuted(next) {
      sfxMuted = !!next;
      try {
        localStorage.setItem(SFX_MUTED_KEY, sfxMuted ? "1" : "0");
        localStorage.setItem(SFX_VOLUME_KEY, String(sfxVolume));
      } catch (_) {}
      syncSfxBtn();
    }

    syncSfxBtn();
    el.sfxMuteBtn?.addEventListener("click", () => {
      playSfx("click");
      setSfxMuted(!sfxMuted);
    });

    const unlock = () => unlockSfx();
    document.addEventListener("pointerdown", unlock, { passive: true });
    document.addEventListener("keydown", unlock);
  }

  function shakeScreen(level) {
    if (reducedMotion || !el.board) return;
    const cls = level === "lg" ? "shake-lg" : level === "md" ? "shake-md" : "shake-sm";
    el.board.classList.remove("shake-sm", "shake-md", "shake-lg");
    void el.board.offsetWidth;
    el.board.classList.add(cls);
    setTimeout(() => el.board.classList.remove(cls), level === "lg" ? 560 : level === "md" ? 390 : 290);
  }

  function spawnParticles(x, y, kind, count) {
    if (!el.combatLayer || reducedMotion) return;
    const n = count || 6;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "fx-particle " + kind;
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const dist = 8 + Math.random() * 14;
      p.style.left = x + "%";
      p.style.top = y + "%";
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      if (kind === "confetti") {
        p.style.background = ["#ffd060", "#60a0ff", "#ff6060", "#60ff90"][i % 4];
      }
      el.combatLayer.appendChild(p);
      setTimeout(() => p.remove(), 620);
    }
  }

  function spawnSplashRing(x, y, style) {
    if (!el.combatLayer || reducedMotion) return;
    const ring = document.createElement("div");
    ring.className = "fx-splash-ring" + (style === "arcane" ? " arcane" : "");
    ring.style.left = x + "%";
    ring.style.top = y + "%";
    el.combatLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 480);
  }

  function spawnSanctuaryRing(x, y) {
    if (!el.combatLayer || reducedMotion) return;
    const ring = document.createElement("div");
    ring.className = "fx-sanctuary";
    ring.style.left = x + "%";
    ring.style.top = y + "%";
    el.combatLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 620);
  }

  function spawnGoldSpend(amount) {
    if (!el.goldPill || !el.goldFloatLayer) return;
    const rect = el.goldPill.getBoundingClientRect();
    const d = document.createElement("div");
    d.className = "gold-spend";
    d.textContent = "−" + Math.floor(amount) + "g";
    d.style.left = rect.left + rect.width * 0.55 + "px";
    d.style.top = rect.top + "px";
    el.goldFloatLayer.appendChild(d);
    setTimeout(() => d.remove(), 780);
  }

  function shakeGoldPill() {
    if (!el.goldPill) return;
    el.goldPill.classList.remove("gold-shake");
    void el.goldPill.offsetWidth;
    el.goldPill.classList.add("gold-shake");
    setTimeout(() => el.goldPill.classList.remove("gold-shake"), 360);
  }

  function spendGold(amount) {
    if (amount > 0) spawnGoldSpend(amount);
    playSfx("coin");
  }

  function recordKill(attackerSide) {
    if (!state.stats) return;
    if (attackerSide === "player") state.stats.playerKills += 1;
    else state.stats.enemyKills += 1;
  }

  function recordDamage(amount, side) {
    if (!state.stats || side !== "player") return;
    state.stats.damageDealt += amount;
  }

  function loadBestRecord() {
    try {
      const raw = localStorage.getItem(BEST_RECORD_KEY);
      return raw ? JSON.parse(raw) : { fastestWin: null, highestWave: 0 };
    } catch (_) {
      return { fastestWin: null, highestWave: 0 };
    }
  }

  function saveBestRecord(won) {
    const best = loadBestRecord();
    if (won) {
      const t = Math.floor(state.matchTime);
      if (best.fastestWin == null || t < best.fastestWin) best.fastestWin = t;
    }
    if (state.roundsPlayed > (best.highestWave || 0)) best.highestWave = state.roundsPlayed;
    try {
      localStorage.setItem(BEST_RECORD_KEY, JSON.stringify(best));
    } catch (_) {}
    return best;
  }

  function tagLabel(tag) {
    const map = {
      infantry: "Infantry",
      cavalry: "Cavalry",
      ranged: "Ranged",
      magic: "Magic",
      support: "Support",
      armored: "Armored",
      siege: "Siege",
    };
    return map[tag] || tag;
  }

  function unitTooltipHtml(def, opts) {
    if (!def) return "";
    opts = opts || {};
    const level = opts.level || 0;
    const isHero = !!opts.hero;
    const stats = isHero ? def : unitStatsAtLevel(def, level);
    const hp = isHero ? def.hp : stats.hp;
    const atk = isHero ? def.atk : stats.atk;
    let html = `<div class="tt-name">${def.name}</div>`;
    html += `<div class="tt-stats">`;
    html += `<span>HP ${hp}</span><span>ATK ${atk}</span>`;
    html += `<span>RNG ${def.range || 6}</span><span>SPD ${def.spd}</span>`;
    if (def.armor) html += `<span>ARM ${def.armor}</span>`;
    html += `</div>`;
    if (def.strongVs && def.strongVs.length) {
      html += `<div class="tt-row"><span class="tt-good">Strong</span> vs ${def.strongVs.map(tagLabel).join(", ")}</div>`;
    }
    if (def.weakVs && def.weakVs.length) {
      html += `<div class="tt-row"><span class="tt-bad">Weak</span> vs ${def.weakVs.map(tagLabel).join(", ")}</div>`;
    }
    if (def.blurb) html += `<div class="tt-ability">${def.blurb}</div>`;
    if (level > 0) html += `<div class="tt-row">Research +${level}</div>`;
    return html;
  }

  let tooltipTarget = null;
  let longPressTimer = null;
  let suppressTooltipClick = false;

  function hoverTooltipsEnabled() {
    try {
      return window.matchMedia(HOVER_TOOLTIP_MQ).matches;
    } catch (_) {
      return true;
    }
  }

  function nodeInside(root, node) {
    return !!(root && node && (root === node || (root.contains && root.contains(node))));
  }

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function positionTooltip(target) {
    if (!el.gameTooltip || !target) return;
    const rect = target.getBoundingClientRect();
    const tt = el.gameTooltip;
    const margin = 8;
    let left = rect.left + rect.width / 2 - tt.offsetWidth / 2;
    let top = rect.top - tt.offsetHeight - margin;
    if (top < margin) top = rect.bottom + margin;
    left = Math.max(margin, Math.min(window.innerWidth - tt.offsetWidth - margin, left));
    tt.style.left = left + "px";
    tt.style.top = top + "px";
  }

  function showTooltip(target, html) {
    if (!el.gameTooltip || !html) return;
    tooltipTarget = target;
    el.gameTooltip.innerHTML = html;
    el.gameTooltip.hidden = false;
    positionTooltip(target);
  }

  function hideTooltip() {
    clearLongPress();
    tooltipTarget = null;
    if (el.gameTooltip) el.gameTooltip.hidden = true;
  }

  function hideTooltipIfIn(root) {
    if (tooltipTarget && root && root.contains(tooltipTarget)) hideTooltip();
  }

  function bindTooltipDelegation(root, selector, getHtml) {
    if (!root) return;

    root.addEventListener("pointerover", (e) => {
      if (!hoverTooltipsEnabled()) return;
      if (e.pointerType === "touch") return;
      const card = e.target.closest(selector);
      if (!card) return;
      if (nodeInside(card, e.relatedTarget)) return;
      const html = getHtml(card);
      if (html) showTooltip(card, html);
    });
    root.addEventListener("pointerout", (e) => {
      if (!hoverTooltipsEnabled()) return;
      const card = e.target.closest(selector);
      if (!card || tooltipTarget !== card) return;
      if (nodeInside(card, e.relatedTarget)) return;
      hideTooltip();
    });

    root.addEventListener("pointerdown", (e) => {
      if (hoverTooltipsEnabled() && e.pointerType !== "touch") return;
      const card = e.target.closest(selector);
      if (!card) return;
      clearLongPress();
      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        if (!card.isConnected) return;
        const html = getHtml(card);
        if (!html) return;
        suppressTooltipClick = true;
        showTooltip(card, html);
      }, LONG_PRESS_MS);
      const cancelOnMove = (mv) => {
        if (mv.pointerId !== pointerId) return;
        if (Math.hypot(mv.clientX - startX, mv.clientY - startY) < 12) return;
        clearLongPress();
        root.removeEventListener("pointermove", cancelOnMove);
      };
      root.addEventListener("pointermove", cancelOnMove);
      const endPress = (up) => {
        if (up.pointerId !== pointerId) return;
        clearLongPress();
        root.removeEventListener("pointermove", cancelOnMove);
        root.removeEventListener("pointerup", endPress);
        root.removeEventListener("pointercancel", endPress);
      };
      root.addEventListener("pointerup", endPress);
      root.addEventListener("pointercancel", endPress);
    });

    root.addEventListener(
      "click",
      (e) => {
        if (!suppressTooltipClick) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        suppressTooltipClick = false;
      },
      true
    );

    root.addEventListener("scroll", hideTooltip, { passive: true });
  }

  function spawnFinaleParticles(won) {
    if (reducedMotion) return;
    const colors = won ? ["ember", "confetti", "spark"] : ["dust", "debris"];
    for (let i = 0; i < 24; i++) {
      const x = 15 + Math.random() * 70;
      const y = 20 + Math.random() * 50;
      spawnParticles(x, y, colors[i % colors.length], 1);
    }
  }

  function showBanner(text, kind) {
    state.bannerText = text;
    state.bannerKind = kind || "";
    if (!el.roundBanner) return;
    el.roundBanner.hidden = false;
    el.roundBanner.textContent = text;
    el.roundBanner.className = "round-banner" + (kind ? " " + kind : "");
  }

  function hideBannerSoon(delay) {
    setTimeout(() => {
      if (!el.roundBanner) return;
      el.roundBanner.hidden = true;
      state.bannerText = "";
    }, delay || 2000);
  }

  function renderCastles() {
    const pPct = (state.playerCastleHp / state.playerCastleMax) * 100;
    const ePct = (state.ai.castleHp / state.ai.castleMax) * 100;
    if (el.playerCastleFill) {
      el.playerCastleFill.style.width = pPct + "%";
      el.playerCastleFill.classList.toggle("low", pPct <= 35);
    }
    if (el.enemyCastleFill) {
      el.enemyCastleFill.style.width = ePct + "%";
      el.enemyCastleFill.classList.toggle("low", ePct <= 35);
    }
    if (el.playerCastleText) el.playerCastleText.textContent = String(Math.ceil(state.playerCastleHp));
    if (el.enemyCastleText) el.enemyCastleText.textContent = String(Math.ceil(state.ai.castleHp));
    if (el.keepPlayerFill) el.keepPlayerFill.style.width = pPct + "%";
    if (el.keepEnemyFill) el.keepEnemyFill.style.width = ePct + "%";
    if (el.keepPlayer) el.keepPlayer.classList.toggle("is-distressed", pPct <= 35 && pPct > 0);
    if (el.keepEnemy) el.keepEnemy.classList.toggle("is-distressed", ePct <= 35 && ePct > 0);
  }

  function renderTopbar() {
    if (el.goldDisplay) el.goldDisplay.textContent = format(state.gold);
    if (el.gpsDisplay) {
      const gps = gpsFor(state);
      el.gpsDisplay.textContent = "+" + gps.toFixed(1) + "/s";
    }
    if (el.roundDisplay) el.roundDisplay.textContent = String(Math.max(1, state.round));
    if (el.versionLabel) el.versionLabel.textContent = "v" + GAME_VERSION;
    if (el.phaseLabel) {
      el.phaseLabel.textContent = state.fighting ? "Next wave" : "First wave";
    }
    if (el.phaseTimer) {
      const secs = Math.ceil(state.waveTimer);
      el.phaseTimer.textContent = secs + "s";
      const urgent = !state.over && state.waveTimer > 0 && state.waveTimer <= TIMER_URGENT_S;
      el.phaseTimer.classList.toggle("is-urgent", urgent);
      if (urgent && state.lastCountdownTick !== secs) {
        state.lastCountdownTick = secs;
        playSfx("tick");
      }
      if (!urgent) state.lastCountdownTick = -1;
    }
    if (el.streakPill) {
      const streak = state.winStreak || 0;
      el.streakPill.hidden = streak <= 0;
      if (el.streakDisplay) el.streakDisplay.textContent = String(streak);
      if (el.streakGps) el.streakGps.textContent = (streak * STREAK_GPS).toFixed(1);
    }
    if (el.board) {
      el.board.classList.toggle("is-fighting", !!state.fighting);
      el.board.classList.toggle("placement-locked", !canPlaceUnits());
      el.board.classList.toggle(
        "is-placing",
        !!(state.selectedBenchType || state.selectedBoard) && canPlaceUnits()
      );
    }
    renderCastles();
  }

  function renderShop() {
    if (!el.shopBar) return;
    const sig =
      Math.floor(state.gold) +
      "|" +
      state.economy +
      "|" +
      state.round +
      "|" +
      (state.heroId || "") +
      "|" +
      (state.heroDown ? "d" : "") +
      "|" +
      rosterTotal(state.roster) +
      "|" +
      UNIT_TYPES.map((t) => state.roster[t.id]).join(",") +
      "|" +
      UNIT_TYPES.map((t) => (state.unitLevels && state.unitLevels[t.id]) || 0).join(",") +
      "|" +
      (state.towerLevel || 0) +
      "|" +
      (state.shopTab || "hire");
    if (sig === lastShopSig) {
      renderShopTabs();
      return;
    }
    lastShopSig = sig;
    renderShopTabs();
    if ((state.shopTab || "hire") === "research") {
      renderResearchShop();
      return;
    }
    const prep = !state.over;
    const econCost = economyCost(state.economy || 0);
    const canEcon =
      prep && (state.economy || 0) < MAX_ECONOMY && state.gold >= econCost;
    let html =
      `<button type="button" class="shop-card economy-card ${canEcon ? "affordable" : ""}" data-shop="economy" ${canEcon ? "" : "disabled"}>` +
      `<span class="shop-art">⚙</span>` +
      `<span class="shop-name">Economy</span>` +
      `<span class="shop-cost">${format(econCost)}g</span>` +
      `<span class="shop-owned">Lv ${state.economy || 0} · +${ECONOMY_GPS}/s</span>` +
      `</button>`;
    for (const t of UNIT_TYPES) {
      const unlocked = isUnitUnlocked(t.id);
      const accent = typeAccentStyle(t.id);
      if (!unlocked) {
        html +=
          `<button type="button" class="shop-card is-locked" data-shop="unit" data-type="${t.id}"${accent} disabled>` +
          `<span class="shop-art">${unitArt(t.id)}</span>` +
          `<span class="shop-name">${t.name}</span>` +
          `<span class="shop-cost">Wave ${t.unlockRound}</span>` +
          `<span class="shop-owned">Locked</span>` +
          `</button>`;
        continue;
      }
      const cost = unitCost(t.id, state.roster);
      const owned = state.roster[t.id] || 0;
      const tech = unitLevelFor(state, t.id);
      const ownedLine =
        tech > 0 ? `Owned ×${owned} · +${tech}` : `Owned ×${owned}`;
      const can =
        prep && rosterHasRoom(state.roster) && state.gold >= cost;
      html +=
        `<button type="button" class="shop-card ${can ? "affordable" : ""}" data-shop="unit" data-type="${t.id}"${accent} ${can ? "" : "disabled"}>` +
        `<span class="shop-art">${unitArt(t.id)}</span>` +
        `<span class="shop-name">${t.name}</span>` +
        `<span class="shop-cost">${format(cost)}g</span>` +
        `<span class="shop-owned">${ownedLine}</span>` +
        `<span class="shop-blurb">${t.blurb}</span>` +
        `</button>`;
    }
    if (heroesUnlocked() && !state.heroId) {
      for (const h of HEROES) {
        const can = prep && state.gold >= h.hireGold;
        html +=
          `<button type="button" class="shop-card hero-card ${can ? "affordable" : ""}" data-shop="hero" data-hero-id="${h.id}" ${can ? "" : "disabled"}>` +
          `<span class="shop-art">${unitArt(h.id)}</span>` +
          `<span class="shop-name">${h.name}</span>` +
          `<span class="shop-cost">${format(h.hireGold)}g</span>` +
          `<span class="shop-blurb">${h.blurb}</span>` +
          `</button>`;
      }
    }
    if (state.heroId && state.heroDown && canPlaceUnits()) {
      const rez = heroRezCost();
      const canRez = prep && state.gold >= rez;
      const def = heroDef(state.heroId);
      html +=
        `<button type="button" class="shop-card hero-rez ${canRez ? "affordable" : ""}" data-shop="rez" ${canRez ? "" : "disabled"}>` +
        `<span class="shop-art">${unitArt(state.heroId)}</span>` +
        `<span class="shop-name">Rez ${def ? def.name : "Hero"}</span>` +
        `<span class="shop-cost">${format(rez)}g</span>` +
        `</button>`;
    }
    hideTooltipIfIn(el.shopBar);
    el.shopBar.innerHTML = html;
  }

  function researchAffordable() {
    if (state.over) return false;
    for (const t of UNIT_TYPES) {
      if (canBuyUnitUpgrade(state, t.id)) return true;
    }
    return canBuyTowerUpgrade(state);
  }

  function renderShopTabs() {
    const tab = state.shopTab || "hire";
    const hasResearch = researchAffordable();
    for (const btn of el.shopCatTabs || []) {
      const isActive = btn.dataset.shopTab === tab;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      if (btn.dataset.shopTab === "research") {
        btn.classList.toggle("has-available", hasResearch && tab !== "research");
        const badge = btn.querySelector(".shop-cat-badge");
        if (badge) {
          badge.hidden = !hasResearch;
          badge.textContent = "!";
        }
      }
    }
    const hireTab = document.getElementById("shop-tab-hire");
    const researchTab = document.getElementById("shop-tab-research");
    if (hireTab) hireTab.setAttribute("aria-controls", "shop-bar");
    if (researchTab) researchTab.setAttribute("aria-controls", "shop-bar");
    if (el.shopBar) {
      el.shopBar.setAttribute(
        "aria-labelledby",
        tab === "research" ? "shop-tab-research" : "shop-tab-hire"
      );
    }
  }

  function renderResearchShop() {
    const prep = !state.over;
    let html = "";
    const towerLvl = state.towerLevel || 0;
    const towerMaxed = towerLvl >= MAX_TOWER_RESEARCH;
    const towerCost = towerUpgradeCost(towerLvl);
    const canTower = prep && !towerMaxed && state.gold >= towerCost;
    html +=
      `<button type="button" class="shop-card tower-card ${canTower ? "affordable" : ""}" data-shop="towers" ${canTower ? "" : "disabled"}>` +
      `<span class="shop-art">🏰</span>` +
      `<span class="shop-name">Towers</span>` +
      `<span class="shop-cost">${towerMaxed ? "MAX" : format(towerCost) + "g"}</span>` +
      `<span class="shop-owned">Lv ${towerLvl} · +${TOWER_RESEARCH_HP} HP / +${TOWER_RESEARCH_ATK} ATK</span>` +
      `<span class="shop-blurb">+${TOWER_RESEARCH_RANGE} range per level</span>` +
      `</button>`;
    for (const t of UNIT_TYPES) {
      if ((state.roster[t.id] || 0) < 1) continue;
      if (!isUnitUnlocked(t.id)) continue;
      const lvl = unitLevelFor(state, t.id);
      const maxed = lvl >= MAX_UNIT_RESEARCH;
      const cost = unitUpgradeCost(t.id, lvl);
      const can = prep && !maxed && state.gold >= cost;
      const accent = typeAccentStyle(t.id);
      html +=
        `<button type="button" class="shop-card research-card ${can ? "affordable" : ""}" data-shop="upgrade" data-type="${t.id}"${accent} ${can ? "" : "disabled"}>` +
        `<span class="shop-art">${unitArt(t.id)}</span>` +
        `<span class="shop-name">${t.name}</span>` +
        `<span class="shop-cost">${maxed ? "MAX" : format(cost) + "g"}</span>` +
        `<span class="shop-owned">Lv ${lvl} · +16% HP / +14% ATK</span>` +
        `<span class="shop-blurb">${t.blurb}</span>` +
        `</button>`;
    }
    if (!html) {
      html =
        '<p class="shop-empty">Buy units on Hire, then research them here.</p>';
    }
    hideTooltipIfIn(el.shopBar);
    el.shopBar.innerHTML = html;
  }

  function renderShopHint() {
    if (!el.shopHint) return;
    const n = rosterTotal(state.roster);
    const cap = rosterCap();
    if (cap >= ROSTER_MAX) {
      el.shopHint.textContent = "Army " + n + "/" + cap;
    } else if (n >= cap) {
      el.shopHint.textContent = "Army " + n + "/" + cap + " · +1 slot next wave";
    } else {
      el.shopHint.textContent = "Army " + n + "/" + cap + " · cap grows each wave";
    }
  }

  function renderBench() {
    if (!el.benchTray) return;
    syncBench();
    const sig =
      (state.selectedBenchType || "") +
      "|" +
      (state.heroBench ? state.heroId : "") +
      "|" +
      UNIT_TYPES.map((t) => state.bench[t.id]).join(",");
    if (sig === lastBenchSig) return;
    lastBenchSig = sig;
    if (state.over) {
      hideTooltipIfIn(el.benchTray);
      el.benchTray.innerHTML = "";
      return;
    }
    const parts = [];
    if (state.heroId && state.heroBench && !state.heroDown) {
      const def = heroDef(state.heroId);
      const sel = state.selectedBenchType === state.heroId ? " is-selected" : "";
      parts.push(
        `<button type="button" class="bench-chip hero-chip${sel}" data-type="${state.heroId}" data-source="bench">` +
          `<span class="chip-art">${unitArt(state.heroId)}</span>` +
          `<span class="chip-name">${def ? def.name : "Hero"}</span>` +
          `<span class="chip-count">★</span>` +
          `</button>`
      );
    }
    for (const t of UNIT_TYPES) {
      const n = state.bench[t.id] || 0;
      if (n <= 0) continue;
      const sel = state.selectedBenchType === t.id ? " is-selected" : "";
      parts.push(
        `<button type="button" class="bench-chip${sel}" data-type="${t.id}" data-source="bench"${typeAccentStyle(t.id)}>` +
          `<span class="chip-art">${unitArt(t.id)}</span>` +
          `<span class="chip-name">${t.name}</span>` +
          `<span class="chip-count">×${n}</span>` +
          `</button>`
      );
    }
    hideTooltipIfIn(el.benchTray);
    el.benchTray.innerHTML = parts.join("");
  }

  function initBoardGrid() {
    if (!el.boardGrid || el.boardGrid.dataset.ready) return;
    el.boardGrid.dataset.ready = "1";
    el.boardGrid.innerHTML = "";
    gridCells = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "board-cell player-zone";
        cell.dataset.col = String(col);
        cell.dataset.row = String(row);
        cell.setAttribute(
          "aria-label",
          "Spawn " + (col + 1) + " row " + (row + 1)
        );
        el.boardGrid.appendChild(cell);
        gridCells.push(cell);
      }
    }
  }

  function renderTowers() {
    if (!el.towerLayer) return;
    const sig = (state.towers || [])
      .map((t) => t.id + ":" + Math.ceil(t.hp) + ":" + t.maxHp + ":" + t.atk)
      .join("|");
    if (sig === lastTowerSig) return;
    lastTowerSig = sig;
    el.towerLayer.innerHTML = (state.towers || [])
      .map((t) => {
        const pct = t.maxHp > 0 ? (Math.max(0, t.hp) / t.maxHp) * 100 : 0;
        const hpClass =
          t.hp <= 0 ? "critical" : pct <= 30 ? "critical" : pct <= 55 ? "low" : "";
        return (
          `<div class="tower ${t.side}${t.hp <= 0 ? " destroyed" : ""}" style="left:${t.x}%;top:${t.y}%">` +
          `<div class="tower-art"></div>` +
          `<div class="tower-hp"><div class="tower-hp-fill ${hpClass}" style="width:${pct}%"></div></div>` +
          `</div>`
        );
      })
      .join("");
  }

  function renderBoard() {
    if (!el.boardGrid) return;
    const heroSig = state.heroPlacement
      ? state.heroPlacement.col + "," + state.heroPlacement.row + "," + state.heroId
      : "";
    const sig =
      state.playerFormation
        .map((s) => s.col + "," + s.row + "," + s.typeId)
        .join(";") +
      "|" +
      heroSig;
    if (sig !== lastBoardSig) {
      lastBoardSig = sig;
      for (const cell of gridCells) {
        const col = +cell.dataset.col;
        const row = +cell.dataset.row;
        cell.innerHTML = "";
        if (state.over) continue;
        if (heroAt(col, row)) {
          const token = document.createElement("div");
          token.className = "board-token is-hero";
          token.dataset.type = state.heroId;
          token.dataset.col = String(col);
          token.dataset.row = String(row);
          token.dataset.source = "hero-cell";
          token.innerHTML = `<div class="board-sil">${unitArt(state.heroId)}</div>`;
          cell.appendChild(token);
          continue;
        }
        const slot = formationAt(state.playerFormation, col, row);
        if (!slot) continue;
        const token = document.createElement("div");
        token.className = "board-token";
        token.dataset.type = slot.typeId;
        const tdef = unitType(slot.typeId);
        if (tdef && tdef.accent) token.style.setProperty("--type-accent", tdef.accent);
        token.dataset.col = String(col);
        token.dataset.row = String(row);
        token.dataset.source = "cell";
        token.innerHTML = `<div class="board-sil">${unitArt(slot.typeId)}</div>`;
        cell.appendChild(token);
      }
    }
    if (!boardSelectionValid()) state.selectedBoard = null;
    paintBoardHighlights();
    renderPlacementHint();
  }

  function paintBoardHighlights() {
    for (const cell of gridCells) {
      const col = +cell.dataset.col;
      const row = +cell.dataset.row;
      const token = cell.querySelector(".board-token");
      let origin = false;
      let move = false;
      let swap = false;
      if (!state.over && canPlaceUnits()) {
        if (
          state.selectedBoard &&
          state.selectedBoard.col === col &&
          state.selectedBoard.row === row
        ) {
          origin = true;
        } else if (state.selectedBoard && canSwapSelectedTo(col, row)) {
          swap = true;
        } else if (state.selectedBoard && canMoveSelectedTo(col, row)) {
          move = true;
        } else if (!state.selectedBoard && canPlaceSelectedBenchAt(col, row)) {
          move = true;
        }
      }
      cell.classList.toggle("is-origin", origin);
      cell.classList.toggle("move-target", move);
      cell.classList.toggle("swap-target", swap);
      cell.classList.toggle("drop-target", false);
      cell.classList.toggle("selected-target", false);
      if (token) token.classList.toggle("is-selected", origin);
    }
  }

  function renderPlacementHint() {
    if (!el.benchHint) return;
    if (state.over) {
      el.benchHint.textContent = "Match over";
    } else if (!canPlaceUnits()) {
      el.benchHint.textContent = "Wave deploying — placement unlocks with the next countdown";
    } else if (state.selectedBoard) {
      el.benchHint.textContent =
        "Click a highlighted tile to move · click the barracks to return";
    } else if (state.selectedBenchType) {
      const def = isHeroId(state.selectedBenchType)
        ? heroDef(state.selectedBenchType)
        : unitType(state.selectedBenchType);
      const name = def && def.name ? def.name : "unit";
      el.benchHint.textContent = "Tap a glowing spawn tile to place " + name;
    } else {
      el.benchHint.textContent =
        "Select a barracks unit or a placed unit, then click a tile";
    }
  }

  function renderHud() {
    renderTopbar();
    renderShop();
    renderShopHint();
    renderBench();
    renderBoard();
    renderTowers();
  }

  function startCountdown(announce) {
    state.waveTimer = WAVE_INTERVAL_S;
    pruneDeadUnits();
    syncBench();
    buildAiFormation();
    lastShopSig = "";
    lastBenchSig = "";
    lastBoardSig = "";
    if (announce !== false) {
      const held = livingUnits().length;
      showBanner(
        "Wave " +
          state.round +
          " in " +
          WAVE_INTERVAL_S +
          "s" +
          (held ? " · " + held + " still fighting" : ""),
        ""
      );
      hideBannerSoon(1600);
    }
    renderHud();
  }

  function clearCombatLayer() {
    tokenEls.clear();
    if (el.combatLayer) el.combatLayer.innerHTML = "";
  }

  function pruneDeadUnits() {
    if (!state.battle) return;
    const now = Date.now();
    state.battle.units = state.battle.units.filter((u) => {
      if (u.hp > 0) return true;
      const node = getTokenEl(u.id);
      if (node) {
        tokenEls.delete(u.id);
        node.remove();
      }
      return u.removeAt && now < u.removeAt;
    });
    for (const u of state.battle.units) {
      if (u.hp > 0 && !getTokenEl(u.id)) mountCombatToken(u);
    }
  }

  function initCombatRuntime(u, type) {
    u.stunT = 0;
    u.slowT = 0;
    u.aegisT = 0;
    u.tauntActive = false;
    u.targetId = null;
    u.chargeDist = 0;
    u.chargeReady = false;
    u.shots = 0;
    u.abilityCd = 0;
    u.moveAccum = 0;
    u.ability = type && type.ability || null;
    u.hero = false;
    u.minion = false;
    u.facing = u.side === "player" ? 1 : -1;
  }

  function createCombatUnit(side, typeId, col, row, opts) {
    opts = opts || {};
    const type = opts.hero ? heroDef(typeId) : unitType(typeId);
    if (!type) return null;
    const pos = cellToPercent(col, row, side);
    const prefix = side === "player" ? "p" : "e";
    let hp = type.hp;
    let atk = type.atk;
    let researchLevel = 0;
    if (!opts.hero && !opts.minion) {
      const actor = actorForSide(side);
      researchLevel = unitLevelFor(actor, typeId);
      const stats = unitStatsAtLevel(type, researchLevel);
      hp = stats.hp;
      atk = stats.atk;
    }
    const u = {
      id: prefix + state.nextUnitId++,
      side,
      typeId: type.id,
      name: type.name,
      hp,
      maxHp: hp,
      atk,
      armor: type.armor || 0,
      spd: type.spd,
      atkCdMax: type.atkCd,
      range: type.range || MELEE_RANGE,
      atkStyle: type.atkStyle || "melee",
      tags: (type.tags || []).slice(),
      strongVs: (type.strongVs || []).slice(),
      weakVs: (type.weakVs || []).slice(),
      splash: type.splash || 0,
      structureMult: type.structureMult || 1,
      targetPriority: type.targetPriority || null,
      researchLevel,
      col,
      row,
      x: pos.x,
      y: pos.y,
      homeY: pos.y,
      attackCd: 0,
    };
    initCombatRuntime(u, type);
    if (opts.hero) u.hero = true;
    if (opts.minion) u.minion = true;
    return u;
  }

  function createBoneMinion(side) {
    if (fieldCount(side) >= FIELD_SOFT_CAP) return null;
    const col = Math.floor(Math.random() * GRID_COLS);
    const row = Math.floor(Math.random() * GRID_ROWS);
    const u = createCombatUnit(side, BONE_MINION.id, col, row, { minion: true });
    if (!u) return null;
    u.typeId = BONE_MINION.id;
    u.name = BONE_MINION.name;
    u.hp = BONE_MINION.hp;
    u.maxHp = BONE_MINION.hp;
    u.atk = BONE_MINION.atk;
    u.armor = BONE_MINION.armor;
    u.spd = BONE_MINION.spd;
    u.atkCdMax = BONE_MINION.atkCd;
    u.range = BONE_MINION.range;
    u.atkStyle = BONE_MINION.atkStyle;
    u.tags = BONE_MINION.tags.slice();
    u.strongVs = BONE_MINION.strongVs.slice();
    u.weakVs = BONE_MINION.weakVs.slice();
    u.ability = null;
    state.battle.units.push(u);
    mountCombatToken(u);
    return u;
  }

  function countBoneMinions(side) {
    return state.battle.units.filter(
      (u) => u.side === side && u.minion && u.hp > 0
    ).length;
  }

  function livingHero(side) {
    for (const u of state.battle.units) {
      if (u.side === side && u.hero && u.hp > 0) return u;
    }
    return null;
  }

  function fieldCount(side) {
    return state.battle.units.filter((u) => u.hp > 0 && u.side === side).length;
  }

  function spawnWaveUnits() {
    const add = (side, slots) => {
      for (const slot of slots) {
        if (fieldCount(side) >= FIELD_SOFT_CAP) break;
        const u = createCombatUnit(side, slot.typeId, slot.col, slot.row);
        if (!u) continue;
        state.battle.units.push(u);
        mountCombatToken(u);
      }
    };
    add("player", state.playerFormation);
    add("enemy", state.aiFormation);
    if (state.heroId && !state.heroDown && state.heroPlacement) {
      if (fieldCount("player") < FIELD_SOFT_CAP) {
        const hu = createCombatUnit(
          "player",
          state.heroId,
          state.heroPlacement.col,
          state.heroPlacement.row,
          { hero: true }
        );
        if (hu) {
          state.battle.units.push(hu);
          mountCombatToken(hu);
        }
      }
    }
    const ai = state.ai;
    if (ai.heroId && !ai.heroDown && ai.heroPlacement) {
      if (fieldCount("enemy") < FIELD_SOFT_CAP) {
        const hu = createCombatUnit(
          "enemy",
          ai.heroId,
          ai.heroPlacement.col,
          ai.heroPlacement.row,
          { hero: true }
        );
        if (hu) {
          state.battle.units.push(hu);
          mountCombatToken(hu);
        }
      }
    }
    state.battle.active = true;
  }

  function livingUnits(side) {
    return state.battle.units.filter((u) => u.hp > 0 && (!side || u.side === side));
  }

  function updateStreak() {
    const pN = livingUnits("player").length;
    const eN = livingUnits("enemy").length;
    if (pN > eN) {
      state.winStreak += 1;
      state.ai.winStreak = 0;
    } else if (eN > pN) {
      state.winStreak = 0;
      state.ai.winStreak += 1;
    }
  }

  function deployWave() {
    if (state.over || state.waveTimer > 0) return;
    autoFillPlayerBench();
    buildAiFormation();
    const sent = state.round;
    spawnWaveUnits();
    state.selectedBoard = null;
    state.fighting = true;
    state.roundsPlayed += 1;
    updateStreak();
    playSfx("wave");
    showBanner("Wave " + sent + " marches — next wave in " + WAVE_INTERVAL_S + "s", "");
    hideBannerSoon(1400);
    state.round += 1;
    startCountdown(false);
  }

  function checkKeeps() {
    if (state.over) return;
    if (state.playerCastleHp <= 0) endMatch(false);
    else if (state.ai.castleHp <= 0) endMatch(true);
  }

  function endMatch(won) {
    state.over = true;
    state.won = won;
    const best = saveBestRecord(won);
    playSfx(won ? "victory" : "defeat");
    shakeScreen("lg");
    spawnFinaleParticles(won);
    if (el.endTitle) el.endTitle.textContent = won ? "Victory" : "Defeat";
    if (el.endBody) {
      el.endBody.textContent = won
        ? "The enemy castle is destroyed. Well fought."
        : "Your castle has fallen. Try a new strategy.";
    }
    if (el.endStats) {
      const researched = UNIT_TYPES.filter(
        (t) => unitLevelFor(state, t.id) > 0
      )
        .map((t) => `${t.name} +${unitLevelFor(state, t.id)}`)
        .join(", ");
      const stats = state.stats || {};
      el.endStats.innerHTML =
        `<li>Rounds played: <strong>${state.roundsPlayed}</strong></li>` +
        `<li>Units purchased: <strong>${state.unitsBought}</strong></li>` +
        `<li>Enemy units slain: <strong>${stats.playerKills || 0}</strong></li>` +
        `<li>Towers destroyed: <strong>${stats.towersDestroyed || 0}</strong></li>` +
        `<li>Damage dealt: <strong>${stats.damageDealt || 0}</strong></li>` +
        `<li>Economy level: <strong>${state.economy}</strong></li>` +
        `<li>Tower research: <strong>Lv ${state.towerLevel || 0}</strong></li>` +
        (researched
          ? `<li>Unit research: <strong>${researched}</strong></li>`
          : "") +
        `<li>Match time: <strong>${Math.floor(state.matchTime)}s</strong></li>` +
        `<li class="end-best">Best fastest win: <strong>${best.fastestWin != null ? best.fastestWin + "s" : "—"}</strong> · Highest wave: <strong>${best.highestWave || 0}</strong></li>`;
    }
    if (el.endModal) {
      el.endModal.hidden = false;
      el.endModal.setAttribute("aria-hidden", "false");
      el.endModal.classList.remove("victory-finale", "defeat-finale");
      el.endModal.classList.add(won ? "victory-finale" : "defeat-finale");
      document.body.classList.add("modal-open");
    }
  }

  function tickWaveTimer(dt) {
    if (state.over) return;
    state.waveTimer = Math.max(0, state.waveTimer - dt);
    if (state.waveTimer <= 0) deployWave();
  }

    /* ---- combat engine ---- */
  function counterMult(attacker, defender) {
    if (!attacker || !defender) return 1;
    const defTags = defender.tags || [];
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

  function livingHeroId(side) {
    if (!livingHero(side)) return null;
    return side === "player" ? state.heroId : state.ai.heroId;
  }

  function auraDamageMult(attacker) {
    if (!attacker || attacker.hero || attacker.minion) return 1;
    const heroId = livingHeroId(attacker.side);
    if (!heroId) return 1;
    const tags = attacker.tags || [];
    if (heroId === "bulwark") {
      if (tags.indexOf("ranged") !== -1 || tags.indexOf("magic") !== -1) return 1.2;
    } else if (heroId === "bonesinger") {
      if (!isRangedStyle(attacker.atkStyle)) return 1.15;
    } else if (heroId === "raidcaptain") {
      if (tags.indexOf("cavalry") !== -1) return 1.2;
    }
    return 1;
  }

  function auraSpeedMult(unit) {
    if (!unit || unit.side !== "player") return 1;
    if (livingHeroId("player") === "raidcaptain") return 1.12;
    return 1;
  }

  function dealDamage(attacker, defender, bonusMult) {
    bonusMult = bonusMult || 1;
    let mult = counterMult(attacker, defender) * bonusMult * auraDamageMult(attacker);
    if (defender.aegisT > 0 && attacker.atkStyle === "magic") mult *= 0.65;
    const raw = attacker.atk * mult;
    return Math.max(1, Math.round(raw - (defender.armor || 0) * 0.5));
  }

  function engageRange(unit) {
    return unit.range || MELEE_RANGE;
  }

  function roleBias(attacker, foe) {
    let bias = 0;
    const tags = foe.tags || [];
    for (const tag of tags) {
      if ((attacker.strongVs || []).indexOf(tag) !== -1) bias += 2;
      if ((attacker.weakVs || []).indexOf(tag) !== -1) bias -= 1;
    }
    if (foe.tauntActive && isRangedStyle(attacker.atkStyle)) bias += 3;
    return bias;
  }

  function scoreFoe(unit, foe) {
    const dy = Math.abs(foe.y - unit.y);
    const homeY = unit.homeY || unit.y;
    const laneDy = Math.abs(foe.y - homeY);
    let score = Math.hypot(foe.x - unit.x, dy * 0.35);
    if (laneDy > LANE_TARGET_Y) score += 14;
    if (dy < LANE_KEEP_PEEL_Y) {
      const homeEdge = unit.side === "player" ? BASE_EDGE_PLAYER : BASE_EDGE_ENEMY;
      if (Math.abs(foe.x - homeEdge) < Math.abs(unit.x - homeEdge) + 8) score -= 8;
    }
    score -= roleBias(unit, foe) * 6;
    return score;
  }

  function findTarget(unit, foes) {
    if (!foes.length) return null;
    let pool = foes;
    if (unit.targetPriority === "backline") {
      const backline = foes.filter(isBacklineFighter);
      if (backline.length) pool = backline;
    }
    const stick = unit.targetId ? pool.find((o) => o.id === unit.targetId) : null;
    if (stick) {
      const d = Math.hypot(stick.x - unit.x, stick.y - unit.y);
      if (d <= TARGET_STICK_LEASH) return stick;
    }
    let best = null;
    let bestScore = Infinity;
    for (const o of pool) {
      const s = scoreFoe(unit, o);
      if (s < bestScore) {
        bestScore = s;
        best = o;
      }
    }
    if (best) unit.targetId = best.id;
    return best;
  }

  function findHealTarget(healer, allies) {
    let best = null;
    let bestRatio = 2;
    const pool = allies || state.battle.units;
    for (const u of pool) {
      if (u.side !== healer.side || u.hp <= 0 || u.id === healer.id) continue;
      if (u.hp >= u.maxHp) continue;
      if (Math.abs(u.y - healer.y) > LANE_TARGET_Y) continue;
      const ratio = u.hp / u.maxHp;
      if (ratio < bestRatio) {
        bestRatio = ratio;
        best = u;
      }
    }
    return best;
  }

  function woundedAlliesInRange(healer, engage) {
    let n = 0;
    for (const u of state.battle.units) {
      if (u.side !== healer.side || u.hp <= 0 || u.id === healer.id) continue;
      if (u.hp >= u.maxHp) continue;
      if (Math.hypot(u.x - healer.x, u.y - healer.y) <= engage) n += 1;
    }
    return n;
  }

  function healerHoldX(healer, allies) {
    let frontX = null;
    for (const u of allies) {
      if (u.side !== healer.side || u.hp <= 0 || u.id === healer.id) continue;
      if (isHealStyle(u.atkStyle)) continue;
      if (frontX == null) frontX = u.x;
      else if (healer.side === "player") frontX = Math.max(frontX, u.x);
      else frontX = Math.min(frontX, u.x);
    }
    if (frontX == null) {
      return healer.side === "player"
        ? Math.min(healer.x + 4, BASE_EDGE_ENEMY - 14)
        : Math.max(healer.x - 4, BASE_EDGE_PLAYER + 14);
    }
    return healer.side === "player"
      ? Math.max(PLAYER_SPAWN.x0, Math.min(BASE_EDGE_ENEMY - 10, frontX - 8))
      : Math.min(ENEMY_SPAWN.x1, Math.max(BASE_EDGE_PLAYER + 10, frontX + 8));
  }

  function getTokenEl(id) {
    return tokenEls.get(id) || null;
  }

  function unitPlateName(u) {
    let name;
    if (u && u.name) name = u.name;
    else {
      const type = u && (u.hero ? heroDef(u.typeId) : unitType(u.typeId));
      name = (type && type.name) || (u && u.typeId) || "Unit";
    }
    if (u && u.researchLevel > 0 && !u.hero && !u.minion) {
      name += " +" + u.researchLevel;
    }
    return name;
  }

  function mountCombatToken(u) {
    if (!el.combatLayer) return;
    let cls = "combat-token type-" + u.typeId + " spawning";
    cls += u.side === "enemy" ? " enemy" : " player";
    if (u.hero) cls += " is-hero";
    if (u.minion) cls += " is-minion";
    const wrap = document.createElement("div");
    wrap.className = cls;
    wrap.dataset.fighterId = u.id;
    wrap.style.left = u.x + "%";
    wrap.style.top = u.y + "%";
    const artKey = u.side === "player" ? u.typeId : ENEMY_ART[u.typeId] || "foe";
    const pct = (u.hp / u.maxHp) * 100;
    const plate = unitPlateName(u);
    wrap.innerHTML =
      `<span class="unit-ground" aria-hidden="true"></span>` +
      `<div class="unit-sil" aria-hidden="true">${unitArt(artKey)}</div>` +
      `<span class="unit-plate">${plate}</span>` +
      `<div class="hp-mini"><div class="hp-mini-fill" style="width:${pct}%"></div></div>`;
    wrap.title = plate;
    el.combatLayer.appendChild(wrap);
    tokenEls.set(u.id, wrap);
    updateTokenFacing(u);
    setTimeout(() => wrap.classList.remove("spawning"), 300);
  }

  function updateTokenFacing(u) {
    const node = getTokenEl(u.id);
    if (!node) return;
    const sil = node.querySelector(".unit-sil");
    if (sil) sil.style.transform = u.facing < 0 ? "scaleX(-1)" : "scaleX(1)";
  }

  function updateCombatToken(u) {
    const node = getTokenEl(u.id);
    if (!node) return;
    node.style.left = u.x + "%";
    node.style.top = u.y + "%";
    const fill = node.querySelector(".hp-mini-fill");
    if (fill) {
      const pct = (Math.max(0, u.hp) / u.maxHp) * 100;
      fill.style.width = pct + "%";
      fill.classList.remove("low", "critical");
      if (pct <= 25) fill.classList.add("critical");
      else if (pct <= 50) fill.classList.add("low");
    }
    node.classList.toggle("downed", u.hp <= 0);
    node.classList.toggle("is-stunned", u.stunT > 0);
    node.classList.toggle("is-slowed", u.slowT > 0);
    node.classList.toggle("is-charging", !!u.chargeReady);
    node.classList.toggle("is-aegis", u.aegisT > 0 || u.tauntActive);
    node.classList.toggle(
      "volley-ready",
      u.ability === "volley" && u.shots > 0 && u.shots % 4 === 3
    );
    updateTokenFacing(u);
  }

  function lungeToken(id, side) {
    const node = getTokenEl(id);
    if (!node) return;
    const cls = side === "player" ? "lunge-right" : "lunge-left";
    if (node.classList.contains(cls)) return;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), 180);
  }

  function flashToken(id, kind) {
    const node = getTokenEl(id);
    if (!node) return;
    const cls = kind === "attack" ? "flash-attack" : "flash-hit";
    if (node.classList.contains(cls)) return;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), 180);
  }

  function spawnFloater(x, y, amount, slain, counterHit) {
    if (!el.combatLayer) return;
    const d = document.createElement("div");
    d.className =
      "dmg-floater" + (slain ? " kill" : "") + (counterHit ? " counter" : "");
    d.style.left = x + "%";
    d.style.top = y + "%";
    d.textContent = "−" + amount + (counterHit ? "!" : "");
    el.combatLayer.appendChild(d);
    setTimeout(() => d.remove(), 650);
  }

  function spawnHealFloater(x, y, amount) {
    if (!el.combatLayer) return;
    const d = document.createElement("div");
    d.className = "dmg-floater heal";
    d.style.left = x + "%";
    d.style.top = y + "%";
    d.textContent = "+" + amount;
    el.combatLayer.appendChild(d);
    setTimeout(() => d.remove(), 650);
  }

  function spawnProjectile(fromX, fromY, toX, toY, style, shooterTypeId) {
    if (!el.combatLayer) return;
    const d = document.createElement("div");
    let cls = "projectile ";
    if (style === "magic") cls += "bolt";
    else if (style === "heal") cls += "heal";
    else if (shooterTypeId === "catapult") cls += "boulder";
    else if (shooterTypeId === "grenadier") cls += "grenade";
    else cls += "arrow";
    d.className = cls;
    d.style.setProperty("--x0", fromX + "%");
    d.style.setProperty("--y0", fromY + "%");
    d.style.setProperty("--x1", toX + "%");
    d.style.setProperty("--y1", toY + "%");
    const ang = (Math.atan2(toY - fromY, toX - fromX) * 180) / Math.PI;
    d.style.setProperty("--ang", ang + "deg");
    d.style.left = fromX + "%";
    d.style.top = fromY + "%";
    el.combatLayer.appendChild(d);
    const dur =
      shooterTypeId === "catapult" ? 0.55 : shooterTypeId === "grenadier" ? 0.38 : PROJ_FLIGHT_S;
    setTimeout(() => d.remove(), dur * 1000 + 40);
  }

  function markDead(unit) {
    if (!unit || unit.hp > 0) return;
    unit.removeAt = Date.now() + DEATH_FADE_MS;
    const node = getTokenEl(unit.id);
    if (node) {
      node.classList.add("downed", "falling");
      updateCombatToken(unit);
    }
    spawnParticles(unit.x, unit.y, "dust", 5);
    playSfx(unit.hero ? "heroDown" : "death");
    if (unit.hero) {
      if (unit.side === "player") {
        state.heroDown = true;
        state.heroBench = false;
        state.heroPlacement = null;
      } else {
        state.ai.heroDown = true;
        state.ai.heroBench = false;
        state.ai.heroPlacement = null;
      }
    }
  }

  function tryBonesingerRaise(killer) {
    if (!killer || killer.side !== "player") return;
    if (livingHeroId("player") !== "bonesinger") return;
    if (Math.random() >= BONE_MINION_KILL_CHANCE) return;
    if (countBoneMinions("player") >= BONE_MINION_MAX) return;
    createBoneMinion("player");
  }

  function applyUnitHit(attacker, target, bonusMult, opts) {
    if (!target || target.hp <= 0) return 0;
    const counter = counterMult(attacker, target);
    const dmg = dealDamage(attacker, target, bonusMult);
    target.hp -= dmg;
    flashToken(target.id, "hit");
    spawnFloater(target.x, target.y, dmg, target.hp <= 0, counter >= COUNTER_STRONG);
    spawnParticles(target.x, target.y, "spark", 3);
    recordDamage(dmg, attacker.side);
    if (isRangedStyle(attacker.atkStyle)) playSfx(attacker.atkStyle === "magic" ? "magic" : "arrow");
    else playSfx("melee");
    updateCombatToken(target);
    if (target.hp <= 0) {
      markDead(target);
      recordKill(attacker.side);
      tryBonesingerRaise(attacker);
    } else if (!opts || !opts.skipSplash) {
      applySplashDamage(attacker, target);
    }
    return dmg;
  }

  function applySplashDamage(attacker, primaryTarget) {
    const radius = attacker.splash || (attacker.ability === "arcane" ? 10 : 0);
    if (!radius) return;
    const splashStyle = attacker.ability === "arcane" ? "arcane" : "fire";
    spawnSplashRing(primaryTarget.x, primaryTarget.y, splashStyle);
    const foeSide = attacker.side === "player" ? "enemy" : "player";
    for (const o of livingUnits(foeSide)) {
      if (o.id === primaryTarget.id || o.hp <= 0) continue;
      const d = Math.hypot(o.x - primaryTarget.x, (o.y - primaryTarget.y) * 1.2);
      if (d > radius) continue;
      const counter = counterMult(attacker, o);
      const raw = attacker.atk * counter * SPLASH_DAMAGE_FRAC * auraDamageMult(attacker);
      const dmg = Math.max(1, Math.round(raw - (o.armor || 0) * 0.5));
      o.hp -= dmg;
      flashToken(o.id, "hit");
      spawnFloater(o.x, o.y, dmg, o.hp <= 0, false);
      recordDamage(dmg, attacker.side);
      updateCombatToken(o);
      if (o.hp <= 0) {
        markDead(o);
        recordKill(attacker.side);
        tryBonesingerRaise(attacker);
      }
    }
  }

  function queueProjectile(payload) {
    if (!state.battle.projectiles) state.battle.projectiles = [];
    state.battle.projectiles.push({
      ...payload,
      arrivesAt: state.matchTime + PROJ_FLIGHT_S,
    });
  }

  function resolveProjectile(p) {
    const shooter = state.battle.units.find((u) => u.id === p.shooterId);
    if (p.kind === "heal") {
      const ally = state.battle.units.find((u) => u.id === p.targetId);
      if (!ally || ally.hp <= 0) return;
      const before = ally.hp;
      ally.hp = Math.min(ally.maxHp, ally.hp + p.amount);
      const gained = Math.max(0, Math.round(ally.hp - before));
      if (gained > 0) spawnHealFloater(ally.x, ally.y, gained);
      updateCombatToken(ally);
      return;
    }
    if (p.kind === "tower") {
      const tower = (state.towers || []).find((t) => t.id === p.towerId);
      if (!tower || tower.hp <= 0) return;
      const wasAlive = tower.hp > 0;
      tower.hp = Math.max(0, tower.hp - p.dmg);
      spawnFloater(tower.x, tower.y, p.dmg, tower.hp <= 0, false);
      if (tower.hp <= 0 && wasAlive) {
        spawnParticles(tower.x, tower.y, "debris", 10);
        shakeScreen("md");
        playSfx("tower");
        if (p.attackerSide === "player" && state.stats) state.stats.towersDestroyed += 1;
      }
      renderTowers();
      return;
    }
    if (p.kind === "castle") {
      const dmg = p.dmg;
      if (p.foeSide === "enemy") state.ai.castleHp = Math.max(0, state.ai.castleHp - dmg);
      else state.playerCastleHp = Math.max(0, state.playerCastleHp - dmg);
      spawnFloater(p.x, p.y, dmg, false, false);
      shakeScreen("sm");
      playSfx("keep");
      renderCastles();
      if (state.playerCastleHp <= 0) endMatch(false);
      else if (state.ai.castleHp <= 0) endMatch(true);
      return;
    }
    const target = state.battle.units.find((u) => u.id === p.targetId);
    if (!target || target.hp <= 0) return;
    if (p.towerDmg) {
      const dmg = p.towerDmg;
      target.hp -= dmg;
      flashToken(target.id, "hit");
      spawnFloater(target.x, target.y, dmg, target.hp <= 0, false);
      updateCombatToken(target);
      if (target.hp <= 0) markDead(target);
      return;
    }
    if (!shooter || shooter.hp <= 0) return;
    applyUnitHit(shooter, target, p.bonusMult || 1, { skipSplash: !p.splash });
    if (p.volleyId) {
      const foes = livingUnits(shooter.side === "player" ? "enemy" : "player");
      let best = null;
      let bestD = Infinity;
      for (const o of foes) {
        if (o.id === target.id || o.hp <= 0) continue;
        const d = Math.hypot(o.x - shooter.x, o.y - shooter.y);
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      if (best) applyUnitHit(shooter, best, 0.75, { skipSplash: true });
    }
  }

  function tickProjectiles() {
    const list = state.battle.projectiles || [];
    if (!list.length) return;
    const now = state.matchTime;
    const pending = [];
    for (const p of list) {
      if (p.arrivesAt <= now) resolveProjectile(p);
      else pending.push(p);
    }
    state.battle.projectiles = pending;
  }

  function onMeleeHit(attacker, target) {
    let bonus = 1;
    if (attacker.ability === "brace" && target.tags.indexOf("cavalry") !== -1) {
      if (attacker.chargeReady || (target.moveAccum || 0) > 2) {
        target.slowT = Math.max(target.slowT, SLOW_S);
        bonus = BRACE_BONUS;
      }
    }
    if (attacker.ability === "shieldbash" && attacker.abilityCd <= 0) {
      attacker.abilityCd = SHIELD_BASH_CD;
      target.stunT = Math.max(target.stunT, STUN_S);
      target.targetId = attacker.id;
    }
    if (attacker.ability === "charge" && attacker.chargeReady) {
      attacker.chargeReady = false;
      attacker.chargeDist = 0;
      target.stunT = Math.max(target.stunT, STUN_S * 0.6);
      bonus = CHARGE_BONUS;
    }
    return bonus;
  }

  function strikeUnit(attacker, target) {
    attacker.attackCd = attacker.atkCdMax;
    flashToken(attacker.id, "attack");
    attacker.facing = target.x >= attacker.x ? 1 : -1;
    updateTokenFacing(attacker);
    if (attacker.ability === "volley") attacker.shots = (attacker.shots || 0) + 1;
    if (attacker.ability === "aegis" && attacker.abilityCd <= 0) {
      attacker.abilityCd = AEGIS_S;
      attacker.aegisT = AEGIS_S;
      attacker.tauntActive = true;
    }
    const ranged = isRangedStyle(attacker.atkStyle);
    if (!ranged) {
      lungeToken(attacker.id, attacker.side);
      const bonus = onMeleeHit(attacker, target);
      applyUnitHit(attacker, target, bonus);
      return;
    }
    const volleyId =
      attacker.ability === "volley" && attacker.shots % 4 === 0 ? attacker.id : null;
    spawnProjectile(attacker.x, attacker.y, target.x, target.y, attacker.atkStyle, attacker.typeId);
    queueProjectile({
      shooterId: attacker.id,
      targetId: target.id,
      kind: "damage",
      bonusMult: 1,
      splash: attacker.ability === "arcane" || attacker.splash > 0,
      volleyId,
    });
  }

  function healAlly(healer, target, aoe) {
    if (!target || target.hp <= 0) return;
    healer.attackCd = healer.atkCdMax;
    flashToken(healer.id, "attack");
    const amt = Math.max(1, Math.round(healer.atk));
    if (aoe) {
      spawnSanctuaryRing(healer.x, healer.y);
      playSfx("heal");
      const engage = engageRange(healer);
      for (const u of state.battle.units) {
        if (u.side !== healer.side || u.hp <= 0 || u.id === healer.id) continue;
        if (u.hp >= u.maxHp) continue;
        if (Math.hypot(u.x - healer.x, u.y - healer.y) > engage) continue;
        spawnProjectile(healer.x, healer.y, u.x, u.y, "heal");
        queueProjectile({
          shooterId: healer.id,
          targetId: u.id,
          kind: "heal",
          amount: Math.max(1, Math.round(amt * 0.55)),
        });
      }
      return;
    }
    playSfx("heal");
    spawnProjectile(healer.x, healer.y, target.x, target.y, "heal");
    queueProjectile({
      shooterId: healer.id,
      targetId: target.id,
      kind: "heal",
      amount: amt,
    });
  }

  function moveTowardEngage(unit, tx, ty, engage, step, dt) {
    const dx = tx - unit.x;
    const dy = ty - unit.y;
    const dist = Math.hypot(dx, dy);
    const slow = unit.slowT > 0 ? 0.55 : 1;
    const stopAt = Math.max(engage * 0.65, 4);
    if (dist > stopAt) {
      const move = step * slow;
      unit.x += (dx / dist) * move;
      unit.y += (dy / dist) * move * 0.7;
      unit.moveAccum = (unit.moveAccum || 0) + move;
      if (unit.ability === "charge") {
        unit.chargeDist = (unit.chargeDist || 0) + move;
        if (unit.chargeDist >= 14) unit.chargeReady = true;
      }
    } else if (unit.ability === "charge") {
      unit.chargeDist = 0;
    }
    unit.x = Math.max(4, Math.min(96, unit.x));
    unit.y = clampFieldY(unit.y);
    unit.facing = tx >= unit.x ? 1 : -1;
  }

  function kiteFrom(unit, foe, engage, step, dt) {
    const dist = Math.hypot(foe.x - unit.x, foe.y - unit.y);
    if (dist >= KITE_MIN_RANGE && dist <= engage) return false;
    const dx = unit.x - foe.x;
    const dy = unit.y - foe.y;
    const d = Math.hypot(dx, dy) || 1;
    const move = step * (unit.slowT > 0 ? 0.55 : 1);
    unit.x += (dx / d) * move * 0.9;
    unit.y += (dy / d) * move * 0.5;
    unit.x = Math.max(4, Math.min(96, unit.x));
    unit.y = clampFieldY(unit.y);
    unit.facing = foe.x >= unit.x ? 1 : -1;
    return true;
  }

  function castlePos(side) {
    return side === "player"
      ? { x: CASTLE_X_PLAYER, y: CASTLE_Y }
      : { x: CASTLE_X_ENEMY, y: CASTLE_Y };
  }

  function findTowerTarget(unit) {
    const foe = unit.side === "player" ? "enemy" : "player";
    let best = null;
    let bestD = Infinity;
    for (const t of livingTowers(foe)) {
      const d = Math.hypot(t.x - unit.x, (t.y - unit.y) * 1.15);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  function strikeTower(attacker, tower) {
    attacker.attackCd = attacker.atkCdMax;
    flashToken(attacker.id, "attack");
    const mult = (attacker.structureMult || 1) * auraDamageMult(attacker);
    const dmg = Math.max(1, Math.round(attacker.atk * 0.85 * mult));
    if (isRangedStyle(attacker.atkStyle)) {
      spawnProjectile(attacker.x, attacker.y, tower.x, tower.y, attacker.atkStyle, attacker.typeId);
      queueProjectile({
        shooterId: attacker.id,
        kind: "tower",
        towerId: tower.id,
        dmg,
        attackerSide: attacker.side,
      });
    } else {
      lungeToken(attacker.id, attacker.side);
      const wasAlive = tower.hp > 0;
      tower.hp = Math.max(0, tower.hp - dmg);
      spawnFloater(tower.x, tower.y, dmg, tower.hp <= 0, false);
      if (tower.hp <= 0 && wasAlive) {
        spawnParticles(tower.x, tower.y, "debris", 10);
        shakeScreen("md");
        playSfx("tower");
        if (attacker.side === "player" && state.stats) state.stats.towersDestroyed += 1;
      }
      renderTowers();
    }
  }

  function strikeCastle(unit) {
    const foe = unit.side === "player" ? "enemy" : "player";
    const pos = castlePos(foe);
    unit.attackCd = unit.atkCdMax;
    flashToken(unit.id, "attack");
    const mult = (unit.structureMult || 1) * auraDamageMult(unit);
    const dmg = Math.max(1, Math.round(unit.atk * 0.7 * mult));
    if (isRangedStyle(unit.atkStyle)) {
      spawnProjectile(unit.x, unit.y, pos.x, pos.y, unit.atkStyle, unit.typeId);
      queueProjectile({
        shooterId: unit.id,
        kind: "castle",
        foeSide: foe,
        x: pos.x,
        y: pos.y,
        dmg,
      });
    } else {
      lungeToken(unit.id, unit.side);
      if (foe === "enemy") state.ai.castleHp = Math.max(0, state.ai.castleHp - dmg);
      else state.playerCastleHp = Math.max(0, state.playerCastleHp - dmg);
      spawnFloater(pos.x, pos.y, dmg, false, false);
      shakeScreen("sm");
      playSfx("keep");
      recordDamage(dmg, unit.side);
      renderCastles();
      if (state.playerCastleHp <= 0) endMatch(false);
      else if (state.ai.castleHp <= 0) endMatch(true);
    }
  }

  function tickTowers(dt) {
    for (const tower of livingTowers()) {
      tower.atkCd = Math.max(0, tower.atkCd - dt);
      if (tower.atkCd > 0) continue;
      const foes = livingUnits(tower.side === "player" ? "enemy" : "player");
      let best = null;
      let bestD = Infinity;
      for (const u of foes) {
        const d = Math.hypot(u.x - tower.x, (u.y - tower.y) * 1.1);
        if (d <= tower.range && d < bestD) {
          bestD = d;
          best = u;
        }
      }
      if (!best) continue;
      tower.atkCd = tower.atkCdMax;
      spawnProjectile(tower.x, tower.y, best.x, best.y, "ranged");
      const dmg = Math.max(1, Math.round(tower.atk - (best.armor || 0) * 0.5));
      queueProjectile({
        shooterId: "tower-" + tower.id,
        targetId: best.id,
        kind: "damage",
        towerDmg: dmg,
      });
    }
  }

  function applySeparation(living, dt) {
    for (let i = 0; i < living.length; i++) {
      const a = living[i];
      let px = 0;
      let py = 0;
      for (let j = 0; j < living.length; j++) {
        if (i === j) continue;
        const b = living[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy * 1.35);
        if (d < 0.05 || d >= SEPARATION_DIST) continue;
        const force = (SEPARATION_DIST - d) / SEPARATION_DIST;
        const weight = a.side === b.side ? 1.2 : 0.45;
        px += (dx / d) * force * weight;
        py += (dy / d) * force * weight;
      }
      if (!px && !py) continue;
      a.x = Math.max(4, Math.min(96, a.x + px * SEPARATION_STRENGTH * dt));
      a.y = clampFieldY(a.y + py * SEPARATION_STRENGTH * 1.4 * dt);
    }
  }

  function tickStatuses(unit, dt) {
    unit.stunT = Math.max(0, unit.stunT - dt);
    unit.slowT = Math.max(0, unit.slowT - dt);
    unit.aegisT = Math.max(0, unit.aegisT - dt);
    unit.abilityCd = Math.max(0, unit.abilityCd - dt);
    if (unit.aegisT <= 0) unit.tauntActive = false;
  }

  function battleTick(dt) {
    if (!state.battle.active || state.over) return;
    tickProjectiles();
    const living = livingUnits();
    const pLiving = livingUnits("player");
    const eLiving = livingUnits("enemy");

    for (const unit of living) {
      tickStatuses(unit, dt);
      unit.attackCd = Math.max(0, unit.attackCd - dt);
      if (unit.stunT > 0) {
        updateCombatToken(unit);
        continue;
      }
      const speedMult = auraSpeedMult(unit);
      const step = unit.spd * UNIT_MOVE_MULT * speedMult * dt;
      const engage = engageRange(unit);
      const foes = unit.side === "player" ? eLiving : pLiving;
      const allies = unit.side === "player" ? pLiving : eLiving;

      if (isHealStyle(unit.atkStyle)) {
        const ally = findHealTarget(unit, allies);
        const holdX = healerHoldX(unit, allies);
        if (ally) {
          const dist = Math.hypot(ally.x - unit.x, ally.y - unit.y);
          if (dist <= engage && unit.attackCd <= 0) {
            const aoe =
              unit.ability === "sanctuary" && woundedAlliesInRange(unit, engage) >= 2;
            healAlly(unit, ally, aoe);
          } else {
            moveTowardEngage(unit, ally.x, ally.y, engage, step, dt);
          }
        } else {
          moveTowardEngage(unit, holdX, unit.homeY || unit.y, 4, step * 0.5, dt);
        }
        updateCombatToken(unit);
        continue;
      }

      const target = findTarget(unit, foes);
      if (target) {
        const dist = Math.hypot(target.x - unit.x, target.y - unit.y);
        if (isRangedStyle(unit.atkStyle) && dist < KITE_MIN_RANGE) {
          kiteFrom(unit, target, engage, step, dt);
        } else if (dist <= engage && unit.attackCd <= 0) {
          strikeUnit(unit, target);
        } else {
          moveTowardEngage(unit, target.x, target.y, engage, step, dt);
        }
      } else {
        const tower = findTowerTarget(unit);
        if (tower) {
          const dist = Math.hypot(tower.x - unit.x, tower.y - unit.y);
          if (dist <= Math.max(engage, 6) && unit.attackCd <= 0) strikeTower(unit, tower);
          else moveTowardEngage(unit, tower.x, tower.y, 5, step, dt);
        } else {
          const keep = castlePos(unit.side === "player" ? "enemy" : "player");
          const dist = Math.hypot(keep.x - unit.x, keep.y - unit.y);
          if (dist <= Math.max(engage, 8) && unit.attackCd <= 0) strikeCastle(unit);
          else moveTowardEngage(unit, keep.x, keep.y, 6, step, dt);
        }
      }
      updateCombatToken(unit);
    }

    tickTowers(dt);
    applySeparation(living, dt);
    checkKeeps();
  }
/* ---- placement selection ---- */
  function refreshPlacementUi() {
    lastBenchSig = "";
    lastBoardSig = "";
    renderHud();
  }

  function clearBenchIfSpent() {
    if (!state.selectedBenchType) return;
    if (
      !isHeroId(state.selectedBenchType) &&
      (state.bench[state.selectedBenchType] || 0) <= 0
    ) {
      state.selectedBenchType = null;
    }
    if (isHeroId(state.selectedBenchType) && !state.heroBench) {
      state.selectedBenchType = null;
    }
  }

  function recallSelectedBoard() {
    if (!state.selectedBoard || !canPlaceUnits()) return false;
    const ok = removeFromGrid(state.selectedBoard.col, state.selectedBoard.row);
    state.selectedBoard = null;
    return ok;
  }

  function onCellTap(col, row) {
    if (state.over || !canPlaceUnits()) return;
    if (state.selectedBoard) {
      const from = state.selectedBoard;
      if (from.col === col && from.row === row) {
        state.selectedBoard = null;
      } else if (canSwapSelectedTo(col, row)) {
        swapOnGrid(from.col, from.row, col, row);
        state.selectedBoard = null;
      } else if (canMoveSelectedTo(col, row)) {
        moveOnGrid(from.col, from.row, col, row);
        state.selectedBoard = null;
      } else if (occupantKind(col, row)) {
        state.selectedBoard = { col, row };
        state.selectedBenchType = null;
      } else {
        state.selectedBoard = null;
      }
      refreshPlacementUi();
      return;
    }
    if (occupantKind(col, row)) {
      state.selectedBoard = { col, row };
      state.selectedBenchType = null;
      refreshPlacementUi();
      return;
    }
    if (state.selectedBenchType) {
      placeOnGrid(state.selectedBenchType, col, row);
      clearBenchIfSpent();
    }
    refreshPlacementUi();
  }

  function bindUi() {
    initBoardGrid();

    el.shopBar?.addEventListener("click", (e) => {
      const card = e.target.closest(".shop-card");
      if (!card || state.over) return;
      hideTooltip();
      if (card.disabled) {
        playSfx("error");
        shakeGoldPill();
        return;
      }
      playSfx("click");
      let placedType = null;
      if (card.dataset.shop === "economy") buyEconomy(true);
      else if (card.dataset.shop === "hero") {
        if (buyHero(card.dataset.heroId, true)) placedType = card.dataset.heroId;
      } else if (card.dataset.shop === "rez") {
        if (rezHero()) placedType = state.heroId;
      } else if (card.dataset.shop === "upgrade") buyUnitUpgrade(card.dataset.type, true);
      else if (card.dataset.shop === "towers") buyTowerUpgrade(true);
      else if (card.dataset.type) {
        if (buyUnit(card.dataset.type, true)) placedType = card.dataset.type;
      }
      if (placedType) {
        state.selectedBenchType = placedType;
        state.selectedBoard = null;
        goToBattlePaneIfMobile();
        const def = isHeroId(placedType) ? heroDef(placedType) : unitType(placedType);
        const name = def && def.name ? def.name : "unit";
        showBanner("Tap a spawn tile to place " + name, "");
        hideBannerSoon(1800);
      }
      lastShopSig = "";
      lastBenchSig = "";
      lastBoardSig = "";
      renderHud();
    });

    for (const tab of el.shopCatTabs || []) {
      tab.addEventListener("click", () => {
        const next = tab.dataset.shopTab || "hire";
        if (state.shopTab === next) return;
        state.shopTab = next;
        hideTooltip();
        lastShopSig = "";
        renderHud();
      });
    }

    el.benchTray?.addEventListener("click", (e) => {
      const chip = e.target.closest(".bench-chip");
      if (!chip) return;
      playSfx("click");
      hideTooltip();
      const typeId = chip.dataset.type;
      state.selectedBoard = null;
      state.selectedBenchType =
        state.selectedBenchType === typeId ? null : typeId;
      if (state.selectedBenchType && document.body.dataset.mobilePane === "shop") {
        goToBattlePaneIfMobile();
      }
      refreshPlacementUi();
    });

    document.getElementById("bench-section")?.addEventListener("click", (e) => {
      if (e.target.closest(".bench-chip")) return;
      if (!state.selectedBoard || !canPlaceUnits()) return;
      recallSelectedBoard();
      refreshPlacementUi();
    });

    el.boardGrid?.addEventListener("click", (e) => {
      const cell = e.target.closest(".board-cell.player-zone");
      if (!cell) return;
      onCellTap(+cell.dataset.col, +cell.dataset.row);
    });

    el.boardGrid?.addEventListener("dblclick", (e) => {
      const cell = e.target.closest(".board-cell.player-zone");
      if (!cell || state.over || !canPlaceUnits()) return;
      const col = +cell.dataset.col;
      const row = +cell.dataset.row;
      if (!occupantKind(col, row)) return;
      removeFromGrid(col, row);
      state.selectedBoard = null;
      refreshPlacementUi();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hideTooltip();
        if (!state.selectedBoard && !state.selectedBenchType) return;
        state.selectedBoard = null;
        state.selectedBenchType = null;
        refreshPlacementUi();
        return;
      }
      if (state.over) return;
      if (e.key === "h" || e.key === "H") {
        if (el.helpModal && el.helpModal.hidden) {
          el.helpModal.hidden = false;
          el.helpModal.setAttribute("aria-hidden", "false");
          document.body.classList.add("modal-open");
        }
        return;
      }
      if (e.key === "m" || e.key === "M") {
        el.musicMuteBtn?.click();
      }
    });


    bindTooltipDelegation(el.shopBar, ".shop-card", (card) => {
      if (card.dataset.shop === "economy") {
        return `<div class="tt-name">Economy</div><div class="tt-ability">+${ECONOMY_GPS} gold/s per level (max ${MAX_ECONOMY})</div>`;
      }
      if (card.dataset.shop === "towers") {
        return `<div class="tt-name">Tower Research</div><div class="tt-stats"><span>+${TOWER_RESEARCH_HP} HP</span><span>+${TOWER_RESEARCH_ATK} ATK</span><span>+${TOWER_RESEARCH_RANGE} RNG</span></div>`;
      }
      if (card.dataset.shop === "hero" && card.dataset.heroId) {
        return unitTooltipHtml(heroDef(card.dataset.heroId), { hero: true });
      }
      if (card.dataset.type) {
        const type = unitType(card.dataset.type);
        if (!type) return "";
        return unitTooltipHtml(type, { level: unitLevelFor(state, card.dataset.type) });
      }
      return "";
    });

    bindTooltipDelegation(el.benchTray, ".bench-chip", (chip) => {
      const typeId = chip.dataset.type;
      if (!typeId) return "";
      if (isHeroId(typeId)) return unitTooltipHtml(heroDef(typeId), { hero: true });
      return unitTooltipHtml(unitType(typeId), { level: 0 });
    });

    window.addEventListener("scroll", hideTooltip, { passive: true });
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (tooltipTarget && !nodeInside(tooltipTarget, e.target)) {
          hideTooltip();
        }
        if (!state || state.over) return;
        if (!state.selectedBenchType && !state.selectedBoard) return;
        if (
          e.target.closest(
            ".bench-chip, .board-cell, #board-grid, #bench-section, #board-section, #board, #mobile-nav"
          )
        ) {
          return;
        }
        if (e.target.closest(".modal")) return;
        state.selectedBenchType = null;
        state.selectedBoard = null;
        refreshPlacementUi();
      },
      true
    );

    initMobileChrome();

    el.helpBtn?.addEventListener("click", () => {
      playSfx("click");
      el.helpModal.hidden = false;
      el.helpModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
    });
    const closeHelp = () => {
      el.helpModal.hidden = true;
      el.helpModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    };
    el.helpClose?.addEventListener("click", closeHelp);
    el.helpModal?.querySelector(".modal-backdrop")?.addEventListener("click", closeHelp);

    el.restartBtn?.addEventListener("click", () => {
      playSfx("click");
      startMatch();
    });
    el.endRestart?.addEventListener("click", () => {
      playSfx("click");
      startMatch();
    });
    el.endModal?.querySelector(".modal-backdrop")?.addEventListener("click", () => {
      if (state.over) startMatch();
    });
  }

  function initMobileChrome() {
    const mq = window.matchMedia(MOBILE_MQ);
    const validPanes = { battle: true, shop: true };

    function setPane(pane) {
      if (pane === "barracks") pane = "battle";
      if (!validPanes[pane]) pane = "battle";
      document.body.dataset.mobilePane = pane;
      try {
        sessionStorage.setItem(MOBILE_PANE_KEY, pane);
      } catch (_) {}
      if (!el.mobileNav) return;
      el.mobileNav.querySelectorAll(".mobile-tab").forEach((tab) => {
        const on = tab.dataset.pane === pane;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-pressed", on ? "true" : "false");
      });
      hideTooltip();
    }

    setMobilePane = setPane;

    let saved = "battle";
    try {
      saved = sessionStorage.getItem(MOBILE_PANE_KEY) || "battle";
    } catch (_) {}
    setPane(saved);

    el.mobileNav?.addEventListener("click", (e) => {
      const tab = e.target.closest(".mobile-tab");
      if (!tab) return;
      playSfx("click");
      setPane(tab.dataset.pane);
    });

    const onMq = () => setPane(document.body.dataset.mobilePane || "battle");
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

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
    if (preferred <= 0) preferred = DEFAULT_VOLUME;
    else {
      try {
        localStorage.setItem(MUSIC_VOLUME_KEY, String(preferred));
      } catch (_) {}
    }

    let muted = localStorage.getItem(MUSIC_MUTED_KEY) === "1";
    if (stored !== null && Number(stored) === 0) muted = true;

    function applyVolume() {
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

  function startMatch() {
    state = initState();
    lastShopSig = "";
    lastBenchSig = "";
    lastBoardSig = "";
    lastTowerSig = "";
    clearCombatLayer();
    if (el.endModal) {
      el.endModal.hidden = true;
      el.endModal.setAttribute("aria-hidden", "true");
      el.endModal.classList.remove("victory-finale", "defeat-finale");
    }
    if (el.roundBanner) el.roundBanner.hidden = true;
    document.body.classList.remove("modal-open");
    startCountdown(true);
  }

  let accBattle = 0;
  let accAi = 0;

  function gameStep(now) {
    if (!lastNow) lastNow = now;
    let dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;

    if (!state.over) {
      state.matchTime += dt;
      tickEconomy(dt);
      tickWaveTimer(dt);
      accAi += dt;
      while (accAi >= AI_BUY_INTERVAL) {
        aiTryBuy();
        accAi -= AI_BUY_INTERVAL;
      }
      accBattle += dt;
      while (accBattle >= BATTLE_MS / 1000) {
        battleTick(BATTLE_MS / 1000);
        accBattle -= BATTLE_MS / 1000;
      }
    }

    if (now - lastHud >= HUD_MS) {
      lastHud = now;
      renderHud();
    }
    requestAnimationFrame(gameStep);
  }

  bindUi();
  initSfx();
  initMusic();
  startMatch();
  requestAnimationFrame(gameStep);
})();
