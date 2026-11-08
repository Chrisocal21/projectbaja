// Rendered thumbnails for the build menu and hotbar. worlds/IconBaker.jsx renders every build item (and every
// building piece in every material) once, with a small offscreen renderer, and drops PNG data URLs in here.
import { BUILD_ITEMS } from './home.js';
import { MATERIALS } from '../worlds/structures.js';
import { emit } from './store.js';

const icons = {};
let ready = false;
export const iconKey = (id, mat) => (mat ? `${id}:${mat}` : id);
/** the thumbnail for an item (struct pieces per material), or null while it is still being rendered */
export const iconOf = (id, mat) => icons[iconKey(id, mat)] || icons[id] || null;
export const iconsReady = () => ready;
export function setIcon(key, url) { icons[key] = url; }
export function markIconsReady() { ready = true; emit(); }
/** everything to render: one per item, and one per material for building pieces */
export const iconJobs = () => BUILD_ITEMS.flatMap(it => (it.struct ? MATERIALS.map(m => ({ key: iconKey(it.id, m.id), id: it.id, mat: m.id })) : [{ key: it.id, id: it.id }]));
