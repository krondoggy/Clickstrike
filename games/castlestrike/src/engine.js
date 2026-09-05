import { FACTIONS, UNITS, UNIT_MAP, RESEARCH, SPELLS, WAVE_INTERVAL, DAMAGE_MULTIPLIERS, INCOME_INTERVAL, BASE_INCOME, MINE_INCOME, SHRINE_INCOME, MINE_COOLDOWN, ABILITY_RULES, counterScore } from './data.js';
import { buildTacticalContext, chooseTacticalTarget, moveTactically, resolveBodies, getAttackReach, hasEngagementSlot } from './tactics.js';

const STEP = 0.1;
const MAX_UNITS = 180;
const MAX_GOLD = 99999;
const EPSILON = 1e-8;
const TELEMETRY_WINDOW = 25;
const valid = n => typeof n === 'number' && Number.isFinite(n);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const other = team => team === 'player' ? 'enemy' : 'player';
const ok = message => ({ ok: true, message });
const fail = message => ({ ok: false, message });
const levels = () => ({ weapons: 0, armor: 0, mines: 0, barracks: 0, tier: 0 });
const basics = faction => UNITS.filter(u => u.faction === faction && u.tier === 1);
const armySupply = roster => roster.reduce((sum, r) => sum + UNIT_MAP[r.unitId].supply, 0);
const incomeAmount = (state, team) => BASE_INCOME + (team === 'player' ? state.mineLevel : state.enemy.mineLevel) * MINE_INCOME + ((team === 'player' ? state.control > 0.7 : state.control < -0.7) ? SHRINE_INCOME : 0);
const telemetrySummary = () => Object.fromEntries(['player', 'enemy'].map(team => [team, { damage: 0, healing: 0, shielding: 0, leadingThreat: null }]));
const combatDefaults = (u, time) => ({
  nextAttackAt: time + u.cooldown, attackPose: null, rootTime: 0, rootUntil: 0, stunUntil: time + u.stunTime,
  controlRecoveryUntil: u.stunTime > 0 ? time + u.stunTime + ABILITY_RULES.controlRecovery.duration : 0,
  poisons: [], slows: [], armorBreaks: [], armorBreak: 0, chargeDistance: 0, chargeUsed: false, stationaryTime: 0,
  targetCommitUntil: 0, retreatUntil: 0, retreatCooldownUntil: 0, flankSide: 0,
});

export function counterNeed(candidate, opponentUnits, ownedUnits) {
  const opposingInvestment = opponentUnits.reduce((total, u) => total + u.cost, 0) || 1;
  const matchupScore = (unit, target) => {
    const declared = counterScore(unit, target);
    const specialistTags = [target.role === 'flying' ? 'air' : null, target.role === 'cavalry' ? 'cavalry' : null, target.armorType === 'heavy' ? 'armorHeavy' : null].filter(Boolean);
    // Broad attrition/physical strengths do not replace a declared specialist
    // when the opposing player has paid for flying or heavily armored troops.
    return declared * (!specialistTags.length || unit.counters.some(c => specialistTags.includes(c.threat)) ? 1 : .25);
  };
  const coverage = new Map(opponentUnits.map(target => {
    const invested = opponentUnits.filter(u => u.id === target.id).reduce((total, u) => total + u.cost, 0);
    const covered = ownedUnits.reduce((total, u) => total + u.cost * Math.min(1, matchupScore(u, target)), 0);
    return [target.id, covered / Math.max(1, invested)];
  }));
  return opponentUnits.reduce((total, target) => total + target.cost / opposingInvestment * matchupScore(candidate, target) / (1 + 2 * coverage.get(target.id)), 0);
}

export function createGame({ faction = 'alliance', difficulty = 'normal', seed = 42 } = {}) {
  if (!FACTIONS.some(f => f.id === faction)) throw new Error('Choose a valid faction.');
  if (!['easy', 'normal', 'hard'].includes(difficulty)) difficulty = 'normal';
  seed = Number.isFinite(seed) ? Math.trunc(seed) : 42;
  const enemyFaction = FACTIONS[(FACTIONS.findIndex(f => f.id === faction) + 1 + (Math.abs(Math.trunc(seed)) % 2)) % 3].id;
  const state = {
    version: 3, faction, enemyFaction, difficulty, status: 'preparation', paused: false, speed: 1,
    time: 0, wave: 0, nextWave: WAVE_INTERVAL, gold: 280, income: BASE_INCOME / INCOME_INTERVAL, incomeAmount: BASE_INCOME, nextIncome: INCOME_INTERVAL, mineCooldown: 0, supply: 0, supplyCap: 24, tier: 1, mineLevel: 0,
    research: levels(), roster: [], enemyRoster: [], units: [], structures: [], effects: [], events: [], control: 0,
    pendingAttacks: [], projectiles: [], telemetry: { window: TELEMETRY_WINDOW, events: [], summary: telemetrySummary(), damageByUnit: { player: {}, enemy: {} } },
    stats: { kills: 0, losses: 0, damage: 0, goldEarned: 0, waves: 0, peakUnits: 0 },
    spellCooldowns: Object.fromEntries(SPELLS.map(s => [s.id, 0])),
    enemy: { gold: 280, income: BASE_INCOME / INCOME_INTERVAL, incomeAmount: BASE_INCOME, nextIncome: INCOME_INTERVAL, mineCooldown: 0, tier: 1, mineLevel: 0, supplyCap: 24, research: levels(), spent: 0, goldEarned: 0, plan: null },
    seed: (Number.isFinite(seed) ? Math.trunc(seed) : 42) >>> 0, nextId: 1, accumulator: 0, aiTimer: 2,
  };
  const id = prefix => `${prefix}${state.nextId++}`;
  for (const team of ['player', 'enemy']) {
    const sign = team === 'player' ? -1 : 1;
    state.structures.push({ id: `${team}-castle`, team, kind: 'castle', x: sign * 44, z: 0, hp: 8500, maxHp: 8500, cooldown: 0, nextAttackAt: 0, attackPose: null });
    for (const z of [-7, 7]) state.structures.push({ id: `${team}-tower-${z}`, team, kind: 'tower', x: sign * 35, z, hp: 1800, maxHp: 1800, cooldown: 0, nextAttackAt: 0, attackPose: null });
    const roster = team === 'player' ? state.roster : state.enemyRoster;
    basics(team === 'player' ? faction : enemyFaction).forEach((u, i) => roster.push({ id: id('r'), unitId: u.id, row: i === 0 ? 2 : i === 1 ? 3 : 4, col: u.role === 'ranged' ? 1 : 4 }));
  }
  state.supply = armySupply(state.roster);
  return makeEngine(state);
}

