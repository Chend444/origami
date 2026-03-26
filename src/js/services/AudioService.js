export class AudioService {
  // Simple arrival beep using WebAudio.
  // We create a short-lived oscillator each time to avoid keeping state around.
  beep(durationMs = 180, frequencyHz = 880) {
    const AudioContextRef = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextRef) {
      // Older/unsupported browsers: just silently skip sound.
      return;
    }

    const audioContext = new AudioContextRef();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequencyHz;
    gainNode.gain.value = 0.07;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Kick off and clean up.
    oscillator.start();
    oscillator.stop(audioContext.currentTime + durationMs / 1000);
    oscillator.onended = () => {
      audioContext.close();
    };
  }
}
