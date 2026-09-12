'use strict';
const fs = require('fs');
const path = require('path');
const cleanup = ['./public/js/moltenmetal.js', './public/css/moltenmetal.css', './public/js/mm-a.js', './public/js/mm-b.js', './public/js/mm-c.js', './public/js/mmmk.js'];
for (const f of cleanup) {
  try { fs.unlinkSync(f); console.log('removed:', f); }
  catch (e) { console.log('notfound:', f); }
}
// verify
console.log('--- current state ---');
try {
  const dirents = fs.readdirSync('./public/js', { withFileTypes: true });
  for (const d of dirents) { if (d.isFile()) console.log('js:', d.name); }
} catch (e) { console.log('js-dir-error'); }
try {
  const dirents = fs.readdirSync('./public/css', { withFileTypes: true });
  for (const d of dirents) { if (d.isFile()) console.log('css:', d.name); }
} catch (e) { console.log('css-dir-error'); }
