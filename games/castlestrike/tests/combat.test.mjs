import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, counterNeed } from '../src/engine.js';
import { UNIT_MAP, ABILITY_RULES } from '../src/data.js';

function arena(playerIds, enemyIds) {
  const g = createGame({ faction: UNIT_MAP[playerIds[0]].faction });
  const s = g.state;
  s.enemyFaction = UNIT_MAP[enemyIds[0]].faction;
  const roster = ids => ids.map((unitId, i) => ({ id: `r${s.nextId++}`, unitId, row: i % 6, col: Math.floor(i / 6) }));
  s.roster = roster(playerIds); s.enemyRoster = roster(enemyIds);
  s.supply = s.roster.reduce((total, r) => total + UNIT_MAP[r.unitId].supply, 0);
  g.start();
  s.aiTimer = 100000; s.nextWave = 100000; s.enemy.gold = 0;
  for (const u of s.units) Object.assign(u, { x: u.team === 'player' ? -1 : 1, z: 0, speed: 0, cooldown: 100, nextAttackAt: 100, abilityCooldown: 100, damage: 0, action: 'idle' });
  return g;
}
const ready = u => { u.cooldown = 0; u.nextAttackAt = 0; };
const advance = (g, seconds) => { for (let i = 0; i < Math.round(seconds * 10); i++) g.update(.1); };

test('melee damage waits for release and the advertised fractional cadence does not accumulate tick delays', () => {
  const g = arena(['footman'], ['grunt']);
  const [a, b] = g.state.units;
  a.damage = 10; ready(a); b.hp = b.maxHp = 100000;
  g.update(.1);
  assert.equal(b.hp, b.maxHp, 'Windup cannot damage its victim');
  const release = a.attackPose.releaseAt;
  assert.ok(release > g.state.time);
  g.update(release - g.state.time - .1);
  assert.equal(b.hp, b.maxHp);
  g.update(.1);
  assert.ok(b.hp < b.maxHp);
  advance(g, 60);
  const starts = a.attacks;
  assert.ok(Math.abs(starts - Math.floor((g.state.time - release) / a.attackSpeed) - 1) <= 1, '1.15-second attacks retain their average cadence');
  assert.ok(Math.abs(a.nextAttackAt / a.attackSpeed - Math.round(a.nextAttackAt / a.attackSpeed)) < .1);
});

test('ranged attacks have real flight time and a released projectile survives its source', () => {
  const g = arena(['archer'], ['grunt']);
  const [a, b] = g.state.units;
  a.x = -5; b.x = 5; a.damage = 32; ready(a);
  g.update(.1);
  const releaseAt = a.attackPose.releaseAt;
  g.update(releaseAt - g.state.time);
  assert.equal(g.state.pendingAttacks.length, 0);
  assert.equal(g.state.projectiles.length, 1);
  assert.equal(b.hp, b.maxHp, 'Release does not apply damage');
  const projectile = g.state.projectiles[0];
  assert.ok(projectile.impactAt > projectile.releaseAt);
  a.hp = 0;
  g.update(projectile.impactAt - g.state.time - .1);
  assert.equal(b.hp, b.maxHp, 'Victim remains healthy until the arrival tick');
  g.update(.1);
  assert.ok(b.hp < b.maxHp, 'A dead archer cannot retract an arrow already in flight');
  assert.equal(g.state.projectiles.length, 0);
});

test('a stun during windup cancels the pending strike instead of leaving invisible future damage', () => {
  const g = arena(['footman'], ['tauren']);
  const [a, b] = g.state.units;
  a.damage = 80; ready(a); b.abilityCooldown = .2;
  g.update(.1);
  assert.ok(g.state.pendingAttacks.some(hit => hit.sourceId === a.id));
  g.update(.1);
  assert.ok(a.stunTime > 0);
  assert.equal(a.attackPose, null);
  assert.equal(g.state.pendingAttacks.some(hit => hit.sourceId === a.id), false);
  advance(g, .6);
  assert.equal(b.hp, b.maxHp);
});

