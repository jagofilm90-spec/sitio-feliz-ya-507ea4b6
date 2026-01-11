// Tipos de sonido de notificación
export type NotificationSoundType = 'default' | 'urgent' | 'success' | 'error';

// Función para reproducir un sonido de notificación usando Web Audio API
export const playNotificationSound = (type: NotificationSoundType = 'default') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    switch (type) {
      case 'urgent':
        playUrgentSound(audioContext);
        break;
      case 'success':
        playSuccessSound(audioContext);
        break;
      case 'error':
        playErrorSound(audioContext);
        break;
      default:
        playDefaultSound(audioContext);
    }
  } catch (error) {
    console.error('Error al reproducir sonido de notificación:', error);
  }
};

// Sonido por defecto (tono simple)
const playDefaultSound = (audioContext: AudioContext) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
  
  oscillator.onended = () => audioContext.close();
};

// Sonido URGENTE - Para solicitudes de descuento (doble tono alto + vibración)
const playUrgentSound = (audioContext: AudioContext) => {
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  
  // Primer tono - alto y alarmante
  const osc1 = audioContext.createOscillator();
  osc1.connect(gainNode);
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(880, audioContext.currentTime); // A5
  
  // Segundo tono - más alto
  const osc2 = audioContext.createOscillator();
  osc2.connect(gainNode);
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(1100, audioContext.currentTime); // C#6
  
  // Tercer tono - repetición
  const osc3 = audioContext.createOscillator();
  osc3.connect(gainNode);
  osc3.type = 'square';
  osc3.frequency.setValueAtTime(880, audioContext.currentTime); // A5
  
  // Envelope con pulsos
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  
  // Primer pulso
  gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.02);
  gainNode.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.12);
  
  // Segundo pulso
  gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.15);
  gainNode.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.25);
  
  // Tercer pulso
  gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.28);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  // Secuencia de tonos
  osc1.start(audioContext.currentTime);
  osc1.stop(audioContext.currentTime + 0.12);
  
  osc2.start(audioContext.currentTime + 0.15);
  osc2.stop(audioContext.currentTime + 0.25);
  
  osc3.start(audioContext.currentTime + 0.28);
  osc3.stop(audioContext.currentTime + 0.5);
  
  osc3.onended = () => audioContext.close();
  
  // Intentar vibración en móviles
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100, 50, 100]);
  }
};

// Sonido SUCCESS - Para aprobaciones
const playSuccessSound = (audioContext: AudioContext) => {
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  
  // Acorde ascendente agradable
  const osc1 = audioContext.createOscillator();
  osc1.connect(gainNode);
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523, audioContext.currentTime); // C5
  
  const osc2 = audioContext.createOscillator();
  osc2.connect(gainNode);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659, audioContext.currentTime); // E5
  
  const osc3 = audioContext.createOscillator();
  osc3.connect(gainNode);
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(784, audioContext.currentTime); // G5
  
  // Envelope suave y alegre
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + 0.2);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  // Secuencia ascendente
  osc1.start(audioContext.currentTime);
  osc1.stop(audioContext.currentTime + 0.15);
  
  osc2.start(audioContext.currentTime + 0.08);
  osc2.stop(audioContext.currentTime + 0.25);
  
  osc3.start(audioContext.currentTime + 0.16);
  osc3.stop(audioContext.currentTime + 0.5);
  
  osc3.onended = () => audioContext.close();
};

// Sonido ERROR - Para rechazos
const playErrorSound = (audioContext: AudioContext) => {
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  
  // Tono descendente triste
  const oscillator = audioContext.createOscillator();
  oscillator.connect(gainNode);
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.4);
  
  oscillator.onended = () => audioContext.close();
};
