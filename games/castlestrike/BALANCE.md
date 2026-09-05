# Castle Strike — balance audit

27/27 units have a demonstrated useful matchup or screened contribution and an affordable answer in the recorded test portfolio. All three faction portfolio scores are inside the 40–60% review band. The side-symmetry gate remains open: 14 scenario sets exceed a five-percentage-point side difference.

These are controlled combat fixtures, not estimates of player win rates. A unit is allowed to lose when exposed, outnumbered, unsupported, or facing its intended answer. Passing a niche fixture does not mean that every broad counter label wins every composition.

## What changed

Combat now resolves windup, release, travel, and impact through the production simulation. Units use automatic screening, flanking, spacing, target selection, and bounded kiting. Braced defenders can cancel a moving charge; roots permit attacks; control recovery prevents uninterrupted root/stun chains; ground-only area attacks respect air immunity. Stormcaller attacks temporarily break heavy armor. Siege attacks strike their committed ground point.

The only unit damage tuning in this pass is the Tempest Arcanist’s 70% bonus against heavy armor. Its normal damage, health, price, and supply remain unchanged. Stormcaller retains its original damage after its contribution was demonstrated behind a durable frontline. Unit prices, supply, starter formations, and the 280-gold / 100-per-20-seconds economy are unchanged.

## Protocol and acceptance checks

The same harness imports the frozen pre-change engine and current production engine. Each scenario uses 2 well-spaced 32-bit seeds, compact and spread formations, and both map sides (8 runs per scenario set). Isolated and screened mirrored fixtures retain the same logical unit IDs and initial clocks; neutral arena defenses cannot attack. Multiwave fixtures retain the production battlefield, defenses, reinforcement rhythm, spawn identities, and randomness.

The portfolio contains 182 cross-faction single-type matchups, 79 mixed affordable-answer cases, 167 screened replacement comparisons, and 66 mixed/multiwave doctrine cases across Ages I–III. Multiwave cases run for 150 seconds. Timeouts count as draws, never victories. 61 single-type pairings cannot meet the integer-purchase constraints and remain explicitly untested as pure pairings. Mixed answers cover relevant gaps without claiming an impossible price match.

- Both armies’ purchase prices differ by at most 5%; marginal comparisons also hold the replacement purchase within 5% of the specialist and opponent. No fixture duplicates a unique hero or exceeds 72 supply.
- A direct counter requires at least a 70% score in its recorded setup. A screened specialist must reach that score and improve the equal-budget replacement by at least 15 percentage points or 10% of army cost in net surviving field value.
- Faction portfolio scores outside 40–60% and side differences above five percentage points are flagged. The full report retains every result and timeout.
- The isolated matrix covers ranged/air, armor, cavalry, swarms and exposed support; the mixed portfolio includes balanced, pressure, sustain, siege and air doctrines. Named specialist cases separately verify protected anti-armor, durable-screen healing, and elite-frontline buffs.

## Faction portfolio comparison

| Left faction / right faction | Frozen baseline left score | Current left score |
|---|---:|---:|
| alliance / horde | 50.0% | 48.3% |
| alliance / undead | 47.2% | 59.1% |
| horde / undead | 39.8% | 48.9% |

A score is wins plus half of draws, averaged over the named fixed-roster scenario portfolio. Small seed counts and the predefined army mixes limit generalization to complete matches or human play.

## Specialist contribution

| Fixture | Baseline specialist / replacement | Current specialist / replacement | Current field-value improvement |
|---|---:|---:|---:|
| Protected anti-armor casters | 0.0% / 0.0% | 100.0% / 0.0% | 95.7% of purchase cost |
| Healing an expensive hero screen | 100.0% / 0.0% | 100.0% / 0.0% | 84.4% of purchase cost |
| Empowering an armored elite frontline | 100.0% / 100.0% | 100.0% / 50.0% | 32.3% of purchase cost |

- **Protected anti-armor:** two Dawnshields and two Tempest Arcanists (650 gold) against six Ironhide Grunts (630). The 650-gold replacement has two Dawnshields and five Kingsguard Pikes.
- **Healing an expensive screen:** Aldric, two Dawnshields, and a Lightkeeper (860) against three Grunts, three Venom Hunters, and an Ironmaw Berserker (880). The 840-gold replacement uses Aldric, one Dawnshield, and three Pikes.
- **Elite-frontline buffs:** Earthshaker, Ironmaw Berserker, and Stormcaller (775) against Aldric and three Dawnshields (770). Replacing Stormcaller with two Grunts costs 790.

## All 27 units: useful niche and an answer

The table names one recorded example for each side of the matchup. Quantities, gold, seed, formation and individual outcomes are preserved in the JSON. Mixed support examples describe a screened contribution rather than an unsupported duel.

