/* 终验脚本：点击罗马书 pin，验证详情视图 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + path.join(here, 'paul-epistles-map.html').replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1:');
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id).res(m.result); pending.delete(m.id); }
};
function send(method, params) {
  return new Promise((res) => { const i = ++id; pending.set(i, { res }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await new Promise((res) => { ws.onopen = res; });
await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: PAGE });
await sleep(4500);
const pos = await send('Runtime.evaluate', {
  expression: '(function(){var p=document.querySelector(".pin[data-ep=rom]");var r=p.getBoundingClientRect();return Math.round(r.x+r.width/2)+","+Math.round(r.y+r.height/2);})()',
  returnByValue: true
});
const xy = pos.result.value.split(',');
console.log('rom pin at:', pos.result.value);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: +xy[0], y: +xy[1], button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: +xy[0], y: +xy[1], button: 'left', clickCount: 1 });
await sleep(2500);
const expr = [
  '(function(){',
  'var d=document.getElementById("detail");',
  'var t=document.querySelector(".d-cn");',
  'var v=document.querySelector(".d-verse p");',
  'var n=document.querySelector(".d-note");',
  'var meta=document.querySelector(".d-meta");',
  'return (d.classList.contains("hidden")?"HIDDEN":(t?t.textContent:"?"))+" | verse="+(v?v.textContent.slice(0,22):"none")+" | note="+(n?"yes":"no")+" | meta="+(meta?meta.textContent.slice(0,40):"none");',
  '})()'
].join('');
const st = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
console.log('after click:', st.result.value);
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(here, 'real_verify.png'), Buffer.from(shot.data, 'base64'));
console.log('saved');
ws.close();
process.exit(0);
