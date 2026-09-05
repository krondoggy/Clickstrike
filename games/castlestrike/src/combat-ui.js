import { UNITS, UNIT_MAP, threatMatches, counterScore } from './data.js';

export function recommendCounters(state, selectedThreat = null) {
  const counts = new Map();
  for (const entry of state.enemyRoster || []) counts.set(entry.unitId, (counts.get(entry.unitId) || 0) + 1);
  const threats = selectedThreat ? [{ unit: UNIT_MAP[selectedThreat], count: 1 }] : [...counts].map(([id, count]) => ({ unit: UNIT_MAP[id], count }));
  return UNITS.filter(unit => unit.faction === state.faction && !(unit.hero && state.roster.some(entry => entry.unitId === unit.id))).map(unit => {
    const matches = threats.filter(t => t.unit && counterScore(unit, t.unit) > 0).map(t => ({ ...t, value: t.count * t.unit.cost * counterScore(unit, t.unit) }));
    matches.sort((a,b) => b.value-a.value || a.unit.id.localeCompare(b.unit.id));
    const strongest = matches[0];
    if (!strongest) return null;
    const owned = state.roster.filter(r => r.unitId === unit.id).length;
    const rule = unit.counters.find(counter => threatMatches(strongest.unit, counter.threat));
    const score = matches.reduce((sum,t)=>sum+t.value,0) / (1+owned*.35) * (unit.tier > state.tier ? .6 : 1);
    return { unit, target: strongest.unit, reason: rule.reason, score, unlocked: unit.tier <= state.tier, owned };
  }).filter(Boolean).sort((a,b)=>b.score-a.score || a.unit.cost-b.unit.cost || a.unit.id.localeCompare(b.unit.id)).slice(0,3);
}

export function concreteCounters(unit, enemyFaction) {
  const enemies = UNITS.filter(other => other.faction === enemyFaction);
  return {
    strong: enemies.filter(other => counterScore(unit, other) > 0).sort((a,b)=>counterScore(unit,b)-counterScore(unit,a) || a.cost-b.cost).slice(0,3),
    weak: enemies.filter(other => counterScore(other, unit) > 0).sort((a,b)=>counterScore(b,unit)-counterScore(a,unit) || a.cost-b.cost).slice(0,3),
  };
}
