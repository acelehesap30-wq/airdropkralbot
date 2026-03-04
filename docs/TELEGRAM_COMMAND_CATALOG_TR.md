# Telegram Komut Katalogu (TR Derin Icerik)

Bu dokuman botta aktif komut kartlarinin operasyonel ozetini verir. Kaynak: `apps/bot/src/commands/helpCards.js`.

Toplam komut: **47**

## Core Loop (10)

### /arena_rank

- Scope: **player**
- Amac: Arena rating, rank ve ladder ozeti. Core loop temposunu korur; gorev kabul, bitirme ve reveal arasinda kayip adimlari kapatir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /arena_rank -> /pvp -> /season -> /leaderboard.
- Ne zaman kullanilir: Task -> Finish -> Reveal ana omurgasinda hizli karar almak icin kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /pvp -> /season -> /leaderboard.

**Operasyon Akisi**
- launcher/task paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /arena_rank.
- Yanit durumunu dogrula ve /pvp -> /season zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- State kaymasini engellemek icin core loop sirasini bozma.

**Kullanim Sozdizimi**
- /arena_rank
- arena rank
- pvp leaderboard

**Ornekler**
- /arena_rank
- arena rank
- metin: arena rank

**Beklenen Cikti**
- rating, rank ve leaderboard verisini goster.
- Yanitta sonraki hamle butonlari ve aktif deneme durumu birlikte guncellenir.
- Akis zinciri: /pvp -> /season -> /leaderboard.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /pvp
- /season
- /leaderboard

### /finish

- Scope: **player**
- Amac: Aktif denemeyi secili mod ile kapatir; risk-odul sonucu, puan ve zincir etkisini hesaplar.
- Ne zaman kullanilir: Aktif gorev acikken safe/balanced/aggressive kararini vermek icin kullan.

**Operasyon Akisi**
- launcher/task paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /finish <safe|balanced|aggressive>.
- Yanit durumunu dogrula ve /reveal -> /tasks zinciriyle devam et.
- Arguman sirasini sabit tut; placeholder alanlari pozisyoneldir.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- State kaymasini engellemek icin core loop sirasini bozma.

**Kullanim Sozdizimi**
- /finish <safe|balanced|aggressive>
- /finish balanced
- bitir dengeli
- /finish aggressive

**Ornekler**
- /finish <safe|balanced|aggressive>
- /finish balanced
- metin: finish

**Beklenen Cikti**
- aktif denemeyi kapat.
- sonuc ve olasilik ozeti goster.
- Yanitta sonraki hamle butonlari ve aktif deneme durumu birlikte guncellenir.
- Akis zinciri: /reveal -> /tasks -> /pvp.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.

**Ilgili Komutlar**
- /reveal
- /tasks
- /pvp

### /help

- Scope: **player**
- Amac: Detayli komut kartlari ve kisayollar. Core loop temposunu korur; gorev kabul, bitirme ve reveal arasinda kayip adimlari kapatir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /help -> /menu -> /tasks -> /status.
- Ne zaman kullanilir: Task -> Finish -> Reveal ana omurgasinda hizli karar almak icin kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /menu -> /tasks -> /status.

**Operasyon Akisi**
- launcher/task paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /help.
- Yanit durumunu dogrula ve /menu -> /tasks zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- State kaymasini engellemek icin core loop sirasini bozma.

**Kullanim Sozdizimi**
- /help
- /help <komut>
- /help <kategori>
- /komutlar

**Ornekler**
- /help
- /help <komut>
- metin: help

**Beklenen Cikti**
- primer komutlari amac+senaryo ile listeler.
- Yanitta sonraki hamle butonlari ve aktif deneme durumu birlikte guncellenir.
- Akis zinciri: /menu -> /tasks -> /status.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /menu
- /tasks
- /status

### /menu

- Scope: **player**
- Amac: Ana launcher, hizli rota ve kisayol merkezi. Core loop temposunu korur; gorev kabul, bitirme ve reveal arasinda kayip adimlari kapatir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /menu -> /onboard -> /tasks -> /play.
- Ne zaman kullanilir: Task -> Finish -> Reveal ana omurgasinda hizli karar almak icin kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /onboard -> /tasks -> /play.

**Operasyon Akisi**
- launcher/task paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /menu.
- Yanit durumunu dogrula ve /onboard -> /tasks zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- State kaymasini engellemek icin core loop sirasini bozma.

**Kullanim Sozdizimi**
- /menu
- /start
- ana menu

**Ornekler**
- /menu
- /start
- metin: menu

**Beklenen Cikti**
- launcher panelini ac.
- onboard/play/tasks kisayollarini goster.
- Yanitta sonraki hamle butonlari ve aktif deneme durumu birlikte guncellenir.
- Akis zinciri: /onboard -> /tasks -> /play.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /onboard
- /tasks
- /play

### /onboard

- Scope: **player**
- Amac: 3 adim hizli kurulum + sonraki hamle. Core loop temposunu korur; gorev kabul, bitirme ve reveal arasinda kayip adimlari kapatir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /onboard -> /tasks -> /finish -> /reveal.
- Ne zaman kullanilir: Task -> Finish -> Reveal ana omurgasinda hizli karar almak icin kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /tasks -> /finish -> /reveal.

**Operasyon Akisi**
- launcher/task paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /onboard.
- Yanit durumunu dogrula ve /tasks -> /finish zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- State kaymasini engellemek icin core loop sirasini bozma.

**Kullanim Sozdizimi**
- /onboard

**Ornekler**
- /onboard
- onboard
- metin: onboard

**Beklenen Cikti**
- 3 adim hizli kurulum + sonraki hamle.
- Yanitta sonraki hamle butonlari ve aktif deneme durumu birlikte guncellenir.
- Akis zinciri: /tasks -> /finish -> /reveal.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /tasks
- /finish
- /reveal

### /play

