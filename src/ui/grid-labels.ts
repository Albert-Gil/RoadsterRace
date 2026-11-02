export interface ScreenPoint { x: number; y: number }
/** One car on the starting grid, in screen pixels: its centre and the middle of its rear bumper. */
export interface GridLabelAnchor { car: ScreenPoint; tail: ScreenPoint }

/**
 * Places the numbered pre-start chips just behind their cars, in a line across the grid that keeps
 * the cars' order, at least `spacing` px apart so side-by-side cars never hide each other's number.
 * Chips move as little as that spacing allows (least-squares, pool-adjacent-violators).
 */
export function gridLabelPositions(anchors: GridLabelAnchor[], spacing = 24, clearance = 13): ScreenPoint[] {
  if (!anchors.length) return [];
  let bx = 0, by = 0;
  for (const a of anchors) { bx += a.tail.x - a.car.x; by += a.tail.y - a.car.y; }
  const length = Math.hypot(bx, by);
  // Cars seen end-on (or not at all) fall back to chips above them.
  if (length < 1e-6) { bx = 0; by = -1; } else { bx /= length; by /= length; }
  const ax = -by, ay = bx;
  const items = anchors.map((a, index) => ({ index, along: a.tail.x * ax + a.tail.y * ay, back: a.tail.x * bx + a.tail.y * by + clearance }))
    .sort((a, b) => a.along - b.along || a.index - b.index);
  // Minimise total movement subject to consecutive chips being `spacing` apart: with
  // q_k = placed_k − k·spacing the constraint is q non-decreasing, an isotonic regression.
  const blocks: { sum: number; count: number }[] = [];
  items.forEach((item, k) => {
    blocks.push({ sum: item.along - k * spacing, count: 1 });
    while (blocks.length > 1 && blocks.at(-2)!.sum / blocks.at(-2)!.count > blocks.at(-1)!.sum / blocks.at(-1)!.count) {
      const last = blocks.pop()!; blocks.at(-1)!.sum += last.sum; blocks.at(-1)!.count += last.count;
    }
  });
  const result = new Array<ScreenPoint>(anchors.length);
  let k = 0;
  for (const block of blocks) for (let j = 0; j < block.count; j++, k++) {
    const along = block.sum / block.count + k * spacing, back = items[k].back;
    result[items[k].index] = { x: along * ax + back * bx, y: along * ay + back * by };
  }
  return result;
}
