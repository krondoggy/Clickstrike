import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, restoreGame } from '../src/engine.js';

function flightFixture() {
  const g = createGame({ seed: 42 });
  g.start();
  const archer = g.state.units.find(u => u.unitId === 'archer');
  const grunt = g.state.units.find(u => u.unitId === 'grunt');
  g.state.units = [archer, grunt];
  for (const u of g.state.units) Object.assign(u, { x: u.team === 'player' ? -5 : 5, z: 0, rootUntil: 100, rootTime: 100, controlRecoveryUntil: 102, abilityCooldown: 100, nextAttackAt: 100, cooldown: 100 });
  archer.nextAttackAt = archer.cooldown = 0;
  grunt.damage = 0;
  g.state.aiTimer = 6;
  return g;
}

test('v3 windup and in-flight saves restore exact queues, poses, HP and subsequent impacts', () => {
  for (const elapsed of [.1, .4]) {
    const g = flightFixture();
    g.update(elapsed);
    assert.ok(elapsed === .1 ? g.state.pendingAttacks.length > 0 : g.state.projectiles.length > 0);
    const saved = g.serialize();
    const restored = restoreGame(saved);
    assert.equal(restored.serialize(), saved, 'Loading cannot reschedule an attack or reroll its animation');
    for (let i = 0; i < 35; i++) {
      g.update(.1); restored.update(.1);
      assert.deepEqual(restored.state, g.state, `Restored combat stays identical through tick ${i}`);
    }
  }
});

test('repeated save/load during a flight cannot duplicate or erase the arriving damage', () => {
  const reference = flightFixture();
  reference.update(.4);
  let reloaded = restoreGame(reference.serialize());
  for (let i = 0; i < 8; i++) {
    reference.update(.1);
    reloaded.update(.1);
    reloaded = restoreGame(reloaded.serialize());
  }
  assert.deepEqual(reloaded.state, reference.state);
  assert.ok(reference.state.telemetry.summary.player.damage > 0);
});

test('v2 migration preserves treasuries, permanent armies, research, deployed HP and status durations', () => {
  const g = flightFixture();
  g.research('mines');
  g.update(.4);
  const legacy = JSON.parse(g.serialize());
  legacy.version = 2;
  delete legacy.pendingAttacks; delete legacy.projectiles; delete legacy.telemetry;
  legacy.gold = 812.345; legacy.enemy.gold = 417.25;
  const victim = legacy.units[1];
  victim.hp -= 51; victim.poison = 9; victim.poisonTime = 4.3; victim.poisonTeam = 'player'; victim.slowAmount = .35; victim.slowTime = 2.4;
  const preserved = { gold: legacy.gold, enemyGold: legacy.enemy.gold, roster: structuredClone(legacy.roster), enemyRoster: structuredClone(legacy.enemyRoster), research: structuredClone(legacy.research), hp: legacy.units.map(u => u.hp), structures: legacy.structures.map(s => s.hp) };
  const restored = restoreGame(legacy);
  assert.equal(restored.state.version, 3);
  assert.deepEqual({ gold: restored.state.gold, enemyGold: restored.state.enemy.gold, roster: restored.state.roster, enemyRoster: restored.state.enemyRoster, research: restored.state.research, hp: restored.state.units.map(u => u.hp), structures: restored.state.structures.map(s => s.hp) }, preserved);
  assert.deepEqual(restored.state.pendingAttacks, [], 'Legacy attacks already damaged HP and must not be replayed');
  assert.deepEqual(restored.state.projectiles, []);
  const migratedVictim = restored.state.units[1];
  assert.equal(migratedVictim.poisons[0].amount, 9);
  assert.equal(migratedVictim.poisons[0].expiresAt, legacy.time + 4.3);
  assert.equal(migratedVictim.slows[0].expiresAt, legacy.time + 2.4);
  assert.equal(restoreGame(restored.serialize()).serialize(), restored.serialize(), 'Migrated campaigns are valid v3 saves');
});

test('v3 rejects corrupt attack schedules, control instances and telemetry instead of creating hidden hits', () => {
  const g = flightFixture(); g.update(.4);
  const corruptions = [
    s => { s.projectiles[0].impactAt = NaN; },
    s => { s.projectiles[0].impactAt = 0; },
    s => { s.projectiles[0].damage = -1; },
    s => { s.projectiles[0].unitId = '__proto__'; },
    s => { s.pendingAttacks = null; },
    s => { s.units[0].attackPose.releaseAt = -1; },
    s => { s.units[0].rootUntil = Infinity; },
    s => { s.units[0].slows.push({ sourceId: 'u2', unitId: 'shaman', team: 'enemy', amount: 5, expiresAt: 3 }); },
    s => { s.telemetry.summary.player.damage = 1000; },
    s => { s.projectiles.push(structuredClone(s.projectiles[0])); },
  ];
  for (const corrupt of corruptions) {
    const saved = JSON.parse(g.serialize()); corrupt(saved);
    assert.throws(() => restoreGame(saved));
  }
});

test('pausing or changing display speed cannot advance a windup or projectile', () => {
  const g = flightFixture(); g.update(.4); g.togglePause();
  const frozen = g.serialize();
  g.update(60);
  assert.equal(g.serialize(), frozen);
  g.setSpeed(3);
  const projectileTime = g.state.projectiles[0].impactAt;
  g.update(60);
  assert.equal(g.state.projectiles[0].impactAt, projectileTime);
  g.togglePause();
  g.update(.1);
  assert.equal(g.state.time, .5, 'The display layer applies speed; the simulation consumes exact elapsed seconds');
});