- Scope: **player**
- Amac: Nexus Arena web panelini ac. Core loop temposunu korur; gorev kabul, bitirme ve reveal arasinda kayip adimlari kapatir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /play -> /tasks -> /status -> /ui_mode.
- Ne zaman kullanilir: Task -> Finish -> Reveal ana omurgasinda hizli karar almak icin kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /tasks -> /status -> /ui_mode.

**Operasyon Akisi**
- launcher/task paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /play.
- Yanit durumunu dogrula ve /tasks -> /status zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- State kaymasini engellemek icin core loop sirasini bozma.

**Kullanim Sozdizimi**
- /play
- arena 3d ac
- open arena

**Ornekler**
- /play
- arena 3d ac
- metin: play

**Beklenen Cikti**
- webapp mini app linki uret.
- pvp/task/vault panelini ac.
- Yanitta sonraki hamle butonlari ve aktif deneme durumu birlikte guncellenir.
- Akis zinciri: /tasks -> /status -> /ui_mode.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /tasks
- /status
- /ui_mode

### /pvp

- Scope: **player**
- Amac: PvP raid baslat ve kontrat puani isle. Core loop temposunu korur; gorev kabul, bitirme ve reveal arasinda kayip adimlari kapatir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /pvp -> /arena_rank -> /raid_contract -> /nexus.
- Ne zaman kullanilir: Task -> Finish -> Reveal ana omurgasinda hizli karar almak icin kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /arena_rank -> /raid_contract -> /nexus.

**Operasyon Akisi**
- launcher/task paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /pvp <safe|balanced|aggressive>.
- Yanit durumunu dogrula ve /arena_rank -> /raid_contract zinciriyle devam et.
- Arguman sirasini sabit tut; placeholder alanlari pozisyoneldir.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- State kaymasini engellemek icin core loop sirasini bozma.

**Kullanim Sozdizimi**
- /pvp <safe|balanced|aggressive>
- /pvp aggressive
- raid balanced
- /pvp

**Ornekler**
- /pvp <safe|balanced|aggressive>
- /pvp aggressive
- metin: pvp

**Beklenen Cikti**
- pvp oturumu baslat.
- kontrat/progression metriklerini ilerlet.
- Yanitta sonraki hamle butonlari ve aktif deneme durumu birlikte guncellenir.
- Akis zinciri: /arena_rank -> /raid_contract -> /nexus.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.

**Ilgili Komutlar**
- /arena_rank
- /raid_contract
- /nexus

### /reveal

- Scope: **player**
- Amac: Bitmis denemenin odulunu finalize eder; pity, bakiye, sezon ve yan metrikleri gunceller.
- Ne zaman kullanilir: Finish sonrasi kasa acma adiminda tek dogru komuttur.

**Operasyon Akisi**
- launcher/task paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /reveal.
- Yanit durumunu dogrula ve /tasks -> /wallet zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- State kaymasini engellemek icin core loop sirasini bozma.

**Kullanim Sozdizimi**
- /reveal
- kasa ac
- open loot

**Ornekler**
- /reveal
- kasa ac
- metin: reveal

**Beklenen Cikti**
- son biten denemenin odulunu dagit.
- pity ve bakiye guncelle.
- Yanitta sonraki hamle butonlari ve aktif deneme durumu birlikte guncellenir.
- Akis zinciri: /tasks -> /wallet -> /missions.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /tasks
- /wallet
- /missions

### /story

- Scope: **player**
- Amac: Hikaye akisi, onboarding ve rota rehberi. Core loop temposunu korur; gorev kabul, bitirme ve reveal arasinda kayip adimlari kapatir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /story -> /onboard -> /tasks -> /help.
- Ne zaman kullanilir: Task -> Finish -> Reveal ana omurgasinda hizli karar almak icin kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /onboard -> /tasks -> /help.

**Operasyon Akisi**
- launcher/task paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /story.
- Yanit durumunu dogrula ve /onboard -> /tasks zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- State kaymasini engellemek icin core loop sirasini bozma.

**Kullanim Sozdizimi**
- /story
- /guide
- /rehber

**Ornekler**
- /story
- /guide
- metin: story

**Beklenen Cikti**
- onboard adimlarini ve kontrat baglamini acikla.
- Yanitta sonraki hamle butonlari ve aktif deneme durumu birlikte guncellenir.
- Akis zinciri: /onboard -> /tasks -> /help.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /onboard
- /tasks
- /help

### /tasks

- Scope: **player**
- Amac: Aktif gorev havuzunu acar, sure/odul dengesini gosterir ve kabul aksiyonuna gecis saglar.
- Ne zaman kullanilir: Donguyu baslatmak, RC verimliligini artirmak veya yeni lineup cekmek istediginde kullan.

**Operasyon Akisi**
- launcher/task paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /tasks.
- Yanit durumunu dogrula ve /finish -> /reveal zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- State kaymasini engellemek icin core loop sirasini bozma.

**Kullanim Sozdizimi**
- /tasks
- /gorev
- quest list

**Ornekler**
- /tasks
- /gorev
- metin: tasks

**Beklenen Cikti**
- aktif gorev havuzunu goster.
- kabul edilebilir offerlari listele.
- Yanitta sonraki hamle butonlari ve aktif deneme durumu birlikte guncellenir.
- Akis zinciri: /finish -> /reveal -> /daily.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /finish
- /reveal
- /daily

## Ekonomi (8)

### /buytoken

- Scope: **player**
- Amac: Token alim talebi ve quote olustur. Ekonomi akisinda bakiye, quote, payout ve zincir baglantisini ayni operasyon hattinda toplar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /buytoken -> /token -> /tx -> /vault.
- Ne zaman kullanilir: Bakiye, payout ve token akisinda risk/limit kontrolu gerektiginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /token -> /tx -> /vault.

