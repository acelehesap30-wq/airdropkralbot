import { useState } from "react";
import { buildVaultViewModel } from "../../../core/player/vaultViewModel.js";
import { SHELL_ACTION_KEY } from "../../../core/navigation/shellActions.js";
import { t, type Lang } from "../../i18n";
import { RouteStrip } from "../shared/RouteStrip";
import { TonWalletConnect } from "./TonWalletConnect";
import { MultiChainWalletConnect } from "./MultiChainWalletConnect";
import { HashRacer } from "./HashRacer";

type VaultPanelProps = {
  lang: Lang;
  advanced: boolean;
  vaultData: Record<string, unknown> | null;
  quoteUsd: string;
  quoteChain: string;
  submitRequestId: string;
  submitTxHash: string;
  walletChain: string;
  walletAddress: string;
  walletChallengeRef: string;
  walletSignature: string;
  payoutCurrency: string;
  onRefresh: () => void;
  onQuote: () => void;
  onBuyIntent: () => void;
  onSubmitTx: () => void;
  onWalletChallenge: () => void;
  onWalletVerify: () => void;
  onWalletAutoVerify: () => void;
  onWalletUnlink: () => void;
  onPayoutRequest: () => void;
  onPassPurchase: (passKey: string, paymentCurrency?: string) => void;
  onCosmeticPurchase: (itemKey: string, paymentCurrency?: string) => void;
  walletChallengeLoading: boolean;
  walletVerifyLoading: boolean;
  walletAutoVerifyLoading: boolean;
  walletUnlinkLoading: boolean;
  payoutRequestLoading: boolean;
  passPurchaseLoading: boolean;
  cosmeticPurchaseLoading: boolean;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
  onQuoteUsdChange: (value: string) => void;
  onQuoteChainChange: (value: string) => void;
  onSubmitRequestIdChange: (value: string) => void;
  onSubmitTxHashChange: (value: string) => void;
  onWalletChainChange: (value: string) => void;
  onWalletAddressChange: (value: string) => void;
  onWalletChallengeRefChange: (value: string) => void;
  onWalletSignatureChange: (value: string) => void;
  onPayoutCurrencyChange: (value: string) => void;
};

function asText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function shortStatus(value: string, onText: string, offText: string) {
  return value ? onText : offText;
}

