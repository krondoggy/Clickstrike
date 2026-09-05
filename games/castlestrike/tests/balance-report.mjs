import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadBalanceEngine, armyCost, relativeBudgetGap, matchedUnitArmies, matchedDoctrines, matchedMarginalFixture, matchedMixedAnswer, SIGNATURE_FIXTURES, runPaired } from './balance-harness.mjs';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const seeds = Number(option('--seeds', '4'));
const multiwaveSeconds = Number(option('--multiwave-seconds', '150'));
if (!Number.isInteger(seeds) || seeds < 1 || seeds > 50) throw new Error('Choose 1–50 seeds');
if (!Number.isInteger(multiwaveSeconds) || multiwaveSeconds < 75 || multiwaveSeconds > 900) throw new Error('Choose 75–900 seconds for multiwave fixtures');
const runtime = await loadBalanceEngine(option('--engine', undefined));
// Frozen engine snapshots intentionally use current declared counter metadata to
// test the same intended matchups before and after implementation.
const current = await loadBalanceEngine();
const output = resolve(option('--out', 'test-results/balance-current'));
const report = {
  generatedAt: new Date().toISOString(), enginePath: runtime.enginePath,
  engineHash: createHash('sha256').update(await readFile(runtime.enginePath)).digest('hex'),
  dataHash: createHash('sha256').update(await readFile(resolve(dirname(runtime.enginePath), 'data.js'))).digest('hex'),
  tacticsHash: await readFile(resolve(dirname(runtime.enginePath), 'tactics.js')).then(bytes => createHash('sha256').update(bytes).digest('hex')).catch(() => null),
  seeds, multiwaveSeconds, layouts: ['compact', 'spread'], pairedSides: true, budgetTolerance: 0.05,
  mirrorProtocol: 'Well-spaced 32-bit seeds. Isolated/screened sides retain semantic IDs and initial clocks. Multiwave scenarios use production spawn identities and randomness.',
  interpretation: 'Controlled unit and fixed-roster tests, not player win rates. Timeout is a draw, never a claimed victory. Faction signals describe this scenario portfolio only. Hero cost prevents some 5%-matched pairs; these are listed as untested.',
  duels: [], untested: [], mixed: [], marginal: [], mixedAnswers: [], factionSignals: [], coverage: [], flags: [],
};

const scoreMarginal = fixture => {
  const costs = [fixture.variant, fixture.reference, fixture.enemy].map(army => armyCost(runtime.data, army));
  if (costs.some(a => costs.some(b => relativeBudgetGap(a, b) > 0.05))) throw new Error(`Invalid marginal budget: ${fixture.label || fixture.candidate}`);
  const variant = runPaired(runtime, { left: fixture.variant, right: fixture.enemy, mode: 'screened' }, seeds);
  const reference = runPaired(runtime, { left: fixture.reference, right: fixture.enemy, mode: 'screened' }, seeds);
  const fieldMargin = result => result.runsDetail.reduce((sum, run) => sum + (run.leftFieldValue - run.rightFieldValue) / run.leftCost, 0) / result.runs;
  const scoreGain = variant.leftScore - reference.leftScore, valueGain = fieldMargin(variant) - fieldMargin(reference);
  return { ...fixture, variantArmy: fixture.variant, referenceArmy: fixture.reference, enemyArmy: fixture.enemy, variant, reference, scoreGain, valueGain, useful: variant.leftScore >= 0.7 && (scoreGain >= 0.15 || valueGain >= 0.1) };
};

for (let i = 0; i < runtime.data.UNITS.length; i++) {
  const left = runtime.data.UNITS[i];
  for (let j = i + 1; j < runtime.data.UNITS.length; j++) {
    const right = runtime.data.UNITS[j];
    if (left.faction === right.faction) continue;
    const fixture = matchedUnitArmies(runtime.data, left.id, right.id);
    if (!fixture) { report.untested.push({ left: left.id, right: right.id, reason: 'No legal 5%-matched quantity within fixture limits.' }); continue; }
    const result = runPaired(runtime, fixture, seeds);
    report.duels.push({ left: left.id, right: right.id, leftArmy: fixture.left, rightArmy: fixture.right, leftCost: fixture.leftCost, rightCost: fixture.rightCost, ...result });
  }
  console.log(`Unit matrix: ${i + 1}/${runtime.data.UNITS.length} unit rows complete`);
}

