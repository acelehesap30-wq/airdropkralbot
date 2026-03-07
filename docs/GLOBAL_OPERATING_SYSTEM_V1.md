# AirdropKralBot Global Operating System V1

Kaynak blueprint: `apps/admin-api/src/architecture/globalOperatingSystemBlueprint.js`

Bu dokuman AirdropKralBot'un global localization, live-ops, analytics, trust, fraud ve experimentation operating system kararlarini kilitler. Hedef yalindir: urun farkli bolgelerde yerel hissetmeli, trust copy hicbir yuzeyde kirilmamali, operatorler engineering bagimliligi olmadan canli operasyon yurutmeli ve tum kritik metrikler locale bazinda okunabilmelidir.

## 1. Non-Negotiable Decisions

1. Saklanan user locale override her zaman detected locale'in onundedir.
2. Payout, wallet, premium, fraud review ve support blocker copy tamamen localized olmadan bir locale genel kullanima acilmaz.
3. Tum copy key-based, versioned bundle yapisindan gelir; free-text operator yayini kritik yuzeylerde yasaklanir.
4. Locale rollout readiness gate olmadan yayin yapilmaz.
5. Tum KPI'lar locale, region, device class, experiment ve risk segment kesitleriyle okunabilir olur.
6. Live-ops config-driven olur; text, schedule, targeting ve scarcity engineering deploy'una bagli kalmaz.
7. Fraud modelleri locale-aware olabilir ama locale-biased enforcement kullanmaz.
8. Revenue experimentleri trust truth'u asindiramaz.
9. Chat, Mini App, 3D labels ve support macros tek governance zincirinde tutulur.

## 2. Alternative Decisions Rejected And Why

1. Sadece Telegram language code ile locale secmek reddedildi.
   Explicit user tercihini veya region formatting ihtiyacini ezemez.
2. Tum copy'nin engineering tarafindan deploy ile yonetilmesi reddedildi.
   Bu model live-ops hizini kirar.
3. Ozellik once, localization sonra modeli reddedildi.
   Non-primary locale'lerde kalici trust borcu uretir.
4. Tek global event takvimi modeli reddedildi.
   Region timing farklarini gormez.
5. Tek global risk policy modeli reddedildi.
   Abuse pattern farklarini yakalayamaz veya normal user'i ezer.
6. Factual payout ve security copy uzerinde A/B test reddedildi.
   Truth semantics randomize edilemez.
7. Serbest operator metin yayinlama modeli reddedildi.
   Audit, rollback ve localization tutarliligini bozar.

## 3. Implementation Risks

1. Fallback chain drift
   Farkli surface'lerde farkli fallback sirasi kullanilirsa locale davranisi tutarsizlasir.
2. Stale translation bundle publish
   Eski bundle yeniden yayinlanirsa kritik copy rollback yerine trust regression yaratir.
3. Locale-specific KPI blindspots
   Global dashboard'lar locale bazli sorunu gizler.
4. Operator overreach in live-ops
   Yetki sinirlari net degilse yuksek blast-radius degisiklikler artis gosterir.
5. False positive risk in new regions
   Yeni region abuse modeli baseline olmadan actiginda normalleri yakar.
6. Unbounded experiment matrix
   Locale x region x segment x variant carpani operasyonel olarak patlar.
7. Support macro inconsistency
   Ayrik support metinleri farkli truth anlatir.
8. Event targeting misfire
   Yanlis segmente giden campaign ciddi trust ve fraud etkisi yaratir.

## 4. MVP Subset

1. TR ve EN tam governed locale olur.
2. Stored locale override tum surface'lerde persistence saglar.
3. Command, chat, Mini App ve payout copy versioned bundle ile gelir.
4. Translation fallback telemetry ve screenshot QA devrededir.
5. Daily missions ve seasonal events region-aware schedule ile calisir.
6. Event publish icin operator approval akisi vardir.
7. Locale/device/segment dashboard'lari ve payout/wallet funnels locale bazinda izlenir.
8. Payout ve wallet issue'lari icin localized support macro catalog vardir.
9. Onboarding, premium copy ve reactivation timing icin sinirli experiment seti acilir.

## 5. Scale-Ready Subset

1. Staged locale rollout lanes vardir.
2. World-label locale bundles ve RTL-ready primitives devrededir.
3. Partner campaign, comeback campaign ve scarcity windows region bazinda yonetilir.
4. Executive, localization, live-ops, fraud, payout ve scene performance dashboard'lari tam canlidir.
5. Fraud queue routing language coverage ile optimize edilir.
6. Translation abuse ve reserve-sensitive payout trust guardrail'lari aktive edilir.
7. Localized premium sequencing, event timing ve chest reveal experimentation modeli olgunlasir.

