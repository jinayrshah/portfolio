/**
 * The soundscape: a slow, warm drone made entirely in the browser with the
 * Web Audio API, so it costs nothing and needs no audio files. It follows
 * the film: low and hushed for the soul, opening and brighter through the
 * mind, a rising shimmer along the beam, and a full warm chord for creation.
 */
type Voice = { osc: OscillatorNode; gain: GainNode };

/** Notes of each chord, in Hz (D major family, kept low and calm). */
const chords = {
  soul: [73.42, 110.0, 146.83, 220.0],
  mind: [73.42, 110.0, 164.81, 246.94],
  beam: [73.42, 123.47, 185.0, 277.18],
  creation: [73.42, 110.0, 146.83, 185.0],
};

export class Soundscape {
  ctx: AudioContext;
  analyser: AnalyserNode;
  private master: GainNode;
  private filter: BiquadFilterNode;
  private voices: Voice[] = [];
  private shimmer: Voice[] = [];
  private air: GainNode;
  private airFilter: BiquadFilterNode;

  constructor() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.85;

    // A soft room: two short feedback delays stand in for a reverb.
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    for (const time of [0.37, 0.53]) {
      const delay = ctx.createDelay(1);
      delay.delayTime.value = time;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.45;
      const damp = ctx.createBiquadFilter();
      damp.type = "lowpass";
      damp.frequency.value = 1800;
      this.master.connect(delay);
      delay.connect(damp);
      damp.connect(feedback);
      feedback.connect(delay);
      damp.connect(wet);
    }
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 600;
    this.filter.Q.value = 0.4;
    this.master.connect(this.filter);
    wet.connect(this.filter);
    this.filter.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // The drone: each note is two gently detuned voices, slowly swelling.
    chords.soul.forEach((freq, i) => {
      for (const detune of [-5, 5]) {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const gain = ctx.createGain();
        gain.gain.value = i === 0 ? 0.16 : 0.07;
        // A slow breath on every voice, each at its own pace.
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + Math.random() * 0.08;
        const depth = ctx.createGain();
        depth.gain.value = gain.gain.value * 0.45;
        lfo.connect(depth);
        depth.connect(gain.gain);
        lfo.start();
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        this.voices.push({ osc, gain });
      }
    });

    // Shimmer: high, quiet partials that rise with the beam and the tree.
    [587.33, 880.0, 1174.66].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.shimmer.push({ osc, gain });
    });

    // Air: filtered noise, like a far wind.
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    this.airFilter = ctx.createBiquadFilter();
    this.airFilter.type = "bandpass";
    this.airFilter.frequency.value = 500;
    this.airFilter.Q.value = 0.7;
    this.air = ctx.createGain();
    this.air.gain.value = 0.025;
    source.connect(this.airFilter);
    this.airFilter.connect(this.air);
    this.air.connect(this.master);
    source.start();
  }

  /** Fade in or out over a couple of seconds. */
  setOn(on: boolean) {
    const t = this.ctx.currentTime;
    if (on) void this.ctx.resume();
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(
      on ? 0.55 : 0,
      t + (on ? 2.5 : 1.2),
    );
  }

  /** Follow the film: progress 0..1 through the whole page. */
  follow(progress: number) {
    const t = this.ctx.currentTime;
    const chord =
      progress < 0.34
        ? chords.soul
        : progress < 0.56
          ? chords.mind
          : progress < 0.7
            ? chords.beam
            : chords.creation;
    this.voices.forEach((v, i) => {
      v.osc.frequency.setTargetAtTime(chord[i >> 1], t, 1.6);
    });
    // The sound opens as the story moves from soul towards creation.
    const open = 450 + progress * 1900;
    this.filter.frequency.setTargetAtTime(open, t, 0.8);
    const beam = Math.max(0, 1 - Math.abs(progress - 0.65) / 0.12);
    const shine = Math.max(beam, progress > 0.72 ? 0.45 : 0);
    this.shimmer.forEach((s, i) =>
      s.gain.gain.setTargetAtTime(shine * (0.018 - i * 0.004), t, 1.2),
    );
    this.airFilter.frequency.setTargetAtTime(400 + beam * 1400, t, 0.8);
    this.air.gain.setTargetAtTime(0.02 + beam * 0.03, t, 0.8);
  }
}
