# CLOUD SAVES PLAN (Clerk + Vercel) - PREP ONLY, nothing built yet

**PROPOSAL** = design guess. Nothing here changes [CANON](./CANON.md). Built LAST, after the local save work.

## Locked decisions
- Login is optional. Guests play and save locally, same save file.
- One main save plus 3 backups locally (already done). Cloud holds the main save plus a few versions.
- Never force-refresh mid-play. "Update ready - Save and update" stays.

## What already exists (reuse, don't rebuild)
- `src/game/saveFormat.js`: versioned envelope, migrations, `parseSave`. The cloud stores this same envelope as-is.
- `src/game/store.js`: `writeSave`, `loadSave`, `game.saveLocked`.
- `src/game/savefile.js`: export/import. Cloud upload/download can reuse the same serialize/parse path.

## Pieces to build (PROPOSAL, in order)
1. **Clerk login (optional).** `@clerk/clerk-react` (a new dependency, needs Chris's OK). Sign-in button in the phone Save app. Guest = no button pressed.
2. **Vercel API routes** in `/api` (serverless): `GET /api/save`, `PUT /api/save`. Each checks the Clerk session token on the server. No token = 401.
3. **Storage.** Vercel Blob or Vercel KV (Upstash). PROPOSAL: Blob, one JSON file per user id, plus the last few versions.
4. **Sync rules.** Save locally first, always. Upload after local success. Compare `savedAt` and envelope version:
   - cloud newer than local: ask "Use cloud save or keep this device's save?" Never overwrite silently.
   - cloud save is a newer game version than this build: refuse and show the update toast (same as the existing "newer save" lock).
5. **Offline.** If upload fails, keep playing, retry later, show "Cloud: not synced" in the phone.
6. **Phone UI.** Save app gets: Sign in / Sign out, "Cloud: synced 2 min ago", Upload now, Download.

## What Chris must provide or decide
- Create a Clerk app (dashboard) and give me the **publishable key** (safe in the client). The **secret key** goes only in Vercel env vars, never in the repo.
- Enable Vercel Blob (or KV) on the project and connect it.
- OK to add the dependencies: `@clerk/clerk-react`, `@clerk/backend` (server), `@vercel/blob`.
- Sign-in methods: email, Google? (his pick)
- Is it ok that dev (`npm run dev`) has no cloud, only the deployed site does? (PROPOSAL: yes, `/api` only runs on Vercel or `vercel dev`)

## Risks
- Overwriting a good save with an empty one. Mitigation: never upload a fresh/empty game over a non-empty cloud save without a prompt.
- Secrets in the repo. Mitigation: env vars only, `.env*` in `.gitignore` (verify before starting).
- Save size: check the envelope size stays small (Blob is fine up to MBs).

## Test plan
- Unit tests: sync decision function (local vs cloud newer, same, cloud from a newer build, empty local).
- Browser: guest play unchanged; sign in; upload; clear local; download; position restored.
