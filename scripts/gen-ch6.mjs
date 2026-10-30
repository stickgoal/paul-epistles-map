/* M4 事件生成器（ch6 罗马被囚与尾声 · 徒 28:17-31 + 监狱书信 + 传统）
 *
 * 与 gen-m3.mjs 同一纪律：经文正文不手写，一律由 scripts/verses.mjs 的
 * extract() 从两个独立和合本数据源提取并校验；match !== true 直接中止生成
 * （双源用字不一致 = 该节存在未裁定的版本差异，必须先人工判读，不得静默落库）。
 *
 * 媒体：此处只写 title / kind / url（Commons 文件页）。src 与 credit 由
 * scripts/localize-media.mjs 依据 API 元数据回填并落地为本地 webp，
 * 避免「凭记忆拼文件名 / 凭印象写授权」。
 *
 * 用法：node scripts/gen-ch6.mjs
 * 幂等：按 id 覆盖或追加，重复执行结果一致。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from './verses.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

/* 经文注入：任何一条双源不一致都中止（退出码 2），绝不带病落库 */
const cache = new Map();
function V(...refs) {
  return refs.map((ref) => {
    if (!cache.has(ref)) {
      const r = extract(ref);
      if (r.match !== true) {
        console.error('经文双源不一致，先判读再落库：' + ref);
        console.error('  主源：' + (r.diffMain || ''));
        console.error('  交叉：' + (r.diffCross || ''));
        process.exit(2);
      }
      cache.set(ref, r.text);
    }
    return { ref, text: cache.get(ref) };
  });
}

/* 媒体：url 为 Commons 文件页；src/credit 由 localize-media.mjs 回填 */
const M = (kind, title, url) => ({ kind, title, src: null, credit: null, url });