**Operasyon Akisi**
- wallet/vault/token paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /buytoken <usd> <chain>.
- Yanit durumunu dogrula ve /token -> /tx zinciriyle devam et.
- Arguman sirasini sabit tut; placeholder alanlari pozisyoneldir.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Geri donulemez transferlerden once limit, quote yasi ve talep sahipligini dogrula.

**Kullanim Sozdizimi**
- /buytoken <usd> <chain>
- /buytoken 5 TON
- /buytoken 25 TRX
- /buytoken

**Ornekler**
- /buytoken <usd> <chain>
- /buytoken 5 TON
- metin: buytoken

**Beklenen Cikti**
- Token alim talebi ve quote olustur.
- Bakiye/payout/token panelleri ayni cevapta risk-limit sinyali ile gelir.
- Akis zinciri: /token -> /tx -> /vault.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.
- USD veya chain gecersiz: /buytoken <usd> <chain> formatini kullan.
- Min/Max USD bandi disinda talep olusturuldu.

**Ilgili Komutlar**
- /token
- /tx
- /vault

### /daily

- Scope: **player**
- Amac: Gunluk haklar, cap ve odul paneli. Ekonomi akisinda bakiye, quote, payout ve zincir baglantisini ayni operasyon hattinda toplar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /daily -> /tasks -> /missions -> /wallet.
- Ne zaman kullanilir: Bakiye, payout ve token akisinda risk/limit kontrolu gerektiginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /tasks -> /missions -> /wallet.

**Operasyon Akisi**
- wallet/vault/token paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /daily.
- Yanit durumunu dogrula ve /tasks -> /missions zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Geri donulemez transferlerden once limit, quote yasi ve talep sahipligini dogrula.

**Kullanim Sozdizimi**
- /daily
- /gunluk

**Ornekler**
- /daily
- /gunluk
- metin: daily

**Beklenen Cikti**
- Gunluk haklar, cap ve odul paneli.
- Bakiye/payout/token panelleri ayni cevapta risk-limit sinyali ile gelir.
- Akis zinciri: /tasks -> /missions -> /wallet.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /tasks
- /missions
- /wallet

### /mint

- Scope: **player**
- Amac: SC/HC/RC bakiyesini tokena cevir. Ekonomi akisinda bakiye, quote, payout ve zincir baglantisini ayni operasyon hattinda toplar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /mint -> /token -> /wallet -> /buytoken.
- Ne zaman kullanilir: Bakiye, payout ve token akisinda risk/limit kontrolu gerektiginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /token -> /wallet -> /buytoken.

**Operasyon Akisi**
- wallet/vault/token paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /mint.
- Yanit durumunu dogrula ve /token -> /wallet zinciriyle devam et.
- Arguman sirasini sabit tut; placeholder alanlari pozisyoneldir.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Geri donulemez transferlerden once limit, quote yasi ve talep sahipligini dogrula.

**Kullanim Sozdizimi**
- /mint
- /mint <tokenAmount>
- /mint 25

**Ornekler**
- /mint
- /mint <tokenAmount>
- metin: mint

**Beklenen Cikti**
- SC/HC/RC bakiyesini tokena cevir.
- Bakiye/payout/token panelleri ayni cevapta risk-limit sinyali ile gelir.
- Akis zinciri: /token -> /wallet -> /buytoken.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.
- Yetersiz birim: SC/HC/RC havuzunda mint hedefini karsilayan bakiye yok.

**Ilgili Komutlar**
- /token
- /wallet
- /buytoken

### /shop

- Scope: **player**
- Amac: Boost dukkani ve satin alma aksiyonlari. Ekonomi akisinda bakiye, quote, payout ve zincir baglantisini ayni operasyon hattinda toplar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /shop -> /wallet -> /missions -> /tasks.
- Ne zaman kullanilir: Bakiye, payout ve token akisinda risk/limit kontrolu gerektiginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /wallet -> /missions -> /tasks.

**Operasyon Akisi**
- wallet/vault/token paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /shop.
- Yanit durumunu dogrula ve /wallet -> /missions zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Geri donulemez transferlerden once limit, quote yasi ve talep sahipligini dogrula.

**Kullanim Sozdizimi**
- /shop
- /dukkan

**Ornekler**
- /shop
- /dukkan
- metin: shop

**Beklenen Cikti**
- Boost dukkani ve satin alma aksiyonlari.
- Bakiye/payout/token panelleri ayni cevapta risk-limit sinyali ile gelir.
- Akis zinciri: /wallet -> /missions -> /tasks.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /wallet
- /missions
- /tasks

### /token

- Scope: **player**
- Amac: Token cuzdani, quote ve talep durumu. Ekonomi akisinda bakiye, quote, payout ve zincir baglantisini ayni operasyon hattinda toplar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /token -> /mint -> /buytoken -> /tx.
- Ne zaman kullanilir: Bakiye, payout ve token akisinda risk/limit kontrolu gerektiginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /mint -> /buytoken -> /tx.

**Operasyon Akisi**
- wallet/vault/token paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /token.
- Yanit durumunu dogrula ve /mint -> /buytoken zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Geri donulemez transferlerden once limit, quote yasi ve talep sahipligini dogrula.

**Kullanim Sozdizimi**
- /token
- token wallet
- jeton bakiyesi

**Ornekler**
- /token
- token wallet
- metin: token

**Beklenen Cikti**
- token bakiye, quote ve talep durumunu goster.
- Bakiye/payout/token panelleri ayni cevapta risk-limit sinyali ile gelir.
- Akis zinciri: /mint -> /buytoken -> /tx.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /mint
- /buytoken
- /tx

### /tx

- Scope: **player**
- Amac: Token alim talebine zincir TX hash baglar; dogrulama moduna gore onay surecini tetikler.
- Ne zaman kullanilir: Buytoken odemesi yapildiktan sonra talebi finalize etmek icin kullan.

