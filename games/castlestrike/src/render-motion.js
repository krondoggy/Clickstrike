import { UNIT_MAP } from './data.js';

// The simulation advances at 10 Hz. Render one step behind it so each display
// frame can interpolate two known positions without predicting combat outcomes.
export const SIMULATION_STEP = .1;
export const clamp01 = value => Math.max(0, Math.min(1, value));
export const ease = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const angleBetween = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
export const bridgeHeight = (x, z) => .28 * (1 - ease((Math.abs(x) - 5.9) / .8)) * (1 - ease((Math.abs(z) - 9) / .5));

const snapshot = unit => ({ ...unit });
const heading = unit => Number.isFinite(unit.heading) ? unit.heading : unit.team === 'player' ? Math.PI / 2 : -Math.PI / 2;
const contactHeight = unit => unit?.flying || UNIT_MAP[unit?.unitId]?.role === 'flying' ? 5.5 : 1.5;

/** Presentation-only snapshots: never retain a mutable simulation unit. */
export class BattleMotion {
  constructor() { this.units = new Map(); this.structures = new Map(); this.effects = new Map(); this.time = 0; this.lastTick = 0; this.state = null; }

  sample(state, visible, dt = 0) {
    const tick = Number.isFinite(state.time) ? state.time : 0;
    const preparation = state.status === 'preparation';
    this.authoritative = state.version >= 3;
    this.ended = ['victory','defeat'].includes(state.status);
    const reset = this.state !== state || tick < this.lastTick - 1e-6 || tick - this.lastTick > .5 || preparation !== this.preparation;
    if (reset) { this.units.clear(); this.structures.clear(); this.effects.clear(); }
    const previousTime = this.time;
    const clock = preparation ? (reset ? 0 : this.time) + Math.max(0, Math.min(dt, .1)) : this.ended ? Math.min(tick + 1.6, (reset ? tick - SIMULATION_STEP : this.time) + Math.max(0,Math.min(dt,.1))) : Math.max(0, tick + Math.max(0, Math.min(state.accumulator || 0, SIMULATION_STEP)) - SIMULATION_STEP);
    this.time = state.paused && !reset ? this.time : clock;
    const delta = reset ? 0 : Math.max(0, Math.min(.2, this.time - previousTime));
    const seen = new Set(), result = [];
    for (const source of visible) {
      seen.add(source.id);
      let record = this.units.get(source.id);
      if (!record || record.current.unitId !== source.unitId || record.deathAt !== null) {
        record = { previous: snapshot(source), current: snapshot(source), previousTick: tick, tick, attackAt: -Infinity, hitAt: -Infinity, bornAt: reset || source.rosterId ? -Infinity : this.authoritative ? tick : this.time, deathAt: null };
        this.units.set(source.id, record);
      } else if (tick > record.tick + 1e-6 || preparation) {
        if ((source.attacks || 0) > (record.current.attacks || 0)) record.attackAt = tick - SIMULATION_STEP;
        if (source.hp < record.current.hp || (source.hitFlash || 0) > (record.current.hitFlash || 0) + .1) record.hitAt = tick;
        record.previous = record.current; record.previousTick = record.tick;
        record.current = snapshot(source); record.tick = tick;
      }
      if (this.time + 1e-8 >= record.bornAt) result.push(this._unit(record, source, delta, preparation));
    }
    for (const [id, record] of this.units) {
      if (seen.has(id)) continue;
      if (record.current.rosterId || preparation || reset) { this.units.delete(id); continue; }
      if (record.deathAt === null) record.deathAt = this.authoritative ? tick : tick - SIMULATION_STEP;
      if (this.time - record.deathAt >= .85) { this.units.delete(id); continue; }
      const dead = this.time + 1e-8 >= record.deathAt;
      result.push(this._unit(record, { ...record.current, hp: dead ? 0 : record.current.hp, action: dead ? 'dead' : record.current.action }, delta, false));
    }
    const structures = (state.structures || []).map(source => {
      let record = this.structures.get(source.id);
      if (!record) { record = { previous: snapshot(source), current: snapshot(source), tick }; this.structures.set(source.id, record); }
      else if (tick > record.tick + 1e-6) { record.previous = record.current; record.current = snapshot(source); record.tick = tick; }
      return this.authoritative && this.time + 1e-8 < record.tick ? record.previous : record.current;
    });
    const displayed = new Map([...result, ...structures].map(unit => [unit.id, unit]));
    for (const effect of state.effects || []) {
      if (!this.effects.has(effect.id)) {
        // The engine owns contact timing. Renderer and sound share this clock;
        // adding another cosmetic delay would separate a hit from its damage.
        const source = displayed.get(effect.sourceId || effect.sourceUnitId), target = displayed.get(effect.targetId || effect.targetUnitId);
        this.effects.set(effect.id, { ...effect, sourceY: contactHeight(source), targetY: contactHeight(target), startedAt: Number.isFinite(effect.startedAt) ? effect.startedAt : tick - ((effect.maxLife || 1) - effect.life) });
      } else {
        // Homing visuals may follow their original target, never a new target.
        const cached = this.effects.get(effect.id);
        cached.tx = effect.tx; cached.tz = effect.tz;
      }
    }
    const effects = [];
    for (const [id, effect] of this.effects) {
      if (effect.phase === 'release' && ['arrow', 'bolt'].includes(effect.semanticKind)) {
        const target = displayed.get(effect.targetId || effect.targetUnitId);
        if (target) { effect.tx = target.x; effect.tz = target.z; effect.targetY = contactHeight(target); }
      }
      const elapsed = this.time - effect.startedAt;
      if (elapsed >= (effect.maxLife || 1)) { this.effects.delete(id); continue; }
      if (elapsed >= 0) effects.push({ ...effect, life: (effect.maxLife || 1) - elapsed });
    }
    this.state = state; this.lastTick = tick; this.preparation = preparation;
    return { units: result, structures, effects, time: this.time, delta, reset };
  }