test('simultaneous lethal attacks trade equally regardless of unit array order', () => {
  for (const reverse of [false, true]) {
    const g = arena(['footman'], ['grunt']);
    const original = [...g.state.units];
    for (const u of original) { ready(u); u.damage = 10000; u.hp = 10; u.attackSpeed = 1; }
    if (reverse) g.state.units.reverse();
    advance(g, .4);
    assert.deepEqual(original.map(u => u.hp), [0, 0]);
    assert.equal(g.state.stats.kills, 1);
    assert.equal(g.state.stats.losses, 1);
  }
});

test('net roots movement but allows attacks, and repeated roots cannot extend control or its two-second recovery', () => {
  const g = arena(['raider'], ['footman']);
  const [raider, victim] = g.state.units;
  ready(raider); ready(victim); raider.damage = 1; victim.damage = 1;
  raider.abilityCooldown = 0; victim.hp = victim.maxHp = 10000;
  advance(g, .4);
  assert.ok(victim.rootTime > 0);
  const firstEnd = victim.rootUntil, immuneUntil = victim.controlRecoveryUntil, attacks = victim.attacks;
  assert.equal(immuneUntil - firstEnd, ABILITY_RULES.controlRecovery.duration);
  while (g.state.time < immuneUntil - .11) {
    raider.abilityCooldown = 0; g.update(.1);
    assert.equal(victim.rootUntil, firstEnd, 'Repeated applications do not extend an existing root');
  }
  assert.ok(victim.attacks > attacks, 'Root is distinct from stun');
  while (g.state.time < immuneUntil + 1.5 && victim.rootUntil === firstEnd) { raider.abilityCooldown = 0; g.update(.1); }
  assert.ok(victim.rootUntil > firstEnd, 'Control can apply again after recovery');
});

test('strong poison and slow expire on their own clocks even when weaker sources land later', () => {
  const poisonGame = arena(['wyvern', 'headhunter'], ['footman']);
  const [strong, weak, victim] = poisonGame.state.units;
  strong.z = -1; weak.z = 1; strong.x = weak.x = -4; victim.x = 1;
  strong.attackSpeed = weak.attackSpeed = 100; ready(strong); weak.cooldown = weak.nextAttackAt = 2;
  victim.hp = victim.maxHp = 10000;
  advance(poisonGame, 1);
  assert.equal(victim.poison, 9);
  const strongExpiry = victim.poisons.find(p => p.sourceId === strong.id).expiresAt;
  advance(poisonGame, 2);
  assert.equal(victim.poisons.length, 2);
  assert.equal(victim.poisons.find(p => p.sourceId === strong.id).expiresAt, strongExpiry);
  assert.equal(victim.poison, 9, 'Poison uses strongest DPS, not a sum');
  poisonGame.update(strongExpiry - poisonGame.state.time + .1);
  assert.equal(victim.poison, 5, 'Weak poison persists only for its own remaining duration');

  const slowGame = arena(['cryptfiend', 'frostwyrm'], ['gryphon']);
  const [web, frost, flyer] = slowGame.state.units;
  web.z = -1; frost.z = 1; web.x = frost.x = -4; flyer.x = 1;
  web.attackSpeed = frost.attackSpeed = 100; ready(web); frost.cooldown = frost.nextAttackAt = 1.5;
  advance(slowGame, 1);
  assert.equal(flyer.slowAmount, .6);
  const webExpiry = flyer.slows.find(s => s.sourceId === web.id).expiresAt;
  advance(slowGame, 1.5);
  assert.equal(flyer.slows.length, 2);
  assert.equal(flyer.slows.find(s => s.sourceId === web.id).expiresAt, webExpiry);
  slowGame.update(webExpiry - slowGame.state.time + .1);
  assert.equal(flyer.slowAmount, .35);
});

test('Stormcaller armor break applies only to heavy armor and expires without mutating base armor', () => {
  for (const targetId of ['footman', 'archer']) {
    const g = arena(['shaman'], [targetId]);
    const [shaman, target] = g.state.units;
    shaman.x = -4; target.x = 1; ready(shaman); shaman.attackSpeed = 100;
    const baseArmor = target.armor;
    advance(g, 1);
    assert.equal(target.armorBreak, targetId === 'footman' ? 3 : 0);
    assert.equal(target.armor, baseArmor);
    advance(g, 5);
    assert.equal(target.armorBreak, 0);
    assert.equal(target.armor, baseArmor);
  }
});