**Operasyon Akisi**
- wallet/vault/token paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /tx <requestId> <txHash>.
- Yanit durumunu dogrula ve /buytoken -> /token zinciriyle devam et.
- Arguman sirasini sabit tut; placeholder alanlari pozisyoneldir.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Geri donulemez transferlerden once limit, quote yasi ve talep sahipligini dogrula.
- TX hash baglamadan once buy request id'nin mevcut kullaniciya ait oldugunu teyit et.

**Kullanim Sozdizimi**
- /tx <requestId> <txHash>
- /tx 104 0xabc123...
- /tx 88 <hash>
- /tx

**Ornekler**
- /tx <requestId> <txHash>
- /tx 104 0xabc123...
- metin: tx

**Beklenen Cikti**
- Token talebine tx hash bagla ve dogrula.
- Bakiye/payout/token panelleri ayni cevapta risk-limit sinyali ile gelir.
- Akis zinciri: /buytoken -> /token -> /status.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.
- Talep-hash uyumsuzlugu: request id ve zincir hash formatini dogrula.
- TX hash formati zincire uymuyor veya request baska kullaniciya ait.

**Ilgili Komutlar**
- /buytoken
- /token
- /status

### /vault

- Scope: **player**
- Amac: Payout uygunlugu, lock durumu, drip limiti ve son cekim detaylarini tek panelde sunar.
- Ne zaman kullanilir: Cekim talebi oncesi risk ve limit kontrolu icin kullan.

**Operasyon Akisi**
- wallet/vault/token paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /vault.
- Yanit durumunu dogrula ve /wallet -> /token zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Geri donulemez transferlerden once limit, quote yasi ve talep sahipligini dogrula.

**Kullanim Sozdizimi**
- /vault
- /payout
- /withdraw

**Ornekler**
- /vault
- /payout
- metin: vault

**Beklenen Cikti**
- payout lock durumunu ve talep uygunlugunu goster.
- Bakiye/payout/token panelleri ayni cevapta risk-limit sinyali ile gelir.
- Akis zinciri: /wallet -> /token -> /status.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /wallet
- /token
- /status

### /wallet

- Scope: **player**
- Amac: SC/HC/RC bakiye ve gunluk cap paneli. Ekonomi akisinda bakiye, quote, payout ve zincir baglantisini ayni operasyon hattinda toplar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /wallet -> /vault -> /token -> /daily.
- Ne zaman kullanilir: Bakiye, payout ve token akisinda risk/limit kontrolu gerektiginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /vault -> /token -> /daily.

**Operasyon Akisi**
- wallet/vault/token paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /wallet.
- Yanit durumunu dogrula ve /vault -> /token zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Geri donulemez transferlerden once limit, quote yasi ve talep sahipligini dogrula.

**Kullanim Sozdizimi**
- /wallet
- /cuzdan
- /balance

**Ornekler**
- /wallet
- /cuzdan
- metin: wallet

**Beklenen Cikti**
- SC/HC/RC ve gunluk cap durumunu goster.
- Bakiye/payout/token panelleri ayni cevapta risk-limit sinyali ile gelir.
- Akis zinciri: /vault -> /token -> /daily.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /vault
- /token
- /daily

## Ilerleme (9)

### /kingdom

- Scope: **player**
- Amac: Tier/reputation ve progression ozeti. Ilerleme metriklerini tek noktada toplar; tier, sezon ve rank kararlarini hizlandirir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /kingdom -> /profile -> /season -> /war.
- Ne zaman kullanilir: Tier, sezon, ladder ve kontrat ilerlemesini takip etmek istediginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /profile -> /season -> /war.

**Operasyon Akisi**
- profile/season paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /kingdom.
- Yanit durumunu dogrula ve /profile -> /season zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /kingdom
- /tier

**Ornekler**
- /kingdom
- /tier
- metin: kingdom

**Beklenen Cikti**
- Tier/reputation ve progression ozeti.
- Tier-sezon-rank metrikleri ayni kartta okunur ve trend gorunur.
- Akis zinciri: /profile -> /season -> /war.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /profile
- /season
- /war

### /leaderboard

- Scope: **player**
- Amac: Top siralama ve rank farklari. Ilerleme metriklerini tek noktada toplar; tier, sezon ve rank kararlarini hizlandirir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /leaderboard -> /season -> /arena_rank -> /profile.
- Ne zaman kullanilir: Tier, sezon, ladder ve kontrat ilerlemesini takip etmek istediginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /season -> /arena_rank -> /profile.

**Operasyon Akisi**
- profile/season paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /leaderboard.
- Yanit durumunu dogrula ve /season -> /arena_rank zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /leaderboard
- /siralama

**Ornekler**
- /leaderboard
- /siralama
- metin: leaderboard

**Beklenen Cikti**
- Top siralama ve rank farklari.
- Tier-sezon-rank metrikleri ayni kartta okunur ve trend gorunur.
- Akis zinciri: /season -> /arena_rank -> /profile.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /season
- /arena_rank
- /profile

### /missions

- Scope: **player**
- Amac: Misyon listesi, claim ve ilerleme. Ilerleme metriklerini tek noktada toplar; tier, sezon ve rank kararlarini hizlandirir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /missions -> /daily -> /tasks -> /reveal.
- Ne zaman kullanilir: Tier, sezon, ladder ve kontrat ilerlemesini takip etmek istediginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /daily -> /tasks -> /reveal.

**Operasyon Akisi**
- profile/season paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /missions.
- Yanit durumunu dogrula ve /daily -> /tasks zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /missions
- /misyon
- /mission

**Ornekler**
- /missions
- /misyon
- metin: missions

**Beklenen Cikti**
- Misyon listesi, claim ve ilerleme.
- Tier-sezon-rank metrikleri ayni kartta okunur ve trend gorunur.
- Akis zinciri: /daily -> /tasks -> /reveal.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /daily
- /tasks
- /reveal

### /nexus

