# Peoria — Reporte Diario · go-live runbook

Ported from the Macon 1.0 build (itself the Murch 10.2 infrastructure). Infrastructure kept: outbox, separate sheet queue, four flush triggers, fire-and-forget Firestore write, service worker, email-link sign-in + PIN, supervisor screen. Replaced: constants, quantity rows, generated notes, payload, CSV. Nothing is shared with Macon or Murch — Peoria has its own Firebase project, its own `peoria_reports` / `peoria_admin` collections, its own `peoria_` localStorage keys and its own `peoria-daily-1.0` cache.

Do the steps **in this order**. Each one depends on the one before it.

## 0. Read this first — the one thing built on inference

The workbook you gave me is the **Executive** Peoria tracker. Its `Input` tab is a live mirror (`=[1]Input!A5…`) of the real field file, `SharePoint › SolAmerica Energy › Peoria › Peoria Tracker Spreadsheet.xlsx`, and that field file is where the CSV gets pasted. It has **32** Input columns; the mirror only pulls the first 30 and labels them with Macon's 30 headers, so from column T on the labels are two cells off.

The data fixes the positions beyond doubt (T = racks shipped out: 29 on 08/10, 30 on 08/13, 34 on 08/14; U = new-module truckloads: 5 on 08/12, 3 on 08/13; Y/N flags in V–X; incident counts in Y–AA; notes in AB–AD). What I could not read is the **header text** of T and U, and whether AE/AF are worded exactly "Delays, Issues & Notes" / "Data Anomaly Flag". The CSV uses:

- T `Returnable Racks Loaded Out for Return Today` ← inferred
- U `New Module Truckloads Received Today` ← inferred

Open the field file, compare its row 4 to row 1 of the first CSV you export, and if either string differs edit the two marked lines in `INPUT_HEAD` in `index.html` (and `HEAD` in `Code.gs`), bump `BUILD` in both files, redeploy. The **order and position** of every column is what the roll-ups read; the header row is only a guide for the eye, so a wording mismatch never corrupts a paste — it just looks odd in row 1 of the CSV.

## 1. Firebase project

1. console.firebase.google.com → **Add project** → `peoria-daily` (Analytics off).
2. **Build → Firestore Database → Create database** → Native mode, `nam5 (us-central)`, production mode.
3. **Firestore → Rules** → paste `firestore.rules`; change `CHANGE-ME@unitedservices.work` to the app owner's address (only that address can change the PIN and the Report # start). **Publish.**
4. **Authentication → Get started → Email/Password → enable + turn ON "Email link (passwordless sign-in)"** → Save.
5. **Project settings → Your apps → Web (</>)** → register `peoria-daily`, no Hosting → copy `firebaseConfig`.
6. `index.html` → `var FB = {` → paste the six values. Until `projectId` is set the home screen says so and the app will not talk to Firebase.

## 2. Host

Cloudflare Pages → **Create → Pages → Upload assets** → `peoria-daily` → drag `peoria-daily-1.0.zip` (Cloudflare extracts zips; GitHub does not — push loose files there). Custom domain optional, e.g. `peoria.unitedservices.work`.

## 3. Authorized domains

Firebase → **Authentication → Settings → Authorized domains → Add**: the Pages hostname and any custom domain. Skip this and "Send the link" fails with an error that explains nothing. Test: Supervisión → your company email → open the link on the same phone → PIN `2019` (default; change it as the owner from the supervisor screen).

## 4. Google Sheet mirror

1. New Google Sheet `Peoria — Daily Reports`, empty.
2. **Extensions → Apps Script** → paste `Code.gs` → save.
3. **Deploy → New deployment → Web app → Execute as Me → Anyone → Deploy** → copy the `/exec` URL.
4. `index.html` → `var SHEET_URL = "` paste `";`. `SHEET_TOKEN` already equals `TOKEN` in `Code.gs` (`peoria-2026-Xm4tR9`).
5. Any later edit to `Code.gs` is inert until **Deploy → Manage deployments → ✎ → Version: New version → Deploy**.

The sheet receives the 32 Input columns plus `App Report ID` and `Received At` in AG:AH; Report # is recomputed by date order from 13 on every arrival.

## 5. Release the config

You edited `index.html` twice. Bump **`BUILD` in `index.html` AND `sw.js`** (`1.0` → `1.1`) and `BUILD_DATE`, then re-upload. The cache name derives from `BUILD`; forget `sw.js` and phones serve the old app forever.

## 6. Install on a phone, file one report

Safari / Chrome → open the site → Share → **Add to Home Screen**. File today's report. Check: supervisor screen shows it and both queues are empty; Firestore `peoria_reports` has one doc; the Sheet has one row with Report # 13.

## 7. Into the field tracker

Supervisor → **Descargar CSV (Input)** → open in Excel → select **row 2 down** → copy → `Peoria Tracker Spreadsheet.xlsx` → **Input** → click **A18** (rows 5–17 hold Reports 1–12, 08/03–08/15) → paste.

