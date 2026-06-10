// src/map.js — New England Contech-for-Cleantech Audit Map
// GeoJSON source: us-atlas (CDN, free, no Mapbox Enterprise required)

const SCORE  = { 'Working': 2, 'Partial': 1, 'Weak / absent': 0 };
const S_COLOR = { 'Working': '#22c55e', 'Partial': '#f59e0b', 'Weak / absent': '#ef4444' };

// NE state FIPS codes
const NE_FIPS = { '25':'MA','09':'CT','50':'VT','23':'ME','44':'RI','33':'NH' };

function compositeScore(s) {
  return SCORE[s.scorecard.gov_validates] + SCORE[s.scorecard.industry_acquires];
}

function fillColor(score) {
  return score === 4 ? '#166534'
       : score === 3 ? '#22c55e'
       : score === 2 ? '#f59e0b'
       : score === 1 ? '#ef4444'
       :               '#94a3b8';
}

function badge(status) {
  const c = S_COLOR[status] || '#94a3b8';
  return `<span class="badge" style="background:${c}20;color:${c};border:1px solid ${c}60">${status}</span>`;
}

async function init() {
  // ── Load audit data ───────────────────────────────────────────────────────
  const auditRes = await fetch('/data/ne-audit.json');
  const data     = await auditRes.json();
  const byAbbr   = {};
  data.states.forEach(s => { byAbbr[s.abbr] = s; });

  // ── Load TopoJSON (free, no auth) ─────────────────────────────────────────
  const topoRes  = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
  const topology = await topoRes.json();

  // Convert to GeoJSON and filter to NE states only
  const geojson = topojson.feature(topology, topology.objects.states);
  geojson.features = geojson.features.filter(f => NE_FIPS[f.id]);

  // Attach audit data + score to each feature
  geojson.features.forEach(f => {
    const abbr  = NE_FIPS[f.id];
    const state = byAbbr[abbr];
    f.properties.abbr  = abbr;
    f.properties.name  = state ? state.state : abbr;
    f.properties.score = state ? compositeScore(state) : 0;
    f.properties.fill  = state ? fillColor(compositeScore(state)) : '#94a3b8';
  });

  // ── Init Mapbox ───────────────────────────────────────────────────────────
  mapboxgl.accessToken = window.MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    container: 'map',
    style:     'mapbox://styles/mapbox/light-v11',
    center:    [-71.5, 44.0],
    zoom:      6.0,
    minZoom:   5,
    maxZoom:   10
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  map.on('load', () => {

    // ── Add NE GeoJSON source ─────────────────────────────────────────────
    map.addSource('ne-states', { type: 'geojson', data: geojson });

    // Choropleth fill — use pre-computed fill property
    map.addLayer({
      id:    'ne-fill',
      type:  'fill',
      source:'ne-states',
      paint: {
        'fill-color':   ['get', 'fill'],
        'fill-opacity': 0.72
      }
    });

    // State borders
    map.addLayer({
      id:    'ne-outline',
      type:  'line',
      source:'ne-states',
      paint: {
        'line-color': '#1e293b',
        'line-width': 1.6
      }
    });

    // Hover highlight
    map.addLayer({
      id:    'ne-hover',
      type:  'fill',
      source:'ne-states',
      filter:['==', 'abbr', ''],
      paint: {
        'fill-color':   '#ffffff',
        'fill-opacity': 0.18
      }
    });

    // ── Interactions ──────────────────────────────────────────────────────
    map.on('mousemove', 'ne-fill', (e) => {
      const abbr = e.features[0].properties.abbr;
      map.setFilter('ne-hover', ['==', 'abbr', abbr]);
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'ne-fill', () => {
      map.setFilter('ne-hover', ['==', 'abbr', '']);
      map.getCanvas().style.cursor = '';
    });
    map.on('click', 'ne-fill', (e) => {
      const abbr = e.features[0].properties.abbr;
      const s    = byAbbr[abbr];
      if (s) openPanel(s, data.sources);
    });

    // ── State label markers ───────────────────────────────────────────────
    data.states.forEach(s => {
      const el = document.createElement('div');
      el.className   = 'state-label';
      el.textContent = s.abbr;
      el.addEventListener('click', () => openPanel(s, data.sources));
      new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([s.lng, s.lat])
        .addTo(map);
    });
  });

  // ── Download button ───────────────────────────────────────────────────────
  document.getElementById('btn-download').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href     = '/data/ne-audit.csv';
    a.download = 'ne-contech-cleantech-audit-2026.csv';
    a.click();
  });
}

