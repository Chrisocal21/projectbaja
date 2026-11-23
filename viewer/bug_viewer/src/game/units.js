// Display units (pure): the game works in mph and °F (weather) / °C (engine); settings pick what the player reads. See game/settings.js speedUnit, tempUnit.
export const MPH_TO_KPH = 1.609344;
/** a speed in mph shown in the chosen unit: { n: whole number, label } */
export const speedShown = (mph, unit = 'mph') => (unit === 'kph' ? { n: Math.round(mph * MPH_TO_KPH), label: 'KM/H' } : { n: Math.round(mph), label: 'MPH' });
export const fToC = f => (f - 32) * 5 / 9, cToF = c => c * 9 / 5 + 32;
/** a temperature given in °F or °C, written in the chosen unit: "88°F" / "31°C" (bare = true: "88°") */
export function tempText(v, from = 'F', unit = 'F', bare = false) {
  const x = from === unit ? v : unit === 'C' ? fToC(v) : cToF(v);
  return `${Math.round(x)}°${bare ? '' : unit}`;
}
