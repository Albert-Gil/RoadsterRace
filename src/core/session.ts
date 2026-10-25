/** `tutorial` is a guided single-car lap; it never creates records or tournaments. */
export type GameMode = 'solo-race' | 'multiplayer' | 'time-trial' | 'tutorial';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type DriverController = 'human' | 'computer';
export interface SessionOptions { mode: GameMode; difficulty: Difficulty; seed: number }
export const CPU_DRIVERS = [
  { name: 'Apex', paint: 'cobalt' }, { name: 'Vector', paint: 'solar' }, { name: 'Pulse', paint: 'verdant' },
] as const;
export const humanCount = (mode: GameMode, count: number) => mode === 'multiplayer' ? count : 1;
export const racerCount = (mode: GameMode, count: number) => mode === 'solo-race' ? 4 : humanCount(mode,count);

export const controllerFor=(mode:GameMode,index:number):DriverController=>mode==='solo-race'&&index>0?'computer':'human';
