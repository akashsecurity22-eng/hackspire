'use strict';
const fs = require('node:fs');
const path = require('node:path');

const candidates = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '.env'),
  path.join(process.cwd(), '.env')
];

for (const f of candidates) {
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
    break;
  }
}
