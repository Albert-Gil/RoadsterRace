import type { Ability } from '../core/types';

export class PointerOwnership {
  private owners = new Map<number, { player: number; ability: Ability }>();
  readonly activations = [0, 0, 0, 0];
  readonly cancellations = [0, 0, 0, 0];
  down(pointerId: number, player: number, ability: Ability = 'thrust') {
    if (this.owners.has(pointerId) || player < 0 || player > 3) return false;
    this.owners.set(pointerId, { player, ability }); this.activations[player]++; return true;
  }
  up(pointerId: number, canceled = false) {
    const player = this.owners.get(pointerId)?.player;
    if (player !== undefined && canceled) this.cancellations[player]++;
    this.owners.delete(pointerId); return player;
  }
  active(player: number, ability?: Ability) { return [...this.owners.values()].filter(value => value.player === player && (!ability || value.ability === ability)).length; }
  owner(pointerId: number) { return this.owners.get(pointerId)?.player; }
  ability(pointerId: number) { return this.owners.get(pointerId)?.ability; }
  clear() { for (const id of this.owners.keys()) this.up(id, true); }
}
