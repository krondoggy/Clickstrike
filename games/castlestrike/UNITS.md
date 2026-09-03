# Castle Strike — Unit Reference

**Game version:** 0.8.0  
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
| Strong counter (`strongVs` tag match) | ×1.4 |
| Weak counter (`weakVs` tag match) | ×0.7 |
| Slowed movement | ×0.55 speed |

### Tags

`infantry` · `cavalry` · `ranged` · `magic` · `support` · `armored` · `siege`

### Hire cost

`floor(baseCost × costGrowth^owned)` — default `costGrowth` is **1.22** unless noted.

### Unit research (Shop → Research)

Per owned type, two independent tracks (max **3** each):

| Track | Per level |
|-------|-----------|
| +HP | +16% max HP |
| +ATK | +14% attack |

Cost per track level: `floor(baseCost × 2.1 × 1.6^level)`. Living fielded units update immediately.

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

**Ability: Brace**  
On melee hit vs **cavalry**, if the target has moved more than 2 units since last stop (or is mid-charge):

- Deal **×1.5** damage on that hit
- Apply **slow 0.6s** (55% move speed)

---

### Archer

| Stat | Value |
|------|-------|
| **Cost** | 44g |
| **Unlock** | Wave 3 |
| **HP / ATK** | 14 / 9 |
| **Speed** | 4.0 |
| **Armor** | 0 |
| **Attack CD** | 0.52s |
| **Range** | 24 |
| **Style** | ranged |
| **Tags** | ranged |
| **Strong vs** | infantry |
| **Weak vs** | cavalry |

**Ability: Volley**  
Every **5th** shot also hits the nearest other enemy in range at **×0.75** damage (no splash).

---

### Knight

| Stat | Value |
|------|-------|
| **Cost** | 85g |
| **Unlock** | Wave 6 |
| **HP / ATK** | 45 / 13 |
| **Speed** | 2.5 |
| **Armor** | 3 |
| **Attack CD** | 0.7s |
| **Range** | 6 (melee) |
| **Style** | melee |
| **Tags** | infantry, armored |
| **Strong vs** | ranged |
| **Weak vs** | magic |

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
| **HP / ATK** | 22 / 9 |
| **Speed** | 5.8 |
| **Armor** | 0 |
| **Attack CD** | 0.45s |
| **Range** | 6 (melee) |
| **Style** | melee |
| **Tags** | cavalry |
| **Strong vs** | ranged, magic, support |
| **Weak vs** | infantry |

**Ability: Charge**  
While moving toward a target, accumulate charge distance. After **14** units of movement, next melee hit:

- **×1.35** damage
- **Stun** target **0.21s** (60% of base stun)
- Resets charge meter

---

### Healer

| Stat | Value |
|------|-------|
| **Cost** | 58g |
| **Unlock** | Wave 4 |
| **HP / ATK** | 18 / 6 |
| **Speed** | 3.0 |
| **Armor** | 0 |
| **Attack CD** | 0.9s |
| **Range** | 24 |
| **Style** | heal |
| **Tags** | support |
| **Strong vs** | — |
| **Weak vs** | cavalry |

**Ability: Sanctuary**  
Normally heals one ally for **ATK** (6) HP.  
If **2+ wounded allies** are in range, casts **Sanctuary** instead: heals **all** wounded allies in range for **55% of ATK** (rounded, min 1) each.

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

**Ability: Arcane**  
On hit, splash **radius 10** to nearby enemies for **45% of ATK** (after counters/armor).  
Magic damage vs **Aegis** (Guardian) is reduced to **×0.65**.

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
| **Tags** | infantry, armored |
| **Strong vs** | magic |
| **Weak vs** | cavalry |

**Ability: Aegis**  
When off cooldown, activating on attack:

- **Taunt** active **2.2s** — ranged attackers prefer targeting the Guardian
- **Aegis** buff **2.2s** — incoming magic damage **×0.65**

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
| **Weak vs** | infantry |
| **Target priority** | backline (ranged, magic, support, siege) |

**Ability:** none (role is dive targeting)  
Fast backline hunter. Soft vs spears and other infantry.

---

### Grenadier

| Stat | Value |
|------|-------|
| **Cost** | 68g |
| **Unlock** | Wave 5 |
| **HP / ATK** | 24 / 9 |
| **Speed** | 2.8 |
| **Armor** | 1 |
| **Attack CD** | 0.65s |
| **Range** | 18 |
| **Style** | ranged |
| **Tags** | ranged |
| **Strong vs** | infantry |
| **Weak vs** | cavalry |
| **Splash radius** | 10 |

**Ability:** none (splash is passive)  
Primary hit is full damage; splash hits nearby enemies for **45% of ATK** (after counters/armor).

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

**Ability:** none  
**×2.6** damage multiplier vs **towers and keeps** (uses `structureMult`). Poor duelist; bring for sieging.

---

## Champions (heroes)

One hero per match. Hire on **Hire** tab from **wave 4+**.  
Rez cost while down: `floor(hireGold × 0.4)`.

### Bulwark — 180g

| Stat | Value |
|------|-------|
| **HP / ATK** | 160 / 10 |
| **Speed** | 2.2 |
| **Armor** | 6 |
| **Attack CD** | 0.85s |
| **Range** | 6 (melee) |
| **Tags** | infantry, armored |
| **Strong vs** | ranged |
| **Weak vs** | magic |

**Aura:** allied **ranged** and **magic** units deal **+20%** damage.

---

### Bonesinger — 195g

| Stat | Value |
|------|-------|
| **HP / ATK** | 55 / 16 |
| **Speed** | 3.4 |
| **Armor** | 1 |
| **Attack CD** | 0.7s |
| **Range** | 30 |
| **Style** | magic |
| **Tags** | magic |
| **Strong vs** | armored |
| **Weak vs** | cavalry |

**Aura:** allied **melee** units deal **+15%** damage.  
**Raise bones:** on player kill, **30%** chance to spawn a **Bone Minion** (max **3** on field).

---

### Raid Captain — 190g

| Stat | Value |
|------|-------|
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
| `VOLLEY_BONUS_MULT` | 0.75 |
| `VOLLEY_INTERVAL` | every 5th shot |
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
