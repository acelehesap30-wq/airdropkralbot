# AirdropKralBot Primary Mini App Surface V1

Kaynak blueprint: `apps/webapp/src/architecture/miniAppSurfaceBlueprint.js`

Bu dokuman AirdropKralBot'un Telegram Mini App icindeki primary product surface kararlarini kilitler. Buradaki hedef, normal bir webview degil; Telegram icinde premium, hizli, 3D district-based ama beginner-friendly bir urun yuzeyi kurmaktir.

## 1. Non-Negotiable Decisions

1. Hedef stack `Next.js App Router + TypeScript + Babylon.js + TanStack Query` olur.
2. Bugunku `Vite + React + Three.js` stack'i gecis baselinedir; son hedef runtime degildir.
3. 3D scene runtime ile app shell runtime explicit `scene bridge` uzerinden ayrilir.
4. Locale, content bundle ve route state server-first bootstrap ile gelir.
5. Varsayilan navigation `tap-first` olur; joystick-free-roam zorunlu deneyim olmaz.
6. Default HUD sade olur; ileri metrikler ve yogun ekonomi detaylari progressive disclosure ile acilir.
7. Duser cihazlar icin reduced-effects veya 2.5D fallback zorunludur.
8. Her district bundle, draw-call ve memory butcesi ile ship edilir.
9. Telegram chat ve Mini App ortak `startapp zone key` dili kullanir.
10. Wallet ve payout drawer'lari scene loop'u baskilar veya pause eder; para akisi scene readiness'e baglanmaz.

## 2. Alternative Decisions Rejected And Why

1. `Vite + Three.js` ile sonsuza kadar kalmak reddedildi.
   Mevcut stack parity ve gecis icin yeterli, ama SSR locale hydration, route recovery ve district streaming icin daha zayif.
2. Tum state'i tek global store'a yigmak reddedildi.
   Scene tick state, server state, wallet UX ve UI overlay ayni latency profile'ina sahip degil.
3. Tum UI'yi canvas icine tasimak reddedildi.
   Accessibility, localization, wallet ve payout trust surfaces zayiflar.
4. Serbest joystick navigation ana model olarak reddedildi.
   Telegram mobilde kisa oturumlar icin tap-first daha net.
5. Ilk boot'ta tum scene'i yuklemek reddedildi.
   Telegram webview memory tavanlari bunu kaldirmaz.
6. Tek kalite modu ile herkese ayni sahneyi gondermek reddedildi.
   Donanim profili varyansi cok yuksek.

## 3. Implementation Risks

1. Framework migration cost
   `Vite` -> `Next.js` gecisi surface-level degil; routing, build, asset manifest ve locale delivery yeniden kurulur.
2. Scene/UI sync drift
   Scene state ile overlay state karisirsa ghost selection, stale objective ve invalid CTA sorunlari olusur.
3. Telegram webview memory ceiling
   Babylon district bundle'lari agresif parcali yuklenmezse Android Telegram webview context kaybedebilir.
4. Asset fragmentation
   District bazli asset manifest olmazsa scene load isleri kontrolsuz buyur.
5. Localized scene text overflow
   3D label'larda uzun string handling bastan cozulmezse sahne kirilir.
6. Device capability false positives
   Boot profiling yanlis profile secerse cihaz ya coker ya da gereksiz kotu kalite alir.
7. Resume corruption
   Wallet modal, background veya Telegram minimize/resume sonrasinda stale scene state kalabilir.
8. Wallet modal focus conflicts
   Telegram wallet veya Web3 modal gecisleri ile camera/input loop'u cakisabilir.

## 4. MVP Subset

1. `Next.js` shell skeleton
2. `Babylon.js` central hub sahnesi
3. `TanStack Query` server-state katmani
4. SSR locale bootstrap
5. `central_hub`, `mission_quarter`, `loot_forge`, `exchange_district`
6. tap-to-travel, onboarding overlay, objective tracker, zone map
7. wallet drawer ve payout drawer
8. reduced effects mode + low-end static fallback
9. Telegram BackButton, safe area ve startapp route handling

## 5. Scale-Ready Subset

1. district streaming pipeline
2. season hall, elite district, live event overlay, social monuments
3. NPC conversation layer
4. microgames and challenge chains
5. async competition surfaces
6. premium pass pavilion
7. 2.5D fallback mode
8. edge asset manifests + per-district telemetry
9. fullscreen recommendation flow
10. home-screen shortcut and richer share surfaces

