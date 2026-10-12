# SplitBroo

A Splitwise-style expense splitter. Plain HTML/CSS/JS ES modules, no build step, free to host.

## Features

Groups · share links · multiple payers · split equally / exact / percent / shares · categories ·
edit, delete & restore expenses · balances · simplify debts · settle up · activity log ·
Insights (week / month / year / all-time / custom ranges, spending over time, categories, paid vs share, vs-previous-period) ·
Expense search & filters (category, person, period) · month-grouped feed · CSV export · JSON backup/restore · dark/light toggle · mobile friendly · weekly Friday email reminders.

Dev tip: open the site with `?local` (e.g. `http://localhost:8000/?local`) to use browser storage even when Firebase is configured, so testing never touches the shared database.

## Layout

```
index.html            page shell
css/styles.css        all styling
firestore.rules       security rules for shared mode
js/
  main.js, router.js  bootstrap + hash routing (#/, #/g/<id>/<tab>)
  config.js           app name, currencies, Firebase config
  core/               pure logic, no DOM: money, splits, balances, periods, stats, categories, ids, dates
  store/              storage adapters: local.js (browser) / firebase.js (shared) / index.js (picks one)
  features/           one file per feature: groups, members, expenses, settle, activity, export
  core/email.js       email validation shared by the app and the reminder job
  ui/                 dom helper, modal, toast, expense/settle/who-am-I forms
  ui/views/           home + group page and its tabs
reminders/            Friday email job (runs in GitHub Actions, not in the browser): build.mjs + send.mjs
.github/workflows/    weekly-reminders.yml (schedule + manual trigger)
tests/core.test.js    tests for the money maths  (npm test)
```

## Run locally

ES modules need a server (opening `index.html` directly won't work):

```bash
cd splitwise-app
python3 -m http.server 8000     # then open http://localhost:8000
node --test tests/              # optional: run the tests
```

Out of the box this is **local mode**: data stays in your own browser.

## 1. Host it free (GitHub Pages)

1. Create a GitHub repo and push the contents of this folder (`index.html` at the repo root).
2. Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root → Save.
3. Your site is live at `https://<you>.github.io/<repo>/`.

(Netlify Drop or Cloudflare Pages also work: just drag the folder in.)

## 2. Let friends share the same groups (free Firebase)

Without this each person only sees their own browser's data.

1. https://console.firebase.google.com → Add project (skip Analytics).
2. Build → Firestore Database → Create database (production mode, pick a nearby region).
3. Firestore → Rules → paste `firestore.rules` → Publish.
4. Project settings → Your apps → Web (`</>`) → register → copy the `firebaseConfig`.
5. Paste it into `js/config.js` as `firebase: { ... }`, commit and push.

Then: create a group → Settings → **Copy link** → send it to friends. Opening the link lets them pick
who they are and start adding expenses; everyone sees updates live.

Firebase web keys are meant to be public; access is controlled by the rules. Anyone with a group link can
read and edit that group (there are no accounts), so share links only with people you trust.
The Firebase free tier is far more than a friend group will ever use.

## 3. Weekly email reminders (optional, free)

Every Friday ~9:00 IST a GitHub Actions job emails each member who has an email and an outstanding balance:
what they owe and to whom, and what they will receive and from whom, e.g.
"You owe ₹1,250 in Flat 4B: ₹800 to Asha, ₹450 to Ravi" or "You're owed ₹900: ₹600 from Ravi, ₹300 from Meera".
Settled-up people get nothing.

**In the app:** group → Settings → *Add email* next to each member, then tick **Weekly reminders**.

**One-time setup** (GitHub repo → Settings → Secrets and variables → Actions → *New repository secret*):

| Secret | What to put |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase console → Project settings → Service accounts → *Generate new private key*. Paste the **entire JSON file contents**. |
| `GMAIL_USER` | The Gmail address emails are sent from. |
| `GMAIL_APP_PASSWORD` | A Google *app password* (not your normal password): turn on 2-Step Verification, then https://myaccount.google.com/apppasswords → create one → paste the 16 characters. |

Never commit these, and never paste them into chat or an issue: only into the GitHub secrets form.
Delete the downloaded JSON key file afterwards (`.gitignore` already blocks the usual names).

**Test it:** repo → Actions → *Weekly reminders* → **Run workflow**.
- *Dry run* ticked (default): prints how many emails would go out and to which masked addresses.
- Untick it to send for real right now.

**Good to know**
- Logs on a public repo are public, so the job logs only masked addresses and counts, never names or amounts.
- GitHub may start scheduled runs a few minutes late, and **pauses schedules on repos with no activity for 60 days**
  (a push or a manual run re-enables it).
- Emails are stored in the group data, so anyone with the group link can see them (and add one for someone else).
  Add only addresses of people who are fine with that.
- Gmail allows ~500 emails/day, far beyond a friend group.
