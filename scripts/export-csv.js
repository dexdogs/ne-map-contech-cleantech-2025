// node scripts/export-csv.js
// Converts public/data/ne-audit.json → public/data/ne-audit.csv
// Run whenever you update the JSON; commit both files.
const fs   = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('public/data/ne-audit.json', 'utf8'));

const header = [
  'rank','state','abbr','tier','lat','lng',
  'gov_validates','phil_accelerates','industry_acquires',
  'can_play_all_3','primary_institutions','institution_type',
  'built_env_signal','notes','source_ids'
].join(',');

const rows = data.states.map(s => [
  s.rank,
  `"${s.state}"`,
  s.abbr,
  `"${s.tier}"`,
  s.lat,
  s.lng,
  `"${s.scorecard.gov_validates}"`,
  `"${s.scorecard.phil_accelerates}"`,
  `"${s.scorecard.industry_acquires}"`,
  s.can_play_all_3,
  `"${s.primary_institutions}"`,
  `"${s.institution_type}"`,
  `"${s.built_env_signal}"`,
  `"${s.notes.replace(/"/g, '""')}"`,
  `"${s.sources.join(';')}"`
].join(','));

const csv = [header, ...rows].join('\n');
fs.writeFileSync('public/data/ne-audit.csv', csv, 'utf8');
console.log(`✓ Wrote public/data/ne-audit.csv (${data.states.length} states)`);
