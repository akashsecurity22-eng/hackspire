'use strict';
const fs=require('node:fs');
fs.writeFileSync('public/js/moltenmetal.js',
  fs.readFileSync('public/js/mm-a.js','utf8')+
  fs.readFileSync('public/js/mm-b.js','utf8')+
  fs.readFileSync('public/js/mm-c.js','utf8'));
for(const f of ['mm-a.js','mm-b.js','mm-c.js'])fs.rmSync('public/js/'+f);
const vm=require('node:vm');
try{new vm.Script(fs.readFileSync('public/js/moltenmetal.js','utf8'),{filename:'moltenmetal.js'});console.log('syntax-ok:'+fs.statSync('public/js/moltenmetal.js').size+'b');}
catch(e){console.log('FAIL:'+e.message);}