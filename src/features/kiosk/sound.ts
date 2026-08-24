export function playFinalPointAlert() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    const playTone = (freq: number, start: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'square'
      gain.gain.setValueAtTime(vol, now + start)
      gain.gain.exponentialRampToValueAtTime(0.01, now + start + dur)
      osc.start(now + start)
      osc.stop(now + start + dur)
    }
    playTone(660, 0, 0.2, 0.4)
    playTone(880, 0.25, 0.2, 0.4)
    playTone(1100, 0.5, 0.5, 0.5)
    setTimeout(() => ctx.close(), 1500)
  } catch {}
  try {
    const u = new SpeechSynthesisUtterance('Final point!')
    u.rate = 0.9; u.pitch = 1.1; u.volume = 1
    speechSynthesis.speak(u)
  } catch {}
}
