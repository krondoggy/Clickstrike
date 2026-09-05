import { FACTIONS, UNITS, UNIT_MAP, RESEARCH, SPELLS, WAVE_INTERVAL, DAMAGE_MULTIPLIERS } from './data.js';

const STEP = 0.1;
const MAX_UNITS = 180;
const MAX_GOLD = 99999;
const valid = n => typeof n === 'number' && Number.isFinite(n);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const other = team => team === 'player' ? 'enemy' : 'player';
const ok = message => ({ ok: true, message });
const fail = message => ({ ok: false, message });
const levels = () => ({ weapons: 0, armor: 0, mines: 0, barracks: 0, tier: 0 });
const basics = faction => UNITS.filter(u => u.faction === faction && u.tier === 1);
const armySupply = roster => roster.reduce((sum, r) => sum + UNIT_MAP[r.unitId].supply, 0);

export function createGame({ faction = 'alliance', difficulty = 'normal', seed = 42 } = {}) {
  if (!FACTIONS.some(f => f.id === faction)) throw new Error('Choose a valid faction.');
  if (!['easy', 'normal', 'hard'].includes(difficulty)) difficulty = 'normal';
  seed = Number.isFinite(seed) ? Math.trunc(seed) : 42;
  const enemyFaction = FACTIONS[(FACTIONS.findIndex(f => f.id === faction) + 1 + (Math.abs(Math.trunc(seed)) % 2)) % 3].id;
  const state = {
    version: 2, faction, enemyFaction, difficulty, status: 'preparation', paused: false, speed: 1,
    time: 0, wave: 0, nextWave: WAVE_INTERVAL, gold: 280, income: 7, supply: 0, supplyCap: 24, tier: 1, mineLevel: 0,
    research: levels(), roster: [], enemyRoster: [], units: [], structures: [], effects: [], events: [], control: 0,
    stats: { kills: 0, losses: 0, damage: 0, goldEarned: 0, waves: 0, peakUnits: 0 },
    spellCooldowns: Object.fromEntries(SPELLS.map(s => [s.id, 0])),
    enemy: { gold: 280, income: 7, tier: 1, mineLevel: 0, supplyCap: 24, research: levels(), spent: 0, goldEarned: 0, plan: null },
    seed: (Number.isFinite(seed) ? Math.trunc(seed) : 42) >>> 0, nextId: 1, accumulator: 0, aiTimer: 2,
  };
  const id = prefix => `${prefix}${state.nextId++}`;
  for (const team of ['player', 'enemy']) {
    const sign = team === 'player' ? -1 : 1;
    state.structures.push({ id: `${team}-castle`, team, kind: 'castle', x: sign * 44, z: 0, hp: 8500, maxHp: 8500, cooldown: 0 });
    for (const z of [-7, 7]) state.structures.push({ id: `${team}-tower-${z}`, team, kind: 'tower', x: sign * 35, z, hp: 1800, maxHp: 1800, cooldown: 0 });
    const roster = team === 'player' ? state.roster : state.enemyRoster;
    basics(team === 'player' ? faction : enemyFaction).forEach((u, i) => roster.push({ id: id('r'), unitId: u.id, row: i === 0 ? 2 : i === 1 ? 3 : 4, col: u.role === 'ranged' ? 1 : 4 }));
  }
  state.supply = armySupply(state.roster);
  return makeEngine(state);
}

