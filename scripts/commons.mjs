/* Wikimedia Commons 检索与授权核验（M2 媒体编目用）
 *
 * 用途：为 events.json 的 media 字段挑选**可溯源**的图像。
 * 纪律：媒体只收公有领域（Public domain）或 CC 授权；每条必须带 credit（含授权名）
 *       与溯源 url（commons 文件页）。凭记忆拼文件名必然出错（404 或张冠李戴），
 *       故一律走 API 检索 + 读取授权元数据后再落库。
 *
 * 用法：
 *   node scripts/commons.mjs search "Ephesus theatre" [limit]
 *   node scripts/commons.mjs check "File:Theatre of Ephesus.jpg" [File:...]
 *
 * 输出：每条含 title / url / license / artist / 缩略图直链。
 * 约定：onlyAllowed 只保留 PD 与 CC BY / CC BY-SA / CC0 / PDM 等自由许可。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const API = 'https://commons.wikimedia.org/w/api.php';

/* 允许的授权：公有领域 + 自由 CC（BY / BY-SA / CC0 / PDM） */
const ALLOWED = /^(cc0|cc-by|cc by|cc-by-sa|cc by-sa|pd|public domain|pdm|no restrictions)/i;

const agent = 'geo-story/1.0 (offline bible map project; local academic use)';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* Commons 对高频匿名请求会返回 429。加退避重试，否则批量核验时随机失败。 */
async function api(params, attempt) {
  attempt = attempt || 0;
  const url = API + '?' + new URLSearchParams({ format: 'json', origin: '*', ...params });
  const res = await fetch(url, { headers: { 'User-Agent': agent } });
  if (res.status === 429) {
    if (attempt >= 5) throw new Error('HTTP 429 (rate limited, retries exhausted)');
    const wait = 1500 * (attempt + 1);
    await sleep(wait);
    return api(params, attempt + 1);
  }
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  return res.json();
}

/* 从 imageinfo.extmetadata 取授权与作者；字段名随 Commons 版本变动，逐个兜底 */
function metaOf(info) {
  const m = info.extmetadata || {};
  const pick = (...keys) => {
    for (const k of keys) {
      const v = m[k];
      if (v && v.value) return String(v.value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return '';
  };
  return {
    license: pick('LicenseShortName', 'License', 'UsageTerms'),
    artist: pick('Artist', 'Credit', 'Author'),
    date: pick('DateTimeOriginal', 'DateTime', 'Credit')
  };
}

async function search(q, limit) {
  const r = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: 'filetype:bitmap ' + q,
    gsrnamespace: '6',
    gsrlimit: String(limit || 8),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size',
    iiurlwidth: '640'
  });
  const pages = (r.query && r.query.pages) || {};
  return Object.keys(pages).map(k => {
    const p = pages[k];
    const info = (p.imageinfo && p.imageinfo[0]) || {};
    const meta = metaOf(info);
    return {
      title: p.title,
      url: info.descriptionurl || null,
      thumb: info.thumburl || null,
      width: info.width || 0,
      height: info.height || 0,
      license: meta.license,
      artist: meta.artist,
      allowed: ALLOWED.test(meta.license)
    };
  }).filter(x => x.url);
}

async function check(titles) {
  const r = await api({
    action: 'query',
    titles: titles.join('|'),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size',
    iiurlwidth: '640'
  });
  const pages = (r.query && r.query.pages) || {};
  const missing = (r.query && r.query.missing) || [];
  return {
    found: Object.keys(pages).map(k => {
      const p = pages[k];
      const info = (p.imageinfo && p.imageinfo[0]) || {};
      const meta = metaOf(info);
      return {
        title: p.title,
        url: info.descriptionurl || null,
        thumb: info.thumburl || null,
        license: meta.license,
        artist: meta.artist,
        allowed: ALLOWED.test(meta.license)
      };
    }),
    missing
  };
}

const [, , cmd, ...rest] = process.argv;
if (cmd === 'search') {
  const q = rest[0] || '';
  const rows = await search(q, Number(rest[1] || 8));
  console.log(JSON.stringify(rows, null, 2));
} else if (cmd === 'check') {
  const rows = await check(rest);
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.error('usage: node scripts/commons.mjs search "<query>" [limit] | check "File:X" ...');
  process.exit(1);
}
