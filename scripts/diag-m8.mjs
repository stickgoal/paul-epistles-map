/* M8 标签密度三项验收（临时探针，可并入 verify.mjs）
 *
 * 验证：
 *   1) 首屏只显示 L1 主干城市（6 个），标签之间零重叠
 *   2) 悬停被隐去的地点核心 → 它的标签临时出现；移开 → 再次隐藏
 *   3) 播放期地名收敛：非当前章节的标签挂上「压暗」态，暂停后全部恢复
 *
 * 用法：scripts/run-cdp.ps1 scripts/diag-m8.mjs
 */
const PAGE = 'file:///' + process.cwd().replace(/\\/g, '/') + '/geo-story.html';

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }
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
function send(method, params) {
  return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function ev(x) {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true });
  return r.exceptionDetails ? 'ERR:' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails).slice(0, 300) : r.result.value;
}
async function mouse(type, x, y) {
  await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: type === 'mousePressed' ? 1 : 0, buttons: type === 'mousePressed' ? 1 : 0 });
}

await new Promise((res) => { ws.onopen = res; });
await send('Page.enable');
await send('Runtime.enable');
/* headless Chrome 默认 prefers-reduced-motion: reduce，会让过渡/动画被裁掉 */
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE });
await sleep(7800);

/* ---------- 1. 首屏密度 ---------- */
const home = JSON.parse(await ev(`(function(){
  var all=[].slice.call(document.querySelectorAll('.leaflet-tooltip.city-tip'));
  var vis=all.filter(function(t){return t.style.display!=='none';});
  var bx=vis.map(function(t){var r=t.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom};});
  var pairs=0;
  for(var i=0;i<bx.length;i++)for(var j=i+1;j<bx.length;j++){
    var ox=Math.min(bx[i].r,bx[j].r)-Math.max(bx[i].l,bx[j].l);
    var oy=Math.min(bx[i].b,bx[j].b)-Math.max(bx[i].t,bx[j].t);
    if(ox>0&&oy>0)pairs++;
  }
  return JSON.stringify({stats:GS_APP.labelStats(),visible:vis.length,dom:all.length,overlapPairs:pairs});
})()`));
console.log('1) 首屏:', JSON.stringify(home));

/* ---------- 2. 悬停被隐去的地点 ---------- */
/* 选一个首屏被隐藏的 L2 地点：米利都（3 事件）。它的核心点始终可见（地点核心不参与分级）。 */
const target = JSON.parse(await ev(`(function(){
  var ids=['miletus','athens','troas','tyre','sidon'];
  for(var i=0;i<ids.length;i++){
    var p=document.querySelector('.place[data-place="'+ids[i]+'"]');
    if(!p) continue;
    var tip=document.querySelector('.leaflet-tooltip.city-tip[data-place="'+ids[i]+'"]');
    var hidden=!tip||tip.style.display==='none';
    var r=p.closest('.place-icon').getBoundingClientRect();
    if(hidden&&r.width>0) return JSON.stringify({id:ids[i],x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)});
  }
  return JSON.stringify({id:null});
})()`));
console.log('2) 目标（首屏隐藏的地点）:', JSON.stringify(target));

let hoverOk = false, hoverBackOk = false;
if (target.id) {
  await mouse('mouseMoved', target.x, target.y);
  await sleep(420);
  hoverOk = (await ev(`(function(){
    var t=document.querySelector('.leaflet-tooltip.city-tip[data-place="${target.id}"]');
    return !!(t && t.style.display!=='none');
  })()`)) === true;
  /* 移到空白处（地图右上，远离任何地点） */
  await mouse('mouseMoved', 1400, 120);
  await sleep(420);
  hoverBackOk = (await ev(`(function(){
    var t=document.querySelector('.leaflet-tooltip.city-tip[data-place="${target.id}"]');
    return !!(t && t.style.display==='none');
  })()`)) === true;
}
console.log('2) 悬停恢复:', hoverOk, ' 移开复隐:', hoverBackOk);

/* ---------- 3. 播放期地名收敛 ---------- */
await ev(`GS_APP.play()`);
await sleep(3000);
const during = JSON.parse(await ev(`(function(){
  var all=[].slice.call(document.querySelectorAll('.leaflet-tooltip.city-tip'));
  var vis=all.filter(function(t){return t.style.display!=='none';});
  var cur=vis.filter(function(t){return t.classList.contains('cur-ch');});
  var dim=vis.filter(function(t){return !t.classList.contains('cur-ch');});
  return JSON.stringify({playing:document.body.classList.contains('playing'),
    visible:vis.length,curCh:cur.length,dim:dim.length,
    dimOpacity:dim.length?getComputedStyle(dim[0]).opacity:null});
})()`));
console.log('3) 播放中:', JSON.stringify(during));
await ev(`GS_APP.pause()`);
await sleep(600);
const after = JSON.parse(await ev(`(function(){
  var vis=[].slice.call(document.querySelectorAll('.leaflet-tooltip.city-tip')).filter(function(t){return t.style.display!=='none';});
  return JSON.stringify({playing:document.body.classList.contains('playing'),
    visible:vis.length,curCh:vis.filter(function(t){return t.classList.contains('cur-ch');}).length});
})()`));
console.log('3) 暂停后:', JSON.stringify(after));

console.log('JS ERRORS:', errs.length ? errs.join(' | ') : 'NONE');
const ok = home.visible === 6 && home.overlapPairs === 0 &&
           (!target.id || (hoverOk && hoverBackOk)) &&
           during.playing && during.curCh > 0 && during.dim > 0 && Number(during.dimOpacity) < 0.3 &&
           !after.playing && after.curCh === after.visible;
console.log('VERDICT:', ok ? 'PASS' : 'FAIL');
ws.close();
process.exit(ok ? 0 : 1);
