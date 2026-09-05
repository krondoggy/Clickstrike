// This harness imports and advances the real game engine. It never approximates
// damage, movement, abilities or targeting with a second combat implementation.
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

export async function loadBalanceEngine(enginePath = 'games/castlestrike/src/engine.js') {
  const absolute = resolve(enginePath);
  const [engine, data] = await Promise.all([
    import(pathToFileURL(absolute).href),
    import(pathToFileURL(resolve(dirname(absolute), 'data.js')).href),
  ]);
  return { ...engine, data, enginePath: absolute };
}

export const armyCost = (data, army) => army.reduce((total, id) => total + data.UNIT_MAP[id].cost, 0);
export const armySupply = (data, army) => army.reduce((total, id) => total + data.UNIT_MAP[id].supply, 0);
export const relativeBudgetGap = (a, b) => Math.abs(a - b) / ((a + b) / 2);
const frontRoles = new Set(['frontline', 'hero', 'cavalry']);

export function matchedUnitArmies(data, leftId, rightId, desiredBudget = 900) {
  const a = data.UNIT_MAP[leftId], b = data.UNIT_MAP[rightId];
  let best = null;
  for (let na = 1; na <= (a.hero ? 1 : Math.min(18, Math.floor(72 / a.supply))); na++) {
    for (let nb = 1; nb <= (b.hero ? 1 : Math.min(18, Math.floor(72 / b.supply))); nb++) {
      const ca = na * a.cost, cb = nb * b.cost, mean = (ca + cb) / 2;
      if (mean < 350 || mean > 1500 || relativeBudgetGap(ca, cb) > 0.05) continue;
      const score = Math.abs(mean - desiredBudget) + relativeBudgetGap(ca, cb) * 100;
      if (!best || score < best.score) best = { left: Array(na).fill(leftId), right: Array(nb).fill(rightId), leftCost: ca, rightCost: cb, score };
    }
  }
  return best;
}

const doctrineRoles = {
  balanced: ['frontline', 'ranged', 'frontline', 'magic', 'support', 'frontline', 'siege', 'ranged'],
  pressure: ['frontline', 'cavalry', 'frontline', 'ranged', 'frontline', 'hero'],
  sustain: ['frontline', 'support', 'hero', 'frontline', 'support', 'ranged'],
  siege: ['frontline', 'siege', 'frontline', 'ranged', 'siege', 'support'],
  air: ['flying', 'ranged', 'flying', 'frontline', 'support'],
};

// Explicit mixed threat portfolios supplement the broad role doctrines. Each
// recipe keeps a screen and a second role, rather than relabeling a pure mass.
export const THREAT_PROFILES = Object.freeze({
  armor: { tiers: [1, 2, 3], label: 'Heavy armor with ranged/support backing', recipes: {
    alliance: ['footman', 'footman', 'archer', 'footman', 'priest', 'footman'],
    horde: ['grunt', 'ironmaw', 'headhunter', 'grunt', 'shaman', 'tauren'],
    undead: ['skeleton', 'abomination', 'cryptfiend', 'skeleton', 'necromancer', 'abomination'],
  } },
  ranged: { tiers: [1, 2, 3], label: 'Ranged majority behind a melee screen', recipes: {
    alliance: ['footman', 'archer', 'archer', 'archer', 'archer', 'priest'],
    horde: ['grunt', 'headhunter', 'headhunter', 'headhunter', 'headhunter', 'shaman'],
    undead: ['skeleton', 'cryptfiend', 'cryptfiend', 'cryptfiend', 'cryptfiend', 'necromancer'],
  } },
  cavalry: { tiers: [2, 3], label: 'Mounted pressure with mixed backing', recipes: {
    alliance: ['knight', 'footman', 'knight', 'archer', 'knight', 'priest'],
    horde: ['raider', 'grunt', 'raider', 'headhunter', 'raider', 'shaman'],
    undead: ['ghoul', 'ghoul', 'deathknight', 'ghoul', 'cryptfiend', 'ghoul'],
  }, fallbacks: { undead: 'No cavalry unit: Ghoul flankers plus Death Knight are a pressure surrogate, not a mounted-force test.' } },
  swarm: { tiers: [1, 2, 3], label: 'Numerous inexpensive bodies with ranged/support backing', recipes: {
    alliance: ['spearman', 'spearman', 'footman', 'spearman', 'archer', 'spearman', 'spearman', 'priest'],
    horde: ['grunt', 'grunt', 'grunt', 'grunt', 'headhunter', 'grunt', 'grunt', 'shaman'],
    undead: ['ghoul', 'skeleton', 'ghoul', 'ghoul', 'cryptfiend', 'ghoul', 'skeleton', 'necromancer'],
  } },
});

