import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { readdir } from 'node:fs/promises';

// Run with a local server. PLAYWRIGHT_MODULE can point to an existing runtime.
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chrome' }), args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) errors.push(`${response.status()} ${response.url()}`); });
await page.route('**/audio-test-fixture', route => route.fulfill({ contentType: 'text/html', body: '<button id="unlock">Unlock audio</button><script type="module">import {BattleAudio} from "/games/castlestrike/src/audio.js"; window.BattleAudio=BattleAudio; window.sound=new BattleAudio(); document.querySelector("button").addEventListener("click",()=>sound.unlock());</script>' }));
await page.route('**/audio-loading-fixture', route => route.fulfill({ contentType: 'text/html', body: `<button id="unlock">Unlock audio</button><script type="module">
  import {BattleAudio} from "/games/castlestrike/src/audio.js";
  const fetch = window.fetch.bind(window), pending = new Promise(resolve => window.releaseEffects = resolve);
  window.pendingLoads = 0;
  window.fetch = async (...args) => { pendingLoads++; await pending; return fetch(...args); };
  window.sound = new BattleAudio({ music: false });
  document.querySelector("button").addEventListener("click", () => sound.unlock());
</script>` }));

try {
  await page.goto(`${base}/audio-test-fixture`);
  assert.deepEqual(errors, [], 'Audio modules load before the fixture starts');
  await page.waitForFunction(() => !!window.sound).catch(error => { throw new Error(`${error.message}; browser errors: ${JSON.stringify(errors)}`); });
  assert.deepEqual(await page.evaluate(() => ({ enabled: sound.enabled, context: sound.context, track: sound.musicElement })), { enabled: false, context: null, track: null }, 'No audio created or autoplay before a gesture');
  await page.locator('#unlock').click();
  await page.waitForFunction(() => sound.context?.state === 'running' && sound.musicElement?.currentTime > .15);
  const recordings = await page.evaluate(async () => {
    await sound.preloadEffects();
    await sound.effectsReady;
    return [...sound.effectBuffers].flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map(buffer => {
      const samples = buffer.getChannelData(0);
      return { key, duration: buffer.duration, rms: Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length), peak: samples.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0) };
    }));
  });
  assert.deepEqual(await page.evaluate(() => sound.effectErrors), [], 'Every bundled effect recording loads and decodes successfully');
  assert.ok(recordings.length >= 8, 'A varied bank of recorded battle effects decodes');
  for (const recording of recordings) {
    assert.ok(recording.duration > .04 && recording.duration < 15, `${recording.key}: a complete short recording decodes`);
    assert.ok(recording.rms > .0002 && recording.peak > .005, `${recording.key}: the recording contains audible samples`);
  }
  assert.equal(await page.evaluate(() => sound.musicElement.playbackRate), 1, 'Music uses real time');
  assert.equal(await page.evaluate(() => !!sound.musicSource && sound.musicElement.volume === 1), true, 'Music is routed through its Web Audio bus');

  const expectedTracks = (await readdir(new URL('../../../assets/audio/music/', import.meta.url), { withFileTypes: true }))
    .filter(entry => entry.isFile() && /\.(mp3|ogg|wav|m4a|aac|flac|opus|webm)$/i.test(entry.name)).map(entry => entry.name).sort();
  assert.deepEqual(await page.evaluate(() => sound.musicTracks.map(url => decodeURIComponent(new URL(url).pathname.split('/').pop())).sort()), expectedTracks, 'Every music file in the folder joins the playlist');

  // Decode all real assets and measure the mixed output; play() alone does not
  // prove that a track contains audible samples or that it reaches the output.
  const decoded = await page.evaluate(async () => {
    const results = [];
    for (const url of sound.musicTracks) {
      const buffer = await sound.context.decodeAudioData(await (await fetch(url)).arrayBuffer());
      const data = buffer.getChannelData(0);
      let sum = 0, peak = 0;
      for (let i = 0; i < data.length; i++) { sum += data[i] ** 2; peak = Math.max(peak, Math.abs(data[i])); }
      results.push({ duration: buffer.duration, rms: Math.sqrt(sum / data.length), peak });
    }
    return results;
  });
  for (const result of decoded) {
    assert.ok(result.duration > 100, 'A complete music track decodes');
    assert.ok(result.rms > .015, 'Music asset is audible');
  }
  const musicOutput = await page.evaluate(async () => {
    sound.musicElement.currentTime = 30;
    const analyser = sound.context.createAnalyser();
    analyser.fftSize = 2048;
    sound.compressor.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    let peak = 0, rms = 0;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      analyser.getFloatTimeDomainData(buffer);
      rms = Math.max(rms, Math.sqrt(buffer.reduce((sum, x) => sum + x * x, 0) / buffer.length));
      for (const value of buffer) peak = Math.max(peak, Math.abs(value));
    }
    sound.compressor.disconnect(analyser);
    analyser.disconnect();
    return { rms, peak };
  });
  assert.ok(musicOutput.rms > .008, `Music reaches the output at useful volume (${musicOutput.rms})`);
  assert.ok(musicOutput.peak < 1, 'Music output does not clip');
  await page.evaluate(() => { window.singleTrack = sound.musicElement; sound.configure({ music: false }); });
  await page.waitForFunction(() => sound.musicElement.paused);
  const musicOffTime = await page.evaluate(() => sound.musicElement.currentTime);
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => sound.musicElement.currentTime), musicOffTime, 'Music-off pauses playback');
  assert.equal(await page.evaluate(() => sound.context.state), 'running', 'Music-off leaves effects available');
  await page.evaluate(() => sound.configure({ music: true }));
  await page.waitForFunction(time => !sound.musicElement.paused && sound.musicElement.currentTime > time, musicOffTime);

  // Reach the actual media ended event rather than dispatching a synthetic one.
  const played = [await page.evaluate(() => sound.trackIndex)];
  for (let i = 0; i < expectedTracks.length; i++) {
    await page.waitForFunction(() => Number.isFinite(sound.musicElement.duration));
    const previous = await page.evaluate(() => sound.trackIndex);
    await page.evaluate(() => { sound.musicElement.currentTime = sound.musicElement.duration - .12; });
    await page.waitForFunction(previous => (sound.musicTracks.length === 1 || sound.trackIndex !== previous) && Number.isFinite(sound.musicElement.duration) && sound.musicElement.currentTime > .1 && sound.musicElement.currentTime < 5, previous);
    played.push(await page.evaluate(() => sound.trackIndex));
    assert.equal(await page.evaluate(() => sound.musicElement === singleTrack), true, 'Shuffled music reuses one element');
  }
  assert.equal(new Set(played.slice(0, expectedTracks.length)).size, expectedTracks.length, 'Every track plays once before reshuffling');

  await page.evaluate(() => { sound.setActivity({ paused: true }); sound.play('hit'); sound.play('arrow'); sound.play('impact'); sound.play('magic'); });
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => sound.voices.size), 0, 'Paused combat cannot schedule effects');
  assert.equal(await page.evaluate(() => sound.musicElement.paused), false, 'Manual pause keeps the score playing');
  assert.ok(Math.abs(await page.evaluate(() => sound.musicGain.gain.value) - .18) < .005, 'Pause ducks music to 45%');
  await page.evaluate(() => { sound.setActivity({ paused: false, hidden: true }); });
  await page.waitForFunction(() => sound.musicElement.paused && sound.context.state === 'suspended');
  const hiddenTime = await page.evaluate(() => sound.musicElement.currentTime);
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => sound.musicElement.currentTime), hiddenTime, 'Hidden activity stops music time');
  await page.evaluate(() => sound.setActivity({ hidden: false }));
  await page.waitForFunction(time => sound.context.state === 'running' && sound.musicElement.currentTime > time, hiddenTime);
  await page.evaluate(() => sound.configure({ sound: false }));
  await page.waitForFunction(() => sound.musicElement.paused && sound.context.state === 'suspended');
  assert.equal(await page.evaluate(() => sound.enabled), false, 'Master sound toggle mutes both buses');
  await page.evaluate(() => sound.configure({ sound: true, masterVolume: .6, effectsVolume: .5, musicVolume: .25 }));
  await page.locator('#unlock').click();
  await page.waitForFunction(() => sound.context.state === 'running' && !sound.musicElement.paused);
  await page.waitForTimeout(250);
  const levels = await page.evaluate(() => [sound.masterGain.gain.value, sound.effectsGain.gain.value, sound.musicGain.gain.value]);
  [.6, .5, .25].forEach((target, i) => assert.ok(Math.abs(levels[i] - target) < .005, 'Independent sliders drive their buses'));
  assert.equal(await page.evaluate(() => sound.musicElement === singleTrack), true, 'Repeated unlock reuses the same track');
  assert.equal(await page.evaluate(() => sound.musicError), null);
  await page.evaluate(() => {
    for (let i = 0; i < 8; i++) { sound.setActivity({ hidden: true }); sound.setActivity({ hidden: false }); }
  });
  await page.waitForFunction(() => sound.context.state === 'running' && !sound.musicElement.paused);

  // Stopping a layered death must also cancel its delayed fall and debris.
  const cancellation = await page.evaluate(() => {
    const results = [];
    for (const activity of ['paused', 'ended', 'hidden', 'mute']) {
      sound.setActivity({ paused: false, ended: false, hidden: false });
      sound.lastCombat.clear();
      sound.play('death', { unitId: 'footman', x: -20 });
      sound.play('collapse', { x: 20 });
      const before = sound.voices.size;
      if (activity === 'mute') sound.configure({ sound: false });
      else sound.setActivity({ [activity]: true });
      results.push({ activity, before, after: sound.voices.size });
      // Hidden and mute suspend asynchronously, so their independent cases run
      // last and only need the immediate source cleanup assertion here.
    }
    return results;
  });
  for (const result of cancellation.slice(0, 3)) {
    assert.ok(result.before > 0, `${result.activity}: battle sounds were scheduled`);
    assert.equal(result.after, 0, `${result.activity}: all active and delayed combat layers stop`);
  }
  assert.equal(cancellation.at(-1).after, 0, 'Mute clears every remaining source');
  await page.evaluate(() => { sound.setActivity({ paused: false, ended: false, hidden: false }); sound.configure({ sound: true }); });
  await page.locator('#unlock').click();
  await page.waitForFunction(() => sound.context.state === 'running');

  const finales = await page.evaluate(() => {
    sound._stopVoices(); sound.lastCombat.clear();
    sound.play('collapse', { x: 30 });
    const towerSources = sound.voices.size;
    sound.play('collapse', { x: 30, finale: true });
    const followingTower = [...sound.voices].filter(voice => voice.event?.finale).length;
    sound.setActivity({ ended: true });
    const afterEnd = [...sound.voices].map(voice => !!voice.event?.finale);
    sound._stopVoices(); sound.setActivity({ ended: false });
    for (let i = 0; i < 24; i++) {
      sound.lastCombat.clear();
      sound.play('death', { unitId: 'wyvern', pan: (i % 3 - 1) * .6 });
    }
    const crowdedEvents = sound.combatEvents.size;
    const crowdedSources = sound.voices.size;
    sound.play('collapse', { x: 40, finale: true });
    const inCrowd = [...sound.voices].filter(voice => voice.event?.finale).length;
    const sources = sound.voices.size;
    sound.setActivity({ ended: true });
    const crowdAfterEnd = [...sound.voices].map(voice => !!voice.event?.finale);
    sound.configure({ sound: false });
    const muted = sound.voices.size;
    sound.setActivity({ ended: false });
    sound.configure({ sound: true });
    return { towerSources, followingTower, afterEnd, crowdedEvents, crowdedSources, inCrowd, sources, crowdAfterEnd, muted };
  });
  assert.ok(finales.towerSources > 0 && finales.followingTower > 0, 'A recent tower collapse cannot throttle the castle finale');
  assert.ok(finales.afterEnd.length > 0 && finales.afterEnd.every(Boolean), 'Ending battle stops ordinary combat while preserving the castle fall');
  assert.ok(finales.crowdedEvents === 16 || finales.crowdedSources > 84, 'The priority case fills the event or active-source budget');
  assert.ok(finales.inCrowd > 0 && finales.sources <= 96, 'The castle finale takes priority even when deaths fill the battle mix');
  assert.ok(finales.crowdAfterEnd.length > 0 && finales.crowdAfterEnd.every(Boolean), 'Only the finale survives battle end after a crowded battle');
  assert.equal(finales.muted, 0, 'Master mute also stops a castle finale');
  await page.waitForFunction(() => sound.context.state === 'running');

  // Render the actual effect implementation through its actual buses offline,
  // then compare RMS with the exact original quiet selection cue.
  const effects = await page.evaluate(async () => {
    const measure = buffer => {
      const data = buffer.getChannelData(0);
      const rms = samples => Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => rms(buffer.getChannelData(index)));
      let lastAudible = 0;
      for (let i = 0; i < data.length; i++) if (Math.abs(data[i]) > .003) lastAudible = i / buffer.sampleRate;
      const envelope = Array.from({ length: 24 }, (_, index) => rms(data.subarray(Math.floor(index * data.length / 24), Math.floor((index + 1) * data.length / 24))));
      const peak = Math.max(...Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index).reduce((peak, x) => Math.max(peak, Math.abs(x)), 0)));
      return { rms: rms(data), peak, channels, lastAudible, envelope };
    };
    const oldContext = new OfflineAudioContext(1, 24000, 48000);
    const oldOsc = oldContext.createOscillator(), oldGain = oldContext.createGain();
    oldOsc.type = 'triangle'; oldOsc.frequency.value = 310;
    oldGain.gain.setValueAtTime(.0001, 0); oldGain.gain.exponentialRampToValueAtTime(.024, .01); oldGain.gain.exponentialRampToValueAtTime(.0001, .075);
    oldOsc.connect(oldGain).connect(oldContext.destination); oldOsc.start(); oldOsc.stop(.095);
    const original = measure(await oldContext.startRendering());
    const render = async (events, loud = false, history = 0, ended = false) => {
      const offline = new OfflineAudioContext(2, 96000, 48000);
      Object.defineProperty(offline, 'state', { value: 'running' });
      const AudioContext = window.AudioContext;
      window.AudioContext = function () { return offline; };
      const sample = new BattleAudio(loud ? { music: false, masterVolume: 1, effectsVolume: 1 } : { music: false });
      sample.unlocked = sample.enabled = true;
      sample._ensureAudio(); sample._updateGains();
      window.AudioContext = AudioContext;
      await sample.preloadEffects();
      await sample.effectsReady;
      let previousRecordedPaths = [];
      for (let i = 0; i < history; i++) {
        sample.play('death', { unitId: 'footman' });
        previousRecordedPaths = [...sample.voices].map(voice => voice.samplePath).filter(Boolean);
        sample._stopVoices();
        sample.lastCombat.clear();
      }
      for (const event of events) {
        if (typeof event === 'string') sample.play(event);
        else sample.play(event.kind, event.details);
      }
      if (ended) sample.setActivity({ ended: true });
      const sources = sample.voices.size;
      const recordingBuffers = [...sample.effectBuffers.values()].flatMap(value => Array.isArray(value) ? value : [value]);
      const recordedSources = [...sample.voices].filter(voice => recordingBuffers.includes(voice.source.buffer)).length;
      const recordedPaths = [...sample.voices].flatMap(voice => [...sample.effectBuffers].filter(([, buffer]) => buffer === voice.source.buffer).map(([path]) => path));
      const output = measure(await offline.startRendering());
      return { ...output, sources, recordedSources, recordedPaths, previousRecordedPaths };
    };
    const selection = await render(['select']);
    // Different buffer lengths are normalized to the same observation window.
    selection.rms *= Math.sqrt(4);
    const profiles = {};
    for (const unitId of ['footman', 'grunt', 'skeleton', 'wyvern', 'ballista']) profiles[unitId] = await render([{ kind: 'death', details: { unitId } }]);
    const left = await render([{ kind: 'death', details: { unitId: 'footman', x: -40 } }]);
    const right = await render([{ kind: 'death', details: { unitId: 'footman', x: 40 } }]);
    const varied = await render([{ kind: 'death', details: { unitId: 'footman' } }], false, 1);
    const barrage = Array.from({ length: 120 }, (_, index) => ({ kind: ['hit', 'arrow', 'arrowHit', 'impact', 'magic', 'siege', 'death', 'collapse'][index % 8], details: { unitId: ['footman', 'grunt', 'skeleton', 'wyvern', 'ballista'][index % 5], x: index % 2 ? -35 : 35 } }));
    return { original, selection, profiles, left, right, varied, weapons: { hit: await render(['hit']), arrow: await render(['arrow']), arrowHit: await render(['arrowHit']), siege: await render(['siege']) }, collapse: await render(['collapse']), finale: await render([{ kind: 'collapse', details: { finale: true } }], false, 0, true), battle: await render(barrage, true) };
  });
  assert.ok(effects.selection.rms / effects.original.rms > 3, `Selection cues are over 3x the original RMS volume: ${JSON.stringify(effects)}`);
  assert.ok(effects.battle.peak < .95, `A combined maximum-volume battle mix avoids clipping: ${JSON.stringify(effects.battle)}`);
  assert.ok(effects.battle.rms > .01, 'Combat mix is audible');
  assert.ok(effects.battle.sources > 0 && effects.battle.sources <= 96, 'A crowded battle stays within its source budget');
  for (const [profile, result] of Object.entries(effects.profiles)) {
    assert.ok(result.rms > .004, `${profile} death is audible at default volume (${result.rms})`);
    assert.ok(result.lastAudible > effects.selection.lastAudible + .12, `${profile} death includes a body fall or debris after its initial impact`);
    assert.ok(result.recordedSources >= 1, `${profile} death plays a decoded recording through a real buffer source`);
    if (['footman', 'grunt', 'wyvern'].includes(profile)) assert.ok(result.recordedPaths.some(path => path.startsWith('voices/')), `${profile} includes an actual recorded death voice`);
  }
  const difference = (a, b) => a.envelope.reduce((sum, value, index) => sum + Math.abs(value - b.envelope[index]), 0);
  assert.ok(difference(effects.profiles.footman, effects.profiles.skeleton) > .015, 'Undead and human deaths have different audible envelopes');
  assert.ok(difference(effects.profiles.footman, effects.profiles.ballista) > .015, 'Siege destruction differs from an infantry death');
  assert.notEqual(effects.varied.recordedPaths.find(path => path.startsWith('voices/')), effects.varied.previousRecordedPaths.find(path => path.startsWith('voices/')), 'Consecutive infantry deaths cycle between different recorded performances');
  assert.ok(effects.left.channels[0] > effects.left.channels[1] * 1.5, 'Left-side deaths are audible primarily on the left');
  assert.ok(effects.right.channels[1] > effects.right.channels[0] * 1.5, 'Right-side deaths are audible primarily on the right');
  for (const [kind, result] of Object.entries(effects.weapons)) {
    assert.ok(result.recordedSources >= 1, `${kind} uses a decoded weapon recording`);
    assert.ok(result.rms > .001, `${kind} reaches the speakers`);
  }
  assert.ok(effects.collapse.rms > .004, 'Structure collapses reach the speakers');
  assert.ok(effects.finale.rms > .004 && effects.finale.lastAudible > .4, 'The castle finale remains audible through the real output after battle end');
  await page.evaluate(() => {
    sound.configure({ sound: false });
    window.savedAudioContext = window.AudioContext;
    window.AudioContext = window.webkitAudioContext = undefined;
    window.fallback = new BattleAudio();
    const button = document.createElement('button');
    button.id = 'fallback'; button.textContent = 'Unlock native music';
    button.addEventListener('click', () => fallback.unlock());
    document.body.append(button);
  });
  await page.locator('#fallback').click();
  await page.waitForFunction(() => fallback.musicElement?.currentTime > .1);
  assert.equal(await page.evaluate(() => fallback.context), null, 'Native music remains available without Web Audio');
  assert.ok(Math.abs(await page.evaluate(() => fallback.musicElement.volume) - .34) < .001, 'Fallback respects music and master volume');
  await page.evaluate(() => { fallback.configure({ sound: false }); window.AudioContext = savedAudioContext; });
  assert.equal(await page.evaluate(() => fallback.musicElement.paused), true, 'Fallback respects mute');

  // Hold real asset requests open. Loading is allowed to finish in the
  // background, but a past death or a cancelled preview must never play later.
  for (const stoppedBy of ['paused', 'mute', 'previewMute']) {
    await page.goto(`${base}/audio-loading-fixture`);
    await page.waitForFunction(() => !!window.sound);
    await page.locator('#unlock').click();
    await page.waitForFunction(() => pendingLoads > 0 && sound.context?.state === 'running');
    await page.evaluate(stoppedBy => {
      sound.play('death', { unitId: 'footman' });
      if (stoppedBy === 'previewMute') window.pendingPreview = sound.previewBattle();
      if (stoppedBy === 'paused') sound.setActivity({ paused: true });
      else sound.configure({ sound: false });
      releaseEffects();
    }, stoppedBy);
    await page.evaluate(async () => { await sound.effectsReady; await window.pendingPreview; });
    assert.deepEqual(await page.evaluate(() => sound.effectErrors), [], `${stoppedBy}: interrupted playback does not disrupt asset loading`);
    assert.ok(await page.evaluate(() => sound.effectBuffers.size) >= 8, `${stoppedBy}: real effect recordings finish decoding`);
    assert.equal(await page.evaluate(() => sound.voices.size), 0, `${stoppedBy}: loading cannot start stale sounds after cancellation`);
    await page.evaluate(() => { sound.setActivity({ paused: false }); sound.configure({ sound: true }); });
    await page.locator('#unlock').click();
    await page.waitForFunction(() => sound.context.state === 'running');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => sound.voices.size), 0, `${stoppedBy}: restoring audio does not replay past events`);
    assert.ok(await page.evaluate(() => {
      sound.lastCombat.clear(); sound.play('death', { unitId: 'footman' });
      const buffers = [...sound.effectBuffers.values()];
      return [...sound.voices].some(voice => buffers.includes(voice.source.buffer));
    }), `${stoppedBy}: a fresh death still plays its recording after loading`);
    await page.evaluate(() => sound.configure({ sound: false }));
  }

  // Cross the real engine -> frame renderer -> audio path. Starfall must finish
  // its descent, then its casualties must reach audio at the displayed impact.
  await page.goto(`${base}/games/castlestrike/`);
  assert.deepEqual(errors, [], 'All battlefield modules load before testing death routing');
  await page.waitForFunction(() => !!window.castleStrike).catch(error => { throw new Error(`${error.message}; browser errors: ${JSON.stringify(errors)}`); });
  await page.locator('#audio-btn').click();
  await page.waitForFunction(() => castleStrike.audio.context?.state === 'running');
  await page.evaluate(() => castleStrike.audio.preloadEffects());
  await page.locator('#audio-dialog [data-close]').first().click();
  const victims = await page.evaluate(() => {
    const game = castleStrike.game, audio = castleStrike.audio;
    audio.configure({ music: false });
    window.heardBattle = [];
    const play = audio.play.bind(audio);
    audio.play = (kind, details) => { heardBattle.push({ kind, details, simulationTime: game.state.time, visualTime: castleStrike.battlefield.time }); return play(kind, details); };
    game.start(); game.setSpeed(3);
    const enemies = game.state.units.filter(unit => unit.team === 'enemy').slice(0, 2);
    game.state.units = enemies;
    enemies.forEach((unit, index) => Object.assign(unit, { x: index ? 4 : -4, z: 0, hp: 1, resurrected: true, speed: 0, cooldown: 20 }));
    game.cast('meteor', 0, 0);
    window.starfallFlight = {
      castAt: game.state.time,
      impactAt: game.state.projectiles.find(projectile => projectile.kind === 'meteor').impactAt,
      queuedDeathsAtCast: heardBattle.filter(event => event.kind === 'death').length,
      healthAtCast: enemies.map(unit => unit.hp),
    };
    return enemies.map(unit => unit.unitId);
  });
  const flight = await page.evaluate(() => starfallFlight);
  assert.ok(Math.abs(flight.impactAt - flight.castAt - 1.4) < .00001, 'The real route schedules a 1.4-second Starfall descent');
  assert.equal(flight.queuedDeathsAtCast, 0, 'Casting cannot emit a death before impact');
  assert.ok(flight.healthAtCast.every(hp => hp === 1), 'Casting leaves marked victims alive until landing');
  await page.waitForFunction(count => heardBattle.filter(event => event.kind === 'death').length === count, victims.length);
  const routedDeaths = await page.evaluate(() => heardBattle.filter(event => event.kind === 'death'));
  assert.deepEqual(routedDeaths.map(event => event.details.unitId).sort(), victims.sort(), 'Every lethal spell result reaches audio after simulation cleanup');
  assert.deepEqual(routedDeaths.map(event => event.details.x).sort((a, b) => a - b), [-4, 4], 'Death position survives rendering for stereo placement');
  assert.ok(routedDeaths.every(event => event.details.time >= flight.impactAt && event.simulationTime >= flight.impactAt), 'Lethal sounds come from actual impact events');
  assert.ok(routedDeaths.every(event => event.visualTime + .00001 >= event.details.time), 'The sound waits until the rendered battlefield reaches the casualty tick');
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => heardBattle.filter(event => event.kind === 'death').length), victims.length, 'Subsequent frames do not replay deaths');
  await page.evaluate(() => castleStrike.game.togglePause());
  await page.waitForFunction(() => castleStrike.audio.activity.paused && castleStrike.audio.voices.size === 0);
  await page.locator('#audio-btn').click();
  await page.locator('#audio-preview-btn').click();
  assert.ok(await page.evaluate(() => castleStrike.audio.voices.size) > 0, 'The battle preview is audible while the match is paused');
  await page.locator('#sound-enabled').uncheck();
  await page.waitForFunction(() => castleStrike.audio.voices.size === 0 && castleStrike.audio.context.state === 'suspended');
  assert.deepEqual(errors, [], 'No missing tracks or browser errors');
  console.log('PASS: recorded death voices and weapon hits decoded and played, no stale sounds after interrupted loading, gesture unlock, music looping, stereo placement, safe crowded mix, combat cleanup and finale priority, real spell-death routing at 3x, and paused preview.');
  console.log(JSON.stringify({ tracks: decoded, recordingCount: recordings.length, musicOutput, effects }, (key, value) => key === 'envelope' ? undefined : value, 2));
} finally { await browser.close(); }
