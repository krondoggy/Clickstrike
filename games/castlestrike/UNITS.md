# Castle Strike — Unit Reference

**Game version:** 0.9.0  
**Source of truth:** mirrors [`game.js`](game.js) (`UNIT_TYPES`, `HEROES`, combat constants).  
When stats change in code, update this file to match.

---

## Global rules

### Damage

```
damage = max(1, round(atk × counterMult × bonusMult × auraMult) − armor × 0.5)
```

| Modifier | Value |
|----------|-------|
| Strong counter (`strongVs` tag match) | ×1.55 |
| Weak counter (`weakVs` tag match) | ×0.55 |
| Slowed movement | ×0.55 speed |

### Tags

`infantry` · `cavalry` · `ranged` · `magic` · `support` · `armored` · `siege`

### Hire cost

`floor(baseCost × costGrowth^owned)` — default `costGrowth` is **1.22** unless noted.

### Unit research (Shop → Research)

#### Class tracks (max **3** each)

Unlock once you own ≥1 matching unit. Cost: `floor(40 × 1.55^level)`.

| Track | Applies to | Per level |
|-------|------------|-----------|
| Forged Swords | Melee (`atkStyle === "melee"`) | +14% damage |
| Bodkin Arrows | Ranged | +14% damage |
| Arcane Focus | Magic & Heal | +14% damage / heal |

#### Per-unit tracks (max **3** each)

Cost: `floor(baseCost × 2.1 × 1.6^level)`.

| Track | Stat | Per level |
|-------|------|-----------|
| Vitality | HP | +16% |
| Plating | Armor | +1 |
| Reach | Range | +3 |
| Haste | Speed | +8% |
| Blast | Splash | +2 (Grenadier) |
| Siegecraft | `structureMult` | +0.3 (Catapult) |

| Unit | Tracks |
|------|--------|
| Militia | Vitality |
| Spearman | Vitality, Plating |
| Archer | Vitality, Reach |
| Knight | Vitality, Plating |
| Rider | Vitality, Haste |
| Healer | Vitality, Reach |
| Mage | Vitality, Reach |
| Guardian | Vitality, Plating |
| Assassin | Vitality, Haste |
| Grenadier | Vitality, Blast |
| Catapult | Vitality, Siegecraft |

Living fielded units update immediately. Heroes are not researchable.

### Ranged behavior

- **Kite:** ranged/magic units retreat if an enemy is closer than **10** units.
- **Projectile flight:** 0.25s delay before hit resolves.

### Unlock waves

| Wave | Units |
|------|-------|
| 1 | Militia, Spearman |
| 3 | Archer |
| 4 | Rider, Healer, **Heroes** |
| 5 | Assassin, Grenadier |
| 6 | Knight, Mage, Guardian |
| 7 | Catapult |

---

## Roster units

### Militia

| Stat | Value |
|------|-------|
| **Cost** | 10g (growth **1.32**) |
| **Unlock** | Wave 1 |
| **HP / ATK** | 18 / 3 |
| **Speed** | 3.4 |
| **Armor** | 0 |
| **Attack CD** | 0.5s |
| **Range** | 6 (melee) |
| **Style** | melee |
| **Tags** | infantry |
| **Strong vs** | support |
| **Weak vs** | ranged |
| **Upgrades** | Vitality |

**Ability:** none  
Cheap frontline soak. Soft into ranged fire.

---

### Spearman

| Stat | Value |
|------|-------|
| **Cost** | 18g |
| **Unlock** | Wave 1 |
| **HP / ATK** | 28 / 5 |
| **Speed** | 3.0 |
| **Armor** | 1 |
| **Attack CD** | 0.55s |
| **Range** | 6 (melee) |
| **Style** | melee |
| **Tags** | infantry |
| **Strong vs** | cavalry |
| **Weak vs** | ranged |
| **Upgrades** | Vitality, Plating |

**Ability: Brace**  
On melee hit vs **cavalry**, if the target has moved more than 2 units since last stop (or is mid-charge):

- Deal **×1.5** damage on that hit
- Apply **slow 0.6s** (55% move speed)

---

### Archer

| Stat | Value |
|------|-------|
| **Cost** | 48g |
| **Unlock** | Wave 3 |
| **HP / ATK** | 14 / 7 |
| **Speed** | 4.0 |
| **Armor** | 0 |
| **Attack CD** | 0.68s |
| **Range** | 20 |
| **Style** | ranged |
| **Tags** | ranged |
| **Strong vs** | infantry |
| **Weak vs** | cavalry, armored |
| **Upgrades** | Vitality, Reach |

