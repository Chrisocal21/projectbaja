// Where each thing in a load is drawn (pure): two rows side by side, running back from the front; when both rows are
// full the load starts a new layer on top. items: [{ d: length along the row }] -> same objects with { side, along (its centre), layer }.
export function stackCargo(items, run, gap) {
  const rows = [{ layer: 0, len: 0 }, { layer: 0, len: 0 }];
  return items.map(item => {
    const place = r => (r.len > 0 && r.len + item.d > run ? { layer: r.layer + 1, len: 0 } : r);
    const [a, b] = rows.map(place), side = b.layer < a.layer || (b.layer === a.layer && b.len < a.len) ? 1 : 0, r = side ? b : a;
    rows[side] = { layer: r.layer, len: r.len + item.d + gap };
    return { ...item, side, along: r.len + item.d / 2, layer: r.layer };
  });
}
