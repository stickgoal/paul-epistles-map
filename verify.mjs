/* M1 验收脚本：启动态 / 事件渲染 / 点击详情 / 播放序列 / 步进 / 深链 / 章节与地点筛选 / 控制台错误
 * 依赖：headless Chrome 已带 --remote-debugging-port=9222 启动 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + path.join(here, 'geo-story.html').replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1:');
const OUT = here + path.sep;

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push(m.params.args.map(a => a.value || a.description).join(' '));
  }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push('EXC: ' + JSON.stringify(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).slice(0, 200));
  }
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
await sleep(4800);

async function ev(x) {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true });
  return r.exceptionDetails ? 'ERR:' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails).slice(0, 200) : r.result.value;
}
async function shot(n) {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT + n, Buffer.from(s.data, 'base64'));
  console.log('shot:', n);
}
async function click(sel) {
  const pos = await ev(`(function(){var e=document.querySelector('${sel}');if(!e)return 'NONE';var r=e.getBoundingClientRect();return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2);})()`);
  if (pos === 'NONE') { console.log('MISSING:', sel); return false; }
  const [x, y] = pos.split(',').map(Number);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  return true;
}

/* A. 启动态：统计 / 事件数据 / 地图标记 */
console.log('A stats:', await ev(`document.querySelector('#stats').textContent.replace(/\\s+/g,' ').trim()`));
console.log('A events:', await ev(`window.GS_APP ? GS_APP.events.length : 'NO_HOOK'`));
console.log('A ev-dots:', await ev(`document.querySelectorAll('.ev-dot').length`));
console.log('A places:', await ev(`document.querySelectorAll('.place').length`), 'ctx:', await ev(`document.querySelectorAll('.ctx').length`));
console.log('A year:', await ev(`document.getElementById('tlYear').textContent`));
console.log('A count:', await ev(`document.getElementById('tlCount').textContent`));
/* A2. SEQ 顺序回归：同年事件必须保持 events.json 的叙事顺序（曾因 id 字典序 tie-break 导致播放乱序） */
console.log('A2 seq-order:', await ev(`(function(){
  var same = GS_APP.seq.filter(function(e){return e.from===46;}).map(function(e){return e.id;}).join(',');
  var evOrder = GS_APP.events.filter(function(e){return e.from===46;}).map(function(e){return e.id;}).join(',');
  return JSON.stringify({ seq46: same, events46: evOrder, match: same === evOrder });
})()`));
await shot('f1_boot.png');

/* A3. 位置精度回归：marker 视觉中心 vs latLng 投影。
 * place core 曾因 CSS 全段失效退化为 0×0；ev-dot 曾因 JS/CSS 双重 margin 偏移 6px。 */
console.log('A3 position-accuracy:', await ev(`(function(){
  var map = GS_APP.map;
  var mapR = map.getContainer().getBoundingClientRect();
  var placeDev = [], evDev = [];
  GS_APP.places.forEach(function (p) {
    if (p.ctx) return;
    var el = document.querySelector('.place[data-place="' + p.id + '"]');
    if (!el) return;
    var r = el.closest('.place-icon').getBoundingClientRect();
    var c = map.latLngToContainerPoint(p.ll);
    var dx = (r.x + r.width/2) - (mapR.left + c.x), dy = (r.y + r.height/2) - (mapR.top + c.y);
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) placeDev.push(p.id + ':' + Math.round(dx) + ',' + Math.round(dy));
  });
  GS_APP.events.forEach(function (e) {
    var d = document.querySelector('.ev-dot[data-ev="' + e.id + '"]');
    if (!d) return;
    var r = d.getBoundingClientRect();
    if (r.width === 0) return;
    var c = map.latLngToContainerPoint(e.ll);
    var dx = (r.x + r.width/2) - (mapR.left + c.x), dy = (r.y + r.height/2) - (mapR.top + c.y);
    var dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 30) evDev.push(e.id + ':' + Math.round(dist));  /* 设计圆周偏移半径 26 */
  });
  return JSON.stringify({ placeDev: placeDev, evDev: evDev });
})()`));

/* B. 点击列表事件 → 详情视图（士求保罗） */
await click('.ev[data-ev="paphos-sergius"]');
await sleep(2200);
console.log('B detail:', await ev(`(function(){var d=document.getElementById('detail');return d.classList.contains('hidden')?'HIDDEN':document.querySelector('.d-cn').textContent;})()`));
console.log('B verse:', await ev(`(function(){var v=document.querySelector('.d-verse p');return v?v.textContent.slice(0,24):'none';})()`));
console.log('B meta:', await ev(`(function(){var m=document.querySelector('.d-meta');return m?m.textContent.replace(/\\s+/g,' ').slice(0,60):'none';})()`));
console.log('B state:', await ev(`window.GS_APP.state.detail`));
console.log('B hash:', await ev(`location.hash`));
await shot('f2_detail.png');