## 6. Critical Open Questions You Resolved Yourself

1. Locale precedence ne olacak
   `stored override -> Telegram language -> verified profile locale -> region default -> TR`
2. Critical copy fallback nasil olacak
   Trust copy same-locale veya controlled region fallback ister; kontrolsuz EN fallback yok.
3. Eventler region-aware mi olacak
   Evet. Her event locale, region, segment ve wallet state targeting destekler.
4. Fraud locale'i nasil kullanacak
   Input olarak kullanir, karar nedeni olarak tek basina kullanmaz.
5. Content owner kim olacak
   Content ops copy, localization ops quality, live-ops timing, engineering runtime contract sorumlusudur.
6. Experimentler neye dokunabilir
   Presentation ve timing'e; factual payout ve safety semantics'e dokunamaz.

## 7. Exact Engineering Handoff Checklist

1. Bot, admin-api ve webapp icin ortak locale precedence resolver yaz.
2. Explicit locale override'i detected language'dan ayri sakla.
3. Kritik trust string'lerini literal code icinden cikart, content key ve version zincirine al.
4. Content bundle'lara locale readiness state ekle.
5. Missing translation, parent fallback ve critical copy gap telemetry ekle.
6. Surface bazli copy length validation zorunlu yap.
7. Localization dashboard'larinda coverage, fallback, overflow ve trust copy status goster.
8. Event schedule, targeting ve localized event copy'yi ayri katmanlara bol.
9. Publish, rollback, locale disable ve emergency restore audit row yaz.
10. Operator permission setlerini net ayir.
11. Notification pipeline'a quiet-hours ve send-budget guard ekle.
12. Payout, wallet ve fraud-review template ailelerini strict approval moduna al.
13. Support macro catalog'u locale ve issue family bazinda admin'e koy.
14. KPI query'lerine locale, region, device, risk band ve variant boyutlarini zorunlu ekle.
15. Wallet farm, referral ring, payout hold, support abuse ve translation abuse queue'larini ayir.
16. Yeni locale fraud modellerini shadow mode ile baslat.
17. Factual payout ve security copy experimentlerini schema ve runtime'da blokla.
18. Her experiment varyanti icin localization ve screenshot QA gate koy.
19. Locale ve event kill switch'lerini deploy'suz calisacak sekilde sun.
20. Sev1 response template'lerini payout delay, wallet degradation ve localization outage icin yaz.
21. Emergency restore oncesi ve sonrasi snapshot sakla.
22. On-call runbook'larina governance cadence ve ownership matrix ekle.

## 8. Global Localization Architecture

### Locale precedence

1. `stored_user_override`
2. `telegram_ui_language_code`
3. `verified_profile_locale`
4. `region_default_language`
5. `product_default_tr`

### Locale model

1. Language ve region ayri kavramlardir.
2. ICU pluralization zorunludur.
3. Number, date, time ve reward amount formatting ortak formatter katmanindan gelir.
4. RTL readiness bundle-level flag ile aktif edilir.
5. 3D labels ayni localization governance zincirine baglidir.

### Translation key architecture

1. `chat.command.*`
2. `chat.card.*`
3. `miniapp.ui.*`
4. `miniapp.world_label.*`
5. `event.announcement.*`
6. `payout.status.*`
7. `support.macro.*`
8. `wallet.web3.*`
9. `premium.offer.*`

### Surface constraints

1. Telegram command labels: `<= 16` karakter
2. Inline buttons: `<= 22` karakter
3. Chat status cards: `<= 8` satir
4. Mini App primary CTA: `<= 24` karakter
5. World labels: `<= 18` karakter soft max
6. Support macros: `<= 280` karakter soft max

### Fallback strategy

1. Critical trust copy same locale veya controlled region fallback ister.
2. Non-critical marketing copy language parent fallback ile yasayabilir.
3. Missing key analytics + operator alert uretir.
4. Missing critical key ile operator broadcast yayinlanmaz.

### QA and rollout

1. Chat cards, Mini App routes, payout states ve world labels screenshot QA'dan gecer.
2. Locale rollout asamalari:
   - `internal_only`
   - `shadow_readiness`
   - `pilot_5pct`
   - `managed_25pct`
   - `general_100pct`
3. Translation health dashboard coverage, fallback, overflow ve critical gap'i izler.

## 9. Operational Content Model

### Content units

1. command labels
2. chat templates
3. Mini App bundles
4. world-label bundles
5. event announcements
6. support macros
7. wallet and payout copy
8. premium offer copy

### Workflow

1. `draft`
2. `localized`
3. `qa_passed`
4. `approved`
5. `scheduled`
6. `live`
7. `retired`

