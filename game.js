(() => {
  "use strict";

  const HUD_MS = 100;
  const BATTLE_MS = 50;
  const MAX_UNITS_SIDE = 6;
  const PLAYER_BASE_HP = 120;
  const MELEE_RANGE = 6;
  const LANE_TARGET_Y = 18;
  const PLAYER_SPAWN_X = 14;
  const ENEMY_SPAWN_X = 86;
  const BASE_EDGE_PLAYER = 12;
  const BASE_EDGE_ENEMY = 88;
  const LANES = [48, 58, 68];

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
      id: "foragers",
      name: "Foraging Camp",
      desc: "+0.5 gold / sec",
      baseCost: 40,
      growth: 1.65,
      apply(state) {
        state.goldPerSecond += 0.5;
      },
    },
    {
      id: "smithy",
      name: "Village Smithy",
      desc: "+2 click, +0.25 / sec",
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
  ];

  const UNIT_TYPES = [
    {
      id: "spearman",
      name: "Spearman",
      cost: 20,
      hp: 28,
      atk: 5,
      spd: 5,
      armor: 1,
      atkCd: 0.55,
      blurb: "Cheap front-liner",
    },
    {
      id: "archer",
      name: "Archer",
      cost: 50,
      hp: 14,
      atk: 11,
      spd: 8,
      armor: 0,
      atkCd: 0.35,
      blurb: "Fast glass cannon",
    },
    {
      id: "knight",
      name: "Knight",
      cost: 120,
      hp: 45,
      atk: 13,
      spd: 4,
      armor: 3,
      atkCd: 0.7,
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
    wave: document.getElementById("wave-display"),
    clickPower: document.getElementById("click-power-display"),
    clickBtn: document.getElementById("click-btn"),
    upgradeList: document.getElementById("upgrade-list"),
    recruitList: document.getElementById("recruit-list"),
    spawnHint: document.getElementById("spawn-hint"),
    wavePreview: document.getElementById("wave-preview"),
    attackBtn: document.getElementById("attack-btn"),
    cooldown: document.getElementById("cooldown-display"),
    battleLog: document.getElementById("battle-log"),
    statusLabel: document.getElementById("battle-status-label"),
    playerBaseFill: document.getElementById("player-base-fill"),
    playerBaseText: document.getElementById("player-base-text"),
    enemyBaseFill: document.getElementById("enemy-base-fill"),
    enemyBaseText: document.getElementById("enemy-base-text"),
    basePlayer: document.getElementById("base-player"),
    baseEnemy: document.getElementById("base-enemy"),
    fieldUnits: document.getElementById("field-units"),
  };

  const state = {
    gold: 0,
    clickPower: 1,
    goldPerSecond: 0,
    upgradeLevels: { pickaxe: 0, foragers: 0, smithy: 0, weapons: 0, armor: 0, vitality: 0 },
    nextUnitId: 1,
    wave: 1,
    cooldownUntil: 0,
    battle: null,
    laneCursor: 0,
  };

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
    return { hp, atk, spd, armor, atkCd, boss };
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
    };
  }

  function dealDamage(attacker, defender) {
    return Math.max(1, attacker.atk - (defender.armor || 0));
  }

  function winBonus(wave) {
    return Math.floor(25 + 14 * wave);
  }

  function lossCooldownMs(wave) {
    return Math.min(20000, Math.floor(8000 + 400 * wave));
  }

  function cooldownRemaining() {
    return Math.max(0, state.cooldownUntil - Date.now());
  }

  function inBattle() {
    return !!(state.battle && state.battle.active);
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

  function spawnPlayerUnit(typeId) {
    if (!inBattle()) return;
    const type = unitType(typeId);
    if (!type) return;
    if (state.gold < type.cost) return;
    if (countSide("player") >= MAX_UNITS_SIDE) return;

    state.gold -= type.cost;
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
      x: PLAYER_SPAWN_X,
      y: nextLane(),
      attackCd: 0,
      boss: false,
    };
    state.battle.units.push(unit);
    mountToken(unit);
    renderHud();
  }

  function spawnEnemyUnit() {
    if (!inBattle()) return;
    if (countSide("enemy") >= MAX_UNITS_SIDE) return;

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

  function endBattle(won) {
    if (!state.battle || !state.battle.active) return;
    state.battle.active = false;

    if (won) {
      const bonus = winBonus(state.wave);
      state.gold += bonus;
      setStatus("Victory", "won");
      appendLog(
        "log-win",
        `Enemy keep destroyed! +${format(bonus)} gold. Wave ${state.wave + 1}.`
      );
      state.wave += 1;
    } else {
      const cd = lossCooldownMs(state.wave);
      state.cooldownUntil = Date.now() + cd;
      setStatus("Defeat", "lost");
      appendLog(
        "log-loss",
        `Your keep fell. Squad rests ${(cd / 1000).toFixed(0)}s. Gold kept.`
      );
    }

    setTimeout(() => {
      state.battle = null;
      el.fieldUnits.innerHTML = "";
      setStatus("Ready", null);
      renderHud();
    }, 900);

    renderHud();
  }

  function strikeUnit(attacker, target) {
    const dmg = dealDamage(attacker, target);
    target.hp -= dmg;
    attacker.attackCd = attacker.atkCdMax;
    lungeToken(attacker.id, attacker.side);
    flashToken(attacker.id, "attack");
    flashToken(target.id, "hit");
    spawnFloater(target.x, target.y, dmg, target.hp <= 0);
    updateTokenEl(target);
    if (target.hp <= 0) {
      markDead(target);
      appendLog("log-kill", `${attacker.name} fells ${target.name}!`);
    }
  }

  function battleTick(dt) {
    const b = state.battle;
    if (!b || !b.active) return;

    b.enemySpawnAt -= dt;
    if (b.enemySpawnAt <= 0) {
      spawnEnemyUnit();
      b.enemySpawnAt = enemySpawnInterval(state.wave);
    }

    const living = b.units.filter((u) => u.hp > 0);

    for (const unit of living) {
      unit.attackCd = Math.max(0, unit.attackCd - dt);
      const target = findTarget(unit);
      const dir = unit.side === "player" ? 1 : -1;
      const moveSpeed = unit.spd * 1.05;

      if (target && Math.abs(target.x - unit.x) <= MELEE_RANGE) {
        if (unit.attackCd <= 0) {
          strikeUnit(unit, target);
        }
      } else if (target) {
        const step = moveSpeed * dt;
        if (unit.x < target.x) unit.x = Math.min(unit.x + step, target.x - MELEE_RANGE * 0.5);
        else unit.x = Math.max(unit.x - step, target.x + MELEE_RANGE * 0.5);
        // ease toward target lane slightly
        if (Math.abs(unit.y - target.y) > 1) {
          unit.y += Math.sign(target.y - unit.y) * Math.min(8 * dt, Math.abs(target.y - unit.y));
        }
      } else {
        unit.x += dir * moveSpeed * dt;
        if (unit.side === "player") {
          unit.x = Math.min(unit.x, BASE_EDGE_ENEMY);
          if (unit.x >= BASE_EDGE_ENEMY - 1 && unit.attackCd <= 0) {
            b.enemyBase.hp -= unit.atk;
            unit.attackCd = unit.atkCdMax;
            lungeToken(unit.id, unit.side);
            spawnFloater(BASE_EDGE_ENEMY, unit.y, unit.atk, b.enemyBase.hp <= 0);
            if (b.enemyBase.hp <= 0) {
              b.enemyBase.hp = 0;
              renderBaseBars();
              endBattle(true);
              return;
            }
          }
        } else {
          unit.x = Math.max(unit.x, BASE_EDGE_PLAYER);
          if (unit.x <= BASE_EDGE_PLAYER + 1 && unit.attackCd <= 0) {
            b.playerBase.hp -= unit.atk;
            unit.attackCd = unit.atkCdMax;
            lungeToken(unit.id, unit.side);
            spawnFloater(BASE_EDGE_PLAYER, unit.y, unit.atk, b.playerBase.hp <= 0);
            if (b.playerBase.hp <= 0) {
              b.playerBase.hp = 0;
              renderBaseBars();
              endBattle(false);
              return;
            }
          }
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
    if (cooldownRemaining() > 0) return;

    const eMax = enemyBaseMaxHp(state.wave);
    state.battle = {
      active: true,
      playerBase: { hp: PLAYER_BASE_HP, maxHp: PLAYER_BASE_HP },
      enemyBase: { hp: eMax, maxHp: eMax },
      units: [],
      enemySpawnAt: 0.6,
    };
    state.laneCursor = 0;
    el.battleLog.innerHTML = "";
    appendLog(
      "log-muted",
      `Wave ${state.wave}: ${waveMeta(state.wave).name} — spawn troops!`
    );
    setStatus("Fighting", "fighting");
    el.fieldUnits.innerHTML = "";
    spawnEnemyUnit();
    renderHud();
  }

  function buyUpgrade(id) {
    const def = UPGRADES.find((u) => u.id === id);
    const cost = upgradeCost(def);
    if (state.gold < cost) return;
    state.gold -= cost;
    state.upgradeLevels[id] += 1;
    def.apply(state);
    renderHud();
  }

  function combatBonusText(def, level) {
    if (def.id === "weapons") return `+${Math.round(15 * level)}% ATK`;
    if (def.id === "armor") return `+${level} armor`;
    if (def.id === "vitality") return `+${Math.round(12 * level)}% HP`;
    return def.desc;
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
      btn.className = "shop-btn" + (state.gold >= cost ? " affordable" : "");
      btn.disabled = state.gold < cost;
      btn.innerHTML =
        `<span><span class="item-name">${def.name}</span>` +
        `<br><span class="item-meta">${meta}</span></span>` +
        `<span class="item-cost">${format(cost)} g</span>`;
      btn.addEventListener("click", () => buyUpgrade(def.id));
      el.upgradeList.appendChild(btn);
    }
  }

  function renderSpawn() {
    const live = inBattle();
    const playerCount = countSide("player");
    el.spawnHint.textContent = live
      ? `Field ${playerCount}/${MAX_UNITS_SIDE} — tap to spawn`
      : "Start a battle to spawn troops onto the field.";

    el.recruitList.innerHTML = "";
    for (const type of UNIT_TYPES) {
      const stats = playerUnitStats(type);
      const can =
        live &&
        state.gold >= type.cost &&
        playerCount < MAX_UNITS_SIDE;
      const btn = document.createElement("button");
      btn.dataset.id = type.id;
      btn.className = "recruit-btn" + (can ? " affordable" : "");
      btn.disabled = !can;
      btn.innerHTML =
        `<span class="cmd-portrait type-${type.id}" aria-hidden="true">${unitArt(type.id)}</span>` +
        `<span class="cmd-body">` +
        `<span class="item-name">${type.name}</span>` +
        `<span class="item-meta">${type.blurb} · ${stats.maxHp} HP / ${stats.atk} ATK / ${stats.armor} ARM</span>` +
        `</span>` +
        `<span class="item-cost">${format(type.cost)} g</span>`;
      btn.addEventListener("click", () => spawnPlayerUnit(type.id));
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
      `<br>Win bonus: <span class="item-cost">${format(winBonus(state.wave))} gold</span>`;

    const cd = cooldownRemaining();
    if (cd > 0 && !inBattle()) {
      el.cooldown.classList.remove("hidden");
      el.cooldown.textContent = `Recovering… ${(cd / 1000).toFixed(1)}s`;
    } else {
      el.cooldown.classList.add("hidden");
    }

    if (inBattle()) {
      el.attackBtn.disabled = true;
      el.attackBtn.textContent = "Battle Live";
    } else if (cd > 0) {
      el.attackBtn.disabled = true;
      el.attackBtn.textContent = "Keep Rebuilding";
    } else {
      el.attackBtn.disabled = false;
      el.attackBtn.textContent = "Start Battle";
    }

    renderBaseBars();
  }

  function renderHud() {
    el.gold.textContent = format(state.gold);
    el.gps.textContent = format(state.goldPerSecond);
    el.wave.textContent = String(state.wave);
    el.clickPower.textContent = format(state.clickPower);
    renderUpgrades();
    renderSpawn();
    renderBattlePanel();
  }

  el.clickBtn.addEventListener("click", () => {
    state.gold += state.clickPower;
    renderHud();
  });

  el.attackBtn.addEventListener("click", startBattle);

  let lastHud = Date.now();
  let lastBattle = Date.now();
  let hudAccum = 0;

  setInterval(() => {
    const now = Date.now();
    const dt = Math.min(0.1, (now - lastBattle) / 1000);
    lastBattle = now;

    hudAccum += dt;
    if (state.goldPerSecond > 0) {
      state.gold += state.goldPerSecond * dt;
    }

    if (inBattle()) {
      battleTick(dt);
      el.gold.textContent = format(state.gold);
      el.gps.textContent = format(state.goldPerSecond);
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
  }, BATTLE_MS);

  setStatus("Ready", null);
  renderHud();
})();
