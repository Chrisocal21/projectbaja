const enabled = typeof location !== 'undefined' && /[?&]perf(?:[=&]|$)/.test(location.search);
let metrics = new Map();

export const perfStart = () => enabled ? performance.now() : 0;
export function perfEnd(name, start) {
  if (!enabled) return;
  const ms = performance.now() - start, row = metrics.get(name) || { count: 0, total: 0, max: 0 };
  row.count++; row.total += ms; row.max = Math.max(row.max, ms); metrics.set(name, row);
}
export function takePerfMetrics() {
  const out = [...metrics].sort((a, b) => b[1].max - a[1].max);
  metrics = new Map(); return out;
}
