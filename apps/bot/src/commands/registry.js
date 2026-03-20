const { normalizeLanguage } = require("../i18n");
const { normalizeCommandRegistry, validateCommandRegistry } = require("../../../../packages/shared/src/v5/commandEngine");

const RAW_COMMAND_REGISTRY = Object.freeze([
  {
    key: "menu",
    aliases: ["start", "hub"],
    description_tr: "Ana launcher, hizli rota ve kisayol merkezi — oyun akisinin baslangic noktasi",
    description_en: "Main launcher hub — entry point for entire game flow with quick routes",
    intents: ["menu", "launcher", "start", "home", "ana menu", "ana men", "baslat", "giris", "main", "begin"],
    scenarios: ["menu", "ana menu", "start", "/menu", "/start"],
    outcomes: ["launcher panelini ac", "onboard/play/tasks/wallet kisayollarini goster", "streak ve tier durumu ozetle", "season countdown goster"],
    primary: true
  },
  {
    key: "play",
    aliases: ["arena", "arena3d", "oyun"],
    description_tr: "Nexus Arena 3D web panelini ac — PvP, gorev ve vault erisimi",
    description_en: "Open Nexus Arena 3D web panel — PvP, tasks and vault access",
    intents: ["play", "arena", "arena 3d", "3d arena", "battle", "duel", "oyun", "oyna", "savas", "game", "enter arena"],
    scenarios: ["/play", "arena 3d ac", "open arena", "oyuna gir", "arenaya gir"],
    outcomes: ["webapp mini app linki uret", "pvp/task/vault/forge panelini ac", "3D sahne yukle", "son kaldigim zone'a don"],
    primary: true
  },
  {
    key: "tasks",
    aliases: ["task", "gorev", "gorevler"],
    description_tr: "Gorev havuzu — sure, odul, arketip ve risk agirliklari ile tam panel",
    description_en: "Task pool — full panel with timer, rewards, archetypes and risk weights",
    intents: ["tasks", "task", "gorev", "gorevler", "quest", "quests", "gorev havuzu", "task pool", "misson"],
    scenarios: ["gorev", "tasks", "quest list", "/tasks", "gorev havuzunu ac", "yeni gorev"],
    outcomes: ["aktif gorev havuzunu goster", "kabul edilebilir offerlari listele", "her gorev icin sure/odul/arketip karti goster", "anomaly ve kontrat etkisini belirt"],
    primary: true
  },
  {
    key: "finish",
    aliases: ["bitir", "tamamla"],
    description_tr: "Aktif gorevi bitir — safe/balanced/aggressive mod ile risk-odul hesabi",
    description_en: "Finish active task — risk-reward calculation with safe/balanced/aggressive mode",
    intents: ["finish", "bitir", "tamamla", "complete", "kapat", "end", "bitti", "sonlandir"],
    scenarios: ["bitir dengeli", "/finish aggressive", "/finish safe", "bitir guvenli", "bitir saldirgan"],
    outcomes: ["aktif denemeyi kapat", "sonuc ve olasilik ozeti goster", "combo ve momentum carpanini hesapla", "anomaly etkisini uygula"],
    primary: true
  },
  {
    key: "reveal",
    aliases: ["revealnow"],
    description_tr: "Son biten denemenin odulunu ac — pity, bakiye ve sezon puani guncelle",
    description_en: "Reveal reward of latest completed run — update pity, balance and season points",
    intents: ["reveal", "revealnow", "loot", "open loot", "kasa", "kasa ac", "odul ac", "kutu ac"],
    scenarios: ["reveal", "kasa ac", "open loot", "/reveal", "odulu goster"],
    outcomes: ["son biten denemenin odulunu dagit", "pity counter guncelle", "bakiye guncelle", "sezon puani ekle", "hidden bonus kontrolu yap"],
    primary: true
  },
  {
    key: "pvp",
    aliases: ["raid", "duel"],
    description_tr: "PvP raid baslat — ELO eslesme, kontrat puani ve ladder ilerlemesi",
    description_en: "Start PvP raid — ELO matching, contract scoring and ladder progression",
    intents: ["pvp", "raid", "arena raid", "duel", "duello", "saldiri", "maclar", "eslesme"],
    scenarios: ["/pvp", "raid aggressive", "duel baslat", "/pvp safe", "pvp dengeli"],
    outcomes: ["pvp oturumu baslat", "ELO eslesmesi yap", "kontrat/progression metriklerini ilerlet", "daily/weekly PvP sayacini artir"],
    primary: true
  },
  {
    key: "arena_rank",
    aliases: ["pvp_rank"],
    description_tr: "Arena rating, rank, ELO ve ladder ozeti — kisisel ve global",
    description_en: "Arena rating, rank, ELO and ladder summary — personal and global",
    intents: ["arena rank", "rank", "arena siralama", "leaderboard arena", "elo", "rating", "pvp siralama"],
    scenarios: ["arena rank", "/arena_rank", "pvp leaderboard", "siralamam"],
    outcomes: ["rating, rank ve leaderboard verisini goster", "ELO degisim trendini goster", "season arc boss ilerlemesini belirt"],
    primary: true
  },
  {
    key: "wallet",
    aliases: ["cuzdan", "bakiye"],
    description_tr: "SC/HC/RC/NXT bakiye, gunluk cap, streak carpani ve verimlilik paneli",
    description_en: "SC/HC/RC/NXT balances, daily caps, streak multiplier and productivity panel",
    intents: ["wallet", "cuzdan", "balance", "balances", "bakiye", "param", "ne kadar", "economy"],
    scenarios: ["wallet", "cuzdan", "balance", "/wallet", "bakiyem"],
    outcomes: ["SC/HC/RC/NXT ve gunluk cap durumunu goster", "streak carpanini hesapla", "bugunku verimlilik oranini belirt"],
    primary: true
  },
  {
    key: "vault",
    aliases: ["payout", "cekim"],
    description_tr: "Vault BTC cekim paneli — gate durumu, cooldown, KYC ve talep akisi",
    description_en: "Vault BTC payout panel — gate status, cooldown, KYC and request flow",
    intents: ["vault", "payout", "cekim", "withdraw", "cashout", "btc", "para cek", "kasa"],
    scenarios: ["vault", "payout", "withdraw", "/vault", "cekim yap", "btc cek"],
    outcomes: ["payout lock durumunu goster", "talep uygunlugunu kontrol et", "gate/cooldown/KYC durumunu belirt", "son odeme gecmisini listele"],
    primary: true
  },
  {
    key: "token",
    aliases: ["jeton", "nxt"],
    description_tr: "NXT token cuzdani — spot fiyat, quote, mint/buy durumu ve zincir adresleri",
    description_en: "NXT token wallet — spot price, quote, mint/buy status and chain addresses",
    intents: ["token", "jeton", "coin", "treasury", "nxt", "token bakiye", "token fiyat"],
    scenarios: ["/token", "token wallet", "jeton bakiyesi", "nxt fiyat"],
    outcomes: ["token bakiye, quote ve talep durumunu goster", "spot fiyat ve piyasa degisimini belirt", "zincir adreslerini listele"],
    primary: true
  },
  {
    key: "story",
    aliases: ["guide", "rehber"],
    description_tr: "Nexus rehberi — oyun hikayesi, mekanikler ve akis adimlari",
    description_en: "Nexus guide — game story, mechanics and flow steps",
    intents: ["story", "guide", "rehber", "yardim", "help me", "nasil", "ne yapmaliyim", "how to"],
    scenarios: ["story", "guide", "rehber", "/story", "ne yapayim"],
    outcomes: ["onboard adimlarini acikla", "kontrat ve anomaly mekaniklerini anlat", "pity sistemi ve combo carpanini acikla"],
    primary: true
  },
  {
    key: "help",
    aliases: ["yardim"],
    description_tr: "Detayli komut kartlari — kategori bazli help index ve kisayollar",
    description_en: "Detailed command cards — category-based help index and shortcuts",
    intents: ["help", "komutlar", "yardim", "commands", "command list", "ne var", "help me", "neler yapabilirim"],
    scenarios: ["/help", "komutlar", "command list", "/help tasks", "/help economy"],
    outcomes: ["primer komutlari amac+senaryo ile listele", "kategori bazli index goster", "ilgili komut zincirlerini belirt"],
    primary: true
  },
  {
    key: "lang",
    aliases: ["dil", "language"],
    description_tr: "Dil tercihini kalici kaydet — Turkce veya Ingilizce",
    description_en: "Persist language preference — Turkish or English",
    intents: ["lang", "dil", "language", "change language", "dil degistir", "turkce", "ingilizce", "english"],
    scenarios: ["/lang tr", "/lang en", "dil en", "turkce yap", "ingilizce yap"],
    outcomes: ["kullanici locale ayarini kalici guncelle", "tum mesajlar ve ipuclari secilen dilde devam etsin"],
    primary: true
  },
  {
    key: "profile",
    aliases: ["profil"],
    description_tr: "Profil karti — tier, itibar, prestij, sezon sirasi ve bakiye ozeti",
    description_en: "Profile card — tier, reputation, prestige, season rank and balance summary",
    intents: ["profile", "profil", "kim", "benim", "my profile"],
    scenarios: ["/profile", "profil", "profilim"],
    outcomes: ["profil ozetini goster", "tier/reputation/prestige metriklerini belirt", "profil hub paneline gecis sagla"]
  },
  {
    key: "rewards",
    aliases: ["oduller", "loot"],
    description_tr: "Odul merkezi — bekleyen oduller, claim durumu ve reward vault",
    description_en: "Reward center — pending rewards, claim status and reward vault",
    intents: ["rewards", "oduller", "loot", "reward center", "ne kazandim", "my rewards"],
    scenarios: ["/rewards", "oduller", "reward center", "odullerim"],
    outcomes: ["odul ozetini goster", "bekleyen claimleri listele", "reward vault paneline gecis sagla"]
  },
  { key: "mint", aliases: ["donustur"], description_tr: "SC/HC/RC bakiyesini NXT tokena cevir — unified unit hesabi", description_en: "Convert SC/HC/RC balances to NXT token — unified unit calculation", intents: ["mint", "donustur", "convert", "token bas", "token uret"], scenarios: ["/mint", "/mint 25", "50 token bas"], outcomes: ["token mint islemi yap", "unified units hesapla", "debit ozeti goster"] },
  { key: "buytoken", aliases: ["tokenal"], description_tr: "Token alim talebi — USD/chain secimi ve quote olusturma", description_en: "Token buy request — USD/chain selection and quote generation", intents: ["buytoken", "token buy", "token al", "satin al", "buy nxt"], scenarios: ["/buytoken 5 TON", "/buytoken 25 TRX", "10 usd token al"], outcomes: ["alim talebi olustur", "quote ve odeme adresi goster", "zincir bazli fiyatlama yap"] },
  { key: "tx", aliases: [], description_tr: "Token talebine zincir TX hash bagla ve dogrulama basalt", description_en: "Attach on-chain TX hash to token request and trigger verification", intents: ["tx", "token tx", "hash gonder", "islem onay"], scenarios: ["/tx 104 0xabc123", "/tx 88 <hash>"], outcomes: ["tx hash kaydet", "dogrulama surecini tetikle", "admin onay kuyragina ekle"] },
  { key: "daily", aliases: ["gunluk"], description_tr: "Gunluk kontrol paneli — haklar, cap, streak carpani, misyon tablosu", description_en: "Daily control panel — rights, caps, streak multiplier, mission board", intents: ["daily", "gunluk", "today", "bugun", "gunluk durum"], scenarios: ["/daily", "gunluk", "bugun ne var"], outcomes: ["gunluk gorev/cap durumunu goster", "streak carpanini hesapla", "bekleyen mission odullerini belirt"] },
  { key: "kingdom", aliases: ["tier"], description_tr: "Kingdom tier paneli — reputation, avantajlar, gecmis ve sonraki esik", description_en: "Kingdom tier panel — reputation, perks, history and next threshold", intents: ["kingdom", "tier", "kraliyet", "seviye", "level", "rank"], scenarios: ["/kingdom", "tier durumum", "kaçıncı seviyeyim"], outcomes: ["tier/reputation ozetini goster", "mevcut avantajlari listele", "sonraki tier esigini belirt"] },
  { key: "season", aliases: ["sezon"], description_tr: "Sezon durumu — puan, kalan gun, hedefler ve milestone", description_en: "Season status — points, days left, goals and milestones", intents: ["season", "sezon", "season status", "sezon durumu"], scenarios: ["/season", "sezon durumu"], outcomes: ["sezon puan ve siralamasini goster", "kalan gun ve milestone'lari belirt"] },
  { key: "leaderboard", aliases: ["siralama", "top"], description_tr: "Lider tablosu — sezon puani bazli top siralama", description_en: "Leaderboard — season point based top ranking", intents: ["leaderboard", "siralama", "top", "en iyiler", "ranking"], scenarios: ["/leaderboard", "siralama goster"], outcomes: ["top 10 oyuncuyu goster", "kisisel siralamayi belirt"] },
  {
    key: "events",
    aliases: ["event", "etkinlikler", "etkinlik"],
    description_tr: "Canli etkinlikler — anomaly, turnuva, savaş ve flash drop merkezi",
    description_en: "Live events — anomaly, tournament, war and flash drop center",
    intents: ["events", "event", "etkinlik", "etkinlikler", "live events", "ne var bugun", "aktif etkinlik"],
    scenarios: ["/events", "etkinlikler", "live events", "aktif eventler"],
    outcomes: ["aktif/yaklaşan/biten etkinlikleri listele", "event zone deeplink'leri sun", "reward ve geri sayim goster"]
  },
  {
    key: "discover",
    aliases: ["kesfet", "kesif"],
    description_tr: "Kesif motoru — sonraki en iyi hamle, zone onerileri ve route analizi",
    description_en: "Discovery engine — next best move, zone suggestions and route analysis",
    intents: ["discover", "kesfet", "kesif", "next step", "ne yapayim", "oneri", "suggest"],
    scenarios: ["/discover", "kesfet", "next step", "ne yapmaliyim"],
    outcomes: ["sonraki en iyi hamleyi ozetle", "ilgili panel deeplinklerini goster", "kacirilacak firsatlari belirt"]
  },
  { key: "forge", aliases: ["atolye", "craft"], description_tr: "Forge atolyesi — kaynak birlestirme, oge uretimi ve boost aktivasyonu", description_en: "Forge workshop — resource combination, item crafting and boost activation", intents: ["forge", "atolye", "craft", "uret", "birlestir", "combine"], scenarios: ["/forge", "atolyeyi ac", "craft yap"], outcomes: ["kaynak durumunu goster", "craft seceneklerini listele", "aktif kontrat ve anomali goster"] },
  { key: "shop", aliases: ["dukkan", "magaza"], description_tr: "Boost dukkani — XP/SC boost, streak shield, task reroll, premium pass", description_en: "Boost shop — XP/SC boost, streak shield, task reroll, premium pass", intents: ["shop", "dukkan", "magaza", "satin al", "boost", "buy boost"], scenarios: ["/shop", "dukkan ac", "boost al"], outcomes: ["boost kataloğunu goster", "aktif boost'lari listele", "satin alma aksiyonu sun"] },
  { key: "missions", aliases: ["misyon"], description_tr: "Misyon tablosu — gunluk hedefler, ilerleme ve claim durumu", description_en: "Mission board — daily goals, progress tracking and claim status", intents: ["missions", "misyon", "mission", "gorevler", "hedefler", "daily missions"], scenarios: ["/missions", "misyonlarim", "gunluk hedefler"], outcomes: ["misyon listesini goster", "claimable odulleri belirt", "ilerleme barlarini goster"] },
  { key: "war", aliases: ["savas"], description_tr: "Topluluk savası — war room tier, havuz puani ve sezon sonu odulleri", description_en: "Community war — war room tier, pool points and end-of-season rewards", intents: ["war", "savasi", "savas", "war room", "community war"], scenarios: ["/war", "savas durumu", "war room"], outcomes: ["havuz puanini goster", "tier ilerlemesini belirt", "sezon sonu odul tahminini goster"] },
  { key: "streak", aliases: [], description_tr: "Streak durumu — gün serisi, en iyi seri, grace suresi ve carpan", description_en: "Streak status — day streak, best streak, grace period and multiplier", intents: ["streak", "seri", "gun serisi", "streak durumu"], scenarios: ["/streak", "seri durumum"], outcomes: ["mevcut seriyi goster", "en iyi seriyi belirt", "grace suresini goster", "streak carpanini hesapla"] },
  {
    key: "settings",
    aliases: ["ayarlar", "preferences"],
    description_tr: "Ayarlar — dil, bildirim, accessibility ve UI tercihleri",
    description_en: "Settings — language, notifications, accessibility and UI preferences",
    intents: ["settings", "ayarlar", "preferences", "ayar", "tercihler", "config"],
    scenarios: ["/settings", "ayarlar", "preferences", "ayarlarimi goster"],
    outcomes: ["kayitli UI tercihlerini goster", "dil ve bildirim ayarlarini yonet", "settings paneline gecis sagla"]
  },
  {
    key: "support",
    aliases: ["destek", "yardim_et"],
    description_tr: "Destek merkezi — sorun kategorileme, FAQ yonlendirme ve ticket",
    description_en: "Support center — issue categorization, FAQ routing and ticket",
    intents: ["support", "destek", "support ticket", "contact support", "sorun", "problem", "bug"],
    scenarios: ["/support", "destek", "sorunum var", "help"],
    outcomes: ["sorunu kategorize et", "FAQ'ya yonlendir", "gerekirse ticket olustur"]
  },
  {
    key: "faq",
    aliases: ["sss", "sorular"],
    description_tr: "SSS — sik sorulan sorular, lokalize kartlar ve cozum onerileri",
    description_en: "FAQ — frequently asked questions, localized cards and resolution hints",
    intents: ["faq", "sss", "common issues", "questions", "sorular", "soru"],
    scenarios: ["/faq", "sss", "common issues", "sikga sorulanlar"],
    outcomes: ["sik sorulari kisa kartlarla goster", "cozum onerileri sun", "gerekirse support akisini oner"]
  },
  { key: "status", aliases: ["durum"], description_tr: "Sistem snapshot — runtime, queue sinyali, performans ve flag durumu", description_en: "System snapshot — runtime, queue signals, performance and flag status", intents: ["status", "durum", "sistem", "system", "health", "saglik"], scenarios: ["/status", "sistem durumu", "system health"], outcomes: ["runtime snapshot goster", "queue ve performans sinyallerini belirt", "flag durumlarini listele"] },
  { key: "nexus", aliases: ["contract", "kontrat", "anomaly"], description_tr: "Nexus pulse — anomaly durumu, aktif kontrat ve basınç metrikleri", description_en: "Nexus pulse — anomaly status, active contract and pressure metrics", intents: ["nexus", "contract", "kontrat", "anomaly", "pulse", "anomali"], scenarios: ["/nexus", "anomali durumu", "kontrat ne"], outcomes: ["aktif anomaly ve kontrati goster", "basinc metriklerini belirt", "preferred mode onerisi yap"] },
  { key: "ops", aliases: [], description_tr: "Ops runtime — alarm, queue ozeti ve sistem sagligi", description_en: "Ops runtime — alarms, queue summary and system health", intents: ["ops", "operation", "operasyon"], scenarios: ["/ops", "ops durumu"], outcomes: ["runtime alarm ve sinyal ozetini goster"] },
  { key: "onboard", aliases: [], description_tr: "3 adimli hizli kurulum — tasks → finish → reveal dongusu", description_en: "3-step quick setup — tasks → finish → reveal loop", intents: ["onboard", "basla", "ilk adim", "first step"], scenarios: ["/onboard", "nasil baslarim"], outcomes: ["onboard adimlarini goster", "ilk gorevi kabul ettir", "bakiye ve token bilgisi sun"] },
  { key: "ui_mode", aliases: [], description_tr: "UI kalite modu — motion, okunabilirlik ve performans ayarlari", description_en: "UI quality mode — motion, readability and performance settings", intents: ["ui", "ui mode", "arayuz", "gorunum"], scenarios: ["/ui_mode", "arayuz ayarlari"], outcomes: ["UI kalite profilini goster", "motion/readability ayarlarini sun"] },
  { key: "perf", aliases: ["performans"], description_tr: "Performans raporu — FPS, API latency, bundle size ve health check", description_en: "Performance report — FPS, API latency, bundle size and health check", intents: ["perf", "performans", "fps", "hiz", "performance"], scenarios: ["/perf", "performans raporu"], outcomes: ["FPS ve API latency goster", "bundle size bilgisi sun", "saglik kontrolu ozeti ver"] },
  { key: "raid_contract", aliases: [], description_tr: "Raid kontrat paneli — hedef, bonus carpan, wave ilerleme ve oduller", description_en: "Raid contract panel — target, bonus multiplier, wave progress and rewards", intents: ["raid contract", "raid kontrat", "kontrat hedefi", "raid bonus"], scenarios: ["/raid_contract", "raid kontrat durumu"], outcomes: ["aktif kontrat hedefini goster", "bonus carpani belirt", "wave ilerlemesini ozetle"] },
  { key: "whoami", aliases: [], description_tr: "Telegram ID ve admin eslesme kontrolu — kimlik dogrulama", description_en: "Telegram ID and admin matching check — identity verification", intents: ["whoami", "ben kimim", "who am i"], scenarios: ["/whoami", "ben kimim"], outcomes: ["Telegram ID goster", "admin eslesmesini kontrol et"] },
  { key: "admin", aliases: [], description_tr: "Admin ana paneli — canli kuyruk, metrikler ve system kontrol", description_en: "Admin main panel — live queue, metrics and system control", intents: ["admin", "yonetim"], adminOnly: true },
  { key: "admin_live", aliases: [], description_tr: "Admin canli izleme paneli — telemetry ve real-time metrikler", description_en: "Admin live monitoring — telemetry and real-time metrics", intents: ["admin live"], adminOnly: true },
  { key: "admin_live_ops", aliases: [], description_tr: "Live ops campaign push — segment hedefleme, dry-run ve dispatch", description_en: "Live ops campaign push — segment targeting, dry-run and dispatch", intents: ["admin live ops"], adminOnly: true },
  { key: "admin_queue", aliases: [], description_tr: "Birlesik payout+token onay kuyrugu — hizli aksiyon paneli", description_en: "Unified payout+token approval queue — quick action panel", intents: ["admin queue"], adminOnly: true },
  { key: "admin_payouts", aliases: [], description_tr: "Payout kuyrugu — onay, red ve islem takibi", description_en: "Payout queue — approval, rejection and tracking", intents: ["admin payouts"], adminOnly: true },
  { key: "admin_tokens", aliases: [], description_tr: "Token kuyrugu — TX dogrulama, onay ve red paneli", description_en: "Token queue — TX verification, approval and rejection panel", intents: ["admin tokens"], adminOnly: true },
  { key: "admin_metrics", aliases: [], description_tr: "Admin KPI dashboard — DAU, WAU, SC/HC dagitimi, queue metrikleri", description_en: "Admin KPI dashboard — DAU, WAU, SC/HC distribution, queue metrics", intents: ["admin metrics"], adminOnly: true },
  { key: "admin_config", aliases: [], description_tr: "Admin runtime config — feature flags, source mode ve env durumu", description_en: "Admin runtime config — feature flags, source mode and env state", intents: ["admin config"], adminOnly: true },
  { key: "admin_gate", aliases: ["admin_token_gate"], description_tr: "Payout gate — min cap, target, drip limiti ve acilim karari", description_en: "Payout gate — min cap, target, drip limit and opening decision", intents: ["admin gate"], adminOnly: true },
  { key: "admin_token_price", aliases: [], description_tr: "Token spot fiyatini guncelle — oracle override", description_en: "Update token spot price — oracle override", intents: [], adminOnly: true },
  { key: "admin_freeze", aliases: [], description_tr: "Sistem freeze — global dondurma ac/kapat, audit log ile", description_en: "System freeze — global freeze enable/disable with audit log", intents: ["admin freeze"], adminOnly: true },
  { key: "pay", aliases: [], description_tr: "Payout talebini paid olarak isaretle — TX hash ve onay", description_en: "Mark payout request as paid — TX hash and confirmation", intents: [], adminOnly: true },
  { key: "reject_payout", aliases: [], description_tr: "Payout talebini reddet — operasyonel sebep kodu ile", description_en: "Reject payout request — with operational reason code", intents: [], adminOnly: true },
  { key: "approve_token", aliases: [], description_tr: "Token talebini onayla — TX dogrulama sonrasi bakiye aktar", description_en: "Approve token request — transfer balance after TX verification", intents: [], adminOnly: true },
  { key: "reject_token", aliases: [], description_tr: "Token talebini reddet — sebep kodu ile audit trail", description_en: "Reject token request — with reason code and audit trail", intents: [], adminOnly: true },
  // ── Blueprint CHAT_COMMAND_MATRIX — missing handlers ──
  {
    key: "claim",
    aliases: ["topla", "al"],
    description_tr: "Bekleyen odulleri topla — mission, streak, season ve event odulleri",
    description_en: "Claim pending rewards — mission, streak, season and event rewards",
    intents: ["claim", "topla", "al", "odul al", "collect", "collect rewards", "odul topla"],
    scenarios: ["/claim", "odulleri topla", "collect all", "claim rewards"],
    outcomes: ["claimable odulleri listele", "tek tikla toplu claim", "bakiye guncellemesini goster"]
  },
  {
    key: "history",
    aliases: ["gecmis", "log"],
    description_tr: "Islem gecmisi — gorev, PvP, payout, token ve reveal kayitlari",
    description_en: "Transaction history — task, PvP, payout, token and reveal records",
    intents: ["history", "gecmis", "log", "islemler", "transactions", "geçmiş", "kayitlar"],
    scenarios: ["/history", "islem gecmisi", "transaction log", "son islemler"],
    outcomes: ["son 20 islemi kronolojik listele", "filtre: tip/tarih/miktar", "toplam kazanc/harcama ozeti"]
  },
  {
    key: "rank",
    aliases: ["sira", "derece"],
    description_tr: "Kisisel siralama — sezon, arena, topluluk ve global rank detayi",
    description_en: "Personal ranking — season, arena, community and global rank detail",
    intents: ["rank", "sira", "derece", "siralamam", "my rank", "ranking", "neredeyim"],
    scenarios: ["/rank", "siralamam nerede", "my ranking", "rank detay"],
    outcomes: ["sezon/arena/global siralamani goster", "yuzdelik dilim ve trend", "sonraki hedef mesafesi"]
  },
  {
    key: "inventory",
    aliases: ["envanter", "esya"],
    description_tr: "Envanter — loot, boost, malzeme ve koleksiyon esyalari",
    description_en: "Inventory — loot, boosts, materials and collectible items",
    intents: ["inventory", "envanter", "esya", "items", "esyalarim", "my items", "bag", "canta"],
    scenarios: ["/inventory", "envanterim", "esyalarim", "my inventory"],
    outcomes: ["envanter icerigini tip/nadir bazli listele", "kullanilabilir boost'lari belirt", "fusion uygun esleri goster"]
  },
  {
    key: "invite",
    aliases: ["davet"],
    description_tr: "Davet linki olustur — referral kodu, bonus yapisi ve paylasim",
    description_en: "Generate invite link — referral code, bonus structure and sharing",
    intents: ["invite", "davet", "referral", "davet linki", "invite link", "ref", "arkadas davet"],
    scenarios: ["/invite", "davet linki", "invite link", "referral kodum"],
    outcomes: ["kisisel referral linkini goster", "referral bonus yapisini acikla", "mevcut davet istatistiklerini belirt"]
  },
  {
    key: "friends",
    aliases: ["arkadaslar", "dostlar"],
    description_tr: "Arkadas listesi — referral agaci, aktif arkadaslar ve bonus durumu",
    description_en: "Friends list — referral tree, active friends and bonus status",
    intents: ["friends", "arkadaslar", "dostlar", "friend list", "arkadaslarim", "my friends"],
    scenarios: ["/friends", "arkadaslarim", "friend list", "referral agaci"],
    outcomes: ["referral agaci ozetini goster", "aktif arkadas sayisi ve bonuslari", "son katilan arkadaslari listele"]
  },
  {
    key: "share",
    aliases: ["paylas"],
    description_tr: "Profil veya basari paylasimi — sosyal paylasim karti olustur",
    description_en: "Share profile or achievement — generate social sharing card",
    intents: ["share", "paylas", "paylasim", "share profile", "paylas profil"],
    scenarios: ["/share", "profilimi paylas", "share my profile", "basarimi paylas"],
    outcomes: ["paylasim karti olustur", "deeplink ile profil linki sun", "sosyal medya formatinda cikti"]
  },
  {
    key: "news",
    aliases: ["haberler", "duyuru"],
    description_tr: "Haberler ve duyurular — guncelleme, patch, etkinlik ve topluluk haberleri",
    description_en: "News and announcements — updates, patches, events and community news",
    intents: ["news", "haberler", "duyuru", "announcements", "ne yeni", "what's new", "guncel"],
    scenarios: ["/news", "haberler", "ne yeni var", "son duyurular"],
    outcomes: ["son 5 haberi/duyuruyu goster", "patch notlarini ozetle", "yaklasan etkinlikleri belirt"]
  },
  {
    key: "quests",
    aliases: ["gorev_zinciri", "hikaye"],
    description_tr: "Gorev zincirleri — cok adimli hikaye misyonlari ve ilerleme takibi",
    description_en: "Quest chains — multi-step story missions and progress tracking",
    intents: ["quests", "gorev zinciri", "hikaye gorevi", "story quest", "quest chain", "ana gorev"],
    scenarios: ["/quests", "gorev zincirleri", "quest chains", "hikaye gorevleri"],
    outcomes: ["aktif gorev zincirlerini goster", "ilerleme durumu ve sonraki adim", "zincir odul havuzunu belirt"]
  },
  {
    key: "chests",
    aliases: ["kasalar", "loot_box", "sandik"],
    description_tr: "Kasa acma merkezi — son loot reveallari, nadir esya gecmisi ve pity durumu",
    description_en: "Chest opening center — recent loot reveals, rare item history and pity status",
    intents: ["chests", "kasalar", "sandik", "kasa ac", "loot box", "chest", "open chest", "loot reveal"],
    scenarios: ["/chests", "kasalari goster", "loot history", "son kasalar", "chest reveals"],
    outcomes: ["son 10 kasa acilisini goster", "nadir esya istatistiklerini belirt", "pity counter ve sonraki garantiyi goster"]
  }
]);

