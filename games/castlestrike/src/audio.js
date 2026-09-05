import { UNIT_MAP } from './data.js';
import musicFiles from '../../../assets/audio/music/playlist.js';

// Sound is unlocked by a player gesture. One media element owns the playlist,
// so changing menus or starting another match never stacks music tracks.
const MUSIC_TRACKS = musicFiles.map(file => new URL(`../../../assets/audio/music/${encodeURIComponent(file)}`, import.meta.url).href);
const DEFAULT_SETTINGS = Object.freeze({ sound: true, music: true, masterVolume: .85, effectsVolume: .8, musicVolume: .4 });
const EFFECTS_LEVEL = 2.25;
const COMBAT_INTERVALS = { hit: 75, arrow: 95, arrowHit: 70, siege: 180, impact: 130, magic: 110, death: 95, collapse: 240 };
const MAX_VOICES = 96;
const MAX_COMBAT_EVENTS = 16;
const RECORDINGS = {
  human: ['voices/human-1.wav', 'voices/human-2.wav', 'voices/human-3.wav'],
  creature: ['voices/creature-1.wav', 'voices/creature-2.wav', 'voices/creature-3.wav'],
  scream: ['voices/scream-female.ogg'],
  clash: ['weapons/sword-clash-01.wav', 'weapons/sword-clash-02.wav', 'weapons/sword-clash-03.wav'],
  swing: ['weapons/sword-swing-01.wav', 'weapons/sword-swing-02.wav'],
  bow: ['weapons/bow-release-01.wav'],
  arrowHit: ['weapons/arrow-hit-01.wav', 'weapons/arrow-hit-02.wav'],
  flesh: ['weapons/flesh-hit-01.wav', 'weapons/flesh-hit-02.wav'],
  heavy: ['weapons/heavy-clash-01.wav', 'weapons/heavy-clash-02.wav'],
  fall: ['weapons/body-fall-01.wav'],
};
const clampVolume = (value, fallback) => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : fallback;

export class BattleAudio {
  constructor(settings = {}) {
    this.settings = { ...DEFAULT_SETTINGS };
    this.activity = { paused: false, hidden: false, ended: false };
    this.enabled = false;
    this.unlocked = false;
    this.context = null;
    this.masterGain = this.effectsGain = this.musicGain = this.compressor = this.limiter = null;
    this.musicElement = this.musicSource = null;
    this.musicTracks = [...MUSIC_TRACKS];
    this.trackIndex = -1;
    this.musicQueue = [];
    this.failedMusicTracks = new Set();
    this.musicError = null;
    this.lastCombat = new Map();
    this.voices = new Set();
    this.combatEvents = new Set();
    this.effectBuffers = new Map();
    this.effectsReady = null;
    this.effectErrors = [];
    this.previewGeneration = 0;
    this.variations = new Map();
    this.currentEvent = null;
    this.configure(settings);
  }

  configure(settings = {}) {
    for (const key of ['sound', 'music']) if (typeof settings[key] === 'boolean') this.settings[key] = settings[key];
    for (const key of ['masterVolume', 'effectsVolume', 'musicVolume']) {
      if (settings[key] !== undefined) this.settings[key] = clampVolume(settings[key], this.settings[key]);
    }
    this.enabled = this.unlocked && this.settings.sound;
    if (!this.settings.sound) this._stopVoices();
    this._updateGains();
    void this._syncPlayback();
    return { ...this.settings };
  }

  // Compatibility with the original toggle; call this from a player gesture.
  enable(value) {
    this.configure({ sound: Boolean(value) });
    if (value) void this.unlock();
    return this.enabled;
  }

  async unlock() {
    this.unlocked = true;
    this.enabled = this.settings.sound;
    this._ensureAudio();
    this._ensureMusic();
    void this.preloadEffects();
    this._updateGains();
    await this._syncPlayback();
    return this.enabled;
  }

