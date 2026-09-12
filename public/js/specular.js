'use strict';
(function(){
  function init(){
    document.querySelectorAll('[data-specular]').forEach(function(button){
      button.addEventListener('pointermove',function(event){
        var rect=button.getBoundingClientRect();
        var x=((event.clientX-rect.left)/rect.width-.5)*2;
        button.style.setProperty('--specular-x',(x*55-50)+'%');
      });
      button.addEventListener('pointerleave',function(){button.style.removeProperty('--specular-x');});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
