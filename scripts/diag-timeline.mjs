/* 时间轴密度诊断（临时工具）
 *
 * 用途：M3 事件数 53 → 84，时间轴圆点由 4 行增到 8 行，轨道高度 60px → 125px，
 * 挤占移动端纵向空间（地图区仅剩 317px）。本脚本在【桌面】与【移动】两种视口下
 * 输出：轨道行数分布、每行圆点数、轨道/地图/列表区高度，以及同年事件的拥挤情况。
 *
 * 用法：scripts/run-cdp.ps1 scripts/diag-timeline.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'shots') + path.sep;
const PAGE = 'file:///' + path.resolve(process.cwd(), 'geo-story.html').replace(/\\/g, '/');

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

async function ev(x) {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true });
  return r.exceptionDetails ? 'ERR:' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails).slice(0, 300) : r.result.value;
}
async function shot(n) {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT + n, Buffer.from(s.data, 'base64'));
  console.log('shot:', n);
}

const PROBE = `(function(){
  function h(sel){ var e=document.querySelector(sel); return e? Math.round(e.getBoundingClientRect().height):null; }
  var dots = [].slice.call(document.querySelectorAll('.tl-dot'));
  var rows = {};
  dots.forEach(function(x){ var r = x.dataset.row || '0'; rows[r] = (rows[r]||0)+1; });
  var track = document.getElementById('tlTrack').getBoundingClientRect();
  /* 轨道可用宽度与每年带宽 */
  var tl = GS_APP.seq;
  var from = Math.min.apply(null, tl.map(function(e){return e.from;}));
  var to   = Math.max.apply(null, tl.map(function(e){return e.from;}));
  var perYear = Math.round(track.width / (to - from));
  /* 每年事件数 */
  var cnt = {};
  tl.forEach(function(e){ cnt[e.from] = (cnt[e.from]||0)+1; });
  var years = Object.keys(cnt).map(Number).sort(function(a,b){return a-b;});
  /* 圆点两两重叠 */
  var boxes = dots.map(function(x){ var b=x.getBoundingClientRect(); return {l:b.left,r:b.right,t:b.top,b:b.bottom}; });
  var ov = 0;
  for (var i=0;i<boxes.length;i++) for (var j=i+1;j<boxes.length;j++){
    var a=boxes[i], c=boxes[j];
    if (a.l<c.r && c.l<a.r && a.t<c.b && c.t<a.b) ov++;
  }
  return JSON.stringify({
    viewport: [innerWidth, innerHeight],
    trackW: Math.round(track.width), trackH: Math.round(track.height),
    trackStyleH: document.getElementById('tlTrack').style.height,
    dots: dots.length, rows: rows, rowCount: Object.keys(rows).length,
    yearSpan: [from, to], pxPerYear: perYear,
    maxPerYear: Math.max.apply(null, years.map(function(y){return cnt[y];})),
    perYear: years.map(function(y){return y+':'+cnt[y];}).join(' '),
    overlapPairs: ov,
    map: h('#map'), scroll: h('#scroll'), tl: h('.tl'), sidebar: h('.sidebar'),
    listRows: document.querySelectorAll('#list .ev').length
  });
})()`;

for (const vp of [{ w: 1680, h: 1000, m: false, tag: 'desktop' }, { w: 430, h: 932, m: true, tag: 'mobile' }]) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.m });
  await send('Page.navigate', { url: PAGE });
  await sleep(4200);
  console.log('=== ' + vp.tag + ' ===');
  console.log(await ev(PROBE));
  await shot('diag-tl-' + vp.tag + '.png');
}

ws.close();
process.exit(0);
