// Geographic city centres, separate from the fictional Baja County sites.
// Coordinates: GeoNames and CICESE tide stations; projected with west_dem.py's
// equirectangular origin and scale from border.json.
export const REAL_PLACES = [
  { name: 'Los Angeles', lat: 34.052, lon: -118.244, zoom: 1 },
  { name: 'San Diego', lat: 32.715, lon: -117.161, zoom: 1 },
  { name: 'Tijuana', lat: 32.534, lon: -117.018, zoom: 1 },
  { name: 'Ensenada', lat: 31.860, lon: -116.606, zoom: 1 },
  { name: 'San Quintín', lat: 30.484, lon: -115.977, zoom: 2 },
  { name: 'Guerrero Negro', lat: 27.960, lon: -114.056, zoom: 1 },
  { name: 'Santa Rosalía', lat: 27.340, lon: -112.267, zoom: 3 },
  { name: 'Mulegé', lat: 26.890, lon: -111.983, zoom: 3 },
  { name: 'Loreto', lat: 26.012, lon: -111.348, zoom: 1 },
  { name: 'La Paz', lat: 24.133, lon: -110.300, zoom: 1 },
  { name: 'Todos Santos', lat: 23.447, lon: -110.225, zoom: 3 },
  { name: 'Cabo San Lucas', lat: 22.883, lon: -109.900, zoom: 1 },
  { name: 'El Centro', lat: 32.792, lon: -115.563, zoom: 3 },
  { name: 'Calexico', lat: 32.679, lon: -115.499, zoom: 3 },
  { name: 'Mexicali', lat: 32.628, lon: -115.454, zoom: 1 },
  { name: 'Yuma', lat: 32.693, lon: -114.627, zoom: 1 },
  { name: 'San Felipe', lat: 31.025, lon: -114.840, zoom: 2 },
];

export function projectPlace(lat, lon, meta) {
  const [lat0, lon0] = meta.home;
  return {
    x: (lon - lon0) * 111320 * Math.cos(lat0 * Math.PI / 180) * meta.hScale,
    z: -(lat - lat0) * 110574 * meta.hScale,
  };
}