test('charge needs four meters of actual movement and stationary pikes or Bone Sentinels brace it', () => {
  const strike = (targetId, distance) => {
    const g = arena(['knight'], [targetId]);
    const [knight, target] = g.state.units;
    knight.x = -distance; target.x = 0; knight.speed = 3.4; knight.damage = 40;
    target.hp = target.maxHp = 10000; target.armor = 0;
    ready(knight);
    while (knight.attacks === 0 && g.state.time < 8) g.update(.1);
    return { knight, target, damage: 10000 - target.hp };
  };
  const adjacent = strike('grunt', 2), running = strike('grunt', 8);
  assert.ok(adjacent.knight.chargeDistance < 4);
  assert.ok(running.knight.chargeDistance >= 4);
  assert.ok(running.damage > adjacent.damage * 1.8);
  assert.ok(running.target.stunTime > 0);
  for (const target of ['spearman', 'skeleton']) {
    const braced = strike(target, 8);
    assert.ok(braced.knight.chargeDistance >= 4);
    assert.equal(braced.target.stunTime, 0, `${target} prevents charge stun`);
    assert.ok(braced.damage < running.damage, `${target} reduces charge damage`);
  }
});

test('ground-only stomp, plague, cleave and siege splash cannot hit airborne bystanders', () => {
  for (const attackerId of ['tauren', 'abomination', 'ironmaw', 'demolisher']) {
    const g = arena([attackerId], ['footman', 'gryphon']);
    const [attacker, ground, flying] = g.state.units;
    flying.x = ground.x; flying.z = 1;
    attacker.damage = 50; attacker.abilityCooldown = 0; ready(attacker);
    const hp = flying.hp;
    advance(g, 1.5);
    assert.equal(flying.hp, hp, `${attackerId} respects ground-only targeting`);
    assert.equal(flying.stunTime, 0);
    assert.ok(ground.hp < ground.maxHp);
  }
});

test('gameplay projectiles are independent of the 160-effect presentation limit', () => {
  const g = arena(['archer'], ['grunt']);
  const [archer, victim] = g.state.units;
  archer.x = -5; victim.x = 5; archer.damage = 32; ready(archer);
  advance(g, .4);
  assert.equal(g.state.projectiles.length, 1);
  g.state.effects = [];
  advance(g, .8);
  assert.ok(victim.hp < victim.maxHp, 'Removing visual effects cannot discard a pending hit');
});

test('fresh attackers account for already-reserved damage in the same tick instead of all overkilling one victim', () => {
  const g = arena(['archer', 'archer'], ['grunt', 'grunt']);
  const [first, second, doomed, healthy] = g.state.units;
  first.x = second.x = -5; first.z = -1; second.z = 1;
  doomed.x = healthy.x = 3; doomed.z = 0; healthy.z = 2;
  doomed.hp = 5; healthy.hp = healthy.maxHp = 1000;
  first.damage = second.damage = 100; ready(first); ready(second);
  g.update(.1);
  const targets = g.state.pendingAttacks.filter(a => a.team === 'player').map(a => a.targetId);
  assert.equal(targets.length, 2);
  assert.equal(new Set(targets).size, 2, 'The second arrow chooses a victim that still needs damage');
});

test('a defender must hold its brace and face the charge to cancel the bonus', () => {
  const hit = (held, forward) => {
    const g = arena(['knight'], ['spearman']);
    const [knight, pike] = g.state.units;
    knight.damage = 40; knight.chargeDistance = 4; ready(knight);
    pike.hp = pike.maxHp = 1000;
    g.update(.1);
    const release = knight.attackPose.releaseAt;
    g.update(release - g.state.time - .1);
    pike.stationaryTime = held ? 1 : 0;
    pike.heading = forward ? -Math.PI / 2 : Math.PI / 2;
    g.update(.1);
    return { damage: 1000 - pike.hp, stunned: pike.stunTime > 0 };
  };
  const prepared = hit(true, true), unprepared = hit(false, true), flanked = hit(true, false);
  assert.equal(prepared.stunned, false);
  assert.equal(unprepared.stunned, true);
  assert.equal(flanked.stunned, true);
  assert.ok(Math.abs(unprepared.damage / prepared.damage - 1.9) < .001, 'Bracing preserves the normal hit and cancels exactly its charge bonus');
});

