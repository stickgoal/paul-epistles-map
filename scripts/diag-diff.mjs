/* 差异上下文诊断（临时工具，辅助登记 VARIANTS / TERMS）
 *
 * 用途：双源比对只剩「一个字的差异」时，肉眼无法判断该登记为版本变体
 * 还是实质用字差异。本脚本把差异点前后的文字一并打印出来，供逐条判读。
 *
 * 用法：node scripts/diag-diff.mjs "使徒行传 21:17-19" "使徒行传 27:7-12"
 */
import { extract } from './verses.mjs';

const refs = process.argv.slice(2);
if (!refs.length) { console.error('用法: node scripts/diag-diff.mjs <ref> [<ref> ...]'); process.exit(1); }

for (const ref of refs) {
  const r = extract(ref);
  console.log('### ' + ref + '  ' + (r.match === true ? '✓双源一致' : '✗有差异'));
  if (r.match === true) { console.log('  ' + r.text + '\n'); continue; }
  const a = r.diffMain, b = r.diffCross;
  console.log('  主源差异段: ' + a);
  console.log('  交叉源差异段: ' + b);
  /* 打印差异在全文中的位置与上下文，便于判断该词组是否「仅此处不同」 */
  console.log('  --- 上下文 ---');
  console.log('  ' + r.text);
  console.log('');
}
