class AudioFx {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    getContext() {
        if (typeof window === 'undefined') return null;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        if (!this.ctx) {
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    playTone(freq, type = 'sine', duration = 0.1, startVol = 0.2, endFreq = null) {
        if (this.muted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        if (endFreq) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(startVol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    playPlant() {
        this.playTone(320, 'triangle', 0.08, 0.18, 560);
    }

    playSeedCollect() {
        this.playTone(784, 'sine', 0.12, 0.22, 1174);
    }

    playDodge() {
        this.playTone(440, 'sine', 0.14, 0.25, 880);
    }

    playDivert() {
        this.playTone(520, 'triangle', 0.12, 0.2, 340);
    }

    playRefuge() {
        this.playTone(587.33, 'sine', 0.18, 0.22, 880);
    }

    playWaveClear() {
        const ctx = this.getContext();
        if (!ctx || this.muted) return;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'sine', 0.2, 0.18, freq * 1.05);
            }, idx * 75);
        });
    }
}

export const audioFx = new AudioFx();