test('telemetry records actual damage, effective healing and absorbed shields, then expires after 25 seconds', () => {
  const g = arena(['priest', 'footman'], ['grunt']);
  const [priest, ally, enemy] = g.state.units;
  priest.x = -5; ally.x = -1; enemy.x = 1; ally.hp -= 40;
  priest.abilityCooldown = 0; enemy.damage = 20; ready(enemy);
  g.state.gold = 1000;
  assert.ok(g.cast('rally', ally.x, ally.z).ok);
  advance(g, .4);
  assert.ok(g.state.telemetry.summary.player.healing > 0);
  assert.ok(g.state.telemetry.summary.player.healing <= 40, 'Overheal is excluded');
  assert.ok(g.state.telemetry.summary.player.shielding > 0);
  enemy.cooldown = 100; enemy.nextAttackAt = g.state.time + 100; priest.abilityCooldown = 100;
  advance(g, 26);
  assert.deepEqual(g.state.telemetry.summary.player, { damage: 0, healing: 0, shielding: 0, leadingThreat: null });
});

test('Starfall spends at cast but resolves the current area occupants only after its 1.4-second descent', () => {
  const g = arena(['footman'], ['grunt', 'headhunter', 'raider']);
  const [ally, stays, escapes, enters] = g.state.units;
  ally.x = -8; stays.x = escapes.x = 0; stays.z = -2; escapes.z = 2; enters.x = 12;
  const hp = new Map(g.state.units.map(u => [u.id, u.hp]));
  assert.ok(g.cast('meteor', 0, 0).ok);
  assert.equal(g.state.gold, 215);
  assert.equal(g.state.spellCooldowns.meteor, 45);
  assert.equal(stays.hp, hp.get(stays.id));
  advance(g, .6);
  escapes.x = 12; enters.x = 0; enters.z = 2;
  advance(g, .7);
  assert.equal(stays.hp, hp.get(stays.id));
  g.update(.1);
  assert.ok(stays.hp < hp.get(stays.id));
  assert.ok(enters.hp < hp.get(enters.id), 'New arrivals are hit at the actual landing time');
  assert.equal(escapes.hp, hp.get(escapes.id), 'Units that leave the marked area escape');
  assert.ok(g.state.effects.some(e => e.semanticKind === 'meteor' && e.phase === 'impact'));
});

test('siege shots detonate at their committed ground point even when their original victim dies or moves away', () => {
  for (const mode of ['dies', 'moves']) {
    const g = arena(['ballista'], ['grunt', 'headhunter']);
    const [siege, original, bystander] = g.state.units;
    siege.x = -10; original.x = 0; bystander.x = 1.8; bystander.z = 0;
    siege.damage = 100; ready(siege);
    advance(g, .7);
    const shot = g.state.projectiles.find(a => a.kind === 'siege');
    assert.ok(shot);
    const committed = { x: shot.tx, z: shot.tz };
    if (mode === 'dies') original.hp = 0; else original.x = 12;
    const hp = bystander.hp, originalHp = original.hp;
    g.update(shot.impactAt - g.state.time);
    assert.ok(bystander.hp < hp, 'Splash still reaches the ground point');
    assert.equal(original.hp, originalHp, 'The shot does not chase a fleeing victim');
    const impact = g.state.effects.find(e => e.semanticKind === 'siege' && e.phase === 'impact');
    assert.equal(impact.x, committed.x); assert.equal(impact.z, committed.z);
  }
});