/* C. 返回列表 */
await click('#backBtn');
await sleep(500);
console.log('C list-back:', await ev(`document.getElementById('list').classList.contains('hidden')?'HIDDEN':'shown'`), 'detail:', await ev(`window.GS_APP.state.detail`));

/* D. 播放 5 秒：年代递进 + 事件卡 + 当前事件 */
await click('#playBtn');
await sleep(5000);
console.log('D playing:', await ev(`window.GS_APP.state.playing`), 'year:', await ev(`document.getElementById('tlYear').textContent`), 'focus:', await ev(`window.GS_APP.state.focus`));
console.log('D card:', await ev(`(function(){var n=document.getElementById('now');return n.classList.contains('show')?(n.querySelector('.card-t')?n.querySelector('.card-t').textContent:'toast'):'hide';})()`));
console.log('D cur-dot:', await ev(`document.querySelectorAll('.ev-dot.cur').length`));
console.log('D lit:', await ev(`document.querySelectorAll('.place.lit').length`));
/* D2. 描线同步：播放中路线点数应 > 1（事件驱动 seek 生效，而非停在起点） */
console.log('D2 route-progress:', await ev(`(function(){
  var j1 = GS.routeEngine.api.byId('j1');
  return JSON.stringify({ n: j1.base.getLatLngs().length, total: j1.path.length, headOn: j1.headOn });
})()`));
await shot('f3_playing.png');
await ev(`window.GS_APP.pause()`);
await sleep(400);
console.log('D paused:', await ev(`window.GS_APP.state.playing`));

/* E. 步进下一事件（API 精确控制：鼠标点击+截图耗时可能漂移过 dwell 边界，导致断言假阴性） */
var eBefore = await ev(`window.GS_APP.state.focus`);
await ev(`window.GS_APP.step(1)`);
await sleep(1200);
var eAfter = await ev(`window.GS_APP.state.focus`);
console.log('E focus-after-step:', eAfter, 'year:', await ev(`document.getElementById('tlYear').textContent`), '| from:', eBefore, '→', eAfter);
console.log('E step-adjacency:', await ev(`(function(){
  var ids = GS_APP.seq.map(function(e){return e.id;});
  var i = ids.indexOf('${eBefore}');
  return JSON.stringify({ ok: i >= 0 && i + 1 < ids.length && ids[i+1] === '${eAfter}' });
})()`));
/* E2. 描线 seek 生效：步进到帕弗事件后，路线应已描到帕弗附近（n 明显 > 起点） */
console.log('E2 route-after-step:', await ev(`(function(){
  var j1 = GS.routeEngine.api.byId('j1');
  var head = j1.headOn ? j1.head.getLatLng() : null;
  return JSON.stringify({ n: j1.base.getLatLngs().length, total: j1.path.length, head: head ? [Math.round(head.lat*100)/100, Math.round(head.lng*100)/100] : null });
})()`));

/* F. hash 深链 #e/lystra-stoning */
await send('Page.navigate', { url: PAGE + '#e/lystra-stoning' });
await sleep(4200);
console.log('F deep-link:', await ev(`(function(){var d=document.getElementById('detail');return d.classList.contains('hidden')?'HIDDEN':document.querySelector('.d-cn').textContent;})()`));
await shot('f4_deeplink.png');

/* G. 章节筛选：点击 ch1 chip 列表计数 */
await click('.ch-chip[data-ch="ch1"]');
await sleep(400);
console.log('G ch1 rows:', await ev(`document.querySelectorAll('.ev').length`), 'chips on:', await ev(`document.querySelectorAll('.ch-chip.on').length`));
await click('.ch-chip[data-ch="ch1"]');
await sleep(400);
console.log('G ch1-off rows:', await ev(`document.querySelectorAll('.ev').length`));

/* H. 地点筛选：点击路司得核心 */
await click('.place[data-place="lystra"] .core');
await sleep(900);
console.log('H filterbar:', await ev(`(function(){var f=document.getElementById('filterbar');return f.classList.contains('hidden')?'HIDDEN':f.textContent.replace(/\\s+/g,' ').slice(0,30);})()`));
console.log('H filtered rows:', await ev(`document.querySelectorAll('.ev').length`));
await click('#clearFilter');
await sleep(300);
console.log('H cleared rows:', await ev(`document.querySelectorAll('.ev').length`));

/* I. 重置视图 */
await click('#resetBtn');
await sleep(1200);
console.log('I reset year:', await ev(`document.getElementById('tlYear').textContent`), 'count:', await ev(`document.getElementById('tlCount').textContent`));

/* J. 移动端 */
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: PAGE });
await sleep(4200);
console.log('J mobile mapH:', await ev(`Math.round(document.getElementById('map').getBoundingClientRect().height)`));
await shot('f5_mobile.png');

console.log('JS ERRORS:', errors.length ? errors.join(' | ') : 'NONE');
ws.close();
process.exit(0);
