/* 为 events.json 补图像条目（素材来源：Wikimedia Commons）。
 *
 * 用法：node scripts/fetch-media.mjs          # 校验候选文件并打印（默认）
 *       node scripts/fetch-media.mjs --write  # 校验通过后写入 data/events.json
 *
 * 为什么用「人工指定精确文件名 + API 校验」而不是关键词搜索：
 *   Commons 全文搜索会把植物学名（Lystra lanata）、现代风景区（三棵棕榈树）
 *   排在古代遗址之前，自动取第一条必然出错。故文件名由人工逐一确认，
 *   脚本只负责校验存在性、授权类型与尺寸，并生成规范化的 media 条目。
 *
 * 授权纪律：只接受 Public Domain / CC0 / CC BY / CC BY-SA；
 *   credit 由 API 的 Artist + LicenseShortName 生成，url 指向 Commons
 *   文件页（永久溯源，含完整授权与作者信息）。
 *
 * 已知限制：图片二进制域 upload.wikimedia.org 在部分网络环境不可达，
 *   因此 src 留空（本地webp 待网络可用时再补），条目走「外链溯源」模式，
 *   详情页渲染为带授权信息的溯源卡片。
 */
import fs from 'node:fs';

const UA = 'geo-story/1.0 (educational bible-map project)';
/* 只接受自由授权：Public Domain / CC0 / CC BY / CC BY-SA（版本号可选）
 * 注意不写软连字符（U+00AD），直接用 (?:-|\s)? 兼容 "BY-SA" 与 "BY SA" 两种写法 */
const FREE = /^(public domain|cc0|cc by(?:-sa)?(?:\s\d(?:\.\d)?)?|no restrictions)/i;

/** 事件 id → [Commons 精确文件名, 中文图注, kind]（kind: photo=今日遗存 / art=历史艺术） */
const PICKS = {
  'paphos-sergius':[
    'Leda mosaic.jpg',
    '帕弗出土马赛克《丽达与天鹅》（公元 4 世纪出土于帕弗附近）', 'art'],
  'antioch-pisidia-sermon':  ['Antioch in Pisidia Augustus Temple 2937.jpg', '彼西底的安提阿：奥古斯都神庙遗址', 'photo'],
  'antioch-pisidia-expelled':['Antioch in Pisidia Theatre 2963.jpg', '彼西底的安提阿：古剧场——保罗讲道后人群聚集于此', 'photo'],
  'lystra-stoning':[
    'Pieter Coecke van Aelst (Flemish - The Sacrifice at Lystra - Google Art Project.jpg',
    '《路司得的献祭》：保罗一行被误当神明献祭的场景（ Pieter Coecke van Aelst，约 1529–1530）', 'art'],
  'return-visit':            ['Salamis Ruins, Cyprus.jpg', '撒拉米：罗马时期遗址与 basilica 遗迹', 'photo'],
  'antioch-report':          ['Galatia (Imperium Romanum).png', '加拉太地区在罗马帝国行省图中的位置', 'art'],
  'jerusalem-council':       ['Model of Jerusalem in the Late Second Temple Period 09.jpg', '耶路撒冷第二圣殿时期模型（圣殿与公会堂的格局）', 'photo']
};

const strip = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** Commons 的 Artist 字段常含重复的 HTML 片段（去标签后同一作者名连写，
 *  如 "Unknown authorUnknown author"），也常带机器可读性说明后缀。
 *  处理：① 按逗号/分号切分去重 ② 折叠紧邻重复子串 ③ 去掉机器说明性后缀。 */
function cleanAuthor(raw) {
  let s = strip(raw);
  /* 折叠紧邻重复："AABB" → "AB"（整串由两个相同半段拼成的情况） */
  for (let guard = 0; guard < 4; guard++) {
    const n = s.length;
    if (n % 2) break;
    const half = s.slice(0, n / 2);
    if (half && s.slice(n / 2) === half) { s = half; continue; }
    break;
  }
  /* 去掉 Commons 的机器可读性说明 */
  s = s.replace(/\(?No machine-readable author provided\.?/gi, '')
       .replace(/assumed \(based on copyright claims\)\.?/gi, '')
       .replace(/\bartist \(Flemish\)\b/gi, '')
       .replace(/\(Flemish、\d{4}\s*-\s*\d{4}\)/g, '')
       .replace(/\(\d{4}\s*-\s*\d{4}\)/g, '')
       .replace(/Details on Google Art Project/gi, '')
       .replace(/\s*[·,;]\s*$/, '')
       .trim();
  /* 再按逗号/分号切分去重 */
  const parts = s.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  const seen = new Set(); const out = [];
  parts.forEach((p) => { if (!seen.has(p)) { seen.add(p); out.push(p); } });
  return out.join('、');
}

async function batch(titles) {
  const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
    '&titles=' + encodeURIComponent(titles.map((t) => 'File:' + t).join('|')) +
    '&prop=imageinfo&iiprop=url|extmetadata|size|mime';
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return Object.values((await r.json()).query?.pages || {});
}

const names = Object.values(PICKS).map((x) => x[0]);
const pages = await batch(names);
const byTitle = {};
pages.forEach((p) => { byTitle[p.title.replace(/^File:/, '')] = p; });

const ok = {};
let bad = 0;
for (const [id, [fn, caption, kind]] of Object.entries(PICKS)) {
  const p = byTitle[fn];
  if (!p || p.missing !== undefined) { console.log('MISSING  ' + id + ' → ' + fn); bad++; continue; }
  const ii = p.imageinfo?.[0] || {}, em = ii.extmetadata || {};
  const license = strip(em.LicenseShortName?.value);
  if (!FREE.test(license)) { console.log('LICENSE? ' + id + ' → ' + fn + ' [' + license + ']'); bad++; continue; }
  const author = cleanAuthor(em.Artist?.value);
  ok[id] = {
    kind, title: caption,
    src: null,
    credit: (author || '作者不详') + ' · ' + license + ' · Wikimedia Commons',
    url: ii.descriptionurl
  };
  console.log('OK       ' + id.padEnd(22) + license.padEnd(16) + fn);
}
console.log('\n校验通过 ' + Object.keys(ok).length + ' / ' + Object.keys(PICKS).length + (bad ? '（' + bad + ' 项未通过）' : ''));

if (process.argv.includes('--write')) {
  const p = new URL('../data/events.json', import.meta.url);
  const ev = JSON.parse(fs.readFileSync(p, 'utf8'));
  let n = 0;
  ev.forEach((e) => { if (ok[e.id]) { e.media = [ok[e.id]]; n++; } });
  fs.writeFileSync(p, JSON.stringify(ev, null, 2) + '\n');
  console.log('已写入 media 的事件数: ' + n + ' / ' + ev.length);
} else {
  console.log('（预览模式，加 --write 写入 events.json）');
}
