class AudioTelemetryService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private volume: number = 0.4;
  private dopplerTimer: any = null;
  private alarmTimer: any = null;
  private currentBpm: number = 135;
  private currentAlarmType: 'none' | 'suspect' | 'pathological' = 'none';

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!muted) {
      this.initContext();
      this.restartDopplerLoop();
      if (this.currentAlarmType !== 'none') {
        this.startAlarm(this.currentAlarmType);
      }
    } else {
      this.stopAll();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public updateBpm(bpm: number) {
    this.currentBpm = Math.max(50, Math.min(220, bpm));
    if (!this.isMuted) {
      this.restartDopplerLoop();
    }
  }

  public setAlarm(type: 'none' | 'suspect' | 'pathological') {
    if (this.currentAlarmType === type) return;
    this.currentAlarmType = type;
    if (this.isMuted) return;

    if (type === 'none') {
      if (this.alarmTimer) {
        clearInterval(this.alarmTimer);
        this.alarmTimer = null;
      }
    } else {
      this.startAlarm(type);
    }
  }

  private restartDopplerLoop() {
    if (this.dopplerTimer) {
      clearInterval(this.dopplerTimer);
      this.dopplerTimer = null;
    }
    if (this.isMuted) return;

    const intervalMs = (60 / this.currentBpm) * 1000;
    this.dopplerTimer = setInterval(() => {
      this.playDopplerClick();
    }, intervalMs);
  }

  private playDopplerClick() {
    if (this.isMuted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Lub sound (low freq resonant click)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(140, t);
      osc1.frequency.exponentialRampToValueAtTime(60, t + 0.045);

      gain1.gain.setValueAtTime(0.25 * this.volume, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      osc1.start(t);
      osc1.stop(t + 0.05);

      // Dub sound slightly delayed (typical Doppler ultrasound sound)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(110, t + 0.06);
      osc2.frequency.exponentialRampToValueAtTime(50, t + 0.09);

      gain2.gain.setValueAtTime(0.18 * this.volume, t + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.095);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.start(t + 0.06);
      osc2.stop(t + 0.1);
    } catch (e) {
      // ignore
    }
  }

  private startAlarm(type: 'suspect' | 'pathological') {
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }
    if (this.isMuted) return;

    if (type === 'suspect') {
      // Gentle warning chime every 4 seconds
      this.alarmTimer = setInterval(() => {
        this.playSuspectChime();
      }, 4000);
      this.playSuspectChime();
    } else if (type === 'pathological') {
      // Urgent triple pulse telemetry alarm every 2 seconds
      this.alarmTimer = setInterval(() => {
        this.playPathologicalAlarm();
      }, 2000);
      this.playPathologicalAlarm();
    }
  }

  private playSuspectChime() {
    if (this.isMuted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t); // C5
      osc.frequency.setValueAtTime(659, t + 0.15); // E5

      gain.gain.setValueAtTime(0.3 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.52);
    } catch (e) {}
  }

  private playPathologicalAlarm() {
    if (this.isMuted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Medical 3-beep burst
      const freqs = [880, 880, 880];
      freqs.forEach((freq, idx) => {
        const beepTime = t + idx * 0.14;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, beepTime);

        gain.gain.setValueAtTime(0.45 * this.volume, beepTime);
        gain.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(beepTime);
        osc.stop(beepTime + 0.1);
      });
    } catch (e) {}
  }

  public playSingleAlertTone() {
    this.initContext();
    this.playSuspectChime();
  }

  private stopAll() {
    if (this.dopplerTimer) {
      clearInterval(this.dopplerTimer);
      this.dopplerTimer = null;
    }
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }
  }
}

export const audioTelemetry = new AudioTelemetryService();
