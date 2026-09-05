# Castle Strike balance evidence

Engine SHA-256: `fe2963f022cde0d634c60c3cdc3804783a7189db4e9e0fc43eda7e23b726f50f`
Data SHA-256: `f80331c793749fe0b642113e0cd12d2fe3d20b4834d45e144944c321d5a1c2e7`
Tactics SHA-256: `ecb14f1abfe60c8dfac5848a81928258d38a051fbe823a41512ad26e9536ba62`

Controlled unit and fixed-roster tests, not player win rates. Timeout is a draw, never a claimed victory. Faction signals describe this scenario portfolio only. Hero cost prevents some 5%-matched pairs; these are listed as untested.

Protocol: 2 deterministic seeds × two layouts × both map sides; purchase cost difference at most 5%. 182 unit pairings, 66 mixed/multi-wave scenarios (150s multiwave duration), 167 screened marginal-value comparisons, 79 mixed affordable-answer fixtures, 61 explicitly untested pure pairings.

Well-spaced 32-bit seeds. Isolated/screened sides retain semantic IDs and initial clocks. Multiwave scenarios use production spawn identities and randomness.

## Faction portfolio signals

| Pair | Left score | Scenarios |
|---|---:|---:|
| alliance / horde | 50.0% | 22 |
| alliance / undead | 63.6% | 22 |
| horde / undead | 47.7% | 22 |

## Per-unit coverage

