/* A11 交互诊断：播完 → 恢复图标 → 点开详情
 *
 * 用途：M3 验收中 A11 出现 recovered:true 但 detailOpen:false，
 *   说明「恢复图标」这一步成功了，「紧接着点开详情」这一步没命中。
 *   本脚本逐步打印中间态（命中元素、pointer-events、详情面板状态），
 *   定位到底是坐标偏了、命中了别的元素、还是事件被 pause 打断。
 *
 * 用法：scripts/run-cdp.ps1 scripts/diag-a11.mjs
 */
const PAGE = 'file:///' + process.cwd().replace(/\\/g, '/') + '/geo-story.html';

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push('EXC: ' + String(m.params.exceptionDetails.text || '').slice(0, 200));
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
await sleep(4500);

async function ev(x) {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true });
  return r.exceptionDetails ? 'ERR:' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails).slice(0, 300) : r.result.value;
}
async function realClick(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await sleep(60);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

/* 快速播完全片 */
await ev(`window.GS_APP.state.speed = 24; window.GS_APP.timeline.setYear(46); window.GS_APP.play();`);
for (let w = 0; w < 160; w++) { await sleep(400); if (!(await ev(`window.GS_APP.state.playing`))) break; }
await sleep(900);

console.log('story-end:', await ev(`document.body.classList.contains('story-end')`));

/* 取地图容器内的一个已点亮标记 */
const pick = await ev(`(function(){
  var mr = document.getElementById('map').getBoundingClientRect();
  var dots = [].slice.call(document.querySelectorAll('.ev-dot.on'));
  var inMap = dots.filter(function (d) {
    var r = d.getBoundingClientRect();
    return r.left >= mr.left && r.top >= mr.top && r.right <= mr.right && r.bottom <= mr.bottom
        && r.width > 0 && r.height > 0;
  });
  var d = inMap[0];
  if (!d) return 'NONE';
  var r = d.getBoundingClientRect();
  return JSON.stringify({
    id: d.getAttribute('data-ev'),
    cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2),
    w: Math.round(r.width), h: Math.round(r.height),
    pe: getComputedStyle(d).pointerEvents,
    op: getComputedStyle(d).opacity,
    inMapCount: inMap.length,
    mapRect: { l: Math.round(mr.left), t: Math.round(mr.top), r: Math.round(mr.right), b: Math.round(mr.bottom) }
  });
})()`);
console.log('picked:', pick);
if (pick === 'NONE') { console.log('无可用标记'); ws.close(); process.exit(0); }
const p = JSON.parse(pick);

/* 第一次点击：恢复图标 */
await realClick(p.cx, p.cy);
await sleep(700);
console.log('after click#1:', await ev(`(function(){
  var d = document.querySelector('.ev-dot[data-ev="${p.id}"]');
  return JSON.stringify({
    storyEnd: document.body.classList.contains('story-end'),
    detailOpen: !document.getElementById('detail').classList.contains('hidden'),
    dotPE: d ? getComputedStyle(d).pointerEvents : 'GONE',
    dotOpacity: d ? getComputedStyle(d).opacity : 'GONE',
    dotRect: d ? (function(){var r=d.getBoundingClientRect();return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2);})() : 'GONE',
    elemAtPoint: (function(){var e=document.elementFromPoint(${p.cx},${p.cy});return e? (e.className||e.tagName) : 'null';})()
  });
})()`));

/* 第二次点击：应点开详情 */
await realClick(p.cx, p.cy);
await sleep(900);
console.log('after click#2:', await ev(`(function(){
  var d = document.querySelector('.ev-dot[data-ev="${p.id}"]');
  return JSON.stringify({
    storyEnd: document.body.classList.contains('story-end'),
    detailOpen: !document.getElementById('detail').classList.contains('hidden'),
    title: (document.querySelector('.d-cn')||{}).textContent,
    dotPE: d ? getComputedStyle(d).pointerEvents : 'GONE',
    elemAtPoint: (function(){var e=document.elementFromPoint(${p.cx},${p.cy});return e? (e.className||e.tagName) : 'null';})()
  });
})()`));

console.log('JS ERRORS:', errors.length ? errors.join(' | ') : 'NONE');
ws.close();
process.exit(0);