- Scope: **player**
- Amac: Nexus pulse, anomaly ve aktif kontrat. Ilerleme metriklerini tek noktada toplar; tier, sezon ve rank kararlarini hizlandirir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /nexus -> /raid_contract -> /tasks -> /pvp.
- Ne zaman kullanilir: Tier, sezon, ladder ve kontrat ilerlemesini takip etmek istediginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /raid_contract -> /tasks -> /pvp.

**Operasyon Akisi**
- profile/season paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /nexus.
- Yanit durumunu dogrula ve /raid_contract -> /tasks zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /nexus
- nexus pulse
- /kontrat

**Ornekler**
- /nexus
- nexus pulse
- metin: nexus

**Beklenen Cikti**
- Nexus pulse, anomaly ve aktif kontrat.
- Tier-sezon-rank metrikleri ayni kartta okunur ve trend gorunur.
- Akis zinciri: /raid_contract -> /tasks -> /pvp.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /raid_contract
- /tasks
- /pvp

### /profile

- Scope: **player**
- Amac: Profil, tier, itibar ve sezon karti. Ilerleme metriklerini tek noktada toplar; tier, sezon ve rank kararlarini hizlandirir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /profile -> /kingdom -> /season -> /streak.
- Ne zaman kullanilir: Tier, sezon, ladder ve kontrat ilerlemesini takip etmek istediginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /kingdom -> /season -> /streak.

**Operasyon Akisi**
- profile/season paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /profile.
- Yanit durumunu dogrula ve /kingdom -> /season zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /profile

**Ornekler**
- /profile
- profile
- metin: profile

**Beklenen Cikti**
- Profil, tier, itibar ve sezon karti.
- Tier-sezon-rank metrikleri ayni kartta okunur ve trend gorunur.
- Akis zinciri: /kingdom -> /season -> /streak.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /kingdom
- /season
- /streak

### /raid_contract

- Scope: **player**
- Amac: Raid kontrat hedefi ve bonuslar. Ilerleme metriklerini tek noktada toplar; tier, sezon ve rank kararlarini hizlandirir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /raid_contract -> /pvp -> /war -> /nexus.
- Ne zaman kullanilir: Tier, sezon, ladder ve kontrat ilerlemesini takip etmek istediginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /pvp -> /war -> /nexus.

**Operasyon Akisi**
- profile/season paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /raid_contract.
- Yanit durumunu dogrula ve /pvp -> /war zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /raid_contract
- raid contract
- raid kontrat

**Ornekler**
- /raid_contract
- raid contract
- metin: raid contract

**Beklenen Cikti**
- Raid kontrat hedefi ve bonuslar.
- Tier-sezon-rank metrikleri ayni kartta okunur ve trend gorunur.
- Akis zinciri: /pvp -> /war -> /nexus.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /pvp
- /war
- /nexus

### /season

- Scope: **player**
- Amac: Sezon puan, hedef ve kalan gun. Ilerleme metriklerini tek noktada toplar; tier, sezon ve rank kararlarini hizlandirir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /season -> /leaderboard -> /kingdom -> /arena_rank.
- Ne zaman kullanilir: Tier, sezon, ladder ve kontrat ilerlemesini takip etmek istediginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /leaderboard -> /kingdom -> /arena_rank.

**Operasyon Akisi**
- profile/season paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /season.
- Yanit durumunu dogrula ve /leaderboard -> /kingdom zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /season
- /sezon

**Ornekler**
- /season
- /sezon
- metin: season

**Beklenen Cikti**
- Sezon puan, hedef ve kalan gun.
- Tier-sezon-rank metrikleri ayni kartta okunur ve trend gorunur.
- Akis zinciri: /leaderboard -> /kingdom -> /arena_rank.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /leaderboard
- /kingdom
- /arena_rank

### /streak

- Scope: **player**
- Amac: Streak seviyesi ve reset riski. Ilerleme metriklerini tek noktada toplar; tier, sezon ve rank kararlarini hizlandirir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /streak -> /tasks -> /profile -> /daily.
- Ne zaman kullanilir: Tier, sezon, ladder ve kontrat ilerlemesini takip etmek istediginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /tasks -> /profile -> /daily.

**Operasyon Akisi**
- profile/season paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /streak.
- Yanit durumunu dogrula ve /tasks -> /profile zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /streak

**Ornekler**
- /streak
- streak
- metin: streak

**Beklenen Cikti**
- Streak seviyesi ve reset riski.
- Tier-sezon-rank metrikleri ayni kartta okunur ve trend gorunur.
- Akis zinciri: /tasks -> /profile -> /daily.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /tasks
- /profile
- /daily

### /war

- Scope: **player**
- Amac: Topluluk savasi tier/havuz paneli. Ilerleme metriklerini tek noktada toplar; tier, sezon ve rank kararlarini hizlandirir. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /war -> /raid_contract -> /nexus -> /season.
- Ne zaman kullanilir: Tier, sezon, ladder ve kontrat ilerlemesini takip etmek istediginde kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /raid_contract -> /nexus -> /season.

**Operasyon Akisi**
- profile/season paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /war.
- Yanit durumunu dogrula ve /raid_contract -> /nexus zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /war
- war room
- /savasi

**Ornekler**
- /war
- war room
- metin: war

**Beklenen Cikti**
- Topluluk savasi tier/havuz paneli.
- Tier-sezon-rank metrikleri ayni kartta okunur ve trend gorunur.
- Akis zinciri: /raid_contract -> /nexus -> /season.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /raid_contract
- /nexus
- /season

## Sistem (6)

### /lang

- Scope: **player**
- Amac: Dil tercihini kalici kaydet (tr/en). Sistem ve performans triage adimlarini standartlastirir; runtime sinyallerini okunur tutar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /lang -> /help -> /menu -> /status.
- Ne zaman kullanilir: Dil, runtime ve performans gozlemi gibi operasyonel yardim adimlarinda kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /help -> /menu -> /status.

