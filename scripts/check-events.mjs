/* 事件经文回验（events.json ↔ 双源经文库）
 *
 * 目的：让 data/events.json 里落库的每一条经文都可以【机械复核】——
 * 不靠人眼比对，而是重新从两个独立和合本数据源提取同一节，
 * 规范化后与 events.json 中的 text 逐字比对。
 *
 * 三层检查：
 *   1) 用字逐字一致：events.json 的 text 与源文本【去标点后】逐字相同
 *      —— 标点属于编辑加工（M1 体例会给直接引语加「」、把经文末尾的分号改作句号），
 *         故标点差异单独计为「标点编辑」，不算不一致；用字差异一律算不一致。
 *   2) 双源一致：主源与交叉源经归一后相等（否则说明该节存在未裁定的版本差异）
 *   3) 引用完整：每个事件至少有一条经文；经文 ref 与事件 id 的对应关系可追溯
 *
 * 用法：node scripts/check-events.mjs
 * 退出码：0 = 全部通过；2 = 存在不一致（CI 可据此拦截）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from './verses.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const events = JSON.parse(fs.readFileSync(path.join(root, 'data/events.json'), 'utf8'));

/* 去掉全部标点与空白，只留「字」——用于区分用字差异与标点加工。
 * 保留：CJK 汉字（含扩展 A）、ASCII 字母数字；其余（标点、空白、符号）一律剔除。 */
const bare = (s) => (s.match(/[\u4e00-\u9fff\u3400-\u4dbfA-Za-z0-9]/g) || []).join('');

let checked = 0, mismatch = [], unresolved = [], punctEdit = [], noVerse = [];

for (const ev of events) {
  if (!ev.verses || !ev.verses.length) { noVerse.push(ev.id); continue; }
  for (const v of ev.verses) {
    checked++;
    let r;
    try {
      r = extract(v.ref);
    } catch (err) {
      mismatch.push({ id: ev.id, ref: v.ref, why: '提取失败：' + err.message });
      continue;
    }
    if (r.text !== v.text) {
      if (bare(r.text) === bare(v.text)) punctEdit.push({ id: ev.id, ref: v.ref });
      else {
        mismatch.push({
          id: ev.id, ref: v.ref, why: '用字与源文本不一致',
          src: r.text, data: v.text
        });
      }
    }
    if (r.match === false) {
      const u = (r.unresolved && r.unresolved.length) ? r.unresolved : [[r.diffMain, r.diffCross]];
      unresolved.push({ id: ev.id, ref: v.ref, diff: u });
    }
  }
}

console.log('检查事件数：' + events.length + ' · 经文条数：' + checked);
console.log('用字一致：' + (checked - mismatch.length) + ' / ' + checked);
console.log('双源一致：' + (checked - unresolved.length) + ' / ' + checked);
console.log('标点编辑（用字一致、标点经人工加工）：' + punctEdit.length + ' 条 —— ' +
  punctEdit.map(p => p.id).join(' | '));

if (noVerse.length) console.log('无经文的事件：' + noVerse.join(' | '));
if (mismatch.length) {
  console.log('\n【用字不一致】');
  mismatch.forEach(m => {
    console.log('  ' + m.id + ' · ' + m.ref + ' — ' + m.why);
    if (m.src) {
      console.log('    源：' + m.src);
      console.log('    库：' + m.data);
    }
  });
}
if (unresolved.length) {
  console.log('\n【双源差异（需裁定）】');
  unresolved.forEach(u => {
    console.log('  ' + u.id + ' · ' + u.ref + ' — 主源「' + u.diff[0][0] + '」 vs 交叉源「' + u.diff[0][1] + '」');
  });
}

if (mismatch.length || unresolved.length) process.exitCode = 2;
else console.log('\n全部通过。');