| Unit | Recorded useful role or matchup | Affordable answer example |
|---|---|---|
| Dawnshield | Matched-gold win against Venom Hunter | Ironhide Grunt |
| Silverleaf Ranger | Matched-gold win against Stormcaller | Ironhide Grunt |
| Kingsguard Pike | Matched-gold win against Warg Raider | Ironhide Grunt |
| Sunward Cavalier | Matched-gold win against Venom Hunter | Ironhide Grunt |
| Lightkeeper | Improves an expensive hero screen through healing | Ironhide Grunt |
| Tempest Arcanist | Protected anti-armor damage; also beats armored elites directly | Ironhide Grunt |
| Stormbreak Ballista | Matched-gold win against Venom Hunter | Plaguewing |
| Stormwing | Matched-gold win against Ironhide Grunt | Venom Hunter |
| Aldric, the Dawnbringer | Matched-gold win against Venom Hunter | Bone Sentinel |
| Ironhide Grunt | Matched-gold win against Dawnshield | Stormwing |
| Venom Hunter | Matched-gold win against Lightkeeper | Dawnshield |
| Warg Raider | Matched-gold win against Lightkeeper | Kingsguard Pike |
| Stormcaller | Improves an elite frontline with Bloodlust and armor break | Dawnshield |
| Ironmaw Berserker | Matched-gold win against Dawnshield | Stormwing |
| Ember Demolisher | Matched-gold win against Silverleaf Ranger | Dawnshield |
| Earthshaker | Matched-gold win against Dawnshield | Tempest Arcanist |
| Plaguewing | Matched-gold win against Tempest Arcanist | Silverleaf Ranger |
| Korr, the Ashblade | Matched-gold win against Silverleaf Ranger | Aldric, the Dawnbringer |
| Graveborn | Matched-gold win against Silverleaf Ranger | Stormwing |
| Bone Sentinel | Matched-gold win against Dawnshield | Stormbreak Ballista |
| Crypt Stalker | Matched-gold win against Silverleaf Ranger | Dawnshield |
| Graveweaver | Matched-gold win against Dawnshield | Silverleaf Ranger |
| Veil Siren | Adds screened marginal value against Dawnshield | Dawnshield |
| Plague Colossus | Matched-gold win against Dawnshield | Tempest Arcanist |
| Sepulcher Engine | Matched-gold win against Dawnshield | Plaguewing |
| Frostbound Wyrm | Matched-gold win against Dawnshield | Silverleaf Ranger |
| Morvath, the Hollow King | Matched-gold win against Silverleaf Ranger | Sunward Cavalier |

## Remaining flags

The following flags remain unresolved in this recorded build. They are retained as failed review gates; the portfolio and coverage results above do not imply that these cases passed.

| Flag | Scenario | Difference / detail |
|---|---|---|
| SIDE_BIAS_OVER_5_POINTS | footman / ghoul · isolated | 50.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | footman / skeleton · isolated | 50.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | mage / skeleton · isolated | 25.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | mage / deathknight · isolated | 25.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | grunt / necromancer · isolated | 50.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | alliance / horde · pressure · screened | 25.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | alliance / horde · sustain · screened | 50.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | alliance / undead · sustain · screened | 50.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | alliance / undead · sustain · screened | 50.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | horde / undead · pressure · screened | 50.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | mage / necromancer · isolated | 25.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | mage / frostwyrm · isolated | 25.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | blademaster / gryphon · isolated | 25.0 percentage points |
| SIDE_BIAS_OVER_5_POINTS | paladin / ironmaw · isolated | 50.0 percentage points |

## Reproduce and inspect

Run from the repository root:

```sh
node games/castlestrike/tests/balance-report.mjs --seeds 2 --out test-results/balance-final
node --test games/castlestrike/tests/balance.test.mjs games/castlestrike/tests/counter-value.test.mjs
```

Use `--seeds 12` to widen the seed sample or `--multiwave-seconds 300` for longer survivor accumulation. The baseline command uses `--engine test-results/balance-baseline/engine.js`; that ignored local snapshot was captured before engine edits and includes its matching data module. Full JSON and Markdown evidence is stored in ignored `test-results/` outputs.

Report sources: `test-results/balance-baseline/final-protocol.json` and `test-results/balance-final.json`.

| Source | SHA-256 |
|---|---|
| Baseline engine | `9889d97efd19e4834e209e07dcaecc8325400e67b3b8da364be6214655b0979f` |
| Baseline data | `f67027a205031a6d1aa3a8f5c7728e0ebb2fcefb1ec8c1aaf5a93102d46ffe5f` |
| Tested engine | `bf36b441e555c10e32397e0a28523b23d49385ac5892312642a6e6a71b333bb0` |
| Tested data | `f80331c793749fe0b642113e0cd12d2fe3d20b4834d45e144944c321d5a1c2e7` |
| Tested tactics | `ecb14f1abfe60c8dfac5848a81928258d38a051fbe823a41512ad26e9536ba62` |
