/* 移动端布局测量：定位 J2 断言失败的具体数值（事件行高 / 各段占用）
 * 用法：powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-cdp.ps1 scripts/measure-mobile.mjs
 */
const here = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\//g, '\\');
import fs from 'node:fs';
import path from 'node:path';

const PAGE = 'file:///' + path.resolve(process.cwd(), 'geo-story.html').replace(/\\/g, '/');
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
function send(method, params) { return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); }); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await new Promise((res) => { ws.onopen = res; });
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: PAGE });
await sleep(4500);
const r = await send('Runtime.evaluate', {
  expression: `(function(){
  function h(sel){ var e=document.querySelector(sel); return e? Math.round(e.getBoundingClientRect().height):null; }
  var sc = document.getElementById('scroll');
  var rows = [].slice.call(document.querySelectorAll('#list .ev'));
  var rowH = rows.length ? rows[0].getBoundingClientRect().height : 0;
  return JSON.stringify({
    viewport: [innerWidth, innerHeight],
    map: h('#map'), sidebar: h('.sidebar'), hd: h('.hd'), scroll: h('#scroll'),
    chapterbar: h('#chapterbar'), guide: h('#guide'), tl: h('.tl'),
    tlTop: h('.tl-top'), tlTrack: h('#tlTrack'), tlScale: h('.tl-scale'), tlKeys: h('.tl-keys'),
    rowH: Math.round(rowH), rows: rows.length,
    scrollable: sc.scrollHeight > sc.clientHeight + 1,
    trackStyleH: document.getElementById('tlTrack').style.height
  });})()`, returnByValue: true
});
console.log(r.result.value);
ws.close();
process.exit(0);
