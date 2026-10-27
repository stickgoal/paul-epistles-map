/* 差异点精确定位（临时判读工具）
 *
 * diag-diff.mjs 只给出首个差异点；本脚本把两源【所有】不匹配位置
 * 逐个列出（对齐后跳过已匹配段），用于逐条判读该登记为
 * 版本级变体（VARIANTS）还是实质用字差异（TERMS）。
 *
 * 用法：node scripts/diag-diff2.mjs "使徒行传 22:22-25" "使徒行传 26:24-29"
 */
import { extract } from './verses.mjs';

/* 与 verses.mjs 的 normalize 同规：去掉标点空白，只留可比较字符 */
const bare = (t) => String(t).replace(/[\s，。、；：？！“”‘’（）《》〈〉—…·「」『』\-–—,.!?"'()\[\]{}<>/\\•]/g, '');

const refs = process.argv.slice(2);
if (!refs.length) { console.error('用法: node scripts/diag-diff2.mjs <ref> [<ref> ...]'); process.exit(1); }

for (const ref of refs) {
  const r = extract(ref);
  console.log('### ' + ref + '  ' + (r.match === true ? '✓双源一致' : '✗有差异'));
  if (r.match === true) { console.log(''); continue; }
  const a = bare(r.text), b = bare(r.crossCanon);
  /* 贪心对齐：找两串的全部不匹配块 */
  let i = 0, j = 0, blocks = [];
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    /* 不匹配：从两侧各取最长公共前缀，定位差异块 */
    let k = 0;
    while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k++;
    blocks.push({ a: a.slice(i, i + k), b: b.slice(j, j + k), pa: i, pb: j });
    i += k; j += k;
    if (blocks.length > 40) break;
    /* 跳过两侧不等长的一段 */
    let s = 0;
    while (i + s < a.length && j + s < b.length && a[i + s] !== b[j + s]) s++;
    if (s === 0) { i++; j++; }
    else { blocks.push({ a: a.slice(i, i + s), b: b.slice(j, j + s), pa: i, pb: j }); i += s; j += s; }
  }
  blocks.forEach((bk, n) => {
    if (!bk.a && !bk.b) return;
    console.log('  #' + (n + 1) + ' 主源「' + bk.a + '」 vs 交叉源「' + bk.b + '」');
    console.log('      主源上下文: ...' + a.slice(Math.max(0, bk.pa - 14), bk.pa + bk.a.length + 14) + '...');
    console.log('      交叉上下文: ...' + b.slice(Math.max(0, bk.pb - 14), bk.pb + bk.b.length + 14) + '...');
  });
  console.log('');
}
