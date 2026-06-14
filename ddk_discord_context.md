# Dracut Kenpo Karate (DKK) — Intake Form Project

## Overview
A student intake form system for **Dracut Kenpo Karate** (a local martial arts dojo in Dracut, MA) that collects parent/student information via a mobile-friendly web form and pipes submissions into **Square** as customer records.

## Key People
- **Owner/Operator**: Gabe (Gearrion)
- **Business**: Dracut Kenpo Karate LLC
- **Discord User**: Gearrion (ID: `394728754972196864`)

## Project Location
```
/home/henlafon/projects/dracut-kenpo/
```

## GitHub Repository
- **Remote**: `https://github.com/Dracken-Inc/dracut-kenpo.git`
- **Branch**: `main`
- **GitHub Pages URL**: `https://dracken-inc.github.io/dracut-kenpo/intake_form.html`

## File Inventory

| File | Purpose | In Git? |
|---|---|---|
| `intake_form.html` | Mobile-first student intake form (HTML/CSS/JS) | ✅ Yes |
| `logo.png` | DKK branding logo (header) | ✅ Yes |
| `intake-form-qr.png` | QR code image pointing to GitHub Pages URL | ✅ Yes |
| `dkk-intake-3333.js` | Node.js server (port 3333) — Square API integration | ❌ No (gitignored) |
| `start-dkk.sh` | Bash script to load `.env` and start the server | ❌ No (gitignored) |
| `.env` | Square credentials (`DKK_SQUARE_ACCESS_TOKEN`, `DKK_SQUARE_LOCATION_ID`) | ❌ No (gitignored) |
| `cloudflared-config.yml` | Cloudflare Tunnel config for `dkk.besttherapylowell.com` | ✅ Yes |
| `.gitignore` | Excludes `dkk-intake-3333.js`, `.env` | ✅ Yes |

## Architecture

```
┌─────────────────────┐
│  Parent/Student     │
│  fills form on      │
│  mobile device      │
└─────────┬───────────┘
          │
          │ POST /intake (JSON)
          │
          ▼
┌──────────────────────────────────────────┐
│  Cloudflare Tunnel (gbk10-intake)        │
│  dkk.besttherapylowell.com:443           │
│  → localhost:3333                        │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│  dkk-intake-3333.js (Node.js, port 3333) │
│  - Receives form JSON payload            │
│  - Creates/updates Square customer       │
│  - Stores intake data in customer note   │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│  Square API (connect.squareup.com)       │
│  Location ID: L8XCP3V5E186Y              │
│  MCC: 7997 (Sports Clubs)                │
└──────────────────────────────────────────┘
```

## Form Fields

### Section 1: Parent / Guardian
- **Full Name** (required) — `parentName`
- **Email** (required) — `parentEmail`
- **Phone** (required) — `parentPhone` — auto-formats to `(XXX) XXX-XXXX`

### Section 2: Student Information
- **Number of Students** (required) — `studentCount` — dropdown: 1–5+
- **Names of Students** (required, shown when count ≥ 1) — `studentNames` — comma-separated

### Section 3: Training Schedule
- **Training Frequency** (required) — `trainingFreq` — options: `once-a-week`, `unlimited`, `other`
- **How Did You Hear About Us** (optional) — `referral` — options: `word-of-mouth`, `google`, `social-media`, `flyer`, `other`

### Payload Sent to Server
```json
{
  "timestamp": "2026-06-14T...",
  "parentName": "...",
  "parentEmail": "...",
  "parentPhone": "...",
  "studentCount": "1",
  "studentNames": "...",
  "trainingFreq": "once-a-week",
  "referral": "google"
}
```

## Server (`dkk-intake-3333.js`)

- **Port**: `3333` (listens on `0.0.0.0`)
- **Endpoints**:
  - `POST /intake` — receives form submissions, creates/updates Square customer
  - `GET /health` — health check, returns `status`, `locationId`, `tokenSet`, `version`
- **Square API Version**: `2025-06-03`
- **Customer Creation Flow** (fixed 2026-06-14):
  1. Looks up existing customer by email via `findCustomerByEmail()`
  2. If found: calls `updateCustomer()` to refresh name/email/phone, then `updateCustomerNote()` with `{ previous, current }` to preserve history
  3. If not found: calls `createCustomer()`, formats phone to E.164 (`+1XXXXXXXXXX`)
  4. Stores intake data (student count, names, frequency, referral, timestamp) in customer `note` field as JSON
  5. Returns `{ success, action: 'created' | 'updated', customerId }`

## Environment Variables (`.env`)
```
DKK_SQUARE_ACCESS_TOKEN=<token>
DKK_SQUARE_LOCATION_ID=L8XCP3V5E186Y
```