**Operasyon Akisi**
- status/ops paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /lang <tr|en>.
- Yanit durumunu dogrula ve /help -> /menu zinciriyle devam et.
- Arguman sirasini sabit tut; placeholder alanlari pozisyoneldir.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /lang <tr|en>
- /lang tr
- /lang en
- dil en

**Ornekler**
- /lang <tr|en>
- /lang tr
- metin: lang

**Beklenen Cikti**
- kullanici locale ayarini kalici gunceller.
- yardim ve ipucu metinleri secilen dilde akar.
- Runtime/perf sinyalleri triage icin tek raporda toplanir.
- Akis zinciri: /help -> /menu -> /status.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.

**Ilgili Komutlar**
- /help
- /menu
- /status

### /ops

- Scope: **player**
- Amac: Ops runtime, alarm ve queue ozeti. Sistem ve performans triage adimlarini standartlastirir; runtime sinyallerini okunur tutar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /ops -> /status -> /perf -> /admin_live.
- Ne zaman kullanilir: Dil, runtime ve performans gozlemi gibi operasyonel yardim adimlarinda kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /status -> /perf -> /admin_live.

**Operasyon Akisi**
- status/ops paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /ops.
- Yanit durumunu dogrula ve /status -> /perf zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /ops
- /operation

**Ornekler**
- /ops
- /operation
- metin: ops

**Beklenen Cikti**
- Ops runtime, alarm ve queue ozeti.
- Runtime/perf sinyalleri triage icin tek raporda toplanir.
- Akis zinciri: /status -> /perf -> /admin_live.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /status
- /perf
- /admin_live

### /perf

- Scope: **player**
- Amac: Performans, fps ve API health ozeti. Sistem ve performans triage adimlarini standartlastirir; runtime sinyallerini okunur tutar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /perf -> /status -> /ui_mode -> /ops.
- Ne zaman kullanilir: Dil, runtime ve performans gozlemi gibi operasyonel yardim adimlarinda kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /status -> /ui_mode -> /ops.

**Operasyon Akisi**
- status/ops paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /perf.
- Yanit durumunu dogrula ve /status -> /ui_mode zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /perf
- /performans

**Ornekler**
- /perf
- /performans
- metin: perf

**Beklenen Cikti**
- Performans, fps ve API health ozeti.
- Runtime/perf sinyalleri triage icin tek raporda toplanir.
- Akis zinciri: /status -> /ui_mode -> /ops.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /status
- /ui_mode
- /ops

### /status

- Scope: **player**
- Amac: Runtime snapshot, queue sinyali, performans hizi ve kritik flag durumunu tek raporda verir.
- Ne zaman kullanilir: Sistem sagligini hizli kontrol etmek veya anomali triage icin kullan.

**Operasyon Akisi**
- status/ops paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /status.
- Yanit durumunu dogrula ve /perf -> /ui_mode zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /status
- /durum

**Ornekler**
- /status
- /durum
- metin: status

**Beklenen Cikti**
- Sistem, arena ve runtime snapshot.
- Runtime/perf sinyalleri triage icin tek raporda toplanir.
- Akis zinciri: /perf -> /ui_mode -> /ops.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /perf
- /ui_mode
- /ops

### /ui_mode

- Scope: **player**
- Amac: UI kalite, motion ve okunabilirlik. Sistem ve performans triage adimlarini standartlastirir; runtime sinyallerini okunur tutar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /ui_mode -> /perf -> /play -> /status.
- Ne zaman kullanilir: Dil, runtime ve performans gozlemi gibi operasyonel yardim adimlarinda kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /perf -> /play -> /status.

**Operasyon Akisi**
- status/ops paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /ui_mode.
- Yanit durumunu dogrula ve /perf -> /play zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /ui_mode
- ui mode
- /arayuz

**Ornekler**
- /ui_mode
- ui mode
- metin: ui

**Beklenen Cikti**
- UI kalite, motion ve okunabilirlik.
- Runtime/perf sinyalleri triage icin tek raporda toplanir.
- Akis zinciri: /perf -> /play -> /status.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /perf
- /play
- /status

### /whoami

- Scope: **player**
- Amac: Telegram ID ve admin eslesme kontrolu. Sistem ve performans triage adimlarini standartlastirir; runtime sinyallerini okunur tutar. Oyuncu akisinda kararliligi korur ve en guvenli sonraki adimi gosterir. Akis zinciri: /whoami -> /status -> /help -> /admin.
- Ne zaman kullanilir: Dil, runtime ve performans gozlemi gibi operasyonel yardim adimlarinda kullan. Loop baglamini bozmadan deterministik sonraki adim yonlendirmesi gerektiginde kullan. Akis zinciri: /status -> /help -> /admin.

**Operasyon Akisi**
- status/ops paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /whoami.
- Yanit durumunu dogrula ve /status -> /help zinciriyle devam et.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.

**Kullanim Sozdizimi**
- /whoami

**Ornekler**
- /whoami
- whoami
- metin: whoami

**Beklenen Cikti**
- Telegram ID ve admin eslesme kontrolu.
- Runtime/perf sinyalleri triage icin tek raporda toplanir.
- Akis zinciri: /status -> /help -> /admin.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.

**Ilgili Komutlar**
- /status
- /help
- /admin

## Admin (14)

### /admin

- Scope: **admin**
- Amac: Admin paneli ve canli kuyruk gorunumu. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /admin -> /admin_live -> /admin_queue -> /admin_metrics.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin_live -> /admin_queue -> /admin_metrics.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /admin.
- Yanit durumunu dogrula ve /admin_live -> /admin_queue zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /admin

**Ornekler**
- /admin
- admin
- metin: admin

**Beklenen Cikti**
- Admin paneli ve canli kuyruk gorunumu.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_live -> /admin_queue -> /admin_metrics.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.

**Ilgili Komutlar**
- /admin_live
- /admin_queue
- /admin_metrics

### /admin_config