test('commander Starfall survives save/load and the death of every deployed caster while preserving structure damage', () => {
  const g = createGame(); g.start();
  const castle = g.state.structures.find(s => s.id === 'enemy-castle');
  assert.ok(g.cast('meteor', castle.x, castle.z).ok);
  g.update(.6);
  g.state.units = [];
  const restored = restoreGame(g.serialize());
  assert.equal(restored.state.projectiles[0].sourceId, 'player-commander');
  assert.equal(restored.state.projectiles[0].sourceKind, 'commander');
  assert.equal(restored.state.projectiles[0].unitId, null);
  g.update(.7); restored.update(.7);
  assert.equal(castle.hp, castle.maxHp);
  g.update(.1); restored.update(.1);
  assert.ok(castle.hp < castle.maxHp);
  assert.equal(g.state.telemetry.summary.player.leadingThreat.unitId, null, 'Commander damage has no fabricated unit identity');
  assert.equal(restoreGame(g.serialize()).serialize(), g.serialize(), 'A commander leading the damage report remains a valid save');
  assert.ok(Math.abs(castle.maxHp - castle.hp - 75 * .7 / (1 + 5 * .055)) < .00001);
  assert.deepEqual(restored.state, g.state);
});

test('a sustained 180-unit battle fits comfortably below a 5 MiB UTF-16 storage budget without dropping report events', t => {
  const g = createGame({ faction: 'undead', seed: 42 }), s = g.state;
  s.enemyFaction = 'alliance';
  const own = [...Array(10).fill('ghoul'), ...Array(10).fill('skeleton'), ...Array(6).fill('cryptfiend'), ...Array(4).fill('necromancer')];
  const foe = [...Array(10).fill('footman'), ...Array(10).fill('archer'), ...Array(6).fill('priest'), ...Array(4).fill('mage')];
  const roster = ids => ids.map((unitId, i) => ({ id: `r${s.nextId++}`, unitId, row: i % 6, col: Math.floor(i / 6) }));
  s.roster = roster(own); s.enemyRoster = roster(foe); s.supply = 70;
  for (const wallet of [s, s.enemy]) { wallet.tier = 3; wallet.research.tier = 2; wallet.supplyCap = 72; wallet.research.barracks = 4; }
  g.start();
  const firstWave = [...s.units]; s.units = [];
  for (const team of ['player', 'enemy']) {
    const templates = firstWave.filter(u => u.team === team);
    for (let i = 0; i < 90; i++) {
      const unit = structuredClone(templates[i % templates.length]);
      unit.id = `u${s.nextId++}`; unit.x = (team === 'player' ? -1 : 1) * (4 + Math.floor(i / 10) * 1.05); unit.z = (i % 10 - 4.5) * 1.05;
      // Keep every undead body wounded throughout the entire reporting window,
      // while actual targeting, weapons, healing and regeneration keep running.
      unit.hp = 5000; unit.maxHp = 10000; s.units.push(unit);
    }
  }
  s.stats.peakUnits = 180;
  for (let second = 0; second < 30; second++) g.update(1);
  assert.equal(s.units.length, 180);
  assert.ok(s.telemetry.events.length > 22500, 'A full window includes 90 regenerating units plus actual combat');
  assert.ok(JSON.stringify(s).length * 2 > 5 * 1024 * 1024, 'The fixture reproduces the former object-JSON storage overflow');
  const encoded = g.serialize();
  t.diagnostic(`${s.units.length} units, ${s.telemetry.events.length} events: ${JSON.stringify(s).length * 2} raw UTF-16 bytes -> ${encoded.length * 2} packed bytes.`);
  assert.ok(encoded.length * 2 < 2 * 1024 * 1024, `The lossless save leaves ample quota headroom (${encoded.length * 2} UTF-16 bytes)`);
  assert.equal(JSON.parse(encoded).telemetry.events.count, s.telemetry.events.length, 'Every original report record is retained');
  const restored = restoreGame(encoded);
  assert.deepEqual(restored.state, s, 'Float64 amounts, attribution and all timestamps are preserved exactly');
  assert.equal(restored.serialize(), encoded);
  g.update(2); restored.update(2);
  assert.deepEqual(restored.state, s, 'Records expire at the same 25-second boundaries after loading');
});

test('compact telemetry rejects corrupt binary tables and remains compatible with plain v3 report arrays', () => {
  const g = flightFixture(); g.update(1);
  const plain = JSON.stringify(g.state);
  assert.deepEqual(restoreGame(plain).state, g.state, 'Earlier v3 saves with object events still load');
  const encoded = g.serialize();
  assert.equal(JSON.parse(encoded).telemetry.events.format, 'packed-v1');
  for (const corrupt of [
    packed => { packed.count++; },
    packed => { packed.rows = packed.rows.slice(4); },
    packed => { packed.sources[0][1] = '__proto__'; },
    packed => { packed.times[0] = -1; },
    packed => { packed.count = 100001; },
    packed => {
      const bytes = Uint8Array.from(atob(packed.rows), c => c.charCodeAt(0));
      new DataView(bytes.buffer).setUint16(3, 65535, true);
      packed.rows = btoa(String.fromCharCode(...bytes));
    },
  ]) {
    const saved = JSON.parse(encoded); corrupt(saved.telemetry.events);
    assert.throws(() => restoreGame(saved));
  }
});
