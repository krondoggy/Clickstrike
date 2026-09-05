import test from 'node:test';
import assert from 'node:assert/strict';
import { FACTIONS, UNITS, UNIT_MAP, ABILITY_RULES, counterScore, threatMatches } from '../src/data.js';
import { loadBalanceEngine, armyCost, armySupply, relativeBudgetGap, matchedUnitArmies, matchedDoctrines, matchedMarginalFixture, matchedMixedAnswer, SIGNATURE_FIXTURES, THREAT_PROFILES, runEncounter, runPaired } from './balance-harness.mjs';

const runtime = await loadBalanceEngine();

test('all 27 units expose automatic tactics, shared counter reasons and ability rules', () => {
  assert.equal(UNITS.length, 27);
  for (const u of UNITS) {
    assert.ok(u.tactics.length > 30, u.id);
    assert.deepEqual(Object.keys(u.targeting).sort(), ['antiAir', 'antiArmor', 'clusterHunter', 'flanker', 'healer', 'heroHunter', 'structureHunter'].sort());
    assert.ok(Object.values(u.targeting).every(value => typeof value === 'boolean'));
    assert.ok(u.counters.length >= 2, u.id);
    assert.ok(ABILITY_RULES[u.abilityId], `${u.id}: authoritative ability metadata`);
    for (const counter of u.counters) {
      assert.ok(counter.reason.length > 15);
      assert.ok([...UNITS, { kind: 'castle' }].some(target => threatMatches(target, counter.threat)), `${u.id}: recognized threat ${counter.threat}`);
    }
  }
});

test('shared scouting rules recognize actual threats and never recommend an illegal air attacker', () => {
  assert.equal(threatMatches('knight', 'cavalry'), true);
  assert.equal(threatMatches('gryphon', 'air'), true);
  assert.equal(threatMatches({ kind: 'castle' }, 'structures'), true);
  assert.equal(threatMatches('gryphon', 'cavalry'), false);
  assert.ok(counterScore('archer', 'wyvern') > 0);
  assert.ok(counterScore('spearman', 'raider') > 0);
  assert.ok(counterScore('shaman', 'knight') > 0);
  for (const unit of UNITS.filter(u => !u.canHitAir)) for (const flyer of UNITS.filter(u => u.role === 'flying')) assert.equal(counterScore(unit, flyer), 0);
});

test('balance fixtures match gold within 5% and preserve supply and unique heroes', () => {
  for (const a of UNITS) for (const b of UNITS.filter(u => u.faction !== a.faction)) {
    const fixture = matchedUnitArmies(runtime.data, a.id, b.id);
    if (!fixture) continue;
    assert.ok(relativeBudgetGap(fixture.leftCost, fixture.rightCost) <= 0.05);
    for (const army of [fixture.left, fixture.right]) {
      assert.ok(armySupply(runtime.data, army) <= 72);
      const heroes = army.filter(id => UNIT_MAP[id].hero);
      assert.equal(heroes.length, new Set(heroes).size);
    }
  }
  for (const faction of FACTIONS.slice(1)) {
    const fixture = matchedDoctrines(runtime.data, 'alliance', faction.id, 'balanced');
    assert.ok(fixture);
    assert.ok(relativeBudgetGap(fixture.leftCost, fixture.rightCost) <= 0.05);
  }
});

test('marginal-value fixtures hold the frontline and opponent fixed at comparable purchase cost', () => {
  for (const candidate of ['priest', 'shaman', 'necromancer']) {
    const fixtures = UNITS.filter(u => u.faction !== UNIT_MAP[candidate].faction).map(u => matchedMarginalFixture(runtime.data, candidate, u.id)).filter(Boolean);
    assert.ok(fixtures.length > 0, candidate);
    for (const f of fixtures) {
      assert.ok(f.variant.includes(candidate));
      assert.ok(!f.reference.includes(candidate));
      assert.ok(relativeBudgetGap(armyCost(runtime.data, f.variant), armyCost(runtime.data, f.reference)) <= 0.05);
      assert.ok(relativeBudgetGap(f.variantCost, f.enemyCost) <= 0.05);
      assert.ok(relativeBudgetGap(f.referenceCost, f.enemyCost) <= 0.05);
    }
  }
  for (const fixture of SIGNATURE_FIXTURES) {
    const costs = [fixture.variant, fixture.reference, fixture.enemy].map(army => armyCost(runtime.data, army));
    assert.ok(costs.every(a => costs.every(b => relativeBudgetGap(a, b) <= 0.05)), fixture.label);
  }
  const mixedAnswer = matchedMixedAnswer(runtime.data, 'gryphon', 'deathknight');
  assert.ok(mixedAnswer);
  assert.ok(relativeBudgetGap(mixedAnswer.leftCost, mixedAnswer.rightCost) <= 0.05);
});

test('the production-tick balance harness is reproducible and records both sides', () => {
  const fixture = matchedUnitArmies(runtime.data, 'archer', 'wyvern');
  const a = runEncounter(runtime, { ...fixture, seed: 12, seconds: 45 });
  const b = runEncounter(runtime, { ...fixture, seed: 12, seconds: 45 });
  assert.deepEqual(a, b);
  assert.ok(a.finite && a.peakUnits <= 180);
  const paired = runPaired(runtime, { ...fixture, seconds: 45 }, 1);
  assert.equal(paired.runs, 4);
  assert.ok(paired.runsDetail.some(r => r.swap) && paired.runsDetail.some(r => !r.swap));
  assert.ok(paired.runsDetail.some(r => r.layout === 'compact') && paired.runsDetail.some(r => r.layout === 'spread'));
});

test('named threat portfolios use real mixed screens, relevant tiers and explicit cavalry fallback', () => {
  for (const [profile, definition] of Object.entries(THREAT_PROFILES)) for (const tier of definition.tiers) {
    for (let i = 0; i < FACTIONS.length; i++) for (let j = i + 1; j < FACTIONS.length; j++) {
      const fixture = matchedDoctrines(runtime.data, FACTIONS[i].id, FACTIONS[j].id, profile, 1200, tier);
      assert.ok(fixture, `${profile} ${tier}`);
      assert.ok(relativeBudgetGap(fixture.leftCost, fixture.rightCost) <= 0.05);
      for (const army of [fixture.left, fixture.right]) {
        const units = army.map(id => UNIT_MAP[id]);
        assert.ok(units.every(u => u.tier <= tier));
        assert.ok(units.some(u => u.role === 'frontline'), 'A real melee screen');
        assert.ok(units.some(u => u.role === 'ranged'), 'A second role behind the screen');
        assert.ok(armySupply(runtime.data, army) <= 72);
        const heroes = units.filter(u => u.hero);
        assert.equal(heroes.length, new Set(heroes.map(u => u.id)).size);
        const matches = u => profile === 'armor' ? u.armorType === 'heavy' : profile === 'ranged' ? u.role === 'ranged' : profile === 'swarm' ? u.tier === 1 && u.role === 'frontline' : u.role === 'cavalry';
        if (profile === 'cavalry' && units[0].faction === 'undead') {
          assert.ok(definition.fallbacks.undead.includes('not a mounted-force test'));
          assert.ok(army.includes('ghoul') && army.includes('deathknight'));
        } else assert.ok(units.filter(matches).reduce((sum, u) => sum + u.cost, 0) / armyCost(runtime.data, army) >= 0.5, `${profile}: majority threat investment`);
      }
    }
  }
});
