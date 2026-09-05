import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chrome' }), args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', error => errors.push(error.message));
await mkdir('test-results', { recursive: true });
try {
  await page.goto(`${base}/games/castlestrike/`);
  await page.waitForFunction(() => window.castleStrike?.state.version === 3 && castleStrike.battlefield.renderer);
  const evidence = await page.evaluate(async () => {
    const THREE = await import('/games/castlestrike/vendor/three.module.js');
    const { createGame } = await import('/games/castlestrike/src/engine.js');
    const { UNIT_MAP } = await import('/games/castlestrike/src/data.js');
    const field = castleStrike.battlefield, g = createGame({ faction: 'alliance', seed: 19 }); g.start();
    const state = g.state; state.units = [state.units[0]]; state.effects = [];
    const u = state.units[0]; u.x = -12; u.z = 0; u.action = 'walk'; u.speed = 3;
    field.render(state, 0);
    const samples = [], matrix = new THREE.Matrix4();
    for (let frame = 0; frame < 48; frame++) {
      state.accumulator += 1 / 60;
      while (state.accumulator + 1e-8 >= .1) { state.accumulator -= .1; state.time += .1; u.x += .3; }
      state.accumulator = Math.max(0, state.accumulator); field.render(state, 1 / 60);
      const model = field.units.get(u.id); field.teamRings.getMatrixAt(0, matrix); const ringX = matrix.elements[12];
      field.barBack.getMatrixAt(0, matrix);
      samples.push({ sim: u.x, render: model.position.x, ring: ringX, health: matrix.elements[12], leg: model.userData.limbs.legL.rotation.x });
    }
    state.time = .9; state.accumulator = 0; u.action = 'attack';
    u.attackPose = { id: 'pose-fixture', targetId: 'victim-fixture', kind: 'melee', startedAt: .9, releaseAt: 1.2, recoveryAt: 1.65 };
    const victim = { ...structuredClone(u), id: 'victim-fixture', x: u.x + 2, team: 'enemy', attackPose: null, action: 'idle', hp: 390, maxHp: 390 };
    state.units.push(victim); field.render(state, 0);
    const attack = [], contact = []; let impactAdded = false, pauseUnchanged = true;
    for (let frame = 0; frame < 60; frame++) {
      state.accumulator += 1 / 60;
      while (state.accumulator + 1e-8 >= .1) {
        state.accumulator -= .1; state.time += .1;
        if (!impactAdded && state.time + 1e-8 >= 1.2) {
          impactAdded = true; u.attacks++; victim.hp = 350;
          state.effects.push({ id: 'melee-contact', type: 'slash', semanticKind: 'melee', phase: 'impact', sourceId: u.id, targetId: victim.id, unitId: u.unitId, x: victim.x, z: 0, tx: victim.x, tz: 0, startedAt: 1.2, releaseAt: 1.2, impactAt: 1.2, life: .25, maxLife: .25, team: 'player' });
        }
        state.effects = state.effects.filter(effect => (effect.life = effect.maxLife - (state.time - effect.startedAt)) > 0);
        if (state.time >= 1.65) u.attackPose = null;
      }
      state.accumulator = Math.max(0, state.accumulator); field.render(state, 1 / 60);
      const model = field.units.get(u.id), renderedVictim = field.units.get(victim.id)?.userData.unit;
      attack.push({ time: field.time, arm: model.userData.limbs.armR.rotation.x, progress: model.userData.unit.motion.attack });
      contact.push({ time: field.time, hp: renderedVictim?.hp, impact: field.effects.has('melee-contact') });
      if (frame === 9) {
        state.paused = true; const before = model.children.map(limb => limb.matrix.toArray()), time = field.time;
        for (let repeat = 0; repeat < 12; repeat++) field.render(state, 0);
        pauseUnchanged = JSON.stringify(before) === JSON.stringify(model.children.map(limb => limb.matrix.toArray())) && time === field.time;
        state.paused = false;
      }
    }
    field.selected = u.id; field.render(state, 0);
    const object = field.units.get(u.id), point = new THREE.Vector3(object.position.x, 1.5, object.position.z).project(field.camera), rect = field.canvas.getBoundingClientRect();
    field._setRay({ clientX: rect.left + (point.x + 1) * rect.width / 2, clientY: rect.top + (1 - point.y) * rect.height / 2 });
    const pickHits = field.raycaster.intersectObjects(field.unitGroup.children, true).length;

    const ranged = [];
    for (const { moving, flyer } of [{ moving: false, flyer: false }, { moving: true, flyer: false }, { moving: false, flyer: true }]) {
      const battle = createGame({ seed: 42 }); battle.start(); const s = battle.state;
      const archer = s.units.find(unit => unit.team === 'player' && unit.unitId === 'archer'), target = s.units.find(unit => unit.team === 'enemy');
      if (flyer) Object.assign(target, UNIT_MAP.gryphon, { id: target.id, unitId: 'gryphon' });
      Object.assign(archer, { x: -7, z: 0, nextAttackAt: 0, cooldown: 0, targetId: null });
      Object.assign(target, { x: 1, z: 0, hp: 1500, maxHp: 1500, nextAttackAt: 1000, cooldown: 1000, stunTime: moving ? 0 : 1000, stunUntil: moving ? 0 : 1000, controlRecoveryUntil: moving ? 0 : 1002, speed: moving ? 2.3 : 0 });
      s.units = [archer, target]; s.nextWave = 1000; s.aiTimer = 1000; field.render(s, 0);
      const frames = [];
      for (let frame = 0; frame < 105; frame++) {
        battle.update(1 / 60); field.render(s, 1 / 60);
        const visibleTarget = field.units.get(target.id)?.userData.unit;
        const shots = field.renderedState.effects.filter(effect => effect.phase === 'release' && effect.sourceId === archer.id);
        frames.push({ time: field.time, hp: visibleTarget?.hp, targetX: visibleTarget?.x, targetZ: visibleTarget?.z,
          shots: shots.map(effect => { const mesh = field.effects.get(effect.id), progress = 1 - effect.life / effect.maxLife; return { id: effect.id, progress, x: mesh?.position.x, y: mesh?.position.y, z: mesh?.position.z, endpointX: progress > .01 ? effect.x + (mesh.position.x - effect.x) / progress : null, endpointZ: progress > .01 ? effect.z + (mesh.position.z - effect.z) / progress : null }; }),
          impacts: field.renderedState.effects.filter(effect => effect.phase === 'impact' && effect.sourceId === archer.id).map(effect => ({ time: effect.startedAt, x: effect.tx, z: effect.tz })),
        });
      }
      ranged.push({ moving, flyer, frames });
    }

    const tail = createGame(); tail.start(); const ts = tail.state; ts.units = [ts.units[0]];
    ts.time = 8; ts.units[0].x = 0; ts.units[0].z = 0; ts.units[0].shield = 50;
    field.render(ts, 0); field.statusMarkers.shields.getMatrixAt(0, matrix);
    const shieldY = matrix.elements[13], modelY = field.units.get(ts.units[0].id).position.y;
    const deadId = ts.units[0].id; ts.time = 8.1; ts.status = 'victory'; ts.units = []; field.render(ts, 1 / 60);
    const deaths = [];
    for (let frame = 0; frame < 100; frame++) { field.render(ts, 1 / 60); const model = field.units.get(deadId); deaths.push({ time: field.time, present: !!model, death: model?.userData.unit.motion.death }); }
    const siegeState = createGame().state; siegeState.status = 'playing'; siegeState.time = 12;
    const tower = siegeState.structures.find(structure => structure.team === 'enemy' && structure.kind === 'tower'); field.render(siegeState, 0);
    siegeState.time = 12.1; tower.hp = 0; field.render(siegeState, 0); const beforeCollapse = field.structures.get(tower.id).scale.y;
    siegeState.time = 12.2; field.render(siegeState, 0); const atCollapse = field.structures.get(tower.id).scale.y;
    const canceled = createGame(); canceled.start(); const cs = canceled.state; cs.units = [cs.units[0]]; cs.time = 14;
    cs.units[0].attackPose = { id: 'canceled', targetId: 'missing', startedAt: 14, releaseAt: 14.5, recoveryAt: 15, kind: 'melee' }; field.render(cs, 0);
    cs.time = 14.2; field.render(cs, 0); cs.time = 14.3; cs.status = 'victory'; cs.units[0].attackPose = null; field.render(cs, 1 / 60);
    let canceledAfterTime = true;
    for (let frame = 0; frame < 36; frame++) { field.render(cs, 1 / 60); if (field.time > 14.31) canceledAfterTime &&= !Number.isFinite(field.units.get(cs.units[0].id).userData.unit.motion.attack); }
    return { samples, attack, contact, pauseUnchanged, pickHits, ranged, deaths, shieldY, modelY, beforeCollapse, atCollapse, canceledAfterTime, fallback: !!field.fallback };
  });
  await writeFile('test-results/castle-strike-motion-v3.json', JSON.stringify(evidence, null, 2));
  assert.equal(evidence.fallback, false);
  const deltas = evidence.samples.slice(12).map((value, i) => value.render - evidence.samples[i + 11].render);
  assert.ok(deltas.every(delta => Math.abs(delta - .05) < 1e-6), 'Actual models advance every display frame');
  assert.ok(evidence.samples.every(value => Math.abs(value.render - value.ring) < 1e-5 && Math.abs(value.render - value.health) < 1e-5), 'Bars and rings track interpolation');
  const arm = evidence.attack.map(frame => frame.arm), strike = evidence.attack.reduce((best, frame) => frame.arm < best.arm ? frame : best);
  assert.ok(Math.max(...arm) > .35 && Math.min(...arm) < -1.5, 'Authoritative pose includes windup and strike');
  assert.ok(Math.abs(strike.time - 1.2) < .025, 'Weapon strike peaks on authoritative contact');
  assert.ok(evidence.contact.filter(frame => frame.time < 1.2 - 1e-8 && frame.hp !== undefined).every(frame => frame.hp === 390 && !frame.impact), 'No premature visible damage');
  const contact = evidence.contact.find(frame => frame.hp === 350);
  assert.ok(contact?.impact && Math.abs(contact.time - 1.2) < .025, 'Health loss and impact share the contact frame');
  assert.equal(evidence.pauseUnchanged, true); assert.ok(evidence.pickHits > 0);
  for (const run of evidence.ranged) {
    const firstHit = run.frames.find(frame => frame.hp < 1500);
    assert.ok(firstHit?.impacts.some(effect => Math.abs(effect.time - firstHit.time) < .025), 'Real projectile contact matches visible damage');
    const flight = run.frames.filter(frame => frame.shots.length);
    assert.ok(flight.length >= 20, 'Real ranged projectile has a continuous flight');
    if (run.moving) {
      const lateFlight = flight.filter(frame => frame.shots[0].progress > .7 && frame.shots[0].progress < 1);
      assert.ok(lateFlight.every(frame => Math.hypot(frame.shots[0].endpointX - frame.targetX, frame.shots[0].endpointZ - frame.targetZ) < .12), 'Projectile endpoint follows the original moving target');
    }
    if (run.flyer) assert.ok(flight.filter(frame => frame.shots[0].progress > .8).every(frame => frame.shots[0].y > 4.8), 'Arrows rise to a real flying target');
  }
  assert.ok(evidence.deaths.some(frame => frame.death > .25 && frame.death < .9), 'Casualty falls through intermediate poses');
  assert.equal(evidence.deaths.at(-1).present, false, 'Victory tail removes completed casualty');
  assert.ok(evidence.shieldY > .28, 'Shield arc is visible above the bridge surface');
  assert.equal(evidence.beforeCollapse, 1, 'Structure remains standing before its displayed damage tick');
  assert.ok(evidence.atCollapse < .2, 'Structure collapse shares its displayed damage tick');
  assert.equal(evidence.canceledAfterTime, true, 'Canceled pose does not resume during the terminal tail');

  await page.evaluate(async () => {
    const { UNITS } = await import('/games/castlestrike/src/data.js');
    const g = castleStrike.game, s = g.state, field = castleStrike.battlefield; g.start();
    const prototype = structuredClone(s.units[0]);
    s.units = ['alliance', 'horde'].flatMap((faction, teamIndex) => UNITS.filter(spec => spec.faction === faction).map((spec, index) => ({ ...structuredClone(prototype), ...spec, unitId: spec.id, id: `showcase-${teamIndex}-${index}`, team: teamIndex ? 'enemy' : 'player', maxHp: spec.hp, hp: spec.hp * .75, x: (teamIndex ? 1 : -1) * (2.5 + Math.floor(index / 3) * 2.4), z: (index % 3 - 1) * 3.2, heading: teamIndex ? -Math.PI / 2 : Math.PI / 2, nextAttackAt: 0, cooldown: 0, abilityCooldown: 0, targetId: null, attackPose: null })));
    s.nextId = 5000; s.aiTimer = 1000; s.nextWave = 1000; s.gold = 1000;
    field.width = 45; field.center.set(0, 0, 0); field.resize(); field.render(s, 0);
    for (let frame = 0; frame < 150; frame++) { g.update(1 / 60); field.render(s, 1 / 60); }
    g.cast('rally', -2, 0); g.cast('mend', -2, 0); g.cast('meteor', 2, 0);
    for (let frame = 0; frame < 18; frame++) { g.update(1 / 60); field.render(s, 1 / 60); }
    g.update = () => {}; s.paused = false; field.render(s, 0);
  });
  await page.waitForFunction(() => document.getElementById('paused-overlay').hidden);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/castle-strike-animation-abilities.png', fullPage: true, timeout: 60000 });

  const fallback = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await fallback.addInitScript(() => { const getContext = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.includes('webgl') ? null : getContext.call(this, type, ...args); }; });
  await fallback.goto(`${base}/games/castlestrike/`); await fallback.waitForFunction(() => window.castleStrike?.battlefield?.fallback);
  await fallback.evaluate(() => document.fonts.ready);
  const fallbackMotion = await fallback.evaluate(() => {
    const { game, battlefield: field } = castleStrike; game.start(); field.render(game.state, 0);
    game.update(.1); field.render(game.state, 0); const x = field.fallbackUnits[0].x;
    game.update(.05); field.render(game.state, 0); field.resize();
    return { moved: field.fallbackUnits[0].x !== x, canvas: field.ctx.getImageData(20, 20, 1, 1).data[3] === 255 };
  });
  assert.deepEqual(fallbackMotion, { moved: true, canvas: true });
  await fallback.screenshot({ path: 'test-results/castle-strike-animation-fallback.png' }); await fallback.close();
  assert.deepEqual(errors, []);
  console.log('PASS: v3 pose/contact timing, real static and moving-target projectile flights, HP alignment, paused matrices, anchored bars/rings/shields, picking, terminal death tail, and illustrated fallback.');
} finally { await browser.close(); }
