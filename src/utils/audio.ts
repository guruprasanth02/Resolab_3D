/**
 * Web Audio API synthesizer engine for live auditory feedback of LCR resonance.
 */

class ResonanceAudio {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private analyzer: AnalyserNode | null = null;
  private isPlaying = false;
  private isMuted = false;

  constructor() {
    // Context is created lazily on user interaction
  }

  private init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    
    // Main Gain Node
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);

    // Biquad Filter (to make the hum sound warm, like an electrical transformer)
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.setValueAtTime(3, this.ctx.currentTime);

    // Connection chain
    this.gainNode.connect(this.ctx.destination);
    
    this.analyzer = this.ctx.createAnalyser();
    this.analyzer.fftSize = 256;
  }

  public start() {
    if (this.isPlaying) return;
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      this.osc = this.ctx.createOscillator();
      // Use a triangle wave for a smooth, pleasant electrical hum rather than a harsh sine or buzz
      this.osc.type = 'triangle';
      this.osc.frequency.setValueAtTime(120, this.ctx.currentTime);

      this.osc.connect(this.filter!);
      this.filter!.connect(this.gainNode!);
      this.gainNode!.connect(this.analyzer!);

      this.osc.start();
      this.isPlaying = true;
    } catch (e) {
      console.error('Failed to start audio synthesizer', e);
    }
  }

  public stop() {
    if (!this.isPlaying) return;
    try {
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
        this.osc = null;
      }
      this.isPlaying = false;
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Update synth parameters based on circuit state
   * @param frequency Current circuit AC frequency (10 - 2000 Hz)
   * @param Irms Current RMS current (0 - ~5 A)
   * @param maxIrms Peak possible current at resonance
   * @param isResonant True if frequency is at resonance
   */
  public update(frequency: number, Irms: number, maxIrms: number, isResonant: boolean) {
    if (!this.isPlaying || !this.ctx || this.isMuted) return;

    // Map circuit frequency (10Hz - 2000Hz) to a pleasant audio frequency range (60Hz - 400Hz)
    // Low frequency gives a deep bass rumble, high frequency gives a hum
    const logFreq = Math.log10(frequency);
    const minLog = Math.log10(10);
    const maxLog = Math.log10(2000);
    const percent = (logFreq - minLog) / (maxLog - minLog);
    const audioFreq = 60 + percent * 340; // 60Hz to 400Hz

    // Calculate volume proportional to current (max volume 0.15 to prevent clipping/fatigue)
    const currentRatio = maxIrms > 0 ? Irms / maxIrms : 0;
    
    // Smooth transition
    const now = this.ctx.currentTime;
    
    if (this.osc) {
      this.osc.frequency.setTargetAtTime(audioFreq, now, 0.05);
    }

    if (this.filter) {
      // Dynamic filter frequency: opens up at resonance, making the hum brighter
      const filterFreq = audioFreq * (1 + currentRatio * 1.5);
      this.filter.frequency.setTargetAtTime(filterFreq, now, 0.05);
      this.filter.Q.setTargetAtTime(isResonant ? 8 : 2, now, 0.05);
    }

    if (this.gainNode) {
      const targetVolume = currentRatio * 0.12; // Cap volume at 12%
      this.gainNode.gain.setTargetAtTime(targetVolume, now, 0.05);
    }
  }

  /**
   * Play a clean, beautiful synthetic bell chime when resonance is successfully detected
   */
  public playResonanceChime() {
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // Create dual sine oscillators for a rich bell sound (harmonic frequencies)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5 note (harmonic)
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now); // A5 note (harmonic fifth)

    chimeGain.gain.setValueAtTime(0, now);
    chimeGain.gain.linearRampToValueAtTime(0.15, now + 0.02); // Quick attack
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2); // Smooth decay

    osc1.connect(chimeGain);
    osc2.connect(chimeGain);
    chimeGain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.3);
    osc2.stop(now + 1.3);
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(muted ? 0 : 0.05, this.ctx.currentTime, 0.02);
    }
  }

  public toggleMute() {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMuted() {
    return this.isMuted;
  }
}

export const audioEngine = new ResonanceAudio();
export default audioEngine;
