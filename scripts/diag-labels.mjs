/* 地图标签重叠诊断（临时工具）
 *
 * 用途：M3 引入 25 个地点后，首屏截图出现标签互相压叠成乱码（罗马、凯撒利亚一带最严重）。
 * 本脚本按真实 DOM 矩形统计：哪些城市标签互相重叠、重叠面积多大、
 * 以及与事件点标记（.place 核心）是否重叠。
 *
 * 用法：scripts/run-cdp.ps1 scripts/diag-labels.mjs
 */
const PAGE = 'file:///' + process.cwd().replace(/\\/g, '/') + '/geo-story.html';

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};
function send(method, params) {
  return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await new Promise((res) => { ws.onopen = res; });
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE });
await sleep(4600);
/* 可选：DIAG_ZOOM 环境变量指定 zoom 复测（验证标签冲突是否随缩放消失/恶化）。
 * setZoom 返回 Leaflet Map（循环引用，returnByValue 序列化失败），故包成简单值。 */
if (process.env.DIAG_ZOOM) {
  await ev(`(GS_APP.map.setZoom(${process.env.DIAG_ZOOM}), 'ok')`);
  await sleep(900);   /* placeLabels debounce 180ms + 余量 */
}

async function ev(x) {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true });
  return r.exceptionDetails ? 'ERR:' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails).slice(0, 300) : r.result.value;
}

console.log(await ev(`(function(){
  var tips = [].slice.call(document.querySelectorAll('.leaflet-tooltip.city-tip'));
  var boxes = tips.map(function (t) {
    var r = t.getBoundingClientRect();
    return { name: (t.textContent || '').slice(0, 24), l: r.left, t: r.top, r: r.right, b: r.bottom,
             w: Math.round(r.width), h: Math.round(r.height), area: Math.round(r.width * r.height) };
  });
  var pairs = [];
  for (var i = 0; i < boxes.length; i++) for (var j = i + 1; j < boxes.length; j++) {
    var a = boxes[i], b = boxes[j];
    var ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
    var oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (ox > 0 && oy > 0) pairs.push({ a: a.name, b: b.name, area: Math.round(ox * oy) });
  }
  /* 标签与地点核心（视觉核心盒 24px）重叠。
     不能用 .place-icon 的整盒（96px 命中盒）：它含透明留白与内边距，
     会把「标签贴着图标边缘」也误判为压住核心 ⇒ labelOverCore 连带误报。 */
  var CORE_HALF = 12;            /* 视觉核心盒 = 24×24，以 .place-icon 中心为基准 */
  var cores = [].slice.call(document.querySelectorAll('.place')).map(function (p) {
    var pid = p.getAttribute('data-place');
    var r = p.closest('.place-icon').getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return { id: pid, l: cx - CORE_HALF, t: cy - CORE_HALF, r: cx + CORE_HALF, b: cy + CORE_HALF };
  });
  var coreHits = [];
  boxes.forEach(function (bx) {
    cores.forEach(function (c) {
      var ox = Math.min(bx.r, c.r) - Math.max(bx.l, c.l);
      var oy = Math.min(bx.b, c.b) - Math.max(bx.t, c.t);
      if (ox > 0 && oy > 0) coreHits.push({ label: bx.name, core: c.id, area: Math.round(ox * oy) });
    });
  });
  pairs.sort(function (x, y) { return y.area - x.area; });
  coreHits.sort(function (x, y) { return y.area - x.area; });
  return JSON.stringify({
    tipCount: tips.length,
    overlapPairs: pairs.length,
    worst: pairs.slice(0, 14),
    labelOverCore: coreHits.length,
    worstCore: coreHits.slice(0, 10)
  }, null, 1);
})()`));

ws.close();
process.exit(0);
