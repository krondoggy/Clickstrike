import { ABILITY_RULES, UNIT_MAP } from './data.js';
import { activeStatuses } from './combat-status.js';

/**
 * Stats for the next reinforcement, or the current deployed unit when supplied.
 * Damage is per ordinary hit before target armor and matchup/periodic bonuses;
 * attackInterval is seconds per attack, and range/speed use battlefield meters.
 * Live stats include active modifiers, while already-spawned research and hero
 * levels remain attached to that unit. This does not mutate simulation state.
 */
export function getUnitStats(state, unitId, { team = 'player', live = null } = {}) {
  const def = UNIT_MAP[unitId];
  if (!def || (live && live.unitId !== unitId)) return null;

  if (!live) {
    const tech = (team === 'enemy' ? state.enemy.research : state.research);
    const level = def.hero ? 1 + Math.floor(Math.max(0, state.wave) / 5) : 1;
    const maxHp = Math.round(def.hp * (1 + tech.armor * 0.08) * (1 + (level - 1) * 0.12));
    return {
      health: maxHp, maxHp,
      damage: def.damage * (1 + tech.weapons * 0.12) * (1 + (level - 1) * 0.1),
      armor: def.armor + tech.armor * 2,
      attackInterval: def.attackSpeed, range: def.range,
      speed: def.speed * (def.faction === 'horde' ? 1.08 : 1),
      level, attackType: def.attackType, armorType: def.armorType,
      shield: 0, statuses: [],
    };
  }

  const statuses = activeStatuses(live).map(status => status.label);
  const fury = live.hp > 0 && def.abilityId === 'fury' && live.hp < live.maxHp * ABILITY_RULES.fury.threshold;
  const beacon = live.hp > 0 && state.units.some(ally => ally.hp > 0 && ally.team === live.team
    && ally.unitId === 'paladin' && Math.hypot(ally.x - live.x, ally.z - live.z) <= ABILITY_RULES.beacon.auraRadius);
  if (fury) statuses.push('Blood Fury');
  if (beacon) statuses.push('Beacon of Dawn');

  return {
    health: live.hp, maxHp: live.maxHp,
    damage: live.damage * (live.curseTime > 0 ? 1 - ABILITY_RULES.curse.damageReduction : 1)
      * (fury ? ABILITY_RULES.fury.damageMultiplier : 1),
    armor: live.armor - (live.armorBreak || 0) + (beacon ? ABILITY_RULES.beacon.armor : 0),
    attackInterval: live.attackSpeed / (1 + (live.hasteTime > 0 ? ABILITY_RULES.bloodlust.amount : 0) + (live.rallyTime > 0 ? 0.35 : 0)),
    range: live.range,
    speed: live.rootTime > 0 || live.stunTime > 0 ? 0 : live.speed * (live.slowTime > 0 ? 1 - (live.slowAmount || 0) : 1),
    level: live.level ?? 1, attackType: def.attackType, armorType: def.armorType,
    shield: live.shield || 0, statuses,
  };
}