## Cloudflare Tunnel Config (`cloudflared-config.yml`)
```yaml
tunnel: 2d88b4b7-3a92-4ca3-aa79-9ea5d90485bb
credentials-file: /home/henlafon/.cloudflared/2d88b4b7-3a92-4ca3-aa79-9ea5d90485bb.json

ingress:
  - hostname: besttherapylowell.com
    path: /dkk-intake
    service: http://localhost:3333
  - service: http://localhost:8188
  - service: http_status:404
```

**Note**: The form's `SUBMIT_URL` is `https://dkk.besttherapylowell.com/intake` — this routes through the Cloudflare Tunnel to port 3333.

## QR Code
- Points to: `https://dracken-inc.github.io/dracut-kenpo/intake_form.html`
- File: `intake-form-qr.png`

## Business Details (Square)
| Field | Value |
|---|---|
| **Business Name** | Dracut Kenpo Karate LLC (Main) |
| **Address** | 145 Broadway Rd, Dracut, MA |
| **Location ID** | `L8XCP3V5E186Y` |
| **MCC** | 7997 (Sports Clubs & Martial Arts) |

## Git History (most recent first)
```
f5c53ec fix: rename env vars to DKK_SQUARE_* prefix
c02dff9 fix: rename env vars to DKK_SQUARE_* to avoid collision with BTC tokens
c9abdd6 feat: move token to .env, gitignore it
31235ab chore: remove stale start-server.sh
9c5dc71 feat: QR code points to GitHub Pages URL
6e14e27 feat: update QR code to point to dkk.besttherapylowell.com
6f60899 feat: point form to Cloudflare Tunnel URL (dkk.besttherapylowell.com)
b58cf01 chore: remove server file from git, add to .gitignore
b2f1a5d feat: add DDK intake server (port 3333, DDK Square creds only)
e1e5543 feat: add DKK intake server (port 3333, reads credentials from env)
221077c feat: add DKK student intake form, logo, and QR code
```

## Security Notes
- `.env` and `dkk-intake-3333.js` are **gitignored** — Square token must never be committed
- `start-dkk.sh` should **not** be in the repo (loads `.env` which has secrets)
- Square app secret should **not** be stored in OpenClaw skill files
- Use short-lived Square access token + location_id in `.env` only

## Known Issues / Open Items
- The `start-dkk.sh` file was flagged by user as potentially being in GitHub — it is **not** in git (gitignored correctly)

## Fix Applied (2026-06-14) — Create/Update Logic
**Root Cause**: `handleIntake` always called `createCustomer` without first checking if a customer already existed by email. The `findCustomerByEmail` function was defined but never called. This meant:
- Every form submission created a new customer (or Square returned the existing one on duplicate email)
- `updateCustomerNote` then **overwrote** the customer's note with the new intake data
- Result: previous customers' intake notes were silently overwritten, making it look like "random users' info was being overwritten"

**Fix**: `handleIntake` now:
1. **First** calls `findCustomerByEmail(data.parentEmail)` to check for existing customer
2. If found: calls `updateCustomer()` to refresh name/email/phone, then `updateCustomerNote()` with `{ previous: oldNote, current: newNote }` structure to preserve history
3. If not found: calls `createCustomer()` as before, then `updateCustomerNote()` with the intake data
4. Returns `{ success: true, action: 'created' | 'updated', customerId }` so the form can distinguish

**Note**: The `{ previous, current }` structure only preserves the last 2 submissions. If long-term note history is needed, consider switching to a separate database or using Square's customer metadata fields.

## How to Start
```bash
cd /home/henlafon/projects/dracut-kenpo
./start-dkk.sh
# or manually:
export DKK_SQUARE_ACCESS_TOKEN="your-token"
export DKK_SQUARE_LOCATION_ID="L8XCP3V5E186Y"
node dkk-intake-3333.js
```

## Discord Session Context
- **Session**: `agent:main:discord:channel:965038597218648067`
- **Channel**: `#public-chat` (ID: `965038597218648067`)
- **Guild**: `965038597218648064`
- **Session ID**: `7606c3a6-a58e-43b8-866a-be67c90cc264`
- **Trajectory**: `/home/henlafon/.openclaw/agents/main/sessions/7606c3a6-a58e-43b8-866a-be67c90cc264.trajectory.jsonl`

### Recent User Requests (from Discord)
1. "QR code need to point to https://dracken-inc.github.io/dracut-kenpo/intake_form.html"
2. "the submit button passes the data to https://dkk.besttherapylowell.com and port 3333 receives the data like it was relayed and pipe a script out with a api call to square"
3. "gbk10-intake is the tunnel name"
4. Provided Square business details (name, address, location ID, MCC)
5. "/home/henlafon/projects/dracut-kenpo/start-dkk.sh should not be up in github, is it?"
