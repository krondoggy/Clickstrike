import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { loadBalanceEngine, matchedDoctrines, THREAT_PROFILES, runPaired } from './balance-harness.mjs';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const seeds = Number(option('--seeds', '2'));
if (!Number.isInteger(seeds) || seeds < 1 || seeds > 50) throw new Error('Choose 1–50 seeds');
const runtime = await loadBalanceEngine(option('--engine', undefined));
const out = resolve(option('--out', 'test-results/balance-strategy-final'));
const hashFile = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const report = {
  generatedAt: new Date().toISOString(), engineHash: await hashFile(runtime.enginePath),
  dataHash: await hashFile(resolve(dirname(runtime.enginePath), 'data.js')),
  tacticsHash: await hashFile(resolve(dirname(runtime.enginePath), 'tactics.js')).catch(() => null),
  seeds, multiwaveSeconds: 150, budgetTolerance: 0.05,
  protocol: 'Explicit mixed threat recipes, all faction pairings at relevant tiers; two layouts, both sides, deterministic seeds. No pure mass substitutes. Timeouts are draws. Cavalry starts Age II; Covenant uses an explicitly labeled non-mounted Ghoul/Death Knight pressure surrogate.',
  profiles: THREAT_PROFILES, scenarios: [], factionSignals: [], flags: [],
};
for (let i = 0; i < runtime.data.FACTIONS.length; i++) for (let j = i + 1; j < runtime.data.FACTIONS.length; j++) {
  const left = runtime.data.FACTIONS[i].id, right = runtime.data.FACTIONS[j].id;
  for (const [profile, definition] of Object.entries(THREAT_PROFILES)) for (const tier of definition.tiers) {
    const fixture = matchedDoctrines(runtime.data, left, right, profile, 1200, tier);
    if (!fixture) throw new Error(`Missing matched fixture ${left}/${right} ${profile} age${tier}`);
    for (const mode of ['screened', 'multiwave']) {
      report.scenarios.push({ leftFaction: left, rightFaction: right, profile, tier, mode,
        leftNote: definition.fallbacks?.[left] || null, rightNote: definition.fallbacks?.[right] || null,
        leftArmy: fixture.left, rightArmy: fixture.right, leftCost: fixture.leftCost, rightCost: fixture.rightCost,
        ...runPaired(runtime, { ...fixture, mode, seconds: mode === 'multiwave' ? 150 : 120 }, seeds) });
    }
  }
  const rows = report.scenarios.filter(row => row.leftFaction === left && row.rightFaction === right);
  const score = rows.reduce((sum, row) => sum + row.leftScore, 0) / rows.length;
  report.factionSignals.push({ left, right, score, scenarios: rows.length });
  if (score < 0.4 || score > 0.6) report.flags.push({ type: 'FACTION_PORTFOLIO_OUTSIDE_40_60', left, right, score });
  console.log(`Strategic profiles complete: ${left} / ${right}`);
}
for (const row of report.scenarios) {
  if (row.sideBias > 0.05) report.flags.push({ type: 'SIDE_BIAS_OVER_5_POINTS', left: row.leftFaction, right: row.rightFaction, profile: row.profile, tier: row.tier, mode: row.mode, sideBias: row.sideBias });
  if (!row.finite || row.peakUnits > 180) report.flags.push({ type: 'SIMULATION_INVARIANT_FAILURE', profile: row.profile, tier: row.tier });
}
await mkdir(dirname(out), { recursive: true });
await writeFile(`${out}.json`, JSON.stringify(report, null, 2));
await writeFile(`${out}.md`, [
  '# Castle Strike — mixed threat portfolio', '', report.protocol, '',
  `Engine: \`${report.engineHash}\``, `Data: \`${report.dataHash}\``, '',
  '| Pair | Profile | Age | Mode | Left score | Side difference | Fallback |', '|---|---|---:|---|---:|---:|---|',
  ...report.scenarios.map(row => `| ${row.leftFaction}/${row.rightFaction} | ${row.profile} | ${row.tier} | ${row.mode} | ${(100 * row.leftScore).toFixed(1)}% | ${(100 * row.sideBias).toFixed(1)}pp | ${row.leftNote || row.rightNote || '—'} |`), '',
  '## Flags', '', ...report.flags.map(flag => `- ${JSON.stringify(flag)}`), '',
].join('\n'));
console.log(`Strategic evidence written to ${out}.json; ${report.scenarios.length} scenario sets, ${report.flags.length} flags.`);
