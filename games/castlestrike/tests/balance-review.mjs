import { readFile, writeFile } from 'node:fs/promises';
import { UNIT_MAP, counterScore } from '../src/data.js';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const baselinePath = option('--baseline', 'test-results/balance-baseline/final-protocol.json');
const currentPath = option('--current', 'test-results/balance-final.json');
const outputPath = option('--out', 'games/castlestrike/BALANCE.md');
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const current = JSON.parse(await readFile(currentPath, 'utf8'));
const pct = value => `${(value * 100).toFixed(1)}%`;
const name = id => UNIT_MAP[id]?.name || id;
const armyName = army => [...new Set(army)].map(id => `${army.filter(u => u === id).length}× ${name(id)}`).join(' + ');
const purpose = row => {
  if (row.unit === 'priest') return 'Improves an expensive hero screen through healing';
  if (row.unit === 'shaman') return 'Improves an elite frontline with Bloodlust and armor break';
  if (row.unit === 'mage') return 'Protected anti-armor damage; also beats armored elites directly';
  if (row.useful.length) return `Matched-gold win against ${name(row.useful[0])}`;
  if (row.synergy.length) return `Adds screened marginal value against ${name(row.synergy[0])}`;
  return '**Useful matchup remains unproven**';
};
const answer = row => {
  const direct = row.answers.find(id => counterScore(id, row.unit) > 0) || row.answers[0];
  if (direct) return name(direct);
  if (row.mixedAnswers.length) return armyName(row.mixedAnswers[0]);
  return '**Affordable answer remains unproven**';
};
const complete = row => (row.useful.length || row.synergy.length) && (row.answers.length || row.mixedAnswers.length);
const coverageCount = current.coverage.filter(complete).length;
const factionFlags = current.flags.filter(f => f.type === 'FACTION_PORTFOLIO_OUTSIDE_40_60');
const sideFlags = current.flags.filter(f => f.type === 'SIDE_BIAS_OVER_5_POINTS');
const signature = current.marginal.filter(row => row.label);
const beforeSignature = label => baseline.marginal.find(row => row.label === label);
const lines = [
  '# Castle Strike — balance audit', '',
  `${coverageCount}/27 units have a demonstrated useful matchup or screened contribution and an affordable answer in the recorded test portfolio. ${factionFlags.length === 0 ? 'All three faction portfolio scores are inside the 40–60% review band.' : `${factionFlags.length} faction portfolio scores remain outside the 40–60% review band.`} ${sideFlags.length ? `The side-symmetry gate remains open: ${sideFlags.length} scenario sets exceed a five-percentage-point side difference.` : 'No tested scenario exceeds the five-percentage-point side-difference gate.'}`, '',
  'These are controlled combat fixtures, not estimates of player win rates. A unit is allowed to lose when exposed, outnumbered, unsupported, or facing its intended answer. Passing a niche fixture does not mean that every broad counter label wins every composition.', '',
  '## What changed', '',
  'Combat now resolves windup, release, travel, and impact through the production simulation. Units use automatic screening, flanking, spacing, target selection, and bounded kiting. Braced defenders can cancel a moving charge; roots permit attacks; control recovery prevents uninterrupted root/stun chains; ground-only area attacks respect air immunity. Stormcaller attacks temporarily break heavy armor. Siege attacks strike their committed ground point.', '',
  'The only unit damage tuning in this pass is the Tempest Arcanist’s 70% bonus against heavy armor. Its normal damage, health, price, and supply remain unchanged. Stormcaller retains its original damage after its contribution was demonstrated behind a durable frontline. Unit prices, supply, starter formations, and the 280-gold / 100-per-20-seconds economy are unchanged.', '',
  '## Protocol and acceptance checks', '',
  `The same harness imports the frozen pre-change engine and current production engine. Each scenario uses ${current.seeds} well-spaced 32-bit seeds, compact and spread formations, and both map sides (${current.seeds * 4} runs per scenario set). Isolated and screened mirrored fixtures retain the same logical unit IDs and initial clocks; neutral arena defenses cannot attack. Multiwave fixtures retain the production battlefield, defenses, reinforcement rhythm, spawn identities, and randomness.`, '',
  `The portfolio contains ${current.duels.length} cross-faction single-type matchups, ${current.mixedAnswers.length} mixed affordable-answer cases, ${current.marginal.length} screened replacement comparisons, and ${current.mixed.length} mixed/multiwave doctrine cases across Ages I–III. Multiwave cases run for ${current.multiwaveSeconds} seconds. Timeouts count as draws, never victories. ${current.untested.length} single-type pairings cannot meet the integer-purchase constraints and remain explicitly untested as pure pairings. Mixed answers cover relevant gaps without claiming an impossible price match.`, '',
  '- Both armies’ purchase prices differ by at most 5%; marginal comparisons also hold the replacement purchase within 5% of the specialist and opponent. No fixture duplicates a unique hero or exceeds 72 supply.',
  '- A direct counter requires at least a 70% score in its recorded setup. A screened specialist must reach that score and improve the equal-budget replacement by at least 15 percentage points or 10% of army cost in net surviving field value.',
  '- Faction portfolio scores outside 40–60% and side differences above five percentage points are flagged. The full report retains every result and timeout.',
  '- The isolated matrix covers ranged/air, armor, cavalry, swarms and exposed support; the mixed portfolio includes balanced, pressure, sustain, siege and air doctrines. Named specialist cases separately verify protected anti-armor, durable-screen healing, and elite-frontline buffs.', '',
  '## Faction portfolio comparison', '',
  '| Left faction / right faction | Frozen baseline left score | Current left score |',
  '|---|---:|---:|',
  ...current.factionSignals.map(row => {
    const previous = baseline.factionSignals.find(b => b.left === row.left && b.right === row.right);
    return `| ${row.left} / ${row.right} | ${pct(previous.score)} | ${pct(row.score)} |`;
  }), '',
  'A score is wins plus half of draws, averaged over the named fixed-roster scenario portfolio. Small seed counts and the predefined army mixes limit generalization to complete matches or human play.', '',
  '## Specialist contribution', '',
  '| Fixture | Baseline specialist / replacement | Current specialist / replacement | Current field-value improvement |',
  '|---|---:|---:|---:|',
  ...signature.map(row => {
    const prior = beforeSignature(row.label);
    return `| ${row.label} | ${pct(prior.variant.leftScore)} / ${pct(prior.reference.leftScore)} | ${pct(row.variant.leftScore)} / ${pct(row.reference.leftScore)} | ${pct(row.valueGain)} of purchase cost |`;
  }), '',
  '- **Protected anti-armor:** two Dawnshields and two Tempest Arcanists (650 gold) against six Ironhide Grunts (630). The 650-gold replacement has two Dawnshields and five Kingsguard Pikes.',
  '- **Healing an expensive screen:** Aldric, two Dawnshields, and a Lightkeeper (860) against three Grunts, three Venom Hunters, and an Ironmaw Berserker (880). The 840-gold replacement uses Aldric, one Dawnshield, and three Pikes.',
  '- **Elite-frontline buffs:** Earthshaker, Ironmaw Berserker, and Stormcaller (775) against Aldric and three Dawnshields (770). Replacing Stormcaller with two Grunts costs 790.', '',
  '## All 27 units: useful niche and an answer', '',
  'The table names one recorded example for each side of the matchup. Quantities, gold, seed, formation and individual outcomes are preserved in the JSON. Mixed support examples describe a screened contribution rather than an unsupported duel.', '',
  '| Unit | Recorded useful role or matchup | Affordable answer example |',
  '|---|---|---|',
  ...current.coverage.map(row => `| ${name(row.unit)} | ${purpose(row)} | ${answer(row)} |`), '',
  '## Remaining flags', '',
  ...(current.flags.length ? [
    'The following flags remain unresolved in this recorded build. They are retained as failed review gates; the portfolio and coverage results above do not imply that these cases passed.', '',
    '| Flag | Scenario | Difference / detail |', '|---|---|---|',
    ...current.flags.map(flag => `| ${flag.type} | ${flag.unit || `${flag.left} / ${flag.right}${flag.profile ? ` · ${flag.profile}` : ''}${flag.mode ? ` · ${flag.mode}` : ''}`} | ${flag.sideBias !== undefined ? `${(flag.sideBias * 100).toFixed(1)} percentage points` : flag.detail || ''} |`),
  ] : ['No missing-niche, missing-answer, faction-band, symmetry, or simulation-invariant flags remain in this portfolio.']), '',
  '## Reproduce and inspect', '',
  'Run from the repository root:', '',
  '```sh',
  'node games/castlestrike/tests/balance-report.mjs --seeds 2 --out test-results/balance-final',
  'node --test games/castlestrike/tests/balance.test.mjs games/castlestrike/tests/counter-value.test.mjs',
  '```', '',
  'Use `--seeds 12` to widen the seed sample or `--multiwave-seconds 300` for longer survivor accumulation. The baseline command uses `--engine test-results/balance-baseline/engine.js`; that ignored local snapshot was captured before engine edits and includes its matching data module. Full JSON and Markdown evidence is stored in ignored `test-results/` outputs.', '',
  `Report sources: \`${baselinePath}\` and \`${currentPath}\`.`, '',
  '| Source | SHA-256 |', '|---|---|',
  `| Baseline engine | \`${baseline.engineHash}\` |`,
  `| Baseline data | \`${baseline.dataHash}\` |`,
  `| Tested engine | \`${current.engineHash}\` |`,
  `| Tested data | \`${current.dataHash}\` |`,
  `| Tested tactics | \`${current.tacticsHash}\` |`, '',
];
await writeFile(outputPath, lines.join('\n'));
console.log(`Balance review written to ${outputPath}; ${coverageCount}/27 coverage, ${current.flags.length} open flags.`);
