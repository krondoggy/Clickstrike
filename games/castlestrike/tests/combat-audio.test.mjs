import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, restoreGame } from '../src/engine.js';
import { UNIT_MAP } from '../src/data.js';

const start = (options = {}) => {
  const game = createGame(options);
  game.start();
  game.state.enemy.gold = 0;
  game.state.aiTimer = 6;
  return game;
};
const place = (unit, x = 0, z = 0) => Object.assign(unit, { x, z, speed: 0, cooldown: 20, abilityCooldown: 20 });

test('lethal damage emits each unit death once with its identity and battlefield position', () => {
  const game = start({ seed: 0 });
  const enemy = game.state.units.find(unit => unit.team === 'enemy');
  game.state.units = [enemy];
  place(enemy, 3, -2);
  enemy.hp = 1;
  assert.ok(game.cast('meteor', 3, -2).ok);
  assert.deepEqual(game.drainAudioEvents(), [], 'The descent cannot emit a premature death');
  game.update(1.4);
  const [event, ...rest] = game.drainAudioEvents();
  assert.equal(rest.length, 0);
  assert.equal(event.kind, 'death');
  assert.equal(event.time, game.state.time);
  assert.equal(event.sourceId, enemy.id);
  assert.equal(typeof event.id, 'string');
  for (const key of ['unitId', 'team', 'x', 'z']) assert.equal(event[key], enemy[key]);
  for (const key of ['faction', 'role', 'armorType', 'hero']) assert.equal(event[key], UNIT_MAP[enemy.unitId][key]);
  assert.equal(game.state.stats.kills, 1);
  assert.deepEqual(game.drainAudioEvents(), [], 'Events are consumed once');
  game.update(.3);
  assert.deepEqual(game.drainAudioEvents(), [], 'Removing a dead unit cannot emit a second death');
});

test('resurrection is silent until the skeleton actually dies', () => {
  const game = start({ seed: 1 });
  const skeleton = game.state.units.find(unit => unit.team === 'enemy' && unit.unitId === 'skeleton');
  assert.ok(skeleton);
  game.state.units = [skeleton];
  place(skeleton);
  skeleton.hp = 1;
  game.cast('meteor', 0, 0);
  game.update(1.4);
  assert.ok(skeleton.hp > 0 && skeleton.resurrected);
  assert.deepEqual(game.drainAudioEvents(), [], 'Reassembling is not a death');
  assert.equal(game.state.stats.kills, 0);
  skeleton.hp = 1;
  game.state.spellCooldowns.meteor = 0;
  game.cast('meteor', 0, 0);
  game.update(1.4);
  assert.equal(skeleton.hp, 0);
  assert.equal(game.drainAudioEvents().filter(event => event.kind === 'death').length, 1);
  assert.equal(game.state.stats.kills, 1);
});

test('poison deaths survive multiple simulation steps and are never replayed from a save', () => {
  const game = start({ seed: 0 });
  const enemies = game.state.units.filter(unit => unit.team === 'enemy');
  game.state.units = enemies;
  enemies.forEach((unit, index) => {
    place(unit, index * 3, 0);
    Object.assign(unit, { hp: 1, poisons: [{ sourceId: 'poison-source', unitId: 'archer', team: 'player', amount: 1000, expiresAt: game.state.time + 1 }] });
  });
  game.setSpeed(3);
  game.update(.3);
  assert.equal(game.state.units.length, 0);
  const restored = restoreGame(game.serialize());
  assert.deepEqual(restored.drainAudioEvents(), [], 'Historical deaths are not saved as pending sounds');
  const events = game.drainAudioEvents();
  assert.equal(events.length, enemies.length, 'All deaths remain queued after the render frame would have passed');
  assert.ok(events.every(event => event.kind === 'death'));
});

test('summoned expiration makes a death sound without granting a kill', () => {
  const game = start({ faction: 'undead' });
  const skeleton = game.state.units.find(unit => unit.unitId === 'skeleton');
  game.state.units = [skeleton];
  place(skeleton);
  Object.assign(skeleton, { summonedBy: 'test-summoner', age: 21.99, lifespan: 22 });
  game.update(.1);
  const events = game.drainAudioEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'death');
  assert.equal(events[0].summoned, true);
  assert.equal(game.state.stats.kills + game.state.stats.losses, 0);
});

test('a destroyed tower queues one collapse and suppresses its duplicate generic explosion sound', () => {
  const game = start();
  game.state.units = [];
  const tower = game.state.structures.find(structure => structure.id === 'enemy-tower--7');
  tower.hp = 1;
  game.cast('meteor', tower.x, tower.z);
  game.update(1.4);
  const events = game.drainAudioEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'collapse');
  assert.equal(events[0].x, tower.x);
  assert.equal(events[0].z, tower.z);
  assert.equal(game.state.effects.find(effect => effect.type === 'explosion').sound, null);
  game.update(.3);
  assert.deepEqual(game.drainAudioEvents(), []);
});

test('siege launches carry their own sound and the firing unit identity', () => {
  const game = createGame();
  game.state.gold = 20000;
  game.research('tier'); game.research('tier'); game.recruit('ballista'); game.start();
  const ballista = game.state.units.find(unit => unit.unitId === 'ballista');
  const enemy = game.state.units.find(unit => unit.team === 'enemy');
  game.state.units = [ballista, enemy];
  place(ballista, -7, 0); place(enemy, 3, 0);
  ballista.cooldown = 0;
  game.update(.1);
  assert.equal(game.state.effects.some(effect => effect.sound === 'siege'), false, 'Windup is silent until launch');
  game.update(ballista.attackPose.releaseAt - game.state.time);
  const launch = game.state.effects.find(effect => effect.sound === 'siege');
  assert.ok(launch, 'Siege fire is distinguishable from an arrow');
  assert.equal(launch.sourceUnitId, 'ballista');
  assert.equal(launch.targetUnitId, enemy.unitId);
});

test('an unconsumed death queue stays bounded during a long battle', () => {
  const game = start({ seed: 0 });
  const template = game.state.units.find(unit => unit.team === 'enemy');
  game.state.gold = 20000;
  for (let batch = 0; batch < 10; batch++) {
    game.state.units = Array.from({ length: 30 }, (_, index) => ({ ...template, id: `audio-${batch}-${index}`, x: index % 6 - 2.5, z: Math.floor(index / 6) - 2, hp: 1, speed: 0, cooldown: 20, abilityCooldown: 20 }));
    game.state.spellCooldowns.meteor = 0;
    game.cast('meteor', 0, 0);
    game.update(1.4);
  }
  const events = game.drainAudioEvents();
  assert.equal(game.state.stats.kills, 300);
  assert.ok(events.length > 0 && events.length <= 256, 'Pending audio has a fixed memory budget');
  assert.deepEqual(game.drainAudioEvents(), []);
});