## 6. Critical Open Questions You Resolved Yourself

1. Hedef framework ne olacak
   `Next.js App Router`.
2. 3D engine ne olacak
   `Babylon.js`.
3. Navigation modeli ne olacak
   `tap-first district travel`.
4. HUD ne kadar yogun olacak
   default sade, advanced opt-in.
5. Locale scene'e nasil girecek
   key-based locale bundle ile.
6. Dusuk cihazlar ne olacak
   reduced-effects veya 2.5D fallback.

## 7. Exact Engineering Handoff Checklist

1. Yeni `Next.js` Mini App shell workspace'i ac.
2. Mevcut `Vite` shell'i bir gecis baseline'i olarak koru; ilk gunde silme.
3. `scene`, `ui`, `contracts`, `i18n` paket sinirlarini ayir.
4. Babylon target runtime'ini sec ve district scene lifecycle contract'ini yaz.
5. `scene bridge` event/command protokolunu typed hale getir.
6. `TanStack Query` server-state layer'ini kur.
7. SSR locale bootstrap + client hydration parity'yi sagla.
8. typed `startapp` parser ve safe hub fallback ekle.
9. Central hub'i ilk production district yap.
10. District asset manifest ve hard perf budget sistemi kur.
11. Reduced-effects ve low-end fallback mode'u elite district'ten once ship et.
12. Wallet/payout/support drawer acildiginda scene downshift/pause yap.
13. Uzun metni 2D HUD'a tasi; 3D label'lar kisa kalsin.
14. District ve quality-profile bazli perf telemetry topla.
15. Telegram BackButton, MainButton, fullscreen ve safe-area adapter'larini shared primitive yap.
16. Telegram icinde resume/context-loss smoke test zorunlu olsun.
17. Draw-call, bundle, memory budget asan district ship etme.
18. Chat->Mini App zone routing'i stable olmadan legacy navigation dilini kesme.
19. Accessibility toggles'i scene ve shell tarafinda ayni contract'a bagla.
20. Mid-tier Android Telegram webview'i referans cihaz kabul et.

## 8. Frontend Architecture

### Mevcut durum gercegi

Bugun repo:
1. `Vite`
2. `React 18`
3. `Redux Toolkit`
4. `Three.js`
5. `Zod`
6. typed webapp v2 API client

uzerinde calisiyor.

Bu stack bugunku parity ve gecis calismalari icin gecerli, ama hedef AAA Mini App surface icin degil.

### Hedef stack

1. `Next.js App Router`
2. `TypeScript`
3. `Babylon.js`
4. `TanStack Query`
5. `Zod` validated contracts
6. edge-friendly asset delivery
7. SSR + client locale integration

### Neden daha iyi

1. `Next.js App Router` startapp route hydration, SSR locale bootstrap ve shell-first load icin saf client shell'den daha dogru.
2. `Babylon.js` district streaming, asset container, material/tooling ve mobile render control tarafinda daha sistematik.
3. `TanStack Query` server-state ile scene-local runtime state'i daha temiz ayirir.
4. Bu urunde 3D world, Web3 drawers, Telegram integration ve localized shell ayni anda calistigi icin component tree ile renderer tree'nin ayrik kalmasi gerekir.

### Runtime separation

1. App shell route/layout katmani `Next.js` tarafinda kalir.
2. Scene runtime yalniz `world host` client boundary'sinde yasar.
3. Shell -> scene iletisim `scene bridge` event bus ile olur.
4. Scene -> shell sinyalleri typed adapter ile gelir.
5. Shell, Babylon node referanslarini dogrudan okumaz.

### State synchronization

1. server state: `TanStack Query`
2. shell UI state: route-local or feature-local client state
3. scene state: Babylon runtime internal store
4. bridge events:
   - `zone_focus_changed`
   - `interactable_focused`
   - `camera_state_changed`
   - `performance_profile_changed`
5. bridge commands:
   - `route_to_zone`
   - `open_surface`
   - `set_objective`
   - `set_quality_profile`
   - `focus_entity`

## 9. 3D Engine And Rendering Strategy

### Scene isolation

1. `world/[zone]` route scene host'u tek client boundary olur.
2. Her district kendi asset-container modulu olur.
3. HUD sahne objelerini direkt okumaz.
4. Web3 ve support drawers acildiginda high-cost loop downshift edilir.

### Scene loading segmentation