const CH6 = [
  {
    id: 'ch6-leaders', ch: 'ch6', type: 'preach', from: 60, to: 60,
    title: '请犹太首领来', en: 'Summoning the Roman Jewish Leaders',
    place: 'rome',
    brief: '抵达三日后请犹太人首领来，陈明上告该撒的缘由',
    narrative: '抵达罗马三天后，保罗请犹太人的首领来，说明自己并没有干犯本国的百姓或祖宗的规条，却被锁链从耶路撒冷解来；他上告该撒，并不是要控告自己的百姓。首领们回答说：并没有收到犹太来的信，也没有弟兄来报信说他有甚么不好；他们愿意听听他的意见，因为这道在各处被毁谤。',
    verses: V('使徒行传 28:17', '使徒行传 28:21-22'),
    media: [M('photo', '提多凯旋门上的圣殿战利品浮雕（罗马广场，AD 81）',
      'https://commons.wikimedia.org/wiki/File:Spoils_from_Jerusalem_-_Arch_of_Titus_-_Rome_2008.jpg')],
    note: '徒 28:17 的「三天」紧接 28:16 的「蒙准与一名看守同住」：保罗在罗马是软禁而非下狱，可以接见访客、也可以向人讲论。'
  },
  {
    id: 'ch6-testimony', ch: 'ch6', type: 'preach', from: 60, to: 60,
    title: '从早到晚讲论', en: 'Reasoning from Morning Till Evening',
    place: 'rome',
    brief: '引摩西的律法和先知的书，以耶稣的事劝勉众人；有信的，有不信的',
    narrative: '约定的日子，许多人到保罗的寓处来。他从早到晚讲论，证明神国的道，引摩西的律法和先知的书，以耶稣的事劝勉他们。行传只留下两句结果：「有信的，有不信的。」福音在帝国的中心同样引起分裂，一如在以哥念、在雅典、在以弗所。',
    verses: V('使徒行传 28:23-24'),
    media: [M('photo', '奥斯蒂亚的多层公寓（insula）——罗马世界平民的典型居所',
      'https://commons.wikimedia.org/wiki/File:OstianInsula.JPG')],
    note: '罗马的 insula 是平民租住的多层楼；保罗「自己所租的房子」当属此类出租房屋，但具体位置不可考。'
  },
  {
    id: 'ch6-unbelief', ch: 'ch6', type: 'preach', from: 60, to: 60,
    title: '油蒙了心', en: 'Hearts Grown Dull',
    place: 'rome',
    brief: '引以赛亚书宣告这百姓油蒙了心；救恩转向外邦人',
    narrative: '谈不拢的时候，保罗引以赛亚的话作结：这百姓油蒙了心，耳朵发沉，眼睛闭着，恐怕他们眼睛看见、耳朵听见、心里明白、回转过来，就得医治。于是他宣告：神这救恩如今传给外邦人，他们也必听受。行传的叙事在这里给出一个判决式的收束——不是保罗被弃绝，而是拒绝的后果落在拒绝者身上。',
    verses: V('使徒行传 28:25-27', '使徒行传 28:28'),
    media: [],
    note: '徒 28:26-27 引《以赛亚书》6:9-10，与太 13:14-15、可 4:11-12、约 12:40 引用同一段，是初代教会解释「为何以色列中有不信」的标准经文。'
  },
  {
    id: 'ch6-two-years', ch: 'ch6', type: 'preach', from: 60, to: 62,
    title: '在自己所租的房子里', en: 'Two Years in His Own Rented House',
    place: 'rome',
    brief: '足足两年，凡来见他的人全都接待，放胆传讲神国的道',
    narrative: '保罗在自己所租的房子里住了足足两年。凡来见他的人，他全都接待，放胆传讲神国的道，将主耶稣基督的事教导人，并没有人禁止。行传就在这里结束——没有判决，没有殉道，也没有罗马教会的情景，只有一句「并没有人禁止」。',
    verses: V('使徒行传 28:30-31'),
    media: [M('art', '伦勃朗《狱中的保罗》（1627，斯图加特国立美术馆）',
      'https://commons.wikimedia.org/wiki/File:Rembrandt_St._Paul_in_Prison.jpg')],
    note: '行传的结尾是开放式的：路加止于两年期满，未交代上诉结果。有学者据此推测审讯尚未结束，也有学者认为路加写作时案件已有分晓、无须再述。'
  },
  {
    id: 'ch6-ephesians', ch: 'ch6', type: 'letter', from: 60, to: 62,
    title: '写《以弗所书》', en: 'Letter to the Ephesians',
    place: 'rome',
    brief: '自称「为你们外邦人作了基督耶稣被囚的」，请教会为他求口才',
    narrative: '被囚期间，保罗写信给亚细亚的众教会。他自称「为你们外邦人作了基督耶稣被囚的」，把捆锁重新解释为福音的奥秘向外邦人敞开的记号；信的末了，他请教会为他祈求口才，使他能放胆开口讲明福音的奥秘。',
    verses: V('以弗所书 6:19-20'),
    media: [M('photo', '以弗所：塞尔苏斯图书馆（公元 2 世纪）——亚细亚行省省会的公共建筑',
      'https://commons.wikimedia.org/wiki/File:Ephesus_-_Celsus_Library.jpg')],
    note: '《以弗所书》部分早期抄本（P46、Vaticanus）在 1:1 没有「在以弗所」字样，故有学者主张它是写给亚细亚众教会的通函；本图沿用传统书名。监狱书信（弗、腓、西、门）的写作地点有罗马、以弗所、凯撒利亚三说，本项目取罗马说。'
  },
  {
    id: 'ch6-colossians', ch: 'ch6', type: 'letter', from: 60, to: 62,
    title: '写《歌罗西书》', en: 'Letter to the Colossians',
    place: 'rome',
    brief: '求神开传道的门，讲基督的奥秘；信要念给老底嘉教会听',
    narrative: '歌罗西教会并非保罗亲手建立，他却是为它被捆锁的。他请信徒为他祷告，求神给他们开传道的门，能以讲基督的奥秘；信末特别嘱咐要念给老底嘉的教会听，也要读从老底嘉来的信。',
    verses: V('歌罗西书 4:3'),
    media: [M('art', 'P46 双叶：罗马书末、腓立比书末与歌罗西书首（切斯特·比替图书馆，约 AD 200）',
      'https://commons.wikimedia.org/wiki/File:Dublin,_Chester_Beatty_Ms_BP_II_fol._15%2690_Bifolio_from_Paul%27s_Letter_to_the_Romans,_the_end_of_Paul%27s_Letter_to_the_Philippians_and_the_beginning_of_Paul%27s_Letter_to_the_Colossians.jpg')],
    note: '歌罗西书与腓利门书由同一批人（推基古、阿尼西母）带往亚细亚（西 4:7-9），两封信因此常被视为同一时期写成。'
  },
  {
    id: 'ch6-philemon', ch: 'ch6', type: 'letter', from: 60, to: 62,
    title: '写《腓利门书》', en: 'Letter to Philemon',
    place: 'rome',
    brief: '为逃奴阿尼西母求情：不再是奴仆，乃是亲爱的兄弟',
    narrative: '阿尼西母是歌罗西人腓利门的奴仆，逃到保罗那里，在捆锁中听了福音。保罗写信给腓利门，不命令、只央求：阿尼西母「暂时离开你，或者是叫你永远得著他」，不再是奴仆，乃是高过奴仆的亲爱的兄弟。这封只有一章的私信，是古代世界对奴隶制度最锋利的一次内部质疑。',
    verses: V('腓利门书 1:15-16'),
    media: [M('art', '瓦伦丁·德·布洛涅《保罗写信》（约 1620，休斯敦美术馆）',
      'https://commons.wikimedia.org/wiki/File:Valentin_de_Boulogne_-_Saint_Paul_Writing_His_Epistles_-_BF.1991.4_-_Museum_of_Fine_Arts.jpg')],
    note: '保罗没有直接要求释放阿尼西母，而是把他作为「亲爱的兄弟」送回主人那里；这一处理在废奴史上被反复讨论。'
  },
  {
    id: 'ch6-philippians', ch: 'ch6', type: 'letter', from: 61, to: 62,
    title: '写《腓立比书》', en: 'Letter to the Philippians',
    place: 'rome',
    brief: '我所遭遇的事更是叫福音兴旺；御营全军都知道我是为基督的缘故',
    narrative: '腓立比教会是保罗在欧洲建立的第一座教会，也是最早资助他的教会。被囚中他写信回去：我所遭遇的事更是叫福音兴旺，以致御营全军和其余的人都知道我是为基督的缘故受捆锁；并且那在主里的弟兄，多半因我受的捆锁，就笃信不疑，越发放胆传神的道。',
    verses: V('腓立比书 1:12-14'),
    media: [M('photo', '腓立比考古遗址：罗马殖民城的街道与公共建筑基址',
      'https://commons.wikimedia.org/wiki/File:Archaeological_site_of_Philippi_BW_2017-10-05_12-54-40.jpg')],
    note: '「御营全军」（πραιτώριον）指罗马的禁卫军营；这封信因此常被定为罗马被囚期间所写，而非以弗所或凯撒利亚。'
  },
  {
    id: 'ch6-released', ch: 'ch6', type: 'arrival', from: 62, to: 62,
    title: '获释', en: 'Released from Custody',
    place: 'rome',
    brief: '传统认为两年期满后获释，再往东方与克里特',
    narrative: '行传没有写审讯的结果。传统（优西比乌、《穆拉多利残卷》）认为保罗在两年期满后获释，随后往克里特、以弗所与马其顿，并留下提多与提摩太料理教会；他在腓利门书里也提到「我盼望藉着你们的祷告，必蒙恩到你们那里去」。这一段行程不见于行传，只能靠教牧书信与传统拼接。',
    verses: V('腓利门书 1:22'),
    media: [M('photo', '尼禄像（卡比托利欧博物馆）——保罗被囚与获释时期的罗马皇帝',
      'https://commons.wikimedia.org/wiki/File:Nero_Musei_Capitolini_MC2825.jpg')],
    note: '「获释—第四次旅程」属传统重建，非行传记载；主张教牧书信为后保罗作品的学者，则认为保罗未曾获释、直接在罗马殉道。'
  },
  {
    id: 'ch6-pastorals', ch: 'ch6', type: 'letter', from: 63, to: 65,
    title: '写《提摩太前书》《提多书》', en: 'The Pastoral Letters',
    place: 'rome',
    brief: '嘱托提摩太在以弗所、提多在克里特设立长老',
    narrative: '若按传统重建，保罗获释后在马其顿写信给留在以弗所的提摩太，又写信给留在克里特的提多，嘱托他们设立长老、抵挡虚浮的教训。信中留下一句常被引用的自述：「基督耶稣降世，为要拯救罪人。这话是可信的，是十分可佩服的。」',
    verses: V('提摩太前书 1:15-16', '提多书 1:5'),
    media: [],
    note: '教牧书信的作者与年代是学界最大分歧之一：传统归保罗（AD 62–64），多数现代学者主张出自保罗之后的门徒（AD 80–100）。本项目按传统年代排入叙事，并在此保留分歧。'
  },
  {
    id: 'ch6-fire', ch: 'ch6', type: 'persecution', from: 64, to: 64,
    title: '罗马大火与尼禄的逼迫', en: 'The Fire of Rome and Nero\'s Persecution',
    place: 'rome',
    brief: '大火之后，基督徒被指为纵火者，成为尼禄的替罪羊',
    narrative: '公元 64 年夏，罗马大火焚城六日。尼禄为平息众怒，把纵火的罪名加在基督徒身上：他们被披上兽皮让狗撕裂，被钉在十字架上，被点上火当作夜间的灯。塔西佗记下这段文字时并不友善，却无意间为十字架之道留下了最早的异教旁证。传统认为保罗与彼得都在这一轮逼迫中殉道。',
    verses: V('彼得前书 4:12-14'),
    media: [M('art', '亨利克·西米拉兹基《尼禄的火炬》（1882，克拉科夫）',
      'https://commons.wikimedia.org/wiki/File:Henryk_Siemiradzki_-_Pochodnie_Nerona.jpg')],
    note: '此事仅见于塔西佗《编年史》15.44 与苏埃托尼乌斯《尼禄传》，行传未载；此处引《彼得前书》4:12-14 作同一逼迫背景下的旁证，非保罗本人的文字。'
  },
  {
    id: 'ch6-2tim', ch: 'ch6', type: 'letter', from: 66, to: 67,
    title: '写《提摩太后书》', en: 'Second Letter to Timothy',
    place: 'rome',
    brief: '「那美好的仗我已经打过了」——狱中的最后一封信',
    narrative: '保罗再次被囚，这一次不再是租屋软禁。他写信给提摩太，说自己被浇奠、离世的时候到了：「那美好的仗我已经打过了，当跑的路我已经跑尽了，所信的道我已经守住了。」他要提摩太赶紧来，把马可带来，把书卷和皮卷带来——一个在死囚牢里仍然要读书的人。',
    verses: V('提摩太后书 1:8', '提摩太后书 2:9', '提摩太后书 4:6-8'),
    media: [M('photo', '马梅尔定监狱（Mamertine）：卡比托利欧山脚的古罗马狱室',
      'https://commons.wikimedia.org/wiki/File:Mamertine_Prison.jpg')],
    note: '传统把保罗第二次被囚的地点定在马梅尔定监狱；此处仅为传统推定，行传与新约均未提及具体牢址。《提摩太后书》的作者问题与教牧书信同。'
  },
  {
    id: 'ch6-martyrdom', ch: 'ch6', type: 'persecution', from: 67, to: 67,
    title: '殉道', en: 'Martyrdom in Rome',
    place: 'rome',
    brief: '传统记他在奥斯提亚大道被斩首，葬于城外',
    narrative: '传统说保罗以罗马公民的身份被斩首，而非钉十字架；行刑处在城外的奥斯提亚大道，一说在今日的三泉。革利免在公元 96 年前后写道：保罗「到过西边的极处」，在罗马「在官长面前作证」，然后「离开了世界」。他的墓上后来建起了城外圣保罗大殿。',
    verses: V('提摩太后书 4:17-18'),
    media: [M('photo', '城外圣保罗大殿：传统上保罗葬于此处',
      'https://commons.wikimedia.org/wiki/File:Front_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_-_Roma_-_Italy.jpg')],
    note: '殉道年代有 AD 64（尼禄大火后）与 AD 67（传统年表）两说，本项目取 AD 67。革利免《致哥林多人书》5 章是最早的旁证，未记行刑方式；「斩首」出自后世传统（《保罗行传》、优西比乌）。'
  }
];

/* 写入 events.json：按 id 覆盖，新事件追加在本章末尾，全量按章节重排 */
const events = read('data/events.json');
const byId = new Map(events.map((e) => [e.id, e]));
CH6.forEach((ev) => byId.set(ev.id, ev));

const order = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'];
const out = [];
order.forEach((ch) => {
  const list = [...byId.values()].filter((e) => e.ch === ch);
  /* 章内保持既有顺序，新事件按其在 CH6 中的定义顺序追加 */
  if (ch === 'ch6') list.sort((a, b) => CH6.findIndex(x => x.id === a.id) - CH6.findIndex(x => x.id === b.id));
  out.push(...list);
});

fs.writeFileSync(path.join(root, 'data/events.json'), JSON.stringify(out, null, 2) + '\n');
console.log('ch6 事件写入：' + CH6.length + ' 条；事件总数 ' + out.length);
console.log('经文条数：' + CH6.reduce((a, e) => a + e.verses.length, 0) + '（全部双源一致）');