### Required metadata

1. `content_key`
2. `surface`
3. `locale`
4. `region_scope`
5. `version`
6. `owner_team`
7. `approval_ref`
8. `experiment_eligibility`
9. `criticality`

### Runtime rules

1. Financial truth values source-bound olmadan metne gomulmez.
2. Event copy targeting kuralini inline tasimaz; target rule'a referans verir.
3. Operator editleri audit uretir.
4. Emergency disable her zaman son approved version'a donebilir.

## 10. Live-Ops Control Framework

### Scheduling model

1. Daily rotations UTC tabanli ama region window'ludur.
2. Seasonal campaign preload ve hard end cap ile gelir.
3. Partner campaign chain ve region filtresi tasir.
4. Scarcity window frekans limiti ile calisir.
5. Leaderboard reset preannounce + settle patterni ile yonetilir.

### Targeting axes

1. locale
2. region
3. device class
4. risk segment
5. wallet state
6. kingdom/faction
7. cohort bucket
8. experiment variant
9. returning/new
10. premium status

### Approvals and permissions

1. Live-ops owner timing'i onaylar.
2. Localization owner locale readiness'i onaylar.
3. Trust owner payout/support copy'yi onaylar.
4. Fraud owner high-risk promo path'i onaylar.
5. Yuksek blast-radius event'lerde two-person rule vardir.
6. Permission tiers:
   - viewer
   - content_editor
   - localization_reviewer
   - live_ops_scheduler
   - trust_approver
   - fraud_operator
   - global_ops_admin

### Safeguards and rollback

1. locale_readiness_gate
2. preview diff before publish
3. send budget per hour
4. event overlap conflict check
5. protected quiet hours by region
6. kill switch without deploy
7. full audit trail

## 11. Analytics And KPI Framework

### Canonical dimensions

1. locale
2. detected language
3. locale override source
4. region code
5. device class
6. os family
7. surface
8. district/zone
9. wallet chain
10. wallet state
11. campaign key
12. event key
13. experiment key
14. variant key
15. risk band
16. user segment

### Executive KPIs

1. D1 / D7 retention by locale
2. ARPDAU by locale and segment
3. intent -> tx submit by chain and locale
4. payout request -> paid by region
5. premium conversion by locale
6. support contact rate after failure

### Product and localization KPIs

1. Mini App launch rate
2. district engagement depth
3. mission accept -> complete
4. reward reveal rate
5. event participation rate
6. comeback nudge reactivation rate
7. translation coverage
8. critical copy gap rate
9. fallback rate
10. overflow rate
11. locale-specific failure rate
12. localization-tagged support contact rate

### Fraud, trust and performance KPIs

1. risk case open rate
2. false positive reversal rate
3. wallet farm cluster count
4. referral ring detection rate
5. payout hold release time
6. manual review load by locale
7. payout pending -> support contact rate
8. wallet failure recovery rate
9. premium issue resolution time
10. critical notice ack rate
11. frame time p95 by device class
12. district load ms by locale
13. context loss / crash / resume recovery trend

### Dashboards

1. `executive_global`
2. `product_global`
3. `localization_health`
4. `live_ops_runtime`
5. `fraud_and_review`
6. `payout_and_trust`
7. `web3_chain_funnel`
8. `scene_performance`

### Alerts

1. live locale'de critical copy gap > 0
2. trust surfaces fallback rate > %2
3. payout failure spike by region
4. fraud hold spike after event
5. crash spike on low-end devices
6. variant regression on guardrail metric

## 12. Fraud And Trust Operations Model

### Risk scoring pipeline

1. identity and device signals
2. wallet graph signals
3. referral velocity
4. event exploitation patterns
5. support abuse patterns
6. translation abuse patterns
7. payout destination reuse

### Review queues

1. wallet farm review
2. referral ring review
3. payout hold review
4. support abuse review
5. event exploitation review
6. translation abuse review

### Enforcement ladder

1. shadow score only
2. silent dampening
3. reward hold
4. manual review gate
5. cooldown extension
6. hard block for confirmed abuse

### False-positive controls

1. locale-specific baselines before hard enforcement
2. appealable manual actions
3. new-region shadow period
4. review sampling on model changes
5. support override with audit

### Training notes

1. Language'i fraud ile esitleme.
2. Cultural holiday spike'larini escalation oncesi kontrol et.
3. Fraud review copy'sinde neutral kal.
4. Kanitsiz action alma.
5. Payout timing'i policy disi vaat etme.

## 13. Support And Messaging Framework

### Tone and urgency

1. calm
2. clear
3. specific
4. non-accusatory
5. no fake urgency
6. no financial overpromise

### Trust-preserving structure

