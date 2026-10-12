import { MUSICPACKS } from '../constants/gameData';

let actx = null;
let musicTimer = null;

export function ensureAudio() {
  if (!actx) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) actx = new AudioCtx();
    } catch {
      // AudioContext not supported
    }
  }
  if (actx && actx.state === 'suspended') {
    actx.resume().catch(() => {});
  }
}

export function tone(freq, dur, type = 'sine', gainStart = 0.12, delay = 0, soundEnabled = true) {
  if (!actx || !soundEnabled) return;
  try {
    const t0 = actx.currentTime + delay;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(gainStart, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // audio output error ignored
  }
}

export function noiseBurst(dur, gainStart = 0.15, soundEnabled = true) {
  if (!actx || !soundEnabled) return;
  try {
    const bufferSize = Math.floor(actx.sampleRate * dur);
    const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = actx.createBufferSource();
    src.buffer = buffer;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(gainStart, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    src.connect(gain);
    gain.connect(actx.destination);
    src.start();
  } catch {
    // audio output error ignored
  }
}

export function playSound(name, soundEnabled = true, extra = {}) {
  if (!soundEnabled) return;
  ensureAudio();

  switch (name) {
    case 'pick':
      tone(520, 0.06, 'sine', 0.08, 0, soundEnabled);
      break;
    case 'place':
      tone(180, 0.08, 'square', 0.10, 0, soundEnabled);
      break;
    case 'tap':
      tone(700, 0.05, 'sine', 0.09, 0, soundEnabled);
      tone(950, 0.06, 'sine', 0.06, 0.03, soundEnabled);
      break;
    case 'newSet':
      [520, 660, 800].forEach((f, i) => tone(f, 0.12, 'sine', 0.09, i * 0.09, soundEnabled));
      break;
    case 'clear': {
      const lines = extra.lines || 1;
      noiseBurst(0.28, 0.17, soundEnabled);
      const base = 300 + lines * 90;
      tone(base, 0.24, 'sawtooth', 0.12, 0, soundEnabled);
      tone(base * 1.5, 0.22, 'sine', 0.1, 0.03, soundEnabled);
      if (lines > 1) tone(base * 2, 0.26, 'sine', 0.1, 0.08, soundEnabled);
      if (lines > 2) tone(base * 2.6, 0.3, 'sine', 0.1, 0.14, soundEnabled);
      [1400, 1800, 2200].forEach((f, i) => tone(f, 0.14, 'sine', 0.06, 0.02 + i * 0.045, soundEnabled));
      break;
    }
    case 'levelWin':
      [500, 650, 800, 1050, 1300].forEach((f, i) => tone(f, 0.18, 'sine', 0.11, i * 0.1, soundEnabled));
      break;
    case 'lose':
      tone(220, 0.3, 'sawtooth', 0.1, 0, soundEnabled);
      tone(160, 0.35, 'sawtooth', 0.09, 0.08, soundEnabled);
      break;
    case 'powerup':
      tone(700, 0.1, 'triangle', 0.1, 0, soundEnabled);
      tone(950, 0.12, 'triangle', 0.09, 0.07, soundEnabled);
      break;
    case 'splashStep':
      if (extra.step !== undefined) {
        tone(480 + extra.step * 70, 0.08, 'sine', 0.1, 0, soundEnabled);
      }
      break;
    case 'splashComplete':
      [1200, 1500, 1900].forEach((f, i) => tone(f, 0.16, 'sine', 0.09, i * 0.05, soundEnabled));
      break;
    default:
      break;
  }
}

export function startMusic(musicPackKey = 'chill', musicEnabled = true) {
  stopMusic();
  if (!musicEnabled) return;
  ensureAudio();
  if (!actx) return;

  const pack = MUSICPACKS[musicPackKey] || MUSICPACKS.chill;
  let step = 0;

  try {
    const master = actx.createGain();
    master.gain.value = 0.05;
    master.connect(actx.destination);

    musicTimer = setInterval(() => {
      if (!actx) return;
      const f = pack.pattern[step % pack.pattern.length];
      const t0 = actx.currentTime;
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = pack.type;
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.4, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.55);
      step++;
    }, pack.step);
  } catch {
    // audio start error ignored
  }
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function vibrate(pattern, hapticsEnabled = true) {
  if (hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // vibration failure ignored
    }
  }
}
