// Follow-ups checklist for the Morning Brief.
// The page is its own record: ticking, adding or removing a task regenerates the
// whole document from state and republishes it through the `artifact` capability.
// Publish the brief with capabilities: {artifact: {}}.
(function () {
  var SKELETON = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>';
  var dataEl = document.getElementById('fu-data');
  var state;
  try { state = JSON.parse(dataEl.textContent); } catch (e) { state = { date: '', tasks: [] }; }
  if (!Array.isArray(state.tasks)) state.tasks = [];

  // Capture the static page pieces now, before anything is rendered into them.
  var titleEl = document.querySelector('title');
  var cssEl = document.getElementById('brief-css');
  var bands = Array.prototype.slice.call(document.querySelectorAll('.band'));
  var scriptCode = document.currentScript ? document.currentScript.textContent : '';
  var frozen = bands.map(function (b) {
    var c = b.cloneNode(true);
    var l = c.querySelector('#fu-list'); if (l) l.textContent = '';
    var n = c.querySelector('#fu-count'); if (n) n.textContent = '';
    var t = c.querySelector('#fu-note'); if (t) t.textContent = '';
    var w = c.querySelector('#fu'); if (w) w.classList.remove('fu-ro');
    return c.outerHTML;
  });

  var list = document.getElementById('fu-list');
  var countEl = document.getElementById('fu-count');
  var note = document.getElementById('fu-note');
  var wrap = document.getElementById('fu');
  var form = document.getElementById('fu-form');
  var input = document.getElementById('fu-input');
  var artifact = null, readOnly = false, timer = null, saving = false, pending = false;

  function fmt(d) {
    if (!d) return '';
    var p = d.split('-'); if (p.length !== 3) return d;
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1] - 1] + ' ' + (+p[2]);
  }
  function safeHref(h) { return typeof h === 'string' && /^https:\/\//i.test(h) ? h : ''; }

  function render() {
    list.textContent = '';
    state.tasks.forEach(function (t) {
      var li = document.createElement('li'); if (t.done) li.className = 'done';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.done; cb.disabled = readOnly;
      cb.setAttribute('aria-label', t.text);
      cb.addEventListener('change', function () { t.done = cb.checked; render(); queue(); });
      var body = document.createElement('div'); body.className = 'fu-body';
      var href = safeHref(t.href);
      var tx = document.createElement(href ? 'a' : 'span'); tx.className = 'fu-text'; tx.textContent = t.text;
      if (href) { tx.href = href; tx.target = '_blank'; tx.rel = 'noopener'; }
      body.appendChild(tx);
      var metaBits = [];
      if (t.meta) metaBits.push(t.meta);
      if (t.since && state.date && t.since < state.date) metaBits.push('open since ' + fmt(t.since));
      if (metaBits.length) { var m = document.createElement('span'); m.className = 'fu-meta'; m.textContent = metaBits.join(' · '); body.appendChild(m); }
      var x = document.createElement('button'); x.type = 'button'; x.className = 'fu-x'; x.textContent = '×';
      x.setAttribute('aria-label', 'Remove ' + t.text);
      x.addEventListener('click', function () { state.tasks = state.tasks.filter(function (o) { return o !== t; }); render(); queue(); });
      li.appendChild(cb); li.appendChild(body); li.appendChild(x);
      list.appendChild(li);
    });
    var done = state.tasks.filter(function (t) { return t.done; }).length;
    countEl.textContent = state.tasks.length ? done + ' of ' + state.tasks.length + ' done' : '';
    wrap.classList.toggle('fu-ro', readOnly);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim(); if (!v || readOnly) return;
    state.tasks.push({ id: 'u' + Date.now().toString(36), text: v.slice(0, 200), href: '', meta: 'added by you', done: false, since: state.date });
    input.value = ''; render(); queue();
  });

  function buildDoc() {
    var json = JSON.stringify(state).replace(/</g, '\\u003c');
    return SKELETON +
      (titleEl ? titleEl.outerHTML : '') +
      (cssEl ? cssEl.outerHTML : '') +
      frozen.join('') +
      '<script type="application/json" id="fu-data">' + json + '<\/script>' +
      '<script>' + scriptCode + '<\/script>' +
      '</body></html>';
  }

  function queue() {
    if (readOnly) return;
    note.textContent = artifact ? 'Saving…' : 'Changes in this view are not saved.';
    if (!artifact) return;
    clearTimeout(timer);
    timer = setTimeout(save, 1500); // batch quick ticks into one publish
  }

  function save() {
    if (saving) { pending = true; return; }
    saving = true;
    artifact.publish(buildDoc()).then(function () {
      note.textContent = 'Saved';
    }, function (err) {
      var code = err && err.code;
      if (code === 'not_writer' || code === 'not_granted') { readOnly = true; note.textContent = 'Read-only view.'; render(); }
      else if (code === 'conflict') { note.textContent = 'Updated elsewhere — reloading.'; }
      else if (code === 'rate_limited') { note.textContent = 'Saving shortly…'; pending = true; }
      else { note.textContent = 'Not saved — try again in a moment.'; }
    }).then(function () {
      saving = false;
      if (pending) { pending = false; clearTimeout(timer); timer = setTimeout(save, 4000); }
    });
  }

  render();
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('artifact').then(function (a) { artifact = a; }, function () {});
  }
})();