export function VaultPanel(props: VaultPanelProps) {
  const [showGame, setShowGame] = useState(false);
  const view = buildVaultViewModel({
    vaultData: props.vaultData
  });
  const summary = view.summary;
  const latest = view.latest;
  const catalog = view.catalog;
  const copy =
    props.lang === "tr"
      ? {
          kicker: "Vault Komut",
          title: "Ödül ve cüzdan rotası",
          body: "Burada mint açılır, wallet proof tamamlanır ve cashout hattına geçilir.",
          routeTitle: "Sonraki çıkış rotası",
          routeWalletBody: "Wallet proof kapanmadan payout ve reward kapıları tam açılmaz.",
          routePayoutBody: "Payout hazır; çıkışı kilitlemeden request gönder.",
          routeRewardsBody: "Vault açıkken pass ve cosmetic ödüllerini topla.",
          routeTradeBody: "Henüz trade lane açık; quote ve intent ile rotayı ileri it.",
          routeLabelWallet: "proof kapısı",
          routeLabelPayout: "çıkış penceresi",
          routeLabelRewards: "ödül pazarı",
          routeLabelTrade: "mint rotası",
          chainTitle: "Görev → proof → çıkış",
          chainBody: "Görevden gelen ödül burada wallet proof ile açılır, sonra cashout veya ödül pazarına dağılır.",
          chainMission: "Görev tamamla",
          chainMissionBody: "Claim edilen görev seni wallet ve ödül odasına iter.",
          chainProof: "Proof kapısı",
          chainProofBody: "Wallet doğrulama payout penceresini ve premium ödülleri gerçekten açar.",
          chainExit: "Çıkış / ödül",
          chainExitBody: "Proof temizse payout request veya ödül pazarı sonraki çıkıştır.",
          stateComplete: "tamam",
          stateLive: "canlı",
          stateReady: "hazır",
          stateLocked: "kilitli",
          balanceShort: "BAL",
          signalRewards: "ödül",
          routeSideTitle: "Bağlı koridorlar",
          routeSideBody: "Aynı odadan açılan wallet, payout ve reward çıkışları.",
          rewardsExit: "Ödül pazarı",
          walletExit: "Proof yolu",
          payoutExit: "Çıkış penceresi",
          tradeLane: "Mint rotası",
          tradeBody: "Quote al, intent kilitle ve gerekiyorsa zincir adımını tamamla.",
          walletLane: "Proof yolu",
          walletBody: "Cüzdanı bağla, challenge doğrula ve payout yolunu aç.",
          payoutLane: "Çıkış penceresi",
          payoutBody: "Hazır bakiyeyi seçilen para biriminde payout isteğine çevir.",
          rewardsLane: "Ödül pazarı",
          rewardsBody: "Pass ve cosmetic ödülleri buradan toplanır.",
          latestLane: "Son rota izi",
          latestBody: "En son quote, intent ve payout hareketleri burada kalır.",
          manualTools: "Arka ofis araçları",
          manualBody: "Tx hash, request id ve imza gibi ağır alanları ana rotadan ayrı tut.",
          walletOn: "cüzdan açık",
          walletOff: "cüzdan kapalı",
          payoutReady: "payout hazır",
          payoutLocked: "payout kilitli",
          premium: "premium",
          standard: "standart",
          quoteHint: "USD miktarı",
          chainHint: "Ağ seçin",
          addressHint: "Cüzdan adresi",
          currencyHint: "Payout para birimi",
          challengeHint: "Challenge ref",
          signatureHint: "Cüzdan imzası"
        }
      : {
          kicker: "Vault Command",
          title: "Rewards and wallet route",
          body: "This is the route where mint starts, wallet proof clears, and cashout opens.",
          routeTitle: "Next exit route",
          routeWalletBody: "Until wallet proof clears, payout and reward gates stay only partially open.",
          routePayoutBody: "Payout is ready; send the request before the route cools down.",
          routeRewardsBody: "With the vault open, harvest pass and cosmetic rewards next.",
          routeTradeBody: "Trade lane is still the active route; move it forward with quote and intent.",
          routeLabelWallet: "proof gate",
          routeLabelPayout: "cashout window",
          routeLabelRewards: "prize market",
          routeLabelTrade: "mint route",
          chainTitle: "Mission -> proof -> cashout",
          chainBody: "A mission payout enters here, clears wallet proof, then splits into cashout or prize routes.",
          chainMission: "Mission close",
          chainMissionBody: "A claimed objective pushes you into the wallet and rewards chamber.",
          chainProof: "Proof gate",
          chainProofBody: "Wallet verify is what truly opens payout and premium rewards.",
          chainExit: "Cashout / prize",
          chainExitBody: "Once proof clears, payout request or reward market becomes the next exit.",
          stateComplete: "complete",
          stateLive: "live",
          stateReady: "ready",
          stateLocked: "locked",
          balanceShort: "BAL",
          signalRewards: "items",
          routeSideTitle: "Linked corridors",
          routeSideBody: "Wallet, payout and reward exits that open from the same chamber.",
          rewardsExit: "Prize market",
          walletExit: "Proof lane",
          payoutExit: "Cashout window",
          tradeLane: "Mint route",
          tradeBody: "Get a quote, lock an intent, and only touch chain steps when needed.",
          walletLane: "Proof lane",
          walletBody: "Link the wallet, verify the challenge, and unlock payout.",
          payoutLane: "Cashout window",
          payoutBody: "Turn available balance into a payout request in the selected currency.",
          rewardsLane: "Prize market",
          rewardsBody: "Pass and cosmetic reward choices live here.",
          latestLane: "Latest route trace",
          latestBody: "Most recent quote, intent, and payout movements stay here.",
          manualTools: "Back-office tools",
          manualBody: "Keep tx hash, request id, and signature tools away from the main route.",
          walletOn: "wallet live",
          walletOff: "wallet idle",
          payoutReady: "payout ready",
          payoutLocked: "payout locked",
          premium: "premium",
          standard: "standard",
          quoteHint: "USD amount",
          chainHint: "Chain",
          addressHint: "Wallet address",
          currencyHint: "Payout currency",
          challengeHint: "Challenge ref",
          signatureHint: "Wallet signature"
        };
  const nextVaultRoute = (() => {
    if (!summary.wallet_active) {
      return {
        kicker: copy.routeTitle,
        title: t(props.lang, "vault_wallet_verify"),
        body: copy.routeWalletBody,
        label: copy.routeLabelWallet,
        cta: t(props.lang, "vault_wallet_verify"),
        onPress: props.onWalletVerify
      };
    }
    if (summary.payout_can_request) {
      return {
        kicker: copy.routeTitle,
        title: t(props.lang, "vault_payout_request"),
        body: copy.routePayoutBody,
        label: copy.routeLabelPayout,
        cta: t(props.lang, "vault_payout_request"),
        onPress: props.onPayoutRequest
      };
    }
    if (catalog.passes.length || catalog.cosmetics.length) {
      return {
        kicker: copy.routeTitle,
        title: t(props.lang, "shell_panel_open_rewards"),
        body: copy.routeRewardsBody,
        label: copy.routeLabelRewards,
        cta: t(props.lang, "shell_panel_open_rewards"),
        onPress: () => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_vault")
      };
    }
    return {
      kicker: copy.routeTitle,
      title: t(props.lang, "vault_buy_intent"),
      body: copy.routeTradeBody,
      label: copy.routeLabelTrade,
      cta: t(props.lang, "vault_buy_intent"),
      onPress: props.onBuyIntent
    };
  })();
  const formatVaultStatus = (value: unknown) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) {
      return t(props.lang, "status_unknown");
    }
    if (["ready", "ok", "verified", "approved"].includes(raw)) {
      return copy.stateReady;
    }
    if (["active", "live", "running", "open", "requested", "submitted", "intent_created"].includes(raw)) {
      return copy.stateLive;
    }
    if (["blocked", "locked", "inactive", "disabled", "failed", "rejected"].includes(raw)) {
      return copy.stateLocked;
    }
    return raw.replace(/[_-]+/g, " ");
  };
  const routeStatusLabel = formatVaultStatus(summary.route_status);
  const walletKycLabel = summary.wallet_kyc_status || t(props.lang, "status_unknown");

  return (
    <section className="akrCard akrCardWide akrGameHub" data-akr-panel-key="vault" data-akr-focus-key="vault_route">
      <div className="akrGameHero">
        <div className="akrGameHeroCopy">
          <p className="akrKicker">{copy.kicker}</p>
          <h2>{t(props.lang, "vault_title")}</h2>
          <p>{copy.body}</p>
        </div>
        <div className="akrGameHeroStats">
          <span className="akrChip">{summary.token_symbol || "-"}</span>
          <span className="akrChip">{summary.token_chain || "-"}</span>
          <span className="akrChip">{copy.balanceShort} {Math.floor(summary.token_balance)}</span>
          <span className="akrChip">{summary.wallet_chain || shortStatus(summary.wallet_active ? "1" : "", copy.walletOn, copy.walletOff)}</span>
          <span className="akrChip">{summary.premium_active ? copy.premium : copy.standard}</span>
        </div>
        <div className="akrCurrencyHud">
          <span className="akrCurrencyChip akrCurrencySC">{summary.token_symbol || "TOK"} ${summary.token_price_usd.toFixed(4)}</span>
          <span className="akrCurrencyChip akrCurrencyHC">{summary.payout_requestable_btc.toFixed(8)} BTC</span>
          <span className="akrCurrencyChip akrCurrencyRC">{routeStatusLabel}</span>
        </div>
      </div>

      <TonWalletConnect
        lang={props.lang}
        walletVerified={summary.wallet_active}
        walletKycStatus={summary.wallet_kyc_status || ""}
        onWalletConnected={(chain, address) => {
          props.onWalletChainChange(chain);
          props.onWalletAddressChange(address);
        }}
        onWalletDisconnected={() => {
          props.onWalletAddressChange("");
        }}
        walletAutoVerifyLoading={props.walletAutoVerifyLoading || props.walletChallengeLoading || props.walletVerifyLoading}
        onWalletAutoVerify={props.onWalletAutoVerify}
        onWalletUnlink={props.onWalletUnlink}
        walletUnlinkLoading={props.walletUnlinkLoading}
      />

      <MultiChainWalletConnect
        lang={props.lang}
        walletVerified={summary.wallet_active}
        walletChain={props.walletChain}
        walletAddress={props.walletAddress}
        walletKycStatus={summary.wallet_kyc_status || ""}
        onChainSelect={props.onWalletChainChange}
        onAddressChange={props.onWalletAddressChange}
        onAutoVerify={props.onWalletAutoVerify}
        onUnlink={props.onWalletUnlink}
        autoVerifyLoading={props.walletAutoVerifyLoading || props.walletChallengeLoading || props.walletVerifyLoading}
        unlinkLoading={props.walletUnlinkLoading}
      />

      <section className="akrGameSpotlight" data-akr-panel-key="vault" data-akr-focus-key="vault_exit_route">
        <div className="akrGameSpotlightMain">
          <p className="akrKicker">
            {nextVaultRoute.kicker} | {nextVaultRoute.label}
          </p>
          <h3>{nextVaultRoute.title}</h3>
          <p>{nextVaultRoute.body}</p>
          <div className="akrChipRow">
            <span className="akrChip akrChipInfo">
              {summary.wallet_chain || shortStatus(summary.wallet_active ? "1" : "", copy.walletOn, copy.walletOff)}
            </span>
            <span className="akrChip">
              {summary.payout_can_request ? copy.payoutReady : copy.payoutLocked}
            </span>
            <span className="akrChip">
              {catalog.passes.length + catalog.cosmetics.length} {copy.signalRewards}
            </span>
          </div>
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnAccent" onClick={nextVaultRoute.onPress}>
              {nextVaultRoute.cta}
            </button>
            <button type="button" className="akrBtn akrBtnGhost" onClick={props.onRefresh}>
              {t(props.lang, "vault_refresh")}
            </button>
          </div>
        </div>
        <div className="akrGameSpotlightAside">
          <h4>{copy.routeSideTitle}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.routeSideBody}</p>
          <div className="akrQuickHintGrid">
            <button type="button" className="akrQuickHintCard" onClick={props.onWalletVerify}>
              <span className="akrKicker">{copy.walletExit}</span>
              <strong>{t(props.lang, "vault_wallet_verify")}</strong>
            </button>
            <button type="button" className="akrQuickHintCard" onClick={props.onPayoutRequest}>
              <span className="akrKicker">{copy.payoutExit}</span>
              <strong>{t(props.lang, "vault_payout_request")}</strong>
            </button>
            <button
              type="button"
              className="akrQuickHintCard"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_vault")}
            >
              <span className="akrKicker">{copy.rewardsExit}</span>
              <strong>{t(props.lang, "shell_panel_open_rewards")}</strong>
            </button>
          </div>
        </div>
      </section>

      <RouteStrip
        panelKey="vault"
        focusKey="vault_chain"
        title={copy.chainTitle}
        body={copy.chainBody}
        steps={[
          {
            kicker: copy.chainMission,
            title: t(props.lang, "tasks_focus_claims"),
            body: copy.chainMissionBody,
            stateLabel: copy.stateComplete,
            signals: [routeStatusLabel, `${summary.active_pass_count} ${copy.signalRewards}`],
            tone: "done",
            onClick: () => props.onShellAction(SHELL_ACTION_KEY.PLAYER_TASKS_CLAIMS, "panel_vault")
          },
          {
            kicker: copy.chainProof,
            title: t(props.lang, "vault_wallet_verify"),
            body: copy.chainProofBody,
            stateLabel: summary.wallet_active ? copy.stateComplete : copy.stateLive,
            signals: [summary.wallet_chain || "-", summary.wallet_active ? copy.walletOn : copy.walletOff],
            tone: summary.wallet_active ? "done" : "active",
            onClick: props.onWalletVerify
          },
          {
            kicker: copy.chainExit,
            title: nextVaultRoute.title,
            body: copy.chainExitBody,
            stateLabel: summary.wallet_active ? copy.stateReady : copy.stateLocked,
            signals: [`${summary.payout_requestable_btc.toFixed(8)} BTC`, `${catalog.passes.length + catalog.cosmetics.length} ${copy.signalRewards}`],
            tone: summary.wallet_active ? "active" : "idle",
            onClick: nextVaultRoute.onPress
          }
        ]}
      />

      <div className="akrGameActionGrid">
        <button type="button" className="akrActionFeatureCard isPrimary" onClick={props.onBuyIntent}>
          <p className="akrKicker">{copy.tradeLane}</p>
          <h3>{t(props.lang, "vault_buy_intent")}</h3>
          <p>{copy.tradeBody}</p>
          <span className="akrChip">
            {props.quoteUsd || "0"} {props.quoteChain || "-"}
          </span>
        </button>
        <button type="button" className="akrActionFeatureCard" onClick={props.onWalletVerify}>
          <p className="akrKicker">{copy.walletLane}</p>
          <h3>{t(props.lang, "vault_wallet_verify")}</h3>
          <p>{summary.wallet_address_masked || copy.walletBody}</p>
          <span className="akrChip">{summary.wallet_active ? copy.walletOn : copy.walletOff}</span>
        </button>
        <button type="button" className="akrActionFeatureCard" onClick={props.onPayoutRequest}>
          <p className="akrKicker">{copy.payoutLane}</p>
          <h3>{t(props.lang, "vault_payout_request")}</h3>
          <p>{copy.payoutBody}</p>
          <span className="akrChip">{summary.payout_can_request ? copy.payoutReady : copy.payoutLocked}</span>
        </button>
        <button
          type="button"
          className="akrActionFeatureCard"
          onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_vault")}
        >
          <p className="akrKicker">{copy.rewardsLane}</p>
          <h3>{t(props.lang, "shell_panel_open_rewards")}</h3>
          <p>{copy.rewardsBody}</p>
          <span className="akrChip">
            {catalog.passes.length + catalog.cosmetics.length} {copy.signalRewards}
          </span>
        </button>
      </div>

      <div className="akrStatRail">
        <div className="akrMetricCard">
          <span>{copy.tradeLane}</span>
          <strong>{summary.token_symbol || "-"}</strong>
        </div>
        <div className="akrMetricCard">
          <span>{copy.walletLane}</span>
          <strong>{summary.wallet_chain || shortStatus(summary.wallet_active ? "1" : "", copy.walletOn, copy.walletOff)}</strong>
        </div>
        <div className="akrMetricCard">
          <span>{copy.payoutLane}</span>
          <strong>{summary.payout_can_request ? copy.payoutReady : copy.payoutLocked}</strong>
        </div>
        <div className="akrMetricCard">
          <span>{copy.rewardsLane}</span>
          <strong>{summary.active_pass_count}</strong>
        </div>
      </div>

      <div className="akrSplit">
        <section className="akrMiniPanel akrTokenStorePanel">
          <h4>{props.lang === "tr" ? "Token Satın Al" : "Buy Tokens"}</h4>
          <p className="akrMuted akrMiniPanelBody">
            {props.lang === "tr"
              ? "NXT token satın alarak oyun içi ekonomiye katıl. BTC, ETH, TRX, SOL veya TON ile ödeme yap."
              : "Join the in-game economy by purchasing NXT tokens. Pay with BTC, ETH, TRX, SOL, or TON."}
          </p>
          <div className="akrTokenStorePriceRow">
            <div className="akrMetricCard">
              <span>{props.lang === "tr" ? "Token Fiyatı" : "Token Price"}</span>
              <strong>${summary.token_price_usd.toFixed(4)}</strong>
            </div>
            <div className="akrMetricCard">
              <span>{props.lang === "tr" ? "Bakiyen" : "Balance"}</span>
              <strong>{Math.floor(summary.token_balance)} {summary.token_symbol || "NXT"}</strong>
            </div>
          </div>
          <div className="akrInputRow">
            <input
              value={props.quoteUsd}
              onChange={(e) => props.onQuoteUsdChange(e.target.value)}
              placeholder={copy.quoteHint}
              aria-label="quote-usd"
              type="number"
              min="1"
              max="250"
            />
            <select
              value={props.quoteChain}
              onChange={(e) => props.onQuoteChainChange(e.target.value)}
              aria-label="quote-chain"
              className="akrSelect"
            >
              <option value="TON">TON</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="TRX">TRX</option>
              <option value="SOL">SOL</option>
            </select>
          </div>
          {latest.quote_usd > 0 ? (
            <div className="akrQuoteResult">
              <div className="akrChipRow">
                <span className="akrChip akrChipInfo">${latest.quote_usd.toFixed(2)} USD</span>
                <span className="akrChip">{latest.quote_token_amount.toFixed(4)} {summary.token_symbol || "NXT"}</span>
                <span className="akrChip">{props.lang === "tr" ? "Kur" : "Rate"}: {latest.quote_rate.toFixed(6)}</span>
              </div>
            </div>
          ) : null}
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnGhost" onClick={props.onQuote}>
              {props.lang === "tr" ? "Fiyat Al" : "Get Quote"}
            </button>
            <button type="button" className="akrBtn akrBtnAccent" onClick={props.onBuyIntent}>
              {props.lang === "tr" ? "Satın Al" : "Buy Now"}
            </button>
          </div>
          <p className="akrMuted akrSmallText">
            {props.lang === "tr"
              ? "Min $1 — Max $250 | Fiyat bonding curve ile belirlenir"
              : "Min $1 — Max $250 | Price determined by bonding curve"}
          </p>
        </section>

        <section className="akrMiniPanel">
          <h4>{copy.walletLane}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.walletBody}</p>
          <div className="akrChipRow">
            <span className="akrChip">{walletKycLabel}</span>
            <span className="akrChip">{summary.wallet_address_masked || "-"}</span>
            <span className="akrChip">{summary.wallet_chain || "-"}</span>
            <span className="akrChip">{routeStatusLabel}</span>
          </div>
          <p className="akrMuted" style={{ fontSize: 11 }}>
            {props.lang === "tr"
              ? "Cüzdan bağlantısı için yukarıdaki paneli kullan. 6 ağ desteklenir."
              : "Use the wallet panel above to connect. 6 chains supported."}
          </p>
        </section>
      </div>

      <div className="akrSplit">
        <section className="akrMiniPanel">
          <h4>{copy.payoutLane}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.payoutBody}</p>
          <div className="akrInputRow">
            <select
              value={props.payoutCurrency}
              onChange={(e) => props.onPayoutCurrencyChange(e.target.value)}
              aria-label="payout-currency"
              className="akrSelect"
            >
              <option value="">{copy.currencyHint}</option>
              <option value="BTC">BTC (Bitcoin)</option>
              <option value="ETH">ETH (Ethereum)</option>
              <option value="USDT_TRC20">USDT (TRC-20)</option>
              <option value="TON">TON</option>
              <option value="SOL">SOL (Solana)</option>
            </select>
          </div>
          <div className="akrChipRow">
            <span className="akrChip">{props.lang === "tr" ? "Talep" : "Req"} {summary.payout_requestable_btc.toFixed(8)} BTC</span>
            <span className="akrChip">{props.lang === "tr" ? "Hak" : "Entitled"} {summary.payout_entitled_btc.toFixed(8)} BTC</span>
            <span className="akrChip">{summary.payout_unlock_tier || "-"}</span>
          </div>
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnAccent" disabled={props.payoutRequestLoading} onClick={props.onPayoutRequest}>
              {t(props.lang, "vault_payout_request")}
            </button>
            <button
              type="button"
              className="akrBtn akrBtnGhost"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST, "panel_vault")}
            >
              {t(props.lang, "shell_panel_go_payout")}
            </button>
          </div>
        </section>

        <section className="akrMiniPanel">
          <h4>{copy.rewardsLane}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.rewardsBody}</p>
          <ul className="akrList">
            {catalog.passes.slice(0, 2).map((row) => (
              <li key={`pass_${row.pass_key}`}>
                <strong>
                  {row.title} ({row.duration_days}d)
                </strong>
                <span>
                  {row.price_amount} {row.price_currency}
                  <button
                    type="button"
                    className="akrBtn akrBtnGhost"
                    disabled={props.passPurchaseLoading}
                    onClick={() => props.onPassPurchase(row.pass_key, row.price_currency)}
                  >
                    {t(props.lang, "vault_purchase_pass")}
                  </button>
                </span>
              </li>
            ))}
            {catalog.cosmetics.slice(0, 2).map((row) => (
              <li key={`cosmetic_${row.item_key}`}>
                <strong>
                  {row.title} ({row.rarity})
                </strong>
                <span>
                  {row.price_amount} {row.price_currency}
                  <button
                    type="button"
                    className="akrBtn akrBtnGhost"
                    disabled={props.cosmeticPurchaseLoading}
                    onClick={() => props.onCosmeticPurchase(row.item_key, row.price_currency)}
                  >
                    {t(props.lang, "vault_purchase_cosmetic")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {!catalog.passes.length && !catalog.cosmetics.length ? <p className="akrMuted">{t(props.lang, "vault_catalog_empty")}</p> : null}
        </section>
      </div>

      <section className="akrMiniPanel">
        <h4>{copy.latestLane}</h4>
        <p className="akrMuted akrMiniPanelBody">{copy.latestBody}</p>
        <div className="akrChipRow">
          <span className="akrChip">Intent #{Math.floor(latest.intent_request_id)}</span>
          <span className="akrChip">{latest.intent_status || "-"}</span>
          <span className="akrChip">Submit #{Math.floor(latest.submit_request_id)}</span>
          <span className="akrChip">{latest.submit_status || "-"}</span>
          <span className="akrChip">Payout #{Math.floor(latest.payout_request_id)}</span>
          <span className="akrChip">{latest.payout_request_status || "-"}</span>
        </div>
        <p className="akrMuted">
          {latest.submit_tx_hash || "-"} | {latest.payout_request_ref || "-"} | {latest.pass_purchase_ref || "-"} | {latest.cosmetic_purchase_ref || "-"}
        </p>
      </section>

      <details className="akrCard akrCardWide akrDisclosureCard">
        <summary>
          <span>{copy.manualTools}</span>
          <span className="akrMuted">{copy.manualBody}</span>
        </summary>
        <div className="akrDisclosureBody">
          <div className="akrInputRow">
            <input
              value={props.submitRequestId}
              onChange={(e) => props.onSubmitRequestIdChange(e.target.value)}
              aria-label="submit-request-id"
              placeholder={props.lang === "tr" ? "İstek ID" : "Request ID"}
            />
            <input
              value={props.submitTxHash}
              onChange={(e) => props.onSubmitTxHashChange(e.target.value)}
              aria-label="submit-tx-hash"
              placeholder={props.lang === "tr" ? "İşlem hash" : "TX hash"}
            />
          </div>
          <div className="akrInputRow">
            <input
              value={props.walletChallengeRef}
              onChange={(e) => props.onWalletChallengeRefChange(e.target.value)}
              aria-label="wallet-challenge-ref"
              placeholder={copy.challengeHint}
            />
            <input
              value={props.walletSignature}
              onChange={(e) => props.onWalletSignatureChange(e.target.value)}
              aria-label="wallet-signature"
              placeholder={copy.signatureHint}
            />
          </div>
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnGhost" onClick={props.onSubmitTx}>
              {t(props.lang, "vault_submit_tx")}
            </button>
            <button type="button" className="akrBtn akrBtnGhost" onClick={props.onRefresh}>
              {t(props.lang, "vault_refresh")}
            </button>
          </div>
        </div>
      </details>

      {/* Hash Racer Mini Game */}
      <div style={{ margin: "16px 0" }}>
        {!showGame ? (
          <button
            onClick={() => setShowGame(true)}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(124,58,237,0.1))",
              border: "1px solid rgba(168,85,247,0.2)",
              borderRadius: 12,
              padding: "14px 16px",
              color: "#A855F7",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            ⛏️ {props.lang === "tr" ? "Hash Yarışçısı Oyna — SC Kazan!" : "Play Hash Racer — Earn SC!"}
          </button>
        ) : (
          <HashRacer lang={props.lang} onClose={() => setShowGame(false)} />
        )}
      </div>

      {!view.has_data ? <p className="akrMuted">{t(props.lang, "vault_empty")}</p> : null}
      {props.advanced ? <pre className="akrJsonBlock">{JSON.stringify(props.vaultData || {}, null, 2)}</pre> : null}
    </section>
  );
}
