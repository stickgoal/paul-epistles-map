/* 诊断：place-icon 与 .place 的 DOM 关系，以及标签自身核心豁免为何失效 */
const PAGE = 'file:///' + process.cwd().replace(/\\/g, '/') + '/geo-story.html';
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
function send(method, params) { return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); }); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await new Promise((res) => { ws.onopen = res; });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE });
await sleep(4600);
async function ev(x) {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true });
  return r.exceptionDetails ? 'ERR:' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails).slice(0, 300) : r.result.value;
}
console.log(await ev(`(function(){
  var icons = [].slice.call(document.querySelectorAll('.place-icon'));
  var sample = icons.slice(0,3).map(function (el) {
    var inner = el.querySelector('.place');
    return {
      iconDataPlace: el.getAttribute('data-place'),
      innerFound: !!inner,
      innerDataPlace: inner ? inner.getAttribute('data-place') : null,
      innerTag: inner ? inner.tagName + '.' + inner.className : null
    };
  });
  var tips = [].slice.call(document.querySelectorAll('.leaflet-tooltip.city-tip'));
  var t0 = tips[0];
  /* 标签与所有 .place-icon 盒的重叠明细（含 id），用于核对豁免是否命中 */
  var cores = [];
  icons.forEach(function (el) {
    var inner = el.querySelector('.place');
    var r = el.getBoundingClientRect();
    cores.push({ id: inner ? inner.getAttribute('data-place') : null, l: r.left, t: r.top, r: r.right, b: r.bottom });
  });
  var overlaps = [];
  tips.forEach(function (tp) {
    var tr = tp.getBoundingClientRect();
    cores.forEach(function (c) {
      var ox = Math.min(tr.right, c.r) - Math.max(tr.left, c.l);
      var oy = Math.min(tr.bottom, c.b) - Math.max(tr.top, c.t);
      if (ox > 0 && oy > 0) overlaps.push({ label: tp.textContent.slice(0,12), core: c.id, area: Math.round(ox*oy) });
    });
  });
  overlaps.sort(function(a,b){return b.area-a.area;});
  /* 标签与地图容器的关系：tooltip 的定位锚点 */
  var tipInfo = tips.slice(0,3).map(function (tp) {
    var tr = tp.getBoundingClientRect();
    return { text: tp.textContent.slice(0,12), cls: tp.className, l: Math.round(tr.left), t: Math.round(tr.top), w: Math.round(tr.width) };
  });
  return JSON.stringify({
    iconCount: icons.length, sample: sample, tipInfo: tipInfo,
    overlapCount: overlaps.length, worst: overlaps.slice(0,12)
  }, null, 1);
})()`));
ws.close(); process.exit(0);
