/* 构图诊断：全屏地图 + 浮动浮层后的几何自检
 * 输出：地图/面板/时间轴/chips/图例/缩放控件的矩形，浮层之间是否互相压叠，
 *       以及「故事范围是否落在未被浮层遮住的区域」。
 * 用法：powershell -File scripts/run-cdp.ps1 scripts/diag-layout.mjs
 *      MOBILE=1 用 430×932 复测；TAG 用于截图命名。 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + path.join(here, '..', process.env.PAGE_FILE || 'geo-story.html').replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1:');
const MOBILE = process.env.MOBILE === '1';
const TAG = process.env.TAG || (MOBILE ? 'mobile' : 'desktop');
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const errs = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    errs.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
  }
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};
const send = (method, params) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true }); return r && r.result ? r.result.value : 'NO'; };
await new Promise(r => { ws.onopen = r; });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', MOBILE
  ? { width: 430, height: 932, deviceScaleFactor: 2, mobile: true }
  : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE });
await sleep(7600);   /* 首帧约 4.4s；再留 1.2s 让自定义属性与浮层定位彻底落定 */

console.log('geometry:', await ev(`(function(){
  function R(sel){ var e=document.querySelector(sel); if(!e) return null; var r=e.getBoundingClientRect();
    return { l:Math.round(r.left), t:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) }; }
  return JSON.stringify({
    vw: innerWidth, vh: innerHeight,
    map: R('#map'), panel: R('.sidebar'), tl: R('.tl'),
    chips: R('.chips'), legend: R('.legend'), zoom: R('.leaflet-control-zoom'), scale: R('.leaflet-control-scale'),
    attri: R('.attri'), toggle: R('#panelToggle'), mapctl: R('.mapctl'),
    tlhVar: getComputedStyle(document.documentElement).getPropertyValue('--tlh').trim(),
    insetVar: getComputedStyle(document.documentElement).getPropertyValue('--panelw').trim(),
    corner: (function(){ var c=document.querySelector('.leaflet-bottom.leaflet-right'); if(!c) return null;
      var r=c.getBoundingClientRect(), cs=getComputedStyle(c);
      return { t:Math.round(r.top), h:Math.round(r.height), mb:cs.marginBottom, bot:cs.bottom, inline:c.style.marginBottom+'/'+c.style.bottom,
        syncN: window.__syncN || 0 }; })()
  });
})()`));

/* 时间轴卡片内部高度分解：定位「条太高」到底高在哪一段 */
console.log('tl-breakdown:', await ev(`(function(){
  var tl = document.querySelector('.tl');
  var out = { total: Math.round(tl.getBoundingClientRect().height), cs: getComputedStyle(tl).padding };
  ['.tl-top','.tl-track','.tl-scale','.tl-foot','.tl-keys','.attri'].forEach(function(sel){
    var e = tl.querySelector(sel); if (!e) return;
    var r = e.getBoundingClientRect();
    out[sel] = Math.round(r.height) + 'px@' + Math.round(r.top - tl.getBoundingClientRect().top);
  });
  return JSON.stringify(out);
})()`));

/* --tlh 在各层是否一致（自定义属性继承断裂会让浮层错位） */
console.log('var-probe:', await ev(`(function(){
  var out = {};
  ['html','body','.app','.mapcol','#map','.mapctl','.now','.tl','#panelToggle'].forEach(function(s){
    var e = s === 'html' ? document.documentElement : (s === 'body' ? document.body : document.querySelector(s));
    if (!e) { out[s] = 'MISSING'; return; }
    out[s] = getComputedStyle(e).getPropertyValue('--tlh').trim();
  });
  return JSON.stringify(out);
})()`));

console.log('mapctl-probe:', await ev(`(function(){
  var m = document.querySelector('.mapctl');
  var cs = getComputedStyle(m);
  var op = m.offsetParent;
  return JSON.stringify({ bottom: cs.bottom, top: cs.top, pos: cs.position,
    offsetParent: op ? (op.id || op.className) : null,
    opH: op ? Math.round(op.getBoundingClientRect().height) : 0,
    rect: Math.round(m.getBoundingClientRect().top) + '..' + Math.round(m.getBoundingClientRect().bottom),
    tlh: cs.getPropertyValue('--tlh').trim() });
})()`));

