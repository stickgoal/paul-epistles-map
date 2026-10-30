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
await sleep(6000);   /* 首帧就绪：97 事件 + 内联媒体在无 GPU 的 headless 下约 4.7s（GS_APP.boot≈2.5s，首次绘制更晚） */

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
await sleep(6000);
console.log('A8 guide:', await ev(`(function(){
  var g = document.getElementById('guide');
  var btn = document.getElementById('playBtn');
  var cs = getComputedStyle(btn);
  return JSON.stringify({ visible: !g.classList.contains('hidden'),
    count: document.getElementById('guideN').textContent,
    span: document.getElementById('guideSpan').textContent,
    cta: document.getElementById('guideAct').textContent,
    playBtnHighlighted: btn.classList.contains('hint'),
    hintAnim: cs.animationName });
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
await ev(`window.GS_APP.state.speed = 24; window.GS_APP.timeline.setYear(46); window.GS_APP.play();`);
for (var w = 0; w < 150; w++) { await sleep(400); if (!(await ev(`window.GS_APP.state.playing`))) break; }
await sleep(900);
const dotAfterEnd = await ev(`(function(){
  /* 必须取【地图容器内】的标记：播放全程相机已移到罗马，AD46 那个标记早跑到视口外，
     对它派发鼠标事件等于点在空白处，会造成「恢复失败」的假阴性。
     恢复机制是地图容器的 pointerdown（捕获阶段），故坐标必须落在 #map 内。 */
  var mr = document.getElementById('map').getBoundingClientRect();
  var dots = [].slice.call(document.querySelectorAll('.ev-dot.on'));
  var inMap = dots.filter(function (d) {
    var r = d.getBoundingClientRect();
    return r.left >= mr.left && r.top >= mr.top && r.right <= mr.right && r.bottom <= mr.bottom
        && r.width > 0 && r.height > 0;
  });
  var d = inMap[0] || dots[0]; if (!d) return 'NONE';
  var r = d.getBoundingClientRect();
  return JSON.stringify({ id: d.getAttribute('data-ev'),
    inMap: inMap.length,
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

/* ===== M2 验收：第二、三次传道旅程 + 书信事件 =====
 * M1 的断言只看 ch1 的 12 个事件，M2 之后事件数增至 53、章节增至 3 章，
 * 新增的断言全部围绕「扩数据后会不会崩」这一类问题：不变量优先，不写死数量。 */
console.log('M2-1 chapters:', await ev(`(function(){
  var per = {};
  GS_APP.chapters.forEach(function (c) {
    var evs = GS_APP.events.filter(function (e) { return e.ch === c.id; });
    per[c.id] = { name: c.name, years: c.years, n: evs.length,
      outOfRange: evs.filter(function (e) { return e.from < c.from || e.to > c.to; }).map(function (e) { return e.id; }) };
  });
  var live = GS_APP.chapters.filter(function (c) { return GS_APP.events.some(function (e) { return e.ch === c.id; }); }).length;
  return JSON.stringify({ total: GS_APP.events.length, liveChapters: live, per: per,
    lo: Math.min.apply(null, GS_APP.events.map(function (e) { return Math.min(e.from, e.to); })),
    hi: Math.max.apply(null, GS_APP.events.map(function (e) { return Math.max(e.from, e.to); })) });
})()`));

/* M2-2. 同年顺序不变量：对【每一个】年份，SEQ 中同年的事件顺序必须等于 events.json 的手工顺序。
 *   M1 只验了 from===46 一年；M2 事件分布到 12 个年份，任何一年的 tie-break 被改都会导致播放乱序。 */
console.log('M2-2 same-year-order:', await ev(`(function(){
  var byYear = {};
  GS_APP.events.forEach(function (e) { (byYear[e.from] = byYear[e.from] || []).push(e.id); });
  var bad = [];
  Object.keys(byYear).forEach(function (y) {
    var fileOrder = byYear[y].join(',');
    var seqOrder = GS_APP.seq.filter(function (e) { return e.from === +y; }).map(function (e) { return e.id; }).join(',');
    if (fileOrder !== seqOrder) bad.push(y + ': ' + fileOrder + ' != ' + seqOrder);
  });
  return JSON.stringify({ years: Object.keys(byYear).length, bad: bad, ok: bad.length === 0 });
})()`));

/* M2-3. 章节闸门回归（2026-10-26 修的串线 bug）：
 *   seek() 原先只按地点匹配 → ch1 的「耶路撒冷会议」会命中 j2/j3 的耶路撒冷站点，
 *   把第二、三次旅程的线在 AD 49 就画到耶路撒冷。现在事件只驱动本章所属旅程。 */
console.log('M2-3 chapter-gate:', await ev(`(function(){
  GS.routeEngine.api.release();
  var council = GS_APP.events.filter(function (e) { return e.id === 'jerusalem-council'; })[0];
  GS.routeEngine.api.seek(council, 0);
  var g = function (id) { var j = GS.routeEngine.api.byId(id); return j ? j.hold : 'NO_ROUTE'; };
  var crossTalk = { j1: g('j1'), j2: g('j2'), j3: g('j3') };
  /* 正对照：ch2 事件必须能推进 j2（否则闸门把描线也关了） */
  GS.routeEngine.api.release();
  var lydia = GS_APP.events.filter(function (e) { return e.id === 'ch2-lydia'; })[0];
  GS.routeEngine.api.seek(lydia, 0);
  var j2 = GS.routeEngine.api.byId('j2'), j3 = GS.routeEngine.api.byId('j3');
  var pos = { j2: j2.hold, j3: j3.hold };
  GS.routeEngine.api.release();
  return JSON.stringify({
    councilHolds: crossTalk,
    noCrossTalk: crossTalk.j2 === null && crossTalk.j3 === null,
    ch2AdvancesJ2: pos.j2 !== null && pos.j2 !== undefined,
    ch2LeavesJ3: pos.j3 === null || pos.j3 === undefined
  });
})()`));

/* M2-4. M2 新增地点必须有事件点（地点有事件却不出标记 = 事件挂错 place id）
 *   注意 DOM 结构：.ev-dot 挂在 Leaflet 图标的容器上（与 .place 同级），
 *   不是 .place 的子节点——用 `.place .ev-dot` 查永远是 0，会造成假失败。 */
console.log('M2-4 new-places:', await ev(`(function(){
  var want = ['troas','philippi','thessalonica','berea','athens','corinth','ephesus','caesarea','miletus','tyre'];
  var out = {}, bad = [];
  function dotsOf(pid) {
    var ids = GS_APP.events.filter(function (e) { return e.place === pid; }).map(function (e) { return e.id; });
    var n = 0;
    ids.forEach(function (id) { if (document.querySelector('.ev-dot[data-ev="' + id + '"]')) n++; });
    return { dots: n, events: ids.length };
  }
  want.forEach(function (pid) {
    var r = dotsOf(pid);
    out[pid] = r;
    if (!r.dots || r.dots !== r.events) bad.push(pid);
  });
  var all = GS_APP.events.filter(function (e) { return !document.querySelector('.ev-dot[data-ev="' + e.id + '"]'); }).map(function (e) { return e.id; });
  return JSON.stringify({ per: out, bad: bad, eventsWithoutDot: all, ok: bad.length === 0 && all.length === 0 });
})()`));

/* M2-5. 事件字段完整性：每个事件都要有标题/英文名/摘要/叙事/经文；
 *   媒体条目必须有 credit + 溯源 url（学术纪律：媒体必须可溯源）。 */
console.log('M2-5 field-completeness:', await ev(`(function(){
  var missing = [], mediaBad = [], mediaN = 0;
  GS_APP.events.forEach(function (e) {
    if (!e.title || !e.en || !e.brief || !e.narrative) missing.push(e.id + ':text');
    if (!e.verses || !e.verses.length) missing.push(e.id + ':verses');
    (e.media || []).forEach(function (m) {
      mediaN++;
      if (!m.credit || !m.url) mediaBad.push(e.id + ':' + (m.title || '?'));
    });
  });
  return JSON.stringify({ missing: missing, mediaEntries: mediaN, mediaBad: mediaBad,
    withMedia: GS_APP.events.filter(function (e) { return e.media && e.media.length; }).length,
    ok: missing.length === 0 && mediaBad.length === 0 });
})()`));

/* M2-6. 事件 ↔ 路线：每个事件在本章旅程上都要有可命中的站点（描线通道） */
console.log('M2-6 event-route-hit:', await ev(`(function(){
  var CH = { ch1: 'j1', ch2: 'j2', ch3: 'j3' };
  var miss = [];
  GS_APP.events.forEach(function (e) {
    var jid = CH[e.ch]; if (!jid) return;
    var j = GS_APP.routes.filter(function (r) { return r.id === jid; })[0];
    var hit = j.stops.some(function (s) { return s.p === e.place; });
    if (!hit) miss.push(e.id + '@' + jid);
  });
  return JSON.stringify({ miss: miss, ok: miss.length === 0 });
})()`));

/* M2-7. 时间轴承载力：53 个事件挤进 AD 46–57，圆点不得重叠、章节色带须落在轨道内 */
console.log('M2-7 timeline-load:', await ev(`(function(){
  var dots = document.querySelectorAll('.tl-dot');
  var boxes = [].slice.call(dots).map(function (x) { var b = x.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; });
  var ov = 0;
  for (var i = 0; i < boxes.length; i++) for (var j = i + 1; j < boxes.length; j++) {
    var a = boxes[i], c = boxes[j];
    if (a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b) ov++;
  }
  var track = document.getElementById('tlTrack').getBoundingClientRect();
  var bands = [].slice.call(document.querySelectorAll('.tl-band')).map(function (b) {
    var r = b.getBoundingClientRect();
    return { inTrack: r.bottom <= track.bottom + 1, top: Math.round(r.top), bottom: Math.round(r.bottom) };
  });
  var rows = {};
  [].slice.call(dots).forEach(function (x) { var r = x.dataset.row || '0'; rows[r] = (rows[r] || 0) + 1; });
  return JSON.stringify({ dots: dots.length, overlappingPairs: ov, rows: rows,
    trackH: Math.round(track.height), bands: bands,
    bandsInTrack: bands.every(function (b) { return b.inTrack; }), ok: ov === 0 && bands.every(function (b) { return b.inTrack; }) });
})()`));

/* M2-8. 章节筛选：ch2 / ch3 的事件行数须与数据一致（筛选是内容视角，不是产品进度） */
for (const ch of ['ch2', 'ch3']) {
  await click('.ch-chip[data-ch="' + ch + '"]');
  await sleep(400);
  console.log('M2-8 filter ' + ch + ':', await ev(`(function(){
    var n = GS_APP.events.filter(function (e) { return e.ch === '${ch}'; }).length;
    var rows = document.querySelectorAll('#list .ev').length;
    return JSON.stringify({ expect: n, rows: rows, ok: n === rows });
  })()`));
  await click('.ch-chip[data-ch="' + ch + '"]');
  await sleep(300);
}
console.log('M2-8 filter off rows:', await ev(`document.querySelectorAll('#list .ev').length`));

/* ===== M3 验收：被捕与受审（ch4）+ 赴罗马航程（ch5） =====
 * M2 之后事件数 53 → 82、地点 22 → 30、旅程 4 → 5 段，
 * 新增断言围绕「扩容后会不会崩」：章节年代覆盖、同年顺序、章节闸门、
 * 事件↔路线命中、字段完整性、时间轴承载、章节筛选、路线站点 p 覆盖。
 * 一律用不变量，不写死数量。 */

/* M3 区段开始前先重新导航到初始态：
 *   上面的 A11 跑完了整片播放，相机停在最后一个事件（罗马）附近，
 *   此时量「初始视野」必然假失败 —— 与 A4 的教训同源。 */
await send('Page.navigate', { url: PAGE });
await sleep(6000);

console.log('M3-1 chapters:', await ev(`(function(){
  var per = {};
  GS_APP.chapters.forEach(function (c) {
    var evs = GS_APP.events.filter(function (e) { return e.ch === c.id; });
    per[c.id] = { name: c.name, years: c.years, n: evs.length,
      outOfRange: evs.filter(function (e) { return e.from < c.from || e.to > c.to; }).map(function (e) { return e.id; }) };
  });
  var live = GS_APP.chapters.filter(function (c) { return GS_APP.events.some(function (e) { return e.ch === c.id; }); });
  return JSON.stringify({ total: GS_APP.events.length, liveChapters: live.length,
    liveIds: live.map(function (c) { return c.id; }),
    per: per,
    lo: Math.min.apply(null, GS_APP.events.map(function (e) { return Math.min(e.from, e.to); })),
    hi: Math.max.apply(null, GS_APP.events.map(function (e) { return Math.max(e.from, e.to); })) });
})()`));

/* M3-2. 同年顺序不变量：AD 57 与 AD 59 是 M3 的关键年
 *   （ch3 归程与 ch4 受审同在 57；ch4 判决与 ch5 上船同在 59），
 *   跨章同年时若 tie-break 按 id 字典序，播放会乱序。 */
console.log('M3-2 same-year-order:', await ev(`(function(){
  var byYear = {};
  GS_APP.events.forEach(function (e) { (byYear[e.from] = byYear[e.from] || []).push(e.id); });
  var bad = [], years = Object.keys(byYear);
  years.forEach(function (y) {
    var fileOrder = byYear[y].join(',');
    var seqOrder = GS_APP.seq.filter(function (e) { return e.from === +y; }).map(function (e) { return e.id; }).join(',');
    if (fileOrder !== seqOrder) bad.push(y + ': ' + fileOrder + ' != ' + seqOrder);
  });
  /* 跨章同年必须保持章序：ch3 的事件必须排在 ch4 之前（AD 57） */
  var y57 = GS_APP.seq.filter(function (e) { return e.from === 57; }).map(function (e) { return e.ch; });
  var chOrder = y57.join(',');
  var chOk = chOrder.indexOf('ch3') < chOrder.indexOf('ch4');
  return JSON.stringify({ years: years.length, bad: bad, sameYearOk: bad.length === 0, ch57Order: chOrder, chOk: chOk });
})()`));

/* M3-3. 章节闸门扩展：ch4 事件只驱动 j4（受审路线），绝不动 j5（航程）；
 *   反之 ch5 事件只驱动 j5。这是 M2 修的串线 bug 在新增章节上的延续看守。 */
console.log('M3-3 chapter-gate:', await ev(`(function(){
  var api = GS.routeEngine.api;
  api.release();
  var riot = GS_APP.events.filter(function (e) { return e.id === 'ch4-temple-riot'; })[0];
  api.seek(riot, 0);
  var g = function (id) { var j = api.byId(id); return j ? j.hold : 'NO_ROUTE'; };
  var crossTalk = { j4: g('j4'), j5: g('j5'), j3: g('j3') };
  /* 正对照：ch5 事件必须能推进 j5 */
  api.release();
  var wreck = GS_APP.events.filter(function (e) { return e.id === 'ch5-shipwreck'; })[0];
  api.seek(wreck, 0);
  var j4b = api.byId('j4'), j5b = api.byId('j5');
  var pos = { j4: j4b.hold, j5: j5b.hold };
  api.release();
  return JSON.stringify({
    ch4Holds: crossTalk,
    noCrossTalk: crossTalk.j5 == null && crossTalk.j3 == null,
    ch5AdvancesJ5: pos.j5 != null && pos.j5 !== undefined,
    ch5LeavesJ4: pos.j4 == null || pos.j4 === undefined
  });
})()`));

/* M3-4. 事件点 ↔ 地点一致性（通用不变量，不硬编码地点清单）：
 *   1) 有事件的地点，其事件在地图上必须有对应的 .ev-dot；
 *   2) 每个事件都必须能找到一个事件点（挂错 place id 的表现）。
 *   注意 DOM 结构：.ev-dot 挂在 Leaflet 图标的容器上（与 .place 同级），不是 .place 的子节点。 */
console.log('M3-4 new-places:', await ev(`(function(){
  var byPlace = {};
  GS_APP.events.forEach(function (e) { (byPlace[e.place] = byPlace[e.place] || []).push(e.id); });
  var out = {}, bad = [];
  Object.keys(byPlace).forEach(function (pid) {
    var ids = byPlace[pid], n = 0;
    ids.forEach(function (id) { if (document.querySelector('.ev-dot[data-ev="' + id + '"]')) n++; });
    out[pid] = { dots: n, events: ids.length };
    if (!n || n !== ids.length) bad.push(pid);
  });
  var all = GS_APP.events.filter(function (e) { return !document.querySelector('.ev-dot[data-ev="' + e.id + '"]'); }).map(function (e) { return e.id; });
  /* 新增地点专项：M3 引入的 8 个地点必须都成为可交互地点（有 .place 核心） */
  var want = ['sidon','myra','fair-haven','malta','syracuse','rhegium','puteoli','rome'];
  var wantBad = want.filter(function (pid) {
    return !document.querySelector('.place[data-place="' + pid + '"]');
  });
  return JSON.stringify({ per: out, bad: bad, eventsWithoutDot: all, wantPlaces: want, wantMissing: wantBad,
    ok: bad.length === 0 && all.length === 0 && wantBad.length === 0 });
})()`));

/* M3-5. 字段完整性 + 媒体授权字段：每条事件都要有标题/英文名/摘要/叙事/经文；
 *   媒体必须有 credit（含授权名）+ 溯源 url。 */
console.log('M3-5 field-completeness:', await ev(`(function(){
  var missing = [], mediaBad = [], mediaN = 0;
  GS_APP.events.forEach(function (e) {
    if (!e.title || !e.en || !e.brief || !e.narrative) missing.push(e.id + ':text');
    if (!e.verses || !e.verses.length) missing.push(e.id + ':verses');
    (e.media || []).forEach(function (m) {
      mediaN++;
      if (!m.credit || !m.url) mediaBad.push(e.id + ':' + (m.title || '?'));
    });
  });
  var withMedia = GS_APP.events.filter(function (e) { return e.media && e.media.length; }).length;
  return JSON.stringify({ missing: missing, mediaEntries: mediaN, mediaBad: mediaBad, withMedia: withMedia,
    ok: missing.length === 0 && mediaBad.length === 0 });
})()`));

/* M3-6. 事件 ↔ 路线命中：每个事件在其所属章节的旅程上都要有可命中的站点。
 *   章节 → 旅程的映射从数据推导（routes[].ch），不写死。 */
console.log('M3-6 event-route-hit:', await ev(`(function(){
  var byCh = {};
  GS_APP.routes.forEach(function (r) { if (r.ch) byCh[r.ch] = r; });
  /* 尾声章（chapters.noRoute）本无旅程：事件只驱动相机与高亮，不算漏命中 */
  var noRoute = {};
  GS_APP.chapters.forEach(function (c) { if (c.noRoute) noRoute[c.id] = 1; });
  var miss = [], perCh = {}, skipped = 0;
  GS_APP.events.forEach(function (e) {
    var j = byCh[e.ch];
    if (!j) { if (noRoute[e.ch]) { skipped++; return; } miss.push(e.id + '@no-route:' + e.ch); return; }
    var hit = j.stops.some(function (s) { return s.p === e.place; });
    if (!hit) miss.push(e.id + '@' + j.id);
    perCh[e.ch] = (perCh[e.ch] || 0) + 1;
  });
  return JSON.stringify({ miss: miss, perCh: perCh, noRouteSkipped: skipped, ok: miss.length === 0 });
})()`));

/* M3-7. 时间轴承载力：82 个事件挤进 AD 46–60，圆点不得重叠、章节色带须落在轨道内 */
console.log('M3-7 timeline-load:', await ev(`(function(){
  var dots = document.querySelectorAll('.tl-dot');
  var boxes = [].slice.call(dots).map(function (x) { var b = x.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; });
  var ov = 0;
  for (var i = 0; i < boxes.length; i++) for (var j = i + 1; j < boxes.length; j++) {
    var a = boxes[i], c = boxes[j];
    if (a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b) ov++;
  }
  var track = document.getElementById('tlTrack').getBoundingClientRect();
  var bands = [].slice.call(document.querySelectorAll('.tl-band')).map(function (b) {
    var r = b.getBoundingClientRect();
    return { inTrack: r.bottom <= track.bottom + 1, top: Math.round(r.top), bottom: Math.round(r.bottom) };
  });
  var rows = {};
  [].slice.call(dots).forEach(function (x) { var r = x.dataset.row || '0'; rows[r] = (rows[r] || 0) + 1; });
  return JSON.stringify({ dots: dots.length, overlappingPairs: ov, rows: rows,
    trackH: Math.round(track.height), bandsInTrack: bands.every(function (b) { return b.inTrack; }),
    ok: ov === 0 && bands.every(function (b) { return b.inTrack; }) });
})()`));

/* M3-8. 章节筛选：ch4 / ch5 的事件行数须与数据一致 */
for (const ch of ['ch4', 'ch5']) {
  await click('.ch-chip[data-ch="' + ch + '"]');
  await sleep(400);
  console.log('M3-8 filter ' + ch + ':', await ev(`(function(){
    var n = GS_APP.events.filter(function (e) { return e.ch === '${ch}'; }).length;
    var rows = document.querySelectorAll('#list .ev').length;
    return JSON.stringify({ expect: n, rows: rows, ok: n === rows });
  })()`));
  await click('.ch-chip[data-ch="' + ch + '"]');
  await sleep(300);
}

/* M3-9. 路线站点 p 覆盖：每个旅程站点只要标了 p，就必须指向真实地点；
 *   且各章新增路线的站点数应与地理事实相符（j4 受审路线 2 站、j5 航程 9 站）。
 *   这里断言的是【不变量】：所有 p 都能解析到 places.json 中的地点。 */
console.log('M3-9 route-stops:', await ev(`(function(){
  var pids = {}; GS_APP.places.forEach(function (p) { pids[p.id] = 1; });
  var bad = [], missingP = [], wp = {};
  GS_APP.routes.forEach(function (j) {
    var n = j.stops.length, withP = 0;
    j.stops.forEach(function (s) {
      if (!s.p) { return; }
      withP++;
      if (!pids[s.p]) bad.push(j.id + ':' + s.cn + ' → ' + s.p);
    });
    if (withP < n) { missingP.push(j.id + ' ' + (n - withP) + ' 站无 p'); wp[j.id] = n - withP; }
  });
  return JSON.stringify({ badP: bad, stopsWithoutP: missingP, waypointCount: wp, ok: bad.length === 0 });
})()`));

/* M3-10. 初始视野必须容纳罗马与马耳他（新增的最西/最南端点）。
 *   M3 把路线延伸到意大利，初始视野若仍是「安纳托利亚南部—耶路撒冷」，
 *   罗马与马耳他的事件点会落在视口外（用户看不见）。 */
console.log('M3-10 initial-view:', await ev(`(function(){
  var b = GS_APP.map.getBounds(), z = GS_APP.map.getZoom();
  var want = ['rome','malta','jerusalem','caesarea'];
  var out = {};
  want.forEach(function (pid) {
    var p = GS_APP.places.filter(function (x) { return x.id === pid; })[0];
    if (!p) { out[pid] = 'NO_PLACE'; return; }
    out[pid] = b.contains(L.latLng(p.ll)) ? 'in' : 'OUT';
  });
  var all = GS_APP.places.filter(function (p) { return !p.ctx && !b.contains(L.latLng(p.ll)); }).map(function (p) { return p.cn; });
  return JSON.stringify({ zoom: z, key: out, outside: all,
    spanLat: Math.round((b.getNorth() - b.getSouth()) * 10) / 10,
    spanLng: Math.round((b.getEast() - b.getWest()) * 10) / 10,
    ok: all.length === 0 });
})()`));

/* ═══════════════════ M4：ch6 罗马被囚与尾声 + 富媒体本地化 ═══════════════════ */

/* M4-1. 章节年代覆盖（通用不变量，自动覆盖 ch6）：每个章节声明区间必须包住其全部事件，
 *   且 ch6 必须真的落在 60–67 —— 曾因 ch1 声明 46–48 却含 AD 49 事件而暴露。 */
console.log('M4-1 chapters:', await ev(`(function(){
  var bad = [];
  GS_APP.chapters.forEach(function (c) {
    var evs = GS_APP.events.filter(function (e) { return e.ch === c.id; });
    if (!evs.length) return;
    evs.forEach(function (e) {
      if (e.from < c.from || e.to > c.to) bad.push(e.id + ' ' + e.from + '-' + e.to + ' ∉ ' + c.id + ' ' + c.from + '-' + c.to);
    });
  });
  var c6 = GS_APP.chapters.filter(function (c) { return c.id === 'ch6'; })[0];
  var e6 = GS_APP.events.filter(function (e) { return e.ch === 'ch6'; });
  return JSON.stringify({ ch6: c6 ? c6.from + '-' + c6.to : 'MISSING', ch6Events: e6.length,
    ch6Span: e6.length ? Math.min.apply(null, e6.map(function(e){return e.from;})) + '-' + Math.max.apply(null, e6.map(function(e){return e.to;})) : '-',
    outOfRange: bad, ok: bad.length === 0 && !!c6 && e6.length > 0 });
})()`));

/* M4-2. ch6 字段完整性：每条事件都要有标题/英文名/摘要/叙事/经文；
 *   殉道、获释、罗马大火等「行传之外」的事件必须有 note 交代出处与争议。 */
console.log('M4-2 ch6-fields:', await ev(`(function(){
  var e6 = GS_APP.events.filter(function (e) { return e.ch === 'ch6'; });
  var miss = [], noNote = [];
  var NEED_NOTE = ['ch6-released','ch6-fire','ch6-martyrdom','ch6-pastorals','ch6-ephesians'];
  e6.forEach(function (e) {
    ['title','en','brief','narrative','place','type'].forEach(function (k) { if (!e[k]) miss.push(e.id + '.' + k); });
    if (!e.verses || !e.verses.length) miss.push(e.id + '.verses');
    if (NEED_NOTE.indexOf(e.id) >= 0 && !e.note) noNote.push(e.id);
  });
  return JSON.stringify({ n: e6.length, missing: miss, noteMissing: noNote, ok: miss.length === 0 && noNote.length === 0 });
})()`));

/* M4-3. 媒体本地化与授权：src 必须是内联 data:image/webp（单文件离线可用）；
 *   每条 media 必须有 credit（作者 · 授权）与 url（Commons 溯源页）。
 *   体积预算：内联后总字节 ≤ 4.5MB —— 超了说明压缩档位失效，详情面板会被大图拖慢。 */
console.log('M4-3 media-inline:', await ev(`(function(){
  var all = [], inline = 0, remote = 0, noCredit = [], bytes = 0, badScheme = [];
  GS_APP.events.forEach(function (e) {
    (e.media || []).forEach(function (m) {
      all.push(e.id);
      if (!m.src) { remote++; if (!m.url) badScheme.push(e.id + ':no-url'); return; }
      if (m.src.indexOf('data:image/webp;base64,') === 0) { inline++; bytes += m.src.length; }
      else if (/^assets\\/media\\//.test(m.src)) { badScheme.push(e.id + ':not-inlined'); }
      else remote++;
      if (!m.credit) noCredit.push(e.id);
      if (!m.url) badScheme.push(e.id + ':no-source');
    });
  });
  return JSON.stringify({ total: all.length, inline: inline, remote: remote,
    noCredit: noCredit, badScheme: badScheme, inlineMB: Math.round(bytes / 1048576 * 100) / 100,
    ok: inline > 0 && noCredit.length === 0 && badScheme.length === 0 && bytes <= 4.5 * 1048576 });
})()`));

/* M4-4. 媒体渲染回归（2026-10-30 修的三个缺陷）：
 *   ① openEvent 把 renderMedia 的返回值又包了一层「图 像」标题与 .d-media ——
 *      标题重复、网格套网格，图组标题被挤成网格项（截图 g6 可见「图 像｜历 史 艺 术」并排）；
 *   ② 图片必须真的解码成功（naturalWidth > 0），不能只断言 <img> 存在；
 *   ③ 署名必须可点开溯源（学术纪律要求 credit + url 都可见可核对）。 */
await ev(`GS_APP.open('ch6-two-years')`);
await sleep(1400);
console.log('M4-4 media-render:', await ev(`(function(){
  var heads = [].slice.call(document.querySelectorAll('#detail .d-h')).filter(function(h){ return h.textContent.replace(/\\s/g,'') === '图像'; });
  var imgs = [].slice.call(document.querySelectorAll('#detail .m-fig img'));
  var figLinks = document.querySelectorAll('#detail .m-fig figcaption a').length;
  var nested = document.querySelectorAll('#detail .d-media .d-media').length;
  return JSON.stringify({
    mediaHeads: heads.length, imgs: imgs.length,
    decoded: imgs.filter(function(i){ return i.complete && i.naturalWidth > 0; }).length,
    figLinks: figLinks, nestedMedia: nested,
    groups: [].slice.call(document.querySelectorAll('#detail .d-mgroup h5')).map(function(h){return h.textContent;}),
    ok: heads.length === 1 && imgs.length > 0 && imgs.every(function(i){ return i.complete && i.naturalWidth > 0; })
        && figLinks === imgs.length && nested === 0 });
})()`));
/* 截图前把图像区块滚到可视区：详情面板默认停在顶部，直接截屏只会拍到标题与经文 */
await ev(`(function(){var m=document.querySelector('#detail .d-media'); if(m) m.scrollIntoView({block:'center'});})()`);
await sleep(400);
await shot('g6_detail_media.png');

/* M4-5. 无媒体事件的降级：ch6-unbelief / ch6-pastorals 无图，必须给出说明 + 检索入口，
 *   而不是让整块静默消失（否则读者会读成「这里没有资料」）。 */
await ev(`GS_APP.open('ch6-unbelief')`);
await sleep(900);
console.log('M4-5 media-fallback:', await ev(`JSON.stringify({
  note: !!document.querySelector('#detail .d-mnote'),
  link: !!document.querySelector('#detail .m-link'),
  heads: [].slice.call(document.querySelectorAll('#detail .d-h')).filter(function(h){ return h.textContent.replace(/\\s/g,'') === '图像'; }).length,
  ok: !!document.querySelector('#detail .d-mnote') && !!document.querySelector('#detail .m-link')
})`));
await ev(`GS_APP.close()`); await sleep(300);

/* M4-6. 尾声章无旅程（chapters.ch6.noRoute）：ch6 事件不得推动任何旅程的描线。
 *   —— 这是「章节闸门」的另一面：ch4 事件不能串到 j5，ch6 更不能凭空画线。 */
console.log('M4-6 no-route-chapter:', await ev(`(function(){
  var c6 = GS_APP.chapters.filter(function (c) { return c.id === 'ch6'; })[0];
  var j6 = GS_APP.routes.filter(function (j) { return j.ch === 'ch6'; });
  GS_APP.timeline.setYear(67);
  var holds = GS_APP.routes.map(function (j) { return j.id + ':' + (GS.routeEngine.api.byId(j.id).hold == null ? 'null' : 'SET'); });
  return JSON.stringify({ declared: !!(c6 && c6.noRoute), routesForCh6: j6.length, holds: holds,
    ok: !!(c6 && c6.noRoute) && j6.length === 0 });
})()`));

/* M4-7. 章节筛选 ch6：列表行数须与数据一致（筛选是内容视角，不是产品进度） */
await click('.ch-chip[data-ch="ch6"]');
await sleep(500);
console.log('M4-7 filter ch6:', await ev(`(function(){
  var want = GS_APP.events.filter(function (e) { return e.ch === 'ch6'; }).length;
  var rows = document.querySelectorAll('#list .ev').length;
  var ids = [].slice.call(document.querySelectorAll('#list .ev')).map(function(r){ return r.getAttribute('data-ev'); });
  var foreign = ids.filter(function (id) {
    var e = GS_APP.events.filter(function (x) { return x.id === id; })[0];
    return e && e.ch !== 'ch6';
  });
  return JSON.stringify({ want: want, rows: rows, foreign: foreign, ok: rows === want && foreign.length === 0 });
})()`));
await click('.ch-chip[data-ch="ch6"]');
await sleep(400);

/* M4-8. 时间轴承载力（97 事件 / AD 46–72）：圆点两两不重叠、章节色带必须落在轨道内。
 *   AD 60 一簇 6 个事件、AD 64/66/67 各 1 个，若簇模型失效会出现叠点或色带溢出。 */
console.log('M4-8 timeline-load:', await ev(`(function(){
  var dots = [].slice.call(document.querySelectorAll('.tl-dot')).map(function (d) {
    var r = d.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2, id: d.title };
  });
  var overlaps = 0, minGap = Infinity;
  for (var i = 0; i < dots.length; i++) {
    for (var j = i + 1; j < dots.length; j++) {
      var dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < minGap) minGap = d;
      if (d < dots[i].r + dots[j].r - 0.5) overlaps++;
    }
  }
  var track = document.getElementById('tlTrack').getBoundingClientRect();
  var bandOut = [].slice.call(document.querySelectorAll('.tl-band')).filter(function (b) {
    var r = b.getBoundingClientRect();
    return r.top < track.top - 1 || r.bottom > track.bottom + 1;
  }).length;
  return JSON.stringify({ dots: dots.length, overlaps: overlaps, minGap: Math.round(minGap * 10) / 10,
    bandOut: bandOut, ok: overlaps === 0 && bandOut === 0 });
})()`));

/* ═══════════════════ M6：音效与增强动画 ═══════════════════ */

/* M6-1. 音效开关：按钮存在、aria-pressed 与 GS.audio.enabled() 一致、点击后两者同步翻转、
 *   且偏好写入 localStorage（下次打开仍是静音）。
 *   点击一律走真实输入事件（README「写交互断言的硬性要求」）。 */
var sndPos = await centerOf('#soundBtn');
var sndBefore = await ev(`JSON.stringify({ pressed: document.getElementById('soundBtn').getAttribute('aria-pressed'),
  enabled: GS_APP.audio.enabled() })`);
if (sndPos) await realClick(sndPos.x, sndPos.y);
await sleep(250);
var sndAfter = await ev(`JSON.stringify({ pressed: document.getElementById('soundBtn').getAttribute('aria-pressed'),
  enabled: GS_APP.audio.enabled(), pref: localStorage.getItem('gs.sound') })`);
if (sndPos) await realClick(sndPos.x, sndPos.y);
await sleep(250);
var sndRestored = await ev(`JSON.stringify({ pressed: document.getElementById('soundBtn').getAttribute('aria-pressed'),
  enabled: GS_APP.audio.enabled() })`);
console.log('M6-1 sound-toggle:', (function () {
  var s = { before: JSON.parse(sndBefore), after: JSON.parse(sndAfter), restored: JSON.parse(sndRestored) };
  s.ok = s.before.pressed === String(s.before.enabled)
      && s.after.pressed === String(s.after.enabled)
      && s.before.enabled !== s.after.enabled
      && s.after.pref === (s.after.enabled ? 'on' : 'off')
      && s.restored.enabled === s.before.enabled;
  return JSON.stringify(s);
})());

/* M6-2. 音色表与播放接口：合成音色齐全；关闭时 play() 必须直接返回 false（不建上下文）。 */
console.log('M6-2 audio-api:', await ev(`(function(){
  var a = GS_APP.audio;
  var cues = a.cues.slice().sort().join(',');
  var onPlay = a.play('arrive');
  a.setEnabled(false);
  var offPlay = a.play('arrive');
  a.setEnabled(true);
  return JSON.stringify({ cues: cues, onPlay: onPlay, offPlay: offPlay,
    ok: cues.indexOf('arrive') >= 0 && cues.indexOf('letter') >= 0 && cues.indexOf('chapter') >= 0
        && onPlay === true && offPlay === false });
})()`));

/* M6-3. AudioContext 只在用户手势后创建（自动播放策略）：
 *   真实点击播放按钮 → 上下文应被创建；headless 无音频设备时 state 可能是 suspended，
 *   故只断言「已创建」而不是「正在运行」。 */
await ev(`sessionStorage.removeItem('gs.guide.seen.v1'); GS_APP.state.detail && GS_APP.close();`);
var playPos = await centerOf('#playBtn');
if (playPos) await realClick(playPos.x, playPos.y);
await sleep(2200);
console.log('M6-3 audio-ctx:', await ev(`JSON.stringify({ state: GS_APP.audio.state(), playing: GS_APP.state.playing,
  ok: GS_APP.audio.state() !== 'none' })`));

/* M6-4. 抵达增强动画：播放中当前事件点须挂上 .arrive，且动画名是 arriveRing
 *   （不是复用了 dotpop —— 两者叠加时 transform 会被后者覆盖）。
 *   轮询取样：动画只有 0.85s，固定时刻截图会漏。 */
var ringSeen = null;
for (var m6 = 0; m6 < 18; m6++) {
  await sleep(200);
  ringSeen = await ev(`(function(){
    var d = document.querySelector('.ev-dot.arrive');
    if (!d) return null;
    return JSON.stringify({ cls: d.className, anim: getComputedStyle(d).animationName });
  })()`);
  if (ringSeen) break;
}
console.log('M6-4 arrive-ring:', ringSeen || 'NOT_SEEN');
await ev(`GS_APP.pause()`);
await sleep(300);
console.log('M6-4 ring-verdict:', ringSeen ? JSON.stringify({ ok: JSON.parse(ringSeen).anim === 'arriveRing' }) : JSON.stringify({ ok: false }));

/* A4. 初始视野聚焦地点密集区：全部事件地点应在视口内，且不覆盖整个地中海
 *   必须在【未播放】的初始状态下测：前面 A11 跑完整片播放后相机停在最后一个事件
 *   （耶路撒冷）附近，直接测会得到「6 处地点不在视口内」的假失败。故先重新导航。 */
await send('Page.navigate', { url: PAGE });
await sleep(6000);
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
/* A5 测量前先等布局与 --dx 过渡落定（.tl-dot 的 transform 有 .25s 过渡，
 * 在过渡中途取样会把「正在归位」读成重叠——M4 扩容后曾因此报 77 对假重叠）。 */
await sleep(600);
console.log('A5 timeline-scale:', await ev(`(function(){
  var s = [].slice.call(document.querySelectorAll('#tlScale span')).map(function(x){return x.textContent;});
  var dots = document.querySelectorAll('.tl-dot');
  var boxes = [].slice.call(dots).map(function(x){var b=x.getBoundingClientRect();return {l:b.left,r:b.right,t:b.top,b:b.bottom};});
  var ov = 0, sample = [];
  for (var i=0;i<boxes.length;i++) for (var j=i+1;j<boxes.length;j++) {
    var a=boxes[i], c=boxes[j];
    if (a.l<c.r && c.l<a.r && a.t<c.b && c.t<a.b) { ov++; if (sample.length < 3) sample.push([Math.round(a.l),Math.round(a.t),Math.round(c.l),Math.round(c.t)]); }
  }
  var track = document.getElementById('tlTrack').getBoundingClientRect();
  var bands = [].slice.call(document.querySelectorAll('.tl-band')).map(function(b){var r=b.getBoundingClientRect();return {inTrack: r.bottom <= track.bottom + 1, clickable: getComputedStyle(b).pointerEvents !== 'none'};});
  var rows = {};
  [].slice.call(dots).forEach(function(x){ var r = x.dataset.row || '0'; rows[r] = (rows[r]||0)+1; });
  return JSON.stringify({ scale: s, dots: dots.length, overlappingPairs: ov, sample: sample, rows: rows,
    bandsInTrack: bands.every(function(b){return b.inTrack;}), bandsClickable: bands.every(function(b){return b.clickable;}) });
})()`));

/* A6. 标题命名一致性回归：标题不应再带地点前缀（地点已由侧栏标签承载），
 *     且不得出现「安提阿」这种在有两个安提阿时构成歧义的省略形式。
 *     注：判定「地点前缀」必须比对【地点名】，不能退化为「含冒号即违规」——
 *     M3 的「分诉：十二天」是主题:副题的合法写法，被误判过一次。 */
console.log('A6 title-convention:', await ev(`(function(){
  var bad = [];
  GS_APP.events.forEach(function (e) {
    var p = GS_APP.places.filter(function (x) { return x.id === e.place; })[0];
    var cn = p ? p.cn : '';
    if (cn && e.title.indexOf(cn + '：') === 0) bad.push(e.id + ':前缀=' + e.title);
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
    /* M4 起 credit 由 localize-media.mjs 依 Commons 元数据生成，格式为「作者 · 授权」
       （不再追加 · Wikimedia Commons —— 溯源已由 url 承担），故按「取最后一段」解析。 */
    var segs = String(e.media[0].credit).split(DOT);
    if (segs.length >= 2) {
      var name = segs[segs.length - 1].replace(/^\s+|\s+$/g, '');
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

/* D3. 镜头静止（2026-10-30 构图轮）：播放全程不得移动、不得缩放。
 * 演进：M1 每帧 setView 跟车（抖动）→ 2026-10-27 改 _rawPanBy 纯平移跟车（单档缩放）→
 * 本轮按需求「线条播放时镜头不动，保持稳定感」彻底取消跟车。
 * 断言方式：取一个固定参考点（耶路撒冷），每 200ms 采样它在容器内的像素坐标——
 * 镜头一旦有任何平移/缩放，这个坐标必然变化；全部相等 ⇒ 画面完全静止。
 * 同时要求描线仍在推进（routeGrew）、且没有 moveend 风暴。 */
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
    var c = map.getCenter();
    var ref = map.latLngToContainerPoint(L.latLng(31.78, 35.23));   /* 耶路撒冷：固定参考点 */
    return { lat: c.lat, lng: c.lng, z: map.getZoom(),
      rx: Math.round(ref.x * 100) / 100, ry: Math.round(ref.y * 100) / 100,
      pts: j1.base.getLatLngs().length };
  })()`));
  await sleep(200);
}
var evStorm = await ev(`JSON.stringify(window.__ev)`);
var valid = syncSamples.filter(Boolean);
var z0 = valid[0].z;
var drift = 0;
valid.forEach(function (v) {
  drift = Math.max(drift, Math.abs(v.rx - valid[0].rx), Math.abs(v.ry - valid[0].ry));
});
var centerMoved = valid.some(function (v) {
  return Math.abs(v.lat - valid[0].lat) > 1e-9 || Math.abs(v.lng - valid[0].lng) > 1e-9;
});
var zoomChanged = valid.some(function (v) { return v.z !== z0; });
console.log('D3 samples:', JSON.stringify(valid));
console.log('D3 verdict:', JSON.stringify({
  samples: valid.length,
  zoom: z0,
  maxRefDriftPx: Math.round(drift * 100) / 100,
  centerMoved: centerMoved,
  zoomChanged: zoomChanged,
  routeGrew: valid[valid.length - 1].pts > valid[0].pts,
  eventStorm: evStorm,
  moveendInWindowOK: (function () { var e = JSON.parse(evStorm); return e.moveend <= 2; })(),
  ok: drift < 0.01 && !centerMoved && !zoomChanged &&
      valid[valid.length - 1].pts > valid[0].pts &&
      JSON.parse(evStorm).moveend <= 2
}));

/* D4. 到达才弹出（需求1）：行程途中不得出现事件卡 / 当前事件高亮 / 地点点亮，
 * 路线抵达地点后才允许出现。旧实现在行程起点即 showCard + lit。
 * 时序（1×）：开播落位 ~0.65s → 描线 700–4200ms → 到达（卡片+点亮，无推近缩放，镜头稳定）。 */
await ev(`window.GS_APP.pause()`); await sleep(400);
var d4zoom0 = await ev(`GS_APP.map.getZoom()`);   /* 开播前缩放：播放期镜头静止 ⇒ 到达后必须与它一致 */
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
await sleep(1500);   /* 等到达效果（卡片/点亮）落定 */
/* 注意：必须 JSON.parse —— 上一版把 ev() 返回的【字符串】直接当对象用，
 * d4after.card 恒为 undefined，于是 ok 变成 undefined 被 JSON.stringify 静默丢弃，
 * 这条断言其实从未生效过（打印里只有 after、没有 ok）。 */
var d4after = JSON.parse(await ev(`JSON.stringify({
  card: document.getElementById('now').classList.contains('show'),
  cardT: (document.querySelector('.card-t')||{}).textContent || '',
  cardP: (document.querySelector('.card-p')||{}).textContent || '',
  glow: document.querySelectorAll('.fx-glow').length,
  zoom: GS_APP.map.getZoom(),
  curDots: document.querySelectorAll('.ev-dot.cur').length })`));
var d4ok = !!(d4arrived && !d4cardEarly && d4after.card && d4after.glow >= 1 &&
  d4after.curDots === 1 && d4after.zoom === d4zoom0);
console.log('D4 arrive-gating: mid=' + d4mid);
console.log('D4 verdict:', JSON.stringify({ arrived: d4arrived, cardBeforeArrival: d4cardEarly,
  zoomBefore: d4zoom0, after: d4after, ok: d4ok }));

/* D4b. 播放中环收敛（2026-10-27）：body.playing 时全图呼吸环应静息（animation:none），
 * 避免跟车平移 × 全图 28 环持续扩散的双重动态（用户反馈的「闪」）；暂停后恢复呼吸。 */
console.log('D4b ring-while-playing:', await ev(`(function(){
  var r = document.querySelector('.place .ring');
  var cs = r ? getComputedStyle(r) : null;
  return JSON.stringify({ playing: document.body.classList.contains('playing'),
    anim: cs ? cs.animationName : 'none',
    opacity: cs ? parseFloat(cs.opacity) : -1,
    ok: !!cs && cs.animationName === 'none' });
})()`));

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

/* D6. 地点呼吸频率（需求「呼吸环太急，像抽搐」）：双环错相半周期、周期 ≥ 8s。
 * 旧实现 5.6s / 错相 2.8s + 起步极快的 cubic-bezier(.32,.52,.42,1)：每 2.8s 就有一圈
 * 「啪」地弹出去，读作抽搐。现为 9s / 4.5s，缓动改成两头慢的 in-out。
 * 注意：headless Chrome 默认 prefers-reduced-motion:reduce，全局动画被
 * prefers-reduced-motion 媒体查询压成 .01ms——必须先模拟 no-preference 再测计算值。 */
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
/* 环是「播放中静息、暂停恢复」的（见 D4b），呼吸动画须在非播放态断言 */
await ev(`window.GS_APP.pause()`); await sleep(300);
console.log('D6 breathing:', await ev(`(function(){
  var rings = document.querySelectorAll('.place[data-place="paphos"] .ring');
  var cs = rings.length ? getComputedStyle(rings[0]) : null;
  var dur = cs ? parseFloat(cs.animationDuration) : 0;
  var d2 = rings.length > 1 ? parseFloat(getComputedStyle(rings[1]).animationDelay) : -1;
  return JSON.stringify({ rings: rings.length,
    name: cs ? cs.animationName : 'none',
    duration: cs ? cs.animationDuration : 'none',
    ring2Delay: rings.length > 1 ? getComputedStyle(rings[1]).animationDelay : 'none',
    halfCycleOffset: Math.abs(d2 - dur / 2) < 0.05,
    ok: rings.length === 2 && !!cs && cs.animationName === 'breathe' && dur >= 8 && Math.abs(d2 - dur / 2) < 0.05 });
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
await sleep(6000);
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
await ev(`window.GS_APP.state.speed = 24; window.GS_APP.timeline.setYear(46); window.GS_APP.play();`);
for (var q = 0; q < 150; q++) {
  await sleep(400);
  if (!(await ev(`window.GS_APP.state.playing`))) break;
}
await sleep(800);
console.log('I2 play-end storyEnd:', await ev(`document.body.classList.contains('story-end')`),
  '| dots hidden:', await ev(`(function(){var d=document.querySelector('.ev-dot.on');return d?getComputedStyle(d).opacity:'no-visible-dot';})()`));
await ev(`window.GS_APP.timeline.setYear(50)`);
await sleep(400);
console.log('I2 after-interaction storyEnd:', await ev(`document.body.classList.contains('story-end')`));

/* K. romans 三项高启发：位置三级置信 / 可审计三件套 / 复合饼图标记 */
/* K1. precision：6 处 approximate 地点详情显示「近似 · 争议」；known 地点显示「精确」 */
console.log('K1 precision:', await ev(`(function(){
  var app = window.GS_APP;
  var approx = app.places.filter(function(p){ return p.precision && p.precision !== 'known'; });
  function precRow() {
    var meta = document.querySelector('#detail .d-meta');
    if (!meta) return null;
    var spans = meta.querySelectorAll('.m-row');
    for (var i=0;i<spans.length;i++){
      if (spans[i].querySelector('span').textContent === '定位精度') return spans[i].querySelector('b').textContent;
    }
    return null;
  }
  var res = { approx: approx.map(function(p){return p.id;}), rows: [] };
  approx.forEach(function(p){
    app.openPlace(p.id);
    res.rows.push({ id: p.id, row: precRow() });
  });
  app.openPlace('corinth');
  res.known = precRow();
  res.ok = res.rows.length === 6 &&
    res.rows.every(function(r){ return r.row && r.row.indexOf('近似') === 0; }) &&
    res.known && res.known.indexOf('精确') === 0;
  return JSON.stringify(res);
})()`));
/* K2. 审计视图：判断规则 + 排除项渲染；入口按钮存在；返回列表可恢复 */
console.log('K2 audit:', await ev(`(function(){
  var app = window.GS_APP;
  var link = document.getElementById('auditBtn');
  var linkVisible = !!link && link.getBoundingClientRect().width > 0;
  app.openAudit();
  var rulesN = document.querySelectorAll('#detail .d-meta .m-row').length;
  var exN = document.querySelectorAll('#detail .audit-item').length;
  var title = document.querySelector('#detail .d-cn').textContent;
  var listHidden = document.getElementById('list').classList.contains('hidden');
  app.close();
  var listRestored = !document.getElementById('list').classList.contains('hidden') &&
                     document.getElementById('detail').classList.contains('hidden');
  return JSON.stringify({ linkVisible: linkVisible, rulesN: rulesN, exN: exN,
    expectedRules: app.audit.rules.length, expectedEx: app.audit.excluded.length,
    title: title, listHidden: listHidden, listRestored: listRestored,
    ok: linkVisible && rulesN === app.audit.rules.length && exN === app.audit.excluded.length &&
        title === '判断规则' && listRestored });
})()`));
/* K3. 复合饼图：每个交互地点核心含 SVG 饼图；直径随事件数增长；多类型地点多扇区 */
console.log('K3 pie:', await ev(`(function(){
  var app = window.GS_APP;
  var places = app.places.filter(function(p){ return !p.ctx; });
  var n = document.querySelectorAll('.place .core .pie').length;
  function pieOf(id){ return document.querySelector('.place[data-place="' + id + '"] .core .pie'); }
  var jer = pieOf('jerusalem'), pap = pieOf('paphos');
  var cor = pieOf('corinth');
  var jerPaths = jer ? jer.querySelectorAll('path').length : 0;
  var corPaths = cor ? cor.querySelectorAll('path').length : 0;
  var jerW = jer ? parseInt(jer.getAttribute('width'),10) : 0;
  var papW = pap ? parseInt(pap.getAttribute('width'),10) : 0;
  return JSON.stringify({ pieCount: n, places: places.length,
    jerusalemW: jerW, paphosW: papW, jerusalemPaths: jerPaths, corinthPaths: corPaths,
    ok: n === places.length && jerW > papW && jerPaths >= 3 && corPaths >= 3 });
})()`));

/* J. 移动端：地图整屏 + 浮层，事件抽屉默认收起（把整块屏幕让给地图）。
 * 旧版是「地图 32dvh + 下方列表」的两段式，手机上一半屏幕给了列表。 */
await ev(`sessionStorage.removeItem('gs.guide.seen.v1')`);
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: PAGE });
await sleep(6200);
console.log('J mobile full-bleed:', await ev(`(function(){
  var m = document.getElementById('map').getBoundingClientRect();
  var chips = document.querySelector('.chips').getBoundingClientRect();
  var pb = document.getElementById('playBtn').getBoundingClientRect();
  var sb = document.querySelector('.sidebar').getBoundingClientRect();
  function ov(a,b){ return Math.round(Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))); }
  return JSON.stringify({
    mapW: Math.round(m.width), mapH: Math.round(m.height),
    fullBleed: Math.round(m.width) === innerWidth && Math.round(m.height) === innerHeight,
    drawerOff: document.body.classList.contains('panel-off'),
    chipsInViewport: chips.top >= 0 && chips.bottom <= innerHeight && chips.right <= innerWidth,
    playBtnInViewport: pb.top >= 0 && pb.bottom <= innerHeight,
    playHint: document.getElementById('playBtn').classList.contains('hint'),
    drawerOverPlayBtn: ov(sb, pb),
    ok: Math.round(m.width) === innerWidth && Math.round(m.height) === innerHeight &&
        document.body.classList.contains('panel-off') && pb.bottom <= innerHeight && ov(sb, pb) === 0
  });
})()`));
/* J2. 拉起事件抽屉后：列表区仍须容纳 ≥3 行事件，且抽屉不能吃掉整块地图。
 * （旧断言测的是「两段式布局下列表被压扁」；抽屉化之后要测的是「抽屉展开时列表可用」） */
var tog = await centerOf('#panelToggle');
console.log('J2 toggle-found:', tog ? 'yes' : 'MISSING');
if (tog) { await realClick(tog.x, tog.y); await sleep(700); }
console.log('J2 mobile-drawer:', await ev(`(function(){
  var scEl = document.getElementById('scroll');
  var sc = scEl.getBoundingClientRect();
  var cb = document.getElementById('chapterbar').getBoundingClientRect();
  var rows = [].slice.call(document.querySelectorAll('#list .ev'));
  var rowH = rows.length ? rows[0].getBoundingClientRect().height : 0;
  var usable = sc.height - cb.height;
  var sb = document.querySelector('.sidebar').getBoundingClientRect();
  return JSON.stringify({
    drawerOpen: !document.body.classList.contains('panel-off'),
    scrollH: Math.round(sc.height),
    chapterbarH: Math.round(cb.height),
    usableForRows: Math.round(usable),
    visibleRows: Math.max(0, Math.floor(usable / Math.max(1, rowH))),
    mapAboveDrawer: Math.round(sb.top),
    listRows: rows.length,
    scrollable: scEl.scrollHeight > scEl.clientHeight + 1,
    ok: !document.body.classList.contains('panel-off') && sc.height >= 88 &&
        usable / Math.max(1, rowH) >= 3 && sb.top >= 180
  });
})()`));
await shot('f5_mobile.png');

console.log('JS ERRORS:', errors.length ? errors.join(' | ') : 'NONE');
ws.close();
process.exit(0);
