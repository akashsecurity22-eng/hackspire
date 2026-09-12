'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/akash/Downloads/hackspire';

// 1. Replace MoltenMetal backdrop with FloatingLines backdrop in authview.js
let auth = fs.readFileSync(path.join(ROOT, 'lib/authview.js'), 'utf8');
auth = auth.replace(
  /const MM_BG=`<div class="molten-metal-container" data-moltenmetal data-mm-options='[^']*.' aria-hidden="true"><\/div>`;/,
  'const FL_BG=`<div class="floating-lines-container" data-floatinglines aria-hidden="true"></div>`;'
);
auth = auth.replace(/MM_BG\+/g, 'FL_BG+');
fs.writeFileSync(path.join(ROOT, 'lib/authview.js'), auth);
console.log('authview.js updated:', auth.includes('FL_BG') && !auth.includes('MM_BG'));

// 2. Update layout.js: remove moltenmetal, add floatinglines
let layout = fs.readFileSync(path.join(ROOT, 'lib/layout.js'), 'utf8');
layout = layout.replace(
  /<link rel="stylesheet" href="\/static\/css\/moltenmetal\.css">\s*/,
  ''
);
layout = layout.replace(
  /<script src="\/static\/js\/moltenmetal\.js" defer><\/script>\s*/,
  ''
);
layout = layout.replace(
  '<link rel="stylesheet" href="/static/css/glare.css">',
  '<link rel="stylesheet" href="/static/css/glare.css"><link rel="stylesheet" href="/static/css/floatinglines.css">'
);
layout = layout.replace(
  '<script src="/static/js/glare.js" defer></script>',
  '<script src="/static/js/glare.js" defer></script><script src="/static/js/floatinglines.js" defer></script>'
);
fs.writeFileSync(path.join(ROOT, 'lib/layout.js'), layout);
console.log('layout.js updated:', layout.includes('floatinglines.css') && !layout.includes('moltenmetal'));

// 3. Sync server.js from app.js
fs.writeFileSync(path.join(ROOT, 'server.js'), fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'));
console.log('server.js synced');