test('Normal and Hard opponents spend their real treasury on declared answers to air and heavy-armored investment', () => {
  const choice = (threat, difficulty) => {
    const g = createGame({ faction: 'horde', seed: 1, difficulty });
    const s = g.state;
    s.enemyFaction = 'alliance';
    const roster = ids => ids.map((unitId, i) => ({ id: `r${s.nextId++}`, unitId, row: i % 6, col: Math.floor(i / 6) }));
    s.roster = roster(Array(4).fill(threat));
    s.supply = s.roster.reduce((sum, r) => sum + UNIT_MAP[r.unitId].supply, 0);
    s.enemyRoster = roster(['footman', 'footman', 'footman', 'priest', 'paladin']);
    s.enemy.tier = 3; s.enemy.research.tier = 2; s.enemy.supplyCap = 72; s.enemy.research.barracks = 4;
    s.enemy.gold = 10000; s.aiTimer = 0;
    const count = s.enemyRoster.length;
    g.start(); g.update(.1);
    assert.equal(s.enemyRoster.length, count + 1);
    const bought = UNIT_MAP[s.enemyRoster.at(-1).unitId];
    assert.equal(s.enemy.gold, 10000 - bought.cost);
    return bought;
  };
  for (const difficulty of ['normal', 'hard']) {
    const airAnswer = choice('wyvern', difficulty);
    assert.ok(airAnswer.canHitAir && airAnswer.counters.some(c => c.threat === 'air'));
    const armorAnswer = choice('tauren', difficulty);
    assert.ok(armorAnswer.counters.some(c => c.threat === 'armorHeavy'));
  }
});

test('counter need weights invested gold and saturates only when the army has already paid for appropriate coverage', () => {
  const units = ids => ids.map(id => UNIT_MAP[id]);
  const mixed = units(['grunt', 'grunt', 'wyvern']);
  assert.ok(counterNeed(UNIT_MAP.archer, mixed, []) > counterNeed(UNIT_MAP.mage, mixed, []), 'One expensive flyer matters more than two cheap heavy troops');
  const air = units(['wyvern']);
  const uncovered = counterNeed(UNIT_MAP.archer, air, []);
  assert.equal(counterNeed(UNIT_MAP.archer, air, units(Array(8).fill('footman'))), uncovered, 'Ground-only investment does not satisfy anti-air needs');
  assert.ok(counterNeed(UNIT_MAP.archer, air, units(Array(8).fill('spearman'))) < uncovered / 3, 'Other paid anti-air choices also reduce the need for more archers');
  const heavy = units(['tauren']);
  const armoredNeed = counterNeed(UNIT_MAP.mage, heavy, []);
  assert.equal(counterNeed(UNIT_MAP.mage, heavy, units(Array(8).fill('archer'))), armoredNeed);
  assert.ok(counterNeed(UNIT_MAP.mage, heavy, units(Array(4).fill('mage'))) < armoredNeed / 3);
  const cavalier = units(['knight']), raider = units(['raider']);
  for (const defender of [UNIT_MAP.spearman, UNIT_MAP.skeleton]) {
    assert.ok(counterNeed(defender, cavalier, []) >= 1, `${defender.id} retains its declared anti-cavalry credit against heavy riders`);
    assert.equal(counterNeed(defender, cavalier, []), counterNeed(defender, raider, []));
  }
  assert.ok(counterNeed(UNIT_MAP.mage, cavalier, []) >= 1, 'Armor-breaking remains a valid alternative against a heavy rider');
});

test('hero group healing emits bounded links to allies who actually recovered health', () => {
  for (const [hero, ally, enemy] of [['paladin', 'footman', 'grunt'], ['deathknight', 'skeleton', 'grunt']]) {
    const g = arena([hero, ally], [enemy]);
    const [caster, recipient] = g.state.units;
    recipient.z = 2; recipient.hp -= 100; caster.abilityCooldown = 0;
    g.update(.1);
    assert.ok(g.state.effects.some(e => e.semanticKind === 'heal' && e.sourceId === caster.id && e.targetId === recipient.id));
    assert.equal(g.state.effects.some(e => e.semanticKind === 'heal' && e.sourceId === recipient.id), false, 'Passive regeneration does not spam healer links');
  }
});