1. Ne oldu
2. Su an ne kontrol ediliyor
3. User ne yapabilir
4. Guvenli beklenen sure araligi
5. Varsa history/status linki

### Message families

1. payout pending
2. payout approved
3. payout failed
4. wallet connection failed
5. localization fallback issue
6. premium purchase issue
7. event issue
8. fraud review state
9. user confusion recovery
10. beginner education
11. power-user troubleshooting

### Forbidden patterns

1. guaranteed profit
2. instant payout for everyone
3. accusations without decision
4. panic caps lock
5. unbounded "soon"
6. engineering jargon

## 14. Experimentation Framework

### Allowed classes

1. localized copy variants
2. onboarding step order
3. premium offer presentation
4. event timing
5. chest reveal pacing
6. reactivation timing
7. fraud-threshold shadow tests
8. region-specific offer mix

### Randomization boundaries

1. User-level for copy and onboarding
2. Locale/region-level for event timing
3. Segment-level for fraud shadow tests
4. Tek payout request flow icinde randomization yok

### Guardrails

1. Core factual payout copy experiment disidir.
2. Security/wallet truth copy experiment disidir.
3. Revenue lift trust regression'i override edemez.
4. Locale QA olmadan variant canliya cikamaz.
5. Yuksek blast-radius pattern'lerde holdout zorunludur.

### Stopping conditions

1. Trust metric'te anlamli negatif etki
2. Payout failure veya support spike
3. Locale-specific error spike
4. False positive breach
5. Low-end performance regression

## 15. Rollout And Governance Model

### Ownership

1. Product ops KPI ve priority sahibi
2. Localization ops locale quality sahibi
3. Live-ops schedule ve targeting sahibi
4. Trust ops payout ve support copy sahibi
5. Fraud ops enforcement sahibi
6. Engineering runtime contract ve alerting sahibi

### Rollout path

1. internal_ops
2. target_locale_shadow
3. pilot_cohort
4. managed_partial_rollout
5. general_availability

### Release gates

1. critical copy translated
2. fallback chain passed
3. dashboard alerts online
4. support macros ready
5. fraud shadow baseline ready
6. kill switch verified

### Cadence

1. daily live-ops check
2. weekly locale health review
3. weekly fraud false-positive review
4. biweekly experiment readout
5. monthly global ops audit

## 16. Emergency Response Model

### Scenario set

1. critical locale fallback break
2. untranslated payout message live
3. fraud spike after event
4. payout failure spike by region
5. wallet provider or chain degradation
6. event targeting misfire

### First action rules

1. Locale outage: locale disable + parent fallback + ops notify
2. Trust copy outage: previous approved template restore
3. Fraud spike: thresholds raise + reward hold + event variant pause
4. Payout spike: auto release pause + manual review route + calm status update
5. Wallet issue: impacted connect option disable + safe retry message
6. Event misfire: event disable + unsent broadcast cancel + targeting repair

### Severity

1. `sev1_trust_or_payout`
2. `sev1_localization_break_on_critical_surface`
3. `sev2_live_ops_targeting_or_performance`
4. `sev3_noncritical_content_issue`

### Response governance

1. Incident owner 5 dakika icinde atanir.
2. Sev1 user-facing copy trust owner onayindan gecer.
3. Tum manual overrides audit uretir.
4. Sev1 ve Sev2 icin postmortem zorunludur.

## 17. Global Scale-Readiness Checklist

1. Locale override chat, Mini App ve Web3 surfaces'ta tutarlidir.
2. Her live locale payout, wallet ve support template setine sahiptir.
3. Fallback dashboard ve alerts online'dir.
4. Region-aware event scheduling operator-configurable'dir.
5. Targeting locale, region, segment, risk ve experiment filtresi destekler.
6. Operator editleri before/after snapshot ile auditlenir.
7. Fraud queue language-aware staffing kullanir ama locale bias kullanmaz.
8. Support macro seti issue ailelerine gore tamamdir.
9. Analytics dashboard'lari locale ve device cuts ile gelir.
10. Screenshot QA release gate icindedir.
11. Critical trust copy approval olmadan publish edilmez.
12. Experiment runtime trust-damaging copy testlerini bloklar.
13. Low-end device performance locale bazinda izlenir.
14. Reactivation alerts dedupe ve frequency cap ile calisir.
15. Locale ve event kill switch'leri test edilmis durumdadir.
16. Yeni region fraud modelleri shadow ile baslar.
17. Payout hold policy support ve trust ekiplerine gorunurdur.
18. Partner campaign'ler locale readiness gate'i bypass edemez.
19. Translation health scorecard haftalik review edilir.
20. On-call runbook'lari versioned ve erisilebilirdir.