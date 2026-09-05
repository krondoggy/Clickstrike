import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBalanceEngine, matchedUnitArmies, SIGNATURE_FIXTURES, runPaired } from './balance-harness.mjs';

const runtime = await loadBalanceEngine();
const normalizedFieldMargin = result => result.runsDetail.reduce((sum, run) => sum + (run.leftFieldValue - run.rightFieldValue) / run.leftCost, 0) / result.runs;

for (const fixture of SIGNATURE_FIXTURES) {
  test(`${fixture.label}: the specialist improves a comparable purchase, under both layouts and sides`, () => {
    const variant = runPaired(runtime, { left: fixture.variant, right: fixture.enemy, mode: 'screened' }, 2);
    const reference = runPaired(runtime, { left: fixture.reference, right: fixture.enemy, mode: 'screened' }, 2);
    assert.ok(variant.leftScore >= 0.7, `Specialist score ${variant.leftScore} must reach the 70% counter target`);
    const scoreGain = variant.leftScore - reference.leftScore;
    const valueGain = normalizedFieldMargin(variant) - normalizedFieldMargin(reference);
    assert.ok(scoreGain >= 0.15 || valueGain >= 0.1, `Marginal value must improve: score gain ${scoreGain}, field-value gain ${valueGain}`);
    assert.ok(variant.sideBias <= 0.05, `Side difference ${variant.sideBias} exceeds five percentage points`);
  });
}

for (const [counter, threat] of [['archer', 'wyvern'], ['cryptfiend', 'gryphon'], ['spearman', 'raider'], ['skeleton', 'raider'], ['knight', 'headhunter'], ['raider', 'mage']]) {
  test(`${counter} provides a real affordable answer to ${threat}`, () => {
    const fixture = matchedUnitArmies(runtime.data, counter, threat);
    assert.ok(fixture, 'A comparable legal purchase exists');
    const result = runPaired(runtime, fixture, 2);
    assert.ok(result.leftScore >= 0.7, `${counter} score ${result.leftScore} must reach the 70% counter target`);
    assert.ok(result.sideBias <= 0.05, `Side difference ${result.sideBias} exceeds five percentage points`);
  });
}
