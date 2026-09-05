# Castle Strike — balance audit

27/27 units have a demonstrated useful matchup or screened contribution and an affordable answer in the recorded test portfolio. 1 faction portfolio score remains outside the 40–60% review band. No tested scenario exceeds the five-percentage-point side-difference gate.

These are controlled combat fixtures, not estimates of player win rates. A unit is allowed to lose when exposed, outnumbered, unsupported, or facing its intended answer. Passing a niche fixture does not mean that every broad counter label wins every composition.

## What changed

Combat now resolves windup, release, travel, and impact through the production simulation. Units use automatic screening, flanking, spacing, target selection, and bounded kiting. Braced defenders can cancel a moving charge; roots permit attacks; control recovery prevents uninterrupted root/stun chains; ground-only area attacks respect air immunity. Stormcaller attacks temporarily break heavy armor. Siege attacks strike their committed ground point.

The mirror audit also exposed two side-order bugs: attack eligibility previously saw only one side’s movement on some turns, and target choices could see one side’s healing earlier. Movement, target selection, and abilities now run in separate phases, with full-encounter mirror regressions.

The only unit damage tuning in this pass is the Tempest Arcanist’s 70% bonus against heavy armor. Its normal damage, health, price, and supply remain unchanged. Stormcaller retains its original damage after its contribution was demonstrated behind a durable frontline. Unit prices, supply, starter formations, and the 280-gold / 100-per-20-seconds economy are unchanged.

## Protocol and acceptance checks

The same harness imports the frozen pre-change engine and current production engine. Each scenario uses 2 well-spaced 32-bit seeds, compact and spread formations, and both map sides (8 runs per scenario set). Isolated and screened mirrored fixtures retain the same logical unit IDs and initial clocks; neutral arena defenses cannot attack. Multiwave fixtures retain the production battlefield, defenses, reinforcement rhythm, spawn identities, and randomness.

The portfolio contains 182 cross-faction single-type matchups, 79 mixed affordable-answer cases, 167 screened replacement comparisons, and 66 mixed/multiwave doctrine cases across Ages I–III. Multiwave cases run for 150 seconds. Timeouts count as draws, never victories. 61 single-type pairings cannot meet the integer-purchase constraints and remain explicitly untested as pure pairings. Mixed answers cover relevant gaps without claiming an impossible price match.

- Both armies’ purchase prices differ by at most 5%; marginal comparisons also hold the replacement purchase within 5% of the specialist and opponent. No fixture duplicates a unique hero or exceeds 72 supply.
- A direct counter requires at least a 70% score in its recorded setup. A screened specialist must reach that score and improve the equal-budget replacement by at least 15 percentage points or 10% of army cost in net surviving field value.
- Faction portfolio scores outside 40–60% and side differences above five percentage points are flagged. The full report retains every result and timeout.
- The isolated matrix covers ranged/air, armor, cavalry, swarms and exposed support; the original mixed portfolio includes balanced, pressure, sustain, siege and air doctrines. A separate 66-case mixed threat portfolio explicitly covers armor, ranged, cavalry and swarm recipes. Named specialist cases separately verify protected anti-armor, durable-screen healing, and elite-frontline buffs.

## Faction portfolio comparison

| Left faction / right faction | Frozen baseline left score | Current left score |
|---|---:|---:|
| alliance / horde | 50.0% | 50.0% |
| alliance / undead | 47.2% | 63.6% |
| horde / undead | 39.8% | 47.7% |

A score is wins plus half of draws, averaged over the named fixed-roster scenario portfolio. Small seed counts and the predefined army mixes limit generalization to complete matches or human play.

## Explicit mixed threat profiles

Armor, ranged, and swarm recipes cover every faction pairing in Ages I–III; cavalry covers Ages II–III, when Alliance has mounted units. Each army includes a melee screen and ranged backing, with at least half its gold in the named threat. Covenant has no cavalry: those rows use Ghoul flankers and a Death Knight as an explicitly labeled pressure surrogate, and do not validate a mounted Covenant army. Support joins recipes when unlocked. Every recipe runs both screened and 150-second multiwave battles, both layouts and both sides, at matched purchase budgets.

This supplemental portfolio remains separate from the original portfolio, so adding more scenarios cannot silently erase an earlier faction flag. The four threat recipes and their budget rules were fixed before the current results were examined.

| Left faction / right faction | Frozen threat-profile score | Current threat-profile score |
|---|---:|---:|
| alliance / horde | 58.5% | 50.0% |
| alliance / undead | 34.1% | 43.2% |
| horde / undead | 48.3% | 52.3% |

