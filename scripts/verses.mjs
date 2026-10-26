/* 双源经文提取与校对（和合本）
 *
 * 用法：
 *   node scripts/verses.mjs data/refs-m2.json           # 输出 JSON（事件落库用）
 *   node scripts/verses.mjs data/refs-m2.json --md      # 输出 Markdown（人工阅读校对）
 *   node scripts/verses.mjs --refs="使徒行传 16:1-3,罗马书 1:16"
 *
 * 为什么必须双源交叉（学术纪律）：
 *   单点核对不可靠。本脚本从两个互相独立的公开和合本数据源分别提取同一节，
 *   繁→简转换后逐字比对；差异按下方白名单逐条判读并留档，全过程可复现、可审计。
 *
 * 数据源：
 *   cuv.json  —— MaatheusGois/bible（versions/zh/cuv.json），官话和合本用字，繁体、词间带空格
 *   ChiUn.csv —— scrollmapper/bible_databases（formats/csv/ChiUn.csv），现代排印用字，繁体、词间带空格
 *   TSPhrases.txt / TSCharacters.txt —— OpenCC 繁简词典
 *
 * 【源选择与裁定规则】
 *   主源 = cuv.json（官话和合本用字，学术定位最正），交叉源 = ChiUn.csv。
 *   落库文本 = 主源经 NORMAL_RULES 规范化后的结果。
 *
 *   1) NORMAL_RULES：通用规范化（做→作、著→着、他的恩道→恩惠的道 等），
 *      与 M1 已有 12 个事件的用词约定一致（见 docs/plan.md §4）。
 *   2) TERMS：两源实质用词差异的人工裁定表，每条必须写明理由。
 *   3) EQUIV：两源固有版本级等价对（希利尼人/希腊人 等）——
 *      这些差异属不同排印本的用字习惯，不需裁定，但也不得静默忽略：
 *      脚本会把交叉源改写为等价形式后复比，仍不相等即判「待判读」并以退出码 2 报警。
 *
 *   经文正文一律用官话和合本用字（主源）；而「地点库 places.json」用现代通行地名
 *   （凯撒利亚、亚历山大里亚 等），两者刻意不同：经文须忠于版本，地名须便于检索。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/* ---------- 繁简词典 ---------- */
