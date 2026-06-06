/**
 * The Leverage Letter — Auto-Publisher
 * Publishes a pre-written issue to Beehiiv and sends immediately.
 * 
 * Usage:
 *   node publish.js                  → publishes issues/next.json
 *   node publish.js issues/003.json  → publishes a specific file
 * 
 * Env vars required:
 *   BEEHIIV_API_KEY
 *   BEEHIIV_PUBLICATION_ID
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.BEEHIIV_API_KEY;
const PUB_ID = process.env.BEEHIIV_PUBLICATION_ID;

if (!API_KEY || !PUB_ID) {
  console.error("❌ Missing BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID");
  process.exit(1);
}

// ─── Resolve issue file ───────────────────────────────────────────────────────
const issueFile = process.argv[2] || path.join(__dirname, "issues", "next.json");

if (!fs.existsSync(issueFile)) {
  console.error(`❌ Issue file not found: ${issueFile}`);
  process.exit(1);
}

const issue = JSON.parse(fs.readFileSync(issueFile, "utf8"));
console.log(`📄 Loaded issue: ${issue.subject}`);

// ─── Build HTML body ──────────────────────────────────────────────────────────
function buildHTML(issue) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    .tagline { color: #666; font-style: italic; margin-bottom: 32px; }
    h2 { font-size: 18px; font-weight: 700; border-left: 4px solid #000; padding-left: 12px; margin-top: 36px; }
    p { line-height: 1.7; font-size: 16px; }
    .highlight { background: #f5f5f5; border-left: 3px solid #000; padding: 12px 16px; margin: 16px 0; }
    .prompt-box { background: #1a1a1a; color: #fff; padding: 16px; border-radius: 4px; font-family: monospace; font-size: 14px; white-space: pre-wrap; }
    .stat { font-size: 36px; font-weight: 700; }
    .stat-label { font-size: 14px; color: #666; margin-top: 4px; }
    hr { border: none; border-top: 1px solid #e0e0e0; margin: 32px 0; }
    .footer { font-size: 13px; color: #999; margin-top: 40px; }
  </style>
</head>
<body>

  <h1>The Leverage Letter</h1>
  <p class="tagline">work less, earn more — Issue #${issue.issue_number}</p>

  <hr>

  <!-- SECTION 1: One Big Idea -->
  <h2>💡 One Big Idea</h2>
  <p><strong>${issue.big_idea.headline}</strong></p>
  <p>${issue.big_idea.body}</p>
  ${issue.big_idea.highlight ? `<div class="highlight">${issue.big_idea.highlight}</div>` : ""}

  <hr>

  <!-- SECTION 2: Tool of the Week -->
  <h2>🔧 Tool of the Week</h2>
  <p><strong>${issue.tool.name}</strong> — ${issue.tool.tagline}</p>
  <p>${issue.tool.description}</p>
  <p><strong>Best for:</strong> ${issue.tool.best_for}</p>
  <p><strong>Free tier:</strong> ${issue.tool.free_tier}</p>
  <p>→ <a href="${issue.tool.url}">${issue.tool.url}</a></p>

  <hr>

  <!-- SECTION 3: One Prompt -->
  <h2>🤖 One Prompt</h2>
  <p>${issue.prompt.context}</p>
  <div class="prompt-box">${issue.prompt.text}</div>
  <p>${issue.prompt.why_it_works}</p>

  <hr>

  <!-- SECTION 4: Stat That Matters -->
  <h2>📊 Stat That Matters</h2>
  <div class="stat">${issue.stat.number}</div>
  <div class="stat-label">${issue.stat.label}</div>
  <p>${issue.stat.context}</p>

  <hr>

  <div class="footer">
    <p>You're receiving this because you signed up for The Leverage Letter.<br>
    Forward to a founder friend who's still doing everything manually.</p>
  </div>

</body>
</html>
`.trim();
}

// ─── API call helper ──────────────────────────────────────────────────────────
function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: "api.beehiiv.com",
      path: `/v2${endpoint}`,
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const html = buildHTML(issue);

  // Step 1: Create the post
  console.log("📝 Creating post on Beehiiv...");
  const createRes = await apiRequest(
    "POST",
    `/publications/${PUB_ID}/posts`,
    {
      title: issue.subject,
      subject: issue.subject,
      preview_text: issue.preview_text,
      content_html: html,
      status: "draft",
      platform: "both",
      audience: "free",
    }
  );

  if (createRes.status !== 201 && createRes.status !== 200) {
    console.error("❌ Failed to create post:", JSON.stringify(createRes.body, null, 2));
    process.exit(1);
  }

  const postId = createRes.body?.data?.id;
  if (!postId) {
    console.error("❌ No post ID returned:", JSON.stringify(createRes.body, null, 2));
    process.exit(1);
  }
  console.log(`✅ Post created. ID: ${postId}`);

  // Step 2: Send immediately
  console.log("🚀 Sending now...");
  const sendRes = await apiRequest(
    "POST",
    `/publications/${PUB_ID}/posts/${postId}/send`,
    {
      send_at: null, // null = send immediately
    }
  );

  if (sendRes.status !== 200 && sendRes.status !== 201) {
    console.error("❌ Failed to send:", JSON.stringify(sendRes.body, null, 2));
    process.exit(1);
  }

  console.log("✅ Issue sent successfully!");
  console.log(`   Subject: ${issue.subject}`);
  console.log(`   Issue #: ${issue.issue_number}`);
  console.log(`   Post ID: ${postId}`);

  // Step 3: Archive the sent issue (rename next.json → sent/NNN.json)
  const sentDir = path.join(path.dirname(issueFile), "sent");
  if (!fs.existsSync(sentDir)) fs.mkdirSync(sentDir, { recursive: true });

  const archivePath = path.join(sentDir, `${String(issue.issue_number).padStart(3, "0")}.json`);
  fs.copyFileSync(issueFile, archivePath);

  if (issueFile.endsWith("next.json")) {
    fs.unlinkSync(issueFile);
    console.log(`📦 Archived to: ${archivePath}`);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