export function buildThreatDoctrine(data, faction, profile, budget, tier = 3) {
  const definition = THREAT_PROFILES[profile];
  if (!definition || !definition.tiers.includes(tier)) throw new Error(`Unavailable threat doctrine: ${profile} tier ${tier}`);
  const recipe = definition.recipes[faction].filter(id => data.UNIT_MAP[id].tier <= tier);
  const result = [];
  let spent = 0, supply = 0;
  for (let position = 0; position < 30; position++) {
    const legal = recipe.filter(id => {
      const unit = data.UNIT_MAP[id];
      return spent + unit.cost <= budget && supply + unit.supply <= 72 && (!unit.hero || !result.includes(id));
    });
    if (!legal.length) break;
    const requested = recipe[position % recipe.length];
    const selected = legal.includes(requested) ? requested : legal.sort((a, b) => data.UNIT_MAP[a].cost - data.UNIT_MAP[b].cost)[0];
    result.push(selected); spent += data.UNIT_MAP[selected].cost; supply += data.UNIT_MAP[selected].supply;
  }
  return result;
}

export function buildDoctrine(data, faction, profile, budget, tier = 3) {
  if (THREAT_PROFILES[profile]) return buildThreatDoctrine(data, faction, profile, budget, tier);
  const pattern = doctrineRoles[profile];
  if (!pattern) throw new Error(`Unknown doctrine: ${profile}`);
  const result = [], counts = new Map();
  const units = data.UNITS.filter(u => u.faction === faction && u.tier <= tier);
  let spent = 0, supply = 0;
  for (let position = 0; position < 30; position++) {
    const role = pattern[position % pattern.length];
    const legal = units.filter(u => u.cost + spent <= budget && u.supply + supply <= 72 && (!u.hero || !counts.has(u.id)));
    if (!legal.length) break;
    legal.sort((a, b) => {
      const score = u => (u.role === role ? 20 : 0) + (u.role === 'frontline' ? 2 : 0) + u.tier * 0.5 - (counts.get(u.id) || 0) * 2;
      return score(b) - score(a) || a.cost - b.cost || a.id.localeCompare(b.id);
    });
    const chosen = legal[0];
    result.push(chosen.id); spent += chosen.cost; supply += chosen.supply;
    counts.set(chosen.id, (counts.get(chosen.id) || 0) + 1);
  }
  return result;
}

export function matchedDoctrines(data, leftFaction, rightFaction, profile, desiredBudget = 1200, tier = 3) {
  let best = null;
  for (let budget = 600; budget <= 1800; budget += 10) {
    const left = buildDoctrine(data, leftFaction, profile, budget, tier);
    const right = buildDoctrine(data, rightFaction, profile, budget, tier);
    const ca = armyCost(data, left), cb = armyCost(data, right);
    if (!left.length || !right.length || relativeBudgetGap(ca, cb) > 0.05) continue;
    const score = Math.abs((ca + cb) / 2 - desiredBudget) + relativeBudgetGap(ca, cb) * 100;
    if (!best || score < best.score) best = { left, right, leftCost: ca, rightCost: cb, score };
  }
  return best;
}

