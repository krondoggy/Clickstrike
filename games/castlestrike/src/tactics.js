import { UNIT_MAP, DAMAGE_MULTIPLIERS, ABILITY_RULES } from './data.js';

// Shared simulation geometry. The bridge's playable surface reaches z=±9.3;
// bodies keep their radius inside it. Flying units are not constrained by water.
export const TACTICAL_LIMITS = Object.freeze({ bridgeX: 6.4, bridgeZ: 9.3, battlefieldZ: 14, vision: 20, meleeSlots: 6 });
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const forward = unit => unit.team === 'player' ? 1 : -1;
const def = unit => UNIT_MAP[unit.unitId] || unit;
const airborne = unit => def(unit).role === 'flying';
const melee = unit => !unit.kind && (unit.range ?? def(unit).range ?? 1.6) <= 3;
const flanker = unit => !!def(unit).targeting?.flanker;
const interceptRadius = unit => ABILITY_RULES[def(unit).abilityId]?.interceptRadius || 0;
const backliner = unit => !unit.kind && !airborne(unit) && !melee(unit);
const living = unit => unit && unit.hp > 0;
const bodyRadius = unit => unit.kind ? unit.kind === 'castle' ? 3 : 1.2 : def(unit).role === 'siege' ? .66 : def(unit).role === 'cavalry' || ['tauren', 'abomination'].includes(unit.unitId) ? .57 : .46;
const legal = (unit, target) => living(target) && target.team !== unit.team && (!airborne(target) || def(unit).canHitAir);
const bucketKey = (x, z) => ((x + 64) << 8) | (z + 64);
const compareIds = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const commitmentDuration = unit => { let hash = 0; for (let i = 0; i < unit.id.length; i++) hash = (hash * 31 + unit.id.charCodeAt(i)) | 0; return .65 + (Math.abs(hash) % 5) * .08; };

export const getAttackReach = (unit, target) => (unit.range ?? def(unit).range ?? 1.6) + (target.kind ? target.kind === 'castle' ? 3 : 1.2 : .45);

