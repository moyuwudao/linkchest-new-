/**
 * 本地敏感词词库（500+ 词）
 *
 * 设计目标：
 * - 拦截明显违规内容（黄/赌/毒/枪/骗/盗版）
 * - 不收录政治/宗教/民族等高敏感词（避免被风控标记）
 * - 大小写不敏感，匹配前 lower-case
 * - 命中率 ~70%（明显违规不送审腾讯云）
 *
 * 维护说明：
 * - 修改后无需重启服务（除非部署到生产）
 * - 误判优先于漏判（命中的回退到人工审核）
 * - 拼音/缩写变体收录在对应分类
 *
 * 类别编码（与 TMS Label 兼容）：
 * - Porn          色情/低俗
 * - Gambling      赌博/博彩
 * - Drug          毒品/违禁药品
 * - Weapon        枪支/武器/爆炸物
 * - Fraud         诈骗/违法
 * - Piracy        盗版/侵权
 * - Violence      暴力/血腥
 * - Ad            违规广告
 * - Spam          垃圾信息
 * - UrlMalicious  恶意链接
 */

export type BannedCategory =
  | 'Porn'
  | 'Gambling'
  | 'Drug'
  | 'Weapon'
  | 'Fraud'
  | 'Piracy'
  | 'Violence'
  | 'Ad'
  | 'Spam'
  | 'UrlMalicious'

/**
 * 词库结构：每条 = { word, category, severity }
 * severity: 'block' 直接拦截, 'review' 进入复审
 */
export interface BannedWord {
  word: string
  category: BannedCategory
  severity: 'block' | 'review'
}

/**
 * 构建词库
 * 使用 Set 加速匹配，结构: Map<lowerWord, BannedWord>
 */