| Pair | Named profile | Frozen score | Current score |
|---|---|---:|---:|
| alliance / horde | armor | 64.6% | 33.3% |
| alliance / horde | ranged | 75.0% | 75.0% |
| alliance / horde | cavalry | 75.0% | 75.0% |
| alliance / horde | swarm | 25.0% | 25.0% |
| alliance / undead | armor | 41.7% | 41.7% |
| alliance / undead | ranged | 25.0% | 58.3% |
| alliance / undead | cavalry (Covenant pressure fallback) | 50.0% | 50.0% |
| alliance / undead | swarm | 25.0% | 25.0% |
| horde / undead | armor | 58.3% | 75.0% |
| horde / undead | ranged | 39.6% | 25.0% |
| horde / undead | cavalry (Covenant pressure fallback) | 25.0% | 25.0% |
| horde / undead | swarm | 62.5% | 75.0% |

### Combined shared-policy result

The combined result gives equal weight to every mixed scenario set: 132 sets total, 44 per faction pairing. Each pairing contains 22 original doctrine sets and 22 explicit threat-profile sets, so each portfolio contributes exactly 50% of its combined score. Within a set, every seed, layout, and map side has equal weight. This is an additional aggregate; the separate portfolio flags remain in force.

| Pair | Original sets | Threat sets | Combined baseline | Combined current |
|---|---:|---:|---:|---:|
| alliance / horde | 22 | 22 | 54.3% | 50.0% |
| alliance / undead | 22 | 22 | 40.6% | 53.4% |
| horde / undead | 22 | 22 | 44.0% | 50.0% |

The difference between the two portfolios is useful: faction strength depends on composition. An aggregate near 50% does not make every faction’s armored, ranged, cavalry, or swarm recipe equally strong, and it does not close an out-of-band score in the original doctrine portfolio.

## Specialist contribution

| Fixture | Baseline specialist / replacement | Current specialist / replacement | Current field-value improvement |
|---|---:|---:|---:|
| Protected anti-armor casters | 0.0% / 0.0% | 100.0% / 0.0% | 95.1% of purchase cost |
| Healing an expensive hero screen | 100.0% / 0.0% | 100.0% / 0.0% | 85.3% of purchase cost |
| Empowering an armored elite frontline | 100.0% / 100.0% | 100.0% / 50.0% | 31.0% of purchase cost |

- **Protected anti-armor:** two Dawnshields and two Tempest Arcanists (650 gold) against six Ironhide Grunts (630). The 650-gold replacement has two Dawnshields and five Kingsguard Pikes.
- **Healing an expensive screen:** Aldric, two Dawnshields, and a Lightkeeper (860) against three Grunts, three Venom Hunters, and an Ironmaw Berserker (880). The 840-gold replacement uses Aldric, one Dawnshield, and three Pikes.
- **Elite-frontline buffs:** Earthshaker, Ironmaw Berserker, and Stormcaller (775) against Aldric and three Dawnshields (770). Replacing Stormcaller with two Grunts costs 790.

The same three fixtures also run for 150 seconds on the actual battlefield, including defenses and reinforcements. Every baseline and current run reaches the time limit, so their match scores are all 50% draws. Surviving field value separately measures accumulation: unlike a single-wave health margin, it may exceed the price of one roster because multiple waves survive.

| Reinforced fixture | Baseline field-value gain | Current field-value gain |
|---|---:|---:|
| Protected anti-armor casters | 0.14× one roster’s cost | 2.46× one roster’s cost |
| Healing an expensive hero screen | 5.64× one roster’s cost | 6.63× one roster’s cost |
| Empowering an armored elite frontline | -1.40× one roster’s cost | -1.82× one roster’s cost |

Lightkeeper preserves the expensive screen over repeated waves. Stormcaller’s short elite-frontline contribution does not generalize to this attrition fixture: its equal-budget two-Grunt replacement retains more field value. These distinct outcomes are preserved, rather than treating every support purchase as automatically better than additional bodies.

## All 27 units: useful niche and an answer

The table names one recorded example for each side of the matchup. Quantities, gold, seed, formation and individual outcomes are preserved in the JSON. Mixed support examples describe a screened contribution rather than an unsupported duel.