// Replace one candidate with a comparable purchase of basic troops while keeping
// the same frontline. This measures support/caster marginal value instead of
// pretending that a healer should win an unsupported mirror duel.
export function matchedMarginalFixture(data, candidateId, opponentId) {
  const candidate = data.UNIT_MAP[candidateId], opponent = data.UNIT_MAP[opponentId];
  const basics = data.UNITS.filter(u => u.faction === candidate.faction && u.tier === 1 && u.id !== candidateId);
  const front = basics.filter(u => u.role === 'frontline').sort((a, b) => a.cost - b.cost)[0];
  if (!front) return null;
  let best = null;
  for (let bodyCount = 2; bodyCount <= 6; bodyCount++) {
    const base = Array(bodyCount).fill(front.id), variant = [...base, candidateId];
    const variantCost = armyCost(data, variant);
    let reference = null;
    for (let n = 1; n <= 6; n++) for (const filler of basics) {
      const army = [...base, ...Array(n).fill(filler.id)], cost = armyCost(data, army);
      if (armySupply(data, army) > 72 || relativeBudgetGap(cost, variantCost) > 0.05) continue;
      const score = Math.abs(cost - variantCost) + (filler.id !== front.id ? 1 : 0);
      if (!reference || score < reference.score) reference = { army, cost, score };
    }
    if (!reference) continue;
    for (let n = 1; n <= (opponent.hero ? 1 : Math.min(18, Math.floor(72 / opponent.supply))); n++) {
      const enemy = Array(n).fill(opponentId), cost = n * opponent.cost;
      if (relativeBudgetGap(cost, variantCost) > 0.05 || relativeBudgetGap(cost, reference.cost) > 0.05) continue;
      const score = Math.abs(variantCost - 750) + Math.abs(cost - variantCost) + reference.score;
      if (!best || score < best.score) best = { variant, reference: reference.army, enemy, variantCost, referenceCost: reference.cost, enemyCost: cost, score };
    }
  }
  return best;
}

export const SIGNATURE_FIXTURES = [
  { candidate: 'mage', opponent: 'grunt', label: 'Protected anti-armor casters', variant: ['footman', 'footman', 'mage', 'mage'], reference: ['footman', 'footman', 'spearman', 'spearman', 'spearman', 'spearman', 'spearman'], enemy: Array(6).fill('grunt') },
  { candidate: 'priest', opponent: 'ironmaw', label: 'Healing an expensive hero screen', variant: ['paladin', 'footman', 'footman', 'priest'], reference: ['paladin', 'footman', 'spearman', 'spearman', 'spearman'], enemy: ['grunt', 'grunt', 'grunt', 'headhunter', 'headhunter', 'headhunter', 'ironmaw'] },
  { candidate: 'shaman', opponent: 'paladin', label: 'Empowering an armored elite frontline', variant: ['tauren', 'ironmaw', 'shaman'], reference: ['tauren', 'ironmaw', 'grunt', 'grunt'], enemy: ['paladin', 'footman', 'footman', 'footman'] },
];

// Some hero/large-unit prices cannot be matched by integer copies of a single
// opponent. Include an affordable basic screen instead of declaring those units
// unanswerable solely because of purchase-price arithmetic.
export function matchedMixedAnswer(data, candidateId, opponentId) {
  const candidate = data.UNIT_MAP[candidateId], opponent = data.UNIT_MAP[opponentId];
  const fillers = data.UNITS.filter(u => u.faction === candidate.faction && u.tier === 1 && u.id !== candidateId);
  let best = null;
  for (const a of fillers) for (const b of fillers) for (let na = 0; na <= 3; na++) for (let nb = 0; nb <= 3; nb++) {
    if (a === b && nb > 0) continue;
    const left = [candidateId, ...Array(na).fill(a.id), ...Array(nb).fill(b.id)];
    const leftCost = armyCost(data, left);
    if (candidate.cost / leftCost < 0.5 || armySupply(data, left) > 72) continue;
    for (let n = 1; n <= (opponent.hero ? 1 : 6); n++) {
      const rightCost = n * opponent.cost;
      if (rightCost > 1500 || relativeBudgetGap(leftCost, rightCost) > 0.05 || n * opponent.supply > 72) continue;
      const score = Math.abs(leftCost - rightCost) + (leftCost - candidate.cost) * 0.05;
      if (!best || score < best.score) best = { left, right: Array(n).fill(opponentId), leftCost, rightCost, score };
    }
  }
  return best;
}

