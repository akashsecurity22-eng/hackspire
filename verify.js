const http = require('http');
const r = http.get('http://localhost:3000/login', res => {
  let d = '';
  res.on('data', c => { d += c; });
  res.on('end', () => {
    const html = d;
    console.log('moltenmetal:' + (html.includes('moltenmetal') ? 'yes' : 'no'));
    console.log('ghostfibers:' + (html.includes('ghostfibers') ? 'yes' : 'no'));
    console.log('mmDiv:' + (html.includes('molten-metal-container') ? 'yes' : 'no'));
    const gfIdx = html.indexOf('ghostfibers');
    if (gfIdx >= 0) {
      const ctx = html.substring(Math.max(0, gfIdx - 120), gfIdx + 120);
      console.log('GF_found_context:\n' + ctx);
    } else {
      console.log('no GF in page');
    }
  });
});
r.on('error', e => { console.log('err:' + e.message); });
setTimeout(() => {}, 1500);