| Unit | Recorded useful role or matchup | Affordable answer example |
|---|---|---|
| Dawnshield | Matched-gold win against Venom Hunter | Ironhide Grunt |
| Silverleaf Ranger | Matched-gold win against Plaguewing | Ironhide Grunt |
| Kingsguard Pike | Matched-gold win against Warg Raider | Ironhide Grunt |
| Sunward Cavalier | Matched-gold win against Venom Hunter | Ironhide Grunt |
| Lightkeeper | Improves an expensive hero screen through healing | Ironhide Grunt |
| Tempest Arcanist | Protected anti-armor damage; also beats armored elites directly | Ironhide Grunt |
| Stormbreak Ballista | Matched-gold win against Venom Hunter | Plaguewing |
| Stormwing | Matched-gold win against Ironhide Grunt | Venom Hunter |
| Aldric, the Dawnbringer | Matched-gold win against Venom Hunter | Bone Sentinel |
| Ironhide Grunt | Matched-gold win against Silverleaf Ranger | Stormwing |
| Venom Hunter | Matched-gold win against Stormwing | Dawnshield |
| Warg Raider | Matched-gold win against Lightkeeper | Kingsguard Pike |
| Stormcaller | Improves an elite frontline with Bloodlust and armor break | Dawnshield |
| Ironmaw Berserker | Matched-gold win against Dawnshield | Stormwing |
| Ember Demolisher | Matched-gold win against Silverleaf Ranger | Dawnshield |
| Earthshaker | Matched-gold win against Dawnshield | Tempest Arcanist |
| Plaguewing | Matched-gold win against Tempest Arcanist | Silverleaf Ranger |
| Korr, the Ashblade | Matched-gold win against Tempest Arcanist | Aldric, the Dawnbringer |
| Graveborn | Matched-gold win against Silverleaf Ranger | Stormwing |
| Bone Sentinel | Matched-gold win against Sunward Cavalier | Stormbreak Ballista |
| Crypt Stalker | Matched-gold win against Stormwing | Dawnshield |
| Graveweaver | Matched-gold win against Dawnshield | Silverleaf Ranger |
| Veil Siren | Adds screened marginal value against Dawnshield | Dawnshield |
| Plague Colossus | Matched-gold win against Dawnshield | Tempest Arcanist |
| Sepulcher Engine | Matched-gold win against Dawnshield | Plaguewing |
| Frostbound Wyrm | Matched-gold win against Dawnshield | Silverleaf Ranger |
| Morvath, the Hollow King | Matched-gold win against Kingsguard Pike | Tempest Arcanist |

## Remaining flags

The following flags remain unresolved in this recorded build. They are retained as failed review gates; the portfolio and coverage results above do not imply that these cases passed.

| Portfolio | Flag | Scenario | Difference / detail |
|---|---|---|---|
| Original | FACTION_PORTFOLIO_OUTSIDE_40_60 | alliance / undead | 63.6% left score |

## Reproduce and inspect

Run from the repository root:

```sh
node games/castlestrike/tests/balance-report.mjs --seeds 2 --out test-results/balance-final
node games/castlestrike/tests/balance-strategy-report.mjs --seeds 2 --out test-results/balance-strategy-final
node games/castlestrike/tests/balance-support-report.mjs --seeds 2
node --test games/castlestrike/tests/balance.test.mjs games/castlestrike/tests/counter-value.test.mjs
node games/castlestrike/tests/balance-review.mjs
```

Use `--seeds 12` to widen the seed sample or `--multiwave-seconds 300` for longer survivor accumulation. The baseline command uses `--engine test-results/balance-baseline/engine.js`; that ignored local snapshot was captured before engine edits and includes its matching data module. Full JSON and Markdown evidence is stored in ignored `test-results/` outputs.

Report sources: `test-results/balance-baseline/final-protocol.json`, `test-results/balance-final.json`, `test-results/balance-baseline/strategy.json`, `test-results/balance-strategy-final.json`, and `test-results/balance-support.json`.

| Source | SHA-256 |
|---|---|
| Baseline engine | `9889d97efd19e4834e209e07dcaecc8325400e67b3b8da364be6214655b0979f` |
| Baseline data | `f67027a205031a6d1aa3a8f5c7728e0ebb2fcefb1ec8c1aaf5a93102d46ffe5f` |
| Tested engine | `fe2963f022cde0d634c60c3cdc3804783a7189db4e9e0fc43eda7e23b726f50f` |
| Tested data | `f80331c793749fe0b642113e0cd12d2fe3d20b4834d45e144944c321d5a1c2e7` |
| Tested tactics | `ecb14f1abfe60c8dfac5848a81928258d38a051fbe823a41512ad26e9536ba62` |
| Threat-portfolio tested engine | `fe2963f022cde0d634c60c3cdc3804783a7189db4e9e0fc43eda7e23b726f50f` |
| Threat-portfolio tested data | `f80331c793749fe0b642113e0cd12d2fe3d20b4834d45e144944c321d5a1c2e7` |
| Threat-portfolio tested tactics | `ecb14f1abfe60c8dfac5848a81928258d38a051fbe823a41512ad26e9536ba62` |

Support-attrition tested engine: `e296425b97f6d91c9739246857be8fd92c98747114ceac2d28e64b93a131d54d`.
