# AI PROMPT WAR — THINK. PROMPT. BUILD.

Node + Express backend, vanilla HTML/CSS/JS frontend, JSON file storage (`data/db.json`), Gemini called only from the server.

## 1. Install (Node.js 18+)
```
npm install
```

## 2. .env setup
```
cp .env.example .env        (Windows: copy .env.example .env)
```
Edit `.env`: set `GEMINI_API_KEY`, `HOST_USERNAME`, `HOST_PASSWORD` (and optionally `GEMINI_MODEL`, `PORT`). `.env` is git-ignored.

## 3. Gemini API setup
1. Create a key at https://aistudio.google.com/apikey.
2. Put it in `GEMINI_API_KEY` in `.env` only. Never share it in chat, screenshots or frontend files.
3. If a key is ever exposed, delete it in AI Studio and create a new one.
4. Free tiers rate-limit (HTTP 429). For a full event use a billing-enabled project.

## 4. Start
```
npm start
```
Open http://localhost:3000 (other devices on your network: http://YOUR-PC-IP:3000).

## 5. Participant credentials (70 accounts)
On the **first start** the server creates `pa001 … pa100` (change with `PARTICIPANT_COUNT`) with simple credentials where **username = password** (`pa001/pa001`, `pa002/pa002`, etc.) and writes them to **`data/credentials.csv`**. Existing participant records are migrated to this same format on startup.

## 6. Host credentials
`HOST_USERNAME` / `HOST_PASSWORD` from `.env` (defaults host / change_me — change them). Use the HOST tab on the login page.

## 7. Account reuse
An account is only a login. Each login creates a new **session** with its own server-side 45:00 timer, 5 prompts, Round 3 lock and website. While a session is active (or in the 01:00 post-submit countdown) the account can't be used elsewhere ("pa001 is currently in use."). It is released when the countdown ends (page returns to login with the username pre-filled), when 45 minutes expire, or when the host presses RELEASE.

## 8. Submission history
Each submission is its own record: unique ID `SUB-YYYYMMDD-PAxxx-NNN` (NNN counts up per account per day), session ID, score, breakdown, prompts and website HTML. Nothing is overwritten when accounts are reused. The Host Live Monitor lists every session and can open any submission.

Scoring: each round is scored on Prompt Quality, UI/UX Design and Functionality; each round contributes 25 points to the 100-point final score.

## Testing
```
MOCK_AI=1 RELEASE_SECONDS=2 DATA_FILE=data/test.json PORT=3111 node server/server.js
PORT=3111 DATA_FILE=data/test.json node tests/flow.js      # second terminal (wait ~5s after starting the server)
```

## 8a. The four rounds
Round 1 **Problem Statement** (8 min) → Round 2 **Easy Enhancement** (8) → Round 3 **Medium Enhancement** (10) → Round 4 **Hard Enhancement** (12), then **Submit**. Every participant receives a different assigned problem, and Rounds 2–4 enhance the same website instead of replacing the original problem.

## 8b. Round 3 quiz gate + reward
1. Round 1 and Round 2 have no quiz visible in the normal page.
2. When the participant finishes Round 2 and clicks **START ROUND 3**, a full-screen **5-question AI quiz popup** opens before Round 3 starts.
3. There are 2 attempts. Passing requires 3/5 by default.
4. A passed quiz unlocks a **solved Round 3 challenge prompt** generated from that participant's assigned problem and the exact Round 3 enhancement. The reward is automatically placed into the Round 3 prompt box.
5. **CONTINUE TO ROUND 3** closes the popup and starts Round 3. The participant generates the rewarded Round 3 website, then proceeds to Round 4 normally.

## 8c. Saved round history + preview
- Every round prompt is saved as the participant types and again when leaving the round.
- Clicking a completed ROUND 1/2/3/4 tab shows that round's saved prompt and its exact saved website preview.
- The current round can be edited; completed rounds are read-only history.
- If Round 2/3/4 has not generated a new site yet, the preview continues showing the previous round's working website instead of becoming blank.
- The preview strips restrictive Content-Security-Policy meta tags and uses a sandbox shim so generated navigation, forms, storage and common interactions do not break the event page.

