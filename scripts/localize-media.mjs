/* 媒体本地化：Commons 文件页 → 本地 webp（≤300KB）+ 授权/署名回填
 *
 * 为什么需要这一步：
 *   ① 单文件离线 HTML 不能依赖外链；外链图在断网、墙外、Commons 改文件名时全部失效。
 *   ② 授权与署名不能凭印象写：credit 必须来自 API 的 extmetadata（Artist + LicenseShortName），
 *      许可证不在白名单（PD / CC0 / CC BY / CC BY-SA）一律拒绝落库。
 *   ③ 图片体积必须可控：网页里 2MB 的原图会把详情面板拖死，统一压到 960px / ≤300KB 的 webp。
 *
 * 用法：
 *   node scripts/localize-media.mjs            # 只核验与报告（不写盘）
 *   node scripts/localize-media.mjs --write    # 下载 + 转 webp + 回填 events.json
 *   node scripts/localize-media.mjs --write --only ch6   # 只处理某章（按事件 id 前缀）
 *
 * 产物：
 *   assets/media/<eventId>-<n>.webp
 *   data/media-audit.json（逐图授权与体积留档，可审计）
 *
 * 幂等：已存在且体积合规的 webp 直接复用，不重复下载。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(path.join(root, '.tools', 'noop.js'));

const WRITE = process.argv.includes('--write');
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx > 0 ? process.argv[onlyIdx + 1] : null;

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'geo-story/1.0 (offline bible map; local academic use)';
const ALLOWED = /^(cc0|cc-by|cc by|cc-by-sa|cc by-sa|pd|public domain|pdm|no restrictions|attribution)/i;
const MAX_BYTES = 300 * 1024;
const MAX_EDGE = 960;

/* 二次压缩档位：单文件 HTML 会把所有图内联为 base64（体积 ×1.37），
 * 39 张 960px 图 ≈ 5.4MB base64，打开时解析与内存都不划算。
 * 详情面板里图片最大显示宽度约 320px，720px 已够 2× 屏；故再压一档到 ≤110KB。
 * 用 --recompress 单独跑（从磁盘读已下载的 webp 重编码，不再联网）。 */
const RECOMPRESS = process.argv.includes('--recompress');
const FINAL_EDGE = 720;
const FINAL_BYTES = 110 * 1024;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* Commons 在这台机器上间歇性超时（实测约 1/3 请求 20s 无响应），必须重试 */
async function req(url, asJson, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return asJson ? await res.json() : Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (attempt >= 5) throw err;
    await sleep(1200 * (attempt + 1));
    return req(url, asJson, attempt + 1);
  }
}

const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/* 署名清洗：extmetadata 的 Artist 字段是自由文本，常见四类噪声——
 *   ① 重复（"Unknown author Unknown author"）
 *   ② 免责声明（"No machine-readable author provided. X assumed..."）
 *   ③ 工具尾巴（"Details on Google Art Project"）
 *   ④ 角色后缀（"– artist (Flemish)"、"· artist"）
 * 不清洗就会在 figcaption 里出现「Unknown author Unknown author · Public domain」这种半机器文本。 */
function cleanArtist(s) {
  let a = stripHtml(s);
  if (!a) return 'Unknown';
  a = a.replace(/No machine-readable author provided\.?\s*/i, '');
  a = a.replace(/\(based on copyright claims\)/i, '');
  a = a.replace(/\s*assumed\s*\.?$/i, '');
  a = a.replace(/Details on Google Art Project/gi, '');
  a = a.replace(/\s*[–—-]\s*artist\b[^,;]*/gi, '');
  a = a.replace(/\s*·\s*artist\b/gi, '');
  /* 折叠相邻重复短语（"X X" → "X"） */
  const half = Math.floor(a.length / 2);
  if (a.length > 6 && a.slice(0, half).trim() === a.slice(half).trim()) a = a.slice(0, half).trim();
  a = a.replace(/\s{2,}/g, ' ').replace(/^[\s,;·–-]+|[\s,;·–-]+$/g, '');
  if (!a || /^unknown$/i.test(a)) return 'Unknown';
  return a.length > 60 ? a.slice(0, 57) + '…' : a;
}

function fileTitleFromUrl(url) {
  const m = /\/wiki\/(File:.+)$/.exec(url || '');
  if (!m) return null;
  return decodeURIComponent(m[1]).replace(/_/g, ' ');
}

async function infoFor(title) {
  const q = new URLSearchParams({
    action: 'query', format: 'json', titles: title,
    prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '1400'
  });
  const r = await req(API + '?' + q, true);
  const pages = (r.query && r.query.pages) || {};
  const page = Object.values(pages)[0] || {};
  if (page.missing !== undefined) return { missing: true };
  const info = (page.imageinfo || [])[0];
  if (!info) return { missing: true };
  const m = info.extmetadata || {};
  const pick = (...keys) => {
    for (const k of keys) { const v = m[k]; if (v && v.value) return stripHtml(v.value); }
    return '';
  };
  return {
    title: page.title,
    thumb: info.thumburl || info.url,
    width: info.width, height: info.height,
    license: pick('LicenseShortName', 'License', 'UsageTerms'),
    artist: pick('Artist', 'Credit', 'Author')
  };
}