for (const pair of report.untested) {
  for (const [candidate, opponent] of [[pair.left, pair.right], [pair.right, pair.left]]) {
    const fixture = matchedMixedAnswer(runtime.data, candidate, opponent);
    if (!fixture) continue;
    report.mixedAnswers.push({ candidate, opponent, leftArmy: fixture.left, rightArmy: fixture.right, leftCost: fixture.leftCost, rightCost: fixture.rightCost,
      ...runPaired(runtime, { ...fixture, mode: 'screened' }, seeds) });
  }
}
console.log('Mixed affordable-answer fixtures complete');

for (const unit of runtime.data.UNITS) {
  for (const opponent of runtime.data.UNITS.filter(u => u.faction !== unit.faction && current.data.counterScore(unit.id, u.id) > 0)) {
    const fixture = matchedMarginalFixture(runtime.data, unit.id, opponent.id);
    if (!fixture) continue;
    report.marginal.push(scoreMarginal({ candidate: unit.id, opponent: opponent.id, ...fixture }));
  }
  console.log(`Marginal-value fixtures complete: ${unit.id}`);
}
for (const fixture of SIGNATURE_FIXTURES) report.marginal.push(scoreMarginal(fixture));

for (let i = 0; i < runtime.data.FACTIONS.length; i++) for (let j = i + 1; j < runtime.data.FACTIONS.length; j++) {
  const left = runtime.data.FACTIONS[i].id, right = runtime.data.FACTIONS[j].id;
  for (const tier of [1, 2, 3]) for (const profile of tier < 3 ? ['balanced', 'pressure', 'sustain'] : ['balanced', 'pressure', 'sustain', 'siege', 'air']) {
    const fixture = matchedDoctrines(runtime.data, left, right, profile, 1200, tier);
    if (!fixture) { report.untested.push({ left, right, profile, tier, reason: 'No matched doctrine budget.' }); continue; }
    for (const mode of ['screened', 'multiwave']) {
      const result = runPaired(runtime, { ...fixture, mode, seconds: mode === 'multiwave' ? multiwaveSeconds : 120 }, seeds);
      report.mixed.push({ leftFaction: left, rightFaction: right, tier, profile, mode, leftArmy: fixture.left, rightArmy: fixture.right, leftCost: fixture.leftCost, rightCost: fixture.rightCost, ...result });
    }
  }
  console.log(`Mixed and multi-wave scenarios complete: ${left} vs ${right}`);
}

for (const unit of runtime.data.UNITS) {
  const rows = report.duels.filter(row => row.left === unit.id || row.right === unit.id).map(row => {
    const other = row.left === unit.id ? row.right : row.left;
    return { opponent: other, score: row.left === unit.id ? row.leftScore : 1 - row.leftScore, declared: current.data.counterScore(unit.id, other) > 0, sideBias: row.sideBias };
  });
  const useful = rows.filter(row => row.declared && row.score >= 0.7);
  const synergy = report.marginal.filter(row => row.candidate === unit.id && row.useful);
  const answers = rows.filter(row => row.score <= 0.3);
  const mixedAnswers = report.mixedAnswers.filter(row => row.opponent === unit.id && row.leftScore >= 0.7);
  const failures = rows.filter(row => row.declared && row.score < 0.7);
  report.coverage.push({ unit: unit.id, useful: useful.map(r => r.opponent), synergy: synergy.map(r => r.opponent), answers: answers.map(r => r.opponent), mixedAnswers: mixedAnswers.map(r => r.leftArmy), unprovenDeclaredCounters: failures, isolatedCoverage: useful.length > 0 && answers.length > 0, supportRequiresMixedEvidence: unit.role === 'support' });
  if (!useful.length && !synergy.length) report.flags.push({ type: 'MISSING_USEFUL_MATCHUP', unit: unit.id, detail: 'Neither a declared direct counter nor a screened marginal-value fixture reaches its acceptance threshold.' });
  if (!answers.length && !mixedAnswers.length) report.flags.push({ type: 'MISSING_AFFORDABLE_ANSWER', unit: unit.id });
}

