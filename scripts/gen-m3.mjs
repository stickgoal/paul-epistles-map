/* M3 事件生成器（ch4 被捕与受审 / ch5 赴罗马航程）
 *
 * 为什么用脚本而不是手写 events.json：
 *   M2 的教训 —— 人眼转录经文必出错（米推利宁→米推利尼、过了几天→过了这几天）。
 *   本脚本只写【叙事层】数据（标题/摘要/叙事/媒体），经文正文一律
 *   从 data/refs-m3.json 按 ref 键【程序化注入】，从根上杜绝转录错误。
 *
 * 用法：node scripts/gen-m3.mjs
 *   读 data/refs-m3.json + 本文件的 EVENTS 定义 → 写回 data/events.json
 *
 * 幂等：重复执行结果一致（按 id 覆盖或追加）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

const refs = read('data/refs-m3.json');
const byRef = {};
refs.forEach(r => { byRef[r.ref] = r.text; });

/* 媒体：全部经 scripts/commons.mjs API 核验存在性与授权（credit 含授权名 + 溯源 url） */
const MEDIA = {
  templeWall: { kind: 'site', title: '耶路撒冷圣殿西墙', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Westen_%28Wailing%29_Wall%2C_Jerusalem%2C_2007.jpg/960px-Westen_%28Wailing%29_Wall%2C_Jerusalem%2C_2007.jpg', credit: 'Godot13 · CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Westen_(Wailing)_Wall,_Jerusalem,_2007.jpg' },
  templeAerial: { kind: 'site', title: '圣殿山航拍（旧圣殿遗址）', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Jerusalem-2013-Aerial-Temple_Mount_03.jpg/960px-Jerusalem-2013-Aerial-Temple_Mount_03.jpg', credit: 'Godot13 · CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Jerusalem-2013-Aerial-Temple_Mount_03.jpg' },
  caesarea: { kind: 'site', title: '凯撒利亚的高架引水道', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Caesarea-13-Aqueducts.jpg/960px-Caesarea-13-Aqueducts.jpg', credit: 'Ian and Wendy Sewell · CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Caesarea-13-Aqueducts.jpg' },
  syracuse: { kind: 'site', title: '叙拉古的希腊剧场', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/The_Greek_theatre_of_Syracuse%2C_Sicily.jpg/960px-The_Greek_theatre_of_Syracuse%2C_Sicily.jpg', credit: 'Nicolas Chadeville · CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:The_Greek_theatre_of_Syracuse,_Sicily.jpg' },
  maltaBay: { kind: 'site', title: '圣保罗湾（保罗遇难登陆处）', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/St_Paul%27s_Islands%2C_Malta.jpg/960px-St_Paul%27s_Islands%2C_Malta.jpg', credit: '公有领域（Public domain）', url: "https://commons.wikimedia.org/wiki/File:St_Paul's_Islands,_Malta.jpg" },
  maltaChurch: { kind: 'site', title: '沉船湾的圣保罗船难教堂', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/St_Paul_Bay_Shipwreck_Church_Malta_1.jpg/960px-St_Paul_Bay_Shipwreck_Church_Malta_1.jpg', credit: 'Karelj · CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:St_Paul_Bay_Shipwreck_Church_Malta_1.jpg' },
  thornhill: { kind: 'art', title: '詹姆斯·桑希尔的《马耳他沉难》（圣保罗座堂藏）', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/James_Thornhill_%281675-1676-1734%29_-_Shipwreck_at_Malta_-_8208_-_St_Paul%27s_Cathedral.jpg/960px-James_Thornhill_%281675-1676-1734%29_-_Shipwreck_at_Malta_-_8208_-_St_Paul%27s_Cathedral.jpg', credit: 'James Thornhill · 公有领域（Public domain）', url: "https://commons.wikimedia.org/wiki/File:James_Thornhill_(1675-1676-1734)_-_Shipwreck_at_Malta_-_8208_-_St_Paul's_Cathedral.jpg" },
  forum: { kind: 'site', title: '罗马广场遗址', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Ruins_of_Roman_Forum_Rome.JPG/960px-Ruins_of_Roman_Forum_Rome.JPG', credit: 'Atoorva · CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Ruins_of_Roman_Forum_Rome.JPG' },
  raphael: { kind: 'art', title: '拉斐尔《保罗在雅典讲道》（1515）', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/V%26A_-_Raphael%2C_St_Paul_Preaching_in_Athens_%281515%29.jpg/960px-V%26A_-_Raphael%2C_St_Paul_Preaching_in_Athens_%281515%29.jpg', credit: 'Raphael · 公有领域（Public domain）', url: 'https://commons.wikimedia.org/wiki/File:V&A_-_Raphael,_St_Paul_Preaching_in_Athens_(1515).jpg' },
  tyre: { kind: 'site', title: '推罗古城柱础', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/TyreAlMinaSite_ColumnBase-BirdRelief_RomanDeckert09102019.jpg/960px-TyreAlMinaSite_ColumnBase-BirdRelief_RomanDeckert09102019.jpg', credit: 'RomanDeckert · CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:TyreAlMinaSite_ColumnBase-BirdRelief_RomanDeckert09102019.jpg' }
};

const V = (ref) => [{ ref, text: byRef[ref] }];
const M = (...keys) => keys.map(k => MEDIA[k]).filter(Boolean);

/* ================= ch4 被捕与受审（徒 21–26，AD 57–59） ================= */
const CH4 = [
  {
    id: 'ch4-jerusalem-welcome', ch: 'ch4', type: 'arrival', from: 57, to: 57,
    title: '见雅各与长老', en: 'Meeting James and the Elders',
    place: 'jerusalem',
    brief: '见到雅各与长老们，述说外邦人中间所行之事',
    narrative: '抵达耶路撒冷后的第二天，保罗去见雅各，长老们也都在那里。他问过安，便将神用他传教、在外邦人中间所行之事一一地述说了。他们听见，就归荣耀与神，又提醒保罗：犹太人中信主的有多少万，并且都为律法热心；也听说过有人说他教训一切在外邦的犹太人离弃摩西。保罗知道自己面对的是一场硬仗——他正是来补上把外邦人带进圣殿这一环的。',
    verses: V('使徒行传 21:17-19'), media: M('templeWall')
  },
  {
    id: 'ch4-temple-riot', ch: 'ch4', type: 'persecution', from: 57, to: 57,
    title: '圣殿骚动', en: 'Riot in the Temple',
    place: 'jerusalem',
    brief: '被指「带外邦人进殿污秽圣地」，群情激愤',
    narrative: '保罗带着四个人进了殿，报明洁净的日期满足，只等祭司献祭。那七日将完，从亚西亚来的犹太人看见保罗在殿里，就耸动了众人，下手拿他，喊叫说：以色列人来帮助，这就是在各处教训众人蹧践我们百姓和律法、并这地方的；又带着希利尼人进殿，污秽了这圣地。指控本身并非虚言——保罗确实做过这件事，而这正是他此刻冒着性命危险的缘由。',
    verses: V('使徒行传 21:26-28'), media: M('templeAerial')
  },
  {
    id: 'ch4-arrested', ch: 'ch4', type: 'persecution', from: 57, to: 57,
    title: '被千夫长拿住', en: 'Seized by the Commander',
    place: 'jerusalem',
    brief: '全城震动，千夫长带兵制止混乱，把他押进营楼',
    narrative: '合城都震动，百姓一齐跑来拿住保罗、拉他出殿，殿门立刻都关了。他们正想要杀他，有人报信给营里的千夫长说耶路撒冷合城都乱了。千夫长立时带着兵丁和几个百夫长跑下去，止住不打保罗，上前拿住他，吩咐用两条铁炼捆锁；又问他是甚么人、做的是甚么事。众人有喊叫这个的，有喊叫那个的，得不著实情，他就吩咐人把保罗带进营楼。',
    verses: V('使徒行传 21:30-34'), media: []
  },
  {
    id: 'ch4-speech', ch: 'ch4', type: 'preach', from: 57, to: 57,
    title: '站在台阶上讲道', en: 'Speaking to the Crowd',
    place: 'jerusalem',
    brief: '自报家门：基利家大数人；获准向百姓说话',
    narrative: '在营楼里，保罗开口第一句是：「我本是犹太人，生在基利家的大数，并不是无名小城的人。求你准我对百姓说话。」——这句话既是为自己辩解，也是他一贯的风格：先让人听清他是谁，再谈他说什么。千夫长准了。保罗就站在台阶上向百姓摆手，他们都静默无声，他便用希伯来话对他们说。这次的讲道对象不再是外邦人，而是他自己的同胞。',
    verses: V('使徒行传 21:39-40'), media: []
  },
  {
    id: 'ch4-roman-citizen', ch: 'ch4', type: 'trial', from: 57, to: 57,
    title: '罗马公民的身份', en: 'A Roman Citizen',
    place: 'jerusalem',
    brief: '众人喊要杀他，千夫长要鞭打；保罗以罗马公民身份制止',
    narrative: '众人听他说到「以色列人哪，我们都是正经的希伯来人」，就高声喊：「这样的人，从世上除掉他罢！他是不当活著的。」喧嚷、摔衣裳、把尘土向空中扬起来。千夫长吩咐将保罗带进营楼，要用鞭子拷问他。皮条刚捆上，保罗对旁边的百夫长说：「人是罗马人，又没有定罪，你们就鞭打他，有这个例么？」罗马公民法在此时成了他唯一的护身符——这句话使鞭打停了下来。',
    verses: V('使徒行传 22:22-25'), media: []
  },
  {
    id: 'ch4-sanhedrin', ch: 'ch4', type: 'trial', from: 57, to: 57,
    title: '在公会面前', en: 'Before the Sanhedrin',
    place: 'jerusalem',
    brief: '在公会中喊出「为盼望死人复活」，两党争辩起来',
    narrative: '第二天，千夫长为要知道犹太人控告保罗的实情，解开他，吩咐祭司长和全公会的人聚集，将他带下来。保罗看出大众一半是撒都该人、一半是法利赛人，就大声说：「弟兄们，我是法利赛人，也是法利赛人的子孙。我现在受审问，是为盼望死人复活。」这一句掷地有声的话，让两党立刻分裂：撒都该人说没有复活，也没有天使和鬼魂；法利赛人说两样都有。于是大大的喧嚷起来，几个法利赛党的文士甚至说看不出这人有甚么恶处。千夫长怕他们把保罗扯碎，就把他抢回营楼。',
    verses: V('使徒行传 22:30'), media: []
  },
  {
    id: 'ch4-resurrection-debate', ch: 'ch4', type: 'trial', from: 57, to: 57,
    title: '复活之辩', en: 'The Debate over Resurrection',
    place: 'jerusalem',
    brief: '「我为盼望死人复活受审问」，公会更混乱',
    narrative: '这一节把保罗在公会前的自辩完整记下：他声明自己是法利赛人，是法利赛人的子孙，受审问是为盼望死人复活。这句话让会众分为两党，喧嚷不已，连文士都找不到他有什么恶处。保罗在意的不是脱罪，而是让「复活」这题目进入罗马官员的视野——从此往后，每一次审理都在重复这一核心。',
    verses: V('使徒行传 23:6-10'), media: []
  },
  {
    id: 'ch4-plot', ch: 'ch4', type: 'persecution', from: 57, to: 57,
    title: '四十人的埋伏', en: 'The Forty Men’s Plot',
    place: 'jerusalem',
    brief: '四十余人起誓不杀保罗不吃喝，外甥报信',
    narrative: '到了天亮，犹太人同谋起誓：若不先杀保罗就不吃不喝；这样同心起誓的有四十多人。他们来见祭司长和长老，说：我们已经起了一个大誓，若不先杀保罗就不吃什么；现在你们和公会要知会千夫长，叫他带下保罗到你们这里来，假作要详细察考他的事；我们已经预备好了，不等他来到跟前就杀他。保罗的外甥听见他们设下埋伏，就来到营楼里告诉保罗——一个不识之人的一句话，救了一条命。',
    verses: V('使徒行传 23:12-16'), media: []
  },
  {
    id: 'ch4-escape', ch: 'ch4', type: 'persecution', from: 57, to: 57,
    title: '连夜解送凯撒利亚', en: 'Sent to Caesarea Under Guard',
    place: 'jerusalem',
    brief: '千夫长派二百步兵、七十马兵护送保罗去见巡抚腓力斯',
    narrative: '保罗的外甥带来的消息使千夫长当夜调兵：预备步兵二百、马兵七十、长枪手二百，亥初往该撒利亚去；也要预备牲口叫保罗骑上，护送到巡抚腓力斯那里去。千夫长还嘱咐少年人不要告诉人他曾来报信。表面上这是一次例行的移交，实际上保罗是被自己的同胞用四十把刀逼着离开耶路撒冷的——而罗马的machinery 恰恰因此接住了他。',
    verses: V('使徒行传 23:21-24'), media: []
  },
  {
    id: 'ch4-felix', ch: 'ch4', type: 'trial', from: 58, to: 58,
    title: '腓力斯的控告', en: 'The Accusation before Felix',
    place: 'caesarea',
    brief: '大祭司与帖士罗指控保罗「扰乱天下」',
    narrative: '保罗被提了来，帖士罗就告他说：腓力斯大人，我们因你得以大享太平，并且这一国的弊病，因着你的先见得以更正要；我们随时随地满心感谢不尽。只求你宽容听我们说几句话。控告的策略很成熟：先给巡抚戴一顶「天下太平」的帽子，再把保罗说成那个破坏这太平的人。这是保罗在罗马体制下经历的第一场正式审理，而被告席上的他，手里唯一的东西是口才与信念。',
    verses: V('使徒行传 24:2-4'), media: M('caesarea')
  },
  {
    id: 'ch4-defense', ch: 'ch4', type: 'trial', from: 58, to: 58,
    title: '分诉：十二天', en: 'His Defense: Twelve Days',
    place: 'caesarea',
    brief: '自上耶路撒冷礼拜到今日不过十二天，未曾在殿中或会堂辩论',
    narrative: '巡抚点头叫保罗说话，他就说：我知道你在这国里断事多年，所以我乐意为自己分诉；你查问就可以知道，从我上耶路撒冷礼拜到今日不过有十二天；他们并没有看见我在殿里、或是在会堂里、或是在城里和人辩论、耸动众人；他们现在所告我的事并不能对你证实了。——十二天这个数字，是对「搅乱天下」最有力的反驳。',
    verses: V('使徒行传 24:10-13'), media: []
  },
  {
    id: 'ch4-felix-prison', ch: 'ch4', type: 'persecution', from: 58, to: 58,
    title: '腓力斯的私牢', en: 'Felix’s Private Prison',
    place: 'caesarea',
    brief: '腓力斯屡次叫他来谈论，又指望他送银钱；两年后留他在监里',
    narrative: '腓力斯又指望保罗送他银钱，所以屡次叫他来，和他谈论——谈论公义、节制和将来的审判，这些话题让腓力斯甚觉恐惧，「你暂且去罢，等我得便再叫你来」。两年过去，波求非斯都接了腓力斯的任，腓力斯为讨犹太人的喜欢，就把保罗留在监里。从「自由地在营楼受审」到「留监」，是保罗处境的实际变化——虽然他得到的居住条件远非牢房。',
    verses: V('使徒行传 24:26-27'), media: []
  },
  {
    id: 'ch4-festus', ch: 'ch4', type: 'trial', from: 58, to: 58,
    title: '非斯都的审理', en: 'Trial before Festus',
    place: 'caesarea',
    brief: '保罗说「我站在该撒的堂前」，非斯都欲送他回耶路撒冷',
    narrative: '非斯都到了凯撒利亚，第二天坐堂吩咐将保罗提上来。犹太人的长老围着站着，控告许多重大的事，却都是不能证实的。保罗分诉说：无论犹太人的律法，或是圣殿，或是该撒，我都没有干犯。但非斯都要讨犹太人的喜欢，就问他愿不愿意上耶路撒冷去在那里听审。保罗的回答掷地有声：「我站在该撒的堂前，这就是我应当受审的地方。」一个可上訴的帝国，一个不可上诉的圣殿——他选了罗马。',
    verses: V('使徒行传 25:6-10'), media: []
  },
  {
    id: 'ch4-agrippa', ch: 'ch4', type: 'trial', from: 58, to: 58,
    title: '亚基帕王驾临', en: 'King Agrippa Arrives',
    place: 'caesarea',
    brief: '亚基帕与百尼基来；非斯都先声明不判他的罪',
    narrative: '过了些日子，亚基帕王和百尼基氏来到该撒利亚。非斯都向王解释：这一个人是腓利斯留在监里的；我在耶路撒冷的时候祭司长和犹太的长老将他的事禀报了我，求我定他的罪；我对他们说，被告还没有和原告对质、未得机会分诉所告他的事，就先定他的罪，这不是罗马人的条例。及至他们都来到这里，我就不耽延，第二天便坐堂。告他的人所告的，并没有他所逆料的那等恶事，不过是有几样辩论，为他们自己敬鬼神的事，又为一个人名叫耶稣是已经死了、保罗却说他是活着的。这些事当怎样究问，我心里作难。',
    verses: V('使徒行传 25:13-21'), media: []
  },
  {
    id: 'ch4-apologia', ch: 'ch4', type: 'trial', from: 58, to: 58,
    title: '亚基帕面前的申辩', en: 'Apology before Agrippa',
    place: 'caesarea',
    brief: '自述生平、按最严紧的教门作了法利赛人，指望神所应许的',
    narrative: '亚基帕说：「准你为自己辩明。」保罗于是说：亚基帕王啊，犹太人所告我的一切事，今日得在你面前分诉，实为万幸；更可幸的，是你熟悉犹太人的规矩和他们的辩论，所以求你耐心听我。我从起初在本国的民中并在耶路撒冷自幼为人如何，犹太人都知道；他们若肯作见证就晓得，我从起初是按着我们教中最严紧的教门作了法利赛人。现在我站在这里受审，是因为指望神向我们祖宗所应许的——这应许，我们十二个支派昼夜切切地事奉神，都指望得着。他讲了自己曾经多方攻击拿撒勒人耶稣的名、在各会堂强逼圣徒认亵渎的话，也讲了自己为何如今站在这里。',
    verses: V('使徒行传 26:1-11'), media: M('raphael')
  },
  {
    id: 'ch4-resurrection', ch: 'ch4', type: 'trial', from: 58, to: 58,
    title: '「你癫狂了罢」', en: '“You are raving!”',
    place: 'caesarea',
    brief: '非斯都斥其癫狂；保罗说「我向王放胆直言」，请亚基帕信先知',
    narrative: '保罗这样分诉，非斯都大声说：「保罗，你癫狂了罢。你的学问太大，反叫你癫狂了！」保罗答：非斯都大人，我不是癫狂，我说的乃是真实明白话；我深信这些事没有一件向王隐藏的，因都不是在背地里做的。亚基帕王啊，你信先知么？我知道你是信的。亚基帕对保罗说：「你想少微一劝，便叫我作基督徒啊！」保罗说：无论是少劝是多劝，我向神所求的不但你一个人，就是今天一切听我的都要像我一样，只是不要像我有这些锁链。锁链成了最具体的对比——他们有信仰却无自由，他有锁链却指向万民。',
    verses: V('使徒行传 26:24-29'), media: []
  },
  {
    id: 'ch4-acquitted', ch: 'ch4', type: 'trial', from: 59, to: 59,
    title: '无可定罪', en: 'Found Guilty of Nothing',
    place: 'caesarea',
    brief: '亚基帕与巡抚私下商议：「没有该死该绑的罪」，当释放',
    narrative: '退到里面，彼此谈论说：「这人并没有犯什么该死该绑的罪。」亚基帕又对非斯都说：「这人若没有上告于该撒，就可以释放了。」这是全书第一次，罗马官员明确说出保罗「没有犯罪」——但保罗既然已经上告，就不能就地释放，只能解往罗马。这句评语为他抵达帝国首都开出了路，也让他在接下来的两年里，等待皇帝的裁决。',
    verses: V('使徒行传 26:31-32'), media: []
  }
];

/* ================= ch5 赴罗马航程（徒 27–28:16，AD 59–60） ================= */
const CH5 = [
  {
    id: 'ch5-embark', ch: 'ch5', type: 'arrival', from: 59, to: 59,
    title: '从凯撒利亚上船', en: 'Embarking from Caesarea',
    place: 'caesarea',
    brief: '交给百夫长犹推斯；乘亚大米田的船，沿海走',
    narrative: '非斯都定规了叫他们坐船往义大利去，便将保罗和别的囚犯交给御营里的一个百夫长，名叫犹推斯。有一只亚大米田的船，要沿着亚西亚一带地方的海边走，保罗他们就上了那船开行。第二日到了西顿，犹推斯宽待保罗，准他往朋友那里去受他们的照应；从那里又开船，因为风不顺，就贴着居比路背风岸行去，过了基利家、旁非利亚前面的海，就到了吕家的每拉。在那里，百夫长遇见一只亚力山大的船要往义大利去，便叫他们上了那船。',
    verses: V('使徒行传 27:1-6'), media: []
  },
  {
    id: 'ch5-sidon', ch: 'ch5', type: 'arrival', from: 59, to: 59,
    title: '西顿探友', en: 'Ashore at Sidon',
    place: 'sidon',
    brief: '百夫长准他上岸与朋友相见',
    narrative: '腓尼基海岸的第一站。船因风不顺而贴岸缓行，百夫长犹推斯给了保罗一项别人没有的优待：准他往朋友那里去，受他们的照应。这不是押解途中的例行停靠，而是一次具体的友谊——保罗在腓尼基的旧交；推罗是腓尼基的港口大城，但保罗的根不在这里。他的根在耶路撒冷，在安提阿，在一个个刚建立起来的教会。',
    verses: V('使徒行传 27:3-4'), media: []
  },
  {
    id: 'ch5-myra', ch: 'ch5', type: 'arrival', from: 59, to: 59,
    title: '每拉换船', en: 'Changing Ships at Myra',
    place: 'myra',
    brief: '呂基亚港口，换乘亚历山大来的船',
    narrative: '船沿着小亚细亚南岸缓慢西行，走了很久才到每拉——呂基亚的主要港口。百夫长在那里遇见一只亚历山大的船，正好要往义大利去，于是全船人改乘这一只。这次换船意味着旅程的方向与规模都变了：从沿海航行的小船，转入跑地中海贸易航线的大船。保罗在甲板上的最后一段旅程，就从这间港口开始。',
    verses: V('使徒行传 27:5-6'), media: []
  },
  {
    id: 'ch5-fair-haven', ch: 'ch5', type: 'arrival', from: 59, to: 59,
    title: '滞留佳澳', en: 'Stranded at Fair Havens',
    place: 'fair-haven',
    brief: '风阻难行，行船又危险；保罗劝改航，非尼基过冬被拒',
    narrative: '一连多日船行得慢，仅仅来到革尼土的对面；被风拦阻，就贴着克里特背风岸从撒摩尼对面行过，沿岸行到名叫佳澳的地方，离那里不远有拉西亚城。走的日子多了，已经过了禁食的节期，行船又危险，保罗就劝众人：众位，我看这次行船不但货物和船要受伤损、大遭破坏，连我们的性命也难保。但百夫长信从掌船的和船主，不信从保罗所说的；且因在这海口过冬不便，船上的人就多半说不如开船离开这地方，或者能到菲尼基过冬。保罗的警告被当作耳旁风——而这场风暴正是他警告的兑现。',
    verses: V('使徒行传 27:7-12'), media: []
  },
  {
    id: 'ch5-storm', ch: 'ch5', type: 'persecution', from: 59, to: 59,
    title: '友拉革罗风', en: 'The Euroclydon Storm',
    place: 'fair-haven',
    brief: '狂风从岛上扑来，抛货抛具，得救的指望都绝了',
    narrative: '微微起了南风，他们以为得意就起了锚，贴近克里特行去。不多几时，狂风从岛上扑下来，那风名叫友拉革罗；船被风抓住，敌不住风，就任风刮去。贴着一个叫「高大」的小岛背风岸奔行，仅仅收住了小船；用缆索捆绑船底，又恐怕在赛耳底沙滩上搁浅，就落下篷来任船飘去。众人被风浪逼得甚急，第二天就把货物抛在海里，第三天又亲手把船上的器具抛弃了。太阳和星辰多日不显露，又有狂风大浪催逼，我们得救的指望就都绝了。',
    verses: V('使徒行传 27:13-20'), media: []
  },
  {
    id: 'ch5-reassurance', ch: 'ch5', type: 'preach', from: 59, to: 59,
    title: '「你们可以放心」', en: 'Take Heart, No One Will Be Lost',
    place: 'fair-haven',
    brief: '保罗说：性命一个也不失丧，惟独失丧这船；必站该撒面前',
    narrative: '众人多日没有吃什么，保罗就出来站在他们中间说：众位，你们本该听我的话，不离开克里特，免得遭这样的伤损破坏。现在我还劝你们放心，你们的性命一个也不失丧，惟独失丧这船。因我所属所事奉的神，他的使者昨夜站在我旁边，说：保罗，不要害怕，你必定站在该撒面前，并且与你同船的人，神都赐给你了。保罗在风浪里所做的，不是求自己脱险，而是把众人的命放在「必站该撒面前」这个应许之下。',
    verses: V('使徒行传 27:21-27'), media: []
  },
  {
    id: 'ch5-shipwreck', ch: 'ch5', type: 'persecution', from: 59, to: 59,
    title: '触礁搁浅', en: 'Running Aground',
    place: 'malta',
    brief: '船头胶住、船尾冲坏；百夫长不许杀囚犯，众人皆得救',
    narrative: '到了天亮，他们不认识那地方，但见一个海湾有岸可登。砍断缆索、弃锚在海，同时松开舵绳拉起头篷，顺着风向岸行去；但遇着两水夹流的地方，就把船搁了浅——船头胶住不动，船尾被浪的猛力冲坏。兵丁的意思是要杀了囚犯，恐怕有洑水脱逃的；百夫长要救保罗，不准他们任意而行，就吩咐会洑水的先跳水，其余的人可以用板子或船上的零碎东西上岸。这样，众人都得了救，上了岸。',
    verses: V('使徒行传 27:39-44'), media: M('thornhill')
  },
  {
    id: 'ch5-barbarian', ch: 'ch5', type: 'miracle', from: 59, to: 59,
    title: '岛民的款待', en: 'Kindness of the Islanders',
    place: 'malta',
    brief: '下雨天冷，土人生火接待；毒蛇咬手却毫发无伤',
    narrative: '他们既已得救，才知道那岛名叫米利大。土人看待他们有非常的情分：因为当时下雨、天气又冷，就生火接待众人。那时保罗拾起一捆柴放在火上，有一条毒蛇因为热了出来，咬住他的手；土人看见那毒蛇悬在他手上，就彼此说：这人必是个凶手，虽然从海里救上来，天理还不容他活着。保罗竟把那毒蛇甩在火里，并没有受伤。土人想他必要肿起来或忽然仆倒死了，看了多时见他无害，就转念说：他是个神。',
    verses: V('使徒行传 28:1-6'), media: M('maltaBay')
  },
  {
    id: 'ch5-publius', ch: 'ch5', type: 'miracle', from: 59, to: 59,
    title: '医好部百流的父亲', en: 'Healing the Father of the Chief Man',
    place: 'malta',
    brief: '为岛长之父祷告按手，岛上其余病人也都得医治',
    narrative: '离那地方不远，有田产是岛长部百流的；他接纳他们，尽情款待三日。当时部百流的父亲患热病和痢疾躺着，保罗进去为他祷告，按手在他身上，治好了他。从此岛上其余的病人也来，得了医治；他们又多方地尊敬他们，到了开船的时候，也把所需用的送到船上。一段与传道无关的插曲，却是保罗在异乡落地生根的样例：先医治，再建立教会。',
    verses: V('使徒行传 28:7-10'), media: M('maltaChurch')
  },
  {
    id: 'ch5-depart-malta', ch: 'ch5', type: 'arrival', from: 60, to: 60,
    title: '过了三个月启航', en: 'Departing Malta after Three Months',
    place: 'malta',
    brief: '乘亚历山大的船（以丢斯双子为记）离岛北上',
    narrative: '过了三个月，他们上了亚历山大的船往前行——这船以丢斯双子为记，是在那海岛过了冬的。三个月的停留是保罗在岛上留下的时间：他不只是被救上岸的囚犯，而是被岛民当作自家人送行的客人。岛上的病人得了医治，部百流的家成了教会，航线从这里重新接上通往帝国首都的水路。',
    verses: V('使徒行传 28:11'), media: M('maltaChurch')
  },
  {
    id: 'ch5-syracuse', ch: 'ch5', type: 'arrival', from: 60, to: 60,
    title: '停泊叙拉古', en: 'Calling at Syracuse',
    place: 'syracuse',
    brief: '在西西里东岸的希腊名城停泊三日',
    narrative: '到了叙拉古，他们停泊三日。这是整段航程里最后一次长期停靠，也是地理上的一个明确坐标——船从马耳他向北、沿西西里东岸而上。叙拉古是希腊化的名城，古代的数学家阿基米德之城。保罗在这里没有讲道、没有治病，只是路过；路加记下这三天，是因为它们标记了「从爱琴海进入西西里、离意大利越来越近」的位置。',
    verses: V('使徒行传 28:12'), media: M('syracuse')
  },
  {
    id: 'ch5-rhegium', ch: 'ch5', type: 'arrival', from: 60, to: 60,
    title: '绕行利基翁', en: 'Rounding Rhegium',
    place: 'rhegium',
    brief: '从叙拉古绕行到利基翁，次日乘南风直抵部丢利',
    narrative: '又从那里绕行，来到利基翁。过了一天，起了南风，第二天就来到部丢利。利基翁就是雷吉姆，在意大利「靴尖」的最南端，与西西里隔海相望——从这里起，保罗踏上的是意大利本土的土地。绕行海峡、再借南风北上，正是古代商船最省力的一条航路。',
    verses: V('使徒行传 28:13'), media: []
  },
  {
    id: 'ch5-puteoli', ch: 'ch5', type: 'arrival', from: 60, to: 60,
    title: '部丢利遇弟兄', en: 'Welcomed at Puteoli',
    place: 'puteoli',
    brief: '罗马的弟兄请他们同住七天',
    narrative: '在部丢利，他们遇见罗马的弟兄，请他们同住七天。这样，就来到罗马——一趟耗时半年以上、经历了一场沉船的航程，终于走完了。从凯撒利亚上船到踏入罗马，用了七个多月的海路；而保罗最后一段路，是靠罗马教会的弟兄在港口接上的。',
    verses: V('使徒行传 28:14'), media: []
  },
  {
    id: 'ch5-rome-arrival', ch: 'ch5', type: 'arrival', from: 60, to: 60,
    title: '进了罗马城', en: 'Entering Rome',
    place: 'rome',
    brief: '弟兄到亚比乌市与三馆迎接；蒙准与一名看守同住',
    narrative: '罗马的弟兄一听见他们的信息就出来，到亚比乌市和三馆地方迎接他们。保罗见了他们，就感谢神，放心壮胆——这是他自耶路撒冷下监以来第一次真正放松。进城后，他蒙准和一个看守他的兵另住在一处，而不是被关进监狱。第五幕在这里收束：一个被四重审讯判定「没有犯罪」的人，靠着公民身份与上诉权走完了两千公里的海路；接下来等待他的，是罗马的两年与《罗马书》的写成。',
    verses: V('使徒行传 28:15-16'), media: M('forum')
  }
];

/* ================= 合并写入 ================= */
const file = path.join(root, 'data/events.json');
const events = read('data/events.json');
const incoming = CH4.concat(CH5);

/* 校验：经文必须全部命中 refs-m3.json（未命中即报错，防 ref 写错） */
const missing = [];
incoming.forEach(ev => (ev.verses || []).forEach(v => {
  if (!byRef[v.ref]) missing.push(ev.id + ' → ' + v.ref);
}));
if (missing.length) {
  console.error('【错误】以下经文 ref 在 data/refs-m3.json 中不存在：\n  ' + missing.join('\n  '));
  process.exit(2);
}

/* 排序策略（关键）：
 *   events.json 的数组顺序【就是】叙事顺序与播放顺序（SEQ 按 from 稳定排序，
 *   同年内保持数组顺序）。因此 M3 事件必须插入到本章的【正确位置】，
 *   不能一律追加到末尾 —— 否则「叙拉古」会被排到「罗马抵达」之后，
 *   描线进度随即回退（check-routes 会直接报错）。
 *   做法：先剔除被 M3 覆盖的旧事件，再把 M3 事件按【章】插入到该章末尾，
 *   章内顺序由 CH4/CH5 数组的定义顺序决定（= 叙事顺序）。 */
const m3Ids = new Set(incoming.map(e => e.id));
const kept = events.filter(e => !m3Ids.has(e.id));

/* 章在总数组中的位置：以该章首个原有事件为锚点；无原有事件则追加到末尾 */
const chapterAnchor = {};
kept.forEach((e, i) => { if (!(e.ch in chapterAnchor)) chapterAnchor[e.ch] = i; });

const CH4_ARR = CH4, CH5_ARR = CH5;
const merged = kept.slice();
/* ch4 在 ch3 之后、ch5 在 ch4 之后 —— 按锚点顺序插入 */
function insertChapter(ch, arr) {
  const anchor = chapterAnchor[ch];
  const at = anchor === undefined ? merged.length : anchor;
  merged.splice(at, 0, ...arr);
}
/* 先插 ch5 再插 ch4：插入 ch4 会推动 ch5 的位置，故倒序插入 */
insertChapter('ch5', CH5_ARR);
insertChapter('ch4', CH4_ARR);

fs.writeFileSync(file, JSON.stringify(merged, null, 2));
console.log('写入完成：原有 ' + events.length + ' 条，M3 覆盖/新增 ' + incoming.length + ' 条，现共 ' + merged.length + ' 条');
console.log('  ch4 被捕与受审：' + CH4.length + ' 条');
console.log('  ch5 赴罗马航程：' + CH5.length + ' 条');
console.log('  经文条数：' + merged.reduce((s, e) => s + (e.verses || []).length, 0));
console.log('  媒体条数：' + merged.reduce((s, e) => s + (e.media || []).length, 0));
/* 打印各章顺序摘要，便于目视核对叙事先后 */
['ch1','ch2','ch3','ch4','ch5','ch6'].forEach(ch => {
  const evs = merged.filter(e => e.ch === ch);
  if (evs.length) console.log('  ' + ch + ' [' + evs.length + ']: ' + evs.map(e => e.title).join(' → '));
});
