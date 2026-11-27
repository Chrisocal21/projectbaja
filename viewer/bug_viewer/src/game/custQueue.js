// Several customers at once (pure rules, docs/GARAGE_BUSINESS_PLAN.md step 1). Each waiting customer is one entry in
// game.jobs: { uid, id, stall, x, z, h, look }. look = which person model (1-3) stands by the car.

/** how many customers can wait at once: one per shop bay, one more, plus one per parking upgrade. Level 0 (one bay) = 2. PROPOSAL numbers */
export const maxCustomers = (bays = 1, parkingLevel = 0) => Math.max(1, bays) + 1 + Math.max(0, parkingLevel);

/** who can turn up next: nobody already waiting, not the last one served, only jobs the garage can do */
export const jobPool = (jobs, waiting = [], last = null, canDo = () => true) => {
  const here = new Set(waiting.map(w => w.id));
  return jobs.filter(j => !here.has(j.id) && j.id !== last && (!j.needsGarage || canDo(j.needsGarage)));
};

/** the saved list, cleaned: old saves had one `job`, newer ones a `jobs` list. Bad or unknown entries and repeats are dropped; every entry gets a uid and a look */
export function sanitizeJobs(list, oldJob, isKnown = () => true) {
  const raw = Array.isArray(list) ? list : oldJob ? [oldJob] : [];
  const out = [], seen = new Set();
  for (const j of raw) {
    if (!j || typeof j !== 'object' || typeof j.id !== 'string' || !isKnown(j.id) || seen.has(j.id)) continue;
    if (!Number.isFinite(j.x) || !Number.isFinite(j.z) || !Number.isFinite(j.h ?? 0)) continue;
    seen.add(j.id);
    out.push({ ...j, h: j.h ?? 0, uid: Number.isFinite(j.uid) ? j.uid : 0, look: [1, 2, 3].includes(j.look) ? j.look : 1 + (out.length % 3) });
  }
  const used = new Set();   // uids must be unique (old saves have none)
  let next = Math.max(0, ...out.map(j => j.uid)) + 1;
  for (const j of out) { if (!j.uid || used.has(j.uid)) j.uid = next++; used.add(j.uid); }
  return out;
}
