(() => {
  "use strict";

  const HUD_MS = 100;
  const BATTLE_MS = 50;
  /** Soft DOM/perf ceiling; food upkeep is the real army limit. */
  const FIELD_SOFT_CAP = 40;
  const PLAYER_BASE_HP = 120;
  const MELEE_RANGE = 6;
  const LANE_TARGET_Y = 18;
  const PLAYER_SPAWN_X = 14;
  const ENEMY_SPAWN_X = 86;
  const BASE_EDGE_PLAYER = 12;
  const BASE_EDGE_ENEMY = 88;
  const LANES = [48, 58, 68];
  /** Base seconds to train one unit before it hits the field. */
  const BASE_TRAIN_TIME = 2;
  const TRAIN_RETRY = 0.25;
  const WAVE_TRANSITION_MS = 900;
  /** Seconds before wave 1 combat starts. */
  const OPENING_COUNTDOWN_S = 3;
  /** Food drained per living player unit per second while battle is live. */
  const FOOD_UPKEEP_PER_UNIT = 0.35;
  const SAVE_KEY = "clickstrike-save-v1";
  const SAVE_VERSION = 2;
  const SAVE_THROTTLE_MS = 2000;
  const MUSIC_VOLUME_KEY = "clickstrike-music-volume";
  const MUSIC_TRACKS = [
    "assets/audio/music/07-human-1.mp3",
    "assets/audio/music/13-arrival-at-kalimdor.mp3",
  ];
  const FOOD_UPGRADE_IDS = { baskets: true, foragers: true };

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
      spd: 5,
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
      spd: 8,
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
      foodCost: 45,
      hp: 45,
      atk: 13,
      spd: 4,
      armor: 3,
      atkCd: 0.7,
      range: 6,
      atkStyle: "melee",
      blurb: "Slow and sturdy",
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
    return UNIT_ART.foe;
  }

  const WAVE_ROSTER = [
    { name: "Ragged Bandits", packLabel: "bandits" },
    { name: "Wolf Pack", packLabel: "wolves" },
    { name: "Hill Raiders", packLabel: "raiders" },
    { name: "Marsh Skirmishers", packLabel: "skirmishers" },
    { name: "Outlaw Captain", packLabel: "outlaws", boss: true },
    { name: "Ogre Scout", packLabel: "ogres" },
    { name: "Bone Shamblers", packLabel: "shamblers" },
    { name: "Mercenary Company", packLabel: "mercenaries" },
    { name: "Ash Cultists", packLabel: "cultists" },
    { name: "Warband Chief", packLabel: "warriors", boss: true },
    { name: "Ironclad Footmen", packLabel: "footmen" },
    { name: "Night Stalkers", packLabel: "stalkers" },
    { name: "Siege Brutes", packLabel: "brutes" },
    { name: "Plague Bearers", packLabel: "bearers" },
    { name: "Dark Champion", packLabel: "champions", boss: true },
    { name: "Frost Raiders", packLabel: "raiders" },
    { name: "Cinder Knights", packLabel: "knights" },
    { name: "Hollow Legion", packLabel: "legionaries" },
    { name: "Blood Hounds", packLabel: "hounds" },
    { name: "Tyrant of the Vale", packLabel: "tyrants", boss: true },
    { name: "Obsidian Guard", packLabel: "guards" },
    { name: "Storm Callers", packLabel: "callers" },
    { name: "Ruin Walkers", packLabel: "walkers" },
    { name: "Dread Lancers", packLabel: "lancers" },
    { name: "Age Warden", packLabel: "wardens", boss: true },
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
    recruitList: document.getElementById("recruit-list"),
    spawnHint: document.getElementById("spawn-hint"),
    wavePreview: document.getElementById("wave-preview"),
    loopStatus: document.getElementById("loop-status"),
    battleLog: document.getElementById("battle-log"),
    statusLabel: document.getElementById("battle-status-label"),
    playerBaseFill: document.getElementById("player-base-fill"),
    playerBaseText: document.getElementById("player-base-text"),
    enemyBaseFill: document.getElementById("enemy-base-fill"),
    enemyBaseText: document.getElementById("enemy-base-text"),
    basePlayer: document.getElementById("base-player"),
    baseEnemy: document.getElementById("base-enemy"),
    fieldUnits: document.getElementById("field-units"),
    musicVolume: document.getElementById("music-volume"),
    bgMusic: document.getElementById("bg-music"),
  };

  const state = {
    gold: 0,
    food: 36,
    clickPower: 1,
    foodClickPower: 1,
    goldPerSecond: 0,
    foodPerSecond: 0.2,
    upgradeLevels: {
      pickaxe: 0,
      traders: 0,
      baskets: 0,
      foragers: 0,
      smithy: 0,
      weapons: 0,
      armor: 0,
      vitality: 0,
      barracks: 0,
    },
    nextUnitId: 1,
    wave: 1,
    battle: null,
    laneCursor: 0,
    spawnCursor: 0,
    autoSpawn: { spearman: true, archer: false, knight: false },
    waveTransitioning: false,
  };

  function defaultAutoSpawn() {
    return { spearman: true, archer: false, knight: false };
  }

  let lastSaveAt = 0;

  function defaultUpgradeLevels() {
    const levels = {};
    for (const def of UPGRADES) levels[def.id] = 0;
    return levels;
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
    // Accept v1 (migrate) and v2 saves.
    if (!data || (data.v !== 1 && data.v !== SAVE_VERSION)) return false;
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
    state.battle = null;
    state.waveTransitioning = false;
    return true;
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

  function isBossWave(wave) {
    return wave % 5 === 0;
  }

  function waveMeta(wave) {
    if (wave <= WAVE_ROSTER.length) {
      const entry = WAVE_ROSTER[wave - 1];
      return {
        name: entry.name,
        packLabel: entry.packLabel,
        boss: !!entry.boss || isBossWave(wave),
      };
    }
    return {
      name: "Age Warden " + (wave - WAVE_ROSTER.length),
      packLabel: "wardens",
      boss: isBossWave(wave),
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

  function enemyUnitStats(wave) {
    const boss = isBossWave(wave);
    // ~10% tougher than pre-upgrade curve to offset player combat shops
    let hp = Math.floor(15 * Math.pow(1.13, wave - 1));
    let atk = Math.floor(3.5 + wave * 1.15);
    let spd = 4 + Math.floor((wave - 1) / 6);
    let armor = Math.floor((wave - 1) / 4);
    let atkCd = Math.max(0.35, 0.55 - wave * 0.008);
    if (boss) {
      hp = Math.floor(hp * 1.25);
      atk = Math.floor(atk * 1.15);
      armor += 1;
      atkCd += 0.05;
    }
    return {
      hp,
      atk,
      spd,
      armor,
      atkCd,
      range: MELEE_RANGE,
      atkStyle: "melee",
      boss,
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
    return Math.floor(25 + 14 * wave);
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

  function countSide(side) {
    if (!state.battle) return 0;
    return state.battle.units.filter((u) => u.side === side && u.hp > 0).length;
  }

  function nextLane() {
    const y = LANES[state.laneCursor % LANES.length];
    state.laneCursor += 1;
    return y;
  }

  function appendLog(cls, text) {
    const line = document.createElement("p");
    line.className = cls;
    line.textContent = text;
    el.battleLog.appendChild(line);
    while (el.battleLog.children.length > 8) {
      el.battleLog.removeChild(el.battleLog.firstChild);
    }
    el.battleLog.scrollTop = el.battleLog.scrollHeight;
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
      u.side === "player" ? "type-" + (u.typeId || "spearman") : "foe";
    const classes = [
      "unit-token",
      typeClass,
      u.side === "enemy" ? "enemy" : "player",
      u.boss ? "boss" : "",
      "spawning",
    ]
      .filter(Boolean)
      .join(" ");

    const artKey = u.side === "player" ? u.typeId || "spearman" : "foe";
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
      x: PLAYER_SPAWN_X,
      y: nextLane(),
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
    const buttons = el.recruitList.querySelectorAll(".recruit-btn");
    for (const btn of buttons) {
      const fill = btn.querySelector(".spawn-bar-fill");
      const track = btn.querySelector(".spawn-bar");
      if (!fill || !track) continue;
      const active = !!(training && training.typeId === btn.dataset.id);
      track.classList.toggle("active", active);
      btn.classList.toggle("training", active);
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

    const meta = waveMeta(state.wave);
    const stats = enemyUnitStats(state.wave);
    const isBoss = stats.boss && countSide("enemy") === 0;
    let name;
    if (isBoss) name = meta.name;
    else {
      const s = packSingular(meta.packLabel);
      name = s.charAt(0).toUpperCase() + s.slice(1);
    }
    const unit = {
      id: "e" + state.nextUnitId++,
      side: "enemy",
      typeId: "foe",
      name,
      hp: stats.hp,
      maxHp: stats.hp,
      atk: stats.atk,
      armor: stats.armor,
      spd: stats.spd,
      atkCdMax: stats.atkCd,
      range: stats.range,
      atkStyle: stats.atkStyle,
      x: ENEMY_SPAWN_X,
      y: nextLane(),
      attackCd: 0,
      boss: isBoss,
    };
    state.battle.units.push(unit);
    mountToken(unit);
  }

  function packSingular(packLabel) {
    if (packLabel.endsWith("ves")) return packLabel.slice(0, -3) + "f";
    if (packLabel.endsWith("ies")) return packLabel.slice(0, -3) + "y";
    if (packLabel.endsWith("s")) return packLabel.slice(0, -1);
    return packLabel;
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
    return UNIT_TYPES.filter((t) => state.autoSpawn[t.id]);
  }

  function toggleAutoSpawn(typeId) {
    if (!(typeId in state.autoSpawn)) return;
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
    }

    saveGame(true);
    renderHud();

    setTimeout(() => {
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
    if (Math.abs(unit.y - targetY) > 1) {
      unit.y += Math.sign(targetY - unit.y) * Math.min(8 * dt, Math.abs(unit.y - targetY));
    }
  }

  function beginCombat() {
    const b = state.battle;
    if (!b || !b.active) return;
    b.countdown = 0;
    b.enemySpawnAt = 0.6;
    b.training = null;
    b.trainRetryAt = 0;
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
        setStatus(String(nextCeil), "fighting");
      }
      if (el.loopStatus) {
        el.loopStatus.textContent = `Wave 1 begins in ${nextCeil}…`;
        el.loopStatus.classList.add("is-countdown");
      }
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
      const moveSpeed = unit.spd * 1.05;
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
        }
      }
    }

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
    };
    state.laneCursor = 0;
    state.waveTransitioning = false;

    if (opening) {
      appendLog(
        "log-muted",
        `Wave 1 assault begins in ${OPENING_COUNTDOWN_S}… prepare your economy.`
      );
      setStatus(String(OPENING_COUNTDOWN_S), "fighting");
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
    return def.desc;
  }

  function trainDuration() {
    const lv = state.upgradeLevels.barracks || 0;
    return Math.max(0.45, BASE_TRAIN_TIME * Math.pow(0.88, lv));
  }

  function renderUpgrades() {
    el.upgradeList.innerHTML = "";
    for (const def of UPGRADES) {
      const cost = upgradeCost(def);
      const level = state.upgradeLevels[def.id];
      const meta = def.combat
        ? `Lv ${level} · ${def.desc}` + (level > 0 ? ` (${combatBonusText(def, level)})` : "")
        : `Lv ${level} · ${def.desc}`;
      const btn = document.createElement("button");
      btn.dataset.id = def.id;
      const foodTag = def.food || FOOD_UPGRADE_IDS[def.id] ? " food-upgrade" : "";
      btn.className =
        "shop-btn" +
        foodTag +
        (state.gold >= cost ? " affordable" : "");
      btn.disabled = state.gold < cost;
      btn.innerHTML =
        `<span><span class="item-name">${def.name}</span>` +
        `<br><span class="item-meta">${meta}</span></span>` +
        `<span class="item-cost"><span class="cost-gold">${format(cost)} g</span></span>`;
      btn.addEventListener("click", () => buyUpgrade(def.id));
      el.upgradeList.appendChild(btn);
    }
  }

  function foodUpkeepRate() {
    if (!inBattle()) return 0;
    return countSide("player") * FOOD_UPKEEP_PER_UNIT;
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
      return `Assault in ${secs}… toggle auto-spawn, then hold the line${upkeepBit}`;
    }
    if (!live) {
      return `Battle looping — toggle units to auto-spawn${upkeepBit}`;
    }
    if (playerCount >= FIELD_SOFT_CAP) {
      return `Field at capacity (${FIELD_SOFT_CAP}) — wait for space${upkeepBit}`;
    }
    if (enabled.length === 0) {
      return `No auto-train on — tap a unit to enable${upkeepBit}`;
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

    el.recruitList.innerHTML = "";
    for (const type of UNIT_TYPES) {
      const stats = playerUnitStats(type);
      const autoOn = !!state.autoSpawn[type.id];
      const isTraining = !!(training && training.typeId === type.id);
      const canQueue =
        live &&
        !training &&
        state.gold >= type.cost &&
        state.food >= type.foodCost &&
        playerCount < FIELD_SOFT_CAP;
      const pct =
        isTraining
          ? Math.min(100, (training.elapsed / training.duration) * 100)
          : 0;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.id = type.id;
      btn.className =
        "recruit-btn" +
        (autoOn ? " auto-on" : "") +
        (canQueue ? " affordable" : "") +
        (isTraining ? " training" : "");
      btn.setAttribute("aria-pressed", autoOn ? "true" : "false");
      btn.title = autoOn
        ? "Auto-train on — click to disable, Shift+click to queue one"
        : "Click to enable auto-train";
      btn.innerHTML =
        `<span class="cmd-portrait type-${type.id}" aria-hidden="true">${unitArt(type.id)}</span>` +
        `<span class="cmd-body">` +
        `<span class="item-name">${type.name}` +
        `<span class="auto-badge">${autoOn ? "AUTO" : "OFF"}</span></span>` +
        `<span class="item-meta">${type.blurb} · ${stats.maxHp} HP / ${stats.atk} ATK / ${stats.armor} ARM` +
        ` · ${trainDuration().toFixed(1)}s</span>` +
        `<span class="spawn-bar${isTraining ? " active" : ""}" aria-hidden="true">` +
        `<span class="spawn-bar-fill" style="width:${pct}%"></span></span>` +
        `</span>` +
        `<span class="item-cost">${formatCost(type)}</span>`;
      btn.addEventListener("click", (ev) => {
        if (ev.shiftKey) {
          if (startTraining(type.id)) renderHud();
          return;
        }
        toggleAutoSpawn(type.id);
      });
      el.recruitList.appendChild(btn);
    }
  }

  function renderBattlePanel() {
    const meta = waveMeta(state.wave);
    const eMax = enemyBaseMaxHp(state.wave);
    el.wavePreview.innerHTML =
      `<span class="enemy-name">${meta.name}</span>` +
      `<div class="wave-subtitle">${meta.boss ? "Boss wave" : "Assault"} · Destroy their keep</div>` +
      `Enemy keep ${eMax} HP · Your keep ${PLAYER_BASE_HP} HP` +
      `<br>Win bonus: <span class="item-cost">${format(winBonus(state.wave))} gold</span>` +
      `<br><span class="wave-demote-hint">Defeat: −${format(lossPenalty(state.wave).gold)} g / −${format(lossPenalty(state.wave).food)} f · −1 wave</span>`;

    if (el.loopStatus) {
      el.loopStatus.classList.remove("is-countdown");
      if (state.waveTransitioning) {
        el.loopStatus.textContent = "Resolving wave… next assault shortly";
      } else if (inCountdown()) {
        const secs = Math.ceil(state.battle.countdown);
        el.loopStatus.textContent = `Wave 1 begins in ${secs}…`;
        el.loopStatus.classList.add("is-countdown");
      } else if (inBattle()) {
        const enabled = enabledSpawnTypes().length;
        el.loopStatus.textContent =
          `Wave ${state.wave} continuous · ${enabled} auto-spawn type${enabled === 1 ? "" : "s"}`;
      } else {
        el.loopStatus.textContent = `Wave ${state.wave} continuous · preparing…`;
      }
    }

    renderBaseBars();
  }

  function syncFoodRateDisplay() {
    const net = netFoodPerSecond();
    el.fps.textContent = format(Math.abs(net));
    el.fpsPrefix.textContent = net < -0.05 ? "−" : "+";
    const pill = el.fps.closest(".resource-fps");
    if (pill) pill.classList.toggle("is-drain", net < -0.05);
  }

  function renderHud() {
    el.gold.textContent = format(state.gold);
    el.gps.textContent = format(state.goldPerSecond);
    el.food.textContent = format(state.food);
    syncFoodRateDisplay();
    el.wave.textContent = String(state.wave);
    el.clickPower.textContent = format(state.clickPower);
    el.foodClickPower.textContent = format(state.foodClickPower);
    renderUpgrades();
    renderSpawn();
    renderBattlePanel();
  }

  function syncResourceDisplays() {
    el.gold.textContent = format(state.gold);
    el.gps.textContent = format(state.goldPerSecond);
    el.food.textContent = format(state.food);
    syncFoodRateDisplay();
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

  el.clickBtn.addEventListener("click", () => {
    state.gold += state.clickPower;
    pulseResourceClick(el.clickBtn, state.clickPower, "gold");
    renderHud();
  });

  el.foodClickBtn.addEventListener("click", () => {
    state.food += state.foodClickPower;
    pulseResourceClick(el.foodClickBtn, state.foodClickPower, "food");
    renderHud();
  });

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
    if (!MUSIC_TRACKS.length || !el.musicVolume || !audio) return;

    let trackIndex = 0;
    let wantPlaying = true;

    const stored = localStorage.getItem(MUSIC_VOLUME_KEY);
    const initial =
      stored !== null && !Number.isNaN(Number(stored))
        ? Math.max(0, Math.min(100, Number(stored)))
        : Number(el.musicVolume.value) || 35;
    el.musicVolume.value = String(initial);
    audio.volume = initial / 100;
    wantPlaying = initial > 0;

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
      if (!wantPlaying || audio.volume <= 0) return;
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
      if (wantPlaying) tryPlay();
    });

    el.musicVolume.addEventListener("input", () => {
      const value = Number(el.musicVolume.value);
      audio.volume = value / 100;
      localStorage.setItem(MUSIC_VOLUME_KEY, String(value));
      wantPlaying = value > 0;
      if (wantPlaying) {
        tryPlay();
      } else {
        audio.pause();
      }
    });

    function unlockOnGesture() {
      if (!wantPlaying) return;
      tryPlay();
    }

    document.addEventListener("pointerdown", unlockOnGesture, { passive: true });
    document.addEventListener("keydown", unlockOnGesture);
    document.addEventListener("touchstart", unlockOnGesture, { passive: true });

    loadTrack(0);
    tryPlay();
  }

  const restored = loadSave();
  if (restored) {
    el.battleLog.innerHTML = "";
    appendLog("log-muted", `Restored save · Wave ${state.wave}`);
  } else {
    el.battleLog.innerHTML = "";
    appendLog(
      "log-muted",
      "Keep gold and food flowing — troops auto-spawn while the assault loops."
    );
  }
  startBattle();
  initMusic();
})();