// =============================================================================
// DETAIL PANEL
// =============================================================================
function openPanel(s, allSources) {
  const panel    = document.getElementById('panel');
  const srcLookup = {};
  allSources.forEach(src => { srcLookup[src.id] = src; });

  const sourceLinks = s.sources
    .map(id => srcLookup[id]).filter(Boolean)
    .map(src =>
      `<li>
        <a href="${src.url}" target="_blank" rel="noopener">[${src.id}] ${src.source}</a>
        <span class="src-claim">${src.claim}</span>
       </li>`
    ).join('');

  panel.innerHTML = `
    <button class="close-btn" onclick="document.getElementById('panel').classList.remove('open')">✕</button>
    <div class="panel-header">
      <div class="rank-badge">#${s.rank}</div>
      <div>
        <h2>${s.state}</h2>
        <div class="tier-tag">${s.tier}</div>
      </div>
    </div>

    <section>
      <h3>Three-actor scorecard</h3>
      <table class="scorecard-table">
        <thead><tr><th>Role</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>① State validates</td><td>${badge(s.scorecard.gov_validates)}</td></tr>
          <tr><td>② Philanthropy accelerates</td><td>${badge(s.scorecard.phil_accelerates)}</td></tr>
          <tr><td>③ Industry acquires</td><td>${badge(s.scorecard.industry_acquires)}</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h3>Primary institutions</h3>
      <p>${s.primary_institutions}</p>
      <p class="muted">${s.institution_type}</p>
    </section>

    <section>
      <h3>Can play all 3 roles?</h3>
      <p class="can-play ${s.can_play_all_3 ? 'yes' : 'no'}">${s.can_play_all_3 ? '✓ Yes' : '✗ No'}</p>
    </section>

    <section>
      <h3>Built-environment signal</h3>
      <p>${s.built_env_signal}</p>
    </section>

    <section>
      <h3>Notes / evidence</h3>
      <p class="notes">${s.notes}</p>
    </section>

    <section>
      <h3>Sources</h3>
      <ul class="src-list">${sourceLinks}</ul>
    </section>
  `;

  panel.classList.add('open');
  document.getElementById('info-panel').classList.remove('open');
  document.getElementById('feedback-panel').classList.remove('open');
}

// =============================================================================
// INFO PANEL
// =============================================================================
function openInfo() {
  const panel = document.getElementById('info-panel');
  const isOpen = panel.classList.contains('open');
  closeAllPanels();
  if (!isOpen) panel.classList.add('open');
}

// =============================================================================
// FEEDBACK PANEL
// =============================================================================
function openFeedback() {
  const panel = document.getElementById('feedback-panel');
  const isOpen = panel.classList.contains('open');
  closeAllPanels();
  if (!isOpen) panel.classList.add('open');
}

function closeAllPanels() {
  ['panel','info-panel','feedback-panel'].forEach(id => {
    document.getElementById(id).classList.remove('open');
  });
}

// Feedback form submission via Formspree (no backend needed)
function submitFeedback(e) {
  e.preventDefault();
  const form = document.getElementById('feedback-form');

  const name      = form.querySelector('[name=name]').value.trim();
  const email     = form.querySelector('[name=email]').value.trim();
  const state     = form.querySelector('[name=state]').value;
  const data_type = form.querySelector('[name=data_type]').value;
  const desc      = form.querySelector('[name=description]').value.trim();
  const url       = form.querySelector('[name=source_url]').value.trim();

  const subject = encodeURIComponent(`[NE Map] Data contribution: ${state} — ${data_type}`);

  const body = encodeURIComponent(
    `Name: ${name || '(not provided)'}\n` +
    `Reply-to: ${email || '(not provided)'}\n` +
    `State: ${state}\n` +
    `Type: ${data_type}\n\n` +
    `Description:\n${desc}\n\n` +
    `Source URL: ${url || '(none)'}\n`
  );

  window.location.href = `mailto:ankur@dexdogs.earth?subject=${subject}&body=${body}`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-info').addEventListener('click', openInfo);
  document.getElementById('btn-feedback').addEventListener('click', openFeedback);
  document.getElementById('feedback-form').addEventListener('submit', submitFeedback);
  init();
});
