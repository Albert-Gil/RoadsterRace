export class PointerOwnership {
  private owners = new Map<number, number>();
  readonly activations = [0, 0, 0, 0];
  readonly cancellations = [0, 0, 0, 0];
  down(pointerId: number, player: number) {
    if (this.owners.has(pointerId) || player < 0 || player > 3) return false;
    this.owners.set(pointerId, player); this.activations[player]++; return true;
  }
  up(pointerId: number, canceled = false) {
    const player = this.owners.get(pointerId);
    if (player !== undefined && canceled) this.cancellations[player]++;
    this.owners.delete(pointerId); return player;
  }
  active(player: number) { return [...this.owners.values()].filter(value => value === player).length; }
  owner(pointerId: number) { return this.owners.get(pointerId); }
  clear() { for (const id of this.owners.keys()) this.up(id, true); }
}