1. phase 1: SSR shell
2. phase 2: lightweight hub bootstrap
3. phase 3: district geometry/material/audio streaming
4. phase 4: ambient extras, monuments, premium flourish

### Multilingual text safety

1. 3D label'lar content key ile gelir.
2. localized atlas veya sanitized text asset uzerinden render edilir.
3. Uzun narrative metin 3D icinde degil 2D drawer'da tutulur.
4. Locale fallback chain scene host'a birlikte gelir.

### Quality adaptation

1. boot profile: viewport, DPR, memory hint, prior perf profile
2. first 3s hub calibration: frame time ve upload pressure
3. profile clamp: `safe_low`, `balanced`, `immersive_high`
4. thermal/battery/visibility olaylarinda downgrade

## 10. App Shell And UI System

### Layout

1. top meta bar
2. center scene host
3. bottom action rail
4. side/context drawer sistemi

### Loading choreography

1. branded SSR shell shimmer
2. district crest reveal
3. objective pulse
4. ambient unlock after input-ready

### Skeleton strategy

1. feed ve cards gercek content skeleton ile gelir
2. scene silhouette district formuna gore olur
3. wallet/payout skeleton fake number uretmez

### Overlay system

1. top status strip: identity, season, wallet pulse
2. objective stack: active mission, timer, event prompt
3. bottom dock: travel, primary action, quick claim, map
4. right drawer: inventory, rank, support, economy detail

### Typography and tokens

1. heading: `Oswald`
2. body: `Manrope`
3. mono: `IBM Plex Mono`
4. theme families:
   - `neon_steel`
   - `sunset_gold_alert`
   - `frosted_safe`
   - `risk_red_restrained`

### Telegram-aware layout

1. safe area inset aware padding
2. portrait-first primary layout
3. compact mode for short sessions
4. immersive mode for district focus

## 11. World Map And District Specification

### 1. Central Hub

1. visual language: temiz neon plaza, calm dome
2. purpose: orientation + next best action
3. economy role: balance teaser
4. status role: identity and kingdom overview
5. perf budget: `<= 140 draw calls`, `<= 70MB GPU`

### 2. Mission Quarter

1. visual language: industrial terminals
2. purpose: task pickup and progression
3. economy role: labor loop
4. status role: streak and assignment readiness
5. perf budget: `<= 160 draw calls`, `<= 80MB GPU`

### 3. Loot Forge

1. visual language: molten reveal chambers
2. purpose: chest and reveal ritual
3. economy role: loot claim and cosmetic preview
4. status role: recent rare drops
5. perf budget: `<= 180 draw calls`, `<= 90MB GPU`

### 4. Exchange District

1. visual language: trust-blue market hall
2. purpose: token, wallet, upgrades
3. economy role: NXT and monetization gateway
4. status role: quote freshness and route health
5. perf budget: `<= 150 draw calls`, `<= 75MB GPU`

### 5. Season Hall

1. visual language: prestige cathedral
2. purpose: rankings and milestones
3. economy role: season sink and reward outlook
4. status role: rank, weekly ladder, arc boss
5. perf budget: `<= 170 draw calls`, `<= 85MB GPU`

### 6. Elite District

1. visual language: controlled red hazard glass
2. purpose: high-risk and premium gates
3. economy role: HC sinks and elite pass
4. status role: prestige eligibility
5. perf budget: `<= 165 draw calls`, `<= 80MB GPU`

### 7. Live Event Overlay

1. visual language: district takeover layer
2. purpose: event urgency without route rewrite
3. economy role: temporary event shops and rewards
4. status role: countdown and participation
5. perf budget: `<= +25 draw calls` over base district

### 8. Social Monuments

1. visual language: holo leader columns and statues
2. purpose: async competition and kingdom identity
3. economy role: prestige-first
4. status role: leaderboard teaser and kingdom standing
5. perf budget: `<= 145 draw calls`, `<= 72MB GPU`

## 12. Gameplay Interaction Specification

### Tap-first movement

1. tap interactable to move
2. double tap unlocked anchor for fast travel
3. no mandatory free camera spin
4. auto-stop before overshoot

### Contextual interactions

1. mission terminals
2. NPC talk nodes
3. timed hold interactions
4. microgames
5. loot chamber reveals
6. prestige displays
7. event gates
8. challenge chains
9. async competition monuments
10. daily/weekly boards

### Camera behavior

1. portrait-first framing
2. soft follow
3. 400-700ms interaction zoom
4. restore last stable bookmark on resume

