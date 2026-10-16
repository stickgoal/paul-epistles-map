/* 终验：标签避位 / 图层开关 / 旅程重播 / 播放 / 移动端 / 控制台错误 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file:///' + path.join(here, 'paul-epistles-map.html').replace(/\\/g, '/');
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id).res(m.result); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' '));
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + JSON.stringify(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).slice(0, 160));
};
function send(method, params) { return new Promise((res) => { const i = ++id; pending.set(i, { res }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); }); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const URL = fileUrl;
const OUT = here + path.sep;
async function ev(x) { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true }); return r.exceptionDetails ? 'ERR:' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails).slice(0, 140) : r.result.value; }
async function shot(n) { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(OUT + n, Buffer.from(s.data, 'base64')); console.log('shot:', n); }
async function click(sel) {
  const pos = await ev(`(function(){var e=document.querySelector('${sel}');if(!e)return 'NONE';var r=e.getBoundingClientRect();return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2);})()`);
  if (pos === 'NONE') { console.log('MISSING:', sel); return false; }
  const [x, y] = pos.split(',').map(Number);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  return true;
}

await new Promise((res) => { ws.onopen = res; });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL });
await sleep(4700);
await shot('f1_intro_end.png');

/* A. 标签与 chip 零碰撞 */
console.log('A overlaps:', await ev(`(function(){var out=[];document.querySelectorAll('.leaflet-tooltip').forEach(function(t){var r=t.getBoundingClientRect();var ov=[];document.querySelectorAll('.city .pin, .city .core').forEach(function(p){var pr=p.getBoundingClientRect();if(!(pr.right<r.left||pr.left>r.right||pr.bottom<r.top||pr.top>r.bottom))ov.push(p.textContent||'core');});out.push(JSON.stringify(t.textContent.slice(0,6))+':'+(ov.length?ov.join('+'):'ok'));});return out.join(' ');})()`));

/* B. 图层开关：关路线 → 路线与光点应消失；再开应恢复 */
await click('.chip[data-layer="routes"]');
await sleep(300);
console.log('B routes-off paths:', await ev(`document.querySelectorAll('.leaflet-overlay-pane path').length`), 'heads:', await ev(`document.querySelectorAll('.rh-ic').length`));
await click('.chip[data-layer="routes"]');
await sleep(300);
console.log('B routes-on  paths:', await ev(`document.querySelectorAll('.leaflet-overlay-pane path').length`), 'heads:', await ev(`document.querySelectorAll('.rh-ic').length`));

/* C. 图例点击 → 旅程重播动画 */
await click('.lg-j[data-j="j4"]');
await sleep(2600);
console.log('C travel dot:', await ev(`(function(){var t=document.querySelector('.travel-ic');return t?Math.round(t.getBoundingClientRect().x)+','+Math.round(t.getBoundingClientRect().y):'none';})()`), 'toast:', await ev(`document.getElementById('now').classList.contains('show')?'show':'hide'`));
await shot('f2_journey_replay.png');

/* D. 播放 6 秒：年代递进 + 路线联动 */
await click('#playBtn');
await sleep(6000);
console.log('D play:', await ev(`document.getElementById('tlYear').textContent`), 'pinsOn:', await ev(`document.querySelectorAll('.city .pin.on').length`), 'rows:', await ev(`Array.from(document.querySelectorAll('.lg-j')).map(function(r){return r.classList.contains('on')?'ON':r.classList.contains('past')?'p':r.classList.contains('future')?'f':'?';}).join('')`));
await shot('f3_playing.png');
await click('#playBtn');

/* E. 重置视图 */
await click('#resetBtn');
await sleep(1200);
console.log('E reset:', await ev(`document.getElementById('tlYear').textContent`), 'detail:', await ev(`document.getElementById('detail').classList.contains('hidden')?'hidden':'open'`), 'lit:', await ev(`document.querySelectorAll('.city.lit').length`));

/* F. hash 深链 #rom */
await send('Page.navigate', { url: URL + '#rom' });
await sleep(5200);
console.log('F #rom detail:', await ev(`document.getElementById('detail').classList.contains('hidden')?'HIDDEN':document.querySelector('.d-cn').textContent`), 'lit:', await ev(`document.querySelector('.city.lit')?document.querySelector('.city.lit').getAttribute('data-city'):'none'`));
await shot('f4_hash_rom.png');

/* G. 移动端 */
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL });
await sleep(5200);
await shot('f5_mobile.png');
console.log('G mobile mapH:', await ev(`Math.round(document.getElementById('map').getBoundingClientRect().height)`));

console.log('JS ERRORS:', errors.length ? errors.join(' | ') : 'NONE');
ws.close(); process.exit(0);
