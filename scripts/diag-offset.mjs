/* 一次性诊断：地点标记视觉中心 vs 投影点的偏差来源（M4 复核用）
 * 用法：powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-cdp.ps1 scripts/diag-offset.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + path.join(here, '..', 'geo-story.html').replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1:');
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
const send = (method, params) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (x) => {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true });
  if (!r) return 'NO_RESULT';
  if (r.exceptionDetails) return 'ERR:' + JSON.stringify(r.exceptionDetails).slice(0, 300);
  return r.result.value;
};

await new Promise(r => { ws.onopen = r; });
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE });
await sleep(4200);

const probe = `(function(){
  var map = GS_APP.map, m = map.getContainer().getBoundingClientRect();
  var p = GS_APP.places.filter(function(x){return x.id==='paphos';})[0];
  var icon = document.querySelector('.place[data-place="paphos"]').closest('.place-icon');
  var r = icon.getBoundingClientRect();
  var c = map.latLngToContainerPoint(p.ll);
  var size = map.getSize(), pane = map.getPane('markerPane').getBoundingClientRect();
  return JSON.stringify({
    dev: { dx: Math.round(r.x + r.width/2 - (m.left + c.x)), dy: Math.round(r.y + r.height/2 - (m.top + c.y)) },
    mapSize: [Math.round(size.x), Math.round(size.y)],
    container: [Math.round(m.width), Math.round(m.height)],
    paneTop: Math.round(pane.top - m.top),
    zoom: map.getZoom(),
    mapTop: Math.round(m.top),
    trackH: Math.round(document.getElementById('tlTrack').getBoundingClientRect().height)
  });
})()`;

console.log('t0:', await ev(probe));
await ev(`GS_APP.map.invalidateSize()`); await sleep(700);
console.log('t1 (no action):', await ev(probe));
await ev(`GS_APP.map.invalidateSize()`); await sleep(700);
console.log('after invalidate:', await ev(probe));
await ev(`GS_APP.map.setZoom(6, {animate:false})`); await sleep(700);
console.log('after setZoom6:', await ev(probe));
ws.close();
process.exit(0);
