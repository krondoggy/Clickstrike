// Original, synthesized effects. Audio starts only after an explicit user gesture.
export class BattleAudio {
  constructor() { this.enabled = false; this.context = null; this.lastHit = 0; }
  enable(value) {
    this.enabled = value;
    if (value) {
      try { this.context ||= new (window.AudioContext || window.webkitAudioContext)(); this.context.resume().catch(() => {}); }
      catch { this.enabled = false; }
    }
    return this.enabled;
  }
  tone(frequency, duration = .13, shape = 'sine', volume = .04, delay = 0, endFrequency = frequency) {
    if (!this.enabled || !this.context) return;
    const t = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = shape; oscillator.frequency.setValueAtTime(frequency, t);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), t + duration);
    gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(volume, t + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(gain).connect(this.context.destination); oscillator.start(t); oscillator.stop(t + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  play(kind) {
    if (!this.enabled) return;
    if (kind === 'recruit') { this.tone(390,.14,'triangle',.04); this.tone(585,.2,'triangle',.03,.09); }
    else if (kind === 'wave') { [164.8,220,329.6].forEach((f,i) => this.tone(f,.65,'triangle',.025,i*.18)); }
    else if (kind === 'upgrade') { [261.6,329.6,392,523.2].forEach((f,i) => this.tone(f,.2,'sine',.035,i*.08)); }
    else if (kind === 'spell') { this.tone(120,.45,'sawtooth',.012,0,600); this.tone(800,.6,'sine',.025,.05,120); }
    else if (kind === 'victory') { [261.6,329.6,392,523.2,659.3].forEach((f,i) => this.tone(f,.55,'triangle',.035,i*.17)); }
    else if (kind === 'defeat') { [220,196,164.8,110].forEach((f,i) => this.tone(f,.6,'triangle',.03,i*.23)); }
    else if (kind === 'hit') {
      if (performance.now() - this.lastHit < 190) return;
      this.lastHit = performance.now(); this.tone(115,.085,'triangle',.013,0,42);
    } else this.tone(310,.075,'triangle',.024);
  }
}
