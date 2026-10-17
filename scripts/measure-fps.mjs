// measure-fps.mjs -- playback performance probe: frame intervals / dropped frames /
// SVG path rewrite cost / Leaflet event storm. Run after run-cdp.ps1 has launched Chrome.
//
//   node measure-fps.mjs [seconds] [tag]
//
// Instruments the live page (no app code changes): wraps requestAnimationFrame to log
// frame intervals, patches SVGElement.setAttribute to count 'd' rewrites and their
// cumulative cost (this is where Leaflet's moveend -> _updatePaths storm shows up),
// counts map events, and observes longtasks. Then starts playback and samples.
import fs from 'node:fs';

const SECS = Math.max(4, parseFloat(process.env.MEASURE_SECS || process.argv[2] || '10'));
const TAG = process.env.MEASURE_TAG || process.argv[3] || 'run';
const CDP = process.env.CDP_PORT || '9222';
const PAGE = process.env.MEASURE_PAGE || 'file:///D:/lab/geo-story/geo-story.html';

const list = await (await fetch('http://127.0.0.1:' + CDP + '/json/list')).json();
const page = list.find(t => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id).res(m.result); pending.delete(m.id); }
};
function send(method, params) {
  return new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send('Page.enable');
await send('Runtime.enable');

await send('Page.navigate', { url: PAGE });
await sleep(2800); // boot: drawAll stagger 170ms + label placement + toast/guide

await send('Runtime.evaluate', { expression: `
(function(){
  var w = window;
  w.__m = { frames: [], dWrites: 0, dMs: 0,
            ev: { zoomstart:0, movestart:0, zoom:0, zoomend:0, move:0, moveend:0, zoomanim:0 },
            longtasks: 0, longtaskMs: 0 };
  var last = 0;
  (function tick(t){ if (last) w.__m.frames.push(+(t-last).toFixed(2)); last = t; requestAnimationFrame(tick); })(0);
  var origSet = SVGElement.prototype.setAttribute;
  SVGElement.prototype.setAttribute = function (n, v) {
    if (n === 'd') { var t0 = performance.now(); origSet.call(this, n, v); w.__m.dMs += performance.now() - t0; w.__m.dWrites++; return; }
    return origSet.apply(this, arguments);
  };
  var map = w.GS_APP.map;
  Object.keys(w.__m.ev).forEach(function (k) { map.on(k, function () { w.__m.ev[k]++; }); });
  try {
    new PerformanceObserver(function (l) {
      l.getEntries().forEach(function (e) { w.__m.longtasks++; w.__m.longtaskMs += e.duration; });
    }).observe({ entryTypes: ['longtask'] });
  } catch (e) {}
  return 'instrumented';
})()`, returnByValue: true });

await sleep(200);
const playRes = await send('Runtime.evaluate', { expression: `window.GS_APP.play(); window.GS_APP.state.playing`, returnByValue: true });
console.log('[' + TAG + '] play:', playRes.result.value);
await sleep(SECS * 1000);

const r = await send('Runtime.evaluate', { expression: `JSON.stringify(window.__m)`, returnByValue: true });
const m = JSON.parse(r.result.value);
const fr = m.frames.slice().sort((a, b) => a - b);
const pick = (p) => fr.length ? +fr[Math.min(fr.length - 1, Math.floor(fr.length * p))].toFixed(1) : 0;
const dropped = fr.filter(x => x > 20).length;
const summary = {
  tag: TAG,
  windowSec: SECS,
  frames: fr.length,
  fps: +(fr.length / SECS).toFixed(1),
  frameMs: { p50: pick(0.5), p90: pick(0.9), p95: pick(0.95), p99: pick(0.99), max: fr.length ? +fr[fr.length - 1].toFixed(1) : 0 },
  droppedOver20ms: dropped,
  droppedPct: fr.length ? +(dropped / fr.length * 100).toFixed(1) : 0,
  svgDWrites: m.dWrites,
  svgDMs: +m.dMs.toFixed(1),
  mapEvents: m.ev,
  longtasks: m.longtasks,
  longtaskMs: +m.longtaskMs.toFixed(0)
};
console.log('[' + TAG + '] RESULT ' + JSON.stringify(summary));
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('measure-' + TAG + '.png', Buffer.from(shot.data, 'base64'));
console.log('[' + TAG + '] screenshot: measure-' + TAG + '.png');
ws.close();
process.exit(0);
