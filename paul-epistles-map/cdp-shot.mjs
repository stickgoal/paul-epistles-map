// 最小 CDP 客户端：真实时间驱动 Chrome，截图 + 求值
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const targetUrl = process.argv[2];          // file:///... 页面
const outPng = process.argv[3];             // 输出 png
const waitMs = parseInt(process.argv[4] || '5000', 10);
const evalExpr = process.argv[5] || null;   // 可选：截图前要求值的表达式
const clicks = process.argv[6] ? JSON.parse(process.argv[6]) : null; // 可选：[{x,y,delay}]

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id).res(m.result); pending.delete(m.id); }
};
function send(method, params) {
  return new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: targetUrl });
await sleep(waitMs);

if (clicks) {
  for (const c of clicks) {
    await sleep(c.delay || 300);
    await send('Input.dispatchMouseEvent', { type: c.type || 'mousePressed', x: c.x, y: c.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: c.x, y: c.y, button: 'left', clickCount: 1 });
  }
  await sleep(800);
}

if (evalExpr) {
  const r = await send('Runtime.evaluate', { expression: evalExpr, returnByValue: true });
  console.log('EVAL:', JSON.stringify(r.result && r.result.value));
}
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
console.log('saved:', outPng);
ws.close();
process.exit(0);