const COMMAND_REGISTRY = Object.freeze(normalizeCommandRegistry(RAW_COMMAND_REGISTRY));
const VALIDATION = validateCommandRegistry(COMMAND_REGISTRY);
if (!VALIDATION.ok) {
  throw new Error(`invalid_command_registry:${VALIDATION.errors.join(",")}`);
}

function getCommandRegistry() {
  return COMMAND_REGISTRY.slice();
}

function toTelegramCommands(registryInput, lang = "tr") {
  const source = Array.isArray(registryInput) ? registryInput : getCommandRegistry();
  const registry = getPrimaryCommands(source);
  const normalizedLang = normalizeLanguage(lang, "tr");
  const output = [];
  const seen = new Set();
  for (const item of registry) {
    if (!item || !item.key || seen.has(item.key)) {
      continue;
    }
    if (String(item.key).startsWith("admin_") && item.key !== "admin") {
      continue;
    }
    const description =
      normalizedLang === "en"
        ? String(item.description_en || item.description_tr || item.key)
        : String(item.description_tr || item.description_en || item.key);
    output.push({
      command: String(item.key),
      description: description.slice(0, 255)
    });
    seen.add(item.key);
  }
  return output;
}

function buildAliasLookup(registryInput) {
  const registry = Array.isArray(registryInput) ? registryInput : getCommandRegistry();
  const map = new Map();
  for (const item of registry) {
    if (!item || !item.key) {
      continue;
    }
    map.set(String(item.key).toLowerCase(), item.key);
    for (const alias of item.aliases || []) {
      map.set(String(alias || "").toLowerCase(), item.key);
    }
  }
  return map;
}

function getPrimaryCommands(registryInput) {
  const registry = Array.isArray(registryInput) ? registryInput : getCommandRegistry();
  return registry.filter((item) => item.primary);
}

module.exports = {
  getCommandRegistry,
  toTelegramCommands,
  buildAliasLookup,
  getPrimaryCommands
};




