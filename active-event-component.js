/**
 * SPRING LAKES POKER LEAGUE - ACTIVE EVENT COMPONENT
 * 
 * Displays RSVP form for upcoming events, converts to results display after event date.
 * Place at top of homepage (above past event summaries).
 */

const ACTIVE_EVENT = {
  // Initialize the component
  async init() {
    const db = getSupabase();
    const container = document.getElementById('active-event-container');
    
    if (!container) {
      console.warn('active-event-container div not found');
      return;
    }

    try {
      // Get the next upcoming event (event_date >= today)
      const today = new Date().toISOString().split('T')[0];
      
      const { data: events, error } = await db
        .from('events')
        .select('*')
        .eq('season', 19)
        .gte('event_date', today)
        .order('event_number', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (events && events.length > 0) {
        const upcomingEvent = events[0];
        await this.renderUpcomingEvent(upcomingEvent, container, db);
      } else {
        // No upcoming events, show the most recent completed event
        const { data: pastEvents } = await db
          .from('events')
          .select('*')
          .eq('season', 19)
          .lt('event_date', today)
          .order('event_number', { ascending: false })
          .limit(1);

        if (pastEvents && pastEvents.length > 0) {
          await this.renderPastEvent(pastEvents[0], container, db);
        }
      }
    } catch (err) {
      console.error('Error initializing active event:', err);
      container.innerHTML = '<p class="error">Error loading event</p>';
    }
  },

  // Render upcoming event with RSVP form
  async renderUpcomingEvent(event, container, db) {
    const eventDate = new Date(event.event_date);
    const daysUntil = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24));

    // Check if user already RSVP'd
    const userEmail = localStorage.getItem('slpl_user_email') || '';
    let existingRsvp = null;
    
    if (userEmail) {
      const { data } = await db
        .from('rsvps')
        .select('*')
        .eq('event_id', event.id)
        .eq('email', userEmail)
        .single();
      existingRsvp = data;
    }

    const html = `
      <div class="active-event-section">
        <div class="active-event-header">
          <div class="active-event-title">
            <span class="event-label">UPCOMING</span>
            <h2>E${event.event_number} ${event.event_name}</h2>
            <p class="event-meta">
              ${eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
              <span class="bullet">•</span> 
              ${event.game_type}
            </p>
          </div>
          <div class="event-countdown">
            <div class="days-number">${daysUntil}</div>
            <div class="days-label">day${daysUntil !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div class="event-details-grid">
          <div class="detail-item">
            <span class="detail-label">Location</span>
            <span class="detail-value">${event.location || 'Dave\'s Poker Room'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Format</span>
            <span class="detail-value">${event.game_type}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Current RSVPs</span>
            <span class="detail-value" id="rsvp-count">Loading...</span>
          </div>
        </div>

        <form id="rsvp-form" class="rsvp-form">
          <h3>RSVP for Event</h3>
          
          <div class="form-group">
            <label for="rsvp-name">Your Name</label>
            <input 
              type="text" 
              id="rsvp-name" 
              name="name"
              placeholder="First & Last Name"
              value="${existingRsvp ? existingRsvp.name : ''}"
              required
            >
          </div>

          <div class="form-group">
            <label for="rsvp-email">Email</label>
            <input 
              type="email" 
              id="rsvp-email" 
              name="email"
              placeholder="your@email.com"
              value="${existingRsvp ? existingRsvp.email : userEmail}"
              required
            >
          </div>

          <div class="form-group">
            <label>Will you attend?</label>
            <div class="radio-group">
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="attending" 
                  value="yes"
                  ${existingRsvp && existingRsvp.attending === true ? 'checked' : ''}
                  required
                >
                <span>Yes, I'm in</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="attending" 
                  value="no"
                  ${existingRsvp && existingRsvp.attending === false ? 'checked' : ''}
                >
                <span>No, can't make it</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="attending" 
                  value="maybe"
                  ${existingRsvp && existingRsvp.attending === null ? 'checked' : ''}
                >
                <span>Maybe</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="rsvp-notes">Notes (dietary, buy-in preference, etc.)</label>
            <textarea 
              id="rsvp-notes" 
              name="notes"
              placeholder="Optional: Any notes for the organizer?"
              rows="3"
            >${existingRsvp ? existingRsvp.notes : ''}</textarea>
          </div>

          <button type="submit" class="btn-primary">
            ${existingRsvp ? 'Update RSVP' : 'Submit RSVP'}
          </button>
          <p class="form-note">Your email will be saved locally so you can update your RSVP later.</p>
        </form>

        <div id="form-message" class="form-message" style="display:none;"></div>
      </div>
    `;

    container.innerHTML = html;
    this.loadRsvpCount(event.id, db);
    this.attachFormHandler(event.id, db);
  },

  // Render past event with results
  async renderPastEvent(event, container, db) {
    const { data: results } = await db
      .from('results')
      .select(`
        id,
        finish_position,
        points,
        payout,
        player_id,
        players(name)
      `)
      .eq('event_id', event.id)
      .order('finish_position', { ascending: true });

    const resultRows = (results || [])
      .map((r, i) => `
        <tr class="${i === 0 ? 'winner' : ''}">
          <td class="finish">${r.finish_position}</td>
          <td class="name">${r.players.name}</td>
          <td class="points">${r.points}</td>
          <td class="payout">${r.payout ? '$' + r.payout : ''}</td>
        </tr>
      `)
      .join('');

    const html = `
      <div class="active-event-section completed">
        <div class="active-event-header">
          <div class="active-event-title">
            <span class="event-label completed">COMPLETED</span>
            <h2>E${event.event_number} ${event.event_name}</h2>
            <p class="event-meta">${new Date(event.event_date).toLocaleDateString()}</p>
          </div>
        </div>

        <table class="results-table">
          <thead>
            <tr>
              <th>Finish</th>
              <th>Player</th>
              <th>Points</th>
              <th>Payout</th>
            </tr>
          </thead>
          <tbody>
            ${resultRows}
          </tbody>
        </table>

        <a href="rankings.html" class="btn-secondary">View Full Season Rankings</a>
      </div>
    `;

    container.innerHTML = html;
  },

  // Load and display RSVP count
  async loadRsvpCount(eventId, db) {
    const { count } = await db
      .from('rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('attending', true);

    const countEl = document.getElementById('rsvp-count');
    if (countEl) {
      countEl.textContent = count || 0;
    }
  },

  // Attach form submission handler
  attachFormHandler(eventId, db) {
    const form = document.getElementById('rsvp-form');
    const messageDiv = document.getElementById('form-message');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const name = formData.get('name');
      const email = formData.get('email');
      const attending = formData.get('attending') === 'yes' ? true : formData.get('attending') === 'no' ? false : null;
      const notes = formData.get('notes');

      // Save email to localStorage for future reference
      localStorage.setItem('slpl_user_email', email);

      try {
        // Check if RSVP already exists
        const { data: existing } = await db
          .from('rsvps')
          .select('id')
          .eq('event_id', eventId)
          .eq('email', email)
          .single();

        let result;
        if (existing) {
          // Update existing RSVP
          result = await db
            .from('rsvps')
            .update({ name, attending, notes, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          // Insert new RSVP
          result = await db
            .from('rsvps')
            .insert([{
              event_id: eventId,
              name,
              email,
              attending,
              notes,
              created_at: new Date().toISOString()
            }]);
        }

        if (result.error) throw result.error;

        // Show success message
        messageDiv.className = 'form-message success';
        messageDiv.textContent = existing ? '✓ RSVP updated!' : '✓ RSVP submitted!';
        messageDiv.style.display = 'block';

        // Reload RSVP count
        this.loadRsvpCount(eventId, db);

        // Clear message after 3 seconds
        setTimeout(() => {
          messageDiv.style.display = 'none';
        }, 3000);

      } catch (err) {
        messageDiv.className = 'form-message error';
        messageDiv.textContent = '✗ Error submitting RSVP: ' + err.message;
        messageDiv.style.display = 'block';
      }
    });
  }
};

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ACTIVE_EVENT.init());
} else {
  ACTIVE_EVENT.init();
}
