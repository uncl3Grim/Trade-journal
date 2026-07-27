# Trade Journal

A calendar-based trading journal: log trades manually, import via CSV, see
daily P&L color-coded on a calendar, and track win rate / stats.

## What's included (v1)

- Email/password login (multi-user — everyone's trades are private to them)
- Calendar view with green/red days
- Manual trade entry, edit, delete
- CSV import (works with a reformatted MT5 export — see below)
- Stats bar: total P&L, win rate, avg win/loss

## Not included yet (phase 2)

- **Live MT5 sync.** MetaQuotes doesn't offer a public API for this, so live
  sync requires a paid third-party bridge (MetaApi is the standard choice).
  For now, use the CSV import — export your MT5 "History" tab and reformat
  it to the template (button in the app) or ask me to write a converter once
  you see your actual MT5 export format.

---

## Deploying this yourself (no coding required beyond copy/paste)

### 1. Create a Supabase project (your database + login system)

1. Go to https://supabase.com → sign up (free tier is enough to start).
2. Create a new project. Pick any name/region, set a database password
   (save it somewhere).
3. Once it's ready, go to **SQL Editor** → New Query.
4. Open `supabase/schema.sql` from this project, copy all of it, paste it
   into the SQL editor, and click **Run**. This creates your trades table.
5. Go to **Project Settings → API**. You'll need two values in a minute:
   - **Project URL**
   - **anon public** key

### 2. Push this code to GitHub

1. Create a free GitHub account if you don't have one: https://github.com
2. Create a new repository (e.g. `trade-journal`).
3. Upload all the files in this project to that repository (GitHub's web
   interface lets you drag-and-drop files — click "Add file" → "Upload
   files").

### 3. Deploy to Vercel (hosting)

1. Go to https://vercel.com → sign up with your GitHub account.
2. Click **Add New → Project**, pick the `trade-journal` repo you uploaded.
3. Before clicking Deploy, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Project URL from step 1.5)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon public key from step 1.5)
4. Click **Deploy**. In ~1-2 minutes you'll get a live URL like
   `trade-journal-yourname.vercel.app`.
5. Later, when you have a domain (e.g. `mytradejournal.app`), you can add it
   under the Vercel project's **Domains** tab.

### 4. Try it

Visit your new URL, sign up with an email/password, and you're in. Click
any day on the calendar to log a trade, or use **Import trades** to bring
in a CSV.

---

## Running it on your own computer first (optional but recommended)

If you want to preview changes before they go live:

1. Install Node.js from https://nodejs.org (choose the LTS version).
2. Download/clone this project folder to your computer.
3. Copy `.env.local.example` to a new file named `.env.local` and fill in
   your Supabase URL/key.
4. Open a terminal in the project folder and run:
   ```
   npm install
   npm run dev
   ```
5. Open http://localhost:3000 in your browser.

---

## What to ask me for next

- A converter for your actual MT5 export format (send me a sample export
  and I'll build the exact parser)
- Live MT5 sync via MetaApi once you're ready to wire that in
- Screenshot/chart attachments per trade
- Tags/strategies, equity curve chart, weekly/monthly summary reports
- Custom domain + branding polish
