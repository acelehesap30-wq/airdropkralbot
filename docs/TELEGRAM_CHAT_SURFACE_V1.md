# AirdropKralBot Telegram Chat Surface V1

Kaynak blueprint: `apps/bot/src/commands/chatBlueprint.js`

Bu dokuman AirdropKralBot icin Telegram chat yuzeyinin kararli V1 mimarisini kilitler. Bu katman:

- onboarding gateway
- trust surface
- notification channel
- quick-action cockpit
- payout status channel
- summary shell
- Mini App handoff surface

olur.

Asla:

- tam gameplay yuzeyi,
- uzun yardim deposu,
- fake urgency kanali,
- generic keyboard coplugu

olmaz.

## 1. Chat UX Principles

1. Tek baskin aksiyon: Her mesajda yalnizca bir primary CTA vardir.
2. Chat kokpittir: Derin oynanis, detayli wallet/payout formlari ve 3D kesif Mini App'te kalir.
3. Scroll yorgunlugu yasatmaz: Refresh ve gezinme aksiyonlarinda edit-message tercih edilir.
4. Guven, heyecandan once gelir: Para, payout, review ve risk dilinde sahte aciliyet kullanilmaz.
5. Locale-native: TR varsayilan, EN override kalici.
6. Kullanici kaybolmaz: Her yuzeyde `Hub`, `Help` veya ilgili zone deeplink'i vardir.
7. Chat yalnizca safe quick action calistirir: Reveal veya mission claim gibi teyitli dusuk riskli aksiyonlar chat'te kapanabilir.
8. Mini App'e dogru cekis: Chat, ayni isi tekrar etmez; tam dogru zone'a yollar.

## 2. Chat Information Architecture

### Chat'te kalacaklar

- `/start` ve ilk kurulum
- dil tespiti ve elle override
- profil ozeti
- bakiye ozeti
- payout durumu
- sezon ozeti
- safe quick claim
- event ve chest alertleri
- share/invite yuzeyleri
- trust/support girisleri
- Mini App aktivitesi ozetleri

### Mini App'te kalacaklar

- immersive world navigation
- tam mission/task board derinligi
- 3D exploration
- event mekaniklerinin detayli akisi
- premium purchase
- tam leaderboard
- detayli wallet/payout request formlari

### Sinir kurallari

1. Chat, payout formunu tam replikalamaz.
2. Chat, eventin ne oldugunu anlatir; kompleks etkilesimi Mini App'te acar.
3. Chat, kullaniciyi `play` yerine spesifik zone'a yollamayi tercih eder.
4. Chat'te bos ekran yoktur; bos durumda her zaman "simdi ne yap" vardir.

## 3. Full Command Matrix

Tam command matrix ve her komut icin:

- exact purpose
- default copy style
- localized label variants
- Telegram command menu gorunurlugu
- inline mirror'lari
- first-use davranisi
- confused-user recoverysi
- stateful context ihtiyaci
- ilgili Mini App deep link'i
- analytics eventleri
- anti-spam/anti-abuse kurallari

`apps/bot/src/commands/chatBlueprint.js` icinde tanimlidir.

### Core

- `/start`
- `/play`
- `/hub`
- `/profile`
- `/rewards`

### Economy / Trust

- `/wallet`
- `/claim`
- `/payout`
- `/history`
- `/status`

### Progression

- `/missions`
- `/season`
- `/rank`
- `/streak`
- `/inventory`

### Social / Growth

- `/invite`
- `/friends`
- `/kingdom`
- `/leaderboard`
- `/share`

### Events / Discovery

- `/events`
- `/news`
- `/chests`
- `/quests`
- `/discover`

### Settings / Support

- `/language`
- `/settings`
- `/help`
- `/support`
- `/faq`

### Hidden Admin Scope

- `/admin`
- `/admin_queue`
- `/admin_payouts`
- `/admin_tokens`
- `/admin_metrics`
- `/admin_config`
- `/admin_gate`
- `/admin_freeze`
- `/pay`
- `/reject_payout`
- `/approve_token`
- `/reject_token`
- `/admin_live`

### Menu strategy

Command menu compact tutulur. Menu'ye yalnizca:

- `/start`
- `/play`
- `/hub`
- `/profile`
- `/rewards`
- `/wallet`
- `/claim`
- `/payout`
- `/missions`
- `/season`
- `/events`
- `/language`
- `/settings`
- `/help`

girer.

Bu karar komut spam'ini keser; derin komutlar intent router, inline buton veya help card uzerinden bulunur.

## 4. Button System

### Primary

- Tek satir, tam genislik veya tekil baskin buton
- Verb-first etiket
- Mesaj basina bir tane

Ornek:

- `Enter World`
- `Claim Ready Reward`
- `Open Payout`

### Secondary

- En fazla iki buton ayni satirda
- Birbiriyle ilgili yuzeyler ayni satira gelir

Ornek:

- `Wallet` + `Payout`
- `Season` + `Rank`

### Danger / Warning

- Yalniz admin kritik aksiyonlarda
- Kirmizi/panik dili yok
- Confirm token veya explicit confirm gerekir

### Trust / Verification

- `Pending`
- `Under Review`
- `Approved`
- `Rejected`

Durum badgeleri teknik kod yerine insan dili kullanir.

### Premium Highlight

- premium pass
- active boosts
- rare drop
- season arc / event headline

Premium vurgular bagirmaz; status block gibi davranir.

### Event urgency

- sadece gercek zaman baskisi varsa
- mutlak + goreli zaman birliktedir
- fake last-chance dili yoktur

### Leaderboard announcement

- ilk 3 veya ilk 5 teaser
- kullanicinin kendi pozisyonu ayrik satir
- full board icin Mini App handoff

### Chest ready

