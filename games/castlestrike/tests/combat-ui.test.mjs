import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/engine.js';
import { UNIT_MAP, FACTIONS } from '../src/data.js';
import { recommendCounters, concreteCounters } from '../src/combat-ui.js';

test('scouting explains faction-legal answers, exposes unlocks, and excludes an already-owned hero', () => {
  for (const faction of FACTIONS) {
    const state = createGame({ faction: faction.id }).state;
    state.enemyRoster = ['knight','gryphon','priest','abomination'].map(unitId=>({unitId}));
    state.roster.push({unitId:faction.heroId});
    const before=JSON.stringify(state), suggestions=recommendCounters(state);
    assert.ok(suggestions.length>0 && suggestions.length<=3);
    for(const {unit,target,reason,unlocked} of suggestions){
      assert.equal(unit.faction,faction.id);assert.notEqual(unit.id,faction.heroId);
      assert.ok(UNIT_MAP[target.id]);assert.ok(reason.length>15);
      assert.equal(unlocked,unit.tier<=state.tier);
    }
    assert.equal(JSON.stringify(state),before);
  }
});

test('scouting selected flyers never offers a recruit incapable of hitting air', () => {
  for(const faction of FACTIONS){
    const state=createGame({faction:faction.id}).state;
    const suggestions=recommendCounters(state,'frostwyrm');
    assert.ok(suggestions.length>0);
    assert.ok(suggestions.every(item=>item.unit.canHitAir));
  }
  const matchups=concreteCounters(UNIT_MAP.archer,'horde');
  assert.ok(matchups.strong.some(unit=>unit.id==='wyvern'));
  assert.ok(matchups.weak.every(unit=>unit.faction==='horde'));
});
