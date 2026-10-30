/* 启动时序诊断：页面各阶段耗时 + 时间轴轨道何时定型（M4 页面 3MB 后的性能复核） */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + path.join(here, '..', process.env.PAGE_FILE || 'geo-story.html').replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1:');
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
const send = (method, params) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true }); return r && r.result ? r.result.value : 'NO'; };
await new Promise(r => { ws.onopen = r; });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE });
for (let t = 0; t < 30; t++) {
  await sleep(200);
  const s = await ev(`(function(){
    var tr = document.getElementById('tlTrack');
    return JSON.stringify({ t: Math.round(performance.now()), ready: document.readyState,
      trackH: tr ? Math.round(tr.getBoundingClientRect().height) : -1,
      dots: document.querySelectorAll('.tl-dot').length,
      mapH: Math.round(document.getElementById('map').getBoundingClientRect().height) });
  })()`);
  console.log(s);
  if (s && s.indexOf('"trackH":114') >= 0) break;
}
console.log('timing:', await ev(`JSON.stringify({nav: Math.round(performance.timing.navigationStart?0:0), dom: Math.round(performance.timing.domComplete - performance.timing.navigationStart), load: Math.round(performance.timing.loadEventEnd - performance.timing.navigationStart), domContent: Math.round(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart), lts: 0, boot: window.GS_APP && GS_APP.boot})`));
ws.close(); process.exit(0);
