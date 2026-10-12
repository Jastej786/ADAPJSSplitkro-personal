// Pure: turns a group document into the reminder emails to send. No network, no secrets.
// Reuses the app's own balance maths so the email always matches what the app shows.
import { debtsFor } from "../js/core/balances.js";
import { fmt } from "../js/core/money.js";
import { normalizeEmail } from "../js/core/email.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Names are user-typed and the group doc is writable by anyone with the link: keep them short and single-line.
const clean = (s, max = 60) => String(s ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

// Returns [{ email, memberName, total, subject, text, html }] — one per member who owes money and has an email.
export function buildReminders(group, siteUrl) {
  if (!group.reminders) return [];

  const base = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const link = `${base}#/g/${group.id}`;
  const groupName = clean(group.name) || "your group";
  const byId = new Map(group.members.map((m) => [m.id, m]));

  const owes = new Map(); // debtor id -> [{ to, amount }]
  for (const d of debtsFor(group)) {
    if (!(d.amount > 0)) continue;
    if (!owes.has(d.from)) owes.set(d.from, []);
    owes.get(d.from).push({ to: clean(byId.get(d.to)?.name) || "someone", amount: d.amount });
  }

  const out = [];
  for (const [id, debts] of owes) {
    const member = byId.get(id);
    const email = member && !member.left ? normalizeEmail(member.email) : null;
    if (!email) continue;

    const total = debts.reduce((s, d) => s + d.amount, 0);
    const money = (c) => fmt(c, group.currency || "INR");
    const name = clean(member.name);
    const lines = debts.map((d) => `${money(d.amount)} to ${d.to}`);

    const text = [
      `Hi ${name},`, "",
      `Friendly Friday reminder: in "${groupName}" you owe ${money(total)}.`, "",
      ...lines.map((l) => `  • ${l}`), "",
      `Open the group: ${link}`, "",
      "You're getting this because weekly reminders are on for this group. Turn them off in the group's Settings,",
      "or ignore this email if it isn't meant for you.",
    ].join("\n");

    const html = `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:Helvetica,Arial,sans-serif;color:#16211d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td>
<p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#7d8982">${esc(groupName)}</p>
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;line-height:1.2">You owe ${esc(money(total))}</h1>
<p style="margin:0 0 12px;font-size:15px">Hi ${esc(name)}, a friendly Friday reminder:</p>
<ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.7">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<a href="${esc(link)}" style="display:inline-block;background:#0e6b57;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600;font-size:14px">Open group</a>
<p style="margin:24px 0 0;font-size:12px;color:#7d8982;line-height:1.5">You're getting this because weekly reminders are on for this group. Turn them off in the group's Settings, or ignore this email if it isn't meant for you.</p>
</td></tr></table></td></tr></table></body></html>`;

    out.push({ email, memberName: name, total, subject: `You owe ${money(total)} in ${groupName}`, text, html });
  }
  return out;
}
