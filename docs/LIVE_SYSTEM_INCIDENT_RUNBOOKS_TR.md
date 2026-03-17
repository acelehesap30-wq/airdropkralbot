# Live System Incident Runbooks (TR)

Bu belge, `docs/CANONICAL_PRODUCT_BLUEPRINT_V1.md` icindeki canli operasyon gereksinimini kapatmak icin payout delay, wallet degradation, localization outage ve event misfire durumlarinda izlenecek net operator akisini tanimlar.

## 1) Hizli prensipler
- Once guveni koru: payout, wallet ve localization olaylarinda hizdan once dogruluk gelir.
- Once impact alanini daralt: `freeze`, cap dusurme, rollout durdurma veya campaign pause ilk savunmadir.
- Once kanit topla: health, runtime, KPI ve artifact dosyalari alinmadan varsayimla aksiyon alma.
- Tek dogru kaynak: DB, audit ve runtime artifactleri esas al; chat/UI goruntusunu tek basina truth sayma.

## 2) Ortak ilk 5 dakika plani
1. `GET /healthz` ve `GET /health` ile proses + DB sagligini dogrula.
2. `GET /admin/runtime/bot` ve `GET /admin/runtime/deploy/status` ile bot/runtime drift var mi bak.
3. Son artifactleri kontrol et:
   - `docs/V5_KPI_SNAPSHOT_latest.json`
   - `docs/V5_CANARY_GUARD_latest.json`
   - `.runtime-artifacts/liveops/V5_LIVE_OPS_CAMPAIGN_DISPATCH_latest.json`
   - `.runtime-artifacts/liveops/V5_LIVE_OPS_OPS_ALERT_latest.json`
4. Gerekirse yeni snapshot al:
   - `npm run kpi:v5:snapshot -- --hours 24`
   - `npm run canary:v5:guard -- --refresh_snapshot true --hours 24`
5. Incident sinifina gore asagidaki izole aksiyonu uygula.

## 3) Payout delay runbook
### Trigger
- `payout` queue backlog beklenenin ustunde.
- `GET /admin/payouts` kuyrugunda stale talepler var.
- Kullanicilar payout pending suresinin uzadigini bildiriyor.

### Hemen yap
1. Yeni riskli talepler varsa `freeze` ac:
   - Telegram: `/admin_freeze on payout_delay_investigation`
2. Son release marker ve runtime durumunu kontrol et:
   - `GET /admin/release/latest`
   - `GET /admin/runtime/flags/effective`
3. Queue + audit farkini incele:
   - `GET /admin/payouts`
   - `GET /webapp/api/v2/admin/queue/unified?...`
4. Son rollout veya config degisikligi payout akisini bozduysa `npm run rollback:v5` degerlendirilir.

### Kok neden kontrol listesi
- `DATABASE_URL` veya migration drift
- `ADMIN_TELEGRAM_ID` / operator authority uyusmazligi
- payout gate veya reserve config degisikligi
- tx verify servisi gecikmesi
- duplicate/idempotency bloklari

### Stabilizasyon
- Bekleyen talepleri siniflandir: `under_review`, `ready_to_pay`, `reject_with_refund`.
- Otomatik/yarim otomatik aksiyonlar kapatilir; operator kontrollu akisa donulur.
- Gerekirse `TOKEN_TX_VERIFY_STRICT=0` degil, once freeze + manual review tercih edilir.

### Incident kapanis kriteri
- Backlog normale doner.
- Yeni payout taleplerinde bekleme suresi baseline'a iner.
- 24 saatlik KPI ve canary guard yeni hata artisi gostermiyor.

## 4) Wallet degradation runbook
### Trigger
- `bad_sig`, `expired`, `missing`, `webapp_secret_missing` veya wallet verify hata oraninda sicrama.
- TON connect veya wallet challenge akisi sistematik basarisiz.
- `WALLET_AUTH_V1_ENABLED=1` acikken login/link abandon artiyor.

### Hemen yap
1. WebApp auth zincirini dogrula:
   - `GET /webapp/api/v2/bootstrap?uid=<uid>&ts=<ts>&sig=<sig>&scope=player&include_admin=0`
2. Secret ve runtime uyumunu kontrol et:
   - `GET /admin/runtime/flags/effective`
   - `GET /admin/runtime/deploy/status`
3. Lokal/env contract drift supheleniliyorsa:
   - `npm run check:env:contract`
4. Yeni rollout sonrasi bozulma varsa:
   - `npm run rollback:v5`