### Interruption safety

1. pause on background
2. clear stale input queue
3. restore district bookmark
4. reopen valid drawer context after resume

## 13. Performance And Quality-Profile Plan

### Hard budgets

1. first meaningful paint: `<= 1200ms`
2. first interactive: `<= 2200ms`
3. shell gzip: `<= 220KB`
4. scene runtime gzip: `<= 650KB`
5. district bundle gzip: `<= 900KB`
6. low-end draw calls: `<= 120`
7. balanced draw calls: `<= 170`
8. high-end draw calls: `<= 230`
9. low texture budget: `<= 32MB`
10. balanced texture budget: `<= 64MB`
11. high texture budget: `<= 96MB`
12. low-end memory budget: `<= 220MB`
13. balanced memory budget: `<= 320MB`
14. high-end memory budget: `<= 440MB`

### Techniques

1. LOD meshes
2. thin instancing
3. texture atlases
4. baked lighting first
5. occlusion + frustum culling
6. streamed audio banks
7. mesh merge for static architecture
8. selective post-FX only on balanced+

### Low-end fallback

1. static sky dome
2. billboard monuments
3. no shadows
4. minimal particles
5. audio-first ambience
6. instant fade transitions instead of travel animation

### Telemetry

1. `frame_time_p95`
2. `district_load_ms`
3. `memory_pressure_flag`
4. `quality_profile_switch_count`
5. `resume_recovery_count`
6. `webgl_context_loss_count`

## 14. Mini App Information Architecture

### Primary routes

1. `hub`
2. `missions`
3. `forge`
4. `exchange`
5. `season`
6. `events`
7. `vault`
8. `settings`

### User reachability map

1. world hub -> `hub`
2. missions -> `missions`
3. chest opening -> `forge`
4. inventory -> `forge` or right drawer from any district
5. rankings -> `season` or `social monuments`
6. events -> `events`
7. kingdom -> `season` + `social monuments`
8. premium pass -> `exchange`
9. upgrades -> `exchange`
10. wallet/Web3 -> `exchange` or `vault`
11. payout request -> `vault`
12. settings/language -> `settings`
13. support -> drawer from `settings` or any blocker state

### Session style support

1. short sessions: one-thumb bottom rail + one visible next step
2. deep sessions: district chaining without hard reload + drawer memory

## 15. Multilingual UX Architecture

1. precedence: `stored_override -> telegram_language_code -> server profile locale -> tr`
2. SSR ve client ayni locale token'ini kullanir
3. HUD copy localized bundle'dan gelir
4. Scene labels content key ile localized atlas'tan gelir
5. Number/date formatting ortak `Intl` wrapper kullanir
6. Dynamic text length mission quarter ve season hall icin stress tested olur
7. RTL-ready container mantigi bastan planlanir
8. User override persistent olur
9. Missing translation event telemetry olarak kaydolur
10. TR/EN district screenshot baselines zorunlu olur

## 16. Telegram-Native Integration Plan

1. launch behavior: `startapp` zone param -> typed route parser -> safe hub fallback
2. Telegram `ready/expand` shell stable olduktan sonra cagrilir
3. `BackButton` once drawer kapatir, sonra district doner, sonra chat'e cikar
4. `MainButton` yalniz tek next-best action'i mirror eder
5. safe area insets shell padding ve camera dead-zone icin kullanilir
6. fullscreen recommendation ilk anlamli interaction sonrasi gelir
7. share flow localized short copy + zone startapp param uretir
8. resume on reopen route + district bookmark + valid drawer context restore eder
9. current chat context yalniz share copy ve referral surface'te kullanilir
10. Telegram Stars varsa premium/cosmetic icin policy-safe ikincil odeme rayi olur

## 17. Build Phases And Non-Negotiable Quality Gates

### Build phases

1. phase 1: shell platform
2. phase 2: hub and core districts
3. phase 3: quality profiles and fallbacks
4. phase 4: scale districts and event overlays
5. phase 5: hardening and certification

### Quality gates

1. hicbir district budget asamaz
2. wallet/payout scene readiness'e bagli olamaz
3. TR/EN overflow ve screenshot checks pass olmali
4. low-end profile hub'da stabil `30fps`
5. balanced profile core district'lerde stabil `45fps`
6. Telegram icinde context-loss/resume smoke pass
7. invalid startapp param her zaman safe zone'a duser
8. reduced motion mode non-essential camera ve particle efektlerini kapatir