const segmentDistance = (point, start, end) => {
  const dx = end.x - start.x, dz = end.z - start.z;
  const t = clamp(((point.x - start.x) * dx + (point.z - start.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return { distance: Math.hypot(point.x - start.x - dx * t, point.z - start.z - dz * t), t };
};

function constrain(point, unit) {
  const result = { x: clamp(point.x, -49, 49), z: clamp(point.z, -TACTICAL_LIMITS.battlefieldZ, TACTICAL_LIMITS.battlefieldZ) };
  if (!airborne(unit) && Math.abs(result.x) < TACTICAL_LIMITS.bridgeX + bodyRadius(unit)) result.z = clamp(result.z, -TACTICAL_LIMITS.bridgeZ + bodyRadius(unit), TACTICAL_LIMITS.bridgeZ - bodyRadius(unit));
  return result;
}

function estimateDamage(attack, target) {
  const armorType = target.kind ? 'fortified' : def(target).armorType || 'medium';
  return Math.max(0, attack.damage || 0) * (DAMAGE_MULTIPLIERS[attack.attackType]?.[armorType] ?? 1) / (1 + Math.max(0, target.armor || 0) * .055);
}

/** Build once before choosing/moving units. Position snapshots make steering
 * independent of which team's mutable unit array the engine processes first. */
export function buildTacticalContext(state) {
  const units = state.units.filter(living), structures = (state.structures || []).filter(living);
  const positions = new Map([...units, ...structures].map(unit => [unit.id, { x: unit.x, z: unit.z }]));
  const intents = new Map(units.map(unit => [unit.id, { targetId: unit.targetId, committed: (unit.targetCommitUntil || 0) > state.time }]));
  const byId = new Map([...units, ...structures].map(unit => [unit.id, unit]));
  const reservations = new Map(), engagementRanks = new Map(), enemyNear = new Map(), clusterSizes = new Map(), buckets = new Map();
  const meleeTeams = { player: [], enemy: [] }, engagementCounts = new Map();
  for (const unit of [...units, ...structures]) {
    const key = bucketKey(Math.floor(unit.x / 4), Math.floor(unit.z / 4));
    if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(unit);
    if (melee(unit)) {
      meleeTeams[unit.team].push(unit);
      if (unit.targetId) engagementCounts.set(unit.targetId, (engagementCounts.get(unit.targetId) || 0) + 1);
    }
  }
  for (const attack of [...(state.pendingAttacks || []), ...(state.projectiles || [])]) {
    const target = byId.get(attack.targetId);
    if (target) reservations.set(target.id, (reservations.get(target.id) || 0) + estimateDamage(attack, target));
  }
  return { state, time: state.time || 0, units, structures, positions, intents, byId, reservations, engagementRanks, engagementCounts, enemyNear, clusterSizes, buckets, meleeTeams, moved: new Map() };
}

function nearby(context, point, radius) {
  const result = [], minX = Math.floor((point.x - radius) / 4), maxX = Math.floor((point.x + radius) / 4), minZ = Math.floor((point.z - radius) / 4), maxZ = Math.floor((point.z + radius) / 4);
  for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
    const bucket = context.buckets.get(bucketKey(x, z)); if (bucket) result.push(...bucket);
  }
  return result;
}

function engagementRank(unit, target, context) {
  if (!context.engagementRanks.has(target.id)) {
    const point = context.positions.get(target.id) || target;
    const attackers = context.meleeTeams[target.team === 'player' ? 'enemy' : 'player'].filter(other => legal(other, target) && dist(context.positions.get(other.id), point) < 16);
    attackers.sort((a, b) => {
      const aIntent = context.intents.get(a.id), bIntent = context.intents.get(b.id);
      const aCommitted = aIntent.targetId === target.id && aIntent.committed, bCommitted = bIntent.targetId === target.id && bIntent.committed;
      if (aCommitted !== bCommitted) return aCommitted ? -1 : 1;
      if (aCommitted && bCommitted) return compareIds(a, b);
      return dist(context.positions.get(a.id), point) - dist(context.positions.get(b.id), point) || context.positions.get(a.id).z - context.positions.get(b.id).z || compareIds(a, b);
    });
    context.engagementRanks.set(target.id, new Map(attackers.map((other, rank) => [other.id, rank])));
  }
  return context.engagementRanks.get(target.id).get(unit.id) || 0;
}

export function hasEngagementSlot(unit, target, context) {
  return !melee(unit) || engagementRank(unit, target, context) < (target.kind ? 12 : TACTICAL_LIMITS.meleeSlots);
}

function screensBetween(unit, target, context) {
  const start = context.positions.get(unit.id) || unit, end = context.positions.get(target.id) || target;
  return context.meleeTeams[target.team].filter(other => {
    if (other.id === target.id || other.team !== target.team || !melee(other) || airborne(other)) return false;
    const p = context.positions.get(other.id), segment = segmentDistance(p, start, end);
    return segment.t > .08 && segment.t < .92 && segment.distance < (interceptRadius(other) || 1.55);
  });
}

function scoreTarget(unit, target, context) {
  const spec = def(unit), targetSpec = def(target), p = context.positions.get(unit.id), q = context.positions.get(target.id) || target;
  const distance = dist(p, q), reach = getAttackReach(unit, target);
  if (spec.role === 'siege' && !context.enemyNear.has(unit.id)) context.enemyNear.set(unit.id, nearby(context, p, 4).some(other => !other.kind && other.team !== unit.team && !airborne(other) && dist(p, context.positions.get(other.id)) < 4));
  const enemyNear = context.enemyNear.get(unit.id);
  let score = distance * .8;
  if (distance <= reach) score -= 1.2;
  if (target.kind) {
    score += 8;
    if (spec.targeting?.structureHunter && !enemyNear && distance <= reach + 3) score -= 13;
  } else {
    if (spec.canHitAir && spec.targeting?.antiAir && targetSpec.role === 'flying') score -= 7;
    if (spec.targeting?.antiArmor && targetSpec.armorType === 'heavy') score -= 5.5;
    if (spec.targeting?.heroHunter && targetSpec.hero) score -= 2.5;
    if (airborne(unit) && spec.attackType === 'magic' && targetSpec.armorType === 'heavy') score -= 3;
    if (airborne(unit) && targetSpec.role === 'siege') score -= 3;
    if (spec.attackType === 'piercing' && targetSpec.armorType === 'light') score -= 1.8;
    if (interceptRadius(unit) && targetSpec.role === 'cavalry') score -= 5;
    if (flanker(unit) && ['support', 'ranged', 'magic', 'siege'].includes(targetSpec.role)) {
      score -= 5.5;
      score += screensBetween(unit, target, context).reduce((sum, screen) => sum + (interceptRadius(screen) ? 5 : 2.2), 0);
    }
    // A unit already in contact must address that screen before chasing prey.
    if (melee(unit) && melee(target) && distance <= reach + .25) score -= 8;
    if (spec.targeting?.clusterHunter && !enemyNear) {
      if (!context.clusterSizes.has(target.id)) context.clusterSizes.set(target.id, nearby(context, q, 2.8).filter(other => !other.kind && other.team === target.team && !airborne(other) && dist(q, context.positions.get(other.id)) <= 2.8).length);
      const cluster = context.clusterSizes.get(target.id) || 1;
      score -= Math.min(8, (cluster - 1) * 2.5);
    }
    if (targetSpec.role === 'cavalry' && ['frontline', 'hero'].includes(spec.role)) {
      const threatened = nearby(context, q, 5).some(ally => ally.team === unit.team && backliner(ally) && dist(q, context.positions.get(ally.id)) < 5);
      if (threatened) score -= 3.5;
    }
  }
  if (melee(unit)) {
    const count = context.engagementCounts.get(target.id) || 0, slots = target.kind ? 12 : TACTICAL_LIMITS.meleeSlots;
    if (unit.targetId !== target.id && count >= slots) score += 8 + (count - slots) * 1.2;
  }
  const reserved = context.reservations.get(target.id) || 0;
  if (reserved >= target.hp + (target.shield || 0)) score += 5;
  return score;
}

/** Role priorities have finite reach and a switching threshold. A valuable
 * back-line target never grants passage through a physical enemy screen. */
export function chooseTacticalTarget(unit, candidates, context) {
  const here = context.positions.get(unit.id) || unit;
  const committed = context.byId.get(unit.targetId);
  if ((unit.targetCommitUntil || 0) > context.time && legal(unit, committed) && (committed.kind || dist(here, context.positions.get(committed.id)) <= TACTICAL_LIMITS.vision + 2) && (context.reservations.get(committed.id) || 0) < committed.hp + (committed.shield || 0)) return committed;
  let choices = candidates.filter(target => legal(unit, target) && (target.kind || dist(here, context.positions.get(target.id) || target) <= TACTICAL_LIMITS.vision));
  // A cleared lane still advances. Beyond local vision, simply march toward
  // the closest known opposition; do not apply distant counter priorities.
  if (!choices.length) choices = candidates.filter(target => legal(unit, target)).sort((a, b) => dist(here, context.positions.get(a.id) || a) - dist(here, context.positions.get(b.id) || b)).slice(0, 1);
  if (!choices.length) { unit.targetId = null; return null; }
  const scored = choices.map(target => ({ target, score: scoreTarget(unit, target, context) })).sort((a, b) => a.score - b.score || context.positions.get(a.target.id).z - context.positions.get(b.target.id).z || (context.positions.get(a.target.id).x - context.positions.get(b.target.id).x) * forward(unit) || compareIds(a.target, b.target));
  let best = scored[0], current = scored.find(candidate => candidate.target.id === unit.targetId);
  const alreadyLethal = current && (context.reservations.get(current.target.id) || 0) >= current.target.hp + (current.target.shield || 0);
  if (current && current.score <= best.score + (alreadyLethal ? .3 : (unit.targetCommitUntil || 0) > context.time ? 5 : 1.4)) best = current;
  if (unit.targetId !== best.target.id) {
    unit.targetId = best.target.id; unit.targetCommitUntil = context.time + commitmentDuration(unit);
    unit.flankSide = Math.sign(unit.z) || Math.sign(best.target.z) || 1;
  } else if ((unit.targetCommitUntil || 0) <= context.time) unit.targetCommitUntil = context.time + commitmentDuration(unit);
  return best.target;
}

function bridgeWaypoint(unit, destination) {
  if (airborne(unit)) return destination;
  const edge = TACTICAL_LIMITS.bridgeX + bodyRadius(unit) + .18, safeZ = TACTICAL_LIMITS.bridgeZ - bodyRadius(unit) - .15;
  if (unit.x < -edge && destination.x > -edge && (Math.abs(unit.z) > safeZ || Math.abs(destination.z) > safeZ)) {
    if (Math.abs(unit.z) > safeZ + .05) return { x: -edge - .12, z: clamp(unit.z, -safeZ, safeZ) };
    return { x: Math.min(destination.x, edge + .12), z: clamp(destination.z, -safeZ, safeZ) };
  }
  if (unit.x > edge && destination.x < edge && (Math.abs(unit.z) > safeZ || Math.abs(destination.z) > safeZ)) {
    if (Math.abs(unit.z) > safeZ + .05) return { x: edge + .12, z: clamp(unit.z, -safeZ, safeZ) };
    return { x: Math.max(destination.x, -edge - .12), z: clamp(destination.z, -safeZ, safeZ) };
  }
  if (Math.abs(unit.x) <= edge && Math.abs(destination.z) > safeZ) return { x: destination.x < 0 ? -edge - .2 : edge + .2, z: clamp(destination.z, -safeZ, safeZ) };
  return destination;
}

function meleeDestination(unit, target, context) {
  const point = context.positions.get(target.id) || target, rank = engagementRank(unit, target, context);
  const slots = target.kind ? 12 : TACTICAL_LIMITS.meleeSlots, row = Math.floor(rank / slots);
  // Spread the first six attackers over the facing semicircle; additional
  // troops wait just outside weapon reach instead of stacking inside victims.
  const angles = [0, -.5, .5, -1, 1, 1.48], offset = target.kind ? (rank % slots - 5.5) * .24 : angles[rank % slots];
  const radius = Math.max(bodyRadius(unit) + bodyRadius(target) + .08, getAttackReach(unit, target) - .16) + row * 1.25;
  const base = Math.atan2(unit.x - point.x, unit.z - point.z);
  const angle = (flanker(unit) ? base : -forward(unit) * Math.PI / 2) + offset * forward(unit);
  return { x: point.x + Math.sin(angle) * radius, z: point.z + Math.cos(angle) * radius };
}

function sweepClear(unit, end, context, neighbors) {
  const start = context.positions.get(unit.id) || unit, radius = bodyRadius(unit);
  for (const other of neighbors) {
    if (other.id === unit.id || !living(other) || airborne(other) !== airborne(unit)) continue;
    const p = context.positions.get(other.id) || other, separation = radius + bodyRadius(other), startDistance = dist(start, p);
    if (p.x < Math.min(start.x, end.x) - separation || p.x > Math.max(start.x, end.x) + separation || p.z < Math.min(start.z, end.z) - separation || p.z > Math.max(start.z, end.z) + separation) continue;
    const nearest = segmentDistance(p, start, end);
    if (nearest.distance < separation - .015) {
      // Spawn overlaps can escape but cannot move deeper through another body.
      if (startDistance < separation && dist(end, p) > startDistance + 1e-5) continue;
      return false;
    }
  }
  return true;
}

/** Mutates only movement/intent, never health, attack cadence or damage.
 * distanceMoved excludes later separation pushes, for genuine charge run-ups. */
export function moveTactically(unit, target, context, dt) {
  if (!target || !living(unit) || !(dt > 0) || unit.stunTime > 0 || unit.rootTime > 0) return { distanceMoved: 0 };
  const start = context.positions.get(unit.id) || { x: unit.x, z: unit.z }, goal = context.positions.get(target.id) || target;
  const spec = def(unit), reach = getAttackReach(unit, target), distance = dist(start, goal), direction = forward(unit);
  unit.heading = Math.atan2(goal.x - start.x, goal.z - start.z);
  let destination = goal, shouldMove = distance > reach - .06;
  if (melee(unit)) {
    destination = meleeDestination(unit, target, context);
    const rank = engagementRank(unit, target, context);
    if (distance <= reach && rank < (target.kind ? 12 : TACTICAL_LIMITS.meleeSlots)) shouldMove = false;
    else shouldMove = dist(start, destination) > .1;
    if (shouldMove && flanker(unit) && !target.kind && !melee(target)) {
      const blockers = screensBetween(unit, target, context).filter(other => dist(start, context.positions.get(other.id)) < 8);
      if (blockers.length) {
        const nearest = blockers.sort((a, b) => dist(start, context.positions.get(a.id)) - dist(start, context.positions.get(b.id)))[0];
        const side = unit.flankSide || 1, p = context.positions.get(nearest.id);
        const flankZ = clamp(p.z + side * (interceptRadius(nearest) ? interceptRadius(nearest) + .3 : 2.4), -8.5, 8.5);
        if (Math.abs(start.z - flankZ) > .4 && (goal.x - start.x) * direction > 0) destination = { x: p.x - direction * 1.4, z: flankZ };
      }
    }
  } else if (!airborne(unit)) {
    const threat = nearby(context, start, 3.6).filter(other => other.team !== unit.team && melee(other) && !airborne(other)).sort((a, b) => dist(start, context.positions.get(a.id)) - dist(start, context.positions.get(b.id)))[0];
    const danger = threat && dist(start, context.positions.get(threat.id)) < Math.min(3.6, Math.max(2.5, reach * .37));
    if (danger && spec.role !== 'siege' && (unit.cooldown || 0) > .15 && context.time >= (unit.retreatCooldownUntil || 0)) {
      unit.retreatUntil = context.time + .55; unit.retreatCooldownUntil = context.time + 3.4;
    }
    if (danger && context.time < (unit.retreatUntil || 0)) {
      const p = context.positions.get(threat.id), dx = start.x - p.x, dz = start.z - p.z, length = Math.hypot(dx, dz) || 1;
      destination = { x: start.x + dx / length * 2, z: start.z + dz / length * 2 }; shouldMove = true;
    } else if (shouldMove) {
      const screen = context.meleeTeams[unit.team].filter(ally => !airborne(ally) && dist(start, context.positions.get(ally.id)) < 13 && Math.abs(context.positions.get(ally.id).z - start.z) < 6).sort((a, b) => (context.positions.get(b.id).x - context.positions.get(a.id).x) * direction)[0];
      if (screen) {
        const p = context.positions.get(screen.id), rear = spec.role === 'siege' ? 4 : spec.role === 'support' ? 3.1 : 2.3;
        const backX = p.x - direction * rear;
        if ((backX - start.x) * direction <= .15 && (goal.x - p.x) * direction > 0) shouldMove = false;
        else destination = { x: (goal.x - backX) * direction > 0 ? backX : goal.x, z: start.z + (p.z - start.z) * .12 };
      }
    }
  }
  if (!shouldMove) { unit.action = distance <= reach ? 'attack' : 'idle'; context.moved.set(unit.id, 0); return { distanceMoved: 0 }; }
  destination = bridgeWaypoint(unit, destination);
  // Earlier saves allowed ground units outside the bridge surface. Bring such
  // units back onto valid ground gradually instead of freezing or teleporting.
  const legalStart = constrain(start, unit), terrainError = dist(start, legalStart);
  if (terrainError > .015) destination = legalStart;
  const dx = destination.x - start.x, dz = destination.z - start.z, length = Math.hypot(dx, dz);
  if (length < .03) { unit.action = distance <= reach ? 'attack' : 'idle'; return { distanceMoved: 0 }; }
  const slow = unit.slowTime > 0 ? 1 - (unit.slowAmount || 0) : 1;
  const travel = Math.min(length, Math.max(0, unit.speed ?? spec.speed ?? 2) * dt * slow);
  const neighbors = nearby(context, start, travel + bodyRadius(unit) + 3.1);
  const preference = unit.flankSide || Math.sign(unit.z) || 1, offsets = [0, .42 * preference, -.42 * preference, .85 * preference, -.85 * preference, 1.25 * preference, -1.25 * preference];
  let best = null;
  for (const offset of offsets) {
    const c = Math.cos(offset * direction), s = Math.sin(offset * direction);
    const proposed = { x: start.x + (dx * c - dz * s) / length * travel, z: start.z + (dx * s + dz * c) / length * travel };
    const end = constrain(proposed, unit);
    const proposedError = dist(end, proposed);
    const recoveringTerrain = terrainError > .015 && proposedError < terrainError - .0001;
    if ((proposedError > .015 && !recoveringTerrain) || !sweepClear(unit, recoveringTerrain ? proposed : end, context, neighbors)) continue;
    // Angles are ordered by forward progress; the first clear segment is
    // already optimal. Clear lanes do one sweep, not seven identical scans.
    best = recoveringTerrain ? proposed : end; break;
  }
  if (!best) { unit.action = distance <= reach ? 'attack' : 'idle'; context.moved.set(unit.id, 0); return { distanceMoved: 0 }; }
  unit.x = best.x; unit.z = best.z; unit.action = 'walk';
  unit.heading = Math.atan2(best.x - start.x, best.z - start.z);
  const distanceMoved = dist(start, best); context.moved.set(unit.id, distanceMoved);
  return { distanceMoved };
}

/** Simultaneous corrections treat both armies equally. Sweeps prevent crossing
 * bodies in one step; these small corrections resolve opposing advances. */
export function resolveBodies(units, dt = .1, context = null) {
  const alive = units.filter(living);
  const radii = alive.map(bodyRadius), air = alive.map(airborne);
  for (let iteration = 0; iteration < 5; iteration++) {
    const pushes = alive.map(() => ({ x: 0, z: 0 }));
    const buckets = new Map();
    for (let i = 0; i < alive.length; i++) {
      const key = bucketKey(Math.floor(alive[i].x / 1.5), Math.floor(alive[i].z / 1.5));
      if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(i);
    }
    let overlaps = false;
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i], cellX = Math.floor(a.x / 1.5), cellZ = Math.floor(a.z / 1.5);
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) for (const j of buckets.get(bucketKey(cellX + ox, cellZ + oz)) || []) {
      if (j <= i || air[i] !== air[j]) continue;
      const b = alive[j], minimum = radii[i] + radii[j], dx = b.x - a.x, dz = b.z - a.z;
      if (Math.abs(dx) >= minimum || Math.abs(dz) >= minimum) continue;
      const length = Math.hypot(dx, dz); if (length >= minimum - .01) continue;
      overlaps = true;
      const ux = length > .0001 ? dx / length : a.team !== b.team ? forward(a) : 0;
      const uz = length > .0001 ? dz / length : a.team === b.team ? (a.id < b.id ? 1 : -1) : 0;
      const push = Math.min(.16, (minimum - length + .005) * .5);
      pushes[i].x -= ux * push; pushes[i].z -= uz * push; pushes[j].x += ux * push; pushes[j].z += uz * push;
      }
    }
    if (!overlaps) break;
    for (let i = 0; i < alive.length; i++) {
      const unit = alive[i], push = pushes[i], length = Math.hypot(push.x, push.z), limit = Math.min(1, .24 / (length || 1));
      const p = constrain({ x: unit.x + push.x * limit, z: unit.z + push.z * limit }, unit);
      unit.x = p.x; unit.z = p.z;
    }
  }
  // Context is optional for integration callers. Never count body shoves as
  // deliberate travel when evaluating a cavalry charge or a stationary brace.
  return context?.moved || new Map();
}
