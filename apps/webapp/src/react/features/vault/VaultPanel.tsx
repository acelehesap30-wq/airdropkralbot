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
  const [showGame, setShowGame] = useState(true);
  const [subView, setSubView] = useState<"play" | "vault">("play");
  const view = buildVaultViewModel({
    vaultData: props.vaultData
  });
  const summary = view.summary;
  const latest = view.latest;
  const catalog = view.catalog;
  const copy = {
    kicker: t(props.lang, "vault_kicker"),
    title: t(props.lang, "vault_title_copy"),
    body: t(props.lang, "vault_body"),
    routeTitle: t(props.lang, "vault_route_title"),
    routeWalletBody: t(props.lang, "vault_route_wallet_body"),
    routePayoutBody: t(props.lang, "vault_route_payout_body"),
    routeRewardsBody: t(props.lang, "vault_route_rewards_body"),
    routeTradeBody: t(props.lang, "vault_route_trade_body"),
    routeLabelWallet: t(props.lang, "vault_route_label_wallet"),
    routeLabelPayout: t(props.lang, "vault_route_label_payout"),
    routeLabelRewards: t(props.lang, "vault_route_label_rewards"),
    routeLabelTrade: t(props.lang, "vault_route_label_trade"),
    chainTitle: t(props.lang, "vault_chain_title"),
    chainBody: t(props.lang, "vault_chain_body"),
    chainMission: t(props.lang, "vault_chain_mission"),
    chainMissionBody: t(props.lang, "vault_chain_mission_body"),
    chainProof: t(props.lang, "vault_chain_proof"),
    chainProofBody: t(props.lang, "vault_chain_proof_body"),
    chainExit: t(props.lang, "vault_chain_exit"),
    chainExitBody: t(props.lang, "vault_chain_exit_body"),
    stateComplete: t(props.lang, "vault_state_complete"),
    stateLive: t(props.lang, "vault_state_live"),
    stateReady: t(props.lang, "vault_state_ready"),
    stateLocked: t(props.lang, "vault_state_locked"),
    balanceShort: t(props.lang, "vault_balance_short"),
    signalRewards: t(props.lang, "vault_signal_rewards"),
    routeSideTitle: t(props.lang, "vault_route_side_title"),
    routeSideBody: t(props.lang, "vault_route_side_body"),
    rewardsExit: t(props.lang, "vault_rewards_exit"),
    walletExit: t(props.lang, "vault_wallet_exit"),
    payoutExit: t(props.lang, "vault_payout_exit"),
    tradeLane: t(props.lang, "vault_trade_lane"),
    tradeBody: t(props.lang, "vault_trade_body"),
    walletLane: t(props.lang, "vault_wallet_lane"),
    walletBody: t(props.lang, "vault_wallet_body"),
    payoutLane: t(props.lang, "vault_payout_lane"),
    payoutBody: t(props.lang, "vault_payout_body"),
    rewardsLane: t(props.lang, "vault_rewards_lane"),
    rewardsBody: t(props.lang, "vault_rewards_body"),
    latestLane: t(props.lang, "vault_latest_lane"),
    latestBody: t(props.lang, "vault_latest_body"),
    manualTools: t(props.lang, "vault_manual_tools"),
    manualBody: t(props.lang, "vault_manual_body"),
    walletOn: t(props.lang, "vault_wallet_on"),
    walletOff: t(props.lang, "vault_wallet_off"),
    payoutReady: t(props.lang, "vault_payout_ready"),
    payoutLocked: t(props.lang, "vault_payout_locked"),
    premium: t(props.lang, "vault_premium"),
    standard: t(props.lang, "vault_standard"),
    quoteHint: t(props.lang, "vault_quote_hint"),
    chainHint: t(props.lang, "vault_chain_hint"),
    addressHint: t(props.lang, "vault_address_hint"),
    currencyHint: t(props.lang, "vault_currency_hint"),
    challengeHint: t(props.lang, "vault_challenge_hint"),
    signatureHint: t(props.lang, "vault_signature_hint"),
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
          <span className="akrChip">{summary.token_symbol || "NXT"}</span>
          <span className="akrChip">{summary.token_chain || "TON"}</span>
          <span className="akrChip">{copy.balanceShort} {Math.floor(summary.token_balance)}</span>
          <span className="akrChip">{summary.wallet_chain || shortStatus(summary.wallet_active ? "1" : "", copy.walletOn, copy.walletOff)}</span>
          <span className="akrChip">{summary.premium_active ? copy.premium : copy.standard}</span>
        </div>
        <div className="akrCurrencyHud">
          <span className="akrCurrencyChip akrCurrencySC">
            {summary.token_symbol || "NXT"}{" "}
            {summary.token_price_usd > 0
              ? `$${summary.token_price_usd.toFixed(4)}`
              : props.lang === "tr" ? "PRE-LAUNCH" : "PRE-LAUNCH"}
          </span>
          <span className="akrCurrencyChip akrCurrencyHC">
            {summary.payout_requestable_btc > 0
              ? `${summary.payout_requestable_btc.toFixed(8)} BTC`
              : props.lang === "tr" ? "BTC beklemede" : "BTC pending"}
          </span>
          <span className="akrCurrencyChip akrCurrencyRC">{routeStatusLabel}</span>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div style={{ display: "flex", gap: 4, padding: "8px 12px", background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: 8 }}>
        {([
          { key: "play" as const, icon: "\ud83c\udfae", l: t(props.lang, "sub_nav_games") },
          { key: "vault" as const, icon: "\ud83d\udd10", l: t(props.lang, "sub_nav_vault") },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setSubView(tab.key)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 8, border: "none",
            background: subView === tab.key ? "rgba(47,255,181,0.12)" : "transparent",
            color: subView === tab.key ? "#2fffb5" : "rgba(255,255,255,0.35)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            borderBottom: subView === tab.key ? "2px solid rgba(47,255,181,0.5)" : "2px solid transparent",
          }}>
            {tab.icon} {tab.l}
          </button>
        ))}
      </div>

      {subView === "play" && (
        <>
          {/* Hash Racer Mini Game — Featured Game */}
          <div className="akrCard akrCardGlow" style={{ marginTop: 16 }}>
            <div className="akrFeaturedHeader">
              <div className="akrFeaturedIcon">⛏️</div>
              <div>
                <div className="akrFeaturedTitle">{props.lang === "tr" ? "Hash Yarışçısı" : "Hash Racer"}</div>
                <div className="akrFeaturedSub">{props.lang === "tr" ? "3D matrix · Hash blokları kazan · SC ödülü" : "3D matrix · Mine hash blocks · Earn SC"}</div>
                <div className="akrFeaturedBadge">⛏️ MINE</div>
              </div>
            </div>
            <HashRacer lang={props.lang} onClose={() => setShowGame(false)} />
          </div>
        </>
      )}

      {subView === "vault" && (
        <>
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
        onWalletSignatureAvailable={(sig, _proofJson) => {
          props.onWalletSignatureChange(sig);
          props.onWalletChallengeRefChange("tonconnect_proof");
        }}
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

      {!view.has_data ? <p className="akrMuted">{t(props.lang, "vault_empty")}</p> : null}
      {props.advanced ? <pre className="akrJsonBlock">{JSON.stringify(props.vaultData || {}, null, 2)}</pre> : null}
        </>
      )}
    </section>
  );
}
