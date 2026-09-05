import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { loadBalanceEngine, SIGNATURE_FIXTURES, runPaired } from './balance-harness.mjs';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const seeds = Number(option('--seeds', '2'));
if (!Number.isInteger(seeds) || seeds < 1 || seeds > 50) throw new Error('Choose 1–50 seeds');
const out = resolve(option('--out', 'test-results/balance-support'));
const report = { seeds, seconds: 150, protocol: 'The three named specialist/replacement fixtures on the actual battlefield, with defenses and 25-second reinforcements. Both layouts and sides; no spending or spells. Timeouts count as draws; residual field value measures survivor accumulation separately.', builds: {} };
for (const [build, enginePath] of [['baseline', option('--baseline', 'test-results/balance-baseline/engine.js')], ['current', undefined]]) {
  const runtime = await loadBalanceEngine(enginePath);
  const results = [];
  for (const fixture of SIGNATURE_FIXTURES) {
    const variant = runPaired(runtime, { left: fixture.variant, right: fixture.enemy, mode: 'multiwave', seconds: report.seconds }, seeds);
    const reference = runPaired(runtime, { left: fixture.reference, right: fixture.enemy, mode: 'multiwave', seconds: report.seconds }, seeds);
    const fieldMargin = result => result.runsDetail.reduce((sum, run) => sum + (run.leftFieldValue - run.rightFieldValue) / run.leftCost, 0) / result.runs;
    results.push({ ...fixture, variantArmy: fixture.variant, referenceArmy: fixture.reference, variant, reference,
      scoreGain: variant.leftScore - reference.leftScore, valueGain: fieldMargin(variant) - fieldMargin(reference) });
  }
  report.builds[build] = { engineHash: createHash('sha256').update(await readFile(runtime.enginePath)).digest('hex'), results };
  console.log(`Support attrition complete: ${build}`);
}
await mkdir(dirname(out), { recursive: true });
await writeFile(`${out}.json`, JSON.stringify(report, null, 2));
console.log(`Support attrition evidence written to ${out}.json`);