/* 浮层两两压叠面积（除「面板/时间轴 盖住地图」这类预期重叠外，浮层之间不该互相压） */
console.log('overlaps:', await ev(`(function(){
  function R(sel){ var e=document.querySelector(sel); if(!e||!e.getBoundingClientRect().width) return null; return e.getBoundingClientRect(); }
  function ov(a,b){ if(!a||!b) return 0;
    return Math.round(Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))); }
  var sels = ['#panelToggle','.sidebar','.tl','.chips','.legend','.mapctl','.attri'];
  var out = [];
  for (var i=0;i<sels.length;i++) for (var j=i+1;j<sels.length;j++) {
    var a=ov(R(sels[i]),R(sels[j]));
    if (a>0) out.push(sels[i]+' × '+sels[j]+' = '+a+'px²');
  }
  return JSON.stringify(out);
})()`));

/* 故事范围是否落在「安全区」内（面板与时间轴遮住的地方不算） */
console.log('fits:', await ev(`JSON.stringify(GS_APP.fits())`));
console.log('fit-probe:', await ev(`(function(){
  var m = GS_APP.map, s = m.getSize(), ins = GS_APP.insets();
  var boxC = { x: (ins.l + s.x - ins.r)/2, y: (ins.t + s.y - ins.b)/2 };
  var byId = {}; GS_APP.places.forEach(function(p){ byId[p.id] = p; });
  var la = GS_APP.events.map(function(e){ return byId[e.place].ll; }).filter(Boolean);
  var lats = la.map(function(p){return p[0];}), lngs = la.map(function(p){return p[1];});
  var c = [(Math.min.apply(null,lats)+Math.max.apply(null,lats))/2, (Math.min.apply(null,lngs)+Math.max.apply(null,lngs))/2];
  var pt = m.latLngToContainerPoint(L.latLng(c[0], c[1]));
  var z = m.getZoom();
  var tgt = m.unproject(m.project(L.latLng(c[0], c[1]), z).add(L.point(s.x/2 - boxC.x, s.y/2 - boxC.y)), z);
  var now = m.getCenter();
  return JSON.stringify({ size:[s.x,s.y], insets: ins, boxCenter:[Math.round(boxC.x),Math.round(boxC.y)],
    zoom: z, geoCenter: c.map(function(v){return Math.round(v*100)/100;}),
    centerOnScreen: [Math.round(pt.x), Math.round(pt.y)],
    centerDelta: [Math.round((now.lat-tgt.lat)*1e4)/1e4, Math.round((now.lng-tgt.lng)*1e4)/1e4],
    viewportCenter: [s.x/2, s.y/2], ok: Math.abs(pt.x-boxC.x)<3 && Math.abs(pt.y-boxC.y)<3 });
})()`));
console.log('story-in-safe-area:', await ev(`(function(){
  var m = GS_APP.map, s = m.getSize();
  var ins = GS_APP.insets();
  var box = { l: ins.l, t: ins.t, r: s.x - ins.r, b: s.y - ins.b };
  var bad = [];
  GS_APP.places.forEach(function (p) {
    if (p.ctx) return;
    if (!GS_APP.events.some(function (e) { return e.place === p.id; })) return;
    var c = m.latLngToContainerPoint(p.ll);
    if (c.x < box.l - 1 || c.x > box.r + 1 || c.y < box.t - 1 || c.y > box.b + 1)
      bad.push(p.id + '(' + Math.round(c.x) + ',' + Math.round(c.y) + ')');
  });
  return JSON.stringify({ box: box, outside: bad, ok: bad.length === 0 });
})()`));

const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(here, '..', 'shot-layout-' + TAG + '.png'), Buffer.from(shot.data, 'base64'));
console.log('shot: shot-layout-' + TAG + '.png');
console.log('JS EXCEPTIONS:', errs.length ? errs.slice(0, 4).join(' || ') : 'NONE');
ws.close(); process.exit(0);