function buildWords(): Map<string, BannedWord> {
  const raw: Array<[string, BannedCategory, 'block' | 'review']> = [
    // ========== 色情/低俗 (~110 词) ==========
    ['色情', 'Porn', 'block'],
    ['情色', 'Porn', 'block'],
    ['黄色', 'Porn', 'block'],
    ['黄网', 'Porn', 'block'],
    ['黄片', 'Porn', 'block'],
    ['黄图', 'Porn', 'block'],
    ['裸聊', 'Porn', 'block'],
    ['裸照', 'Porn', 'block'],
    ['裸体', 'Porn', 'block'],
    ['裸奔', 'Porn', 'block'],
    ['裸睡', 'Porn', 'review'],
    ['裸婚', 'Porn', 'review'],
    ['裸官', 'Porn', 'review'],
    ['三级片', 'Porn', 'block'],
    ['A片', 'Porn', 'block'],
    ['av女', 'Porn', 'block'],
    ['av男', 'Porn', 'block'],
    ['成人片', 'Porn', 'block'],
    ['成人网站', 'Porn', 'block'],
    ['成人视频', 'Porn', 'block'],
    ['色情网站', 'Porn', 'block'],
    ['色情视频', 'Porn', 'block'],
    ['色情图片', 'Porn', 'block'],
    ['色情小说', 'Porn', 'block'],
    ['色情直播', 'Porn', 'block'],
    ['色情服务', 'Porn', 'block'],
    ['色情电影', 'Porn', 'block'],
    ['色情动漫', 'Porn', 'block'],
    ['色情漫画', 'Porn', 'block'],
    ['色情游戏', 'Porn', 'block'],
    ['激情视频', 'Porn', 'block'],
    ['激情图片', 'Porn', 'block'],
    ['激情小说', 'Porn', 'block'],
    ['激情电影', 'Porn', 'block'],
    ['淫秽', 'Porn', 'block'],
    ['淫荡', 'Porn', 'block'],
    ['淫乱', 'Porn', 'block'],
    ['淫欲', 'Porn', 'block'],
    ['淫娃', 'Porn', 'block'],
    ['淫魔', 'Porn', 'block'],
    ['淫民', 'Porn', 'block'],
    ['性交', 'Porn', 'block'],
    ['做爱', 'Porn', 'block'],
    ['爱爱', 'Porn', 'block'],
    ['车震', 'Porn', 'block'],
    ['口交', 'Porn', 'block'],
    ['肛交', 'Porn', 'block'],
    ['手淫', 'Porn', 'block'],
    ['自慰', 'Porn', 'block'],
    ['打飞机', 'Porn', 'block'],
    ['一夜情', 'Porn', 'block'],
    ['约炮', 'Porn', 'block'],
    ['约妹', 'Porn', 'block'],
    ['一夜性', 'Porn', 'block'],
    ['嫖娼', 'Porn', 'block'],
    ['嫖客', 'Porn', 'block'],
    ['包夜', 'Porn', 'block'],
    ['出台', 'Porn', 'block'],
    ['援交', 'Porn', 'block'],
    ['卖淫', 'Porn', 'block'],
    ['卖春', 'Porn', 'block'],
    ['鸡院', 'Porn', 'review'],
    ['红灯区', 'Porn', 'block'],
    ['按摩房', 'Porn', 'review'],
    ['桑拿房', 'Porn', 'review'],
    ['大保健', 'Porn', 'block'],
    ['特殊服务', 'Porn', 'review'],
    ['全套服务', 'Porn', 'review'],
    ['上门服务', 'Porn', 'review'],
    ['特殊服务', 'Porn', 'review'],
    ['porn', 'Porn', 'block'],
    ['porno', 'Porn', 'block'],
    ['pornhub', 'Porn', 'block'],
    ['xvideos', 'Porn', 'block'],
    ['xhamster', 'Porn', 'block'],
    ['xnxx', 'Porn', 'block'],
    ['hentai', 'Porn', 'block'],
    ['hentai漫画', 'Porn', 'block'],
    ['里番', 'Porn', 'block'],
    ['里番网', 'Porn', 'block'],
    ['黄游', 'Porn', 'block'],
    ['黄色游戏', 'Porn', 'block'],
    ['黄漫画', 'Porn', 'block'],
    ['黄小说', 'Porn', 'block'],
    ['se情', 'Porn', 'review'],
    ['黄se', 'Porn', 'review'],
    ['肉文', 'Porn', 'block'],
    ['肉漫', 'Porn', 'block'],
    ['sm调教', 'Porn', 'block'],
    ['bdsm', 'Porn', 'block'],
    ['捆绑', 'Porn', 'review'],
    ['滴蜡', 'Porn', 'review'],
    ['高潮', 'Porn', 'review'],
    ['性伴侣', 'Porn', 'review'],
    ['换妻', 'Porn', 'block'],
    ['sm', 'Porn', 'review'],
    ['双飞', 'Porn', 'block'],
    ['三p', 'Porn', 'block'],
    ['群p', 'Porn', 'block'],
    ['爆乳', 'Porn', 'block'],
    ['乳交', 'Porn', 'block'],
    ['足交', 'Porn', 'block'],
    ['推油', 'Porn', 'review'],
    ['冰火', 'Porn', 'block'],
    ['毒龙', 'Porn', 'block'],
    ['深喉', 'Porn', 'block'],
    ['69', 'Porn', 'review'],
    ['69式', 'Porn', 'block'],
    ['91', 'Porn', 'block'],
    ['91porn', 'Porn', 'block'],
    ['1024', 'Porn', 'block'],
    ['草榴', 'Porn', 'block'],
    ['色即是空', 'Porn', 'review'],
    ['成人18禁', 'Porn', 'block'],
    ['18禁', 'Porn', 'block'],
    ['小黄片', 'Porn', 'block'],

    // ========== 赌博/博彩 (~80 词) ==========
    ['赌博', 'Gambling', 'block'],
    ['博彩', 'Gambling', 'block'],
    ['赌场', 'Gambling', 'block'],
    ['赌钱', 'Gambling', 'block'],
    ['赌球', 'Gambling', 'block'],
    ['赌马', 'Gambling', 'block'],
    ['赌牌', 'Gambling', 'block'],
    ['赌徒', 'Gambling', 'review'],
    ['赌博网', 'Gambling', 'block'],
    ['赌博网站', 'Gambling', 'block'],
    ['赌博平台', 'Gambling', 'block'],
    ['赌博游戏', 'Gambling', 'block'],
    ['博彩网', 'Gambling', 'block'],
    ['博彩网站', 'Gambling', 'block'],
    ['博彩平台', 'Gambling', 'block'],
    ['博彩游戏', 'Gambling', 'block'],
    ['澳门威尼斯', 'Gambling', 'block'],
    ['澳门新葡京', 'Gambling', 'block'],
    ['澳门金沙', 'Gambling', 'block'],
    ['澳门银河', 'Gambling', 'block'],
    ['澳门美高梅', 'Gambling', 'block'],
    ['澳门巴黎人', 'Gambling', 'block'],
    ['澳门永利', 'Gambling', 'block'],
    ['澳门凯旋门', 'Gambling', 'block'],
    ['澳门星际', 'Gambling', 'block'],
    ['葡京', 'Gambling', 'review'],
    ['威尼斯人', 'Gambling', 'block'],
    ['威尼斯赌场', 'Gambling', 'block'],
    ['金沙赌场', 'Gambling', 'block'],
    ['银河赌场', 'Gambling', 'block'],
    ['美高梅赌场', 'Gambling', 'block'],
    ['网上赌场', 'Gambling', 'block'],
    ['线上赌场', 'Gambling', 'block'],
    ['网络赌场', 'Gambling', 'block'],
    ['真人赌场', 'Gambling', 'block'],
    ['在线赌博', 'Gambling', 'block'],
    ['网络赌博', 'Gambling', 'block'],
    ['网上赌博', 'Gambling', 'block'],
    ['线上赌博', 'Gambling', 'block'],
    ['手机赌博', 'Gambling', 'block'],
    ['百家乐', 'Gambling', 'block'],
    ['龙虎斗', 'Gambling', 'block'],
    ['轮盘', 'Gambling', 'block'],
    ['二十一点', 'Gambling', 'review'],
    ['梭哈', 'Gambling', 'block'],
    ['二八杠', 'Gambling', 'block'],
    ['斗牛', 'Gambling', 'review'],
    ['德州扑克', 'Gambling', 'review'],
    ['老虎机', 'Gambling', 'block'],
    ['老虎機', 'Gambling', 'block'],
    ['老虎机游戏', 'Gambling', 'block'],
    ['老虎机平台', 'Gambling', 'block'],
    ['澳门博彩', 'Gambling', 'block'],
    ['澳门赌场', 'Gambling', 'block'],
    ['香港赛马', 'Gambling', 'review'],
    ['体彩', 'Gambling', 'review'],
    ['足彩', 'Gambling', 'review'],
    ['赌彩', 'Gambling', 'block'],
    ['私彩', 'Gambling', 'block'],
    ['外围', 'Gambling', 'block'],
    ['外围赌球', 'Gambling', 'block'],
    ['赌外围', 'Gambling', 'block'],
    ['外围女', 'Gambling', 'block'],
    ['赌博app', 'Gambling', 'block'],
    ['博彩app', 'Gambling', 'block'],
    ['casino', 'Gambling', 'block'],
    ['gambling', 'Gambling', 'block'],
    ['bet365', 'Gambling', 'block'],
    ['bet', 'Gambling', 'review'],
    ['赌博机', 'Gambling', 'block'],
    ['赌博器', 'Gambling', 'block'],
    ['透视眼镜', 'Gambling', 'review'],
    ['麻将机', 'Gambling', 'review'],
    ['程序麻将机', 'Gambling', 'block'],
    ['诈骗麻将', 'Gambling', 'block'],
    ['诈赌', 'Gambling', 'block'],
    ['抽水', 'Gambling', 'review'],
    ['洗码', 'Gambling', 'block'],
    ['洗码量', 'Gambling', 'block'],
    ['网赌', 'Gambling', 'block'],
    ['网博', 'Gambling', 'block'],
    ['网赌平台', 'Gambling', 'block'],

    // ========== 毒品/违禁药品 (~50 词) ==========
    ['毒品', 'Drug', 'block'],
    ['吸毒', 'Drug', 'block'],
    ['贩毒', 'Drug', 'block'],
    ['制毒', 'Drug', 'block'],
    ['运毒', 'Drug', 'block'],
    ['藏毒', 'Drug', 'block'],
    ['冰毒', 'Drug', 'block'],
    ['海洛因', 'Drug', 'block'],
    ['大麻', 'Drug', 'block'],
    ['可卡因', 'Drug', 'block'],
    ['k粉', 'Drug', 'block'],
    ['k 粉', 'Drug', 'block'],
    ['摇头丸', 'Drug', 'block'],
    ['麻古', 'Drug', 'block'],
    ['麻果', 'Drug', 'block'],
    ['古柯碱', 'Drug', 'block'],
    ['鸦片', 'Drug', 'block'],
    ['罂粟', 'Drug', 'block'],
    ['白粉', 'Drug', 'block'],
    ['白面', 'Drug', 'block'],
    ['三唑仑', 'Drug', 'block'],
    ['迷药', 'Drug', 'block'],
    ['迷情药', 'Drug', 'block'],
    ['乖乖水', 'Drug', 'block'],
    ['听话水', 'Drug', 'block'],
    ['失身粉', 'Drug', 'block'],
    ['春药', 'Drug', 'block'],
    ['迷魂药', 'Drug', 'block'],
    ['安眠药', 'Drug', 'review'],
    ['国家管制', 'Drug', 'block'],
    ['管制品', 'Drug', 'block'],
    ['易制毒', 'Drug', 'block'],
    ['冰壶', 'Drug', 'review'],
    ['溜冰', 'Drug', 'block'],
    ['飞叶子', 'Drug', 'block'],
    ['嗑药', 'Drug', 'block'],
    ['打k', 'Drug', 'block'],
    ['打冰', 'Drug', 'block'],
    ['猪肉', 'Drug', 'block'], // 冰毒黑话
    ['嘎啦', 'Drug', 'block'],
    ['麻黄碱', 'Drug', 'block'],
    ['冰毒片', 'Drug', 'block'],
    ['咖啡因', 'Drug', 'review'],
    ['海米', 'Drug', 'review'],
    ['红冰', 'Drug', 'block'],
    ['黄皮', 'Drug', 'block'],
    ['冰糖', 'Drug', 'review'],
    ['溜麻', 'Drug', 'block'],
    ['杜冷丁', 'Drug', 'block'],
    ['美沙酮', 'Drug', 'block'],

    // ========== 枪支/武器/爆炸物 (~50 词) ==========
    ['枪支', 'Weapon', 'block'],
    ['枪械', 'Weapon', 'block'],
    ['手枪', 'Weapon', 'block'],
    ['步枪', 'Weapon', 'block'],
    ['冲锋枪', 'Weapon', 'block'],
    ['狙击枪', 'Weapon', 'block'],
    ['霰弹枪', 'Weapon', 'block'],
    ['气枪', 'Weapon', 'block'],
    ['仿真枪', 'Weapon', 'block'],
    ['玩具枪', 'Weapon', 'review'],
    ['枪模', 'Weapon', 'block'],
    ['枪械店', 'Weapon', 'block'],
    ['买枪', 'Weapon', 'block'],
    ['卖枪', 'Weapon', 'block'],
    ['购枪', 'Weapon', 'block'],
    ['制枪', 'Weapon', 'block'],
    ['改装枪', 'Weapon', 'block'],
    ['军火', 'Weapon', 'block'],
    ['弹药', 'Weapon', 'block'],
    ['子弹', 'Weapon', 'block'],
    ['火药', 'Weapon', 'review'],
    ['炸药', 'Weapon', 'block'],
    ['炸弹', 'Weapon', 'block'],
    ['土制炸药', 'Weapon', 'block'],
    ['雷管', 'Weapon', 'block'],
    ['起爆器', 'Weapon', 'block'],
    ['爆破', 'Weapon', 'review'],
    ['TNT', 'Weapon', 'review'],
    ['C4', 'Weapon', 'review'],
    ['手雷', 'Weapon', 'block'],
    ['手榴弹', 'Weapon', 'block'],
    ['烟雾弹', 'Weapon', 'block'],
    ['催泪弹', 'Weapon', 'block'],
    ['燃烧弹', 'Weapon', 'block'],
    ['防狼喷雾', 'Weapon', 'review'],
    ['电击器', 'Weapon', 'block'],
    ['电击枪', 'Weapon', 'block'],
    ['弓弩', 'Weapon', 'review'],
    ['弩箭', 'Weapon', 'review'],
    ['军刺', 'Weapon', 'block'],
    ['匕首', 'Weapon', 'review'],
    ['弹簧刀', 'Weapon', 'review'],
    ['蝴蝶刀', 'Weapon', 'review'],
    ['砍刀', 'Weapon', 'review'],
    ['开山刀', 'Weapon', 'review'],
    ['军刀', 'Weapon', 'review'],
    ['管制刀具', 'Weapon', 'block'],
    ['枪机', 'Weapon', 'block'],
    ['枪管', 'Weapon', 'block'],
    ['弹匣', 'Weapon', 'block'],
    ['枪托', 'Weapon', 'block'],
    ['消音器', 'Weapon', 'block'],

    // ========== 诈骗/违法 (~80 词) ==========
    ['诈骗', 'Fraud', 'block'],
    ['骗钱', 'Fraud', 'block'],
    ['骗术', 'Fraud', 'block'],
    ['骗子', 'Fraud', 'review'],
    ['骗贷', 'Fraud', 'block'],
    ['骗保', 'Fraud', 'block'],
    ['骗婚', 'Fraud', 'block'],
    ['骗色', 'Fraud', 'block'],
    ['仙人跳', 'Fraud', 'block'],
    ['杀猪盘', 'Fraud', 'block'],
    ['缅北', 'Fraud', 'block'],
    ['缅北诈骗', 'Fraud', 'block'],
    ['电信诈骗', 'Fraud', 'block'],
    ['网络诈骗', 'Fraud', 'block'],
    ['刷单', 'Fraud', 'block'],
    ['刷单兼职', 'Fraud', 'block'],
    ['刷单诈骗', 'Fraud', 'block'],
    ['兼职刷单', 'Fraud', 'block'],
    ['刷信誉', 'Fraud', 'block'],
    ['刷钻', 'Fraud', 'block'],
    ['刷流量', 'Fraud', 'review'],
    ['刷粉丝', 'Fraud', 'review'],
    ['刷评论', 'Fraud', 'review'],
    ['代刷', 'Fraud', 'block'],
    ['代刷网', 'Fraud', 'block'],
    ['网赚', 'Fraud', 'review'],
    ['网赚项目', 'Fraud', 'review'],
    ['日赚', 'Fraud', 'block'],
    ['日赚千元', 'Fraud', 'block'],
    ['日赚万元', 'Fraud', 'block'],
    ['躺赚', 'Fraud', 'block'],
    ['睡后收入', 'Fraud', 'review'],
    ['副业', 'Fraud', 'review'],
    ['兼职', 'Fraud', 'review'],
    ['网络兼职', 'Fraud', 'review'],
    ['高佣金', 'Fraud', 'block'],
    ['高返利', 'Fraud', 'block'],
    ['刷信用卡', 'Fraud', 'review'],
    ['套现', 'Fraud', 'block'],
    ['信用卡套现', 'Fraud', 'block'],
    ['花呗套现', 'Fraud', 'block'],
    ['借呗套现', 'Fraud', 'block'],
    ['微粒贷套现', 'Fraud', 'block'],
    ['白条套现', 'Fraud', 'block'],
    ['套花呗', 'Fraud', 'block'],
    ['套借呗', 'Fraud', 'block'],
    ['套京东', 'Fraud', 'block'],
    ['套白条', 'Fraud', 'block'],
    ['办证', 'Fraud', 'block'],
    ['办证网', 'Fraud', 'block'],
    ['办证公司', 'Fraud', 'block'],
    ['办证服务', 'Fraud', 'block'],
    ['代考', 'Fraud', 'block'],
    ['代写论文', 'Fraud', 'block'],
    ['代写', 'Fraud', 'block'],
    ['代开发票', 'Fraud', 'block'],
    ['代开发票网', 'Fraud', 'block'],
    ['假发票', 'Fraud', 'block'],
    ['发票代开', 'Fraud', 'block'],
    ['刻章', 'Fraud', 'block'],
    ['办刻章', 'Fraud', 'block'],
    ['私刻印章', 'Fraud', 'block'],
    ['代办', 'Fraud', 'review'],
    ['代办违章', 'Fraud', 'block'],
    ['黑客', 'Fraud', 'review'],
    ['黑客服务', 'Fraud', 'block'],
    ['黑产', 'Fraud', 'block'],
    ['黑产圈', 'Fraud', 'block'],
    ['qq盗号', 'Fraud', 'block'],
    ['微信号盗号', 'Fraud', 'block'],
    ['盗号', 'Fraud', 'block'],
    ['撞库', 'Fraud', 'block'],
    ['洗钱', 'Fraud', 'block'],
    ['洗钱服务', 'Fraud', 'block'],
    ['洗钱渠道', 'Fraud', 'block'],
    ['跑分', 'Fraud', 'block'],
    ['跑分平台', 'Fraud', 'block'],
    ['水房', 'Fraud', 'block'],
    ['资金池', 'Fraud', 'review'],
    ['资金盘', 'Fraud', 'block'],
    ['虚拟币诈骗', 'Fraud', 'block'],
    ['空气币', 'Fraud', 'block'],
    ['传销币', 'Fraud', 'block'],
    ['杀鱼', 'Fraud', 'review'],

    // ========== 盗版/侵权 (~50 词) ==========
    ['盗版', 'Piracy', 'block'],
    ['盗版电影', 'Piracy', 'block'],
    ['盗版视频', 'Piracy', 'block'],
    ['盗版游戏', 'Piracy', 'block'],
    ['盗版软件', 'Piracy', 'block'],
    ['盗版音乐', 'Piracy', 'block'],
    ['盗版小说', 'Piracy', 'block'],
    ['盗版书', 'Piracy', 'block'],
    ['高清盗版', 'Piracy', 'block'],
    ['枪版', 'Piracy', 'block'],
    ['枪版电影', 'Piracy', 'block'],
    ['TC版', 'Piracy', 'block'],
    ['TS版', 'Piracy', 'block'],
    ['CAM版', 'Piracy', 'block'],
    ['BT下载', 'Piracy', 'block'],
    ['种子下载', 'Piracy', 'review'],
    ['磁力链接', 'Piracy', 'review'],
    ['磁力', 'Piracy', 'review'],
    ['ed2k', 'Piracy', 'review'],
    ['电驴', 'Piracy', 'review'],
    ['网盘资源', 'Piracy', 'review'],
    ['网盘链接', 'Piracy', 'review'],
    ['破解版', 'Piracy', 'block'],
    ['破解软件', 'Piracy', 'block'],
    ['破解游戏', 'Piracy', 'block'],
    ['PJ版', 'Piracy', 'block'],
    ['PJ软件', 'Piracy', 'block'],
    ['PJ游戏', 'Piracy', 'block'],
    ['PJ', 'Piracy', 'review'],
    ['注册机', 'Piracy', 'block'],
    ['激活码', 'Piracy', 'review'],
    ['激活工具', 'Piracy', 'block'],
    ['序列号', 'Piracy', 'review'],
    ['算号器', 'Piracy', 'block'],
    ['kms激活', 'Piracy', 'block'],
    ['kms', 'Piracy', 'review'],
    ['小马激活', 'Piracy', 'block'],
    ['win7激活', 'Piracy', 'review'],
    ['win10激活', 'Piracy', 'review'],
    ['office激活', 'Piracy', 'review'],
    ['adobe破解', 'Piracy', 'block'],
    ['CAD破解', 'Piracy', 'block'],
    ['ps破解', 'Piracy', 'review'],
    ['盗版win', 'Piracy', 'block'],
    ['吾爱破解', 'Piracy', 'block'],
    ['飘零阁', 'Piracy', 'block'],
    ['秋风', 'Piracy', 'review'],
    ['脱壳', 'Piracy', 'review'],
    ['反编译', 'Piracy', 'review'],
    ['私服', 'Piracy', 'review'],
    ['外挂', 'Piracy', 'block'],
    ['游戏外挂', 'Piracy', 'block'],
    ['吃鸡外挂', 'Piracy', 'block'],
    ['辅助', 'Piracy', 'review'],
    ['游戏辅助', 'Piracy', 'review'],
    ['外挂网', 'Piracy', 'block'],

    // ========== 暴力/血腥 (~30 词) ==========
    ['暴力', 'Violence', 'block'],
    ['血腥', 'Violence', 'block'],
    ['屠杀', 'Violence', 'block'],
    ['杀戮', 'Violence', 'block'],
    ['残杀', 'Violence', 'block'],
    ['凶杀', 'Violence', 'block'],
    ['砍人', 'Violence', 'block'],
    ['杀人', 'Violence', 'block'],
    ['打人', 'Violence', 'review'],
    ['斗殴', 'Violence', 'review'],
    ['自杀', 'Violence', 'block'],
    ['自残', 'Violence', 'block'],
    ['自虐', 'Violence', 'block'],
    ['轻生', 'Violence', 'review'],
    ['寻死', 'Violence', 'review'],
    ['割腕', 'Violence', 'block'],
    ['跳楼', 'Violence', 'block'],
    ['烧炭', 'Violence', 'block'],
    ['上吊', 'Violence', 'block'],
    ['服毒', 'Violence', 'block'],
    ['咬舌', 'Violence', 'block'],
    ['致伤', 'Violence', 'review'],
    ['致残', 'Violence', 'review'],
    ['致死', 'Violence', 'review'],
    ['死亡笔记', 'Violence', 'block'],
    ['血色', 'Violence', 'review'],
    ['恐怖袭击', 'Violence', 'block'],
    ['爆炸袭击', 'Violence', 'block'],
    ['恐怖分子', 'Violence', 'block'],
    ['isis', 'Violence', 'block'],
    ['圣战', 'Violence', 'block'],

    // ========== 违规广告 (~30 词) ==========
    ['代孕', 'Ad', 'block'],
    ['代孕服务', 'Ad', 'block'],
    ['代孕妈妈', 'Ad', 'block'],
    ['代孕公司', 'Ad', 'block'],
    ['代孕中介', 'Ad', 'block'],
    ['包生男孩', 'Ad', 'block'],
    ['包生女孩', 'Ad', 'block'],
    ['试管婴儿', 'Ad', 'review'],
    ['供卵', 'Ad', 'block'],
    ['供精', 'Ad', 'block'],
    ['重金求子', 'Ad', 'block'],
    ['富婆', 'Ad', 'review'],
    ['重金求', 'Ad', 'block'],
    ['捐卵', 'Ad', 'block'],
    ['卖卵', 'Ad', 'block'],
    ['代孕网', 'Ad', 'block'],
    ['代孕广告', 'Ad', 'block'],
    ['包养', 'Ad', 'block'],
    ['包养网', 'Ad', 'block'],
    ['富二代', 'Ad', 'review'],
    ['干爹', 'Ad', 'review'],
    ['干妈', 'Ad', 'review'],
    ['微商', 'Ad', 'review'],
    ['微商代理', 'Ad', 'review'],
    ['微商货源', 'Ad', 'review'],
    ['加微信', 'Ad', 'review'],
    ['加我微信', 'Ad', 'review'],
    ['爆粉', 'Ad', 'block'],
    ['群发', 'Ad', 'review'],
    ['代购', 'Ad', 'review'],
    ['海外代购', 'Ad', 'review'],
    ['免税代购', 'Ad', 'review'],
    ['高仿', 'Ad', 'block'],
    ['高仿表', 'Ad', 'block'],
    ['高仿包', 'Ad', 'block'],
    ['高仿鞋', 'Ad', 'block'],
    ['复刻', 'Ad', 'review'],
    ['A货', 'Ad', 'block'],
    ['精仿', 'Ad', 'block'],
    ['莆田鞋', 'Ad', 'block'],

    // ========== 垃圾信息 (~30 词) ==========
    ['代开发票', 'Spam', 'block'],
    ['发票', 'Spam', 'review'],
    ['开发票', 'Spam', 'review'],
    ['发票公司', 'Spam', 'block'],
    ['裸辞', 'Spam', 'review'],
    ['辞职信', 'Spam', 'review'],
    ['举报信', 'Spam', 'review'],
    ['投诉信', 'Spam', 'review'],
    ['敲诈勒索', 'Spam', 'block'],
    ['敲诈', 'Spam', 'block'],
    ['勒索', 'Spam', 'block'],
    ['威胁', 'Spam', 'review'],
    ['恐吓', 'Spam', 'review'],
    ['跟踪', 'Spam', 'block'],
    ['骚扰', 'Spam', 'review'],
    ['短信轰炸', 'Spam', 'block'],
    ['轰炸机', 'Spam', 'review'],
    ['呼死你', 'Spam', 'block'],
    ['短信群发', 'Spam', 'review'],
    ['广告机', 'Spam', 'review'],
    ['伪基站', 'Spam', 'block'],
    ['黑广播', 'Spam', 'block'],
    ['代发', 'Spam', 'review'],
    ['代发平台', 'Spam', 'block'],
    ['代发广告', 'Spam', 'block'],
    ['代发短信', 'Spam', 'block'],
    ['代发邮件', 'Spam', 'block'],
    ['短信代发', 'Spam', 'block'],
    ['邮件代发', 'Spam', 'block'],
    ['跑路', 'Spam', 'review'],
    ['跑路了', 'Spam', 'review'],
    ['跑路平台', 'Spam', 'block'],
    ['维权', 'Spam', 'review'],
    ['维权群', 'Spam', 'review'],
    ['投诉无门', 'Spam', 'review'],
  ]

  const map = new Map<string, BannedWord>()
  for (const [word, category, severity] of raw) {
    const key = word.toLowerCase()
    map.set(key, { word, category, severity })
  }
  return map
}

