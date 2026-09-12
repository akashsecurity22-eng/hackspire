const fs = require('fs');
const src = fs.readFileSync('public/js/floatinglines.js', 'utf8');
try {
  require('vm').runInNewContext('(function(){' + src + '\n})()');
  console.log('floatinglines.js syntax OK');
} catch (e) {
  console.error('floatinglines.js SYNTAX ERROR:', e.message.split('\n')[0]);
  process.exit(1);
}
