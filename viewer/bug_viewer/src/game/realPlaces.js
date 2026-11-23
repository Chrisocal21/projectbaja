// Geographic city centres and towns. `stop`: 'gas' (a gas station on the nearest main road), 'both' (gas and a rest stop) or 'rest' (rest stop only); none = no service from here.
// Geographic city centres, separate from the fictional Baja County sites.
// Coordinates: GeoNames and CICESE tide stations; projected with west_dem.py's
// equirectangular origin and scale from border.json.
export const REAL_PLACES = [
  { name: 'Los Angeles', lat: 34.052, lon: -118.244, zoom: 1 },
  { name: 'San Diego', lat: 32.715, lon: -117.161, zoom: 1 },
  { name: 'Tijuana', lat: 32.534, lon: -117.018, zoom: 1 },
  { name: 'Ensenada', lat: 31.860, lon: -116.606, zoom: 1 },
  { name: 'San Quintín', lat: 30.484, lon: -115.977, zoom: 2, stop: 'both' },
  { name: 'Guerrero Negro', lat: 27.960, lon: -114.056, zoom: 1, stop: 'gas' },
  { name: 'Santa Rosalía', lat: 27.340, lon: -112.267, zoom: 3, stop: 'gas' },
  { name: 'Mulegé', lat: 26.890, lon: -111.983, zoom: 3, stop: 'gas' },
  { name: 'Loreto', lat: 26.012, lon: -111.348, zoom: 1, stop: 'gas' },
  { name: 'La Paz', lat: 24.133, lon: -110.300, zoom: 1 },
  { name: 'Todos Santos', lat: 23.447, lon: -110.225, zoom: 3, stop: 'gas' },
  { name: 'Cabo San Lucas', lat: 22.883, lon: -109.900, zoom: 1 },
  { name: 'El Centro', lat: 32.792, lon: -115.563, zoom: 3 },
  { name: 'Calexico', lat: 32.679, lon: -115.499, zoom: 3 },
  { name: 'Mexicali', lat: 32.628, lon: -115.454, zoom: 1 },
  { name: 'Yuma', lat: 32.693, lon: -114.627, zoom: 1 },
  // desert racing towns and Baja 1000 route towns (real places); stop = what sits by the road beside them (worlds/roadside.js)
  { name: 'Ocotillo Wells', lat: 33.145, lon: -116.131, zoom: 2, stop: 'both' },
  { name: 'Plaster City', lat: 32.789, lon: -115.852, zoom: 3, stop: 'rest' },
  { name: 'Borrego Springs', lat: 33.256, lon: -116.375, zoom: 2, stop: 'gas' },
  { name: 'Julian', lat: 33.079, lon: -116.602, zoom: 3, stop: 'gas' },
  { name: 'Campo', lat: 32.608, lon: -116.468, zoom: 3, stop: 'rest' },
  { name: 'Tecate', lat: 32.567, lon: -116.633, zoom: 2, stop: 'gas' },
  { name: 'Rosarito', lat: 32.333, lon: -117.033, zoom: 2 },
  { name: 'Valle de Guadalupe', lat: 32.080, lon: -116.620, zoom: 3, stop: 'gas' },
  { name: 'Ojos Negros', lat: 31.917, lon: -116.267, zoom: 3, stop: 'gas' },
  { name: 'Jacumba', lat: 32.620, lon: -116.191, zoom: 3, stop: 'gas' },
  { name: 'Ocotillo', lat: 32.739, lon: -115.996, zoom: 3, stop: 'rest' },
  { name: 'Glamis', lat: 33.000, lon: -114.990, zoom: 3, stop: 'gas' },
  { name: 'San Luis Río Colorado', lat: 32.456, lon: -114.770, zoom: 2 },
  { name: 'Palm Springs', lat: 33.830, lon: -116.545, zoom: 2 },
  { name: 'Puertecitos', lat: 30.347, lon: -114.639, zoom: 3, stop: 'rest' },
  { name: 'Gonzaga Bay', lat: 29.817, lon: -114.367, zoom: 3, stop: 'both' },
  { name: 'Bahía de los Ángeles', lat: 28.967, lon: -113.550, zoom: 2, stop: 'gas' },
  { name: 'Cataviña', lat: 29.733, lon: -114.717, zoom: 3, stop: 'both' },
  { name: 'El Rosario', lat: 30.067, lon: -115.733, zoom: 2, stop: 'gas' },
  { name: 'Punta Prieta', lat: 28.930, lon: -114.150, zoom: 3, stop: 'rest' },
  { name: 'Vizcaíno', lat: 27.600, lon: -113.400, zoom: 3, stop: 'both' },
  { name: 'San Ignacio', lat: 27.283, lon: -112.898, zoom: 2, stop: 'gas' },
  { name: 'Ciudad Constitución', lat: 25.033, lon: -111.667, zoom: 2, stop: 'gas' },
  { name: 'Los Barriles', lat: 23.683, lon: -109.700, zoom: 3, stop: 'gas' },
  { name: 'Santiago', lat: 23.467, lon: -109.717, zoom: 3 },
  { name: 'San José del Cabo', lat: 23.059, lon: -109.698, zoom: 2 },
  { name: 'San Felipe', lat: 31.025, lon: -114.840, zoom: 2, stop: 'both' },
];

export function projectPlace(lat, lon, meta) {
  const [lat0, lon0] = meta.home;
  return {
    x: (lon - lon0) * 111320 * Math.cos(lat0 * Math.PI / 180) * meta.hScale,
    z: -(lat - lat0) * 110574 * meta.hScale,
  };
}
