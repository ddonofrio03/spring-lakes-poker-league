/**
 * SPRING LAKES POKER LEAGUE - ACTIVE EVENT COMPONENT
 * 
 * Displays RSVP form for upcoming events with attendee list,
 * converts to results display after event date.
 * No email field - uses name as identifier.
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

    const html = `
      <div class="active-event-section">
        <div class="active-event-header">
          <div class="active-event-title">
            <span class="event-label">UPCOMING</span>
            <h2>E${event.event_number} ${event.event_name}</h2>
            <p class="event-meta">
              ${eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
              <span class="bullet">•</span> 
              ${event.game_type} at ${event.location || 'Dave\'s Poker Room'}
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
            <span class="detail-label">Confirmed Attendees</span>
            <span class="detail-value" id="rsvp-count">0</span>
          </div>
        </div>

        <!-- Attendee List -->
        <div class="attendee-list-section" id="attendee-list-section" style="display:none;">
          <h3>Who's Attending</h3>
          <ul id="attendee-list" class="attendee-list"></ul>
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
                  required
                >
                <span>Yes, I'm in</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="attending" 
                  value="no"
                >
                <span>No, can't make it</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="attending" 
                  value="maybe"
                >
                <span>Maybe</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="rsvp-notes">Notes (optional)</label>
            <textarea 
              id="rsvp-notes" 
              name="notes"
              placeholder="Any notes for the organizer?"
              rows="3"
            ></textarea>
          </div>

          <button type="submit" class="btn-primary">Submit RSVP</button>
        </form>

        <div id="form-message" class="form-message" style="display:none;"></div>
      </div>
    `;

    container.innerHTML = html;
    this.loadRsvpCount(event.id, db);
    this.loadAttendeeList(event.id, db);
    this.attachFormHandler(event.id, db);
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

  // Load and display attendee list
  async loadAttendeeList(eventId, db) {
    const { data: attendees, error } = await db
      .from('rsvps')
      .select('id, name, created_at')
      .eq('event_id', eventId)
      .eq('attending', true)
      .order('created_at', { ascending: true });

    const listSection = document.getElementById('attendee-list-section');
    const listEl = document.getElementById('attendee-list');

    if (error) {
      console.error('Error loading attendees:', error);
      return;
    }

    if (attendees && attendees.length > 0) {
      listSection.style.display = 'block';
      listEl.innerHTML = attendees
        .map(a => `<li class="attendee-item">${a.name}</li>`)
        .join('');
    } else {
      listSection.style.display = 'none';
    }
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

  // Attach form submission handler
  attachFormHandler(eventId, db) {
    const form = document.getElementById('rsvp-form');
    const messageDiv = document.getElementById('form-message');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const name = formData.get('name').trim();
      const attending = formData.get('attending') === 'yes' ? true : formData.get('attending') === 'no' ? false : null;
      const notes = formData.get('notes');

      if (!name) {
        messageDiv.className = 'form-message error';
        messageDiv.textContent = '✗ Please enter your name';
        messageDiv.style.display = 'block';
        return;
      }

      try {
        // Check if RSVP already exists for this name
        const { data: existing } = await db
          .from('rsvps')
          .select('id')
          .eq('event_id', eventId)
          .eq('name', name)
          .single();

        let result;
        if (existing) {
          // Update existing RSVP
          result = await db
            .from('rsvps')
            .update({ attending, notes, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          // Insert new RSVP
          result = await db
            .from('rsvps')
            .insert([{
              event_id: eventId,
              name,
              email: name,
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

        // Clear form
        form.reset();

        // Reload RSVP count and attendee list
        this.loadRsvpCount(eventId, db);
        this.loadAttendeeList(eventId, db);

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
