// 从 MaatheusGois/bible cuv.json（和合本繁体带空格）提取经文 → 繁转简 → 去空格
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function loadDict(file) {
  const map = new Map();
  for (const line of fs.readFileSync(dir + file, 'utf8').split('\n')) {
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
function stripSpaces(text) {
  return text.replace(/(?<=[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])\s+(?=[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])/g, '');
}

const books = JSON.parse(fs.readFileSync(dir + 'cuv.json', 'utf8').replace(/^\ufeff/, ''));
const B = {};
for (const b of books) B[b.id] = b.chapters;

const REFS = [
  ['e01', '使徒行传 13:2-3', 'act', 13, 2, 3],
  ['e02', '使徒行传 13:9', 'act', 13, 9, 9],
  ['e02', '使徒行传 13:12', 'act', 13, 12, 12],
  ['e03', '使徒行传 13:38-39', 'act', 13, 38, 39],
  ['e03', '使徒行传 13:48', 'act', 13, 48, 48],
  ['e04', '使徒行传 13:51-52', 'act', 13, 51, 52],
  ['e05', '使徒行传 14:3', 'act', 14, 3, 3],
  ['e06', '使徒行传 14:10', 'act', 14, 10, 10],
  ['e07', '使徒行传 14:19-20', 'act', 14, 19, 20],
  ['e08', '使徒行传 14:21', 'act', 14, 21, 21],
  ['e09', '使徒行传 14:22-23', 'act', 14, 22, 23],
  ['e10', '使徒行传 14:27', 'act', 14, 27, 27],
  ['e11', '加拉太书 1:8', 'gl', 1, 8, 8],
  ['e12', '使徒行传 15:19-20', 'act', 15, 19, 20],
  ['e12', '使徒行传 15:28-29', 'act', 15, 28, 29],
];

for (const [ev, ref, book, ch, v1, v2] of REFS) {
  let trad = '';
  for (let v = v1; v <= v2; v++) trad += (B[book][ch - 1][v - 1] || '');
  console.log(ev + '\t' + ref + '\t' + stripSpaces(t2s(trad)));
}