- Scope: **admin**
- Amac: Admin config, source ve runtime. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /admin_config -> /admin_metrics -> /admin_gate -> /admin_token_price.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin_metrics -> /admin_gate -> /admin_token_price.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /admin_config.
- Yanit durumunu dogrula ve /admin_metrics -> /admin_gate zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /admin_config
- admin config

**Ornekler**
- /admin_config
- admin config
- metin: admin config

**Beklenen Cikti**
- Admin config, source ve runtime.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_metrics -> /admin_gate -> /admin_token_price.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.

**Ilgili Komutlar**
- /admin_metrics
- /admin_gate
- /admin_token_price

### /admin_freeze

- Scope: **admin**
- Amac: Sistem freeze ac/kapat kontrolu. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /admin_freeze -> /admin -> /status -> /ops.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin -> /status -> /ops.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /admin_freeze on <reason>.
- Yanit durumunu dogrula ve /admin -> /status zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /admin_freeze on <reason>
- /admin_freeze confirm on <reason>
- /admin_freeze off
- /admin_freeze

**Ornekler**
- /admin_freeze on <reason>
- /admin_freeze confirm on <reason>
- metin: admin freeze

**Beklenen Cikti**
- Sistem freeze ac/kapat kontrolu.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin -> /status -> /ops.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.
- Kritik komutta `confirm` adimi policy tarafindan zorunlu olabilir.

**Ilgili Komutlar**
- /admin
- /status
- /ops

### /admin_gate

- Scope: **admin**
- Amac: Payout gate esigini/targetini gunceller; acilim kararini market cap ve drip ile hizalar.
- Ne zaman kullanilir: Payout unlock stratejisini yeni piyasa bandina tasimak istediginde kullan.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /admin_gate <minCapUsd> [targetMaxUsd] [dailyDripPct].
- Yanit durumunu dogrula ve /admin_config -> /admin_metrics zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /admin_gate <minCapUsd> [targetMaxUsd] [dailyDripPct]
- /admin_gate confirm 20000000 50000000 1.5
- /admin_gate 20000000
- /admin_gate

**Ornekler**
- /admin_gate <minCapUsd> [targetMaxUsd] [dailyDripPct]
- /admin_gate confirm 20000000 50000000 1.5
- metin: admin gate

**Beklenen Cikti**
- Payout gate lock/unlock ayari.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_config -> /admin_metrics -> /vault.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.
- Kritik komutta `confirm` adimi policy tarafindan zorunlu olabilir.

**Ilgili Komutlar**
- /admin_config
- /admin_metrics
- /vault

### /admin_live

- Scope: **admin**
- Amac: Admin canli panel + telemetry. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /admin_live -> /admin -> /admin_metrics -> /admin_config.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin -> /admin_metrics -> /admin_config.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /admin_live.
- Yanit durumunu dogrula ve /admin -> /admin_metrics zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /admin_live
- admin live

**Ornekler**
- /admin_live
- admin live
- metin: admin live

**Beklenen Cikti**
- Admin canli panel + telemetry.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin -> /admin_metrics -> /admin_config.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.

**Ilgili Komutlar**
- /admin
- /admin_metrics
- /admin_config

### /admin_metrics

- Scope: **admin**
- Amac: Admin KPI ve queue metrikleri. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /admin_metrics -> /admin_live -> /admin_queue -> /admin_config.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin_live -> /admin_queue -> /admin_config.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /admin_metrics.
- Yanit durumunu dogrula ve /admin_live -> /admin_queue zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /admin_metrics
- admin metrics

**Ornekler**
- /admin_metrics
- admin metrics
- metin: admin metrics

**Beklenen Cikti**
- Admin KPI ve queue metrikleri.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_live -> /admin_queue -> /admin_config.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.

**Ilgili Komutlar**
- /admin_live
- /admin_queue
- /admin_config

### /admin_payouts

- Scope: **admin**
- Amac: Payout kuyrugu ve aksiyonlari. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /admin_payouts -> /admin_queue -> /pay -> /reject_payout.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin_queue -> /pay -> /reject_payout.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /admin_payouts.
- Yanit durumunu dogrula ve /admin_queue -> /pay zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /admin_payouts
- admin payouts

**Ornekler**
- /admin_payouts
- admin payouts
- metin: admin payouts

**Beklenen Cikti**
- Payout kuyrugu ve aksiyonlari.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_queue -> /pay -> /reject_payout.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.

**Ilgili Komutlar**
- /admin_queue
- /pay
- /reject_payout

### /admin_queue

- Scope: **admin**
- Amac: Payout ve token taleplerini tek kuyruk modelinde toplar; aksiyon zincirini hizlandirir.
- Ne zaman kullanilir: Canary veya yogun saatlerde kuyruk sikisikligini tek panelden yonetmek icin kullan.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /admin_queue.
- Yanit durumunu dogrula ve /admin_payouts -> /admin_tokens zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /admin_queue
- admin queue

**Ornekler**
- /admin_queue
- admin queue
- metin: admin queue

**Beklenen Cikti**
- Birlesik payout+token admin kuyrugu.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_payouts -> /admin_tokens -> /pay.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.

**Ilgili Komutlar**
- /admin_payouts
- /admin_tokens
- /pay

### /admin_token_price

- Scope: **admin**
- Amac: Token spot fiyatini guncelle. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /admin_token_price -> /admin_config -> /token -> /buytoken.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin_config -> /token -> /buytoken.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /admin_token_price <usdPrice>.
- Yanit durumunu dogrula ve /admin_config -> /token zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /admin_token_price <usdPrice>
- /admin_token_price 0.0005
- /admin_token_price 0.001
- /admin_token_price

**Ornekler**
- /admin_token_price <usdPrice>
- /admin_token_price 0.0005
- metin: admin token price

**Beklenen Cikti**
- Token spot fiyatini guncelle.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_config -> /token -> /buytoken.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.
- Fiyat 0-10 USD araliginda olmali.

