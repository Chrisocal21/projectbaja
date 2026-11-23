// Which state or country a spot is in (PURE): for the minimap's region label. Real geography, approximate: the US-Mexico border is a few straight
// pieces through Tijuana/San Ysidro, Calexico, the Colorado River and San Luis; Baja California Sur starts at the 28th parallel; the Colorado River
// and the Gulf split Baja from Sonora and Arizona. Good for a label, not a survey.
const BORDER = [[-117.2, 32.534], [-117.03, 32.543], [-115.5, 32.67], [-114.72, 32.718]];   // [lon, lat] west to the Colorado River
const borderLat = lon => { if (lon >= -114.72) return 32.49; if (lon <= BORDER[0][0]) return BORDER[0][1]; for (let i = 1; i < BORDER.length; i++) if (lon <= BORDER[i][0]) { const [x0, y0] = BORDER[i - 1], [x1, y1] = BORDER[i]; return y0 + (y1 - y0) * (lon - x0) / (x1 - x0); } return 32.718; };
/** the middle of the Gulf of California, [lat, lon] north to south: land east of it is the mainland (Sonora), west of it is the peninsula */
const GULF = [[32.49, -114.72], [31, -114.4], [29, -112.8], [28, -112], [27, -111.4], [26, -110.6], [24, -109.3]];
const gulfLon = lat => { if (lat >= GULF[0][0]) return GULF[0][1]; for (let i = 1; i < GULF.length; i++) if (lat >= GULF[i][0]) { const [y0, x0] = GULF[i - 1], [y1, x1] = GULF[i]; return x0 + (x1 - x0) * (lat - y0) / (y1 - y0); } return GULF[GULF.length - 1][1]; };
/** world (x,z) -> [lat, lon] using the map's projection (border.json meta: { home: [lat0, lon0], hScale }) */
export const unproject = (x, z, meta) => { const [lat0, lon0] = meta.home; return [lat0 - z / (110574 * meta.hScale), lon0 + x / (111320 * Math.cos(lat0 * Math.PI / 180) * meta.hScale)]; };
/** -> { name, country: 'USA' | 'MEX' } */
export function regionAt(lat, lon) {
  if (lat >= borderLat(lon)) return { name: lon > -114.72 ? 'Arizona' : 'California', country: 'USA' };
  if (lon > gulfLon(lat)) return { name: lat >= 26.5 ? 'Sonora' : 'Sinaloa', country: 'MEX' };
  return { name: lat < 28 ? 'Baja California Sur' : 'Baja California', country: 'MEX' };
}