  _unit(record, source, delta, preparation) {
    const span = record.tick - record.previousTick;
    const alpha = preparation || span <= 1e-6 ? 1 : clamp01((this.time - record.previousTick) / span);
    const a = record.previous, b = record.current;
    const teleported = Math.hypot(b.x - a.x, b.z - a.z) > Math.max(3, (b.speed || 3) * Math.max(span, .1) * 3);
    const blend = teleported ? 1 : alpha;
    const attackDuration = Math.max(.4, Math.min(.72, (b.attackSpeed || 1.2) * .65));
    const discrete = this.authoritative && this.time + 1e-8 < record.tick ? a : source;
    const pose = this.time + 1e-8 < record.tick ? (b.attackPose || a.attackPose) : b.attackPose;
    let attack = (this.time - record.attackAt) / attackDuration;
    if (this.authoritative) {
      attack = Infinity;
      if (pose && !(discrete.stunTime > 0) && this.time >= pose.startedAt && this.time < pose.recoveryAt) {
        // The strike peak coincides with the engine's release/contact instant.
        attack = this.time <= pose.releaseAt
          ? (this.time - pose.startedAt) / Math.max(.001, pose.releaseAt - pose.startedAt) * .44
          : .44 + (this.time - pose.releaseAt) / Math.max(.001, pose.recoveryAt - pose.releaseAt) * .56;
      }
    }
    return {
      ...source, hp: source.action === 'dead' ? 0 : discrete.hp,
      shield: discrete.shield, poisonTime: discrete.poisonTime, curseTime: discrete.curseTime,
      slowTime: discrete.slowTime, stunTime: discrete.stunTime, rootTime: discrete.rootTime,
      hasteTime: discrete.hasteTime, rallyTime: discrete.rallyTime, armorBreakTime: discrete.armorBreakTime,
      armorBreak: discrete.armorBreak,
      x: lerp(a.x, b.x, blend), z: lerp(a.z, b.z, blend), heading: angleBetween(heading(a), heading(b), blend),
      motion: {
        delta, walk: this.ended ? 0 : lerp(a.action === 'walk' ? 1 : 0, b.action === 'walk' ? 1 : 0, alpha),
        speed: span > 1e-6 && !teleported ? Math.hypot(b.x - a.x, b.z - a.z) / span : b.speed || 2,
        attack,
        hit: Math.max(0, 1 - Math.max(0, this.time - record.hitAt) / .24) * (this.time >= record.hitAt ? 1 : 0),
        death: record.deathAt === null ? 0 : clamp01((this.time - record.deathAt) / .72),
        spawn: ease((this.time - record.bornAt) / .22),
      },
    };
  }
}

// Continuous pose curve with a deliberate windup, quick strike and long recovery.
export function attackPose(progress) {
  if (!Number.isFinite(progress) || progress < 0 || progress >= 1) return { windup: 0, strike: 0, strength: 0 };
  if (progress < .26) { const windup = ease(progress / .26); return { windup, strike: 0, strength: windup }; }
  if (progress < .44) { const strike = ease((progress - .26) / .18); return { windup: 1 - strike, strike, strength: 1 }; }
  const strike = 1 - ease((progress - .44) / .56);
  return { windup: 0, strike, strength: strike };
}
