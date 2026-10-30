/* 时间轴圆点重叠诊断：定位 A5（矩形相交）与 M4-8（圆心距）结论不一致的原因 */
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
  if (r.exceptionDetails) return 'ERR:' + JSON.stringify(r.exceptionDetails).slice(0, 200);
  return r.result.value;
};

await new Promise(r => { ws.onopen = r; });
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE });
await sleep(5200);

console.log('boxes:', await ev(`(function(){
  var dots = [].slice.call(document.querySelectorAll('.tl-dot'));
  var boxes = dots.map(function(x){var b=x.getBoundingClientRect();return {l:b.left,r:b.right,t:b.top,b:b.bottom,w:b.width,h:b.height,id:x.title,dx:x.style.getPropertyValue('--dx'),top:x.style.top};});
  var pairs = [];
  for (var i=0;i<boxes.length;i++) for (var j=i+1;j<boxes.length;j++) {
    var a=boxes[i], c=boxes[j];
    if (a.l<c.r && c.l<a.r && a.t<c.b && c.t<a.b) pairs.push({a:a.id.slice(0,18),b:c.id.slice(0,18),aw:Math.round(a.w),ah:Math.round(a.h),dxa:a.dx,dxt:c.dx,at:Math.round(a.t),ct:Math.round(c.t)});
  }
  var rows = {}; dots.forEach(function(x){ var r=x.dataset.row||'0'; rows[r]=(rows[r]||0)+1; });
  return JSON.stringify({dots:dots.length, pairs:pairs.length, sample:pairs.slice(0,4), rows:rows,
    trackH: document.getElementById('tlTrack').getBoundingClientRect().height,
    firstDx: dots.slice(0,3).map(function(d){return d.style.getPropertyValue('--dx')+'/'+d.style.top;})});
})()`));
await sleep(1500);
console.log('after-wait:', await ev(`(function(){
  var dots = [].slice.call(document.querySelectorAll('.tl-dot'));
  var boxes = dots.map(function(x){var b=x.getBoundingClientRect();return {l:b.left,r:b.right,t:b.top,b:b.bottom};});
  var ov=0;
  for (var i=0;i<boxes.length;i++) for (var j=i+1;j<boxes.length;j++) {
    var a=boxes[i], c=boxes[j];
    if (a.l<c.r && c.l<a.r && a.t<c.b && c.t<a.b) ov++;
  }
  return JSON.stringify({dots:dots.length, overlaps:ov, trackH: document.getElementById('tlTrack').getBoundingClientRect().height});
})()`));
ws.close();
process.exit(0);