| Unit | Declared useful matchups reaching 70% | Affordable answers |
|---|---|---|
| footman | headhunter, shaman, cryptfiend, banshee | grunt, ironmaw, tauren, wyvern, ghoul, necromancer, abomination, graveengine, frostwyrm |
| archer | shaman, wyvern, necromancer, banshee, frostwyrm | grunt, ironmaw, demolisher, tauren, blademaster, ghoul, skeleton, cryptfiend, abomination, graveengine, deathknight |
| spearman | raider, wyvern | grunt, ironmaw, tauren, blademaster, ghoul, skeleton, abomination, graveengine, frostwyrm, deathknight |
| knight | headhunter, shaman, cryptfiend, necromancer, banshee, necromancer (screened marginal value) | grunt, tauren, wyvern, ghoul, skeleton, frostwyrm |
| priest | shaman, ironmaw (screened marginal value) | grunt, headhunter, raider, ironmaw, demolisher, ghoul, skeleton, cryptfiend, necromancer, abomination, graveengine, tauren + grunt + grunt, wyvern + grunt + headhunter, blademaster + grunt, banshee + ghoul + ghoul, frostwyrm + ghoul + ghoul + ghoul + skeleton, deathknight + skeleton |
| mage | tauren, abomination, deathknight, ironmaw (screened marginal value), skeleton (screened marginal value), grunt (screened marginal value) | grunt, headhunter, raider, ironmaw, demolisher, wyvern, blademaster, ghoul, skeleton, cryptfiend, graveengine, frostwyrm + ghoul + ghoul + skeleton |
| ballista | headhunter, skeleton, necromancer, necromancer (screened marginal value) | ironmaw, tauren, wyvern, blademaster + grunt + headhunter, frostwyrm + ghoul + skeleton + skeleton, deathknight + ghoul + cryptfiend |
| gryphon | grunt, ironmaw, ghoul, skeleton, abomination, grunt (screened marginal value), ironmaw (screened marginal value), ghoul (screened marginal value), skeleton (screened marginal value), abomination (screened marginal value) | headhunter, cryptfiend, blademaster + headhunter + raider, necromancer + ghoul + ghoul, deathknight + cryptfiend + cryptfiend |
| paladin | headhunter, blademaster, cryptfiend (screened marginal value) | skeleton, deathknight, tauren + grunt, wyvern + headhunter |
| grunt | footman, archer, spearman, knight, priest, mage, cryptfiend, banshee | gryphon, necromancer, abomination, graveengine, frostwyrm |
| headhunter | priest, mage, gryphon, necromancer, banshee, frostwyrm, necromancer (screened marginal value) | footman, spearman, knight, ballista, paladin, ghoul, skeleton, cryptfiend, abomination, graveengine, deathknight |
| raider | priest, mage, banshee | footman, archer, spearman, knight, ballista, ghoul, skeleton, cryptfiend, necromancer, abomination, graveengine, paladin + archer + spearman, deathknight + ghoul + cryptfiend + cryptfiend |
| shaman | paladin (screened marginal value) | footman, archer, spearman, knight, priest, mage, ballista, gryphon, ghoul, skeleton, cryptfiend, banshee, abomination, graveengine, frostwyrm, paladin + archer, necromancer + ghoul + skeleton, deathknight + ghoul + ghoul + cryptfiend |
| ironmaw | footman, archer, spearman, priest, ghoul, skeleton, cryptfiend, necromancer, knight (screened marginal value), necromancer (screened marginal value) | gryphon, abomination, frostwyrm + ghoul + ghoul + ghoul, deathknight + skeleton + skeleton |
| demolisher | archer, necromancer | footman, knight, ballista, gryphon, ghoul, paladin + footman, graveengine + skeleton + cryptfiend, frostwyrm + ghoul + ghoul, deathknight + skeleton |
| tauren | footman, archer, spearman, knight, ghoul, skeleton, necromancer, knight (screened marginal value), skeleton (screened marginal value) | mage, gryphon + archer + archer + spearman, frostwyrm + ghoul + ghoul + cryptfiend |
| wyvern | mage, ballista, necromancer, banshee, graveengine, ballista (screened marginal value), graveengine (screened marginal value) | archer, spearman, cryptfiend, gryphon + footman + footman + archer, frostwyrm + cryptfiend + cryptfiend, deathknight + ghoul + cryptfiend |
| blademaster | archer, spearman, mage, footman (screened marginal value), skeleton (screened marginal value) | knight, paladin, skeleton, deathknight, gryphon + spearman, abomination + skeleton + skeleton |
| ghoul | archer, priest, mage, headhunter, shaman, priest (screened marginal value) | gryphon, ironmaw, tauren, wyvern |
| skeleton | archer, spearman, knight, paladin, headhunter, raider, blademaster | ballista, gryphon, ironmaw, tauren, wyvern |
| cryptfiend | archer, priest, mage, gryphon, headhunter, shaman, wyvern | footman, spearman, knight, ballista, grunt, ironmaw, demolisher, tauren, paladin + footman, blademaster + grunt |
| necromancer | footman, priest, grunt, raider, footman (screened marginal value), spearman (screened marginal value), knight (screened marginal value), headhunter (screened marginal value) | archer, knight, ballista, headhunter, ironmaw, demolisher, tauren, wyvern, mage + footman + spearman, gryphon + archer + archer, blademaster + raider |
| banshee | footman (screened marginal value), knight (screened marginal value) | footman, archer, spearman, knight, ballista, grunt, headhunter, raider, demolisher, tauren, wyvern, mage + spearman + spearman, gryphon + footman + archer, paladin + footman + archer + archer, ironmaw + raider, blademaster + headhunter + headhunter + headhunter |
| abomination | footman, archer, spearman, grunt, headhunter, raider, ironmaw | mage, ballista, gryphon, tauren, wyvern |
| graveengine | footman, archer, spearman, grunt, headhunter | knight, wyvern, gryphon + footman + spearman + spearman, paladin + footman + footman, tauren + grunt + grunt + grunt, blademaster + grunt + grunt |
| frostwyrm | footman, spearman, knight, grunt, footman (screened marginal value), knight (screened marginal value), grunt (screened marginal value), ironmaw (screened marginal value) | archer, headhunter, mage + spearman + spearman, paladin + footman + archer + archer |
| deathknight | archer, spearman, paladin, headhunter, blademaster, archer (screened marginal value), spearman (screened marginal value), priest (screened marginal value), ironmaw (screened marginal value) | knight, mage, gryphon + spearman, wyvern + headhunter |

## Flags

- FACTION_PORTFOLIO_OUTSIDE_40_60: alliance / undead Diagnostic portfolio imbalance, not a measured full-match player win rate.

The JSON contains every tested result, army composition, budget, seed, layout, side, outcome, timeout, and sampled unit count. No failing scenario is discarded.