**Ability: Volley**  
Every **6th** shot also hits the nearest other enemy in range at **×0.55** damage (no splash).

Shreds light infantry. Soft vs cavalry and armor.

---

### Knight

| Stat | Value |
|------|-------|
| **Cost** | 85g |
| **Unlock** | Wave 6 |
| **HP / ATK** | 52 / 13 |
| **Speed** | 2.5 |
| **Armor** | 3 |
| **Attack CD** | 0.7s |
| **Range** | 6 (melee) |
| **Style** | melee |
| **Tags** | armored |
| **Strong vs** | ranged |
| **Weak vs** | magic |
| **Upgrades** | Vitality, Plating |

**Ability: Shield Bash**  
When off cooldown (**4.5s** CD), melee hits also:

- **Stun** target **0.35s**
- Force target to focus the Knight

---

### Rider

| Stat | Value |
|------|-------|
| **Cost** | 52g |
| **Unlock** | Wave 4 |
| **HP / ATK** | 26 / 9 |
| **Speed** | 5.8 |
| **Armor** | 1 |
| **Attack CD** | 0.45s |
| **Range** | 6 (melee) |
| **Style** | melee |
| **Tags** | cavalry |
| **Strong vs** | ranged, magic, support |
| **Weak vs** | infantry, armored |
| **Upgrades** | Vitality, Haste |

**Ability: Charge**  
After moving **14+** units without stopping, next melee hit deals **×1.35** and briefly stuns.

---

### Healer

| Stat | Value |
|------|-------|
| **Cost** | 58g |
| **Unlock** | Wave 4 |
| **HP / ATK** | 18 / 6 (heal) |
| **Speed** | 3.0 |
| **Armor** | 0 |
| **Attack CD** | 0.9s |
| **Range** | 24 |
| **Style** | heal |
| **Tags** | support |
| **Strong vs** | — |
| **Weak vs** | cavalry |
| **Upgrades** | Vitality, Reach |

**Ability: Sanctuary**  
Periodic group heal on nearby allies.

---

### Mage

| Stat | Value |
|------|-------|
| **Cost** | 78g |
| **Unlock** | Wave 6 |
| **HP / ATK** | 14 / 18 |
| **Speed** | 3.2 |
| **Armor** | 0 |
| **Attack CD** | 0.75s |
| **Range** | 32 |
| **Style** | magic |
| **Tags** | magic |
| **Strong vs** | armored |
| **Weak vs** | cavalry |
| **Upgrades** | Vitality, Reach |

**Ability: Arcane**  
Splash damage on impact (**×0.45** to nearby foes).

---

### Guardian

| Stat | Value |
|------|-------|
| **Cost** | 72g |
| **Unlock** | Wave 6 |
| **HP / ATK** | 70 / 6 |
| **Speed** | 1.8 |
| **Armor** | 5 |
| **Attack CD** | 0.85s |
| **Range** | 6 (melee) |
| **Style** | melee |
| **Tags** | armored |
| **Strong vs** | magic |
| **Weak vs** | cavalry |
| **Upgrades** | Vitality, Plating |

**Ability: Aegis**  
Taunt nearby foes and reduce magic damage taken for **2.2s**.

---

### Assassin

| Stat | Value |
|------|-------|
| **Cost** | 64g |
| **Unlock** | Wave 5 |
| **HP / ATK** | 18 / 11 |
| **Speed** | 6.2 |
| **Armor** | 0 |
| **Attack CD** | 0.42s |
| **Range** | 6 (melee) |
| **Style** | melee |
| **Tags** | cavalry |
| **Strong vs** | support, magic |
| **Weak vs** | infantry, armored |
| **Upgrades** | Vitality, Haste |

Dives for backline targets. Soft vs spears & armor.

---

### Grenadier

| Stat | Value |
|------|-------|
| **Cost** | 68g |
| **Unlock** | Wave 5 |
| **HP / ATK** | 24 / 8 |
| **Speed** | 2.8 |
| **Armor** | 1 |
| **Attack CD** | 0.65s |
| **Range** | 18 |
| **Style** | ranged |
| **Tags** | ranged |
| **Strong vs** | infantry |
| **Weak vs** | cavalry, armored |
| **Splash** | 10 |
| **Upgrades** | Vitality, Blast |

Splash punishes clumps. Soft vs cavalry & armor.

---

### Catapult

| Stat | Value |
|------|-------|
| **Cost** | 96g |
| **Unlock** | Wave 7 |
| **HP / ATK** | 20 / 8 |
| **Speed** | 1.6 |
| **Armor** | 0 |
| **Attack CD** | 1.1s |
| **Range** | 36 |
| **Style** | ranged |
| **Tags** | siege |
| **Strong vs** | — |
| **Weak vs** | cavalry |
| **Structure mult** | ×2.6 |
| **Upgrades** | Vitality, Siegecraft |