- tek primary: `Claim`
- secondary: `Open Chests`

### Comeback nudge

- tek satir sebep
- tek CTA
- pazarlama maili gibi degil, bugunku neden odakli

## 5. First-Run Flow

### Dakika 0-1

1. Kullanici dili tespit edilir.
2. Kingdom kimligi hemen atanir.
3. Tek neden sunulur: `Ilk reward yolun su an acik.`
4. Tek buton sunulur: `Enter World`
5. Tek trust satiri verilir: `Wallet ve payout durumu hep gorunur kalir.`

### Dakika 1-3

1. Ilk reward path gosterilir.
2. Ilk mission path gosterilir.
3. Sosyal/status hook verilir: kingdom tier, streak veya rank.
4. Bugun geri donme nedeni yaratilir: chest, streak, event clock.

### Gun 1 ritmi

1. Tum urun anlatilmaz.
2. Sadece sonraki adim ogretilir.
3. Hub -> Play -> Claim / Tasks ritmi kurulur.
4. Aksam donus sebebi bir mesajla sabitlenir.

## 6. Re-Engagement System

### Chest ready alerts
- Tetik: yeni revealable attempt
- Ton: premium, temiz
- Limit: gunde max 2

### Mission refresh alerts
- Tetik: daily reset veya anlamli yeni claim yolu
- Ton: progress prompt
- Limit: gunde max 2

### Event countdown alerts
- Tetik: 24s / 6s / 1s kalan
- Ton: sakin aciliyet
- Limit: event basina max 3

### Kingdom war alerts
- Tetik: war state degisimi veya oyuncu esik gecisi
- Ton: communal / strategic
- Limit: gunde max 2

### Streak risk alerts
- Tetik: grace window icinde
- Ton: protective
- Limit: 12 saatte 1

### Payout state updates
- Tetik: state change
- Ton: formal / calm
- Limit: duplicate state yok

### Rare drop broadcasts
- Tetik: confirm reveal sonucu
- Ton: celebratory premium
- Limit: state change only

### Comeback reward offers
- Tetik: inaktivite + gercek bonus varsa
- Ton: warm invitation
- Limit: 72 saatte 1

### Season deadline reminders
- Tetik: 7g / 3g / 24s
- Ton: strategic
- Limit: deadline penceresinde max 3

Tum alert tipleri icin ayar kontrolu gerekir. Kritik para durumlari opt-out disidir.

## 7. Localization Model For Chat

### Detection precedence

1. kayitli user override
2. Telegram `language_code`
3. webapp `ui_preferences.language`
4. varsayilan `tr`

### Persistence

- bot locale ve ui preference birlikte sync kalir

### Command naming

- slash command'ler ASCII kalir
- lokalizasyon description, button, helper copy ve help kartlarinda yasar
- intent router TR + EN phrase kabul eder

### Fallback

- player-facing fallback TR
- partial translation layout bozmaz

### Copy limits

- TR primary card soft limit: 420 char
- EN primary card soft limit: 460 char
- TR button: max 22 char
- EN button: max 24 char

### RTL readiness

- button dizilimi yalniz LTR varsaymaz
- sayi ve para bloklari guvenli ayrilir

## 8. Trust And Support Messaging Framework

### Payout copy

- Pending: `Talep alindi. Inceleme suruyor. Su an ek islem gerekmez.`
- Review: `Talep incelemede. Durum degisince burada haber verecegiz.`
- Approved: `Talep onaylandi. Transfer teyidi bekleniyor.`
- Rejected: `Talep reddedildi. Sebep: <reason family>. Sonraki guvenli adim: <next step>.`

### Balance cards

- currency unit her zaman yazilir
- realize edilmemis deger para vaadi gibi yazilmaz
- payout ve token state birbirine karistirilmaz

### Support entry

Destek once kategori sorar:

- payout
- wallet
- token
- gameplay
- language

### FAQ pattern

- duvar metin yok
- Q/A kartlari var
- en cok sorulan 5 konu one cikiyor

### Failure communication

Her hata mesaji 3 parcadan olusur:

1. ne oldu
2. bu simdi ne anlama geliyor
3. sonraki guvenli adim ne

## 9. Chat-to-Mini-App Deep-Link Framework

### Zone strategy

- `hub`
- `tasks`
- `claim`
- `wallet`
- `payout`
- `rank`
- `season`
- `events`
- `chests`
- `invite`
- `settings`
- `support`

### Rules

1. `play` son zone'a donebilir.
2. Alert butonlari jenerik `play` yerine tam ilgili zone'a gider.
3. Invalid `startapp` parametresi hub'a dusurulur.
4. Zone anahtarlari allowlist ile dogrulanir.
5. Server-side signature zorunludur.

### Continue where you left off

- son zone `ui_prefs` icinde tutulur
- alert akisi once ilgili zone'a gider
- is bitince chat'e audit/status satiri doner

## 10. Failure Modes And UX Mitigations

### Unknown intent
- 3 en yakin rota + `Help`

### Mini App launch unavailable
- trust copy + URL fallback

### Claim not safe
- neden hazir olmadigi + ilgili zone deeplink'i

### Payout review delay
- pending/review dili
- panik dili yok

### Translation gap
- desteklenen locale'e sessiz fallback

### Duplicate callbacks
- idempotency + rate limit

### Admin critical action without confirm
- confirm token zorunlu

### Alert overload
- alert tipi bazli spam tavanlari
- opt-out controls

## Uygulama notu

Bu V1, bir sonraki adimlarda:

1. bot command registry hizalamasina,
2. localized command publication scope'larina,
3. chat-to-mini-app zone handoff implementasyonuna,
4. alert scheduler ve notification preference modeline

dogrudan kaynak olacak sekilde hazirlanmistir.
