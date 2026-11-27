// Which meshes of a car's GLB a body piece owns (catalog/bodies.json "match"). A token is a node-name prefix, or "mat:<material name>"
// for surfaces built into another piece's node: the Bug's red tail lamps sit inside its rear fender nodes but belong to the Taillights.
export const MAT_CLAIMED = ['B-taillight1'];   // materials a "mat:" token owns, so a fender shown on its own does not bring them along
const matNames = o => [].concat(o.material || []).map(m => m?.name || '');
/** does any token claim this mesh? name = its source node name */
export const meshIs = (o, name, tokens) => tokens.some(t => (t.startsWith('mat:') ? matNames(o).includes(t.slice(4)) : name.startsWith(t)));
/** "show only these": like meshIs, but a claimed material shows only when asked for by its mat: token */
export function meshOnly(o, name, tokens) {
  const claimed = matNames(o).find(m => MAT_CLAIMED.includes(m));
  return claimed ? tokens.includes('mat:' + claimed) : meshIs(o, name, tokens);
}