Melts towers & keeps. Soft vs cavalry.

---

## Heroes

Heroes unlock at wave **4**. One hero per match. Not researchable.

### Bulwark

| Stat | Value |
|------|-------|
| **Hire** | 180g |
| **HP / ATK** | 160 / 10 |
| **Speed** | 2.2 |
| **Armor** | 6 |
| **Attack CD** | 0.85s |
| **Range** | 6 (melee) |
| **Tags** | infantry, armored |
| **Strong vs** | ranged |
| **Weak vs** | magic |

**Aura:** allied **ranged** & **magic** deal **+20%** damage.

### Bonesinger

| Stat | Value |
|------|-------|
| **Hire** | 195g |
| **HP / ATK** | 55 / 16 |
| **Speed** | 3.4 |
| **Armor** | 1 |
| **Attack CD** | 0.7s |
| **Range** | 30 |
| **Style** | magic |
| **Tags** | magic |
| **Strong vs** | armored |
| **Weak vs** | cavalry |

**Aura:** allied **melee** deal **+15%** damage. Can raise Bone Minions on kills.

### Raid Captain

| Stat | Value |
|------|-------|
| **Hire** | 190g |
| **HP / ATK** | 85 / 14 |
| **Speed** | 5.8 |
| **Armor** | 2 |
| **Attack CD** | 0.5s |
| **Range** | 6 (melee) |
| **Tags** | cavalry |
| **Strong vs** | ranged, magic |
| **Weak vs** | infantry |

**Aura:** allied **cavalry** deal **+20%** damage.  
**Player-only speed aura:** all player units **+12%** move speed.

---

## Summons

### Bone Minion

Spawned by Bonesinger. Not purchasable.

| Stat | Value |
|------|-------|
| **HP / ATK** | 16 / 5 |
| **Speed** | 3.6 |
| **Armor** | 0 |
| **Attack CD** | 0.5s |
| **Range** | 6 (melee) |
| **Tags** | infantry |

No ability. No counters defined.

---

## Structures (reference)

### Tower (baseline)

| Stat | Value |
|------|-------|
| **HP / ATK** | 75 / 7 |
| **Range** | 15 |
| **Attack CD** | 1.05s |

**Tower research** (max 3): +20 HP, +2 ATK, +3 range per level.  
Base cost 45g, growth ×1.55 per level.

### Keep

| Stat | Value |
|------|-------|
| **HP** | 1500 |

Units that reach an enemy keep deal chip damage: `max(1, round(atk × 0.32 × structureMult))` per hit. Catapults (`structureMult` ×2.6) are the dedicated siege option. First keep to fall loses.

---

## Ability constants (quick reference)

| Constant | Value |
|----------|-------|
| `CHARGE_BONUS` | ×1.35 damage |
| `CHARGE_DISTANCE` | 14 move units |
| `BRACE_BONUS` | ×1.5 damage |
| `SLOW_S` | 0.6s |
| `STUN_S` | 0.35s |
| `CHARGE_STUN` | 0.21s (60% of stun) |
| `SHIELD_BASH_CD` | 4.5s |
| `AEGIS_S` | 2.2s |
| `SPLASH_DAMAGE_FRAC` | 0.45 |
| `VOLLEY_BONUS_MULT` | 0.55 |
| `VOLLEY_INTERVAL` | every 6th shot |
| `KITE_MIN_RANGE` | 10 |
| `CASTLE_HP` | 1500 |
| `CASTLE_CHIP_MULT` | 0.32 |

---

## Campaign Levels

Each victory advances a persistent campaign level (`castlestrike-level` in localStorage). Defeat keeps the current level. Level 1 is identical to the base game; all bonuses apply only to the AI.

| Bonus | Formula | Notes |
|-------|---------|-------|
| AI gold income | `×(1 + 0.12 × (level − 1))` | Scales forever |
| AI starting gold | `+15 × (level − 1)` | On top of the shared 10g start |
| AI buy interval | `max(0.8, 1.6 × (1 − 0.05 × (level − 1)))` | Floored at 0.8s |
| AI keep HP | `round(1500 × (1 + 0.08 × (level − 1)))` | Player keep stays 1500 |
| AI unit HP/ATK | From level 4+: `×min(1.4, 1 + 0.04 × (level − 3))` | Cap +40% at level 13+ |

Progress can be reset to Level 1 from the end-of-match screen. Best level cleared is tracked in `castlestrike-best-record`.
