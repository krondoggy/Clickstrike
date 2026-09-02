# Changelog

All notable changes to Clickstrike are documented here.

## [Unreleased]

### Added

- **Castle Strike v0.7.0** — synthesized SFX (mute toggle, throttled WebAudio); battle particles (impact sparks, death dust, tower debris, splash rings); arcing catapult/grenadier projectiles; ability telegraphs (charge, aegis, sanctuary, stun, slow, volley); screen shake; keep distress smoke; rich unit tooltips; timer urgency in final 5s; win-streak HUD; gold spend feedback; keyboard shortcuts (H/M); richer end stats and best-record persistence; victory/defeat finale

### Added (prior)
- **Castle Strike v0.6.0** — per-type unit research (up to 3 levels: +16% HP / +14% ATK) and shared tower upgrades (+HP, +ATK, +range); Hire / Research shop tabs; AI buys research; living units and towers scale immediately
- **Castle Strike** — same background music and mute toggle as Clickstrike (shared volume / mute preference)
- **Castle Strike v0.5.3** — Clickstrike-style fight feel: framed unit portraits, hard lunges, hit/attack rings, aimed projectiles, spawn pop, death tip-over, snappy positions
- **Castle Strike v0.5.2** — team-colored unit palettes (steel-blue allies vs crimson foes), ground glow, side-tinted HP bars, and small nameplates on every battlefield unit
- **Castle Strike v0.5.1** — WC3 chrome: shared stone/gold theme, Cinzel titles, framed HP/gold bars, ornate shop and bench portraits
- **Castle Strike v0.5** — battle polish: lane-aware targeting, kiting, delayed projectiles, signature abilities (Brace, Volley, Shield Bash, Charge, Sanctuary, Arcane, Aegis), Champions (Bulwark, Bonesinger, Raid Captain) with gold rez, bone minions; expanded roster (Militia, Guardian, Assassin, Grenadier, Catapult)
- **Castle Strike v0.4** — Direct Strike battlefield: open map with keeps and towers, surviving units persist between waves
- **Castle Strike v0.3** — full autobattler rebuild: round-based prep/combat/resolve loop, drag-and-drop placement, modern UI

### Changed

- **Castle Strike v0.7.3** — mobile Battle tab includes barracks dock under the field; Shop tab is hire/research only; buying a unit switches to Battle to deploy
- **Castle Strike v0.7.2** — mobile Battle / Barracks / Shop panes; tooltips dismiss on tap-away and long-press on touch; compact HUD and larger tap targets
- **Castle Strike v0.7.1** — removed Send Wave (button and Space); waves only deploy when the countdown hits zero
- **Castle Strike v0.6.2** — slower early economy (10g start, 0.85/s base); premium units unlock by wave (Militia/Spearman only at start; Archer wave 3; Rider/Healer wave 4; Assassin/Grenadier wave 5; Knight/Mage/Guardian wave 6; Catapult wave 7); locked units shown grayed in shop
- **Castle Strike v0.5.7** — taller battlefield; player towers render above the deploy grid; softer spawn tiles during fights
- **Castle Strike v0.5.6** — wave countdown 20s → 30s; roster cap starts at 2 and grows by 1 each wave so early armies stay small
- **Castle Strike v0.5.5** — select a spawn-grid unit, then click a highlighted tile to move or swap (dropped board drag-and-drop)
- **Castle Strike v0.5.4** — slower field movement; lower starting gold (18) and passive income (1.6/s base)
- **Castle Strike** — survivors stay on the field; new waves deploy from the spawn zone and join them
- **Castle Strike** — keeps take damage from units that reach them; towers auto-fire on nearby enemies
- **Castle Strike** — discrete rounds replace continuous waves; per-round gold income; Economy shop card replaces passive GPS workers
- **Castle Strike** — combat uses role bias, healer hold-back, hero auras, corpse fade, and placement locks while a wave deploys

### Added (prior)

- **Castle Strike** MVP at `games/castlestrike/` — Direct Strike-style roster waves, passive gold economy, AI opponent

### Changed

- Site root is now a game hall; Clickstrike lives at `games/clickstrike/`
- Shared theme tokens and panel chrome live in `shared/` for the next game

## [1.0.0] - 2026-09-01

### Added

- Initial public release on GitHub Pages
- How to Play help modal (first-run + Help button)
- Styled New Game confirmation dialog
- Army food upkeep and starvation mechanics
- Net food rate display, starvation warning, army upkeep HUD
- Release metadata (Open Graph, Twitter cards, canonical URL)
- GitHub Actions deploy workflow

### Changed

- Economy rebalance: auto-workers earn 40% click yield (not full clicks)
- Steeper economy upgrade cost growth
- Flattened combat income (win bonus, kill gold/food, soft caps)
- Increased loss penalties
- Granary also reduces food upkeep (−2% per level, max −40%)
- Baseline food drip 0.2 → 0.3 f/s for new games
- README updated for v1.0 mechanics
