// 从 scrollmapper ChiUn.csv（和合本繁体）提取经文 → OpenCC 繁转简 → 去词间空格
import fs from 'node:fs';

const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// ---- 加载 OpenCC 词典 ----
function loadDict(file) {
  const map = new Map();
  for (const line of fs.readFileSync(dir + file, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [k, v] = line.split('\t');
    if (k && v) map.set(k, v.split(' ')[0]);
  }
  return map;
}
const phrases = loadDict('TSPhrases.txt');
const chars = loadDict('TSCharacters.txt');

function t2s(text) {
  // 先按短语最长匹配，再逐字
  let out = '';
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (let len = Math.min(6, text.length - i); len >= 2; len--) {
      const seg = text.substr(i, len);
      if (phrases.has(seg)) { out += phrases.get(seg); i += len; matched = true; break; }
    }
    if (!matched) {
      const c = text[i];
      out += chars.has(c) ? chars.get(c) : c;
      i++;
    }
  }
  return out;
}
// 去词间空格：CJK 字符/标点之间的空格
function stripSpaces(text) {
  return text.replace(/(?<=[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])\s+(?=[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])/g, '');
}

// ---- 加载 CSV ----
const rows = fs.readFileSync(dir + 'ChiUn.csv', 'utf8').split('\n');
const bible = {};
for (const line of rows) {
  const m = line.match(/^([^,]+),(\d+),(\d+),(.*)/);
  if (!m) continue;
  const [, book, ch, vs, textRaw] = m;
  const text = textRaw.replace(/\r$/, '');
  (bible[book] ||= {})[ch + ':' + vs] = text;
}

// ---- 需要的经文 ----
const REFS = [
  ['e01', '使徒行传 13:2-3', 'Acts', 13, 2, 3],
  ['e02', '使徒行传 13:9', 'Acts', 13, 9, 9],
  ['e02', '使徒行传 13:12', 'Acts', 13, 12, 12],
  ['e03', '使徒行传 13:38-39', 'Acts', 13, 38, 39],
  ['e03', '使徒行传 13:48', 'Acts', 13, 48, 48],
  ['e04', '使徒行传 13:51-52', 'Acts', 13, 51, 52],
  ['e05', '使徒行传 14:3', 'Acts', 14, 3, 3],
  ['e06', '使徒行传 14:10', 'Acts', 14, 10, 10],
  ['e07', '使徒行传 14:19-20', 'Acts', 14, 19, 20],
  ['e08', '使徒行传 14:21', 'Acts', 14, 21, 21],
  ['e09', '使徒行传 14:22-23', 'Acts', 14, 22, 23],
  ['e10', '使徒行传 14:27', 'Acts', 14, 27, 27],
  ['e11', '加拉太书 1:8', 'Galatians', 1, 8, 8],
  ['e12', '使徒行传 15:19-20', 'Acts', 15, 19, 20],
  ['e12', '使徒行传 15:28-29', 'Acts', 15, 28, 29],
];

for (const [ev, ref, book, ch, v1, v2] of REFS) {
  let trad = '';
  for (let v = v1; v <= v2; v++) trad += bible[book][ch + ':' + v] || '';
  console.log(ev + '\t' + ref + '\t' + stripSpaces(t2s(trad)));
}