**Ilgili Komutlar**
- /admin_config
- /token
- /buytoken

### /admin_tokens

- Scope: **admin**
- Amac: Token kuyrugu onay/red paneli. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /admin_tokens -> /admin_queue -> /approve_token -> /reject_token.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin_queue -> /approve_token -> /reject_token.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /admin_tokens.
- Yanit durumunu dogrula ve /admin_queue -> /approve_token zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /admin_tokens
- admin tokens

**Ornekler**
- /admin_tokens
- admin tokens
- metin: admin tokens

**Beklenen Cikti**
- Token kuyrugu onay/red paneli.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_queue -> /approve_token -> /reject_token.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.

**Ilgili Komutlar**
- /admin_queue
- /approve_token
- /reject_token

### /approve_token

- Scope: **admin**
- Amac: Token talebini onayla ve aktar. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /approve_token -> /admin_tokens -> /reject_token -> /admin_queue.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin_tokens -> /reject_token -> /admin_queue.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /approve_token <requestId> [note].
- Yanit durumunu dogrula ve /admin_tokens -> /reject_token zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /approve_token <requestId> [note]
- /approve_token 77 ok
- /approve_token 77
- /approve_token

**Ornekler**
- /approve_token <requestId> [note]
- /approve_token 77 ok
- metin: approve token

**Beklenen Cikti**
- Token talebini onayla ve aktar.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_tokens -> /reject_token -> /admin_queue.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.
- Talepte tx hash yoksa onay bloklanir.

**Ilgili Komutlar**
- /admin_tokens
- /reject_token
- /admin_queue

### /pay

- Scope: **admin**
- Amac: Payout kaydini paid olarak isaretle. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /pay -> /admin_payouts -> /reject_payout -> /admin_queue.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin_payouts -> /reject_payout -> /admin_queue.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /pay <requestId> <txHash>.
- Yanit durumunu dogrula ve /admin_payouts -> /reject_payout zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /pay <requestId> <txHash>
- /pay confirm <requestId> <txHash>
- /pay 412 0xabc123...
- /pay

**Ornekler**
- /pay <requestId> <txHash>
- /pay confirm <requestId> <txHash>
- metin: pay

**Beklenen Cikti**
- Payout kaydini paid olarak isaretle.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_payouts -> /reject_payout -> /admin_queue.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.
- Kritik komutta `confirm` adimi policy tarafindan zorunlu olabilir.

**Ilgili Komutlar**
- /admin_payouts
- /reject_payout
- /admin_queue

### /reject_payout

- Scope: **admin**
- Amac: Payout talebini reddet ve notla. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /reject_payout -> /admin_payouts -> /pay -> /admin_queue.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin_payouts -> /pay -> /admin_queue.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /reject_payout <requestId> <reason>.
- Yanit durumunu dogrula ve /admin_payouts -> /pay zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /reject_payout <requestId> <reason>
- /reject_payout confirm <requestId> <reason>
- /reject_payout 412 duplicate_wallet
- /reject_payout

**Ornekler**
- /reject_payout <requestId> <reason>
- /reject_payout confirm <requestId> <reason>
- metin: reject payout

**Beklenen Cikti**
- Payout talebini reddet ve notla.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_payouts -> /pay -> /admin_queue.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.
- Kritik komutta `confirm` adimi policy tarafindan zorunlu olabilir.

**Ilgili Komutlar**
- /admin_payouts
- /pay
- /admin_queue

### /reject_token

- Scope: **admin**
- Amac: Token talebini reddet. Canli operasyonlarda kuyruk, policy ve onay aksiyonlarini audit iziyle birlikte yonetir. Admin rail uzerinde policy, onay ve cooldown kapilariyla calisir. Akis zinciri: /reject_token -> /admin_tokens -> /approve_token -> /admin_queue.
- Ne zaman kullanilir: Kritik kuyruk aksiyonlari, policy degisiklikleri ve canli operasyon yonetimi icin kullan. Kuyruk baskisi veya policy sapmasi goruldugunde canary/canli operasyon penceresinde tercih et. Akis zinciri: /admin_tokens -> /approve_token -> /admin_queue.

**Operasyon Akisi**
- admin queue paneli uzerinden anlik durumu kontrol et ve komut baglamini dogrula.
- Kanonik soz dizimiyle calistir: /reject_token <requestId> <reason>.
- Yanit durumunu dogrula ve /admin_tokens -> /approve_token zinciriyle devam et.
- Kritik aksiyonlarda confirm/cooldown policy adimini tamamlamadan tekrar deneme.

**Karar Guard**
- Yanit freeze/lock/yetki uyusmazligi veriyorsa bir sonraki adima gecme.
- Yanit stale ise once durum panelini yenile, sonra deterministik argumanla tekrar dene.
- Admin rail actor eslesmesi ister ve kritik komutlarda `confirm` zorlayabilir.

**Kullanim Sozdizimi**
- /reject_token <requestId> <reason>
- /reject_token 77 bad_tx
- /reject_token 77 risk_signal
- /reject_token

**Ornekler**
- /reject_token <requestId> <reason>
- /reject_token 77 bad_tx
- metin: reject token

**Beklenen Cikti**
- Token talebini reddet.
- Queue/policy sonucu admin audit izi ile birlikte yansir.
- Akis zinciri: /admin_tokens -> /approve_token -> /admin_queue.

**Sik Hata ve Cozum**
- Arguman hatasi: komut soz dizimini ve placeholder alanlarini kontrol et.
- Cooldown/rate limit: kisa sure bekleyip tekrar dene.
- Yetki/onay eksigi: kritik admin aksiyonlarinda iki adimli onay gerekir.
- Arguman sirasi bozulduysa komut beklenen kontrata gore reddedilir.
- Talep zaten approved ise reject engellenir.

**Ilgili Komutlar**
- /admin_tokens
- /approve_token
- /admin_queue

