/* 事件 ↔ 路线 一致性检查（不变量校验，不写死数量）
 *
 * 背景（两次真实踩坑）：
 *   ① route-engine 的 seek() 靠 stops[].p === ev.place 找站点；站点若缺 p，
 *      事件与路线就对不上，描线【完全不动】且不报错（M2 重写 j2/j3 时全体缺 p）。
 *   ② seek() 原先只按地点匹配，跨旅程串线：M1「耶路撒冷会议」（ch1）
 *      会命中 j2/j3 的耶路撒冷站点，把第二、三次旅程的线在 AD 49 就画到耶路撒冷。
 *      现已加章节闸门（routes[].ch 与 events[].ch 必须相等）。
 *
 * 本脚本校验：
 *   1) 章节锚点：每个 route 的 ch 存在于 chapters.json；每个已上线章节有对应 route
 *   2) 事件可命中：事件在本章旅程上能找到 p === place 的站点
 *      —— 找不到时只影响描线（相机仍会飞到地点），列为【警告】而非错误
 *   3) 描线单调向前：按播放顺序推演 seek，选中站点序号不得回退
 *   4) waypoint（无 p 的站点）清单：仅供人工确认，不算错误
 *
 * 用法：node scripts/check-routes.mjs
 * 退出码：0 = 通过（可能有警告）；2 = 存在违反
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

const events = read('data/events.json');
const routes = read('data/routes.json');
const chapters = read('data/chapters.json');
const places = read('data/places.json');

const errs = [], warns = [], notes = [];
const chIds = new Set(chapters.map(c => c.id));
const placeIds = new Set(places.map(p => p.id));

/* --- 1) 章节锚点 --- */
const CH_ROUTE = {};
routes.forEach(j => {
  if (!j.ch) { errs.push('旅程 ' + j.id + ' 缺少章节锚点 ch（将退回按地点匹配，可能跨旅程串线）'); return; }
  if (!chIds.has(j.ch)) errs.push('旅程 ' + j.id + ' 的 ch=' + j.ch + ' 不在 chapters.json 中');
  if (CH_ROUTE[j.ch]) errs.push('章节 ' + j.ch + ' 绑定了多条旅程（' + CH_ROUTE[j.ch] + ' / ' + j.id + '）');
  CH_ROUTE[j.ch] = j.id;
});
const liveChapters = new Set(events.map(e => e.ch));
liveChapters.forEach(c => { if (!CH_ROUTE[c]) warns.push('章节 ' + c + ' 已有事件，但没有对应旅程（描线不会动）'); });

/* --- 4) waypoint 清单（仅供参考） --- */
routes.forEach(j => {
  const wp = j.stops.filter(s => !s.p).map(s => s.cn);
  if (wp.length) notes.push('旅程 ' + j.id + ' 的 waypoint（无 p，仅作途经点）：' + wp.join('、'));
});
/* 有 p 的站点必须指向真实地点 */
routes.forEach(j => {
  j.stops.forEach(s => { if (s.p && !placeIds.has(s.p)) errs.push('旅程 ' + j.id + ' 站点「' + s.cn + '」的 p=' + s.p + ' 在 places.json 中不存在'); });
});

/* --- 2)+3) 事件命中与单调性 --- */
const byId = {}; routes.forEach(j => { byId[j.id] = j; });
const seq = events.map((e, i) => ({ e, i })).sort((a, b) => a.e.from - b.e.from || a.i - b.i);
const cur = {};
const summary = {};

seq.forEach(({ e }) => {
  const jid = CH_ROUTE[e.ch];
  if (!jid) return;
  const j = byId[jid];
  const cands = j.stops.map((s, idx) => ({ s, idx })).filter(x => x.s.p === e.place);
  if (!cands.length) {
    warns.push('事件 ' + e.id + '（' + e.place + '）在本章旅程 ' + jid + ' 上没有对应站点 → 该事件只走相机，不走描线');
    return;
  }
  const from = cur[jid] == null ? 0 : cur[jid];
  let pick = cands.find(c => c.idx >= from);
  if (!pick) pick = cands[cands.length - 1];
  if (pick.idx < from) {
    errs.push('事件 ' + e.id + ' 使旅程 ' + jid + ' 的进度【回退】：站点序号 ' + from + ' → ' + pick.idx + '（' + e.place + '）');
  }
  cur[jid] = pick.idx;
  summary[jid] = summary[jid] || { events: 0, maxStop: 0, stops: j.stops.length, moved: 0 };
  summary[jid].events++;
  if (pick.idx > from) summary[jid].moved++;
  summary[jid].maxStop = Math.max(summary[jid].maxStop, pick.idx);
});

Object.keys(summary).forEach(k => {
  const s = summary[k];
  console.log('旅程 ' + k + '：' + s.events + ' 个事件，最远到第 ' + s.maxStop + ' / ' + s.stops + ' 站，其中 ' + s.moved + ' 次推进描线');
});

if (notes.length) { console.log('\n【说明】'); notes.forEach(n => console.log('  ' + n)); }
if (warns.length) { console.log('\n【警告】'); warns.forEach(n => console.log('  ' + n)); }
if (errs.length) {
  console.log('\n【错误】');
  errs.forEach(n => console.log('  ' + n));
  console.log('\n共 ' + errs.length + ' 项。');
  process.exitCode = 2;
} else {
  console.log('\n无错误。');
}
