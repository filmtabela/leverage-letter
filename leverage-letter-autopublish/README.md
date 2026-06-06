# The Leverage Letter — Auto-Publisher

Automated publishing pipeline for The Leverage Letter on Beehiiv.

## How It Works

1. You write an issue as a JSON file in `/issues/`
2. GitHub Actions runs every Tuesday at 10am IST
3. `publish.js` creates the post on Beehiiv and sends it immediately
4. The sent issue is archived to `/issues/sent/`

---

## Setup (One Time)

### 1. Create GitHub repo
Push this folder to a new GitHub repo (e.g. `filmtabela/leverage-letter`).

### 2. Add GitHub Secrets
Go to **Settings → Secrets and variables → Actions → New repository secret**

Add these two secrets:

| Secret Name | Value |
|---|---|
| `BEEHIIV_API_KEY` | `6pIEjsia6r0KHh5K3wBXRLQSarsRsj28gJMTKyz6HVcatM49xjXv403VenT1g9mu` |
| `BEEHIIV_PUBLICATION_ID` | `d888affb-e2f4-463c-af7c-7b5121ab9b00` |

### 3. Enable Actions
Go to **Actions tab** → enable workflows if prompted.

---

## Publishing an Issue

### Option A — Scheduled (automatic)
Place your issue file at `issues/next.json`. The pipeline picks it up every Tuesday at 10am IST and sends it.

### Option B — Manual trigger
1. Go to **Actions → Leverage Letter — Auto Publish → Run workflow**
2. Enter the file path (e.g. `issues/002.json`) or leave blank for `next.json`
3. Click **Run workflow**

---

## Issue JSON Format

```json
{
  "issue_number": 4,
  "subject": "Email subject line here",
  "preview_text": "Preview text shown in inbox (under 150 chars)",

  "big_idea": {
    "headline": "Bold headline for the section",
    "body": "Main body paragraphs. Can be multiple sentences.",
    "highlight": "Optional pull quote or callout box text"
  },

  "tool": {
    "name": "Tool Name",
    "tagline": "One-line description",
    "description": "2-3 sentence explanation of what it does and why it matters",
    "best_for": "Who benefits most",
    "free_tier": "Yes/No + details",
    "url": "https://tool-url.com"
  },

  "prompt": {
    "context": "Setup sentence before the prompt box",
    "text": "The actual prompt text. Use \\n for line breaks.",
    "why_it_works": "Brief explanation after the prompt"
  },

  "stat": {
    "number": "73%",
    "label": "Short label under the big number",
    "context": "2-3 sentences explaining why this stat matters"
  }
}
```

---

## Files

```
leverage-letter-autopublish/
├── publish.js              ← main script
├── issues/
│   ├── next.json           ← current queued issue (auto-deleted after send)
│   ├── 002.json            ← Issue #2 (meeting automation)
│   ├── 003.json            ← Issue #3 (email automation)
│   └── sent/               ← archived sent issues
└── .github/
    └── workflows/
        └── publish.yml     ← GitHub Actions schedule
```

---

## Manual Local Test

```bash
BEEHIIV_API_KEY=your_key BEEHIIV_PUBLICATION_ID=your_pub_id node publish.js issues/002.json
```