  preloadEffects() {
    if (!this.unlocked || !this.context) return Promise.resolve();
    if (this.effectsReady) return this.effectsReady;
    const paths = [...new Set(Object.values(RECORDINGS).flat())];
    this.effectsReady = Promise.allSettled(paths.map(async path => {
      try {
        const response = await fetch(new URL(`../../../assets/audio/sfx/${path}`, import.meta.url));
        if (!response.ok) throw new Error(`Sound recording returned ${response.status}: ${path}`);
        const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        this.effectBuffers.set(path, buffer);
      } catch (error) { this.effectErrors.push({ path, message: error.message }); }
    }));
    return this.effectsReady;
  }

  setActivity(changes = {}) {
    let changed = false;
    for (const key of ['paused', 'hidden', 'ended']) {
      if (typeof changes[key] === 'boolean' && this.activity[key] !== changes[key]) {
        this.activity[key] = changes[key];
        changed = true;
      }
    }
    if (!changed) return;
    if (this.activity.hidden) this._stopVoices();
    else if (this.activity.paused || this.activity.ended) this._stopVoices(true, this.activity.ended && !this.activity.paused);
    this._updateGains();
    void this._syncPlayback();
  }

  _ensureAudio() {
    if (this.context) return;
    try {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.effectsGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -12;
      this.compressor.knee.value = 16;
      this.compressor.ratio.value = 5;
      this.compressor.attack.value = .003;
      this.compressor.release.value = .2;
      // Catch simultaneous impact transients while the compressor attacks.
      // Quiet samples pass unchanged; only peaks above .72 are softened.
      this.limiter = this.context.createWaveShaper();
      const curve = new Float32Array(4097);
      for (let i = 0; i < curve.length; i++) {
        const x = i * 2 / (curve.length - 1) - 1, magnitude = Math.abs(x);
        curve[i] = Math.sign(x) * (magnitude <= .72 ? magnitude : .72 + .22 * (1 - Math.exp(-(magnitude - .72) / .22)));
      }
      this.limiter.curve = curve;
      this.effectsGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.compressor).connect(this.limiter).connect(this.context.destination);
      // Reconcile a device interruption or a rapid hide/show while resume or
      // suspend was still pending. The latest activity state always wins.
      this.context.addEventListener('statechange', () => { void this._syncPlayback(); });
    } catch {
      this.context = null;
      this.masterGain = this.effectsGain = this.musicGain = this.compressor = this.limiter = null;
    }
  }

  _ensureMusic() {
    if (this.musicElement || !globalThis.Audio) return;
    const music = this.musicElement = new Audio();
    music.preload = 'none';
    music.playbackRate = 1;
    music.addEventListener('ended', () => {
      if (this._nextMusicTrack()) void this._syncPlayback();
    });
    music.addEventListener('error', () => {
      // Skip missing or unsupported files once per session, stopping if none work.
      this.musicError = music.error?.message || 'Music could not be loaded.';
      this.failedMusicTracks.add(this.trackIndex);
      if (this._nextMusicTrack()) void this._syncPlayback();
    });
    this._nextMusicTrack();
    if (this.context) {
      try {
        this.musicSource = this.context.createMediaElementSource(music);
        this.musicSource.connect(this.musicGain);
      } catch { this.musicSource = null; }
    }
  }

  _nextMusicTrack() {
    this.musicQueue = this.musicQueue.filter(index => !this.failedMusicTracks.has(index));
    if (!this.musicQueue.length) {
      this.musicQueue = this.musicTracks.map((_, index) => index).filter(index => !this.failedMusicTracks.has(index));
      for (let i = this.musicQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.musicQueue[i], this.musicQueue[j]] = [this.musicQueue[j], this.musicQueue[i]];
      }
      // Each track plays once per shuffle; the next shuffle cannot repeat the last song.
      if (this.musicQueue.length > 1 && this.musicQueue[0] === this.trackIndex) {
        const j = 1 + Math.floor(Math.random() * (this.musicQueue.length - 1));
        [this.musicQueue[0], this.musicQueue[j]] = [this.musicQueue[j], this.musicQueue[0]];
      }
    }
    if (!this.musicQueue.length) return false;
    this.trackIndex = this.musicQueue.shift();
    this.musicElement.src = this.musicTracks[this.trackIndex];
    this.musicElement.playbackRate = 1;
    this.musicError = null;
    return true;
  }

  get musicTitle() {
    if (this.trackIndex < 0) return '';
    const filename = decodeURIComponent(new URL(this.musicTracks[this.trackIndex]).pathname.split('/').pop());
    return filename.replace(/\.[^.]+$/, '').replace(/^\d+[.\s_-]+/, '').replace(/[-_]+/g, ' ');
  }

  _musicLevel() {
    return this.settings.musicVolume * (this.activity.paused ? .45 : this.activity.ended ? .7 : 1);
  }

  _updateGains() {
    const audible = this.unlocked && this.settings.sound && !this.activity.hidden;
    const target = (node, value) => {
      if (!node || !this.context) return;
      const time = this.context.currentTime;
      node.gain.cancelScheduledValues(time);
      node.gain.setTargetAtTime(value, time, .035);
    };
    target(this.masterGain, audible ? this.settings.masterVolume : 0);
    target(this.effectsGain, this.settings.effectsVolume);
    target(this.musicGain, this.settings.music ? this._musicLevel() : 0);
    if (this.musicElement) {
      this.musicElement.muted = !audible || !this.settings.music;
      this.musicElement.volume = this.musicSource ? 1 : this.settings.masterVolume * this._musicLevel();
    }
  }

  async _syncPlayback() {
    if (!this.unlocked) return;
    const audible = () => this.settings.sound && !this.activity.hidden;
    if (this.context) {
      try {
        if (audible() && this.context.state === 'suspended') await this.context.resume();
        else if (!audible() && this.context.state === 'running') await this.context.suspend();
      } catch { /* Native music remains available if Web Audio is unavailable. */ }
    }
    if (!this.musicElement || this.trackIndex < 0 || this.failedMusicTracks.has(this.trackIndex)) return;
    if (!audible() || !this.settings.music) {
      this.musicElement.pause();
      return;
    }
    if (!this.musicElement.paused) return;
    const trackIndex = this.trackIndex;
    try {
      await this.musicElement.play();
      if (this.trackIndex === trackIndex && !this.failedMusicTracks.has(trackIndex)) this.musicError = null;
      // A toggle may change while play() waits for the media to load.
      if (!audible() || !this.settings.music) this.musicElement.pause();
    } catch (error) {
      if (this.trackIndex === trackIndex && error.name !== 'AbortError') this.musicError = error.message;
    }
  }

  _releaseVoice(voice) {
    voice.source.disconnect();
    voice.filter?.disconnect();
    voice.gain.disconnect();
    this.voices.delete(voice);
    if (voice.event) {
      voice.event.voices.delete(voice);
      if (!voice.event.voices.size) {
        voice.event.output.disconnect();
        this.combatEvents.delete(voice.event);
      }
    }
  }

  _stopVoices(combatOnly = false, preserveFinale = false) {
    this.previewGeneration++;
    for (const voice of this.voices) {
      if (combatOnly && !voice.combat) continue;
      if (preserveFinale && voice.event?.finale) continue;
      try { voice.source.stop(); } catch { /* Already finished. */ }
      this._releaseVoice(voice);
    }
  }

  _envelope(source, duration, volume, delay, combat = false, filter = null) {
    if (this.voices.size >= MAX_VOICES) { source.disconnect(); filter?.disconnect(); return; }
    const t = this.context.currentTime + delay + (this.currentEvent?.delay || 0);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, volume * EFFECTS_LEVEL), t + Math.min(.008, duration / 4));
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    if (filter) source.connect(filter).connect(gain);
    else source.connect(gain);
    const event = this.currentEvent;
    gain.connect(event?.output || this.effectsGain);
    const voice = { source, gain, combat, filter, event };
    this.voices.add(voice);
    event?.voices.add(voice);
    source.onended = () => this._releaseVoice(voice);
    source.start(t);
    source.stop(t + duration + .015);
  }

  tone(frequency, duration = .13, shape = 'sine', volume = .18, delay = 0, endFrequency = frequency, combat = false) {
    if (!this.enabled || !this.context || this.context.state !== 'running' || this.activity.hidden) return;
    const oscillator = this.context.createOscillator();
    oscillator.type = shape;
    const t = this.context.currentTime + delay + (this.currentEvent?.delay || 0);
    oscillator.frequency.setValueAtTime(frequency, t);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), t + duration);
    this._envelope(oscillator, duration, volume, delay, combat);
  }

  _noise(duration, volume, frequency, delay = 0, combat = false, endFrequency = frequency, q = .65) {
    if (!this.enabled || this.activity.hidden || !this.context || this.context.state !== 'running') return;
    this.noiseBuffer ||= this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
    if (!this.noiseReady) {
      const samples = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      this.noiseReady = true;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    source.playbackRate.value = .86 + Math.random() * .28;
    filter.type = 'bandpass';
    const t = this.context.currentTime + delay + (this.currentEvent?.delay || 0);
    filter.frequency.setValueAtTime(frequency, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), t + duration);
    filter.Q.value = q;
    this._envelope(source, duration, volume, delay, combat, filter);
  }

  _profile(details) {
    if (details.role === 'siege') return 'siege';
    if (details.unitId === 'skeleton') return 'bones';
    if (details.unitId === 'banshee') return 'spirit';
    if (details.unitId === 'archer') return 'ranger';
    if (['tauren', 'abomination', 'cryptfiend', 'gryphon', 'wyvern', 'frostwyrm'].includes(details.unitId)) return 'beast';
    return details.faction === 'undead' ? 'undead' : details.faction === 'horde' ? 'horde' : 'human';
  }

  // Recordings keep the performer's natural envelope and pitch. In-game
  // events never wait for decoding: loading cannot replay an old casualty.
  _sample(paths, volume, { delay = 0, rate = 1, maxDuration = 1.45 } = {}) {
    const available = paths.filter(path => this.effectBuffers.has(path));
    if (!available.length || this.voices.size >= MAX_VOICES) return false;
    const key = paths.join('|');
    const index = this.variations.get(key) ?? Math.floor(Math.random() * available.length);
    this.variations.set(key, (index + 1) % available.length);
    const samplePath = available[index % available.length];
    const source = this.context.createBufferSource();
    source.buffer = this.effectBuffers.get(samplePath);
    source.playbackRate.value = rate * (.985 + Math.random() * .03);
    const duration = Math.min(maxDuration, source.buffer.duration / source.playbackRate.value);
    const event = this.currentEvent;
    const t = this.context.currentTime + delay + (event?.delay || 0);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume * EFFECTS_LEVEL, t + .003);
    gain.gain.setValueAtTime(volume * EFFECTS_LEVEL, t + Math.max(.004, duration - .045));
    gain.gain.linearRampToValueAtTime(0, t + duration);
    source.connect(gain).connect(event?.output || this.effectsGain);
    const voice = { source, gain, combat: true, event, samplePath };
    this.voices.add(voice); event?.voices.add(voice);
    source.onended = () => this._releaseVoice(voice);
    source.start(t); source.stop(t + duration + .01);
    return true;
  }

  _cry(profile, hero = false) {
    const paths = profile === 'spirit' || profile === 'ranger' ? RECORDINGS.scream : profile === 'beast' ? RECORDINGS.creature : RECORDINGS.human;
    this._sample(paths, hero ? .34 : profile === 'spirit' || profile === 'ranger' ? .24 : .3, { maxDuration: profile === 'spirit' ? 1.35 : 1.2 });
  }

  _metal(volume, delay = 0, heavy = false) {
    if (!this._sample(heavy ? RECORDINGS.heavy : RECORDINGS.clash, volume, { delay, maxDuration: .8 })) {
      this._noise(.09, volume, 3200, delay, true, 1800, 1.8);
    }
  }

  _fall(details, delay = .3) {
    const heavy = details.heavy || details.hero || ['cavalry', 'siege', 'flying'].includes(details.role);
    if (!this._sample(RECORDINGS.fall, heavy ? .19 : .13, { delay, maxDuration: .55 })) {
      this._noise(.16, .12, 350, delay, true, 180);
    }
    if (details.armorType === 'heavy') this._metal(.08, delay + .045, true);
  }

  _battleSound(kind, details) {
    const pitch = .87 + Math.random() * .26;
    if (kind === 'death') {
      const profile = this._profile(details);
      if (profile !== 'siege' && profile !== 'bones') this._cry(profile, details.hero);
      if (profile === 'siege') {
        this._noise(.55, .28, 800, 0, true, 170);
        this._metal(.17, .06, true);
        this._noise(.4, .16, 2100, .2, true, 480);
      } else if (profile === 'bones') {
        this._sample(RECORDINGS.arrowHit, .22, { maxDuration: .4 });
        this._sample(RECORDINGS.arrowHit, .15, { delay: .09, maxDuration: .4 });
        this._metal(.1, .15, true);
      } else if (profile === 'spirit') {
        this._noise(.7, .075, 2600, .1, true, 450, 2);
      }
      this._fall(details, profile === 'spirit' ? .5 : .26 + Math.random() * .12);
    } else if (kind === 'hit') {
      if (details.phase !== 'impact') this._sample(RECORDINGS.swing, .12, { maxDuration: .25 });
      const delay = details.phase === 'impact' ? 0 : .045;
      const claws = ['ghoul', 'cryptfiend', 'abomination'].includes(details.unitId);
      this._metal(claws ? .1 : .27, delay, details.heavy);
      this._sample(RECORDINGS.flesh, claws ? .22 : .075, { delay, maxDuration: .3 });
    } else if (kind === 'arrow') {
      const thrown = ['headhunter', 'wyvern', 'cryptfiend'].includes(details.unitId);
      this._sample(thrown ? RECORDINGS.swing : RECORDINGS.bow, .23, { maxDuration: .42 });
      this._noise(.13, .035, 4200, .02, true, 1600);
    } else if (kind === 'arrowHit') {
      this._sample(RECORDINGS.arrowHit, .25, { maxDuration: .5 });
      this._sample(RECORDINGS.flesh, .09, { maxDuration: .25 });
    } else if (kind === 'siege') {
      this._sample(RECORDINGS.bow, .19, { rate: .94, maxDuration: .4 });
      this._noise(.22, .21, 600, 0, true, 150, 1.1);
      this.tone(120 * pitch, .24, 'triangle', .2, 0, 38, true);
      this._metal(.1, .025, true);
      this._noise(.35, .17, 800, .05, true, 2700);
    } else if (kind === 'impact' || kind === 'collapse') {
      const collapse = kind === 'collapse';
      this.tone(95 * pitch, collapse ? .85 : .45, 'sine', .32, 0, 25, true);
      this._noise(collapse ? 1.15 : .5, .32, 650, 0, true, 90);
      this._noise(.16, .2, 2800, 0, true, 800);
      for (let i = 0; i < (collapse ? 5 : 2); i++) {
        this._noise(.13 + i * .035, .13 / (1 + i * .3), 700 + Math.random() * 1700, .08 + i * .13, true, 200);
      }
      if (collapse) this._metal(.12, .17, true);
    } else if (kind === 'magic') {
      if (details.phase === 'release') {
        this.tone(440 * pitch, .23, 'sine', .09, 0, 850, true);
        this._noise(.17, .08, 2300, 0, true, 3600);
      } else if (details.effectType === 'heal') {
        [523, 784, 1047].forEach((f, i) => this.tone(f, .45, 'sine', .065, i * .06, f * 1.005, true));
        this._noise(.35, .055, 3200, 0, true, 1600);
      } else if (details.effectType === 'rally') {
        [146.8, 220].forEach((f, i) => { this.tone(f, .55, 'sawtooth', .04, i * .09, f * 1.01, true); this.tone(f / 2, .6, 'triangle', .11, i * .09, f / 2, true); });
      } else {
        this._noise(.08, .18, 3300, 0, true, 650);
        this.tone(740 * pitch, .3, 'sine', .105, 0, 160, true);
        this.tone(1110 * pitch, .24, 'triangle', .07, .025, 370, true);
        this._noise(.3, .13, 1900, .025, true, 420, 1.5);
        if (details.effectType === 'lightning') { this._noise(.12, .17, 3900, .055, true, 1500); this.tone(95, .3, 'sine', .15, .04, 32, true); }
      }
    }
  }

  _playCombat(kind, details, preview = false) {
    if (!preview && (this.activity.paused || (this.activity.ended && !details.finale))) return;
    details = { ...UNIT_MAP[details.unitId], ...details };
    const pan = Math.min(.85, Math.max(-.85, Number.isFinite(details.pan) ? details.pan : Number.isFinite(details.x) ? details.x / 48 : 0));
    const key = details.finale ? `${kind}:finale` : kind === 'death' ? `${kind}:${this._profile(details)}:${details.hero ? 'hero' : Math.round(pan * 2)}` : `${kind}:${details.effectType || ''}`;
    const now = this.context.currentTime * 1000;
    if (!preview && now - (this.lastCombat.get(key) ?? -Infinity) < COMBAT_INTERVALS[kind]) return;
    const priority = details.finale ? 3 : kind === 'death' || kind === 'collapse' ? 2 : kind === 'impact' || kind === 'siege' ? 1 : 0;
    const limit = priority >= 2 ? MAX_COMBAT_EVENTS : MAX_COMBAT_EVENTS - 4;
    while (this.combatEvents.size >= limit || this.voices.size > MAX_VOICES - 12) {
      const victim = [...this.combatEvents].find(event => event.priority < priority);
      if (!victim) return;
      for (const voice of victim.voices) { try { voice.source.stop(); } catch { /* Finished. */ } this._releaseVoice(voice); }
    }
    if (!preview) this.lastCombat.set(key, now);
    const output = this.context.createStereoPanner();
    output.pan.value = pan;
    output.connect(this.effectsGain);
    const event = { output, voices: new Set(), priority, finale: !!details.finale, kind, delay: preview ? details.previewDelay || 0 : 0 };
    this.combatEvents.add(event);
    this.currentEvent = event;
    try { this._battleSound(kind, details); }
    finally {
      this.currentEvent = null;
      if (!event.voices.size) { output.disconnect(); this.combatEvents.delete(event); }
    }
  }

  async previewBattle() {
    const generation = ++this.previewGeneration;
    await this.preloadEffects();
    if (generation !== this.previewGeneration) return;
    if (!this.enabled || this.activity.hidden || !this.context || this.context.state !== 'running') return;
    this._playCombat('hit', { unitId: 'footman', pan: -.3 }, true);
    this._playCombat('arrow', { unitId: 'archer', pan: .35, previewDelay: .55 }, true);
    this._playCombat('arrowHit', { pan: -.2, previewDelay: .85 }, true);
    this._playCombat('death', { unitId: 'footman', pan: -.15, previewDelay: 1.1 }, true);
  }

  play(kind, details = {}) {
    if (!this.enabled || this.activity.hidden || !this.context || this.context.state !== 'running') return;
    if (COMBAT_INTERVALS[kind]) { this._playCombat(kind, details); return; }
    if (kind === 'recruit') {
      this.tone(390, .17, 'triangle', .21);
      this.tone(585, .25, 'triangle', .16, .085);
      this.tone(1170, .15, 'sine', .045, .11);
    } else if (kind === 'wave') {
      [164.8, 220, 329.6].forEach((f, i) => {
        this.tone(f, .72, 'triangle', .15, i * .17);
        this.tone(f / 2, .75, 'sine', .075, i * .17);
      });
    } else if (kind === 'upgrade') {
      [261.6, 329.6, 392, 523.2].forEach((f, i) => this.tone(f, .26, 'sine', .2, i * .08));
    } else if (kind === 'spell') {
      this.tone(120, .5, 'sawtooth', .065, 0, 600);
      this.tone(800, .7, 'sine', .15, .05, 120);
      this._noise(.5, .15, 1400);
    } else if (kind === 'victory') {
      [261.6, 329.6, 392, 523.2, 659.3].forEach((f, i) => this.tone(f, .65, 'triangle', .2, i * .17));
    } else if (kind === 'defeat') {
      [220, 196, 164.8, 110].forEach((f, i) => this.tone(f, .72, 'triangle', .18, i * .23));
    } else {
      this.tone(440, .085, 'triangle', .135, 0, 330);
      this.tone(880, .05, 'sine', .045);
    }
  }
}
