# Castle Strike balance evidence

Engine SHA-256: `18f47698b8a763d4f7e4309e956473a7260cf2145170125d421c3372983ff114`

Controlled unit and fixed-roster tests, not player win rates. Timeout is a draw, never a claimed victory. Faction signals describe this scenario portfolio only. Hero cost prevents some 5%-matched pairs; these are listed as untested.

Protocol: 1 deterministic seeds × two layouts × both map sides; purchase cost difference at most 5%. 182 unit pairings, 66 mixed/multi-wave scenarios, 61 explicitly untested pairings.

## Faction portfolio signals

| Pair | Left score | Scenarios |
|---|---:|---:|
| alliance / horde | 66.5% | 22 |
| alliance / undead | 48.9% | 22 |
| horde / undead | 35.8% | 22 |

## Per-unit coverage

| Unit | Declared useful matchups reaching 70% | Affordable answers |
|---|---|---|
| footman | headhunter, shaman, cryptfiend, banshee | grunt, ironmaw, tauren, wyvern, ghoul, necromancer, abomination, graveengine, frostwyrm |
| archer | shaman, wyvern, necromancer, banshee, frostwyrm | grunt, ironmaw, demolisher, tauren, blademaster, ghoul, skeleton, cryptfiend, abomination, graveengine, deathknight |
| spearman | raider, wyvern | grunt, ironmaw, demolisher, tauren, blademaster, ghoul, skeleton, necromancer, abomination, graveengine, frostwyrm, deathknight |
| knight | headhunter, shaman, cryptfiend, necromancer, banshee | grunt, tauren, wyvern, ghoul, skeleton, graveengine, frostwyrm |
| priest | shaman | grunt, headhunter, raider, ironmaw, demolisher, ghoul, skeleton, cryptfiend, necromancer, abomination, graveengine |
| mage | Unproven | grunt, headhunter, raider, ironmaw, demolisher, tauren, wyvern, blademaster, ghoul, skeleton, cryptfiend, abomination, graveengine, deathknight |
| ballista | grunt, headhunter, skeleton, necromancer | wyvern |
| gryphon | grunt, ironmaw, ghoul, skeleton, abomination | headhunter, cryptfiend |
| paladin | headhunter, blademaster | skeleton, deathknight |
| grunt | footman, archer, spearman, knight, priest, mage, cryptfiend, banshee | ballista, gryphon, necromancer, abomination, graveengine, frostwyrm |
| headhunter | priest, mage, gryphon, necromancer, banshee, frostwyrm | footman, spearman, knight, ballista, paladin, ghoul, skeleton, cryptfiend, abomination, graveengine, deathknight |
| raider | priest, mage, banshee | footman, archer, spearman, knight, ballista, ghoul, skeleton, cryptfiend, necromancer, abomination, graveengine, frostwyrm |
| shaman | Unproven | footman, archer, spearman, knight, priest, mage, ballista, gryphon, ghoul, skeleton, cryptfiend, banshee, abomination, graveengine, frostwyrm |
| ironmaw | footman, archer, spearman, priest, ghoul, skeleton, cryptfiend, necromancer | ballista, gryphon, abomination, graveengine |
| demolisher | archer, spearman, skeleton, necromancer | footman, knight, gryphon, ghoul |
| tauren | footman, archer, spearman, knight, ghoul, skeleton, necromancer | Unproven |
| wyvern | mage, ballista, necromancer, banshee, graveengine | archer, spearman, cryptfiend |
| blademaster | archer, spearman, mage | knight, paladin, skeleton, deathknight |
| ghoul | archer, priest, mage, headhunter, shaman | gryphon, ironmaw, tauren, wyvern |
| skeleton | archer, spearman, knight, paladin, headhunter, raider, blademaster | footman, ballista, gryphon, ironmaw, demolisher, tauren, wyvern |
| cryptfiend | archer, priest, mage, gryphon, headhunter, shaman, wyvern | footman, spearman, knight, ballista, grunt, ironmaw, demolisher, tauren |
| necromancer | footman, spearman, priest, grunt, raider | archer, knight, ballista, headhunter, ironmaw, demolisher, tauren, wyvern |
| banshee | Unproven | footman, archer, spearman, knight, ballista, grunt, headhunter, raider, demolisher, tauren, wyvern |
| abomination | footman, archer, spearman, grunt, headhunter, raider, ironmaw | ballista, gryphon, tauren, wyvern |
| graveengine | footman, archer, spearman, grunt, headhunter | wyvern |
| frostwyrm | footman, spearman, knight, grunt | archer, headhunter |
| deathknight | archer, spearman, paladin, headhunter, blademaster | Unproven |

## Flags

- MISSING_USEFUL_MATCHUP: mage No declared direct counter reaches 70% in the tested matrix.
- MISSING_USEFUL_MATCHUP: shaman Support synergy requires marginal-value fixtures; isolated losses are not sufficient proof of weakness.
- MISSING_AFFORDABLE_ANSWER: tauren 
- MISSING_USEFUL_MATCHUP: banshee No declared direct counter reaches 70% in the tested matrix.
- MISSING_AFFORDABLE_ANSWER: deathknight 
- SIDE_BIAS_OVER_5_POINTS: footman / skeleton  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: spearman / frostwyrm  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: knight / demolisher  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: knight / skeleton  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: knight / graveengine  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: ballista / grunt  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: ballista / tauren  (25.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: raider / necromancer  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: demolisher / ghoul  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: demolisher / skeleton  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: alliance / horde  (25.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: alliance / horde  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: horde / undead  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: horde / undead  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: horde / undead  (50.0 percentage points)
- SIDE_BIAS_OVER_5_POINTS: horde / undead  (25.0 percentage points)
- FACTION_PORTFOLIO_OUTSIDE_40_60: alliance / horde Diagnostic portfolio imbalance, not a measured full-match player win rate.
- FACTION_PORTFOLIO_OUTSIDE_40_60: horde / undead Diagnostic portfolio imbalance, not a measured full-match player win rate.

The JSON contains every tested result, army composition, budget, seed, layout, side, outcome, timeout, and sampled unit count. No failing scenario is discarded.
