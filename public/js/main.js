'use strict';
(function(){
  var b=document.getElementById('burger'),d=document.getElementById('drawer');
  if(b&&d){b.addEventListener('click',function(){var o=d.hidden;d.hidden=!o;b.setAttribute('aria-expanded',String(o));});}
  var io=('IntersectionObserver' in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12}):null;
  document.querySelectorAll('.reveal').forEach(function(el){if(io)io.observe(el);else el.classList.add('in');});
  var lines=document.querySelectorAll('#termLines div');
  if(lines.length&&!matchMedia('(prefers-reduced-motion: reduce)').matches){lines.forEach(function(l,i){l.style.display='none';setTimeout(function(){l.style.display='';},350*(i+1));});}
  document.querySelectorAll('form[data-confirm]').forEach(function(f){f.addEventListener('submit',function(e){if(!confirm(f.getAttribute('data-confirm')))e.preventDefault();});});
})();