### Kok neden kontrol listesi
- `WEBAPP_HMAC_SECRET` drift
- bot/API saat kaymasi
- eski bundle cache veya yari deploy
- wallet verify mode degisikligi (`format_only` vs `strict_crypto`)
- challenge/session TTL yanlis konfigurasyonu

### Stabilizasyon
- Kritikse wallet gerektiren yeni akislar gecici olarak `advanced/settings` altina cekilir.
- Chat cockpit'te safe next step korunur; kullaniciya sahte basari gosterilmez.
- WebApp cache versiyonu sabitlenir: `WEBAPP_VERSION_OVERRIDE=<stable>`.

### Incident kapanis kriteri
- Auth reason dagilimi baseline'a iner.
- Wallet link ve verify success oranlari toparlanir.
- `check:release` ve wallet ilgili smoke/testler temiz gecer.

## 5) Localization outage runbook
### Trigger
- TR/EN copy bos, placeholder veya karisik locale ile donuyor.
- Kritik trust satirlari untranslated gorunuyor.
- Locale fallback zinciri beklenmedik sekilde global default'a dusuyor.

### Hemen yap
1. Etkilenen surface'i belirle: chat, Mini App, admin.
2. Kritik trust copy'de placeholder varsa ilgili release/campaign pause edilir.
3. Son config/content degisikliklerini incele:
   - `GET /admin/configs/:key`
   - ilgili locale bundle dosyalari
4. WebApp bundle ve runtime response'ta locale alanlarini kontrol et.

### Kok neden kontrol listesi
- locale bundle publish eksikligi
- `locale_override` precedence drift
- rollout cohort'unun eksik locale key ile acilmasi
- operator literal copy override'i

### Stabilizasyon
- Kritik copy deneysel cohort'tan cikarilir.
- Gerekirse affected locale icin campaign `paused` durumuna cekilir.
- Chat'te sadece safe fallback mesaji birakilir; yanlis finansal/trust copy yayinlanmaz.

### Incident kapanis kriteri
- Kritik trust copy placeholder icermiyor.
- TR ve EN fallback zinciri dogru.
- Spot kontrol: payout, wallet, support, live ops mesajlari tutarli.

## 6) Event misfire runbook
### Trigger
- Yanlis segment/locale/campaign kullaniciya gitti.
- `live_ops_campaign_sent` veya alert dispatch beklenmeyen cohort'a sicradi.
- `selection_summary` ve `targeting_guidance` beklenen fokusla uyusmuyor.

### Hemen yap
1. Campaign'i durdur:
   - config status `paused`
   - gerekiyorsa `/admin_freeze on live_ops_event_misfire`
2. Son dispatch artifactini incele:
   - `.runtime-artifacts/liveops/V5_LIVE_OPS_CAMPAIGN_DISPATCH_latest.json`
3. Ops alert artifactini incele:
   - `.runtime-artifacts/liveops/V5_LIVE_OPS_OPS_ALERT_latest.json`
4. Selection trend ve family risk sinyallerini kontrol et.

### Kok neden kontrol listesi
- scene gate watch/alert baskisi altinda agresif dispatch
- query strategy family drift
- query adjustment field'lerinin fazla daralmasi/genislemesi
- locale/surface/variant/cohort breakdown uyumsuzlugu
- window duplicate guard atlanmasi

### Stabilizasyon
- `protective` moda zorla; recipient cap dusur.
- `dry_run` ile yeni preflight al, sonra canli gonderimi tekrar degerlendir.
- Gerekirse scheduler task gecici olarak unregister edilir:
  - `powershell -ExecutionPolicy Bypass -File scripts/register_v5_live_ops_campaign_tasks.ps1 -TaskName "AirdropKralBot-V5-LiveOps-15M" -UnregisterOnly`

### Incident kapanis kriteri
- Yeni dispatch sadece hedef segmentte calisiyor.
- `selection_family_escalation` ve `query_adjustment_escalation` alarm bandi normale iniyor.
- Sonraki 24 saatte tekrar misfire yok.

## 7) Olay sonrasi zorunlu cikti
- Incident ozeti: ne oldu, ne zaman oldu, kim etkilendi.
- Root cause: config, rollout, runtime, content veya operator aksiyonu.
- Guardrail eklemesi: test, artifact, alert veya approval degisikligi.
- Gerekirse `docs/RUNBOOK.md` ve ilgili surface dokumani guncelle.
