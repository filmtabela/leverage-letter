/**
 * The Leverage Letter — Auto-Publisher
 * Uses Beehiiv blocks API (works on Launch/free plan).
 *
 * Usage:
 *   node publish.js                          → publishes issues/next.json
 *   node publish.js issues/002.json          → publishes a specific file
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.BEEHIIV_API_KEY;
const PUB_ID = process.env.BEEHIIV_PUBLICATION_ID;

if (!API_KEY || !PUB_ID) {
  console.error("Missing BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID");
  process.exit(1);
}

const issueFile = process.argv[2] || path.join(__dirname, "issues", "next.json");
if (!fs.existsSync(issueFile)) {
  console.error("Issue file not found: " + issueFile);
  process.exit(1);
}

const issue = JSON.parse(fs.readFileSync(issueFile, "utf8"));
console.log("Loaded issue: " + issue.subject);

// ─── Build blocks array ───────────────────────────────────────────────────────
function buildBlocks(issue) {
  const blocks = [];

  const p = (text) => ({ type: "paragraph", plaintext: text });
  const h = (text, level) => ({ type: "heading", level: level || "2", text: text, anchorHeader: false, anchorIncludeInToc: false });
  const divider = () => ({ type: "paragraph", plaintext: "────────────────────" });

  // Header
  blocks.push(h("The Leverage Letter — Issue #" + issue.issue_number, "1"));
  blocks.push(p("work less, earn more"));
  blocks.push(divider());

  // Section 1: One Big Idea
  blocks.push(h("One Big Idea"));
  blocks.push(p(issue.big_idea.headline));
  blocks.push(p(issue.big_idea.body));
  if (issue.big_idea.highlight) {
    blocks.push(p(issue.big_idea.highlight));
  }
  blocks.push(divider());

  // Section 2: Tool of the Week
  blocks.push(h("Tool of the Week"));
  blocks.push(p(issue.tool.name + " — " + issue.tool.tagline));
  blocks.push(p(issue.tool.description));
  blocks.push(p("Best for: " + issue.tool.best_for));
  blocks.push(p("Free tier: " + issue.tool.free_tier));
  blocks.push(p("Link: " + issue.tool.url));
  blocks.push(divider());

  // Section 3: One Prompt
  blocks.push(h("One Prompt"));
  blocks.push(p(issue.prompt.context));
  blocks.push(p(issue.prompt.text));
  blocks.push(p(issue.prompt.why_it_works));
  blocks.push(divider());

  // Section 4: Stat That Matters
  blocks.push(h("Stat That Matters"));
  blocks.push(p(issue.stat.number + " — " + issue.stat.label));
  blocks.push(p(issue.stat.context));
  blocks.push(divider());

  // Footer
  blocks.push(p("You are receiving this because you signed up for The Leverage Letter. Forward to a founder friend who is still doing everything manually."));

  return blocks;
}

// ─── API call helper ──────────────────────────────────────────────────────────
function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.beehiiv.com",
      path: "/v2" + endpoint,
      method: method,
      headers: {
        "Authorization": "Bearer " + API_KEY,
        "Content-Type": "application/json",
      },
    };
    if (payload) options.headers["Content-Length"] = Buffer.byteLength(payload);
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const blocks = buildBlocks(issue);

  // Next Tuesday 8am Eastern (EDT = UTC-4, so 12:00 UTC)
  const now = new Date();
  const sendAt = new Date(now);
  let daysUntilTuesday = (2 - now.getUTCDay() + 7) % 7;
  if (daysUntilTuesday === 0) daysUntilTuesday = 7;
  sendAt.setUTCDate(now.getUTCDate() + daysUntilTuesday);
  sendAt.setUTCHours(12, 0, 0, 0);
  console.log("Scheduled for: " + sendAt.toUTCString() + " (8am Eastern)");

  console.log("Creating post on Beehiiv...");
  const res = await apiRequest(
    "POST",
    "/publications/" + PUB_ID + "/posts",
    {
      title: issue.subject,
      subject: issue.subject,
      preview_text: issue.preview_text,
      blocks: blocks,
      status: "draft",
      platform: "both",
      audience: "free",
    }
  );

  if (res.status !== 201 && res.status !== 200) {
    console.error("Failed to create post:");
    console.error(JSON.stringify(res.body, null, 2));
    process.exit(1);
  }

  const postId = res.body && res.body.data && res.body.data.id;
  console.log("Draft created on Beehiiv — go send it!");
  console.log("  Subject : " + issue.subject);
  console.log("  Issue # : " + issue.issue_number);
  console.log("  Draft created at: " + sendAt.toUTCString());
  console.log("  Post ID : " + postId);

  // Archive
  const sentDir = path.join(path.dirname(issueFile), "sent");
  if (!fs.existsSync(sentDir)) fs.mkdirSync(sentDir, { recursive: true });
  const archivePath = path.join(sentDir, String(issue.issue_number).padStart(3, "0") + ".json");
  fs.copyFileSync(issueFile, archivePath);
  if (issueFile.endsWith("next.json")) fs.unlinkSync(issueFile);
  console.log("Archived to: " + archivePath);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
