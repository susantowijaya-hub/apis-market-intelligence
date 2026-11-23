export interface TreemapNodeInput<T> {
  id: string;
  weight: number;
  data: T;
}

export interface TreemapRect<T> {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  data: T;
}

interface LayoutBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function worstAspectRatio(rowAreas: number[], shortSide: number): number {
  if (rowAreas.length === 0 || shortSide <= 0) return Infinity;
  let sum = 0;
  let maxVal = 0;
  let minVal = Infinity;
  for (const a of rowAreas) {
    sum += a;
    if (a > maxVal) maxVal = a;
    if (a < minVal) minVal = a;
  }
  if (sum <= 0 || minVal <= 0) return Infinity;
  const s2 = shortSide * shortSide;
  return Math.max((s2 * maxVal) / (sum * sum), (sum * sum) / (s2 * minVal));
}

function layoutRow<T>(
  row: Array<TreemapNodeInput<T> & { area: number }>,
  box: LayoutBox,
  out: TreemapRect<T>[]
): LayoutBox {
  const rowArea = row.reduce((acc, item) => acc + item.area, 0);
  if (rowArea <= 0 || box.w <= 0 || box.h <= 0) return box;

  const horizontalSplit = box.w >= box.h;
  if (horizontalSplit) {
    const stripWidth = rowArea / box.h;
    let cursorY = box.y;
    for (const item of row) {
      const h = item.area / stripWidth;
      out.push({
        id: item.id,
        x: box.x,
        y: cursorY,
        w: stripWidth,
        h,
        data: item.data,
      });
      cursorY += h;
    }
    return {
      x: box.x + stripWidth,
      y: box.y,
      w: Math.max(0, box.w - stripWidth),
      h: box.h,
    };
  }

  const stripHeight = rowArea / box.w;
  let cursorX = box.x;
  for (const item of row) {
    const w = item.area / stripHeight;
    out.push({
      id: item.id,
      x: cursorX,
      y: box.y,
      w,
      h: stripHeight,
      data: item.data,
    });
    cursorX += w;
  }
  return {
    x: box.x,
    y: box.y + stripHeight,
    w: box.w,
    h: Math.max(0, box.h - stripHeight),
  };
}

/**
 * Bruls-Huizing-van Wijk Squarified Treemap returning boxes in [0..width] x [0..height] coordinates.
 */
export function computeSquarifiedTreemap<T>(
  items: TreemapNodeInput<T>[],
  bounds: LayoutBox = { x: 0, y: 0, w: 100, h: 100 }
): TreemapRect<T>[] {
  const valid = items
    .filter((i) => Number.isFinite(i.weight) && i.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  if (valid.length === 0 || bounds.w <= 0 || bounds.h <= 0) return [];

  const totalWeight = valid.reduce((acc, i) => acc + i.weight, 0);
  const totalArea = bounds.w * bounds.h;
  const scaled = valid.map((i) => ({
    ...i,
    area: (i.weight / totalWeight) * totalArea,
  }));

  const out: TreemapRect<T>[] = [];
  let remaining = { ...bounds };
  let currentRow: Array<TreemapNodeInput<T> & { area: number }> = [];

  for (const node of scaled) {
    const shortSide = Math.min(remaining.w, remaining.h);
    if (shortSide <= 0) break;

    if (currentRow.length === 0) {
      currentRow.push(node);
      continue;
    }

    const currAreas = currentRow.map((r) => r.area);
    const nextAreas = [...currAreas, node.area];
    if (worstAspectRatio(nextAreas, shortSide) <= worstAspectRatio(currAreas, shortSide)) {
      currentRow.push(node);
    } else {
      remaining = layoutRow(currentRow, remaining, out);
      currentRow = [node];
    }
  }

  if (currentRow.length > 0 && remaining.w > 0 && remaining.h > 0) {
    layoutRow(currentRow, remaining, out);
  }

  return out;
}
