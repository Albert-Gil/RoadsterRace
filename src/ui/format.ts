/** Race clock shown to players: mm:ss.hh, rounded to the displayed hundredth. */
export const formatTime = (seconds: number) => { const cs = Math.max(0, Math.round(seconds * 100)), minutes = Math.floor(cs / 6000); return `${String(minutes).padStart(2, '0')}:${((cs % 6000) / 100).toFixed(2).padStart(5, '0')}`; };
