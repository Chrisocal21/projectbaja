export const WORLD = 400;
export const TERRAIN_SEGMENTS = 500;
const CELL = WORLD / TERRAIN_SEGMENTS;
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function heightAtVertex(x, z) {
  let h = Math.sin(x * 0.045) * Math.cos(z * 0.04) * 4.5
    + Math.sin(x * 0.11 + 1.3) * Math.sin(z * 0.09) * 1.6
    + Math.sin(x * 0.31) * Math.cos(z * 0.27 + 2) * 0.35
    + Math.sin(x * 1.3 + z * 0.4) * Math.sin(z * 1.1 - x * 0.3) * 0.07;
  h *= smooth(10, 32, Math.hypot(x, z));
  if (z > 20 && z < 36 && Math.abs(x) < 8) h += (z - 20) / 16 * 2.2 * smooth(8, 5, Math.abs(x));
  if (x > 25 && x < 40 && z > -40 && z < 40) {
    h += Math.sin(z * 1.1) * 0.35 * smooth(25, 28, x) * smooth(40, 37, x)
      * smooth(-40, -36, z) * smooth(40, 36, z);
  }
  return h;
}

const heights = new Float32Array((TERRAIN_SEGMENTS + 1) ** 2);
for (let row = 0; row <= TERRAIN_SEGMENTS; row++) {
  for (let col = 0; col <= TERRAIN_SEGMENTS; col++) {
    heights[row * (TERRAIN_SEGMENTS + 1) + col] = heightAtVertex(col * CELL - WORLD / 2, row * CELL - WORLD / 2);
  }
}

export const terrainVertexHeight = (col, row) => heights[row * (TERRAIN_SEGMENTS + 1) + col];

// Use the same diagonal and vertex heights as PlaneGeometry, including the ramp lip.
export function terrainHeight(x, z) {
  const gx = Math.min(TERRAIN_SEGMENTS, Math.max(0, (x + WORLD / 2) / CELL));
  const gz = Math.min(TERRAIN_SEGMENTS, Math.max(0, (z + WORLD / 2) / CELL));
  const col = Math.min(TERRAIN_SEGMENTS - 1, Math.floor(gx));
  const row = Math.min(TERRAIN_SEGMENTS - 1, Math.floor(gz));
  const u = gx - col, v = gz - row;
  const a = terrainVertexHeight(col, row), b = terrainVertexHeight(col, row + 1);
  const d = terrainVertexHeight(col + 1, row), c = terrainVertexHeight(col + 1, row + 1);
  return u + v <= 1 ? a + (d - a) * u + (b - a) * v
    : c + (b - c) * (1 - u) + (d - c) * (1 - v);
}