function makeEngine(state) {
  const id = prefix => `${prefix}${state.nextId++}`;
  const random = () => {
    state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
    return state.seed / 4294967296;
  };
  const note = (text, type = 'info') => {
    state.events.unshift({ id: id('e'), text, type, time: state.time });
    state.events.length = Math.min(state.events.length, 12);
  };
  const effect = (type, source, target = source, life = 0.55) => {
    if (state.effects.length >= 160) state.effects.shift();
    state.effects.push({ id: id('fx'), type, x: source.x, z: source.z, tx: target.x, tz: target.z, team: source.team || 'player', life, maxLife: life });
  };
  const getResearchCost = (key, team = 'player') => {
    const r = RESEARCH.find(r => r.id === key);
    if (!r) return Infinity;
    const lv = (team === 'player' ? state.research : state.enemy.research)[key];
    return lv >= r.maxLevel ? Infinity : Math.round(r.baseCost * 1.65 ** lv);
  };
  const available = () => ['preparation', 'playing'].includes(state.status);
  const getRoster = team => team === 'player' ? state.roster : state.enemyRoster;
  const buy = (unitId, team = 'player') => {
    if (!available()) return fail('This battle has ended. Start a new campaign.');
    const u = UNIT_MAP[unitId];
    const wallet = team === 'player' ? state : state.enemy;
    const roster = getRoster(team);
    if (!u || u.faction !== (team === 'player' ? state.faction : state.enemyFaction)) return fail('This unit belongs to another faction.');
    if (u.tier > wallet.tier) return fail(`Requires Citadel Age ${u.tier}.`);
    if (wallet.gold < u.cost) return fail(`Need ${Math.ceil(u.cost - wallet.gold)} more gold.`);
    if (armySupply(roster) + u.supply > wallet.supplyCap) return fail('Supply limit reached. Upgrade your War Camp.');
    if (roster.length >= 30) return fail('All 30 formation positions are occupied.');
    if (u.hero && roster.some(r => r.unitId === unitId)) return fail('Only one hero may lead your army.');
    const preferred = ['frontline', 'cavalry', 'hero'].includes(u.role) ? [4, 3, 2, 1, 0] : u.role === 'siege' ? [0, 1, 2, 3, 4] : [1, 0, 2, 3, 4];
    let position;
    for (const col of preferred) {
      for (const row of [2, 3, 1, 4, 0, 5]) if (!roster.some(r => r.row === row && r.col === col)) { position = { row, col }; break; }
      if (position) break;
    }
    if (!position) return fail('Your formation is full.');
    wallet.gold -= u.cost;
    if (team === 'enemy') state.enemy.spent += u.cost;
    roster.push({ id: id('r'), unitId, ...position });
    if (team === 'player') { state.supply = armySupply(roster); note(`${u.name} joins every future wave.`, 'recruit'); }
    return ok(`${u.name} recruited. Reinforcements arrive next wave.`);
  };
  const research = (key, team = 'player') => {
    if (!available()) return fail('This battle has ended.');
    const def = RESEARCH.find(r => r.id === key);
    if (!def) return fail('Unknown research.');
    const wallet = team === 'player' ? state : state.enemy;
    const lv = wallet.research[key];
    if (lv >= def.maxLevel) return fail('Already fully researched.');
    const cost = getResearchCost(key, team);
    if (wallet.gold < cost) return fail(`Need ${Math.ceil(cost - wallet.gold)} more gold.`);
    wallet.gold -= cost;
    if (team === 'enemy') state.enemy.spent += cost;
    wallet.research[key]++;
    wallet.tier = 1 + wallet.research.tier;
    wallet.mineLevel = wallet.research.mines;
    wallet.supplyCap = 24 + wallet.research.barracks * 12;
    updateEconomy(0);
    if (team === 'player') note(`${def.name} upgraded to ${wallet.research[key]}.`, 'upgrade');
    return ok(`${def.name} upgraded.`);
  };
  const spawn = (unitId, team, x, z, summonedBy = null) => {
    if (state.units.length >= MAX_UNITS || state.units.filter(u => u.team === team && u.hp > 0).length >= MAX_UNITS / 2) return null;
    const def = UNIT_MAP[unitId];
    const tech = team === 'player' ? state.research : state.enemy.research;
    const level = def.hero ? 1 + Math.floor((state.wave - 1) / 5) : 1;
    const maxHp = Math.round(def.hp * (1 + tech.armor * 0.08) * (def.hero ? 1 + (level - 1) * 0.12 : 1) * (summonedBy ? 0.48 : 1));
    const u = {
      id: id('u'), unitId, team, x, z, hp: maxHp, maxHp, damage: def.damage * (1 + tech.weapons * 0.12) * (def.hero ? 1 + (level - 1) * 0.1 : 1),
      armor: def.armor + tech.armor * 2, range: def.range, speed: def.speed * (def.faction === 'horde' ? 1.08 : 1), attackSpeed: def.attackSpeed,
      cooldown: 0.15 + random() * 0.4, targetId: null, action: 'walk', attackFlash: 0, hitFlash: 0, heading: team === 'player' ? Math.PI / 2 : -Math.PI / 2,
      hero: def.hero, level, shield: 0, abilityCooldown: def.abilityId === 'raise' ? 8 : 1 + random() * 2, attacks: 0, age: 0,
      poison: 0, poisonTime: 0, poisonTeam: null, curseTime: 0, slowTime: 0, slowAmount: 0, stunTime: 0, hasteTime: 0, rallyTime: 0,
      resurrected: false, summonedBy, lifespan: summonedBy ? 22 : null,
    };
    state.units.push(u);
    state.stats.peakUnits = Math.max(state.stats.peakUnits, state.units.length);
    return u;
  };
  const wave = () => {
    state.wave++;
    state.stats.waves = state.wave;
    state.nextWave += WAVE_INTERVAL;
    // Alternate spawning order so the global render budget never favors one side.
    for (const team of state.wave % 2 ? ['player', 'enemy'] : ['enemy', 'player']) {
      const sign = team === 'player' ? -1 : 1;
      for (const r of getRoster(team)) spawn(r.unitId, team, sign * (33 - r.col * 2.4), -7.5 + r.row * 3);
    }
    note(`Wave ${state.wave} · both armies reinforce.`, 'wave');
    if (state.wave === 20) note('The siege intensifies. All damage to structures is increasing.', 'warning');
  };
  const heal = (u, amount) => {
    if (u.hp <= 0) return;
    u.hp = Math.min(u.maxHp, u.hp + amount * (UNIT_MAP[u.unitId].faction === 'alliance' ? 1.15 : 1));
  };
  const hurt = (target, amount, sourceTeam, attackType = 'normal', source = null) => {
    if (target.hp <= 0) return 0;
    const isStructure = !!target.kind;
    const def = isStructure ? null : UNIT_MAP[target.unitId];
    const armorClass = isStructure ? 'fortified' : def.armorType;
    let armor = isStructure ? (target.kind === 'castle' ? 5 : 4) : target.armor;
    if (!isStructure && state.units.some(u => u.team === target.team && u.hp > 0 && u.unitId === 'paladin' && distance(u, target) < 7)) armor += 2;
    let damage = amount * (DAMAGE_MULTIPLIERS[attackType]?.[armorClass] ?? 1) / (1 + Math.max(0, armor) * 0.055);
    if (isStructure) damage *= 1 + Math.max(0, state.time - 475) / 100;
    if (source && !source.kind && source.range > 3 && def?.abilityId === 'shieldwall') damage *= 0.78;
    if (!isStructure && target.shield > 0) { const absorbed = Math.min(target.shield, damage); target.shield -= absorbed; damage -= absorbed; }
    const dealt = Math.min(target.hp, damage);
    target.hp -= damage;
    target.hitFlash = 1;
    if (sourceTeam === 'player') state.stats.damage += dealt;
    if (target.hp <= 0 && !isStructure) {
      if (def.abilityId === 'unbroken' && !target.resurrected && !target.summonedBy) {
        target.hp = target.maxHp * 0.35; target.resurrected = true; target.stunTime = 0.6;
        effect('magic', target, target, 0.7);
      } else {
        target.hp = 0; target.action = 'dead';
        if (!target.summonedBy) { if (target.team === 'enemy') state.stats.kills++; else state.stats.losses++; }
      }
    } else if (target.hp <= 0 && isStructure) {
      target.hp = 0; effect('explosion', target, target, 1.4);
      note(`${target.team === 'enemy' ? 'Enemy' : 'Your'} ${target.kind} destroyed!`, target.team === 'enemy' ? 'success' : 'warning');
    }
    return dealt;
  };
  const poison = (target, dps, duration, team) => {
    if (target.kind || target.hp <= 0) return;
    target.poison = Math.max(target.poison, dps); target.poisonTime = duration; target.poisonTeam = team;
  };
  const nearby = (source, team, radius) => state.units.filter(u => u.hp > 0 && u.team === team && distance(source, u) <= radius);
  const useAbility = (u, target, dt) => {
    const def = UNIT_MAP[u.unitId];
    u.abilityCooldown -= dt;
    if (def.abilityId === 'plague') for (const v of nearby(u, other(u.team), 3.5)) if (UNIT_MAP[v.unitId].role !== 'flying') hurt(v, 8 * dt, u.team, 'magic');
    if (u.abilityCooldown > 0) return;
    if (def.abilityId === 'renewal') {
      const wounded = nearby(u, u.team, 11).filter(v => v.hp < v.maxHp - 30).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (wounded) { heal(wounded, 65); effect('heal', u, wounded, 0.8); u.abilityCooldown = 4; }
    } else if (def.abilityId === 'bloodlust' && target) {
      const allies = nearby(u, u.team, 10).filter(v => v !== u).sort((a, b) => b.damage - a.damage).slice(0, 4);
      if (allies.length) { for (const v of allies) v.hasteTime = 7; effect('rally', u, u, 1); u.abilityCooldown = 8; }
    } else if (def.abilityId === 'raise' && target && distance(u, target) < 14) {
      if (state.units.filter(v => v.summonedBy === u.id && v.hp > 0).length <= 2) {
        for (const offset of [-1, 1]) spawn('skeleton', u.team, u.x + (u.team === 'player' ? 2 : -2), clamp(u.z + offset, -13, 13), u.id);
        effect('magic', u, u, 0.9);
      }
      u.abilityCooldown = 12;
    } else if (def.abilityId === 'stomp' && target && distance(u, target) < 4) {
      for (const v of nearby(u, other(u.team), 4)) { hurt(v, 55, u.team, 'magic'); v.stunTime = 1; }
      effect('explosion', u, u, 0.65); u.abilityCooldown = 6;
    } else if (def.abilityId === 'beacon') {
      const allies = nearby(u, u.team, 6).filter(v => v.hp < v.maxHp - 15);
      if (allies.length) { for (const v of allies) heal(v, 55); effect('heal', u, u, 1); u.abilityCooldown = 7; }
    } else if (def.abilityId === 'embrace' && target && distance(u, target) < 7) {
      for (const v of nearby(u, u.team, 5.5)) heal(v, 40);
      for (const v of nearby(u, other(u.team), 5.5)) hurt(v, 35, u.team, 'magic');
      effect('magic', u, u, 1); u.abilityCooldown = 6;
    }
  };
  const attack = (u, target) => {
    const def = UNIT_MAP[u.unitId];
    const targetDef = target.kind ? null : UNIT_MAP[target.unitId];
    let damage = u.damage * (u.curseTime > 0 ? 0.78 : 1);
    u.attacks++;
    if (def.abilityId === 'fury' && u.hp < u.maxHp / 2) damage *= 1.35;
    if (def.abilityId === 'brace' && targetDef?.role === 'cavalry') damage *= 1.55;
    if (def.abilityId === 'skyhunter' && targetDef?.role === 'flying') damage *= 1.35;
    if (def.abilityId === 'web' && targetDef?.role === 'flying') { damage *= 1.3; target.slowTime = 3; target.slowAmount = 0.6; }
    if (def.abilityId === 'charge' && u.attacks === 1) { damage *= 1.9; if (!target.kind) target.stunTime = 1; }
    if (def.abilityId === 'bladestorm' && u.attacks % 3 === 0) damage *= 1.8;
    const dealt = hurt(target, damage, u.team, def.attackType, u);
    if (def.abilityId === 'ravenous' && !target.kind) heal(u, dealt * 0.24);
    if (def.abilityId === 'venom') poison(target, 5, 5, u.team);
    if (def.abilityId === 'sting') poison(target, 9, 6, u.team);
    if (def.abilityId === 'pitch') poison(target, 6, 5, u.team);
    if (def.abilityId === 'curse' && !target.kind) target.curseTime = 6;
    if (def.abilityId === 'net' && !target.kind && u.abilityCooldown <= 0) { target.stunTime = 2; u.abilityCooldown = 5; effect('magic', u, target); }
    const splash = ['splash', 'pitch', 'thunder', 'cleave', 'frost'].includes(def.abilityId) || (def.abilityId === 'bladestorm' && u.attacks % 3 === 0);
    if (splash) {
      const radius = def.abilityId === 'splash' ? 3.5 : 3;
      for (const v of nearby(target, other(u.team), radius)) {
        const splashScale = def.abilityId === 'splash' ? 0.55 : ['thunder', 'frost'].includes(def.abilityId) ? 0.4 : 0.45;
        if (v !== target && (def.canHitAir || UNIT_MAP[v.unitId].role !== 'flying')) hurt(v, damage * splashScale, u.team, def.attackType, u);
        if (def.abilityId === 'frost') { v.slowTime = 3; v.slowAmount = 0.35; }
      }
      if (def.role === 'siege') effect('explosion', target, target, 0.65);
    }
    if (def.abilityId === 'chain' && u.attacks % 3 === 0) {
      for (const v of nearby(target, other(u.team), 5).filter(v => v !== target).slice(0, 2)) { hurt(v, damage * 0.55, u.team, 'magic', u); effect('lightning', target, v, 0.4); }
    }
    effect(u.range <= 3 ? 'slash' : def.attackType === 'magic' ? 'magic' : 'arrow', u, target, u.range <= 3 ? 0.25 : 0.45);
    u.cooldown = u.attackSpeed / (1 + (u.hasteTime > 0 ? 0.3 : 0) + (u.rallyTime > 0 ? 0.35 : 0));
    u.action = 'attack'; u.attackFlash = 1;
  };
  const updateEconomy = dt => {
    const shrineBonus = state.control > 0.7 ? 1.8 : 0;
    state.income = 7 + state.mineLevel * 2.2 + shrineBonus;
    state.enemy.income = 7 + state.enemy.mineLevel * 2.2 + (state.control < -0.7 ? 1.8 : 0);
    state.gold = Math.min(MAX_GOLD, state.gold + state.income * dt);
    state.enemy.gold = Math.min(MAX_GOLD, state.enemy.gold + state.enemy.income * dt);
    state.stats.goldEarned += state.income * dt;
    state.enemy.goldEarned += state.enemy.income * dt;
  };
  const ai = () => {
    const wallet = state.enemy;
    const roster = state.enemyRoster;
    const strength = armySupply(roster);
    const desiredMines = Math.min(state.difficulty === 'easy' ? 2 : 4, Math.floor(state.time / 85) + 1);
    // Identical prices, income, supply, recruitment and upgrade rules to the player.
    if (wallet.mineLevel < desiredMines && strength >= 9) return research('mines', 'enemy');
    if (wallet.tier < 3 && state.time > (wallet.tier === 1 ? 75 : 225) && strength >= (wallet.tier === 1 ? 13 : 25)) return research('tier', 'enemy');
    if (strength >= wallet.supplyCap - 3 && wallet.research.barracks < 4) return research('barracks', 'enemy');
    if (wallet.plan) {
      const planned = UNIT_MAP[wallet.plan];
      if (!planned || planned.supply + strength > wallet.supplyCap || roster.length >= 30 || (planned.hero && roster.some(r => r.unitId === planned.id))) wallet.plan = null;
      else {
        const purchase = buy(wallet.plan, 'enemy');
        if (purchase.ok) wallet.plan = null;
        return purchase;
      }
    }
    if (strength >= 22 && state.time > 180) {
      const upgrade = wallet.research.weapons <= wallet.research.armor ? 'weapons' : 'armor';
      if (wallet.research[upgrade] < Math.min(3, Math.floor(state.time / 150)) && wallet.gold >= getResearchCost(upgrade, 'enemy') && random() < 0.45) return research(upgrade, 'enemy');
    }
    const candidates = UNITS.filter(u => u.faction === state.enemyFaction && u.tier <= wallet.tier && u.supply + strength <= wallet.supplyCap && (!u.hero || !roster.some(r => r.unitId === u.id)));
    if (!candidates.length) return;
    const playerUnits = state.roster.map(r => UNIT_MAP[r.unitId]);
    const roleCount = role => roster.filter(r => UNIT_MAP[r.unitId].role === role).length;
    const scores = candidates.map(u => {
      let score = random() * (state.difficulty === 'easy' ? 4 : 1.7) + 1;
      const count = roster.filter(r => r.unitId === u.id).length;
      score -= count * 0.35;
      if (u.role === 'frontline' && roleCount('frontline') < roster.length * 0.38) score += 2.4;
      if (u.role === 'support' && roleCount('support') < roster.length * 0.16) score += 2;
      if (u.hero) score += 2.8;
      if (u.tier === 3 && count === 0) score += 1.4;
      if (u.role === 'siege' && roleCount('siege') < Math.floor(state.time / 180)) score += 2;
      if (state.difficulty !== 'easy') {
        if (u.attackType === 'magic') score += playerUnits.filter(p => p.armorType === 'heavy').length * 0.18;
        if (u.canHitAir) score += playerUnits.filter(p => p.role === 'flying').length * 0.5;
        if (u.role === 'cavalry') score += playerUnits.filter(p => ['support', 'ranged'].includes(p.role)).length * 0.14;
      }
      return { u, score };
    }).sort((a, b) => b.score - a.score);
    wallet.plan = scores[0].u.id;
    if (buy(wallet.plan, 'enemy').ok) wallet.plan = null;
  };
  const tick = dt => {
    state.time += dt;
    state.nextWave -= dt;
    if (state.nextWave <= 0.00001) wave();
    for (const key of Object.keys(state.spellCooldowns)) state.spellCooldowns[key] = Math.max(0, state.spellCooldowns[key] - dt);
    state.aiTimer -= dt;
    if (state.aiTimer <= 0) { ai(); state.aiTimer = state.difficulty === 'easy' ? 6 : state.difficulty === 'hard' ? 1.5 : 3; }
    state.effects = state.effects.filter(e => (e.life -= dt) > 0);
    const living = state.units.filter(u => u.hp > 0);
    const byId = new Map([...living, ...state.structures].map(u => [u.id, u]));
    // Cache enemy teams once per step; the bounded unit budget keeps targeting predictable.
    const teams = { player: living.filter(u => u.team === 'player'), enemy: living.filter(u => u.team === 'enemy') };
    for (const u of living) {
      if (u.hp <= 0) continue;
      const def = UNIT_MAP[u.unitId];
      u.age += dt; u.attackFlash = Math.max(0, u.attackFlash - dt * 3.5); u.hitFlash = Math.max(0, u.hitFlash - dt * 4);
      for (const key of ['curseTime', 'slowTime', 'stunTime', 'hasteTime', 'rallyTime']) u[key] = Math.max(0, u[key] - dt);
      if (u.rallyTime <= 0) u.shield = 0;
      if (u.lifespan !== null && u.age >= u.lifespan) { u.hp = 0; u.action = 'dead'; continue; }
      if (u.poisonTime > 0) { u.poisonTime = Math.max(0, u.poisonTime - dt); hurt(u, u.poison * dt, u.poisonTeam, 'magic'); } else u.poison = 0;
      if (u.hp <= 0) continue;
      if (def.faction === 'undead') heal(u, u.maxHp * 0.0035 * dt);
      u.cooldown = Math.max(0, u.cooldown - dt);
      if (u.stunTime > 0) { u.action = 'idle'; continue; }
      let target = byId.get(u.targetId);
      if (!target || target.hp <= 0 || target.team === u.team || (!target.kind && !def.canHitAir && UNIT_MAP[target.unitId].role === 'flying') || distance(u, target) > 19) target = null;
      if (!target || target.kind) {
        let nearest = 18;
        for (const v of teams[other(u.team)]) {
          if (v.hp <= 0 || (!def.canHitAir && UNIT_MAP[v.unitId].role === 'flying')) continue;
          const d = distance(u, v);
          if (d < nearest) { nearest = d; target = v; }
        }
      }
      if (!target) target = state.structures.filter(s => s.team !== u.team && s.hp > 0).sort((a, b) => distance(u, a) - distance(u, b))[0];
      u.targetId = target?.id || null;
      useAbility(u, target, dt);
      if (u.hp <= 0 || !target || target.hp <= 0) { u.action = 'idle'; continue; }
      const dx = target.x - u.x, dz = target.z - u.z, d = Math.hypot(dx, dz);
      u.heading = Math.atan2(dx, dz);
      const reach = u.range + (target.kind ? (target.kind === 'castle' ? 3 : 1.2) : 0.45);
      if (d <= reach) { u.action = 'attack'; if (u.cooldown <= 0) attack(u, target); }
      else {
        const movement = u.speed * dt * (u.slowTime > 0 ? 1 - u.slowAmount : 1);
        if (d > 0) { u.x += dx / d * Math.min(movement, d - reach + 0.05); u.z += dz / d * Math.min(movement, d - reach + 0.05); }
        u.action = 'walk';
      }
    }
    // Gentle separation preserves individual silhouettes without preventing melee contact.
    for (const team of ['player', 'enemy']) {
      const units = teams[team];
      for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
        const a = units[i], b = units[j];
        if (a.hp <= 0 || b.hp <= 0 || (UNIT_MAP[a.unitId].role === 'flying') !== (UNIT_MAP[b.unitId].role === 'flying')) continue;
        const dx = b.x - a.x, dz = b.z - a.z;
        if (Math.abs(dx) > 1.15 || Math.abs(dz) > 1.15) continue;
        const d = Math.hypot(dx, dz);
        if (d < 1.1) {
          const push = (1.1 - d) * 0.22;
          const nx = d < 0.001 ? 0 : dx / d, nz = d < 0.001 ? (i % 2 ? 1 : -1) : dz / d;
          a.x -= nx * push; a.z = clamp(a.z - nz * push, -14, 14); b.x += nx * push; b.z = clamp(b.z + nz * push, -14, 14);
        }
      }
    }
    for (const tower of state.structures) {
      if (tower.hp <= 0) continue;
      tower.cooldown = Math.max(0, tower.cooldown - dt);
      const range = tower.kind === 'castle' ? 15 : 13;
      const target = teams[other(tower.team)].filter(u => u.hp > 0 && distance(u, tower) <= range).sort((a, b) => distance(a, tower) - distance(b, tower))[0];
      if (target && tower.cooldown <= 0) { hurt(target, tower.kind === 'castle' ? 74 : 58, tower.team, 'magic', tower); effect('magic', tower, target, 0.5); tower.cooldown = tower.kind === 'castle' ? 1 : 1.2; }
    }
    state.units = state.units.filter(u => u.hp > 0);
    const influence = { player: 0, enemy: 0 };
    for (const u of state.units) if (!u.summonedBy && Math.abs(u.x) < 8 && Math.abs(u.z) < 9) influence[u.team] += UNIT_MAP[u.unitId].supply;
    const pressure = influence.player - influence.enemy;
    const previous = state.control;
    if (pressure) state.control = clamp(state.control + Math.sign(pressure) * dt * 0.1 * Math.min(2, Math.abs(pressure) / 4), -1, 1);
    if (previous <= 0.7 && state.control > 0.7) note('Sunwell secured · +1.8 gold per second.', 'success');
    if (previous >= -0.7 && state.control < -0.7) note('The enemy controls the Sunwell.', 'warning');
    updateEconomy(dt);
    const playerCastle = state.structures.find(s => s.id === 'player-castle');
    const enemyCastle = state.structures.find(s => s.id === 'enemy-castle');
    // At 12 minutes the unstable Sunwell tears at both castles, ending even a perfect stalemate.
    if (state.time >= 720) {
      for (const castle of [playerCastle, enemyCastle]) if (castle.hp > 0) castle.hp = Math.max(0, castle.hp - dt * castle.maxHp * (1 / 150 + (castle.team === 'player' ? -1 : 1) * state.control / 900));
      if (state.time - dt < 720) note('Sudden death · the Sunwell fractures both castles. Hold the center to slow the damage.', 'warning');
    }
    if (playerCastle.hp <= 0 || enemyCastle.hp <= 0) {
      state.status = enemyCastle.hp <= 0 && playerCastle.hp > 0 ? 'victory' : 'defeat';
      state.paused = false;
      note(state.status === 'victory' ? 'Victory! The enemy citadel has fallen.' : 'Defeat. Your citadel has fallen.', state.status === 'victory' ? 'success' : 'warning');
    }
  };
  return {
    state,
    update(dt) {
      if (state.status !== 'playing' || state.paused || !valid(dt) || dt <= 0) return;
      state.accumulator += Math.min(dt, 60);
      while (state.accumulator + 1e-8 >= STEP && state.status === 'playing') { state.accumulator -= STEP; tick(STEP); }
      state.accumulator = Math.max(0, state.accumulator);
    },
    recruit: unitId => buy(unitId),
    sell(rosterId) {
      if (!available()) return fail('This battle has ended.');
      const i = state.roster.findIndex(r => r.id === rosterId);
      if (i < 0) return fail('Select a unit in your formation.');
      const [r] = state.roster.splice(i, 1);
      const refund = Math.floor(UNIT_MAP[r.unitId].cost * 0.7);
      state.gold += refund; state.supply = armySupply(state.roster);
      note(`${UNIT_MAP[r.unitId].name} dismissed · ${refund} gold refunded.`, 'info');
      return ok(`Dismissed for ${refund} gold. Deployed units finish the current battle.`);
    },
    move(rosterId, row, col) {
      if (!available()) return fail('This battle has ended.');
      if (!Number.isInteger(row) || row < 0 || row > 5 || !Number.isInteger(col) || col < 0 || col > 4) return fail('Choose a position inside the formation.');
      const r = state.roster.find(r => r.id === rosterId);
      if (!r) return fail('Select a unit in your formation.');
      const occupant = state.roster.find(v => v !== r && v.row === row && v.col === col);
      if (occupant) { occupant.row = r.row; occupant.col = r.col; }
      r.row = row; r.col = col;
      return ok('Formation updated for the next wave.');
    },
    research: key => research(key),
    getResearchCost,
    cast(spellId, x = 0, z = 0) {
      if (state.status !== 'playing') return fail('Spells become available when the battle begins.');
      if (state.paused) return fail('Resume the battle to cast a spell.');
      const spell = SPELLS.find(s => s.id === spellId);
      if (!spell) return fail('Unknown spell.');
      if (!valid(x) || !valid(z) || Math.abs(x) > 50 || Math.abs(z) > 18) return fail('Choose a target on the battlefield.');
      if (state.spellCooldowns[spellId] > 0) return fail(`Ready in ${Math.ceil(state.spellCooldowns[spellId])} seconds.`);
      if (state.gold < spell.cost) return fail(`Need ${Math.ceil(spell.cost - state.gold)} more gold.`);
      const source = { x, z, team: 'player' };
      const targets = nearby(source, spellId === 'meteor' ? 'enemy' : 'player', spell.radius);
      if (spellId !== 'meteor' && !targets.length) return fail('No allied units in that area.');
      state.gold -= spell.cost; state.spellCooldowns[spellId] = spell.cooldown;
      if (spellId === 'meteor') {
        for (const u of targets) hurt(u, 145, 'player', 'magic');
        for (const s of state.structures) if (s.team === 'enemy' && s.hp > 0 && distance(source, s) <= spell.radius) hurt(s, 75, 'player', 'magic');
        effect('meteor', source, source, 1.4);
      } else if (spellId === 'mend') { for (const u of targets) heal(u, 150); effect('heal', source, source, 1.3); }
      else { for (const u of targets) { u.rallyTime = 10; u.shield = Math.max(u.shield, 70); } effect('rally', source, source, 1.3); }
      note(`${spell.name} cast.`, 'spell');
      return ok(`${spell.name}!`);
    },
    start() {
      if (state.status !== 'preparation') return fail('The battle has already begun.');
      state.status = 'playing'; state.nextWave = 0; wave();
      note('Take the Sunwell. Break their defenses. Destroy the enemy citadel.', 'info');
      return ok('The battle begins.');
    },
    setSpeed(n) { if (![1, 1.5, 2, 3].includes(n)) return fail('Choose 1×, 1.5×, 2× or 3× speed.'); state.speed = n; return ok(); },
    togglePause() { if (state.status !== 'playing') return fail('No active battle to pause.'); state.paused = !state.paused; return ok(state.paused ? 'Battle paused.' : 'Battle resumed.'); },
    serialize() { return JSON.stringify(state); },
  };
}

