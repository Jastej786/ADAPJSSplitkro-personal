// Friday reminder job. Run by .github/workflows/weekly-reminders.yml (or by hand: see README).
//
// Env: FIREBASE_SERVICE_ACCOUNT (JSON), GMAIL_USER, GMAIL_APP_PASSWORD,
//      SITE_URL (optional), FROM_NAME (optional), DRY_RUN=true to only print counts.
//
// NOTE: logs on a public repo are public, so this prints masked addresses and counts only:
// never group names, member names or amounts.
import nodemailer from "nodemailer";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildReminders } from "./build.mjs";
import { maskEmail, normalizeEmail } from "../js/core/email.js";

const env = process.env;
const dryRun = env.DRY_RUN === "true";
const siteUrl = env.SITE_URL || "https://jastej786.github.io/ADAPJSSplitkro-personal/";
const fromName = env.FROM_NAME || "SplitBroo";

const required = ["FIREBASE_SERVICE_ACCOUNT", ...(dryRun ? [] : ["GMAIL_USER", "GMAIL_APP_PASSWORD"])];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Missing secrets: ${missing.join(", ")}. See the "Weekly email reminders" section of the README.`);
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

let transport = null;
if (!dryRun) {
  transport = nodemailer.createTransport({ service: "gmail", auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD } });
  await transport.verify(); // fail fast on a wrong app password
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let scanned = 0, groups = 0, withEmail = 0, sent = 0, failed = 0;

for (const doc of (await db.collection("groups").get()).docs) {
  const group = doc.data();
  scanned += 1;
  if (!group.reminders) continue;
  groups += 1;
  withEmail += group.members.filter((m) => !m.left && normalizeEmail(m.email)).length;

  for (const r of buildReminders(group, siteUrl)) {
    if (dryRun) {
      console.log(`[dry run] would email ${maskEmail(r.email)}`);
      sent += 1;
      continue;
    }
    try {
      await transport.sendMail({ from: `"${fromName}" <${env.GMAIL_USER}>`, to: r.email, subject: r.subject, text: r.text, html: r.html });
      console.log(`sent to ${maskEmail(r.email)}`);
      sent += 1;
    } catch (err) {
      console.error(`FAILED for ${maskEmail(r.email)}: ${String(err.message).split(r.email).join("[address]")}`);
      failed += 1;
    }
    await sleep(1000); // gentle on Gmail's rate limits
  }
}

// Counts only: safe for public logs, and enough to see why nothing was sent.
console.log(`Scanned ${scanned} group(s): ${groups} with reminders on, ${withEmail} member(s) with an email in those.`);
console.log(`${dryRun ? "Dry run: " : ""}${sent} email(s) ${dryRun ? "would be sent" : "sent"}, ${failed} failed.`);
if (scanned === 0) console.log("Hint: the database has no groups. Check FIREBASE_SERVICE_ACCOUNT belongs to the right Firebase project.");
else if (groups === 0) console.log("Hint: no group has 'Weekly reminders' ticked. Tick it in the group's Settings on the live site (not ?local).");
else if (withEmail === 0) console.log("Hint: reminders are on, but no member has an email. Use 'Add email' in the group's Settings.");
else if (sent === 0) console.log("Hint: nobody with an email currently owes money, so there is nothing to remind.");
process.exit(failed ? 1 : 0);