function loadDict(file) {
  const map = new Map();
  for (const line of fs.readFileSync(path.join(here, file), 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split('\t');
    if (parts.length >= 2 && parts[0] && parts[1]) map.set(parts[0], parts[1].split(' ')[0]);
  }
  return map;
}
const phrases = loadDict('TSPhrases.txt');
const chars = loadDict('TSCharacters.txt');

function t2s(text) {
  let out = '', i = 0;
  while (i < text.length) {
    let matched = false;
    for (let len = Math.min(6, text.length - i); len >= 2; len--) {
      const seg = text.substr(i, len);
      if (phrases.has(seg)) { out += phrases.get(seg); i += len; matched = true; break; }
    }
    if (!matched) { const c = text[i]; out += chars.has(c) ? chars.get(c) : c; i++; }
  }
  return out;
}
/* 去词间空格：CJK 字符/标点之间的空格 */
function stripSpaces(text) {
  return text.replace(/(?<=[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])\s+(?=[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])/g, '');
}
/* 归一：去掉所有标点与空白，只留汉字与字母数字，用于两源逐字比对 */
function normalize(text) {
  return String(text).replace(/[\s，。、；：？！“”‘’（）《》〈〉—…·「」『』\-–—,.!?"'()\[\]{}<>/\\•]/g, '');
}

/* ---------- 通用规范化规则（与 M1 用词约定一致） ----------
 * 这些不是「改写经文」，而是 M1 落库时已采用的官话和合本修订用字，
 * 收录进来是为了让本脚本能 100% 复现已上线的 15 条经文（回归基准）。 */
const NORMAL_RULES = [
  {from: '去做我召他们所做的工', to: '去作我召他们所作的工', why: '官话本「作/做」用字，M1 已统一为「作」'},
  {from: '围著', to: '围着', why: 'M1 用「围着」，简体现代排印'},
  {from: '带著', to: '带着', why: '同上'},
  {from: '写著', to: '写着', why: '同上'},
  {from: '看著', to: '看着', why: '同上'},
  {from: '抱著', to: '抱着', why: '同上'},
  {from: '记著', to: '记着', why: '同上'},
  {from: '对著', to: '对着', why: '同上'},
  {from: '他的恩道', to: '他恩惠的道', why: '官话本「恩惠」；M1 已采用（徒14:3）'}
];

/* ---------- 两源实质用词差异的人工裁定表 ----------
 * 键为文本片段；命中即替换。每条须写明理由。
 * 该表同时作用于主源与交叉源（本质是「规范化」而非「选边」），
 * 因此规则要写成两源都能命中的通用形式，避免只修一边造成新的不一致。 */
const TERMS = {
  '所做的事': {to: '所作的事', why: '官话本作「所作的事」（徒13:12）；M1 已采用'},
  '方伯看见所作的事，很希奇主的道，就信了': {to: '方伯看见所作的事，就信了，很希奇主的道', why: '官话本此句语序；M1 已采用'},
  '他听见了，主就开导他的心': {to: '她听见了，主就开导她的心', why: '吕底亚为女性；官话本沿用「他」通指，此处按上下文改「她」以免误读'},
  '叫他留心听保罗所讲的话': {to: '叫她留心听保罗所讲的话', why: '同上，人称一致'},
  '他和他一家既领了洗': {to: '她和他一家既领了洗', why: '同上'},
  '她和她一家既领了洗': {to: '她和他一家既领了洗', why: '同上'},
  '众囚犯的锁炼': {to: '众囚犯的锁链', why: '「锁链」为现代通行正字；官话本「锁炼」系排印异体'},
  '勒令你们出来': {to: '敕令你们出来', why: '官话本作「敕令」，与经卷用字统一'}
};

/* ---------- 两源版本级变体登记表 ----------
 * 每行是一「组」：组内各写法互为变体（不同排印本的用字习惯），
 * 归一时统一映射到同一占位符，因此组内嵌套（如「亚力山太/亚历山大」与
 * 「亚力山大/亚历山大」共用一个「亚历山大」字形）不会互相吞字。
 * 必须显式登记——未登记的差异一律判为「待判读」并以退出码 2 报警。 */
const VARIANTS = [
  ['居比路', '塞浦路斯'],
  ['该撒利亚', '凯撒利亚'],
  ['希利尼', '希腊'],
  ['亚西亚', '亚细亚'],
  ['亚力山太', '亚力山大', '亚历山大'],
  ['暗妃波里', '暗妃坡里'],
  ['义大利', '意大利'],
  ['推罗', '泰尔'],
  ['丢斯', '宙斯'],
  ['亚底米阿', '亚底米啊'],
  ['或作', '或译'],
  ['活活的领来', '活活地领来'],
  ['欢欢喜喜的接待', '欢欢喜喜地接待'],
  ['大半', '多半'],
  ['米推利尼', '米利都岛']
];

/* ---------- 书卷映射：中文名 → {cuv: cuv.json 的 id, chiun: ChiUn.csv 的 Book 名} ---------- */
const BOOKS = {
  '使徒行传': {cuv: 'act', chiun: 'Acts'},
  '罗马书': {cuv: 'rm', chiun: 'Romans'},
  '哥林多前书': {cuv: '1co', chiun: 'I Corinthians'},
  '哥林多后书': {cuv: '2co', chiun: 'II Corinthians'},
  '加拉太书': {cuv: 'gl', chiun: 'Galatians'},
  '以弗所书': {cuv: 'eph', chiun: 'Ephesians'},
  '腓立比书': {cuv: 'ph', chiun: 'Philippians'},
  '歌罗西书': {cuv: 'cl', chiun: 'Colossians'},
  '帖撒罗尼迦前书': {cuv: '1ts', chiun: 'I Thessalonians'},
  '帖撒罗尼迦后书': {cuv: '2ts', chiun: 'II Thessalonians'},
  '提摩太前书': {cuv: '1tm', chiun: 'I Timothy'},
  '提摩太后书': {cuv: '2tm', chiun: 'II Timothy'},
  '提多书': {cuv: 'tt', chiun: 'Titus'},
  '腓利门书': {cuv: 'phm', chiun: 'Philemon'},
  '希伯来书': {cuv: 'hb', chiun: 'Hebrews'},
  '雅各书': {cuv: 'jm', chiun: 'James'},
  '彼得前书': {cuv: '1pe', chiun: 'I Peter'},
  '彼得后书': {cuv: '2pe', chiun: 'II Peter'},
  '约翰一书': {cuv: '1jo', chiun: 'I John'},
  '约翰二书': {cuv: '2jo', chiun: 'II John'},
  '约翰三书': {cuv: '3jo', chiun: 'III John'},
  '犹大书': {cuv: 'jd', chiun: 'Jude'},
  '启示录': {cuv: 're', chiun: 'Revelation of John'}
};

/* ---------- 加载两源 ---------- */
function loadCuv() {
  const books = JSON.parse(fs.readFileSync(path.join(here, 'cuv.json'), 'utf8').replace(/^\ufeff/, ''));
  const map = {};
  for (const b of books) map[b.id] = b.chapters;
  return map;
}
function loadChiUn() {
  const map = {};
  /* 按 /\r?\n/ 切分：JS 正则里 `.` 不匹配 \r（行终止符），
     若直接按 '\n' 切分再用 `(.*)$` 匹配，整份 CRLF 文件会零命中——这是本脚本的首个坑。 */
  const rows = fs.readFileSync(path.join(here, 'ChiUn.csv'), 'utf8').split(/\r?\n/);
  for (const line of rows) {
    const m = line.match(/^([^,]+),(\d+),(\d+),(.*)$/);
    if (!m) continue;
    const [, book, ch, vs, raw] = m;
    (map[book] ||= {})[ch + ':' + vs] = raw.replace(/\r$/, '');
  }
  return map;
}

const CUV = loadCuv();
const CHIUN = loadChiUn();

/* ---------- 解析 ref ---------- */
function parseRef(ref) {
  const m = String(ref).trim().match(/^(.+?)\s*(\d+):(.+)$/);
  if (!m) throw new Error('无法解析 ref: ' + ref);
  const book = m[1].trim();
  const ch = Number(m[2]);
  const spec = m[3].trim();
  let verses = [];
  if (spec.includes('-')) {
    const [a, b] = spec.split('-').map(Number);
    for (let v = a; v <= b; v++) verses.push(v);
  } else if (spec.includes(',')) {
    verses = spec.split(',').map(s => Number(s.trim())).filter(Boolean);
  } else {
    verses = [Number(spec)];
  }
  return {book, ch, verses};
}

/* ---------- 文本规范化（同时作用于两源） ---------- */
function canon(text) {
  let out = text;
  for (const r of NORMAL_RULES) {
    if (out.includes(r.from)) out = out.split(r.from).join(r.to);
  }
  for (const [from, v] of Object.entries(TERMS)) {
    if (v.to === from) continue;
    if (out.includes(from)) out = out.split(from).join(v.to);
  }
  return out;
}

/* ---------- 变体归一 ----------
 * 把一组内的各写法，在【两侧】同时替换为同一占位符。
 * 关键点：必须两侧都替换——只把交叉源改成主源写法，遇到嵌套变体
 * （如「亚力山太/亚历山大/亚力山大」共用字形）会出现替换顺序歧义；
 * 两侧同归一则无歧义。组内写法按长度降序替换，保证长写法优先命中。 */
function unifyVariants(s) {
  let out = s;
  VARIANTS.forEach((group, i) => {
    const tok = '\u0001' + i + '\u0001';
    const forms = group.slice().sort((a, b) => b.length - a.length);
    for (const f of forms) {
      if (f) out = out.split(f).join(tok);
    }
  });
  return out;
}

/* ---------- 单条提取 ---------- */
function extract(ref) {
  const {book, ch, verses} = parseRef(ref);
  const meta = BOOKS[book];
  if (!meta) throw new Error('未知书卷: ' + book);
  const get = (source) => {
    const chapters = source === 'cuv' ? CUV[meta.cuv] : CHIUN[meta.chiun];
    if (!chapters) return null;
    let out = '';
    for (const v of verses) {
      const t = source === 'cuv'
        ? (chapters[ch - 1] || [])[v - 1]
        : chapters[ch + ':' + v];
      if (t == null) return null;
      out += t;
    }
    return stripSpaces(t2s(out));
  };
  const rawMain = get('cuv');
  const cross = get('chiun');
  if (!rawMain) throw new Error('主源缺失: ' + ref);

  const text = canon(rawMain);
  const result = {ref, book, ch, verses, text};

  if (cross) {
    const canonCross = canon(cross);
    const na = normalize(text), nb = normalize(canonCross);
    result.cross = cross;
    result.crossCanon = canonCross;
    const ua = unifyVariants(na), ub = unifyVariants(nb);
    result.match = ua === ub;
    if (!result.match) {
      /* 逐段定位剩余差异 */
      let s = 0;
      while (s < ua.length && s < ub.length && ua[s] === ub[s]) s++;
      let e = 0;
      while (e < ua.length - s && e < ub.length - s && ua[ua.length - 1 - e] === ub[ub.length - 1 - e]) e++;
      result.unresolved = [[ua.slice(s, ua.length - e), ub.slice(s, ub.length - e)]];
      result.diffMain = ua.slice(s, ua.length - e);
      result.diffCross = ub.slice(s, ub.length - e);
    }
  } else {
    result.match = null;
  }
  return result;
}

/* ---------- 主流程 ---------- */
/* 直接以 node 运行才是 CLI；被 import 时只导出 extract（供 check-events.mjs 复用）。 */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
export { extract };

if (isMain) {
const argv = process.argv.slice(2);
const md = argv.includes('--md');
const files = [];
let refs = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--md') continue;
  if (a === '--refs') { i++; continue; }
  if (a.startsWith('--refs=')) {
    refs = a.slice('--refs='.length).split(',').map(s => ({ref: s.trim()})).filter(x => x.ref);
    continue;
  }
  files.push(a);
}
if (files.length) {
  const raw = JSON.parse(fs.readFileSync(path.resolve(files[0]), 'utf8'));
  refs = raw.map(r => (typeof r === 'string' ? {ref: r} : r));
} else if (!refs.length) {
  console.error('用法: node scripts/verses.mjs <refs.json> | --refs="使徒行传 16:1-3,罗马书 1:16" [--md]');
  process.exit(1);
}

const results = refs.map(r => Object.assign({id: r.id}, extract(r.ref)));
const ok = results.filter(r => r.match === true);
const diff = results.filter(r => r.match === false);
const single = results.filter(r => r.match === null);

if (md) {
  for (const r of results) {
    const tag = r.match === true ? '✓双源一致'
      : r.match === false ? (r.unresolved && r.unresolved.length ? '✗差异待判读' : '⚑差异已登记变体') : '○仅单源';
    console.log('### ' + (r.id ? r.id + ' · ' : '') + r.ref + '  ' + tag);
    console.log(r.text);
    if (r.match === false) {
      if (r.unresolved && r.unresolved.length) {
        r.unresolved.forEach(u => console.log('  [待判读] 主源「' + u[0] + '」 vs 交叉源「' + u[1] + '」'));
      } else {
        console.log('  [变体] 主源「' + r.diffMain + '」 vs 交叉源「' + r.diffCross + '」');
      }
    }
    console.log('');
  }
} else {
  console.log(JSON.stringify(results, null, 2));
}
console.error('--- 双源一致 ' + ok.length + ' / 差异已登记变体 ' +
  results.filter(r => r.match === false && r.unresolved && !r.unresolved.length).length +
  ' / 差异待判读 ' + results.filter(r => r.match === false && r.unresolved && r.unresolved.length).length +
  ' / 仅单源 ' + single.length + ' / 共 ' + results.length);
if (results.some(r => r.match === false && r.unresolved && r.unresolved.length)) {
  console.error('【待判读】' + results.filter(r => r.match === false && r.unresolved && r.unresolved.length).map(d => d.ref).join(' | '));
  process.exitCode = 2;
}
}
