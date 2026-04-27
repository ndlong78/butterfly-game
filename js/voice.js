import { VOICE_TEXTS } from './config.js';

let _selectedVoice = null;
let _onVoicesChanged = null;
let _audioContext = null;
let _audioUnlocked = false;

function pickVoice(voices) {
  if (!voices || voices.length === 0) {
    return null;
  }

  const lowerNameIncludes = (voice, keywords) => {
    const name = (voice.name || '').toLowerCase();
    return keywords.some((keyword) => name.includes(keyword));
  };

  return (
    voices.find((voice) => voice.lang === 'vi-VN') ||
    voices.find((voice) => (voice.lang || '').toLowerCase().startsWith('vi')) ||
    voices.find((voice) => lowerNameIncludes(voice, ['female', 'woman', 'nữ'])) ||
    voices[0]
  );
}

export function initVoice() {
  const voices = window.speechSynthesis.getVoices();

  if (voices.length > 0) {
    _selectedVoice = pickVoice(voices);
    window.speechSynthesis.onvoiceschanged = null;
    _onVoicesChanged = null;
  } else {
    _onVoicesChanged = () => {
      _selectedVoice = pickVoice(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.onvoiceschanged = _onVoicesChanged;
  }
}

export function destroyVoice() {
  window.speechSynthesis.cancel();
  if (window.speechSynthesis.onvoiceschanged === _onVoicesChanged) {
    window.speechSynthesis.onvoiceschanged = null;
  }
  _onVoicesChanged = null;

  if (_audioContext && _audioContext.state !== 'closed') {
    _audioContext.close();
  }
  _audioContext = null;
  _audioUnlocked = false;
}

export async function unlockAudio() {
  if (_audioUnlocked) {
    return true;
  }

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) {
    _audioUnlocked = true;
    return true;
  }

  if (!_audioContext) {
    _audioContext = new Ctx();
  }

  if (_audioContext.state === 'suspended') {
    await _audioContext.resume();
  }

  _audioUnlocked = _audioContext.state === 'running';
  return _audioUnlocked;
}

export function speak(textKey) {
  const text = VOICE_TEXTS[textKey];
  if (!text) {
    return Promise.resolve();
  }

  return speakRaw(text);
}

export function speakRaw(text) {
  if (!_audioUnlocked) {
    return Promise.resolve();
  }

  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = _selectedVoice;
  utt.rate = 0.85;
  utt.pitch = 1.1;
  utt.volume = 1.0;
  utt.lang = 'vi-VN';

  return new Promise((resolve, reject) => {
    utt.onend = resolve;
    utt.onerror = reject;
    window.speechSynthesis.speak(utt);
  });
}
