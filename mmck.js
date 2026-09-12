'use strict';
const fs=require('node:fs'),vm=require('node:vm');
for(const f of ['lib/authview.js','lib/layout.js','public/js/moltenmetal.js']){
  try{new vm.Script(fs.readFileSync(f,'utf8'),{filename:f});console.log('OK '+f);}
  catch(e){console.log('FAIL '+f+': '+e.message);}
}
fs.writeFileSync('server.js',fs.readFileSync('app.js','utf8'));
console.log('sync-ok');