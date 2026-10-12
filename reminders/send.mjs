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
import { maskEmail } from "../js/core/email.js";

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
let groups = 0, sent = 0, failed = 0;

for (const doc of (await db.collection("groups").get()).docs) {
  const group = doc.data();
  if (!group.reminders) continue;
  groups += 1;

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

console.log(`${dryRun ? "Dry run: " : ""}${groups} group(s) with reminders on, ${sent} email(s) ${dryRun ? "would be sent" : "sent"}, ${failed} failed.`);
process.exit(failed ? 1 : 0);
