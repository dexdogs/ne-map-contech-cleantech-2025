// src/map.js — New England Contech-for-Cleantech Audit Map
// Reads:  /data/ne-audit.json   (backend)
// Needs:  MAPBOX_TOKEN in window.MAPBOX_TOKEN  (injected by index.html)

const SCORE = { 'Working': 2, 'Partial': 1, 'Weak / absent': 0 };
const STATUS_COLOR = { 'Working': '#22c55e', 'Partial': '#f59e0b', 'Weak / absent': '#ef4444' };

// Composite score = gov + industry (0-4); philanthropy noted but not scored (universally absent)
function compositeScore(s) {
  return SCORE[s.scorecard.gov_validates] + SCORE[s.scorecard.industry_acquires];
}

// GeoJSON polygon centroids are in the data; we use Mapbox-native NE states tileset
// for choropleth fill, keyed by state FIPS abbreviation.
const NE_STATES = ['ME','NH','VT','MA','RI','CT'];

async function init() {
  const res  = await fetch('/data/ne-audit.json');
  const data = await res.json();

  // Build lookup by abbr
  const byAbbr = {};
  data.states.forEach(s => { byAbbr[s.abbr] = s; });

  mapboxgl.accessToken = window.MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    container: 'map',
    style:     'mapbox://styles/mapbox/light-v11',
    center:    [-71.5, 44.0],
    zoom:      6.2,
    minZoom:   5,
    maxZoom:   10
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  map.on('load', () => {

    // ── Choropleth layer (US states tileset, filtered to NE) ──────────────────
    map.addSource('states', {
      type: 'vector',
      url:  'mapbox://mapbox.boundaries-adm1-v3'
    });

    // Color expression: match on state ISO code (US-MA, US-CT …)
    const colorExpr = ['match', ['get', 'iso_3166_2']];
    data.states.forEach(s => {
      const score = compositeScore(s);
      // 4 = strong green, 0 = grey
      const fill = score === 4 ? '#166534'
                 : score === 3 ? '#22c55e'
                 : score === 2 ? '#f59e0b'
                 : score === 1 ? '#ef4444'
                 :               '#94a3b8';
      colorExpr.push(`US-${s.abbr}`, fill);
    });
    colorExpr.push('#e2e8f0'); // default (non-NE states, invisible)

    map.addLayer({
      id:           'ne-fill',
      type:         'fill',
      source:       'states',
      'source-layer': 'boundaries_admin_1',
      filter:       ['in', 'iso_3166_2', ...NE_STATES.map(a => `US-${a}`)],
      paint: {
        'fill-color':   colorExpr,
        'fill-opacity': 0.72
      }
    });

    map.addLayer({
      id:           'ne-outline',
      type:         'line',
      source:       'states',
      'source-layer': 'boundaries_admin_1',
      filter:       ['in', 'iso_3166_2', ...NE_STATES.map(a => `US-${a}`)],
      paint: {
        'line-color': '#1e293b',
        'line-width': 1.4
      }
    });

    // ── Hover highlight ───────────────────────────────────────────────────────
    map.addLayer({
      id:           'ne-hover',
      type:         'fill',
      source:       'states',
      'source-layer': 'boundaries_admin_1',
      filter:       ['==', 'iso_3166_2', ''],
      paint: {
        'fill-color':   '#fff',
        'fill-opacity': 0.15
      }
    });

    let hoveredId = null;
    map.on('mousemove', 'ne-fill', (e) => {
      const iso = e.features[0].properties.iso_3166_2;
      map.setFilter('ne-hover', ['==', 'iso_3166_2', iso]);
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'ne-fill', () => {
      map.setFilter('ne-hover', ['==', 'iso_3166_2', '']);
      map.getCanvas().style.cursor = '';
    });

    // ── Click → detail panel ─────────────────────────────────────────────────
    map.on('click', 'ne-fill', (e) => {
      const iso  = e.features[0].properties.iso_3166_2;
      const abbr = iso.replace('US-', '');
      const s    = byAbbr[abbr];
      if (!s) return;
      openPanel(s, data.sources);
    });

    // ── State label markers ──────────────────────────────────────────────────
    data.states.forEach(s => {
      const el = document.createElement('div');
      el.className   = 'state-label';
      el.textContent = s.abbr;
      el.title       = s.state;
      el.addEventListener('click', () => openPanel(s, data.sources));
      new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([s.lng, s.lat])
        .addTo(map);
    });
  });
}

// =============================================================================
// DETAIL PANEL
// =============================================================================
function badge(status) {
  const c = STATUS_COLOR[status] || '#94a3b8';
  return `<span class="badge" style="background:${c}20;color:${c};border:1px solid ${c}60">${status}</span>`;
}

function openPanel(s, allSources) {
  const panel = document.getElementById('panel');

  const srcLookup = {};
  allSources.forEach(src => { srcLookup[src.id] = src; });

  const sourceLinks = s.sources
    .map(id => srcLookup[id])
    .filter(Boolean)
    .map(src =>
      `<li><a href="${src.url}" target="_blank" rel="noopener">[${src.id}] ${src.source}</a><br>
       <span class="src-claim">${src.claim}</span></li>`
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
}

// =============================================================================
// DOWNLOAD BUTTON
// =============================================================================
document.getElementById('btn-download').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href     = '/data/ne-audit.csv';
  a.download = 'ne-contech-cleantech-audit-2026.csv';
  a.click();
});

init();