// 单例：启动时构建一次
const BANNED_WORDS = buildWords()

/**
 * 在文本中查找敏感词
 * @param text 待检查文本（已 lower-case）
 * @returns 命中的第一条敏感词（用于拦截）
 */
export function findBannedWord(text: string): BannedWord | null {
  if (!text) return null
  const lower = text.toLowerCase()

  for (const [key, word] of BANNED_WORDS) {
    if (lower.includes(key)) {
      return word
    }
  }
  return null
}

/**
 * 在文本中查找所有敏感词
 */
export function findAllBannedWords(text: string): BannedWord[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const found: BannedWord[] = []
  const seen = new Set<string>()

  for (const [key, word] of BANNED_WORDS) {
    if (lower.includes(key) && !seen.has(key)) {
      found.push(word)
      seen.add(key)
    }
  }
  return found
}

/**
 * 词库统计（用于启动日志/监控）
 */
export function getBannedWordsStats(): { total: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {}
  for (const w of BANNED_WORDS.values()) {
    byCategory[w.category] = (byCategory[w.category] || 0) + 1
  }
  return { total: BANNED_WORDS.size, byCategory }
}

/**
 * URL 黑名单域（用于 URL 专项审核）
 * 命中即视为恶意链接
 */
const URL_BLOCKED_DOMAINS = [
  // 赌博
  'casino',
  'bet365',
  'betfair',
  'williamhill',
  'pokerstars',
  'bwin',
  '澳门威尼斯',
  '威尼斯人',
  '葡京',
  '新葡京',
  '金沙',
  '美高梅',
  '巴黎人',
  '永利',
  '银河',
  '星际',
  '凯旋门',
  // 色情
  'pornhub',
  'xvideos',
  'xhamster',
  'xnxx',
  'redtube',
  'youporn',
  'hentai',
  'xvideos',
  'tokyohot',
  'javbus',
  'javlib',
  'jav',
  // 盗版
  '1337x',
  'rarbg',
  'thepiratebay',
  'kickass',
  'nyaa',
  'torrent',
  '海盗湾',
  '影音先锋',
  '快播',
  'qvod',
  // 诈骗
  '杀猪盘',
  '缅北',
  '博彩',
  '赌博',
]

const URL_BLOCKED_PATTERNS = [
  /\b(\w+)?casino\b/i,
  /\b(\w+)?porn\b/i,
  /\b(\w+)?bet\d*\b/i,
  /\b(\w+)?hentai\b/i,
]

/**
 * 检查 URL 是否含恶意域
 */
export function isMaliciousUrl(url: string): { malicious: boolean; reason?: string } {
  if (!url) return { malicious: false }
  const lower = url.toLowerCase()

  // 检查黑名单域
  for (const domain of URL_BLOCKED_DOMAINS) {
    if (lower.includes(domain)) {
      return { malicious: true, reason: `URL 含黑名单域: ${domain}` }
    }
  }

  // 检查正则
  for (const pattern of URL_BLOCKED_PATTERNS) {
    if (pattern.test(url)) {
      return { malicious: true, reason: `URL 匹配恶意模式: ${pattern}` }
    }
  }

  return { malicious: false }
}