for (const row of [...report.duels, ...report.mixed, ...report.mixedAnswers]) if (row.sideBias > 0.05) report.flags.push({ type: 'SIDE_BIAS_OVER_5_POINTS', left: row.left || row.leftFaction || row.candidate, right: row.right || row.rightFaction || row.opponent, mode: row.mode || 'isolated', profile: row.profile, sideBias: row.sideBias });
for (let i = 0; i < runtime.data.FACTIONS.length; i++) for (let j = i + 1; j < runtime.data.FACTIONS.length; j++) {
  const left = runtime.data.FACTIONS[i].id, right = runtime.data.FACTIONS[j].id;
  const rows = report.mixed.filter(r => r.leftFaction === left && r.rightFaction === right);
  const score = rows.reduce((sum, r) => sum + r.leftScore, 0) / rows.length;
  report.factionSignals.push({ left, right, score, scenarios: rows.length });
  if (score < 0.4 || score > 0.6) report.flags.push({ type: 'FACTION_PORTFOLIO_OUTSIDE_40_60', left, right, score, detail: 'Diagnostic portfolio imbalance, not a measured full-match player win rate.' });
}
if ([...report.duels, ...report.mixed].some(r => !r.finite || r.peakUnits > 180)) report.flags.push({ type: 'SIMULATION_INVARIANT_FAILURE' });

const lines = [
  '# Castle Strike balance evidence', '',
  `Engine SHA-256: \`${report.engineHash}\``, `Data SHA-256: \`${report.dataHash}\``, ...(report.tacticsHash ? [`Tactics SHA-256: \`${report.tacticsHash}\``] : []), '', report.interpretation, '',
  `Protocol: ${seeds} deterministic seeds × two layouts × both map sides; purchase cost difference at most 5%. ${report.duels.length} unit pairings, ${report.mixed.length} mixed/multi-wave scenarios (${multiwaveSeconds}s multiwave duration), ${report.marginal.length} screened marginal-value comparisons, ${report.mixedAnswers.length} mixed affordable-answer fixtures, ${report.untested.length} explicitly untested pure pairings.`, '', report.mirrorProtocol, '',
  '## Faction portfolio signals', '', '| Pair | Left score | Scenarios |', '|---|---:|---:|',
  ...report.factionSignals.map(r => `| ${r.left} / ${r.right} | ${(r.score * 100).toFixed(1)}% | ${r.scenarios} |`), '',
  '## Per-unit coverage', '', '| Unit | Declared useful matchups reaching 70% | Affordable answers |', '|---|---|---|',
  ...report.coverage.map(r => `| ${r.unit} | ${[...r.useful, ...r.synergy.map(id => `${id} (screened marginal value)`)].join(', ') || 'Unproven'} | ${[...r.answers, ...r.mixedAnswers.map(army => army.join(' + '))].join(', ') || 'Unproven'} |`), '',
  '## Flags', '', ...report.flags.map(r => `- ${r.type}: ${r.unit || `${r.left} / ${r.right}`} ${r.detail || ''}${r.sideBias !== undefined ? ` (${(r.sideBias * 100).toFixed(1)} percentage points)` : ''}`), '',
  'The JSON contains every tested result, army composition, budget, seed, layout, side, outcome, timeout, and sampled unit count. No failing scenario is discarded.', '',
];
await mkdir(dirname(output), { recursive: true });
await writeFile(`${output}.json`, JSON.stringify(report, null, 2));
await writeFile(`${output}.md`, lines.join('\n'));
console.log(`Balance evidence written to ${output}.json and ${output}.md; ${report.flags.length} flags remain.`);
