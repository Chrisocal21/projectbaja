// Cloud save decisions (pure: no network, no localStorage). The cloud holds the same envelope as the local save.
// Rule: never overwrite anything silently. Anything unclear is a question for the player.
import { FORMAT, CURRENT } from './saveFormat.js';

/** summarize a raw save string: null when empty or not a save */
export function summarize(raw) {
  if (!raw) return null;
  try { const j = JSON.parse(raw); return j && j.format === FORMAT && Number.isFinite(j.savedAt) ? { savedAt: j.savedAt, version: j.version } : null; } catch { return null; }
}

/**
 * What should an upload/download do? local and cloud are summaries (or null).
 *  'upload'   cloud empty, or cloud older: safe to send
 *  'download' local empty, cloud has one
 *  'ask'      both exist and differ: let the player choose
 *  'same'     same save time
 *  'refuse'   cloud save is from a newer game than this build
 *  'nothing'  neither exists
 */
export function decideSync(local, cloud) {
  if (!local && !cloud) return 'nothing';
  if (cloud && cloud.version > CURRENT) return 'refuse';
  if (!cloud) return 'upload';
  if (!local) return 'download';
  if (local.savedAt === cloud.savedAt) return 'same';
  return 'ask';
}

/**
 * Automatic upload rule. `last` is the save time we last synced with the cloud (this device remembers it).
 * The cloud is only ever overwritten when it still holds exactly what this device last synced: anything else is left for the player to choose.
 *  'idle'     nothing new to send
 *  'upload'   cloud empty, or cloud is still what we last synced, and this device has newer progress
 *  'conflict' cloud holds a save this device did not sync (another device, or first time): never overwritten automatically
 *  'skip'     no local save, or the cloud is from a newer game
 */
export function autoDecision(local, cloud, last) {
  if (!local) return 'skip';
  if (cloud && cloud.version > CURRENT) return 'skip';
  if (!cloud) return 'upload';
  if (last == null || cloud.savedAt !== last) return 'conflict';
  return local.savedAt > last ? 'upload' : 'idle';
}