function formation(data, state, army, spread) {
  const used = new Set();
  const rows = spread ? [0, 5, 2, 3, 1, 4] : [2, 3, 1, 4, 0, 5];
  return army.map(unitId => {
    const u = data.UNIT_MAP[unitId];
    const columns = frontRoles.has(u.role) ? [4, 3, 2, 1, 0] : u.role === 'siege' ? [0, 1, 2, 3, 4] : [1, 0, 2, 3, 4];
    for (const col of columns) for (const row of rows) {
      if (used.has(`${row},${col}`)) continue;
      used.add(`${row},${col}`);
      return { id: `r${state.nextId++}`, unitId, row, col };
    }
    throw new Error('Formation overflow');
  });
}

export function runEncounter(runtime, { left, right, seed = 1, swap = false, layout = 'compact', mode = 'isolated', seconds = mode === 'multiwave' ? 300 : 120, research = 0 }) {
  const { data } = runtime;
  const playerArmy = swap ? right : left, enemyArmy = swap ? left : right;
  for (const army of [left, right]) {
    if (!army.length || army.length > 30 || armySupply(data, army) > 72) throw new Error('Invalid fixture army');
    const factions = new Set(army.map(id => data.UNIT_MAP[id].faction));
    if (factions.size !== 1) throw new Error('Mixed-faction fixtures are forbidden');
    const heroes = army.filter(id => data.UNIT_MAP[id].hero);
    if (new Set(heroes).size !== heroes.length) throw new Error('Duplicate heroes in fixture');
  }
  const game = runtime.createGame({ faction: data.UNIT_MAP[playerArmy[0]].faction, seed });
  const state = game.state;
  state.enemyFaction = data.UNIT_MAP[enemyArmy[0]].faction;
  state.roster = formation(data, state, playerArmy, layout === 'spread');
  state.enemyRoster = formation(data, state, enemyArmy, layout === 'spread');
  state.supply = armySupply(data, playerArmy);
  for (const wallet of [state, state.enemy]) {
    wallet.tier = 3; wallet.supplyCap = 72;
    wallet.research = { ...wallet.research, tier: 2, barracks: 4, weapons: research, armor: research };
  }
  game.start();
  state.aiTimer = 1e6;
  if (mode !== 'multiwave') {
    state.nextWave = 1e6;
    // Neutral arena: defensive fire and structures do not decide unit matchups.
    for (const structure of state.structures) {
      structure.hp = structure.maxHp = 1e9; structure.cooldown = 1e6;
      if ('nextAttackAt' in structure) structure.nextAttackAt = 1e6;
    }
    const spacing = layout === 'spread' ? 2.4 : 1.25;
    for (const team of ['player', 'enemy']) {
      const units = state.units.filter(u => u.team === team);
      const semanticSide = (team === 'player') !== swap ? 1 : 2;
      units.forEach((u, index) => {
        // A mirrored fixture keeps the same logical actors and initial clocks;
        // generated ID order must not become a hidden side-dependent variable.
        u.id = `u${semanticSide * 10000 + index}`;
        let randomState = (seed ^ Math.imul(index + 1, 0x85ebca6b) ^ Math.imul(semanticSide, 0xc2b2ae35)) >>> 0;
        const draw = () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 4294967296);
        u.cooldown = 0.15 + draw() * 0.4;
        if ('nextAttackAt' in u) u.nextAttackAt = u.cooldown;
        u.abilityCooldown = data.UNIT_MAP[u.unitId].abilityId === 'raise' ? 8 : 1 + draw() * 2;
      });
      const lines = [units.filter(u => frontRoles.has(data.UNIT_MAP[u.unitId].role)), units.filter(u => !frontRoles.has(data.UNIT_MAP[u.unitId].role))];
      lines.forEach((line, index) => line.forEach((u, i) => {
        u.x = (team === 'player' ? -1 : 1) * (mode === 'screened' && index ? 11.5 : 8);
        u.z = Math.max(-12, Math.min(12, (i - (line.length - 1) / 2) * spacing));
      }));
    }
    state.nextId = Math.max(state.nextId, 30000);
  }
  let winner = 'draw', resolution = 'timeout';
  const samples = [];
  for (let step = 0; step < seconds * 10 && state.status === 'playing'; step++) {
    game.update(0.1);
    if (step % 250 === 0) samples.push({ time: +state.time.toFixed(1), player: state.units.filter(u => u.team === 'player').length, enemy: state.units.filter(u => u.team === 'enemy').length });
    if (mode !== 'multiwave') {
      const players = state.units.some(u => u.team === 'player' && u.hp > 0);
      const enemies = state.units.some(u => u.team === 'enemy' && u.hp > 0);
      // Pending arrows/spells remain authoritative even after their caster falls.
      const pendingRetaliation = (state.projectiles || []).some(attack => ((!players && attack.team === 'player') || (!enemies && attack.team === 'enemy')) && (attack.kind === 'siege' || state.units.some(unit => unit.id === attack.targetId && unit.hp > 0)));
      if ((!players || !enemies) && !pendingRetaliation) {
        winner = players ? 'player' : enemies ? 'enemy' : 'draw'; resolution = 'elimination'; break;
      }
    }
  }
  if (state.status === 'victory' || state.status === 'defeat') { winner = state.status === 'victory' ? 'player' : 'enemy'; resolution = 'castle'; }
  const leftTeam = swap ? 'enemy' : 'player', rightTeam = swap ? 'player' : 'enemy';
  const fieldValue = team => state.units.filter(u => u.team === team).reduce((sum, u) => sum + data.UNIT_MAP[u.unitId].cost * Math.max(0, u.hp / u.maxHp) * (u.summonedBy ? 0.48 : 1), 0);
  const castleHealth = team => state.structures.find(s => s.id === `${team}-castle`).hp;
  return {
    winner: winner === 'draw' ? 'draw' : winner === leftTeam ? 'left' : 'right', resolution,
    time: +state.time.toFixed(1), leftCost: armyCost(data, left), rightCost: armyCost(data, right),
    leftFieldValue: +fieldValue(leftTeam).toFixed(2), rightFieldValue: +fieldValue(rightTeam).toFixed(2),
    leftCastleHealth: +castleHealth(leftTeam).toFixed(1), rightCastleHealth: +castleHealth(rightTeam).toFixed(1),
    peakUnits: state.stats.peakUnits, finite: state.units.every(u => ['x', 'z', 'hp', 'maxHp'].every(k => Number.isFinite(u[k]))),
    samples,
  };
}

