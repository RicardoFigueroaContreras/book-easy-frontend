(function(){
  function serialize(obj){ return Object.keys(obj).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(obj[k] ?? '')).join('&'); }
  function createIframe(opts){
    var base = opts.baseUrl || (window.BOOKEASY_BASE_URL || 'http://localhost:5173');
    var slug = opts.slug;
    if(!slug){ throw new Error('BookeasyWidget: missing slug'); }
    var params = { embed: '1' };
    if(opts.lang) params.lang = opts.lang;
    if(opts.color) params.color = opts.color;
    var src = base.replace(/\/$/,'') + '/' + encodeURIComponent(slug) + '/booking' + '?' + serialize(params);
    var ifr = document.createElement('iframe');
    ifr.src = src;
    ifr.style.width = opts.width || '100%';
    ifr.style.height = opts.height || '700px';
    ifr.style.border = '0';
    ifr.setAttribute('title','Bookeasy Booking');
    return ifr;
  }
  function autoInit(){
    var scripts = document.querySelectorAll('script[data-bookeasy-widget]');
    scripts.forEach(function(s){
      var slug = s.getAttribute('data-slug');
      var lang = s.getAttribute('data-lang');
      var color = s.getAttribute('data-color');
      var width = s.getAttribute('data-width');
      var height = s.getAttribute('data-height');
      var baseUrl = s.getAttribute('data-base-url');
      var mountSel = s.getAttribute('data-mount');
      var mount = mountSel ? document.querySelector(mountSel) : s.parentElement;
      var ifr = createIframe({ slug, lang, color, width, height, baseUrl });
      mount.appendChild(ifr);
    });
  }
  window.BookeasyWidget = {
    create: function(opts){ return createIframe(opts); },
    mount: function(el, opts){ var ifr = createIframe(opts); (el||document.body).appendChild(ifr); return ifr; }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', autoInit);
  else autoInit();
})();
