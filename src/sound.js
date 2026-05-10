// src/sound.js

const sounds = {};
let globalVolume = 1.0;
let isEnabled = true;

export function loadSound(id, path) {
  // The browser natively handles decoding .ogg, .wav, .mp3, etc.
  sounds[id] = new Audio(path);
}

export function playSound(id) {
  if (!isEnabled || !sounds[id]) {
    if (!sounds[id]) console.warn(`MorFlash: unknown sound id '${id}'`);
    return;
  }

  // We clone the audio node before playing. 
  // This allows the same sound to overlap if played rapidly
  const clip = sounds[id].cloneNode();
  
  // HTML5 audio volume only goes from 0.0 to 1.0
  clip.volume = Math.min(Math.max(globalVolume, 0.0), 1.0);
  
  clip.play().catch(err => console.error(`MorFlash: failed to play '${id}'`, err));
}

export function setVolume(volume) {
  globalVolume = volume;
}

export function setEnabled(enabled) {
  isEnabled = Boolean(enabled);
}