export function summarizeRuns(runs) {
  const score = group => group.reduce((total, run) => total + (run.winner === 'left' ? 1 : run.winner === 'draw' ? 0.5 : 0), 0) / group.length;
  const normal = runs.filter(r => !r.swap), swapped = runs.filter(r => r.swap);
  return {
    runs: runs.length, leftWins: runs.filter(r => r.winner === 'left').length, rightWins: runs.filter(r => r.winner === 'right').length,
    draws: runs.filter(r => r.winner === 'draw').length, timeouts: runs.filter(r => r.resolution === 'timeout').length,
    leftScore: +score(runs).toFixed(4), sideBias: normal.length && swapped.length ? +Math.abs(score(normal) - score(swapped)).toFixed(4) : null,
    averageSeconds: +(runs.reduce((total, r) => total + r.time, 0) / runs.length).toFixed(1),
    peakUnits: Math.max(...runs.map(r => r.peakUnits)), finite: runs.every(r => r.finite),
  };
}

export function runPaired(runtime, fixture, seeds = 4, layouts = ['compact', 'spread']) {
  const runs = [];
  for (let index = 1; index <= seeds; index++) for (const layout of layouts) for (const swap of [false, true]) {
    const seed = (Math.imul(index, 0x9e3779b9) ^ 0xa5a5a5a5) >>> 0;
    runs.push({ seed, layout, swap, ...runEncounter(runtime, { ...fixture, seed, layout, swap }) });
  }
  return { ...summarizeRuns(runs), runsDetail: runs };
}
