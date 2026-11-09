// Taking a photo: grab the 3D view on the next rendered frame (the canvas does not keep its picture), shrink it, store it in game.home.photos.
import { addAfterEffect } from '@react-three/fiber';
import { game, save, say } from './store.js';
import { BIOMES } from '../worlds/county.js';
import { bearingOf, bearingFromYaw } from './compass.js';
import { placeName, newPhoto, addPhoto } from './photologic.js';

export const photos = () => game.home?.photos || [];
const setPhotos = list => { game.home = { ...game.home, photos: list }; save(); };

/** snap what the game view shows right now; calls back with the new photo (or null if the view could not be read) */
export function takePhoto(done) {
  if (game.dev) { say('Photos are off in test sessions.'); return done(null); }
  const off = addAfterEffect(() => {
    off();
    let img = '';
    try {
      const src = document.querySelector('canvas'); if (src) {
        const w = 320, h = Math.round(w * src.height / src.width), c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(src, 0, 0, w, h); img = c.toDataURL('image/jpeg', 0.6);
      }
    } catch { img = ''; }
    if (!img || img.length < 2000) { say('Could not take that photo.'); return done(null); }
    const x = game.pos.x, z = game.pos.z, bearing = game.onFoot ? bearingOf(game.face.x, game.face.z) : bearingFromYaw(game.pose?.h || 0);
    const p = newPhoto({ id: (game.home?.photoN || 0) + 1, x, z, bearing, clock: game.clock, where: placeName(x, z, BIOMES), img, what: game.onFoot ? 'View' : 'Car and view' });
    game.home = { ...game.home, photoN: p.id }; setPhotos(addPhoto(photos(), p)); done(p);
  });
}

export const updatePhoto = (id, patch) => setPhotos(photos().map(p => p.id === id ? { ...p, ...patch } : p));
export const deletePhoto = id => setPhotos(photos().filter(p => p.id !== id));
