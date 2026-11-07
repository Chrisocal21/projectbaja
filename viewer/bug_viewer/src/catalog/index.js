// Auto-discovers every catalog JSON. To add content: drop a GLB in public/models and add an entry
// (or a whole new .json file anywhere under src/catalog) - no code changes needed.
const mods = import.meta.glob('./**/*.json', { eager: true, import: 'default' });
const all = Object.values(mods).flatMap(m => (Array.isArray(m) ? m : [m]));
const ofType = t => all.filter(x => x.type === t);

export const slots = ofType('slot').sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
export const bodies = ofType('body');
export const wheelSets = ofType('wheels');
export const rims = ofType('rim');
export const parts = ofType('part');
export const presets = ofType('preset');
