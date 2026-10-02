export function playChyusenNotificationSound(urgent: boolean) {
  if (typeof window === "undefined") return;
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return;
  try {
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = urgent ? "square" : "sine";
    oscillator.frequency.setValueAtTime(urgent ? 880 : 660, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (urgent ? 0.38 : 0.24));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (urgent ? 0.4 : 0.26));
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Âm thanh là tiện ích bổ sung và không được làm gián đoạn giao diện nếu trình duyệt chặn Web Audio.
  }
}
