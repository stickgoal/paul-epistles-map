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
/* 真实鼠标点击：走完整的 mousedown → mouseup → click 命中测试链路。
 * 必须用这个而非 DOM .click() —— 后者绕过命中测试，正是「引导卡点了没反应」
 * 「播完后事件点不开」这两个 bug 能通过验收却在线上复现的原因。 */
async function realClick(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await sleep(60);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function centerOf(sel) {
  const pos = await ev(`(function(){var e=document.querySelector('${sel}');if(!e)return 'NONE';var r=e.getBoundingClientRect();return JSON.stringify({x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)});})()`);
  return pos === 'NONE' ? null : JSON.parse(pos);
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

/* A8. 首屏播放引导回归（H-2）：核心交互「时间轴故事播放」的可发现性。
 *     引导卡在启动 1.9s 后入场，且sessionStorage 记忆，故须清存储后重导航再断言。 */
await ev(`sessionStorage.removeItem('gs.guide.seen.v1')`);
await send('Page.navigate', { url: PAGE });
await sleep(4200);
console.log('A8 guide:', await ev(`(function(){
  var g = document.getElementById('guide');
  return JSON.stringify({ visible: !g.classList.contains('hidden'),
    count: document.getElementById('guideN').textContent,
    span: document.getElementById('guideSpan').textContent,
    cta: document.getElementById('guideAct').textContent,
    playBtnHighlighted: document.getElementById('playBtn').classList.contains('hint') });
})()`));
await shot('f1b_guide.png');

/* A10b. 引导横幅不得覆盖任何可交互元素。
   它是流内元素（占据布局高度），因此必须验证：
     1) 与地图区域零交集（旧版居中浮层正好盖住事件标记密集区）
     2) 不遮挡播放按钮、事件列表行、时间轴圆点
   必须在 guide 仍可见时测：display:none 后 rect 全为 0，永远「无重叠」—— 那是假通过。 */
console.log('A10b guide-not-blocking:', await ev(`(function(){
  var gd = document.getElementById('guide');
  if (gd.classList.contains('hidden')) return JSON.stringify({ skipped: 'guide hidden' });
  var g = gd.getBoundingClientRect();
  function overlap(elm) {
    var r = elm.getBoundingClientRect();
    var ow = Math.min(g.right, r.right) - Math.max(g.left, r.left);
    var oh = Math.min(g.bottom, r.bottom) - Math.max(g.top, r.top);
    return Math.round(Math.max(0, ow) * Math.max(0, oh));
  }
  var blocked = { map: overlap(document.getElementById('map')),
                  playBtn: overlap(document.getElementById('playBtn')),
                  timeline: overlap(document.getElementById('tlTrack')) };
  var rows = 0;
  document.querySelectorAll('.ev').forEach(function (r) { if (overlap(r) > 0) rows++; });
  blocked.listRows = rows;
  var any = Object.keys(blocked).some(function (k) { return blocked[k] > 0; });
  return JSON.stringify({ visible: true, blocked: blocked, clear: !any });
})()`));

/* A9. 图例折叠态（L-1）：默认收起为一行摘要；播放中自动展开（读者此刻最需要图标含义），
 *     播完再收起。须在 A8 触发播放「之前」断言默认态。 */
console.log('A9 legend-default:', await ev(`(function(){
  var l = document.getElementById('legend'), b = document.getElementById('lgBody');
  return JSON.stringify({ collapsedByDefault: !l.classList.contains('open'),
    summary: document.getElementById('lgSum').textContent,
    bodyHeight: Math.round(b.getBoundingClientRect().height) });
})()`));

/* 点击引导卡 CTA → 关闭并开始播放，播放按钮恢复常规样式。
   必须走真实鼠标：旧实现整卡可点且 window pointerdown 在按下瞬间就置
   pointer-events:none，导致 mouseup 落到下层、click 的 target 退化为共同祖先，
   引导卡的 click 永不触发 —— 而 DOM .click() 绕过命中测试，测不出来。 */
const cta = await centerOf('#guideAct');
console.log('A10 guide-cta-realclick:', cta ? 'found' : 'MISSING');
if (cta) {
  await realClick(cta.x, cta.y);
  await sleep(1200);
  console.log('A10 result:', await ev(`JSON.stringify({
    playing: GS_APP.state.playing,
    dismissed: document.getElementById('guide').classList.contains('out'),
    playBtnBackToNormal: !document.getElementById('playBtn').classList.contains('hint') })`));
}
await ev(`GS_APP.pause()`); await sleep(300);

/* A11. 播完后事件图标隐去，但任意地图交互即恢复，且恢复后这一下就能点开详情。
   旧实现 body.story-end 只进不出，没有任何交互恢复 → 详情永久点不开。 */
await ev(`window.GS_APP.state.speed = 12; window.GS_APP.timeline.setYear(46); window.GS_APP.play();`);
for (var w = 0; w < 80; w++) { await sleep(400); if (!(await ev(`window.GS_APP.state.playing`))) break; }
await sleep(900);
const dotAfterEnd = await ev(`(function(){
  var d = document.querySelector('.ev-dot.on'); if (!d) return 'NONE';
  var r = d.getBoundingClientRect();
  return JSON.stringify({ id: d.getAttribute('data-ev'),
    pe: getComputedStyle(d).pointerEvents,
    x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) });
})()`);
console.log('A11 after-play-end dot:', dotAfterEnd, 'storyEnd:', await ev(`document.body.classList.contains('story-end')`));
if (dotAfterEnd !== 'NONE') {
  const dp = JSON.parse(dotAfterEnd);
  if (dp.pe === 'none') { await realClick(dp.x, dp.y); await sleep(600); }  /* 先在标记位置落一次，恢复图标 */
  const dp2 = JSON.parse(await ev(`(function(){
    var d = document.querySelector('.ev-dot[data-ev="${dp.id}"]'); var r = d.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) });
  })()`));
  await realClick(dp2.x, dp2.y);
  await sleep(1000);
  console.log('A11 result:', await ev(`JSON.stringify({
    recovered: !document.body.classList.contains('story-end'),
    detailOpen: !document.getElementById('detail').classList.contains('hidden'),
    title: (document.querySelector('.d-cn')||{}).textContent })`));
}
await ev(`window.GS_APP.close()`); await sleep(300);

/* A4. 初始视野聚焦地点密集区：全部事件地点应在视口内，且不覆盖整个地中海 */
console.log('A4 initial-view:', await ev(`(function(){
  var b = GS_APP.map.getBounds(), z = GS_APP.map.getZoom();
  var outside = GS_APP.places.filter(function(p){ return !p.ctx && !b.contains(L.latLng(p.ll)); }).map(function(p){return p.cn;});
  return JSON.stringify({ zoom: z, outsideEventPlaces: outside,
    spanLat: Math.round((b.getNorth()-b.getSouth())*10)/10, spanLng: Math.round((b.getEast()-b.getWest())*10)/10 });
})()`));

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
    if (dist > 38) evDev.push(e.id + ':' + Math.round(dist));  /* 设计圆周偏移半径 34 */
  });
  return JSON.stringify({ placeDev: placeDev, evDev: evDev });
})()`));

/* A5. 时间轴量程与圆点防重叠回归：
 *  - 量程上界须随已上线事件动态收敛（曾固定 AD 67，导致事件挤在左侧 14%、
 *    拖到中段却无新事件的「进度错觉」）
 *  - 圆点不得重叠（stagger 以「水平错位优先、行错位兜底」实现）
 *  - 章节色带须落在轨道内且可点击 */
console.log('A5 timeline-scale:', await ev(`(function(){
  var s = [].slice.call(document.querySelectorAll('#tlScale span')).map(function(x){return x.textContent;});
  var dots = document.querySelectorAll('.tl-dot');
  var boxes = [].slice.call(dots).map(function(x){var b=x.getBoundingClientRect();return {l:b.left,r:b.right,t:b.top,b:b.bottom};});
  var ov = 0;
  for (var i=0;i<boxes.length;i++) for (var j=i+1;j<boxes.length;j++) {
    var a=boxes[i], c=boxes[j];
    if (a.l<c.r && c.l<a.r && a.t<c.b && c.t<a.b) ov++;
  }
  var track = document.getElementById('tlTrack').getBoundingClientRect();
  var bands = [].slice.call(document.querySelectorAll('.tl-band')).map(function(b){var r=b.getBoundingClientRect();return {inTrack: r.bottom <= track.bottom + 1, clickable: getComputedStyle(b).pointerEvents !== 'none'};});
  var rows = {};
  [].slice.call(dots).forEach(function(x){ var r = x.dataset.row || '0'; rows[r] = (rows[r]||0)+1; });
  return JSON.stringify({ scale: s, dots: dots.length, overlappingPairs: ov, rows: rows,
    bandsInTrack: bands.every(function(b){return b.inTrack;}), bandsClickable: bands.every(function(b){return b.clickable;}) });
})()`));

/* A6. 标题命名一致性回归：标题不应再带地点前缀（地点已由侧栏标签承载），
 *     且不得出现「安提阿」这种在有两个安提阿时构成歧义的省略形式。 */
console.log('A6 title-convention:', await ev(`(function(){
  var bad = [];
  GS_APP.events.forEach(function (e) {
    var cn = GS_APP.places.filter(function (p) { return p.id === e.place; })[0].cn;
    if (e.title.indexOf(cn + '：') === 0 || e.title.indexOf('：') >= 0) bad.push(e.id + ':前缀=' + e.title);
  });
  var ambiguous = GS_APP.events.filter(function (e) { return /安提阿/.test(e.title) && !/彼西底|叙利亚/.test(e.title); })
                         .map(function (e) { return e.id; });
  return JSON.stringify({ withPrefix: bad, ambiguousAntioch: ambiguous, sample: GS_APP.events.slice(0,4).map(function(e){return e.title;}) });
})()`));

/* A7. 图像区块回归：media须有条目，且无图事件须走降级文案而非整块消失 */
console.log('A7 media:', await ev(`(function(){
  var withM = GS_APP.events.filter(function(e){return e.media && e.media.length;});
  var licenses = [];
  /* credit 形如「作者 · 授权 · Wikimedia Commons」。用 String.fromCharCode(183) 而非
     正则 \u00b7 —— CDP 表达式传输时反斜杠转义会被二次处理，字面量方案不可靠。 */
  var DOT = String.fromCharCode(183);
  withM.forEach(function(e){
    var segs = String(e.media[0].credit).split(DOT);
    if (segs.length >= 3) {
      var name = segs[1].replace(/^\s+|\s+$/g, '');
      if (licenses.indexOf(name) < 0) licenses.push(name);
    }
  });
  return JSON.stringify({
    withMedia: withM.length, total: GS_APP.events.length,
    creditsPresent: withM.every(function(e){return !!(e.media[0].credit && e.media[0].url);}),
    licenses: licenses });
})()`));
await ev(`GS_APP.open('paphos-sergius')`); await sleep(1200);
console.log('A7 media-render:', await ev(`JSON.stringify({
  hasBlock: !!document.querySelector('.d-media'),
  groups: [].slice.call(document.querySelectorAll('.d-mgroup h5')).map(function(h){return h.textContent;}),
  links: document.querySelectorAll('.m-link').length
})`));
await ev(`GS_APP.close()`); await sleep(300);
await ev(`GS_APP.open('antioch-commission')`); await sleep(1000);
console.log('A7 media-fallback:', await ev(`JSON.stringify({ note: !!document.querySelector('.d-mnote'), link: !!document.querySelector('.m-link') })`));
await ev(`GS_APP.close()`); await sleep(300);

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

/* D. 播放：年代递进 + 事件卡 + 当前事件（行程 4.2s：巡航 0.65s + 描线 3.5s，停留 5.2s） */
await ev(`window.GS_APP.timeline.setYear(46); window.GS_APP.state.speed = 1;`);
await sleep(200);
const playBtnPos = await centerOf('#playBtn');
if (playBtnPos) await realClick(playBtnPos.x, playBtnPos.y);
await sleep(9000);
console.log('D playing:', await ev(`window.GS_APP.state.playing`), 'year:', await ev(`document.getElementById('tlYear').textContent`), 'focus:', await ev(`window.GS_APP.state.focus`));
console.log('D card:', await ev(`(function(){var n=document.getElementById('now');return n.classList.contains('show')?(n.querySelector('.card-t')?n.querySelector('.card-t').textContent:'toast'):'hide';})()`));
console.log('D cur-dot:', await ev(`document.querySelectorAll('.ev-dot.cur').length`));
console.log('D lit:', await ev(`document.querySelectorAll('.fx-glow').length`));   /* .place.lit 是死类，点亮实为 fx-glow 标记 */
/* D1b. 事件图标：每个标记内含类型 SVG（非圆点）；播放中非当前事件压暗 */
console.log('D1b event-icons:', await ev(`JSON.stringify({
  dots: document.querySelectorAll('.ev-dot').length,
  svg: document.querySelectorAll('.ev-dot > svg').length,
  distinctPaths: new Set(Array.from(document.querySelectorAll('.ev-dot > svg path')).map(function(p){return p.getAttribute('d');})).size,
  dim: document.querySelectorAll('.ev-dot.dim').length,
  curNotDim: !document.querySelector('.ev-dot.cur').classList.contains('dim'),
  storyEnd: document.body.classList.contains('story-end')
})`));
/* D2. 描线同步：播放中路线点数应 > 1（事件驱动 seek 生效，而非停在起点） */
console.log('D2 route-progress:', await ev(`(function(){
  var j1 = GS.routeEngine.api.byId('j1');
  return JSON.stringify({ n: j1.base.getLatLngs().length, total: j1.path.length, headOn: j1.headOn });
})()`));
await shot('f3_playing.png');

/* D3. 相机与描线同步回归 + 跟车性能回归（2026-10-17 抖动修复后更新）：
 * 1) 镜头中心紧跟路线行进光点（屏幕像素距离）——rig 只挪 pane，latLngToContainerPoint 仍准确；
 * 2) 缩放分段到位：巡航 5.5 → 到达推近 6.5。旧实现逐帧插值缩放，被 zoomSnap:.5 量化成
 *    5.5→6.0→6.5 三次瞬跳，是「抖动」的成因之一；新实现走 flyTo 动画通道。缩放放慢后
 *    （推近 1.15s）采样窗口可能截获动画中的小数值，故断言放宽为「不越出 [5.5, 6.5] 波段」；
 * 3) 【事件风暴回归】跟车窗口内 map moveend 次数 ≈ 0。旧实现每帧一次 setView →
 *    每帧一次 moveend → 全场景 SVG 重投影（实测 12s 播放 31,466 次 d 重写 / 250 次 moveend），
 *    新实现 rig 走 _rawPanBy 零事件通道，窗口内只允许行程切换的个位数 moveend。 */
await ev(`(function(){
  window.__ev = { moveend: 0, zoomend: 0 };
  var map = GS_APP.map;
  map.on('moveend', function(){ window.__ev.moveend++; });
  map.on('zoomend', function(){ window.__ev.zoomend++; });
})()`);
var syncSamples = [];
for (var s = 0; s < 16; s++) {
  syncSamples.push(await ev(`(function(){
    var map = GS_APP.map, j1 = GS.routeEngine.api.byId('j1');
    if (!j1.headOn) return null;
    var R = map.getSize();
    var c = map.latLngToContainerPoint(j1.head.getLatLng());
    return { d: Math.round(Math.sqrt(Math.pow(c.x-R.x/2,2)+Math.pow(c.y-R.y/2,2))), z: map.getZoom(), pts: j1.base.getLatLngs().length };
  })()`));
  await sleep(200);
}
var evStorm = await ev(`JSON.stringify(window.__ev)`);
var valid = syncSamples.filter(Boolean);
var dists = valid.map(v => v.d);
var zooms = valid.map(v => v.z);
console.log('D3 samples:', JSON.stringify(valid));
console.log('D3 verdict:', JSON.stringify({
  maxCenterDistPx: Math.max.apply(null, dists),
  avgCenterDistPx: Math.round(dists.reduce(function(a,b){return a+b;},0)/dists.length),
  zoomChanged: Math.max.apply(null, zooms) !== Math.min.apply(null, zooms),
  zoomRange: [Math.min.apply(null, zooms), Math.max.apply(null, zooms)],
  zoomWithinBand: zooms.every(function(z){ return z >= 5.5 - 1e-9 && z <= 6.5 + 1e-9; }),
  zoomOnlyCruiseOrEvent: zooms.every(function(z){ return Math.abs(z-5.5) < 1e-9 || Math.abs(z-6.5) < 1e-9 || (z > 5.5 && z < 6.5); }),
  routeGrew: valid[valid.length-1].pts > valid[0].pts,
  eventStorm: evStorm,
  moveendInWindowOK: (function(){ var e = JSON.parse(evStorm); return e.moveend <= 4; })()
}));

/* D4. 到达才弹出（需求1）：行程途中不得出现事件卡 / 当前事件高亮 / 地点点亮，
 * 路线抵达地点后才允许出现。旧实现在行程起点即 showCard + lit。
 * 时序（1×）：巡航 0–650ms → 描线 700–4200ms → 到达（卡片+点亮+推近 1.15s）→ 停留。 */
await ev(`window.GS_APP.pause()`); await sleep(400);
await ev(`window.GS_APP.timeline.setYear(46); window.GS_APP.state.speed = 1; window.GS_APP.play();`);
await sleep(2400);   /* 行程中段 */
var d4mid = await ev(`JSON.stringify({
  cardShown: document.getElementById('now').classList.contains('show'),
  curDots: document.querySelectorAll('.ev-dot.cur').length,
  fxGlow: document.querySelectorAll('.fx-glow').length,
  year: document.getElementById('tlYear').textContent,
  routePts: GS.routeEngine.api.byId('j1').base.getLatLngs().length })`);
var d4arrived = false, d4cardEarly = false;
for (var a4 = 0; a4 < 45; a4++) {
  await sleep(200);
  var s4 = JSON.parse(await ev(`JSON.stringify({ cur: document.querySelectorAll('.ev-dot.cur').length,
    card: document.getElementById('now').classList.contains('show') })`));
  if (s4.cur > 0) { d4arrived = true; break; }
  if (s4.card) d4cardEarly = true;
}
await sleep(1500);   /* 等到达推近动画（1.15s）走完 */
var d4after = await ev(`JSON.stringify({
  card: document.getElementById('now').classList.contains('show'),
  cardT: (document.querySelector('.card-t')||{}).textContent || '',
  cardP: (document.querySelector('.card-p')||{}).textContent || '',
  glow: document.querySelectorAll('.fx-glow').length,
  zoom: GS_APP.map.getZoom(),
  curDots: document.querySelectorAll('.ev-dot.cur').length })`);
console.log('D4 arrive-gating: mid=' + d4mid);
console.log('D4 verdict:', JSON.stringify({ arrived: d4arrived, cardBeforeArrival: d4cardEarly,
  after: d4after, ok: d4arrived && !d4cardEarly && d4after.card && d4after.glow >= 1 && d4after.curDots === 1 && Math.abs(d4after.zoom - 6.5) < 0.01 }));

/* D5. 路线精确经过地点（需求3）：每条旅程的每个站点必须落在路径上。
 * 旧中点平滑最近点偏离站点 |a+c-2b|/8（帕弗→别加→彼西底的安提阿一角约 0.26°）。 */
console.log('D5 route-through-places:', await ev(`(function(){
  var worst = 0, worstAt = '';
  GS.routeEngine.api.all().forEach(function (j) {
    if (!j.path) return;
    j.stops.forEach(function (s) {
      var best = Infinity;
      for (var i = 0; i < j.path.length; i++) {
        var dx = j.path[i][1] - s.ll[1], dy = j.path[i][0] - s.ll[0];
        var d2 = dx*dx + dy*dy;
        if (d2 < best) best = d2;
      }
      var d = Math.sqrt(best);
      if (d > worst) { worst = d; worstAt = j.id + '/' + s.cn; }
    });
  });
  return JSON.stringify({ maxDevDeg: Math.round(worst*1e6)/1e6, worstAt: worstAt, exact: worst < 0.001 });
})()`));

/* D6. 地点呼吸频率（需求4）：每地点双环错相、周期 ≥ 4s。
 * 旧实现单环 4.6s 且 70→100% 强制熄屏，读作「闪烁」。
 * 注意：headless Chrome 默认 prefers-reduced-motion:reduce，全局动画被
 * prefers-reduced-motion 媒体查询压成 .01ms——必须先模拟 no-preference 再测计算值。 */
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
console.log('D6 breathing:', await ev(`(function(){
  var rings = document.querySelectorAll('.place[data-place="paphos"] .ring');
  var cs = rings.length ? getComputedStyle(rings[0]) : null;
  return JSON.stringify({ rings: rings.length,
    name: cs ? cs.animationName : 'none',
    duration: cs ? cs.animationDuration : 'none',
    ring2Delay: rings.length > 1 ? getComputedStyle(rings[1]).animationDelay : 'none',
    ok: rings.length === 2 && !!cs && parseFloat(cs.animationDuration) >= 4 });
})()`));

/* D7. 播放/缩放节奏放慢（需求2）：行程与推近时长须显著大于旧值（2600 / 550ms）。 */
var d7 = JSON.parse(await ev(`JSON.stringify(GS_APP.timing)`));
console.log('D7 timing:', JSON.stringify(d7), '| slower:',
  (d7.TRAVEL >= 3500 && d7.ARRIVE_MS >= 900 && d7.CRUISE_MS >= 500) ? 'OK' : 'TOO_FAST');
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

/* G. 章节筛选：点击 ch1 chip 列表计数（行数只数 #list——详情/介绍窗内的 .ev 行
 * 会留在 DOM 里，曾让 H 的筛选计数把地点介绍窗的 3 行也算进去得到 15） */
await click('.ch-chip[data-ch="ch1"]');
await sleep(400);
console.log('G ch1 rows:', await ev(`document.querySelectorAll('#list .ev').length`), 'chips on:', await ev(`document.querySelectorAll('.ch-chip.on').length`));
await click('.ch-chip[data-ch="ch1"]');
await sleep(400);
console.log('G ch1-off rows:', await ev(`document.querySelectorAll('#list .ev').length`));

/* H. 地点介绍窗（需求5）：点击地点核心弹出该地介绍；窗内事件行可跳转详情，
 * 返回经一层栈回介绍窗；「仅看此地事件」按钮承接原「核心点击即筛选」的入口。 */
await click('.place[data-place="lystra"] .core');
await sleep(1100);
console.log('H place-intro:', await ev(`(function(){var d=document.getElementById('detail');
  return d.classList.contains('hidden') ? 'HIDDEN' : JSON.stringify({
    isPlace: d.classList.contains('place'),
    name: (document.querySelector('.d-cn')||{}).textContent,
    state: window.GS_APP.state.detail,
    evRows: document.querySelectorAll('.place-evs .ev').length });})()`));
await ev(`document.querySelector('.place-evs .ev[data-ev="lystra-stoning"]').scrollIntoView({block:'center'})`);
await click('.place-evs .ev[data-ev="lystra-stoning"]');
await sleep(1100);
console.log('H intro-to-event:', await ev(`(function(){var d=document.getElementById('detail');
  return d.classList.contains('hidden') ? 'HIDDEN' : (document.querySelector('.d-cn')||{}).textContent;})()`));
await click('#backBtn');
await sleep(700);
console.log('H back-to-place:', await ev(`(function(){var d=document.getElementById('detail');
  return d.classList.contains('hidden') ? 'HIDDEN' : (d.classList.contains('place') ? (document.querySelector('.d-cn')||{}).textContent : 'NOT_PLACE');})()`));
await ev(`document.getElementById('placeFilterBtn').scrollIntoView({block:'center'})`);
await click('#placeFilterBtn');
await sleep(600);
console.log('H filterbar:', await ev(`(function(){var f=document.getElementById('filterbar');return f.classList.contains('hidden')?'HIDDEN':f.textContent.replace(/\\s+/g,' ').slice(0,30);})()`));
console.log('H filtered rows:', await ev(`document.querySelectorAll('#list .ev').length`));
await click('#clearFilter');
await sleep(300);
console.log('H cleared rows:', await ev(`document.querySelectorAll('#list .ev').length`));

/* I. 重置视图 */
await click('#resetBtn');
await sleep(1200);
console.log('I reset year:', await ev(`document.getElementById('tlYear').textContent`), 'count:', await ev(`document.getElementById('tlCount').textContent`));

/* I2. 播放到底：事件图标应整体隐去（story-end），任意交互后恢复
   临时把倍速调高以在合理时间内跑完整个序列（D 为只读引用，改state.speed 生效） */
await ev(`window.GS_APP.state.speed = 12; window.GS_APP.timeline.setYear(46); window.GS_APP.play();`);
for (var q = 0; q < 90; q++) {
  await sleep(400);
  if (!(await ev(`window.GS_APP.state.playing`))) break;
}
await sleep(800);
console.log('I2 play-end storyEnd:', await ev(`document.body.classList.contains('story-end')`),
  '| dots hidden:', await ev(`(function(){var d=document.querySelector('.ev-dot.on');return d?getComputedStyle(d).opacity:'no-visible-dot';})()`));
await ev(`window.GS_APP.timeline.setYear(50)`);
await sleep(400);
console.log('I2 after-interaction storyEnd:', await ev(`document.body.classList.contains('story-end')`));

/* J. 移动端 */
await ev(`sessionStorage.removeItem('gs.guide.seen.v1')`);
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: PAGE });
await sleep(4400);
console.log('J mobile mapH:', await ev(`Math.round(document.getElementById('map').getBoundingClientRect().height)`));
console.log('J mobile guide:', await ev(`(function(){
  var gd = document.getElementById('guide');
  var g = gd.getBoundingClientRect();
  function ov(elm){ var r=elm.getBoundingClientRect();
    return Math.round(Math.max(0,Math.min(g.right,r.right)-Math.max(g.left,r.left)) * Math.max(0,Math.min(g.bottom,r.bottom)-Math.max(g.top,r.top))); }
  return JSON.stringify({ visible: !gd.classList.contains('hidden'),
    mapOverlap: ov(document.getElementById('map')),
    playBtnOverlap: ov(document.getElementById('playBtn')),
    inViewport: g.left >= 0 && g.right <= innerWidth && g.top >= 0 && g.bottom <= innerHeight });
})()`));
/* J2. 窄屏高度分配：事件列表区必须仍可容纳至少 3 行事件（曾实测被压到 45px，
   列表整体不可见、引导横幅压住播放按钮 —— 且当时没有任何断言覆盖这条）。 */
console.log('J2 mobile-layout:', await ev(`(function(){
  var scEl = document.getElementById('scroll');
  var sc = scEl.getBoundingClientRect();
  var cb = document.getElementById('chapterbar').getBoundingClientRect();
  /* 统计 scroll 区内有多少事件行有实际可视高度（未被压扁/挤出） */
  var rows = [].slice.call(document.querySelectorAll('.ev'));
  var rowH = rows.length ? rows[0].getBoundingClientRect().height : 0;
  var usable = sc.height - cb.height;
  return JSON.stringify({
    scrollH: Math.round(sc.height),
    chapterbarH: Math.round(cb.height),
    usableForRows: Math.round(usable),
    visibleRows: Math.max(0, Math.floor(usable / Math.max(1, rowH))),
    mapH: Math.round(document.getElementById('map').getBoundingClientRect().height),
    listRows: rows.length,
    scrollable: scEl.scrollHeight > scEl.clientHeight + 1,
    ok: sc.height >= 88 && usable / Math.max(1, rowH) >= 3
  });
})()`));
await shot('f5_mobile.png');

console.log('JS ERRORS:', errors.length ? errors.join(' | ') : 'NONE');
ws.close();
process.exit(0);
