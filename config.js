// Shared "TCG-DMD Overall" project; poker tables live in the poker_league schema.
const SUPABASE_URL = 'https://utucjtnhdkewcgyvgvsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4OrSCnTMRaXai768QwAqeQ_U7w7CPuT';
const DB_SCHEMA = 'poker_league';


// ─── Season ───
// LIVE_SEASON is what the public site shows. To publish Season 20:
// run season20_schedule.sql (once), then change this to 20.
const LIVE_SEASON = 19;

// Preview an unpublished season by adding ?preview=20 to any page URL.
// Previews are read-only: RSVPs are turned off.
const PREVIEW_SEASON = parseInt(new URLSearchParams(location.search).get('preview')) || null;
const SITE_SEASON = PREVIEW_SEASON || LIVE_SEASON;
const FIRST_ARCHIVED_SEASON = 19;

// tocTab: show the TOC tab in the menu. Turn it on for Season 20 when
// that season's TOC sign-ups open.
const SEASON_INFO = {
  19: { roman: 'XIX', year: 2026, header: 'header.jpeg',    tocTab: true },
  20: { roman: 'XX',  year: 2027, header: 'header-s20.jpg', tocTab: false },
};
const SEASON_META = SEASON_INFO[SITE_SEASON] || { roman: String(SITE_SEASON), year: 2007 + SITE_SEASON, header: 'header.jpeg', tocTab: false };

// Fill in season text and the header image:
//   data-season-roman → XX   data-season-num → 20
//   data-season-year  → 2027 data-season-years → 2008–2027
document.addEventListener('DOMContentLoaded', () => {
  const set = (attr, text) => document.querySelectorAll(`[${attr}]`).forEach(el => { el.textContent = text; });
  set('data-season-roman', SEASON_META.roman);
  set('data-season-num', SITE_SEASON);
  set('data-season-year', SEASON_META.year);
  set('data-season-years', `2008–${SEASON_META.year}`);
  document.querySelectorAll('.hero-img').forEach(img => {
    if (!img.getAttribute('src').endsWith(SEASON_META.header)) img.src = SEASON_META.header;
    img.alt = `Spring Lakes Poker League Season ${SEASON_META.roman}`;
  });

  // "Past Seasons" shows up in the menu once there's a finished season
  // before the one on screen (Season 19 is the first one in the database).
  const nav = document.querySelector('.site-nav');
  if (nav && !SEASON_META.tocTab) {
    nav.querySelectorAll('a[href^="toc.html"]').forEach(a => a.remove());
  }
  if (nav && SITE_SEASON > FIRST_ARCHIVED_SEASON && !nav.querySelector('[href^="past-seasons.html"]')) {
    const link = document.createElement('a');
    link.href = 'past-seasons.html';
    link.className = 'nav-link' + (location.pathname.endsWith('past-seasons.html') ? ' active' : '');
    link.textContent = 'PAST SEASONS';
    nav.appendChild(link);
  }

  if (PREVIEW_SEASON) {
    // Keep the preview on as you click around
    document.querySelectorAll('a[href$=".html"]').forEach(a => {
      a.href = `${a.getAttribute('href')}?preview=${PREVIEW_SEASON}`;
    });
    const bar = document.createElement('div');
    bar.className = 'preview-bar';
    bar.textContent = `PREVIEW — Season ${SITE_SEASON} is not published yet. RSVPs are off.`;
    document.body.prepend(bar);
  }
});