## 8d. Prompt + submission
- The old 40-character minimum is removed. Any non-empty prompt up to 2000 characters is accepted.
- After final submission, **DOWNLOAD WEBSITE** uses the authenticated session to download the final Round 4 HTML.
- The login page uses the supplied AI Prompt War visual style; participant credentials are `pa001/pa001`, `pa002/pa002`, etc., while the Host Live Monitor keeps its host credentials from `.env`.

## 9. Troubleshooting
- **AI GENERATION FAILED**: check key, model name, internet, and the server console (logs HTTP status). Failed generations don't use a prompt.
- **429 in console**: rate limit; wait or use a billing-enabled key.
- **"paXXX is currently in use"**: use RELEASE on the Host Monitor.
- **Port busy**: the server now stops with a message; run STOP.BAT or change `PORT`.
- **Reset everything**: stop server, delete `data/db.json`.
- Optional env: `EVENT_MINUTES` (45), `RELEASE_SECONDS` (60), `MOCK_AI=1`.
- Round timers (5/8/10/22 min) are guidance; the enforced limit is the 45-minute server timer.

## Deploy with GitHub + Render

1. Push this folder to a GitHub repo (`.env`, `data/` and `node_modules/` are git-ignored - never commit your API key).
2. Render dashboard -> **New > Blueprint** -> select the repo (reads `render.yaml`), then enter `GEMINI_API_KEY` and `HOST_PASSWORD` when asked.
3. Wait for the deploy; open the `https://<name>.onrender.com` URL. Participants: `pa001`/`pa001` ... ; host: your host login.
4. The database lives on the persistent disk at `/var/data/db.json` (set by `DATA_FILE`). Participant credentials are written to `/var/data/credentials.csv` (use Render **Shell** to read it).
Free plan note: no persistent disk and the service sleeps after 15 min idle, which wipes event data - use a paid plan for the real event.

## Scoring (per round 0-100, each round = 25 marks)
Functionality, UI/UX and prompt quality are averaged. From Round 2 each criterion is 60% static quality + 40% **dynamic** score,
which measures how the page and prompt changed since the previous round (new interactive code, new sections/styles/animations,
how much of the earlier site was kept, and whether the prompt targets the new enhancement instead of repeating the old one).
The host page shows each round as /100 and /25, the submission id, the top-3 podium, and a PDF export.

## Update notes
- The "PROMPT MUST INCLUDE" box and the server-side prompt rules check are removed. Any non-empty prompt can be generated.
- The AI now builds only what the participant typed (minimal system prompt, no round requirement or style hints injected, low temperature).
- Prompt quality is scored in the background: explanation, creativity, colour description and problem-statement coverage. The host sees the split under each submission.
- Forms in generated sites (preview and downloaded file) POST to `/api/forms/submit` and send real email. Set `RESEND_API_KEY` or `SMTP_*` (see `.env.example`). If email is not configured the site shows an error instead of faking success.
- Round-to-round change (dynamic score, % changed, % kept) is shown to the participant after submission and to the host per round.

## Update notes 2 (scoring rules)
- **Quiz:** all 5 questions must be answered, and all 5 must be correct to pass (set `QUIZ_PASS` to relax). The submit button stays disabled until every question is answered.
- **Prompt quality (hidden):** problem coverage 35%, colour 25%, explanation 25%, creativity 15%. Deductions, applied as a multiplier:
  - requirement/enhancement text copied word for word instead of explained (up to -60%)
  - generic words (enhance, solve, improve, add feature...) with no what/how in the same sentence (up to -45%)
  - a one-liner or short prompt (under about 70 words / 3 sentences)
  - no colour named: an extra -25%
- Rounds 2-4: the enhancement must be explained in the participant's own words in at least two detailed sentences, otherwise coverage drops.
- **Functionality** is cut by the same copy / bare-keyword factor, and by how many of the problem's required features are visible on the generated site.
- **UI/UX** is reduced for low text/background contrast (WCAG ratio read from the page's CSS) and a weak colour palette (up to -40%).
- The host sees all of these figures per round (copied %, bare keywords, word count, deduction %, contrast, palette, worst ratio).
