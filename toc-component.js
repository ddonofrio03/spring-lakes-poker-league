/**
 * SPRING LAKES POKER LEAGUE - TOURNAMENT OF CHAMPIONS COMPONENT
 *
 * TOC sign-up (RSVP) plus a live seating chart. Starting stacks come from
 * the season leaderboard (10,000 + league pts x 100 + 2,000 per win), and
 * players are split across tables so each table holds about the same
 * number of chips.
 */

const TOC = {
  SEASON: 19,
  BASE_STACK: 10000,
  START_TIME: '6:00 PM',
  BUY_IN: 60,
  SEASON_POT: 1720, // TOC kitty collected during the season ($20 per regular-event entry)
  MISSED_EVENT_FEE: 20,
  EVENTS_TO_QUALIFY: 4,
  SEATS_PER_TABLE: 9,
  TABLE_NAMES: ['Main Tan Table', 'New Cool Table', 'Table 3'],
  // Dave's regular seat: always Main Tan Table, seat 5
  PINNED: { name: 'Dave D', seat: 5 },

  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  fmt(n) {
    return Math.round(n).toLocaleString('en-US');
  },

  // Payout percentages from the Rules & Structure page table
  payoutPcts(numPlayers) {
    if (numPlayers <= 10) return [0.65, 0.35];
    if (numPlayers <= 14) return [0.50, 0.32, 0.18];
    return [0.50, 0.25, 0.16, 0.09];
  },

  // Round each place to the nearest $10; any rounding drift goes to 1st
  // so the payouts always add up to the prize pool (same as the admin page).
  calcPayouts(numPlayers, pool) {
    const pcts = this.payoutPcts(numPlayers);
    const payouts = pcts.map(pct => Math.round(pool * pct / 10) * 10);
    payouts[0] += Math.round((pool - payouts.reduce((s, a) => s + a, 0)) / 10) * 10;
    return payouts.map((amount, i) => ({ place: i + 1, pct: pcts[i], amount }));
  },

  ordinal(n) {
    return n + (['th', 'st', 'nd', 'rd'][n] || 'th');
  },

  // Season stats per player, same math as the rankings page
  async loadStandings(db) {
    const { data: results, error } = await db
      .from('results')
      .select('points, is_winner, players(name), events!inner(season)')
      .eq('events.season', this.SEASON);
    if (error) throw error;

    const map = {};
    (results || []).forEach(r => {
      if (!r.players) return;
      const name = r.players.name;
      const p = map[name] || (map[name] = { name, events: 0, wins: 0, points: 0 });
      p.events++;
      p.points += r.points;
      if (r.is_winner) p.wins++;
    });

    Object.values(map).forEach(p => {
      p.bonusChips = p.points * 100 + p.wins * 2000;
      p.chips = this.BASE_STACK + p.bonusChips;
      p.qualified = p.events >= this.EVENTS_TO_QUALIFY || p.wins > 0;
      p.missed = p.qualified ? 0 : this.EVENTS_TO_QUALIFY - p.events;
      p.owed = this.BUY_IN + p.missed * this.MISSED_EVENT_FEE;
    });
    return map;
  },

  // Split players into tables with equal head counts (within one) and chip
  // totals as close as possible, then seat each table big/small alternating.
  buildSeating(players) {
    const n = players.length;
    if (n === 0) return [];

    const sorted = [...players].sort((a, b) => b.chips - a.chips || a.name.localeCompare(b.name));
    const numTables = Math.ceil(n / this.SEATS_PER_TABLE);
    let groups;

    if (numTables === 1) {
      groups = [sorted];
    } else if (numTables === 2) {
      groups = this.bestTwoWaySplit(sorted);
    } else {
      groups = this.greedySplit(sorted, numTables);
    }

    const sum = g => g.reduce((s, p) => s + p.chips, 0);
    const hasPinned = g => g.some(p => p.name === this.PINNED.name);

    return groups
      .map(g => [...g].sort((a, b) => b.chips - a.chips || a.name.localeCompare(b.name)))
      // Main Tan Table is the pinned player's table, then the bigger table, then more chips
      .sort((a, b) => hasPinned(b) - hasPinned(a) || b.length - a.length || sum(b) - sum(a))
      .map((g, i) => {
        const total = sum(g);
        return {
          name: this.TABLE_NAMES[i] || `Table ${i + 1}`,
          seats: this.assignSeats(g),
          total,
          avg: total / g.length
        };
      });
  },

  // Interleave stacks around the table, keeping the pinned player in their seat
  assignSeats(group) {
    const pinned = group.find(p => p.name === this.PINNED.name);
    const others = this.interleave(group.filter(p => p !== pinned));
    const seats = [];
    let seat = 1;
    others.forEach(p => {
      if (pinned && seat === this.PINNED.seat) seat++;
      seats.push({ seat: seat++, ...p });
    });
    if (pinned) seats.push({ seat: this.PINNED.seat, ...pinned });
    return seats.sort((a, b) => a.seat - b.seat);
  },

  // Exact search: try every way to pick the Main Tan Table's players.
  // Tan always gets the extra player on an odd count, and the pinned
  // player (Dave) always sits at Tan.
  bestTwoWaySplit(sorted) {
    const n = sorted.length;
    const sizeA = Math.ceil(n / 2);
    const grand = sorted.reduce((s, p) => s + p.chips, 0);
    const pinnedIdx = sorted.findIndex(p => p.name === this.PINNED.name);
    let bestMask = 0, bestDiff = Infinity;

    for (let mask = 0; mask < (1 << n); mask++) {
      if (pinnedIdx >= 0 && !(mask & (1 << pinnedIdx))) continue;
      let count = 0, sumA = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) { count++; sumA += sorted[i].chips; }
      }
      if (count !== sizeA) continue;
      const diff = Math.abs(sumA - (grand - sumA));
      if (diff < bestDiff) { bestDiff = diff; bestMask = mask; }
    }

    const a = [], b = [];
    sorted.forEach((p, i) => (bestMask & (1 << i) ? a : b).push(p));
    return [a, b];
  },

  // 3+ tables: deal biggest stacks to the lightest table, then improve with swaps.
  greedySplit(sorted, numTables) {
    const n = sorted.length;
    const caps = Array.from({ length: numTables }, (_, i) => Math.floor(n / numTables) + (i < n % numTables ? 1 : 0));
    const groups = caps.map(() => []);
    const sum = g => g.reduce((s, p) => s + p.chips, 0);

    sorted.forEach(p => {
      let best = -1;
      groups.forEach((g, i) => {
        if (g.length < caps[i] && (best < 0 || sum(g) < sum(groups[best]))) best = i;
      });
      groups[best].push(p);
    });

    const spread = () => { const t = groups.map(sum); return Math.max(...t) - Math.min(...t); };
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < numTables; i++) for (let j = i + 1; j < numTables; j++)
        for (let x = 0; x < groups[i].length; x++) for (let y = 0; y < groups[j].length; y++) {
          const before = spread();
          [groups[i][x], groups[j][y]] = [groups[j][y], groups[i][x]];
          if (spread() < before) improved = true;
          else [groups[i][x], groups[j][y]] = [groups[j][y], groups[i][x]];
        }
    }
    return groups;
  },

  // Biggest, smallest, 2nd biggest, 2nd smallest... so big stacks aren't side by side
  interleave(group) {
    const out = [];
    let lo = 0, hi = group.length - 1;
    while (lo <= hi) {
      out.push(group[lo++]);
      if (lo <= hi) out.push(group[hi--]);
    }
    return out;
  },

  async render(container, sched, db) {
    const standings = await this.loadStandings(db);
    const players = Object.values(standings).sort((a, b) => a.name.localeCompare(b.name));

    const eventDate = new Date(sched.event_date + 'T00:00:00');
    const daysUntil = Math.max(0, Math.ceil((eventDate - new Date()) / 86400000));
    const dateLabel = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const location = sched.location || "Dave's Poker Room";

    const options = players
      .map(p => `<option value="${this.esc(p.name)}">${this.esc(p.name)} (${this.fmt(p.chips)} chips)</option>`)
      .join('');

    container.innerHTML = `
      <div class="active-event-section toc-section">
        <div class="active-event-header">
          <div class="active-event-title">
            <span class="event-label">YOU'RE INVITED</span>
            <h2>Season ${this.SEASON} Tournament of Champions</h2>
            <p class="event-meta">
              ${dateLabel} <span class="bullet">•</span> ${this.START_TIME} <span class="bullet">•</span> ${this.esc(sched.game_type || 'NLHE')} at ${this.esc(location)}
            </p>
          </div>
          <div class="event-countdown">
            <div class="days-number">${daysUntil}</div>
            <div class="days-label">day${daysUntil !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div class="event-details-grid">
          <div class="detail-item">
            <span class="detail-label">Start Time</span>
            <span class="detail-value">${this.START_TIME}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Buy-in</span>
            <span class="detail-value">$${this.BUY_IN}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Starting Stack</span>
            <span class="detail-value toc-small">10,000 + <a href="rankings.html">TOC Bonus Chips</a></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Signed Up</span>
            <span class="detail-value" id="toc-count">0</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Chips in Play</span>
            <span class="detail-value" id="toc-chips">0</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Prize Pool</span>
            <span class="detail-value" id="toc-pot">$${this.fmt(this.SEASON_POT)}</span>
          </div>
        </div>
        <p class="toc-pot-breakdown" id="toc-pot-breakdown"></p>
        <div class="toc-payouts" id="toc-payouts"></div>

        <p class="toc-note">
          Open to everyone who played Season ${this.SEASON}. Qualified (4+ events or a win)? Just sign up.
          Played fewer than 4 events? Add $${this.MISSED_EVENT_FEE} per missed event to your buy-in.
        </p>

        <div class="toc-seating-wrap">
          <h3>Seating Chart</h3>
          <p class="toc-seating-sub">Updates live as people sign up. Tables are balanced so each holds about the same number of chips.</p>
          <div id="toc-seating"></div>
        </div>

        <form id="toc-form" class="rsvp-form">
          <h3>Sign Up for the TOC</h3>

          <div class="form-group">
            <label for="toc-name">Your Name</label>
            <select id="toc-name" required>
              <option value="">-- Select your name --</option>
              ${options}
            </select>
            <div id="toc-player-info" class="toc-player-info" style="display:none;"></div>
          </div>

          <div class="form-group">
            <label>Will you play?</label>
            <div class="radio-group">
              <label class="radio-label"><input type="radio" name="attending" value="yes" required><span>Yes, I'm in</span></label>
              <label class="radio-label"><input type="radio" name="attending" value="no"><span>No, can't make it</span></label>
              <label class="radio-label"><input type="radio" name="attending" value="maybe"><span>Maybe</span></label>
            </div>
          </div>

          <div class="form-group">
            <label for="toc-notes">Notes (optional)</label>
            <textarea id="toc-notes" rows="2" placeholder="Any notes for the organizer?"></textarea>
          </div>

          <button type="submit" class="btn-primary">Submit</button>
        </form>

        <div id="toc-message" class="form-message" style="display:none;"></div>
      </div>
    `;

    const select = document.getElementById('toc-name');
    const info = document.getElementById('toc-player-info');
    select.addEventListener('change', () => {
      const p = standings[select.value];
      if (!p) { info.style.display = 'none'; return; }
      info.innerHTML = p.qualified
        ? `<strong>${this.fmt(p.chips)}</strong> starting chips &nbsp;•&nbsp; Qualified ✓ &nbsp;•&nbsp; Buy-in $${p.owed}`
        : `<strong>${this.fmt(p.chips)}</strong> starting chips &nbsp;•&nbsp; ${p.events} of ${this.EVENTS_TO_QUALIFY} events played &nbsp;•&nbsp;
           Buy-in $${this.BUY_IN} + $${p.missed * this.MISSED_EVENT_FEE} for ${p.missed} missed = <strong>$${p.owed}</strong>`;
      info.style.display = 'block';
    });

    await this.loadSeating(sched.id, standings, db);
    this.attachFormHandler(sched.id, standings, db);
  },

  async loadSeating(eventId, standings, db) {
    const { data: rsvps, error } = await db
      .from('rsvps')
      .select('name, attending')
      .eq('event_id', eventId);
    if (error) { console.error('Error loading TOC RSVPs:', error); return; }

    const inNames = new Set((rsvps || []).filter(r => r.attending === true).map(r => r.name));
    const signedUp = [...inNames].map(name => standings[name] || {
      // Name not in this season's results: base stack, full missed-event fee
      name, events: 0, wins: 0, points: 0, bonusChips: 0, chips: this.BASE_STACK,
      qualified: false, missed: this.EVENTS_TO_QUALIFY,
      owed: this.BUY_IN + this.EVENTS_TO_QUALIFY * this.MISSED_EVENT_FEE
    });

    const tables = this.buildSeating(signedUp);
    const totalChips = signedUp.reduce((s, p) => s + p.chips, 0);
    document.getElementById('toc-count').textContent = signedUp.length;
    document.getElementById('toc-chips').textContent = this.fmt(totalChips);

    // Prize pool: season kitty + $60 per player + $20 per missed event
    const buyIns = signedUp.length * this.BUY_IN;
    const addIns = signedUp.reduce((s, p) => s + p.missed * this.MISSED_EVENT_FEE, 0);
    document.getElementById('toc-pot').textContent = '$' + this.fmt(this.SEASON_POT + buyIns + addIns);
    document.getElementById('toc-pot-breakdown').innerHTML =
      `Prize pool: $${this.fmt(this.SEASON_POT)} season TOC pot` +
      ` + $${this.fmt(buyIns)} in buy-ins (${signedUp.length} &times; $${this.BUY_IN})` +
      ` + $${this.fmt(addIns)} in missed-event add-ins` +
      ` = <strong>$${this.fmt(this.SEASON_POT + buyIns + addIns)}</strong>`;

    const payoutsEl = document.getElementById('toc-payouts');
    if (signedUp.length) {
      const payouts = this.calcPayouts(signedUp.length, this.SEASON_POT + buyIns + addIns);
      payoutsEl.innerHTML = `
        <h3>Running Payouts</h3>
        <p class="toc-seating-sub">Based on ${signedUp.length} player${signedUp.length !== 1 ? 's' : ''} signed up, per the <a href="rules.html">payout structure</a>. Changes as people sign up.</p>
        <div class="toc-payout-row">
          ${payouts.map(p => `
            <div class="toc-payout">
              <span class="toc-payout-place">${this.ordinal(p.place)}</span>
              <span class="toc-payout-amt">$${this.fmt(p.amount)}</span>
              <span class="toc-payout-pct">${Math.round(p.pct * 100)}%</span>
            </div>`).join('')}
        </div>`;
    } else {
      payoutsEl.innerHTML = '';
    }

    const wrap = document.getElementById('toc-seating');
    if (!tables.length) {
      wrap.innerHTML = '<p class="muted">No one has signed up yet. Be the first!</p>';
      return;
    }

    let html = '<div class="toc-tables">';
    tables.forEach(t => {
      html += `
        <div class="toc-table-card">
          <div class="toc-table-head">
            <h4>${this.esc(t.name)}</h4>
            <span>${t.seats.length} player${t.seats.length !== 1 ? 's' : ''}</span>
          </div>
          <table class="results-table toc-seat-table">
            <thead><tr><th>Seat</th><th>Player</th><th>Stack</th><th>Buy-in</th></tr></thead>
            <tbody>
              ${t.seats.map(s => `
                <tr>
                  <td>${s.seat}</td>
                  <td>${this.esc(s.name)}</td>
                  <td>${this.fmt(s.chips)}</td>
                  <td>$${s.owed}${s.missed ? `<span class="toc-owed-note"> (${s.missed} missed)</span>` : ''}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div class="toc-table-foot">
            <span>Total <strong>${this.fmt(t.total)}</strong></span>
            <span>Avg stack <strong>${this.fmt(t.avg)}</strong></span>
          </div>
        </div>`;
    });
    html += '</div>';

    if (tables.length > 1) {
      const totals = tables.map(t => t.total);
      html += `<p class="toc-balance">Chip difference between tables: <strong>${this.fmt(Math.max(...totals) - Math.min(...totals))}</strong></p>`;
    } else {
      html += `<p class="toc-balance">One table until ${this.SEATS_PER_TABLE + 1} players sign up, then it splits into two balanced tables.</p>`;
    }

    // Qualified players we haven't heard from yet
    const answered = new Set((rsvps || []).map(r => r.name));
    const waiting = Object.values(standings).filter(p => p.qualified && !answered.has(p.name)).map(p => p.name).sort();
    if (waiting.length) {
      html += `<p class="toc-waiting"><strong>Qualified, not signed up yet:</strong> ${waiting.map(n => this.esc(n)).join(', ')}</p>`;
    }

    wrap.innerHTML = html;
  },

  attachFormHandler(eventId, standings, db) {
    const form = document.getElementById('toc-form');
    const msg = document.getElementById('toc-message');
    const select = document.getElementById('toc-name');

    const show = (cls, text) => {
      msg.className = 'form-message ' + cls;
      msg.textContent = text;
      msg.style.display = 'block';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = select.value;
      const choice = new FormData(form).get('attending');
      const attending = choice === 'yes' ? true : choice === 'no' ? false : null;
      const notes = document.getElementById('toc-notes').value;

      if (!name) { show('error', '✗ Please select your name'); return; }

      try {
        const { data: existing, error: findErr } = await db
          .from('rsvps')
          .select('id')
          .eq('event_id', eventId)
          .eq('name', name)
          .maybeSingle();
        if (findErr) throw findErr;

        const result = existing
          ? await db.from('rsvps').update({ attending, notes, updated_at: new Date().toISOString() }).eq('id', existing.id)
          : await db.from('rsvps').insert([{ event_id: eventId, name, email: name, attending, notes }]);
        if (result.error) throw result.error;

        show('success', attending === true
          ? `✓ You're in! Starting stack: ${this.fmt(standings[name]?.chips ?? this.BASE_STACK)} chips.`
          : '✓ Response saved.');
        form.reset();
        document.getElementById('toc-player-info').style.display = 'none';
        await this.loadSeating(eventId, standings, db);
      } catch (err) {
        show('error', '✗ Error submitting: ' + err.message);
      }
    });
  }
};
