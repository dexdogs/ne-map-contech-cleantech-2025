// scripts/inject-token.js
// Replaces __MAPBOX_TOKEN__ placeholder in index.html with the real token
// from the MAPBOX_TOKEN environment variable (set in Vercel dashboard).
const fs    = require('fs');
const token = process.env.MAPBOX_TOKEN;
if (!token) { console.error('MAPBOX_TOKEN env var not set'); process.exit(1); }

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('__MAPBOX_TOKEN__', token);
fs.writeFileSync('index.html', html, 'utf8');
console.log('✓ Token injected into index.html');