function makeEngine(state) {
  // Audio is a one-shot presentation stream, never part of a saved campaign.
  // Retain casualties between display frames even when accelerated play runs
  // several simulation ticks and removes their units before the next render.
  const audioEvents = [];
  const sound = (kind, source, details = {}) => {
    const def = UNIT_MAP[source.unitId];
    if (audioEvents.length >= 256) audioEvents.shift();
    audioEvents.push({
      id: `audio-${state.nextId++}`, time: state.time, sourceId: source.id || null, targetId: null,
      kind, x: source.x, z: source.z, team: source.team, unitId: source.unitId || null,
      faction: def?.faction || (source.team === 'player' ? state.faction : state.enemyFaction),
      role: def?.role || source.kind, armorType: def?.armorType || 'fortified', hero: !!def?.hero,
      heavy: !!source.kind || !!def?.hero || (def?.supply || 0) >= 4, summoned: !!source.summonedBy,
      ...details,
    });
  };
  const id = prefix => `${prefix}${state.nextId++}`;
  const random = () => {
    state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
    return state.seed / 4294967296;
  };
  const note = (text, type = 'info') => {
    state.events.unshift({ id: id('e'), text, type, time: state.time });
    state.events.length = Math.min(state.events.length, 12);
  };
  const effect = (type, source, target = source, life = 0.55, sound, details = {}) => {
    if (state.effects.length >= 160) state.effects.shift();
    state.effects.push({ id: id('fx'), type, x: source.x, z: source.z, tx: target.x, tz: target.z, team: source.team || 'player', life, maxLife: life, sourceId: source.id || null, targetId: target.id || null, unitId: source.unitId || null, startedAt: state.time, releaseAt: state.time, impactAt: state.time, phase: 'ability', semanticKind: type, sourceUnitId: source.unitId || null, targetUnitId: target.unitId || null, sourceKind: source.kind || null, ...(sound === undefined ? {} : { sound }), ...details });
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
    if (key === 'mines' && wallet.mineCooldown > 0) return fail(`Next Gold Mine ready in ${Math.ceil(wallet.mineCooldown)} seconds.`);
    const cost = getResearchCost(key, team);
    if (wallet.gold < cost) return fail(`Need ${Math.ceil(cost - wallet.gold)} more gold.`);
    wallet.gold -= cost;
    if (team === 'enemy') state.enemy.spent += cost;
    wallet.research[key]++;
    if (key === 'mines') wallet.mineCooldown = MINE_COOLDOWN;
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
    const maxHp = Math.round(def.hp * (1 + tech.armor * 0.08) * (def.hero ? 1 + (level - 1) * 0.12 : 1) * (summonedBy ? ABILITY_RULES.raise.healthFraction : 1));
    const u = {
      id: id('u'), unitId, team, x, z, hp: maxHp, maxHp, damage: def.damage * (1 + tech.weapons * 0.12) * (def.hero ? 1 + (level - 1) * 0.1 : 1),
      armor: def.armor + tech.armor * 2, range: def.range, speed: def.speed * (def.faction === 'horde' ? 1.08 : 1), attackSpeed: def.attackSpeed,
      cooldown: 0.15 + random() * 0.4, targetId: null, action: 'walk', attackFlash: 0, hitFlash: 0, heading: team === 'player' ? Math.PI / 2 : -Math.PI / 2,
      hero: def.hero, level, shield: 0, abilityCooldown: def.abilityId === 'raise' ? 8 : 1 + random() * 2, attacks: 0, age: 0,
      poison: 0, poisonTime: 0, poisonTeam: null, curseTime: 0, slowTime: 0, slowAmount: 0, stunTime: 0, hasteTime: 0, rallyTime: 0,
      resurrected: false, summonedBy, lifespan: summonedBy ? ABILITY_RULES.raise.lifespan : null,
    };
    Object.assign(u, combatDefaults(u, state.time));
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
  const trace = (kind, source, target, amount, time = state.time) => {
    if (!(amount > EPSILON)) return;
    const team = source?.team || target.team;
    const telemetry = state.telemetry;
    const event = { time, kind, sourceId: source?.id || null, targetId: target.id, unitId: source?.unitId || null, team, amount };
    telemetry.events.push(event);
    telemetry.summary[team][kind] += amount;
    if (kind === 'damage' && event.unitId) {
      const totals = telemetry.damageByUnit[team];
      totals[event.unitId] = (totals[event.unitId] || 0) + amount;
    }
  };
  const updateTelemetry = () => {
    const t = state.telemetry;
    let expired = 0;
    while (expired < t.events.length && t.events[expired].time < state.time - TELEMETRY_WINDOW - EPSILON) {
      const event = t.events[expired++];
      t.summary[event.team][event.kind] = Math.max(0, t.summary[event.team][event.kind] - event.amount);
      if (event.kind === 'damage' && event.unitId) t.damageByUnit[event.team][event.unitId] = Math.max(0, (t.damageByUnit[event.team][event.unitId] || 0) - event.amount);
    }
    if (expired) t.events.splice(0, expired);
    for (const team of ['player', 'enemy']) {
      const sources = Object.entries(t.damageByUnit[team]);
      const otherDamage = Math.max(0, t.summary[team].damage - sources.reduce((total, [, damage]) => total + damage, 0));
      const top = [...sources, ['_other', otherDamage]].filter(([, damage]) => damage > EPSILON).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      t.summary[team].leadingThreat = top ? { unitId: top[0] === '_other' ? null : top[0], damage: top[1] } : null;
    }
  };
  const heal = (u, amount, source = u) => {
    if (u.hp <= 0) return 0;
    const restored = Math.min(u.maxHp - u.hp, amount * (UNIT_MAP[u.unitId].faction === 'alliance' ? 1.15 : 1));
    u.hp += restored;
    trace('healing', source, u, restored);
    return restored;
  };
  const interrupt = u => {
    state.pendingAttacks = state.pendingAttacks.filter(a => a.sourceId !== u.id);
    u.attackPose = null;
    u.action = u.hp > 0 ? 'idle' : 'dead';
  };
  const applyControl = (target, kind, duration, source) => {
    if (target.kind || target.hp <= 0 || target.controlRecoveryUntil > state.time + EPSILON || target.rootTime > EPSILON || target.stunTime > EPSILON) return false;
    target[kind + 'Until'] = state.time + duration;
    target[kind + 'Time'] = duration;
    target.controlRecoveryUntil = state.time + duration + ABILITY_RULES.controlRecovery.duration;
    if (kind === 'stun') interrupt(target);
    effect('magic', source, target, .55, null, { semanticKind: kind });
    return true;
  };
  const applyStatus = (target, field, amount, duration, source) => {
    if (target.kind || target.hp <= 0) return;
    const entry = { sourceId: source.id || null, unitId: source.unitId || null, team: source.team, amount, expiresAt: state.time + duration };
    // A fresh application refreshes only that caster's own instance. A weaker
    // poison/web can never extend the expiry of a stronger one.
    const existing = target[field].find(v => v.sourceId === entry.sourceId && v.unitId === entry.unitId);
    if (existing) Object.assign(existing, entry); else target[field].push(entry);
    refreshStatuses(target);
  };
  const refreshStatuses = u => {
    for (const field of ['poisons', 'slows', 'armorBreaks']) u[field] = u[field].filter(v => v.expiresAt > state.time + EPSILON);
    const strongest = field => u[field].reduce((best, v) => !best || v.amount > best.amount ? v : best, null);
    const venom = strongest('poisons'), slow = strongest('slows'), armor = strongest('armorBreaks');
    u.poison = venom?.amount || 0; u.poisonTime = venom ? venom.expiresAt - state.time : 0; u.poisonTeam = venom?.team || null;
    u.slowAmount = slow?.amount || 0; u.slowTime = slow ? slow.expiresAt - state.time : 0;
    u.armorBreak = armor?.amount || 0;
    u.rootTime = Math.max(0, u.rootUntil - state.time);
    u.stunTime = Math.max(0, u.stunUntil - state.time);
  };
  const mitigatedDamage = (target, amount, attackType = 'normal', source = null) => {
    const def = target.kind ? null : UNIT_MAP[target.unitId];
    const armorClass = target.kind ? 'fortified' : def.armorType;
    let armor = target.kind ? (target.kind === 'castle' ? 5 : 4) : target.armor - (target.armorBreak || 0);
    if (!target.kind && state.units.some(u => u.team === target.team && u.hp > 0 && u.unitId === 'paladin' && distance(u, target) <= ABILITY_RULES.beacon.auraRadius)) armor += ABILITY_RULES.beacon.armor;
    let damage = amount * (DAMAGE_MULTIPLIERS[attackType]?.[armorClass] ?? 1);
    damage *= armor >= 0 ? 1 / (1 + armor * .055) : 2 - Math.pow(.945, -armor);
    if (target.kind) damage *= 1 + Math.max(0, state.time - 475) / 100;
    if (source && !source.kind && source.range > 3 && def?.abilityId === 'shieldwall') damage *= 1 - ABILITY_RULES.shieldwall.rangedReduction;
    return damage;
  };
  const hurt = (target, amount, sourceTeam, attackType = 'normal', source = null, alreadyMitigated = false) => {
    if (target.hp <= 0) return 0;
    const def = target.kind ? null : UNIT_MAP[target.unitId];
    let damage = alreadyMitigated ? amount : mitigatedDamage(target, amount, attackType, source);
    if (!target.kind && target.shield > 0) {
      const absorbed = Math.min(target.shield, damage);
      target.shield -= absorbed; damage -= absorbed;
      trace('shielding', target.shieldSource || { id: `${target.team}-commander`, team: target.team }, target, absorbed);
    }
    const dealt = Math.min(target.hp, damage);
    target.hp = Math.max(0, target.hp - damage);
    target.hitFlash = 1;
    trace('damage', source || { team: sourceTeam }, target, dealt);
    if (sourceTeam === 'player') state.stats.damage += dealt;
    if (target.hp <= 0 && !target.kind) {
      interrupt(target);
      if (def.abilityId === 'unbroken' && !target.resurrected && !target.summonedBy) {
        target.hp = target.maxHp * ABILITY_RULES.unbroken.reviveFraction; target.resurrected = true;
        target.stunUntil = state.time + ABILITY_RULES.unbroken.reviveStun;
        target.stunTime = ABILITY_RULES.unbroken.reviveStun;
        target.controlRecoveryUntil = target.stunUntil + ABILITY_RULES.controlRecovery.duration;
        effect('magic', target, target, .7, null, { semanticKind: 'revive' });
      } else {
        target.action = 'dead'; sound('death', target);
        if (!target.summonedBy) { if (target.team === 'enemy') state.stats.kills++; else state.stats.losses++; }
      }
    } else if (target.hp <= 0 && target.kind) {
      effect('explosion', target, target, 1.4, null, { semanticKind: 'collapse' });
      sound('collapse', target, { finale: target.kind === 'castle' });
      note(`${target.team === 'enemy' ? 'Enemy' : 'Your'} ${target.kind} destroyed!`, target.team === 'enemy' ? 'success' : 'warning');
    }
    return dealt;
  };
  const legalAir = (target, allowed) => target.kind || UNIT_MAP[target.unitId].role !== 'flying' || allowed;
  const nearby = (source, team, radius, canHitAir = true) => state.units.filter(u => u.hp > 0 && u.team === team && legalAir(u, canHitAir) && distance(source, u) <= radius + EPSILON);
  const abilityHits = [];
  const healGroup = (source, targets, amount) => {
    const restored = targets.map(target => ({ target, amount: heal(target, amount, source) }));
    for (const entry of restored.filter(v => v.amount > EPSILON && v.target !== source).sort((a, b) => b.amount - a.amount).slice(0, 6)) {
      effect('heal', source, entry.target, .7, null, { semanticKind: 'heal', amount: entry.amount });
    }
  };
  const useAbility = (u, target, dt) => {
    const def = UNIT_MAP[u.unitId], rule = ABILITY_RULES[def.abilityId] || {};
    if (def.abilityId === 'plague') for (const v of nearby(u, other(u.team), rule.radius, rule.canHitAir)) abilityHits.push({ target: v, damage: rule.damage * dt, source: u, type: 'magic' });
    if (u.abilityCooldown > EPSILON) return;
    if (def.abilityId === 'renewal') {
      const wounded = nearby(u, u.team, rule.radius).filter(v => v.hp < v.maxHp - 30).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id))[0];
      if (wounded) { heal(wounded, rule.heal, u); effect('heal', u, wounded, .8, undefined, { semanticKind: 'heal', radius: rule.radius }); u.abilityCooldown = rule.cooldown; }
    } else if (def.abilityId === 'bloodlust' && target && distance(u, target) <= 18) {
      const allies = nearby(u, u.team, rule.radius).filter(v => v !== u).sort((a, b) => b.damage - a.damage || a.id.localeCompare(b.id)).slice(0, rule.targets);
      if (allies.length) { for (const v of allies) v.hasteTime = rule.duration; effect('rally', u, u, 1, undefined, { semanticKind: 'rally', radius: rule.radius }); u.abilityCooldown = rule.cooldown; }
    } else if (def.abilityId === 'raise' && target && distance(u, target) < rule.radius) {
      if (state.units.filter(v => v.summonedBy === u.id && v.hp > 0).length <= rule.limit - rule.summons) {
        for (const offset of [-1, 1]) spawn('skeleton', u.team, u.x + (u.team === 'player' ? 2 : -2), clamp(u.z + offset, -13, 13), u.id);
        effect('magic', u, u, .9, undefined, { semanticKind: 'revive' });
      }
      u.abilityCooldown = rule.cooldown;
    } else if (def.abilityId === 'stomp' && target && distance(u, target) <= rule.radius && legalAir(target, rule.canHitAir)) {
      for (const v of nearby(u, other(u.team), rule.radius, rule.canHitAir)) abilityHits.push({ target: v, damage: rule.damage, source: u, type: 'magic', control: 'stun', duration: rule.duration });
      effect('explosion', u, u, .65, undefined, { semanticKind: 'stun', radius: rule.radius }); u.abilityCooldown = rule.cooldown;
    } else if (def.abilityId === 'beacon') {
      const allies = nearby(u, u.team, rule.radius).filter(v => v.hp < v.maxHp - 15);
      if (allies.length) { healGroup(u, allies, rule.heal); effect('heal', u, u, 1, undefined, { semanticKind: 'heal', radius: rule.radius }); u.abilityCooldown = rule.cooldown; }
    } else if (def.abilityId === 'embrace' && target && distance(u, target) <= rule.triggerRange && legalAir(target, rule.canHitAir)) {
      healGroup(u, nearby(u, u.team, rule.radius), rule.heal);
      for (const v of nearby(u, other(u.team), rule.radius, rule.canHitAir)) abilityHits.push({ target: v, damage: rule.damage, source: u, type: 'magic' });
      effect('magic', u, u, 1, undefined, { semanticKind: 'bolt', radius: rule.radius }); u.abilityCooldown = rule.cooldown;
    }
  };
  const period = u => u.attackSpeed / (1 + (u.hasteTime > 0 ? ABILITY_RULES.bloodlust.amount : 0) + (u.rallyTime > 0 ? .35 : 0));
  const tickTime = time => Math.ceil((time - EPSILON) / STEP) * STEP;
  const attack = (u, target, startedAt = state.time) => {
    const def = u.kind ? null : UNIT_MAP[u.unitId];
    const attackPeriod = u.kind ? (u.kind === 'castle' ? 1 : 1.2) : period(u);
    const kind = u.kind ? 'bolt' : u.range <= 3 ? 'melee' : def.role === 'siege' ? 'siege' : def.attackType === 'magic' ? 'bolt' : 'arrow';
    const windup = Math.min(attackPeriod * .35, kind === 'siege' ? .6 : kind === 'melee' ? .24 : .28);
    const releaseAt = tickTime(startedAt + windup);
    const payload = {
      id: id('attack'), sourceId: u.id, targetId: target.id, unitId: u.unitId || null, team: u.team,
      startedAt, releaseAt, impactAt: releaseAt, kind, abilityId: def?.abilityId || null,
      x: u.x, z: u.z, tx: target.x, tz: target.z, range: u.range || (u.kind === 'castle' ? 15 : 13), sourceKind: u.kind || null,
      damage: u.kind ? (u.kind === 'castle' ? 74 : 58) : u.damage * (u.curseTime > 0 ? 1 - ABILITY_RULES.curse.damageReduction : 1),
      attackType: def?.attackType || 'magic', attackNumber: (u.attacks || 0) + 1,
      charge: !u.kind && def.abilityId === 'charge' && !u.chargeUsed && u.chargeDistance >= ABILITY_RULES.charge.minDistance,
    };
    u.nextAttackAt = startedAt + attackPeriod;
    u.cooldown = Math.max(0, u.nextAttackAt - state.time);
    u.attackPose = { id: payload.id, targetId: target.id, kind, startedAt, releaseAt, recoveryAt: Math.max(releaseAt + .12, startedAt + attackPeriod * .75) };
    u.action = 'attack';
    state.pendingAttacks.push(payload);
    effect(kind === 'melee' ? 'slash' : kind === 'arrow' || kind === 'siege' ? 'arrow' : 'magic', u, target, Math.max(.1, releaseAt - state.time), null, { phase: 'windup', semanticKind: kind, startedAt, releaseAt, impactAt: releaseAt, attackId: payload.id });
  };
  const impactPackets = attack => {
    if (attack.kind === 'meteor') {
      const source = { id: attack.sourceId, unitId: null, kind: 'commander', team: attack.team, x: attack.x, z: attack.z };
      const victims = nearby(source, other(attack.team), attack.radius);
      const structures = state.structures.filter(s => s.team !== attack.team && s.hp > 0 && distance(source, s) <= attack.radius + EPSILON);
      effect('meteor', source, source, .65, undefined, { phase: 'impact', semanticKind: 'meteor', radius: attack.radius, sourceId: attack.sourceId, targetId: null, releaseAt: attack.releaseAt, impactAt: state.time, attackId: attack.id });
      return [...victims.map(target => ({ target, damage: attack.damage, source, type: 'magic' })), ...structures.map(target => ({ target, damage: 75, source, type: 'magic' }))];
    }
    if (attack.kind === 'siege') {
      const source = state.units.find(u => u.id === attack.sourceId) || { id: attack.sourceId, unitId: attack.unitId, team: attack.team, x: attack.x, z: attack.z, range: attack.range };
      const rule = ABILITY_RULES[attack.abilityId];
      const center = { x: attack.tx, z: attack.tz, team: attack.team };
      const victims = [...nearby(center, other(attack.team), rule.radius, false), ...state.structures.filter(s => s.team !== attack.team && s.hp > 0 && distance(center, s) <= rule.radius + EPSILON)];
      const direct = victims.filter(v => distance(center, v) <= .75 + EPSILON).sort((a, b) => distance(center, a) - distance(center, b) || a.id.localeCompare(b.id))[0];
      effect('explosion', center, center, .65, undefined, { phase: 'impact', semanticKind: 'siege', sourceId: attack.sourceId, targetId: direct?.id || null, unitId: attack.unitId, sourceUnitId: attack.unitId, sourceKind: null, team: attack.team, releaseAt: attack.releaseAt, impactAt: state.time, attackId: attack.id, radius: rule.radius });
      return victims.map(target => ({ target, damage: attack.damage * (target === direct ? 1 : rule.damageRatio), source, type: attack.attackType, main: target === direct, splash: target !== direct, attack }));
    }
    const target = [...state.units, ...state.structures].find(u => u.id === attack.targetId);
    const source = state.units.find(u => u.id === attack.sourceId) || state.structures.find(u => u.id === attack.sourceId) || { id: attack.sourceId, unitId: attack.unitId, team: attack.team, x: attack.x, z: attack.z, range: attack.range, kind: attack.sourceKind };
    if (!target || target.hp <= 0 || !legalAir(target, attack.sourceKind || UNIT_MAP[attack.unitId].canHitAir)) return [];
    const def = attack.unitId ? UNIT_MAP[attack.unitId] : null, rule = ABILITY_RULES[attack.abilityId] || {};
    let damage = attack.damage;
    if (attack.abilityId === 'fury' && attack.fury) damage *= rule.damageMultiplier;
    if (attack.abilityId === 'brace' && UNIT_MAP[target.unitId]?.role === 'cavalry') damage *= rule.cavalryDamageMultiplier;
    if (attack.abilityId === 'skyhunter' && UNIT_MAP[target.unitId]?.role === 'flying') damage *= rule.airDamageMultiplier;
    if (attack.abilityId === 'web' && UNIT_MAP[target.unitId]?.role === 'flying') damage *= rule.airDamageMultiplier;
    if (attack.abilityId === 'chain' && UNIT_MAP[target.unitId]?.armorType === 'heavy') damage *= rule.heavyDamageMultiplier || 1;
    let braced = false;
    if (attack.charge) {
      const brace = !target.kind && ABILITY_RULES[UNIT_MAP[target.unitId].abilityId];
      const dx = source.x - target.x, dz = source.z - target.z, d = Math.hypot(dx, dz) || 1;
      const facing = (Math.sin(target.heading) * dx + Math.cos(target.heading) * dz) / d;
      braced = !!brace?.cancelsCharge && target.stunTime <= EPSILON && target.stationaryTime >= brace.braceHold - EPSILON && facing >= brace.braceFacingDot;
      damage *= braced ? 1 : rule.damageMultiplier;
    }
    const storm = attack.abilityId === 'bladestorm' && attack.attackNumber % rule.every === 0;
    if (storm) damage *= rule.damageMultiplier;
    const packets = [{ target, damage, source, type: attack.attackType, main: true, attack, braced }];
    const splash = ['splash', 'pitch', 'thunder', 'cleave', 'frost'].includes(attack.abilityId) || storm;
    if (splash) for (const v of nearby(target, other(attack.team), rule.radius, rule.canHitAir ?? def.canHitAir)) {
      if (v !== target) packets.push({ target: v, damage: damage * rule.damageRatio, source, type: attack.attackType, attack, splash: true });
    }
    if (attack.abilityId === 'chain' && attack.attackNumber % rule.every === 0) {
      for (const v of nearby(target, other(attack.team), rule.radius, rule.canHitAir).filter(v => v !== target).sort((a, b) => distance(a, target) - distance(b, target) || a.id.localeCompare(b.id)).slice(0, rule.targets)) {
        packets.push({ target: v, damage: damage * rule.damageRatio, source, type: 'magic', attack });
        effect('lightning', target, v, .4, undefined, { semanticKind: 'chain', phase: 'impact', sourceId: source.id, unitId: source.unitId });
      }
    }
    effect(attack.kind === 'melee' ? 'slash' : attack.kind === 'siege' ? 'explosion' : attack.kind === 'bolt' ? 'magic' : 'slash', target, target, attack.kind === 'siege' ? .65 : .22, undefined, {
      phase: 'impact', semanticKind: attack.kind, sourceId: attack.sourceId, targetId: target.id, unitId: attack.unitId,
      sourceUnitId: attack.unitId, sourceKind: attack.sourceKind, team: attack.team, releaseAt: attack.releaseAt, impactAt: state.time, attackId: attack.id, ...(splash ? { radius: rule.radius } : {}),
    });
    return packets;
  };
  const resolvePackets = packets => {
    // Snapshot mitigation before applying any simultaneous damage. A dead aura
    // source or the array order cannot change another hit in this same instant.
    for (const packet of packets) packet.resolvedDamage = mitigatedDamage(packet.target, packet.damage, packet.type, packet.source);
    const after = [];
    for (const p of packets) {
      const dealt = hurt(p.target, p.resolvedDamage, p.source.team, p.type, p.source, true);
      if (p.control && p.target.hp > 0) after.push(() => applyControl(p.target, p.control, p.duration, p.source));
      if (!p.attack) continue;
      const a = p.attack, rule = ABILITY_RULES[a.abilityId] || {};
      if (p.main && a.abilityId === 'ravenous' && !p.target.kind) after.push(() => heal(p.source, dealt * rule.healFraction, p.source));
      if (p.main && ['venom', 'sting', 'pitch'].includes(a.abilityId) && legalAir(p.target, rule.canHitAir)) after.push(() => applyStatus(p.target, 'poisons', rule.damage, rule.duration, p.source));
      if (p.main && a.abilityId === 'curse' && !p.target.kind) p.target.curseTime = Math.max(p.target.curseTime, rule.duration);
      if (p.main && a.abilityId === 'web' && UNIT_MAP[p.target.unitId]?.role === 'flying') after.push(() => applyStatus(p.target, 'slows', rule.amount, rule.duration, p.source));
      if (a.abilityId === 'frost' && legalAir(p.target, rule.canHitAir)) after.push(() => applyStatus(p.target, 'slows', rule.amount, rule.duration, p.source));
      if (p.main && a.abilityId === 'bloodlust' && UNIT_MAP[p.target.unitId]?.armorType === 'heavy') {
        after.push(() => { applyStatus(p.target, 'armorBreaks', rule.armorBreak, rule.armorBreakDuration, p.source); effect('magic', p.source, p.target, .4, null, { semanticKind: 'armorBreak' }); });
      }
      if (p.main && a.abilityId === 'net' && p.source.abilityCooldown <= EPSILON && !p.target.kind) {
        p.source.abilityCooldown = rule.cooldown;
        after.push(() => applyControl(p.target, 'root', rule.duration, p.source));
      }
      if (p.main && a.charge && !p.braced) after.push(() => applyControl(p.target, 'stun', rule.stunDuration, p.source));
    }
    for (const action of after) action();
  };
  const processAttacks = () => {
    const byId = new Map([...state.units, ...state.structures].map(u => [u.id, u]));
    // Release due attacks together before resolving any impacts at that timestamp.
    // Once released, a projectile remains dangerous even if its caster dies.
    const times = [...new Set([...state.pendingAttacks.map(a => a.releaseAt), ...state.projectiles.map(a => a.impactAt)].filter(t => t <= state.time + EPSILON))].sort((a, b) => a - b);
    for (let i = 0; i < times.length; i++) {
      const time = times[i];
      const releasing = state.pendingAttacks.filter(a => a.releaseAt <= time + EPSILON);
      state.pendingAttacks = state.pendingAttacks.filter(a => a.releaseAt > time + EPSILON);
      const melee = [];
      for (const a of releasing) {
        const source = byId.get(a.sourceId), target = byId.get(a.targetId);
        if (!source || source.hp <= 0 || source.stunTime > EPSILON || !target || target.hp <= 0) { if (source?.attackPose?.id === a.id) source.attackPose = null; continue; }
        const reach = source.kind ? a.range + .45 : getAttackReach(source, target);
        if (distance(source, target) > reach + .75 || !legalAir(target, source.kind || UNIT_MAP[source.unitId].canHitAir)) { source.attackPose = null; continue; }
        if (!source.kind) {
          source.attacks++;
          source.attackFlash = 1;
          a.attackNumber = source.attacks;
          a.fury = source.hp < source.maxHp / 2;
          if (a.abilityId === 'charge') source.chargeUsed = true;
        }
        a.x = source.x; a.z = source.z; a.tx = target.x; a.tz = target.z;
        if (a.kind === 'melee') { a.impactAt = time; melee.push(a); }
        else {
          a.impactAt = tickTime(time + Math.max(.1, distance(source, target) / (a.kind === 'siege' ? 13 : a.kind === 'bolt' ? 20 : 18)));
          state.projectiles.push(a);
          effect(a.kind === 'bolt' ? 'magic' : 'arrow', source, target, a.impactAt - state.time, a.kind === 'siege' ? 'siege' : undefined, {
            phase: 'release', semanticKind: a.kind, sourceId: a.sourceId, targetId: a.targetId, unitId: a.unitId, releaseAt: time, impactAt: a.impactAt, attackId: a.id,
          });
          if (a.impactAt <= state.time + EPSILON && !times.some(t => Math.abs(t - a.impactAt) < EPSILON)) { times.push(a.impactAt); times.sort((x, y) => x - y); }
        }
      }
      const impacts = state.projectiles.filter(a => a.impactAt <= time + EPSILON);
      state.projectiles = state.projectiles.filter(a => a.impactAt > time + EPSILON);
      resolvePackets([...melee, ...impacts].flatMap(impactPackets));
    }
  };

  const updateEconomy = dt => {
    for (const team of ['player', 'enemy']) {
      const wallet = team === 'player' ? state : state.enemy;
      wallet.incomeAmount = incomeAmount(state, team);
      wallet.income = wallet.incomeAmount / INCOME_INTERVAL;
      wallet.mineCooldown = Math.max(0, wallet.mineCooldown - dt);
      if (wallet.mineCooldown < 0.00001) wallet.mineCooldown = 0;
    }
    // Both sides share a payday. Research and loading only refresh the preview;
    // neither can advance the clock or collect an early/duplicate payment.
    if (dt > 0) {
      state.nextIncome -= dt;
      while (state.nextIncome <= 0.00001) {
        state.nextIncome += INCOME_INTERVAL;
        for (const team of ['player', 'enemy']) {
          const wallet = team === 'player' ? state : state.enemy;
          const earned = Math.min(wallet.incomeAmount, MAX_GOLD - wallet.gold);
          wallet.gold += earned;
          if (team === 'player') state.stats.goldEarned += earned;
          else wallet.goldEarned += earned;
        }
      }
    }
    state.enemy.nextIncome = state.nextIncome;
  };
  const ai = () => {
    const wallet = state.enemy;
    const roster = state.enemyRoster;
    const strength = armySupply(roster);
    const safeToInvest = state.control <= 0.35 && strength >= armySupply(state.roster) * 0.85 && state.structures.find(s => s.id === 'enemy-castle').hp > 6800;
    const desiredMines = state.time >= 480 && strength >= 28 ? 2 : state.time >= 90 && strength >= 13 ? 1 : 0;
    // Identical prices, income, supply, recruitment and upgrade rules to the player.
    // Never reserve the whole treasury for a mine while the army needs an answer.
    if (safeToInvest && wallet.mineLevel < desiredMines && wallet.mineCooldown === 0 && wallet.gold >= getResearchCost('mines', 'enemy')) return research('mines', 'enemy');
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
    const ownUnits = roster.map(r => UNIT_MAP[r.unitId]);
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
        const need = counterNeed(u, playerUnits, ownUnits);
        score += need * (state.difficulty === 'hard' ? 7 : 5.5);
      }
      return { u, score };
    }).sort((a, b) => b.score - a.score);
    wallet.plan = scores[0].u.id;
    if (buy(wallet.plan, 'enemy').ok) wallet.plan = null;
  };
  const tick = dt => {
    state.time = Math.round((state.time + dt) * 1e9) / 1e9;
    state.nextWave -= dt;
    if (state.nextWave <= 0.00001) wave();
    for (const key of Object.keys(state.spellCooldowns)) state.spellCooldowns[key] = Math.max(0, state.spellCooldowns[key] - dt);
    state.aiTimer -= dt;
    if (state.aiTimer <= 0) { ai(); state.aiTimer = state.difficulty === 'easy' ? 6 : state.difficulty === 'hard' ? 1.5 : 3; }
    state.effects = state.effects.filter(e => (e.life -= dt) > 0);
    const previousTime = state.time - dt;
    const livingAtStart = state.units.filter(u => u.hp > 0);
    for (const u of livingAtStart) {
      const expectedCooldown = Math.max(0, u.nextAttackAt - previousTime);
      if (Math.abs(u.cooldown - expectedCooldown) > EPSILON) u.nextAttackAt = previousTime + u.cooldown;
      for (const kind of ['root', 'stun']) {
        if (u[kind + 'Time'] > Math.max(0, u[kind + 'Until'] - previousTime) + EPSILON) {
          u[kind + 'Until'] = previousTime + u[kind + 'Time'];
          u.controlRecoveryUntil = Math.max(u.controlRecoveryUntil, u[kind + 'Until'] + ABILITY_RULES.controlRecovery.duration);
        }
      }
      u.age += dt; u.attackFlash = Math.max(0, u.attackFlash - dt * 3.5); u.hitFlash = Math.max(0, u.hitFlash - dt * 4);
      for (const key of ['curseTime', 'hasteTime', 'rallyTime', 'abilityCooldown']) u[key] = Math.max(0, u[key] - dt);
      if (u.rallyTime <= 0) u.shield = 0;
      if (u.lifespan !== null && u.age >= u.lifespan - EPSILON) { u.hp = 0; interrupt(u); sound('death', u); continue; }
      const boundaries = [previousTime, ...u.poisons.map(p => p.expiresAt).filter(t => t > previousTime && t < state.time), state.time].sort((a, b) => a - b);
      for (let i = 1; i < boundaries.length && u.hp > 0; i++) {
        const active = u.poisons.filter(p => p.expiresAt > boundaries[i - 1] + EPSILON).sort((a, b) => b.amount - a.amount)[0];
        if (active) hurt(u, active.amount * (boundaries[i] - boundaries[i - 1]), active.team, 'magic', { id: active.sourceId, unitId: active.unitId, team: active.team, range: 0 });
      }
      refreshStatuses(u);
      if (u.hp <= 0) continue;
      if (UNIT_MAP[u.unitId].faction === 'undead') heal(u, u.maxHp * .0035 * dt);
      u.cooldown = Math.max(0, u.nextAttackAt - state.time);
      if (u.attackPose && u.attackPose.recoveryAt <= state.time + EPSILON) u.attackPose = null;
      if (u.stunTime > EPSILON) interrupt(u);
    }
    processAttacks();
    const living = state.units.filter(u => u.hp > 0);
    const context = buildTacticalContext(state);
    const teams = { player: living.filter(u => u.team === 'player'), enemy: living.filter(u => u.team === 'enemy') };
    const targets = new Map();
    const pendingBySource = new Map(state.pendingAttacks.map(a => [a.sourceId, a]));
    for (const u of living) {
      if (u.hp <= 0 || u.stunTime > EPSILON) { u.action = 'idle'; continue; }
      const candidates = [...teams[other(u.team)], ...state.structures.filter(s => s.team !== u.team && s.hp > 0)];
      const pending = pendingBySource.get(u.id);
      const target = pending ? context.byId.get(pending.targetId) : chooseTacticalTarget(u, candidates, context);
      targets.set(u.id, target);
    }
    // Heals must not change a victim's apparent remaining health halfway through
    // the opposing team's choices. Every commitment sees the same pre-cast state.
    for (const u of living) if (u.hp > 0 && u.stunTime <= EPSILON) useAbility(u, targets.get(u.id), dt);
    if (abilityHits.length) resolvePackets(abilityHits.splice(0));
    const winding = new Set(state.pendingAttacks.map(a => a.sourceId));
    const movementIntents = new Map();
    for (const u of living) {
      if (u.hp <= 0 || u.stunTime > EPSILON) continue;
      let target = targets.get(u.id);
      if (!target || target.hp <= 0) { u.action = 'idle'; continue; }
      if (!winding.has(u.id) && (context.reservations.get(target.id) || 0) >= target.hp + (target.shield || 0)) {
        target = chooseTacticalTarget(u, [...teams[other(u.team)], ...state.structures.filter(s => s.team !== u.team && s.hp > 0)], context) || target;
      }
      u.targetId = target.id;
      if (winding.has(u.id)) {
        u.stationaryTime += dt;
        u.action = 'attack'; u.heading = Math.atan2(target.x - u.x, target.z - u.z);
        continue;
      }
      const wasStationary = u.action !== 'walk';
      movementIntents.set(u.id, { wasStationary, target });
      if (u.rootTime <= EPSILON) {
        const moved = moveTactically(u, target, context, dt);
        u.stationaryTime = moved.distanceMoved > .01 ? 0 : u.stationaryTime + dt;
        if (UNIT_MAP[u.unitId].abilityId === 'charge' && !u.chargeUsed && u.attacks === 0) u.chargeDistance += moved.distanceMoved || 0;
      } else { u.stationaryTime += dt; u.action = 'idle'; u.heading = Math.atan2(target.x - u.x, target.z - u.z); }
    }
    // Every body reaches its new position before any unit checks weapon range.
    // Interleaving these phases grants the later team an extra closing step.
    resolveBodies(living, dt, context);
    for (const u of living) {
      const intent = movementIntents.get(u.id);
      if (!intent || u.hp <= 0 || u.stunTime > EPSILON) continue;
      let target = intent.target;
      if (!target || target.hp <= 0) continue;
      if ((context.reservations.get(target.id) || 0) >= target.hp + (target.shield || 0)) {
        target = chooseTacticalTarget(u, [...teams[other(u.team)], ...state.structures.filter(s => s.team !== u.team && s.hp > 0)], context) || target;
      }
      u.targetId = target.id;
      const reach = getAttackReach(u, target);
      if (distance(u, target) <= reach + EPSILON && state.time + EPSILON >= u.nextAttackAt && hasEngagementSlot(u, target, context)) {
        // Carry fractional cadence forward when continuously engaged. Quantizing
        // every new cooldown separately would slow a 1.15s attack to 1.2s forever.
        const startedAt = intent.wasStationary && u.action !== 'walk' ? Math.max(previousTime, u.nextAttackAt) : state.time;
        u.heading = Math.atan2(target.x - u.x, target.z - u.z);
        attack(u, target, startedAt);
        context.reservations.set(target.id, (context.reservations.get(target.id) || 0) + mitigatedDamage(target, u.damage, UNIT_MAP[u.unitId].attackType, u));
      }
    }
    for (const tower of state.structures) {
      if (tower.hp <= 0) continue;
      tower.cooldown = Math.max(0, tower.nextAttackAt - state.time);
      if (tower.attackPose && tower.attackPose.recoveryAt <= state.time + EPSILON) tower.attackPose = null;
      if (state.pendingAttacks.some(a => a.sourceId === tower.id)) continue;
      const range = tower.kind === 'castle' ? 15 : 13;
      const target = teams[other(tower.team)].filter(u => u.hp > 0 && distance(u, tower) <= range).sort((a, b) => distance(a, tower) - distance(b, tower) || a.id.localeCompare(b.id))[0];
      if (target && tower.cooldown <= EPSILON) attack(tower, target, Math.max(previousTime, tower.nextAttackAt));
    }
    state.units = state.units.filter(u => u.hp > 0);
    state.pendingAttacks = state.pendingAttacks.filter(a => state.units.some(u => u.id === a.sourceId && u.hp > 0) || state.structures.some(s => s.id === a.sourceId && s.hp > 0));
    updateTelemetry();

    const influence = { player: 0, enemy: 0 };
    for (const u of state.units) if (!u.summonedBy && Math.abs(u.x) < 8 && Math.abs(u.z) < 9) influence[u.team] += UNIT_MAP[u.unitId].supply;
    const pressure = influence.player - influence.enemy;
    const previous = state.control;
    if (pressure) state.control = clamp(state.control + Math.sign(pressure) * dt * 0.1 * Math.min(2, Math.abs(pressure) / 4), -1, 1);
    if (previous <= 0.7 && state.control > 0.7) note('Sunwell secured · +10 gold each payday.', 'success');
    if (previous >= -0.7 && state.control < -0.7) note('The enemy controls the Sunwell.', 'warning');
    updateEconomy(dt);
    const playerCastle = state.structures.find(s => s.id === 'player-castle');
    const enemyCastle = state.structures.find(s => s.id === 'enemy-castle');
    // At 12 minutes the unstable Sunwell tears at both castles, ending even a perfect stalemate.
    if (state.time >= 720) {
      for (const castle of [playerCastle, enemyCastle]) if (castle.hp > 0) {
        castle.hp = Math.max(0, castle.hp - dt * castle.maxHp * (1 / 150 + (castle.team === 'player' ? -1 : 1) * state.control / 900));
        if (castle.hp <= 0) sound('collapse', castle, { finale: true });
      }
      if (state.time - dt < 720) note('Sudden death · the Sunwell fractures both castles. Hold the center to slow the damage.', 'warning');
    }
    if (playerCastle.hp <= 0 || enemyCastle.hp <= 0) {
      state.status = enemyCastle.hp <= 0 && playerCastle.hp > 0 ? 'victory' : 'defeat';
      state.paused = false;
      note(state.status === 'victory' ? 'Victory! The enemy citadel has fallen.' : 'Defeat. Your citadel has fallen.', state.status === 'victory' ? 'success' : 'warning');
    }
  };
  updateEconomy(0);
  return {
    state,
    drainAudioEvents() { return audioEvents.splice(0); },
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
      const source = { id: 'player-commander', x, z, team: 'player' };
      const targets = nearby(source, spellId === 'meteor' ? 'enemy' : 'player', spell.radius);
      if (spellId !== 'meteor' && !targets.length) return fail('No allied units in that area.');
      state.gold -= spell.cost; state.spellCooldowns[spellId] = spell.cooldown;
      if (spellId === 'meteor') {
        const impactAt = tickTime(state.time + 1.4);
        const meteor = { id: id('attack'), sourceId: source.id, targetId: null, unitId: null, team: 'player', sourceKind: 'commander', kind: 'meteor', abilityId: null, startedAt: state.time, releaseAt: state.time, impactAt, x, z, tx: x, tz: z, radius: spell.radius, range: spell.radius, damage: 145, attackType: 'magic', attackNumber: 1, charge: false };
        state.projectiles.push(meteor);
        effect('meteor', source, source, impactAt - state.time, null, { phase: 'release', semanticKind: 'meteor', radius: spell.radius, sourceId: source.id, targetId: null, releaseAt: state.time, impactAt, attackId: meteor.id });
      } else if (spellId === 'mend') { for (const u of targets) heal(u, 150, source); effect('heal', source, source, 1.3); }
      else { for (const u of targets) { u.rallyTime = 10; u.shield = Math.max(u.shield, 70); u.shieldSource = { id: 'player-commander', team: 'player' }; } effect('rally', source, source, 1.3); }
      updateTelemetry();
      note(`${spell.name} cast.`, 'spell');
      return ok(`${spell.name}!`);
    },
    start() {
      if (state.status !== 'preparation') return fail('The battle has already begun.');
      updateEconomy(0);
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
  if (!s || ![2, 3].includes(s.version) || !FACTIONS.some(f => f.id === s.faction) || !FACTIONS.some(f => f.id === s.enemyFaction) || s.faction === s.enemyFaction) reject();
  const legacyCombat = s.version === 2;
  if (!['preparation', 'playing', 'victory', 'defeat'].includes(s.status) || !['easy', 'normal', 'hard'].includes(s.difficulty)) reject();
  const number = (n, lo, hi) => valid(n) && n >= lo && n <= hi;
  const integer = (n, lo, hi) => Number.isInteger(n) && number(n, lo, hi);
  if (!number(s.time, 0, 100000) || !integer(s.wave, 0, 4001) || !number(s.nextWave, 0, 25.001) || !number(s.gold, 0, MAX_GOLD) || !number(s.control, -1, 1) || !integer(s.seed, 0, 4294967295) || !integer(s.nextId, 1, 100000000)) reject();
  if (typeof s.paused !== 'boolean' || ![1, 1.5, 2, 3].includes(s.speed) || !number(s.accumulator, 0, 60) || !number(s.aiTimer, -0.2, 6.1)) reject();
  for (const wallet of [s, s.enemy]) {
    if (!wallet || !wallet.research || !number(wallet.gold, 0, MAX_GOLD) || !number(wallet.income, 0, 30)) reject();
    if (wallet.incomeAmount !== undefined && !number(wallet.incomeAmount, BASE_INCOME, BASE_INCOME + 4 * MINE_INCOME + SHRINE_INCOME)) reject();
    if (wallet.nextIncome !== undefined && !number(wallet.nextIncome, 0, INCOME_INTERVAL + 0.001)) reject();
    if (wallet.mineCooldown !== undefined && !number(wallet.mineCooldown, 0, MINE_COOLDOWN)) reject();
    for (const r of RESEARCH) if (!integer(wallet.research[r.id], 0, r.maxLevel)) reject();
    if (wallet.tier !== wallet.research.tier + 1 || wallet.mineLevel !== wallet.research.mines || wallet.supplyCap !== 24 + 12 * wallet.research.barracks) reject();
  }
  if (s.nextIncome !== undefined && s.enemy.nextIncome !== undefined && Math.abs(s.nextIncome - s.enemy.nextIncome) > 0.00001) reject();
  const ids = new Set();
  const unique = obj => {
    if (!obj || typeof obj.id !== 'string' || obj.id.length > 50 || ids.has(obj.id)) reject();
    const sequence = /^(?:r|u|e|fx|attack)(\d+)$/.exec(obj.id);
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
  const reference = value => value === null || (typeof value === 'string' && value.length <= 50);
  const absolute = value => number(value, 0, 100010);
  const validatePose = pose => {
    if (pose === null) return;
    if (!pose || typeof pose.id !== 'string' || !reference(pose.targetId) || !['melee', 'arrow', 'bolt', 'siege'].includes(pose.kind)) reject();
    for (const key of ['startedAt', 'releaseAt', 'recoveryAt']) if (!absolute(pose[key])) reject();
    if (pose.startedAt > pose.releaseAt || pose.releaseAt > pose.recoveryAt) reject();
  };
  if (!legacyCombat) {
    for (const effect of s.effects) {
      if (!['windup', 'release', 'impact', 'ability'].includes(effect.phase) || typeof effect.semanticKind !== 'string' || effect.semanticKind.length > 32) reject();
      if (!reference(effect.sourceId) || !reference(effect.targetId) || !reference(effect.unitId) || (effect.unitId && !UNIT_MAP[effect.unitId])) reject();
      for (const key of ['startedAt', 'releaseAt', 'impactAt']) if (!absolute(effect[key])) reject();
      if (effect.startedAt > s.time + EPSILON || effect.releaseAt > effect.impactAt + EPSILON || (effect.radius !== undefined && !number(effect.radius, 0, 30))) reject();
    }
    for (const u of s.units) {
      for (const key of ['nextAttackAt', 'rootUntil', 'stunUntil', 'controlRecoveryUntil', 'targetCommitUntil', 'retreatUntil', 'retreatCooldownUntil']) if (!absolute(u[key])) reject();
      for (const key of ['rootTime', 'armorBreak', 'chargeDistance', 'stationaryTime']) if (!number(u[key], 0, 100000)) reject();
      if (typeof u.chargeUsed !== 'boolean' || ![-1, 0, 1].includes(u.flankSide)) reject();
      validatePose(u.attackPose);
      for (const field of ['poisons', 'slows', 'armorBreaks']) {
        if (!Array.isArray(u[field]) || u[field].length > MAX_UNITS * 2) reject();
        for (const status of u[field]) {
          if (!status || !reference(status.sourceId) || !reference(status.unitId) || (status.unitId && !UNIT_MAP[status.unitId]) || !['player', 'enemy'].includes(status.team) || !number(status.amount, 0, field === 'slows' ? 1 : 10000) || !absolute(status.expiresAt)) reject();
        }
      }
      if (u.shieldSource && (!reference(u.shieldSource.id) || !['player', 'enemy'].includes(u.shieldSource.team))) reject();
    }
    for (const structure of s.structures) { if (!absolute(structure.nextAttackAt)) reject(); validatePose(structure.attackPose); }
    for (const queue of [s.pendingAttacks, s.projectiles]) {
      if (!Array.isArray(queue) || queue.length > 8192) reject();
      for (const a of queue) {
        unique(a);
        if (!reference(a.sourceId) || !reference(a.targetId) || !['player', 'enemy'].includes(a.team) || !['melee', 'arrow', 'bolt', 'siege', 'meteor'].includes(a.kind) || !['normal', 'piercing', 'magic', 'siege'].includes(a.attackType)) reject();
        if (a.unitId !== null && (!UNIT_MAP[a.unitId] || UNIT_MAP[a.unitId].faction !== (a.team === 'player' ? s.faction : s.enemyFaction))) reject();
        if (![null, 'castle', 'tower', 'commander'].includes(a.sourceKind) || (!a.unitId && !a.sourceKind) || (a.abilityId !== null && !ABILITY_RULES[a.abilityId])) reject();
        if (a.kind === 'meteor' && (a.sourceKind !== 'commander' || a.unitId !== null || a.targetId !== null || !number(a.radius, .1, 30))) reject();
        for (const key of ['startedAt', 'releaseAt', 'impactAt']) if (!absolute(a[key])) reject();
        if (a.startedAt > a.releaseAt + EPSILON || a.releaseAt > a.impactAt + EPSILON || !number(a.damage, 0, 100000) || !number(a.range, 0, 100) || !integer(a.attackNumber, 1, 1000000) || typeof a.charge !== 'boolean') reject();
        for (const key of ['x', 'z', 'tx', 'tz']) if (!number(a[key], -100, 100)) reject();
      }
    }
    const telemetry = s.telemetry;
    if (!telemetry || telemetry.window !== TELEMETRY_WINDOW || !Array.isArray(telemetry.events) || telemetry.events.length > 100000 || !telemetry.summary || !telemetry.damageByUnit) reject();
    const sums = telemetrySummary(), byType = { player: {}, enemy: {} };
    let previousEventTime = -1;
    for (const event of telemetry.events) {
      if (!event || !number(event.time, Math.max(0, s.time - TELEMETRY_WINDOW - .001), s.time + EPSILON) || event.time < previousEventTime || !['damage', 'healing', 'shielding'].includes(event.kind) || !['player', 'enemy'].includes(event.team) || !reference(event.sourceId) || !reference(event.targetId) || !reference(event.unitId) || (event.unitId && !UNIT_MAP[event.unitId]) || !number(event.amount, 0, 100000)) reject();
      previousEventTime = event.time;
      sums[event.team][event.kind] += event.amount;
      if (event.kind === 'damage' && event.unitId) byType[event.team][event.unitId] = (byType[event.team][event.unitId] || 0) + event.amount;
    }
    for (const team of ['player', 'enemy']) {
      const summary = telemetry.summary[team], totals = telemetry.damageByUnit[team];
      if (!summary || !totals || typeof totals !== 'object' || Array.isArray(totals)) reject();
      for (const key of ['damage', 'healing', 'shielding']) if (!number(summary[key], 0, 100000000) || Math.abs(summary[key] - sums[team][key]) > .0001) reject();
      for (const [unitId, amount] of Object.entries(totals)) if (!UNIT_MAP[unitId] || !number(amount, 0, 100000000) || Math.abs(amount - (byType[team][unitId] || 0)) > .0001) reject();
      for (const [unitId, amount] of Object.entries(byType[team])) if (Math.abs(amount - (totals[unitId] || 0)) > .0001) reject();
      const threat = summary.leadingThreat;
      if (threat !== null && (!threat || (threat.unitId !== null && !UNIT_MAP[threat.unitId]) || !number(threat.damage, 0, 100000000))) reject();
    }
  }
  if (legacyCombat) {
    s.version = 3;
    s.pendingAttacks = []; s.projectiles = [];
    s.telemetry = { window: TELEMETRY_WINDOW, events: [], summary: telemetrySummary(), damageByUnit: { player: {}, enemy: {} } };
    for (const u of s.units) {
      const previousPoison = { amount: u.poison, duration: u.poisonTime, team: u.poisonTeam || other(u.team) };
      const previousSlow = { amount: u.slowAmount, duration: u.slowTime };
      Object.assign(u, combatDefaults(u, s.time));
      if (previousPoison.duration > 0 && previousPoison.amount > 0) u.poisons.push({ sourceId: null, unitId: null, team: previousPoison.team, amount: previousPoison.amount, expiresAt: s.time + previousPoison.duration });
      if (previousSlow.duration > 0 && previousSlow.amount > 0) u.slows.push({ sourceId: null, unitId: null, team: other(u.team), amount: previousSlow.amount, expiresAt: s.time + previousSlow.duration });
      // A legacy hit already changed HP. Never replay it as a new v3 attack.
      u.chargeUsed = u.attacks > 0;
    }
    for (const structure of s.structures) { structure.nextAttackAt = s.time + structure.cooldown; structure.attackPose = null; }
    for (const e of s.effects) {
      e.sourceId ??= null; e.targetId ??= null; e.unitId ??= e.sourceUnitId || null;
      e.startedAt ??= Math.max(0, s.time - (e.maxLife - e.life)); e.releaseAt ??= e.startedAt; e.impactAt ??= e.startedAt;
      e.phase ??= 'ability'; e.semanticKind ??= e.type;
    }
  }

  // Keep v2 campaigns and their treasuries. Legacy continuous-income saves resume
  // at the next global payday; previously earned gold is never recalculated.
  const elapsedInPeriod = s.time % INCOME_INTERVAL;
  const legacyCountdown = elapsedInPeriod < 0.00001 || INCOME_INTERVAL - elapsedInPeriod < 0.00001 ? INCOME_INTERVAL : INCOME_INTERVAL - elapsedInPeriod;
  s.nextIncome ??= s.enemy.nextIncome ?? legacyCountdown;
  s.enemy.nextIncome = s.nextIncome;
  s.mineCooldown ??= 0;
  s.enemy.mineCooldown ??= 0;
  return makeEngine(s);
}