export function restoreGame(json) {
  let s;
  try { s = typeof json === 'string' ? JSON.parse(json) : structuredClone(json); } catch { throw new Error('This save is not valid JSON.'); }
  const reject = () => { throw new Error('This save is incompatible or damaged. Start a new campaign.'); };
  if (!s || s.version !== 2 || !FACTIONS.some(f => f.id === s.faction) || !FACTIONS.some(f => f.id === s.enemyFaction) || s.faction === s.enemyFaction) reject();
  if (!['preparation', 'playing', 'victory', 'defeat'].includes(s.status) || !['easy', 'normal', 'hard'].includes(s.difficulty)) reject();
  const number = (n, lo, hi) => valid(n) && n >= lo && n <= hi;
  const integer = (n, lo, hi) => Number.isInteger(n) && number(n, lo, hi);
  if (!number(s.time, 0, 100000) || !integer(s.wave, 0, 4001) || !number(s.nextWave, 0, 25.001) || !number(s.gold, 0, MAX_GOLD) || !number(s.control, -1, 1) || !integer(s.seed, 0, 4294967295) || !integer(s.nextId, 1, 100000000)) reject();
  if (typeof s.paused !== 'boolean' || ![1, 1.5, 2, 3].includes(s.speed) || !number(s.accumulator, 0, 60) || !number(s.aiTimer, -0.2, 6.1)) reject();
  for (const wallet of [s, s.enemy]) {
    if (!wallet || !wallet.research || !number(wallet.gold, 0, MAX_GOLD) || !number(wallet.income, 0, 30)) reject();
    for (const r of RESEARCH) if (!integer(wallet.research[r.id], 0, r.maxLevel)) reject();
    if (wallet.tier !== wallet.research.tier + 1 || wallet.mineLevel !== wallet.research.mines || wallet.supplyCap !== 24 + 12 * wallet.research.barracks) reject();
  }
  const ids = new Set();
  const unique = obj => {
    if (!obj || typeof obj.id !== 'string' || obj.id.length > 50 || ids.has(obj.id)) reject();
    const sequence = /^(?:r|u|e|fx)(\d+)$/.exec(obj.id);
    if (sequence && Number(sequence[1]) >= s.nextId) reject();
    ids.add(obj.id);
  };
  for (const [roster, faction, cap] of [[s.roster, s.faction, s.supplyCap], [s.enemyRoster, s.enemyFaction, s.enemy.supplyCap]]) {
    if (!Array.isArray(roster) || roster.length > 30) reject();
    const cells = new Set(), heroes = new Set();
    for (const r of roster) {
      unique(r);
      if (!UNIT_MAP[r.unitId] || UNIT_MAP[r.unitId].faction !== faction || !integer(r.row, 0, 5) || !integer(r.col, 0, 4) || cells.has(`${r.row},${r.col}`)) reject();
      cells.add(`${r.row},${r.col}`);
      if (UNIT_MAP[r.unitId].hero) { if (heroes.has(r.unitId)) reject(); heroes.add(r.unitId); }
    }
    if (armySupply(roster) > cap) reject();
  }
  if (s.supply !== armySupply(s.roster) || !Array.isArray(s.units) || s.units.length > MAX_UNITS || !Array.isArray(s.structures) || s.structures.length !== 6) reject();
  for (const u of s.units) {
    unique(u);
    if (!UNIT_MAP[u.unitId] || !['player', 'enemy'].includes(u.team) || !number(u.x, -60, 60) || !number(u.z, -20, 20) || !number(u.hp, 0, 100000) || !number(u.maxHp, 1, 100000) || u.hp > u.maxHp || !['walk', 'attack', 'idle', 'dead'].includes(u.action)) reject();
    for (const key of ['damage', 'armor', 'range', 'speed', 'attackSpeed', 'cooldown', 'attackFlash', 'hitFlash', 'shield', 'abilityCooldown', 'attacks', 'age', 'poison', 'poisonTime', 'curseTime', 'slowTime', 'slowAmount', 'stunTime', 'hasteTime', 'rallyTime']) if (!number(u[key], key === 'abilityCooldown' ? -100000 : 0, 100000)) reject();
    if (!valid(u.heading) || (u.lifespan !== null && !number(u.lifespan, 0, 1000)) || u.attackSpeed <= 0 || u.speed <= 0 || u.range <= 0 || typeof u.resurrected !== 'boolean' || typeof u.hero !== 'boolean') reject();
    if (UNIT_MAP[u.unitId].faction !== (u.team === 'player' ? s.faction : s.enemyFaction) || (u.summonedBy !== null && typeof u.summonedBy !== 'string')) reject();
  }
  const expected = new Set(['player-castle', 'enemy-castle', 'player-tower--7', 'player-tower-7', 'enemy-tower--7', 'enemy-tower-7']);
  for (const st of s.structures) {
    unique(st);
    if (!expected.delete(st.id) || !['player', 'enemy'].includes(st.team) || !['tower', 'castle'].includes(st.kind) || !number(st.hp, 0, st.maxHp) || !number(st.maxHp, 1, 10000) || !number(st.x, -50, 50) || !number(st.z, -18, 18) || !number(st.cooldown, 0, 10)) reject();
    if (!st.id.startsWith(`${st.team}-${st.kind}`) || st.x !== (st.team === 'player' ? -1 : 1) * (st.kind === 'castle' ? 44 : 35) || (st.kind === 'castle' ? st.z !== 0 : Math.abs(st.z) !== 7)) reject();
  }
  if (!s.spellCooldowns || !s.stats || !number(s.enemy.spent, 0, 10000000) || !number(s.enemy.goldEarned, 0, 10000000)) reject();
  if (s.enemy.plan !== null && (!UNIT_MAP[s.enemy.plan] || UNIT_MAP[s.enemy.plan].faction !== s.enemyFaction)) reject();
  for (const key of ['kills', 'losses', 'damage', 'goldEarned', 'waves', 'peakUnits']) if (!number(s.stats[key], 0, 100000000)) reject();
  for (const spell of SPELLS) if (!number(s.spellCooldowns[spell.id], 0, spell.cooldown)) reject();
  if (!Array.isArray(s.effects) || s.effects.length > 160 || !Array.isArray(s.events) || s.events.length > 12) reject();
  for (const e of s.effects) {
    unique(e);
    if (!['arrow', 'magic', 'heal', 'explosion', 'slash', 'lightning', 'meteor', 'rally'].includes(e.type) || !number(e.life, 0, 10) || !number(e.maxLife, 0.01, 10)) reject();
    for (const key of ['x', 'z', 'tx', 'tz']) if (!number(e[key], -100, 100)) reject();
  }
  for (const e of s.events) { unique(e); if (typeof e.text !== 'string' || e.text.length > 500 || typeof e.type !== 'string' || !number(e.time, 0, 100000)) reject(); }
  return makeEngine(s);
}
