/* M9 视觉与交互验证：地图最大化 / 时间轴 hover / 地点浮窗 */
import fs from 'node:fs';
const PAGE = 'file:///' + process.cwd().replace(/\\/g, '/') + '/geo-story.html';
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
const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true }); return r.exceptionDetails ? 'ERR:' + JSON.stringify(r.exceptionDetails).slice(0, 300) : r.result.value; };
const shot = async (n) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(n, Buffer.from(s.data, 'base64')); console.log('shot:', n); };
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: type === 'mousePressed' ? 1 : 0, buttons: type === 'mousePressed' ? 1 : 0 });

await new Promise(r => { ws.onopen = r; });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE });
await sleep(7800);

console.log('1) 首屏:', await ev(`(function(){
  var m=document.getElementById('map').getBoundingClientRect();
  var tl=document.querySelector('.tl').getBoundingClientRect();
  var sb=document.querySelector('.sidebar');
  var hot=document.getElementById('tlHot').getBoundingClientRect();
  var tile=document.querySelector('.leaflet-tile-pane');
  var tr=tile?tile.getBoundingClientRect():null;
  return JSON.stringify({
    mapW:Math.round(m.width),mapH:Math.round(m.height),
    leafletSize:GS_APP.map.getSize(),
    tileRect:tr?{l:Math.round(tr.left),t:Math.round(tr.top),w:Math.round(tr.width),h:Math.round(tr.height)}:null,
    fullBleed:Math.round(m.width)===innerWidth&&Math.round(m.height)===innerHeight,
    panelOff:document.body.classList.contains('panel-off'),
    sidebarVisible:getComputedStyle(sb).opacity,
    tlOpen:document.body.classList.contains('tl-open'),
    tlTop:Math.round(tl.top),tlVisibleH:Math.round(innerHeight-tl.top),
    hotH:Math.round(hot.height),
    insets:GS_APP.insets(),
    probe: (function(){
      var out=[];
      [1200,1340,1400,1430].forEach(function(x){
        var e=document.elementFromPoint(x,300);
        out.push(x+':'+(e?e.tagName+'.'+(e.className||'').toString().split(' ').slice(0,2).join('.'):'null'));
      });
      var svg=document.querySelector('.leaflet-overlay-pane svg');
      return {hits:out, svgW:svg?Math.round(svg.getBoundingClientRect().width):null,
              svgH:svg?Math.round(svg.getBoundingClientRect().height):null};
    })()
  });
})()`));
await shot('m9_boot.png');

/* hover 底部热区 → 时间轴展开 */
await mouse('mouseMoved', 720, 892);
await sleep(500);
console.log('2) hover 热区:', await ev(`(function(){
  var tl=document.querySelector('.tl').getBoundingClientRect();
  return JSON.stringify({open:document.body.classList.contains('tl-open'),tlTop:Math.round(tl.top),tlH:Math.round(tl.height)});
})()`));
await shot('m9_tl_open.png');

/* 点一个地点核心 → 浮窗 */
const core = JSON.parse(await ev(`(function(){
  var p=document.querySelector('.place[data-place="rome"]');
  if(!p) return JSON.stringify({x:null});
  var r=p.closest('.place-icon').getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)});
})()`));
console.log('3) 罗马核心:', JSON.stringify(core));
if (core.x) {
  await mouse('mouseMoved', core.x, core.y);
  await mouse('mousePressed', core.x, core.y);
  await mouse('mouseReleased', core.x, core.y);
  await sleep(700);
  console.log('3) 地点浮窗:', await ev(`(function(){
    var g=document.getElementById('geoCard');
    var r=g.getBoundingClientRect();
    var body=document.getElementById('gcBody');
    return JSON.stringify({hidden:g.hidden,shown:g.classList.contains('show'),
      w:Math.round(r.width),h:Math.round(r.height),l:Math.round(r.left),t:Math.round(r.top),
      inViewport:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,
      title:(body.querySelector('.d-cn')||{}).textContent,
      evRows:body.querySelectorAll('.gc-ev').length,
      detail:GS_APP.state.detail});
  })()`));
  await shot('m9_place_card.png');
}

console.log('JS ERRORS:', errs.length ? errs.slice(0, 3).join(' | ') : 'NONE');
ws.close(); process.exit(0);
