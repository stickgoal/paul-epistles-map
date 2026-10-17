// experiment-rig.mjs -- verify the pan-rig math (sign + convergence) before touching app code.
// Checks: map._rawPanBy exists; delta = latLngToContainerPoint(ll) - viewportCenter
// recenters the map on ll (converges in one step); getCenter() staleness after rawPanBy;
// and that a setView re-sync afterwards restores consistent state.
import fs from 'node:fs';

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
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
const ev = async (expr, awaitPromise) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: !!awaitPromise });
  if (r.exceptionDetails) { console.error('EVAL ERROR:', JSON.stringify(r.exceptionDetails)); process.exit(1); }
  return r.result.value;
};

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: 'file:///D:/lab/geo-story/geo-story.html' });
await sleep(2800);

// 1. does _rawPanBy exist, and does the derived delta recenter in one step?
console.log('rig-math:', await ev(`(function(){
  var map = GS_APP.map, j1 = GS.routeEngine.api.byId('j1');
  var ll = j1.head.getLatLng();
  var R = map.getSize(), center = R.divideBy(2);
  var c0 = map.latLngToContainerPoint(ll);
  var delta = c0.subtract(center);
  map._rawPanBy(delta);
  var c1 = map.latLngToContainerPoint(ll);
  return JSON.stringify({
    hasRawPanBy: typeof map._rawPanBy === 'function',
    headLL: [Math.round(ll.lat*100)/100, Math.round(ll.lng*100)/100],
    before: [Math.round(c0.x), Math.round(c0.y)],
    after: [Math.round(c1.x), Math.round(c1.y)],
    center: [Math.round(center.x), Math.round(center.y)],
    residualPx: Math.round(Math.sqrt(Math.pow(c1.x-center.x,2)+Math.pow(c1.y-center.y,2)))
  });
})()`));

// 2. after rawPanBy, getCenter() is stale; a same-center setView re-sync must not jump the view
console.log('resync:', await ev(`(function(){
  var map = GS_APP.map, j1 = GS.routeEngine.api.byId('j1');
  var ll = j1.head.getLatLng();
  var R = map.getSize(), center = R.divideBy(2);
  var cBefore = map.latLngToContainerPoint(ll);
  var visualCenter = map.containerPointToLatLng(center);
  map.setView(visualCenter, map.getZoom(), { animate: false });
  var cAfter = map.latLngToContainerPoint(ll);
  return JSON.stringify({
    staleGetCenterVsVisual: Math.round(map.getCenter().distanceTo(visualCenter)*1000)/1000,
    headResidualBefore: Math.round(Math.sqrt(Math.pow(cBefore.x-center.x,2)+Math.pow(cBefore.y-center.y,2))),
    headResidualAfter: Math.round(Math.sqrt(Math.pow(cAfter.x-center.x,2)+Math.pow(cAfter.y-center.y,2))),
    getCenterNowMatchesVisual: Math.round(map.getCenter().distanceTo(map.containerPointToLatLng(center))*1000)/1000
  });
})()`));

// 3. chase loop: 90 frames of rawPanBy toward a moving target, verify convergence + no event storm
console.log('chase:', await ev(`(function(){
  var map = GS_APP.map, j1 = GS.routeEngine.api.byId('j1');
  var evts = { moveend: 0, zoom: 0, move: 0 };
  map.on('moveend', function(){ evts.moveend++; });
  map.on('zoom', function(){ evts.zoom++; });
  map.on('move', function(){ evts.move++; });
  var residuals = [];
  var n = 0;
  return new Promise(function (resolve) {
    (function frame(){
      var R = map.getSize(), center = R.divideBy(2);
      // 目标沿路径匀速移动（模拟 seek 帧回调）
      var ll = j1.path[Math.min(j1.path.length-1, Math.floor(n/2))];
      var c = map.latLngToContainerPoint(ll);
      var d = c.subtract(center);
      if (Math.abs(d.x) > .5 || Math.abs(d.y) > .5) map._rawPanBy(d);
      residuals.push(Math.round(Math.sqrt(Math.pow(c.x-center.x,2)+Math.pow(c.y-center.y,2))*10)/10);
      if (++n < 90) requestAnimationFrame(frame);
      else resolve(JSON.stringify({ frames: n, eventsDuringChase: evts,
        residualFirst5: residuals.slice(0,5), residualLast5: residuals.slice(-5),
        maxResidual: Math.max.apply(null, residuals) }));
    })();
  });
})()`, true));

ws.close();
process.exit(0);
