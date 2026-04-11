# Spring Lakes Poker League Website

A clean, white-background site with live season rankings powered by Supabase.

## Files

```
slpl-site/
├── index.html          ← Homepage (latest event + schedule sidebar)
├── rankings.html       ← Live season standings
├── schedule.html       ← Full season schedule
├── rules.html          ← Rules & blind structure
├── style.css           ← All styles
├── config.js           ← PUBLIC Supabase keys (anon key only)
├── supabase.js         ← Shared client helper
├── supabase_setup.sql  ← Run this in Supabase to create tables
├── .gitignore
└── admin/
    ├── index.html      ← Password-protected admin panel
    ├── config.js       ← PRIVATE (in .gitignore — never commit!)
    └── points.js       ← Points calculation engine
```

---

## Setup Instructions

### Step 1 — Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (free tier is fine)
3. Wait for it to initialize (~1 minute)

### Step 2 — Run the Database Setup
1. In your Supabase dashboard, click **SQL Editor**
2. Paste the contents of `supabase_setup.sql` and click **Run**
3. This creates tables and seeds Season 19 players + schedule

### Step 3 — Get Your API Keys
1. In Supabase, go to **Settings → API**
2. Copy your **Project URL** and **anon/public key**

### Step 4 — Fill In Config Files
Edit `config.js` (public pages):
```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...';
```

Edit `admin/config.js` (admin panel only):
```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...';
const ADMIN_PASSWORD = 'SpringLakes2008$$';
const SEASON = 19;
```

### Step 5 — Deploy to GitHub Pages
1. Create a new GitHub repository (can be public — admin/config.js is gitignored)
2. Upload all files
3. Go to **Settings → Pages → Source: main branch / root folder**
4. Your site will be live at `https://yourusername.github.io/repo-name/`

### Step 6 — Backfill Events 1–4
Open `admin/index.html` and enter results for S19E1 through S19E4.
You can use the BlindValet CSV export or enter manually.

### Step 7 — Embed on Your Existing WordPress Site
To embed the rankings on your existing WordPress site, add this to any page:
```html
<iframe src="https://yourusername.github.io/repo-name/rankings.html"
        width="100%" height="600px"
        style="border:none;"></iframe>
```
Or just link directly to the pages from your WordPress nav.

---

## Using the Admin Panel

1. Go to `admin/index.html`
2. Enter password: `SpringLakes2008$$`
3. **Enter Results tab:**
   - Fill in event number, name, date, game type, player count
   - Either paste the BlindValet CSV export, or manually assign finish positions from the dropdowns
   - Click **Save Event Results** — points are auto-calculated
4. **Roster tab:** Add/deactivate players
5. **Event History:** View or delete past events

## Points Formula
- N-player event: last place = 1 pt, +1 per place up
- Top 25% (min 2 players) get bonus points: 1st gets N bonus pts (total = 2N), 2nd gets floor(N/2), 3rd gets floor(N/4), etc.
- Winner gets +2,000 TOC Bonus Chips
- TOC Chips = Total Season Points × 100 + (wins × 2,000)

## Embedding on springlakespoker.com
You have two options:
1. **Full replacement:** Point your domain to GitHub Pages
2. **iframe embed:** Add the iframe code above to your WordPress rankings page
