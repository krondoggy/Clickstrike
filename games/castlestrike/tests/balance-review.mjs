import { readFile, writeFile } from 'node:fs/promises';
import { UNIT_MAP, ABILITY_RULES, counterScore, threatMatches } from '../src/data.js';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const baselinePath = option('--baseline', 'test-results/balance-baseline/final-protocol.json');
const currentPath = option('--current', 'test-results/balance-final.json');
const outputPath = option('--out', 'games/castlestrike/BALANCE.md');
const strategyBaselinePath = option('--strategy-baseline', 'test-results/balance-baseline/strategy.json');
const strategyCurrentPath = option('--strategy-current', 'test-results/balance-strategy-final.json');
const supportPath = option('--support', 'test-results/balance-support.json');
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const current = JSON.parse(await readFile(currentPath, 'utf8'));
const strategyBaseline = JSON.parse(await readFile(strategyBaselinePath, 'utf8'));
const strategyCurrent = JSON.parse(await readFile(strategyCurrentPath, 'utf8'));
const support = JSON.parse(await readFile(supportPath, 'utf8'));
const pct = value => `${(value * 100).toFixed(1)}%`;
const name = id => UNIT_MAP[id]?.name || id;
const armyName = army => [...new Set(army)].map(id => `${army.filter(u => u === id).length}× ${name(id)}`).join(' + ');
const purpose = row => {
  if (row.unit === 'priest') return 'Improves an expensive hero screen through healing';
  if (row.unit === 'shaman') return 'Improves an elite frontline with Bloodlust and armor break';
  if (row.unit === 'mage') return 'Protected anti-armor damage; also beats armored elites directly';
  if (row.useful.length) {
    const primaryThreat = UNIT_MAP[row.unit].counters[0].threat;
    const opponent = row.useful.find(id => threatMatches(id, primaryThreat)) || row.useful[0];
    return `Matched-gold win against ${name(opponent)}`;
  }
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
const allFlags = [...current.flags.map(f => ({ ...f, portfolio: 'Original' })), ...strategyCurrent.flags.map(f => ({ ...f, portfolio: 'Threat profiles' }))];
const factionFlags = allFlags.filter(f => f.type === 'FACTION_PORTFOLIO_OUTSIDE_40_60');
const sideFlags = allFlags.filter(f => f.type === 'SIDE_BIAS_OVER_5_POINTS');
const signature = current.marginal.filter(row => row.label);
const beforeSignature = label => baseline.marginal.find(row => row.label === label);
const lines = [
  '# Castle Strike — balance audit', '',
  `${coverageCount}/27 units have a demonstrated useful matchup or screened contribution and an affordable answer in the recorded test portfolio. ${factionFlags.length === 0 ? 'All faction portfolio scores are inside the 40–60% review band.' : `${factionFlags.length} faction portfolio ${factionFlags.length === 1 ? 'score remains' : 'scores remain'} outside the 40–60% review band.`} ${sideFlags.length ? `The side-symmetry gate remains open: ${sideFlags.length} scenario sets exceed a five-percentage-point side difference.` : 'No tested scenario exceeds the five-percentage-point side-difference gate.'}`, '',
  'These are controlled combat fixtures, not estimates of player win rates. A unit is allowed to lose when exposed, outnumbered, unsupported, or facing its intended answer. Passing a niche fixture does not mean that every broad counter label wins every composition.', '',
  '## What changed', '',
  'Combat now resolves windup, release, travel, and impact through the production simulation. Units use automatic screening, flanking, spacing, target selection, and bounded kiting. Braced defenders can cancel a moving charge; roots permit attacks; control recovery prevents uninterrupted root/stun chains; ground-only area attacks respect air immunity. Stormcaller attacks temporarily break heavy armor. Siege attacks strike their committed ground point.', '',
  'The mirror audit also exposed two side-order bugs: attack eligibility previously saw only one side’s movement on some turns, and target choices could see one side’s healing earlier. Movement, target selection, and abilities now run in separate phases, with full-encounter mirror regressions.', '',
  `The only unit damage tuning in this pass is the Tempest Arcanist’s ${Math.round((ABILITY_RULES.chain.heavyDamageMultiplier - 1) * 100)}% bonus against heavy armor. Its normal damage, health, price, and supply remain unchanged. Stormcaller retains its original damage after its contribution was demonstrated behind a durable frontline. Unit prices, supply, starter formations, and the 280-gold / 100-per-20-seconds economy are unchanged.`, '',
  '## Protocol and acceptance checks', '',
  `The same harness imports the frozen pre-change engine and current production engine. Each scenario uses ${current.seeds} well-spaced 32-bit seeds, compact and spread formations, and both map sides (${current.seeds * 4} runs per scenario set). Isolated and screened mirrored fixtures retain the same logical unit IDs and initial clocks; neutral arena defenses cannot attack. Multiwave fixtures retain the production battlefield, defenses, reinforcement rhythm, spawn identities, and randomness.`, '',
  `The portfolio contains ${current.duels.length} cross-faction single-type matchups, ${current.mixedAnswers.length} mixed affordable-answer cases, ${current.marginal.length} screened replacement comparisons, and ${current.mixed.length} mixed/multiwave doctrine cases across Ages I–III. Multiwave cases run for ${current.multiwaveSeconds} seconds. Timeouts count as draws, never victories. ${current.untested.length} single-type pairings cannot meet the integer-purchase constraints and remain explicitly untested as pure pairings. Mixed answers cover relevant gaps without claiming an impossible price match.`, '',
  '- Both armies’ purchase prices differ by at most 5%; marginal comparisons also hold the replacement purchase within 5% of the specialist and opponent. No fixture duplicates a unique hero or exceeds 72 supply.',
  '- A direct counter requires at least a 70% score in its recorded setup. A screened specialist must reach that score and improve the equal-budget replacement by at least 15 percentage points or 10% of army cost in net surviving field value.',
  '- Faction portfolio scores outside 40–60% and side differences above five percentage points are flagged. The full report retains every result and timeout.',
  '- The isolated matrix covers ranged/air, armor, cavalry, swarms and exposed support; the original mixed portfolio includes balanced, pressure, sustain, siege and air doctrines. A separate 66-case mixed threat portfolio explicitly covers armor, ranged, cavalry and swarm recipes. Named specialist cases separately verify protected anti-armor, durable-screen healing, and elite-frontline buffs.', '',
  '## Faction portfolio comparison', '',
  '| Left faction / right faction | Frozen baseline left score | Current left score |',
  '|---|---:|---:|',
  ...current.factionSignals.map(row => {
    const previous = baseline.factionSignals.find(b => b.left === row.left && b.right === row.right);
    return `| ${row.left} / ${row.right} | ${pct(previous.score)} | ${pct(row.score)} |`;
  }), '',
  'A score is wins plus half of draws, averaged over the named fixed-roster scenario portfolio. Small seed counts and the predefined army mixes limit generalization to complete matches or human play.', '',
  '## Explicit mixed threat profiles', '',
  'Armor, ranged, and swarm recipes cover every faction pairing in Ages I–III; cavalry covers Ages II–III, when Alliance has mounted units. Each army includes a melee screen and ranged backing, with at least half its gold in the named threat. Covenant has no cavalry: those rows use Ghoul flankers and a Death Knight as an explicitly labeled pressure surrogate, and do not validate a mounted Covenant army. Support joins recipes when unlocked. Every recipe runs both screened and 150-second multiwave battles, both layouts and both sides, at matched purchase budgets.', '',
  'This supplemental portfolio remains separate from the original portfolio, so adding more scenarios cannot silently erase an earlier faction flag. The four threat recipes and their budget rules were fixed before the current results were examined.', '',
  '| Left faction / right faction | Frozen threat-profile score | Current threat-profile score |', '|---|---:|---:|',
  ...strategyCurrent.factionSignals.map(row => {
    const previous = strategyBaseline.factionSignals.find(b => b.left === row.left && b.right === row.right);
    return `| ${row.left} / ${row.right} | ${pct(previous.score)} | ${pct(row.score)} |`;
  }), '',
  '| Pair | Named profile | Frozen score | Current score |', '|---|---|---:|---:|',
  ...strategyCurrent.factionSignals.flatMap(pair => Object.keys(strategyCurrent.profiles).map(profile => {
    const score = report => { const rows = report.scenarios.filter(row => row.leftFaction === pair.left && row.rightFaction === pair.right && row.profile === profile); return rows.reduce((sum, row) => sum + row.leftScore, 0) / rows.length; };
    return `| ${pair.left} / ${pair.right} | ${profile}${profile === 'cavalry' && pair.right === 'undead' ? ' (Covenant pressure fallback)' : ''} | ${pct(score(strategyBaseline))} | ${pct(score(strategyCurrent))} |`;
  })), '',
  '### Combined shared-policy result', '',
  'The combined result gives equal weight to every mixed scenario set: 132 sets total, 44 per faction pairing. Each pairing contains 22 original doctrine sets and 22 explicit threat-profile sets, so each portfolio contributes exactly 50% of its combined score. Within a set, every seed, layout, and map side has equal weight. This is an additional aggregate; the separate portfolio flags remain in force.', '',
  '| Pair | Original sets | Threat sets | Combined baseline | Combined current |', '|---|---:|---:|---:|---:|',
  ...current.factionSignals.map(row => {
    const a = strategyCurrent.factionSignals.find(b => b.left === row.left && b.right === row.right);
    const b = baseline.factionSignals.find(b => b.left === row.left && b.right === row.right);
    const c = strategyBaseline.factionSignals.find(b => b.left === row.left && b.right === row.right);
    return `| ${row.left} / ${row.right} | ${row.scenarios} | ${a.scenarios} | ${pct((b.score * b.scenarios + c.score * c.scenarios) / (b.scenarios + c.scenarios))} | ${pct((row.score * row.scenarios + a.score * a.scenarios) / (row.scenarios + a.scenarios))} |`;
  }), '',
  'The difference between the two portfolios is useful: faction strength depends on composition. An aggregate near 50% does not make every faction’s armored, ranged, cavalry, or swarm recipe equally strong, and it does not close an out-of-band score in the original doctrine portfolio.', '',
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
  'The same three fixtures also run for 150 seconds on the actual battlefield, including defenses and reinforcements. Every baseline and current run reaches the time limit, so their match scores are all 50% draws. Surviving field value separately measures accumulation: unlike a single-wave health margin, it may exceed the price of one roster because multiple waves survive.', '',
  '| Reinforced fixture | Baseline field-value gain | Current field-value gain |', '|---|---:|---:|',
  ...support.builds.current.results.map(row => {
    const prior = support.builds.baseline.results.find(r => r.label === row.label);
    return `| ${row.label} | ${prior.valueGain.toFixed(2)}× one roster’s cost | ${row.valueGain.toFixed(2)}× one roster’s cost |`;
  }), '',
  'Lightkeeper preserves the expensive screen over repeated waves. Stormcaller’s short elite-frontline contribution does not generalize to this attrition fixture: its equal-budget two-Grunt replacement retains more field value. These distinct outcomes are preserved, rather than treating every support purchase as automatically better than additional bodies.', '',
  '## All 27 units: useful niche and an answer', '',
  'The table names one recorded example for each side of the matchup. Quantities, gold, seed, formation and individual outcomes are preserved in the JSON. Mixed support examples describe a screened contribution rather than an unsupported duel.', '',
  '| Unit | Recorded useful role or matchup | Affordable answer example |',
  '|---|---|---|',
  ...current.coverage.map(row => `| ${name(row.unit)} | ${purpose(row)} | ${answer(row)} |`), '',
  '## Remaining flags', '',
  ...(allFlags.length ? [
    'The following flags remain unresolved in this recorded build. They are retained as failed review gates; the portfolio and coverage results above do not imply that these cases passed.', '',
    '| Portfolio | Flag | Scenario | Difference / detail |', '|---|---|---|---|',
    ...allFlags.map(flag => `| ${flag.portfolio} | ${flag.type} | ${flag.unit || `${flag.left} / ${flag.right}${flag.profile ? ` · ${flag.profile}` : ''}${flag.tier ? ` · Age ${flag.tier}` : ''}${flag.mode ? ` · ${flag.mode}` : ''}`} | ${flag.sideBias !== undefined ? `${(flag.sideBias * 100).toFixed(1)} percentage points` : flag.score !== undefined ? `${pct(flag.score)} left score` : flag.detail || ''} |`),
  ] : ['No missing-niche, missing-answer, faction-band, symmetry, or simulation-invariant flags remain in this portfolio.']), '',
  '## Reproduce and inspect', '',
  'Run from the repository root:', '',
  '```sh',
  'node games/castlestrike/tests/balance-report.mjs --seeds 2 --out test-results/balance-final',
  'node games/castlestrike/tests/balance-strategy-report.mjs --seeds 2 --out test-results/balance-strategy-final',
  'node games/castlestrike/tests/balance-support-report.mjs --seeds 2',
  'node --test games/castlestrike/tests/balance.test.mjs games/castlestrike/tests/counter-value.test.mjs',
  'node games/castlestrike/tests/balance-review.mjs',
  '```', '',
  'Use `--seeds 12` to widen the seed sample or `--multiwave-seconds 300` for longer survivor accumulation. The baseline command uses `--engine test-results/balance-baseline/engine.js`; that ignored local snapshot was captured before engine edits and includes its matching data module. Full JSON and Markdown evidence is stored in ignored `test-results/` outputs.', '',
  `Report sources: \`${baselinePath}\`, \`${currentPath}\`, \`${strategyBaselinePath}\`, \`${strategyCurrentPath}\`, and \`${supportPath}\`.`, '',
  '| Source | SHA-256 |', '|---|---|',
  `| Baseline engine | \`${baseline.engineHash}\` |`,
  `| Baseline data | \`${baseline.dataHash}\` |`,
  `| Tested engine | \`${current.engineHash}\` |`,
  `| Tested data | \`${current.dataHash}\` |`,
  `| Tested tactics | \`${current.tacticsHash}\` |`,
  `| Threat-portfolio tested engine | \`${strategyCurrent.engineHash}\` |`,
  `| Threat-portfolio tested data | \`${strategyCurrent.dataHash}\` |`,
  `| Threat-portfolio tested tactics | \`${strategyCurrent.tacticsHash}\` |`, '',
  `Support-attrition tested engine: \`${support.builds.current.engineHash}\`.`, '',
];
await writeFile(outputPath, lines.join('\n'));
console.log(`Balance review written to ${outputPath}; ${coverageCount}/27 coverage, ${allFlags.length} open flags.`);
