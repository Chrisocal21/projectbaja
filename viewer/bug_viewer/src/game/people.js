// Who looks like whom (pure). One table, so a recast is a one-line change. Models: Chris's Meshy drop (assets/pipeline/export_people.py).
// The CASTING IS A PROPOSAL (Chris, Nov 26: Dusty, two hireable workers and the major characters get their own person; the rest are misc).
// A cast model belongs to one character only and is never used as a stranger.
export const CAST = {
  dusty: 'PERSON_M_Shopkeeper',
  al: 'PERSON_M_GreyTee',
  rosa: 'PERSON_M_Woman',
  // the two permanent hireable workers. Not placed in the world until hiring is built. No names yet: Chris names them (no invented lore).
  worker1: 'PERSON_M_Overalls',
  worker2: 'PERSON_M_Coveralls',
};
/** strangers: customers who are not a named townsperson */
export const MISC = ['PERSON_M_YoungMan', 'PERSON_M_Trekker', 'PERSON_M_HiVis'];
/** customer job id -> the named character who brings it (game/jobs.js `who`) */
const JOB_CHARACTER = { belt: 'dusty', battery: 'rosa' };
/** jobs brought by an unnamed stranger: flatwheel is "a young mechanic", tire "a long-haul trucker" */
const JOB_STRANGER = { flatwheel: 'PERSON_M_YoungMan', tire: 'PERSON_M_HiVis' };

/** the model file for a waiting customer, or null for a named townsperson who has no model yet (Pastor Dale, Deputy Ruiz, the Hollises):
 * they keep the old stand-in until theirs arrives, so no stranger's face gets their name. */
export function personFor(w) {
  const who = JOB_CHARACTER[w?.id];
  if (who) return CAST[who];
  return JOB_STRANGER[w?.id] || null;
}