- Dates paste as real dates (`9/19/2026`), times as `6:00 AM`. Never ISO text — on Macon's tracker the same row as `2026-09-19` zeroed the whole week in the Backup while Daily Log still looked right.
- Column L is `=H×K` on Input; the CSV carries the identical figure. Paste A:K then M:AF if you'd rather keep the formula.
- The CSV always contains every report, oldest first, numbered from `Primer Report #` (default 13). Paste only the rows you don't have yet.
- Idle days (`No Report Submitted`, like 08/09) stay office-typed.

Because the field file itself wasn't available, the roll-up check ran on a throwaway copy of the **Executive** workbook with its mirror frozen and the worked example (9/19, 19 men 6–4, 1,100 installed, 14 racks / 616 modules, 30 racks shipped, 3 truckloads) dropped in at Input row 18 exactly as the mirror would receive A–AD: Daily Log row 15 (mirror + cumulative columns), `Weekly Tracker bckup` week 7 (D–M), Executive Dashboard B8/F8/L5/B11/J8/J11 — **25 of 25** matched hand-computed values, and columns T/U landed under the "JHA"/"PPE" labels exactly as the live mirror does today. Run the same paste once into the real field file and eyeball its Daily Log and Weekly Tracker Backup for the week of 9/14; the A–S contract is proven, T–AF is positional.

## Things I saw in the Executive workbook (you said you'd fix the tracker later)

1. **Mirror shift.** Hidden `Input` here maps 30 headers onto a 32-column source. Racks shipped and truckloads show under "JHA"/"PPE", the Y/N flags under Near Misses/Recordables/Injuries, notes one column right, and the field file's Delays and Anomaly Flag never arrive. No Executive Dashboard or Safety formula reads those columns, so the KPIs are right; only the mirror text is scrambled. Fix: extend the mirror to `=[1]Input!AF5…` and re-label row 4 with the field file's 32 headers.
2. **Missing reports vs. paid hours.** Mirror ends at Report 12 (08/15). `Labor (Hours-Men)` shows 432 h (8/16–8/22) and 203.5 h (8/23–8/29). Either the link is stale or ~635 man-hours were never reported; the app closes that gap from here on.
3. **New modules received = 0 on truckload days.** 08/12 (5 trucks) and 08/13 (3 trucks) carry S = 0 because the report didn't state a module count. The app keeps that behaviour honest: truckloads is its own counter, modules-received is entered separately (hint: 10 boxes × 44 = 440 per full truck), and the equipment note says "count not yet reported" when it's left blank.
4. **Scope ceilings.** Reinstall and removal both read 5,352 / 5,352; racks 128 received, 122 filled, 93 shipped. The app warns (never blocks) above those.
5. Pre-existing `#REF!` in `Operational Costs!A25:B…` and deliberate `NA()` gaps on the Cost Dashboard — not touched, not caused by anything here.

## How the app maps to the field Input

| Field Input | App | Source |
|---|---|---|
| A Date | site date, `America/Chicago` | automatic |
| B Report # | assigned at CSV export, from `Primer Report #` (13) | supervisor |
| C Status | `Submitted` | constant |
| D Crew / Work Stream | derived; override on review | one of the 5 picklist strings |
| E Site Supervisor | name screen, prefilled with last | foreman |
| F Block / Area | `Site-Wide` (capital W, Peoria's spelling) | constant |
| G Weather | Sunny / Cloudy / Partly Cloudy / Rain / Thunderstorms / Windy / Hot | 1 tap |
| H Headcount | stepper, presets 8–24 | 1 tap |
| I, J, K, L | start / release chips (6 AM–10 AM, 2 PM–7 PM) → shift → men × shift | 2 taps |
| M–S | modules removed / installed, racks received / assembled / filled, modules loaded, new modules received | taps, presets add |
| **T** racks shipped out | own counter, hint 10 per truck; work note computes trucks | taps |
| **U** truckloads received | own counter | taps |
| V, W, X Y/N | toggles, default Y | 0–3 taps |
| Y, Z, AA | "any incident?" No → 0/0/0 | 1 tap |
| AB Equipment notes | generated (racks received, truckloads, module count or "not yet reported") | automatic |
| AC Work performed | generated in the field file's own phrasing ("Module installation — …; Truck load-out — loaded 3 trucks … (30 racks).") | automatic |
| AD Safety notes | generated in the field file's phrasing, ends "0 near misses, 0 recordable incidents, 0 injuries." | automatic |
| AE Delays | `No delays, issues, or notes to report.` or `CODE · reason — n hrs lost — note` | problem screen |
| AF Anomaly flag | blank | office |

Work-stream rule: removed + any rack/receiving activity → *Combined*; removed only → *Modules Removal*; installed → *Modules Reinstallation*; racks/shipping/receiving only → *Rack Assembly / Loading*; nothing → *Mobilization / Orientation*.

## Every later release

Edit `index.html` → bump `BUILD` in `index.html` **and** `sw.js` → upload.