/* 压到 ≤300KB：先降质量，再降边长；仍超标则报错（不允许静默放过超重图） */
async function toWebp(sharp, buf, outFile) {
  let edge = MAX_EDGE, quality = 76;
  for (let i = 0; i < 6; i++) {
    await sharp(buf)
      .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(outFile);
    const size = fs.statSync(outFile).size;
    if (size <= MAX_BYTES) return { size, edge, quality };
    quality -= 8;
    if (quality < 52) { quality = 62; edge = Math.round(edge * 0.8); }
  }
  throw new Error('压缩后仍超过 300KB：' + outFile);
}

const events = JSON.parse(fs.readFileSync(path.join(root, 'data/events.json'), 'utf8'));
const mediaDir = path.join(root, 'assets', 'media');
fs.mkdirSync(mediaDir, { recursive: true });

let sharp = null;
if (WRITE || RECOMPRESS) sharp = require('sharp');

/* 二次压缩：只读磁盘上已有的 webp 重编码，不联网 */
if (RECOMPRESS) {
  const files = fs.readdirSync(mediaDir).filter(f => f.endsWith('.webp'));
  let before = 0, after = 0;
  for (const f of files) {
    const p = path.join(mediaDir, f);
    const b0 = fs.statSync(p).size;
    before += b0;
    const buf = fs.readFileSync(p);
    const tmp = p + '.tmp';
    let done = false;
    for (const q of [68, 60, 52]) {
      await sharp(buf)
        .resize({ width: FINAL_EDGE, height: FINAL_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: q, effort: 5 })
        .toFile(tmp);
      if (fs.statSync(tmp).size <= FINAL_BYTES) { done = true; break; }
    }
    if (done && fs.statSync(tmp).size < b0) fs.renameSync(tmp, p);
    else fs.unlinkSync(tmp);
    after += fs.statSync(p).size;
  }
  const auditFile = path.join(root, 'data/media-audit.json');
  if (fs.existsSync(auditFile)) {
    const a = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
    a.forEach(x => { const p = path.join(root, x.file); if (fs.existsSync(p)) x.bytes = fs.statSync(p).size; });
    fs.writeFileSync(auditFile, JSON.stringify(a, null, 2) + '\n');
  }
  console.log('重压缩：' + files.length + ' 张，' + (before / 1048576).toFixed(2) + 'MB → ' + (after / 1048576).toFixed(2) + 'MB');
  process.exit(0);
}

const audit = [];
let ok = 0, skipped = 0, failed = 0;

for (const ev of events) {
  if (!ev.media || !ev.media.length) continue;
  if (ONLY && !ev.id.startsWith(ONLY)) continue;
  for (let i = 0; i < ev.media.length; i++) {
    const m = ev.media[i];
    const title = fileTitleFromUrl(m.url);
    if (!title) { console.log('SKIP  无 Commons 文件页：' + ev.id + ' / ' + m.title); skipped++; continue; }

    let info;
    try { info = await infoFor(title); }
    catch (err) { console.log('FAIL  ' + ev.id + ' 查询失败：' + err.message); failed++; continue; }
    await sleep(400);   /* 串行节流：批量核验时 Commons 会以 429 限流 */
    if (info.missing) { console.log('FAIL  ' + ev.id + ' 文件不存在：' + title); failed++; continue; }
    if (!ALLOWED.test(info.license)) {
      console.log('FAIL  ' + ev.id + ' 授权不在白名单：' + info.license + ' · ' + title);
      failed++; continue;
    }

    const name = ev.id + '-' + (i + 1) + '.webp';
    const outFile = path.join(mediaDir, name);
    const rel = 'assets/media/' + name;
    let size = fs.existsSync(outFile) ? fs.statSync(outFile).size : 0;

    if (!size) {
      if (!WRITE) {
        console.log('PLAN  ' + ev.id + ' ← ' + title + ' · ' + info.license + ' · ' + info.width + 'x' + info.height);
        ok++; continue;
      }
      let buf;
      try { buf = await req(info.thumb, false); }
      catch (err) { console.log('FAIL  ' + ev.id + ' 下载失败：' + err.message); failed++; continue; }
      try { const r = await toWebp(sharp, buf, outFile); size = r.size; }
      catch (err) { console.log('FAIL  ' + ev.id + ' 转码失败：' + err.message); failed++; continue; }
      await sleep(350);   /* 对 Commons 温柔一点，避免 429 */
    } else {
      skipped++;
    }

    const credit = [cleanArtist(info.artist), info.license].filter(Boolean).join(' · ') || 'Wikimedia Commons';
    audit.push({
      event: ev.id, file: rel, title, license: info.license, artist: cleanArtist(info.artist),
      bytes: size, source: m.url
    });

    if (WRITE) {
      m.src = rel;
      m.credit = credit;
      /* url 保持原文件页（已编码，可直接点开核对授权） */
    }
    ok++;
    console.log('OK    ' + ev.id + ' ' + (size / 1024).toFixed(0) + 'KB · ' + credit + ' · ' + title);
  }
}

if (WRITE) {
  fs.writeFileSync(path.join(root, 'data/events.json'), JSON.stringify(events, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'data/media-audit.json'), JSON.stringify(audit, null, 2) + '\n');
  console.log('\n写入 events.json 与 data/media-audit.json');
}
console.log('\n汇总：' + ok + ' 就绪 / ' + skipped + ' 复用 / ' + failed + ' 失败' + (WRITE ? '' : '（预览模式，未写盘）'));
if (failed) process.exitCode = 2;
