import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleAudio } from '../src/audio.js';

class TestAudio extends EventTarget {
  paused = true;
  plays = 0;
  sources = [];
  set src(value) { this.sources.push(value); this.paused = true; this.error = null; }
  get src() { return this.sources.at(-1); }
  async play() { this.plays++; this.paused = false; }
  pause() { this.paused = true; }
  finish() { this.paused = true; this.dispatchEvent(new Event('ended')); }
  fail() { this.paused = true; this.error = { message: 'Unsupported recording' }; this.dispatchEvent(new Event('error')); }
}

function setup(t, filenames) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: TestAudio });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'Audio', original);
    else delete globalThis.Audio;
  });
  const audio = new BattleAudio();
  if (filenames) audio.musicTracks = filenames.map(file => `https://example.com/Clickstrike/assets/audio/music/${encodeURIComponent(file)}`);
  return audio;
}

test('music starts randomly, plays every song, and reshuffles without adjacent repeats', async t => {
  const audio = setup(t, ['one.mp3', 'two.mp3', 'three.mp3', 'four.mp3']);
  t.mock.method(Math, 'random', () => .999);
  assert.equal(audio.musicElement, null, 'No music element before a gesture');
  await audio.unlock();
  const firstStart = audio.musicElement.src;
  const other = new BattleAudio();
  other.musicTracks = audio.musicTracks;
  t.mock.method(Math, 'random', () => 0);
  await other.unlock();
  assert.notEqual(other.musicElement.src, firstStart, 'The random draw changes the starting song');

  const element = audio.musicElement;
  for (let i = 0; i < 19; i++) element.finish();
  assert.equal(audio.musicElement, element, 'Transitions never create another music layer');
  for (let i = 0; i < 20; i += 4) assert.equal(new Set(element.sources.slice(i, i + 4)).size, 4);
  for (let i = 1; i < element.sources.length; i++) assert.notEqual(element.sources[i], element.sources[i - 1]);
  assert.equal(element.playbackRate, 1);
  audio.configure({ music: false });
  assert.equal(element.paused, true);
  const beforeResume = element.sources.length;
  await audio.unlock();
  audio.configure({ music: true });
  assert.equal(element.paused, false);
  assert.equal(element.sources.length, beforeResume, 'Toggling music resumes the current song');
});

test('one song loops, while an empty folder never starts a media request', async t => {
  const single = setup(t, ['only.mp3']);
  await single.unlock();
  single.musicElement.finish();
  assert.equal(single.musicElement.plays, 2);
  assert.equal(single.musicElement.src, single.musicTracks[0]);
  const empty = new BattleAudio();
  empty.musicTracks = [];
  await empty.unlock();
  assert.equal(empty.musicElement.plays, 0);
  assert.equal(empty.musicElement.src, undefined);
  assert.equal(empty.musicTitle, '');
});

test('unplayable tracks are skipped and exhausting the folder stops retrying', async t => {
  const audio = setup(t, ['broken.mp3', 'good.ogg', 'unsupported.m4a']);
  await audio.unlock();
  const element = audio.musicElement;
  element.fail();
  assert.equal(element.paused, false, 'A failed song advances to another song');
  element.finish();
  element.finish();
  assert.ok(element.sources.slice(1).every(src => src !== element.sources[0]), 'A failed song stays out of later shuffles');
  element.fail();
  element.fail();
  const attempts = element.sources.length;
  assert.equal(audio.failedMusicTracks.size, 3);
  assert.equal(element.paused, true);
  await audio.unlock();
  audio.configure({ music: true });
  assert.equal(element.sources.length, attempts, 'Controls cannot hot-retry failed tracks');
  assert.equal(audio.musicError, 'Unsupported recording');
});

test('track URLs and now-playing names preserve spaces, punctuation and Unicode', async t => {
  const audio = setup(t, ['05. Blight (Undead) #1 — thème.mp3']);
  await audio.unlock();
  assert.equal(new URL(audio.musicElement.src).hash, '');
  assert.equal(audio.musicTitle, 'Blight (Undead) #1 — thème');
  assert.ok(new URL(audio.musicElement.src).pathname.startsWith('/Clickstrike/assets/audio/music/'));
});
