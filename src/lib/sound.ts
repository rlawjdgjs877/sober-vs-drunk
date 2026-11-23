// Web Audio API로 직접 합성하는 효과음 (외부 음원 파일 없음)
// 브라우저 자동재생 정책 때문에 첫 터치/클릭 전에는 소리가 나지 않으므로,
// 그 전에 요청된 소리는 첫 입력 순간에 재생합니다.

export type Sfx =
  | "click"
  | "count"
  | "go"
  | "hit"
  | "correct"
  | "wrong"
  | "key"
  | "complete"
  | "intro"
  | "vs"
  | "win"
  | "lose"
  | "draw";

const MUTE_KEY = "sober-vs-drunk:muted";
/** 배경음악 음량 (효과음 대비). 1.0 = 효과음과 비슷한 크기 */
const BGM_VOLUME = 1.1;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private pending: Sfx | null = null;
  private lastKey = 0;
  muted = (() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  })();
  private listeners = new Set<(m: boolean) => void>();

  constructor() {
    if (typeof window === "undefined") return;
    const unlock = () => {
      const ctx = this.ensure();
      if (!ctx) return;
      ctx.resume().then(() => {
        if (this.pending) {
          const p = this.pending;
          this.pending = null;
          this.play(p);
        }
      });
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
  }

  private ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {
      /* noop */
    }
    this.listeners.forEach((l) => l(m));
    if (this.ctx && this.bgmGain && this.bgmTimer != null) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
      this.bgmGain.gain.linearRampToValueAtTime(m ? 0 : BGM_VOLUME, now + 0.2);
    }
  }

  // ───────── 긴박한 배경음악 (실시간 합성 시퀀서) ─────────
  // A단조 4마디 루프: 펄스 베이스 + 킥 + 하이햇 + 째깍 초침, 게임이 진행될수록 템포와 악기가 늘어남
  private bgmGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmNext = 0;
  private bgmLevel = 0;
  private bgmStopAt: number | null = null;

  startBgm(level: number) {
    const ctx = this.ensure();
    if (!ctx) return;
    this.bgmLevel = Math.max(0, Math.min(2, level));
    if (!this.bgmGain) {
      this.bgmGain = ctx.createGain();
      this.bgmGain.connect(this.master!);
    }
    const g = this.bgmGain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(Math.max(g.value, 0.0001), ctx.currentTime);
    g.linearRampToValueAtTime(this.muted ? 0 : BGM_VOLUME, ctx.currentTime + 0.3);
    if (this.bgmStopAt) {
      clearTimeout(this.bgmStopAt);
      this.bgmStopAt = null;
    }
    if (this.bgmTimer != null) return; // 이미 재생 중이면 강도만 변경
    ctx.resume().catch(() => {});
    this.bgmStep = 0;
    this.bgmNext = ctx.currentTime + 0.05;
    this.bgmTimer = window.setInterval(() => this.scheduleBgm(), 25);
  }

  stopBgm(fade = 0.5) {
    if (this.bgmTimer == null || !this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    const g = this.bgmGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + fade);
    if (this.bgmStopAt) clearTimeout(this.bgmStopAt);
    this.bgmStopAt = window.setTimeout(() => {
      if (this.bgmTimer != null) clearInterval(this.bgmTimer);
      this.bgmTimer = null;
      this.bgmStopAt = null;
    }, fade * 1000 + 50);
  }

  private scheduleBgm() {
    const ctx = this.ctx;
    if (!ctx || !this.bgmGain) return;
    const bpm = [136, 146, 158][this.bgmLevel];
    const sixteenth = 60 / bpm / 4;
    // 탭이 백그라운드였다가 돌아오면 밀린 음을 몰아서 내지 않도록 건너뜀
    if (this.bgmNext < ctx.currentTime - 0.2) this.bgmNext = ctx.currentTime + 0.05;
    while (this.bgmNext < ctx.currentTime + 0.12) {
      if (!this.muted) this.bgmNote(this.bgmStep, this.bgmNext, sixteenth);
      this.bgmNext += sixteenth;
      this.bgmStep = (this.bgmStep + 1) % 64;
    }
  }

  private bgmNote(step: number, t: number, len: number) {
    const out = this.bgmGain!;
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const lvl = this.bgmLevel;
    // A - A - F - E (마지막 마디 E가 긴장감을 만들고 다시 A로 해결)
    const roots = [110, 110, 87.31, 82.41];
    const root = roots[bar];

    // 펄스 베이스: 8분음표 (레벨 2부터 16분음표 질주)
    if (s % 2 === 0 || lvl >= 2) {
      const f = s === 14 && bar === 3 ? root * 1.5 : s % 8 === 6 ? root * 2 : root;
      this.tone(f, t, len * 0.9, { type: "sawtooth", gain: 0.07, dest: out, lowpass: 420 + lvl * 160 });
    }
    // 킥: 4분음표
    if (s % 4 === 0) this.tone(130, t, 0.18, { type: "sine", gain: 0.32, to: 42, dest: out });
    // 스네어/클랩: 2, 4박 (레벨 1부터)
    if (lvl >= 1 && (s === 4 || s === 12)) this.noise(t, 0.12, { freq: 1800, q: 0.7, gain: 0.12, dest: out });
    // 하이햇: 엇박 8분 (레벨 1부터 16분)
    if (s % 4 === 2 || (lvl >= 1 && s % 2 === 1)) this.noise(t, 0.035, { freq: 8000, type: "highpass", gain: lvl >= 1 ? 0.05 : 0.06, dest: out });
    // 째깍 초침: 매 박마다 (시간에 쫓기는 느낌)
    if (s % 4 === 0) this.tone(s === 0 ? 2100 : 1600, t + len * 2, 0.025, { type: "square", gain: 0.035, dest: out });
    // 긴장감 있는 고음 아르페지오 (레벨 2)
    if (lvl >= 2 && s % 2 === 0) {
      const arp = [4, 3, 2.4, 3][(s / 2) % 4];
      this.tone(root * arp, t, len * 1.6, { type: "triangle", gain: 0.035, dest: out });
    }
    // 마디 끝 라이저 (4마디마다)
    if (bar === 3 && s === 8) this.noise(t, len * 8, { freq: 500, to: 6000, q: 1.2, gain: 0.06, dest: out });
  }

  subscribe(fn: (m: boolean) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** 단일 음 */
  private tone(
    freq: number,
    start: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; to?: number; attack?: number; dest?: AudioNode; lowpass?: number } = {},
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, start);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
    const peak = opts.gain ?? 0.3;
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + a);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    if (opts.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = opts.lowpass;
      osc.connect(f).connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(opts.dest ?? this.master!);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  /** 노이즈 (휙, 쿵, 타자 소리) */
  private noise(
    start: number,
    dur: number,
    opts: { freq?: number; to?: number; q?: number; gain?: number; type?: BiquadFilterType; dest?: AudioNode } = {},
  ) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? "bandpass";
    f.frequency.setValueAtTime(opts.freq ?? 1000, start);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f).connect(g).connect(opts.dest ?? this.master!);
    src.start(start, Math.random() * 0.5);
    src.stop(start + dur + 0.02);
  }

  play(name: Sfx) {
    if (this.muted || typeof window === "undefined") return;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state !== "running") {
      // 아직 사용자 입력 전: 화면 연출용 소리만 첫 입력 때 재생
      if (name === "intro" || name === "vs") this.pending = name;
      ctx.resume().catch(() => {});
      return;
    }
    const t = ctx.currentTime + 0.005;
    switch (name) {
      case "click":
        this.tone(520, t, 0.06, { type: "triangle", gain: 0.12, to: 680 });
        break;
      case "count":
        this.tone(660, t, 0.12, { type: "square", gain: 0.08 });
        break;
      case "go":
        this.tone(880, t, 0.25, { type: "square", gain: 0.07 });
        this.tone(1320, t, 0.25, { type: "triangle", gain: 0.1 });
        break;
      case "hit":
        this.tone(900, t, 0.08, { type: "sine", gain: 0.25, to: 1500 });
        this.tone(1800, t + 0.04, 0.1, { type: "sine", gain: 0.12 });
        break;
      case "correct":
        this.tone(988, t, 0.09, { type: "triangle", gain: 0.2 });
        this.tone(1319, t + 0.07, 0.14, { type: "triangle", gain: 0.2 });
        break;
      case "wrong":
        this.tone(220, t, 0.22, { type: "sawtooth", gain: 0.12, to: 140 });
        this.tone(233, t, 0.22, { type: "square", gain: 0.05, to: 150 });
        break;
      case "key": {
        const now = performance.now();
        if (now - this.lastKey < 35) return; // 연속 입력 시 과도한 중첩 방지
        this.lastKey = now;
        this.noise(t, 0.03, { freq: 3500 + Math.random() * 1500, q: 2, gain: 0.12, type: "bandpass" });
        break;
      }
      case "complete":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.07, 0.18, { type: "triangle", gain: 0.16 }));
        break;
      case "intro":
        // 양쪽에서 휙 → VS 쿵
        this.noise(t, 0.35, { freq: 400, to: 3000, q: 0.8, gain: 0.18 });
        this.noise(t + 0.15, 0.35, { freq: 600, to: 3500, q: 0.8, gain: 0.15 });
        this.tone(110, t + 0.5, 0.45, { type: "sine", gain: 0.45, to: 45 });
        this.noise(t + 0.5, 0.25, { freq: 1800, q: 0.6, gain: 0.2, type: "highpass" });
        this.tone(659, t + 0.55, 0.3, { type: "triangle", gain: 0.1 });
        this.tone(988, t + 0.55, 0.35, { type: "triangle", gain: 0.08 });
        break;
      case "vs":
        this.noise(t, 0.3, { freq: 300, to: 4000, q: 0.7, gain: 0.2 });
        this.tone(90, t + 0.28, 0.6, { type: "sine", gain: 0.55, to: 35 });
        this.noise(t + 0.28, 0.4, { freq: 2500, q: 0.5, gain: 0.25, type: "highpass" });
        this.tone(1568, t + 0.3, 0.5, { type: "square", gain: 0.04 });
        break;
      case "win":
        [523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.1, 0.16, { type: "square", gain: 0.07 }));
        this.tone(1047, t + 0.3, 0.5, { type: "square", gain: 0.08 });
        this.tone(1319, t + 0.3, 0.5, { type: "triangle", gain: 0.1 });
        break;
      case "lose":
        // 뿌-뿌-뿌-뿌~ (트롬본 느낌 하강)
        [392, 370, 349].forEach((f, i) => this.tone(f, t + i * 0.28, 0.24, { type: "sawtooth", gain: 0.09 }));
        this.tone(330, t + 0.84, 0.7, { type: "sawtooth", gain: 0.09, to: 300 });
        break;
      case "draw":
        this.tone(587, t, 0.18, { type: "triangle", gain: 0.15 });
        this.tone(587, t + 0.2, 0.3, { type: "triangle", gain: 0.15 });
        break;
    }
  }
}

export const sound = new SoundEngine();
