// Sound utility for playing various app sounds

export const playPingSound = () => {
  try {
    // Create a bell-like sound with harmonics using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create multiple oscillators for harmonics (fundamental + overtones)
    const fundamental = audioContext.createOscillator();
    const harmonic2 = audioContext.createOscillator();
    const harmonic3 = audioContext.createOscillator();
    
    const gainNode = audioContext.createGain();
    const gain2 = audioContext.createGain();
    const gain3 = audioContext.createGain();
    
    // Connect oscillators through their gain nodes
    fundamental.connect(gainNode);
    harmonic2.connect(gain2);
    harmonic3.connect(gain3);
    
    gainNode.connect(audioContext.destination);
    gain2.connect(audioContext.destination);
    gain3.connect(audioContext.destination);
    
    // Bell-like frequencies (fundamental + harmonics)
    const baseFreq = 523; // C5 note
    fundamental.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
    harmonic2.frequency.setValueAtTime(baseFreq * 2.5, audioContext.currentTime); // Not perfect harmonic for bell character
    harmonic3.frequency.setValueAtTime(baseFreq * 4.2, audioContext.currentTime);
    
    // Bell-like amplitude envelope with natural decay
    const now = audioContext.currentTime;
    const duration = 1.5;
    
    // Fundamental tone (strongest)
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    // Second harmonic (medium strength, faster decay)
    gain2.gain.setValueAtTime(0.08, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);
    
    // Third harmonic (weakest, fastest decay for shimmer)
    gain3.gain.setValueAtTime(0.04, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.3);
    
    // Start all oscillators
    fundamental.start(now);
    harmonic2.start(now);
    harmonic3.start(now);
    
    // Stop all oscillators
    fundamental.stop(now + duration);
    harmonic2.stop(now + duration);
    harmonic3.stop(now + duration);
  } catch (error) {
    console.warn('Could not play sound:', error);
  }
};

// Add more sounds here as needed:
// export const playSuccessSound = () => { ... }
// export const playWarningSound = () => { ... }