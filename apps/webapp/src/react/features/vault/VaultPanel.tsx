import { buildVaultViewModel } from "../../../core/player/vaultViewModel.js";
import { SHELL_ACTION_KEY } from "../../../core/navigation/shellActions.js";
import { t, type Lang } from "../../i18n";

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
  onWalletUnlink: () => void;
  onPayoutRequest: () => void;
  onPassPurchase: (passKey: string, paymentCurrency?: string) => void;
  onCosmeticPurchase: (itemKey: string, paymentCurrency?: string) => void;
  walletChallengeLoading: boolean;
  walletVerifyLoading: boolean;
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
  const view = buildVaultViewModel({
    vaultData: props.vaultData
  });
  const summary = view.summary;
  const latest = view.latest;
  const catalog = view.catalog;
  const copy =
    props.lang === "tr"
      ? {
          kicker: "Vault Command",
          title: "Odul ve wallet rotasi",
          body: "Burada mint acilir, wallet proof tamamlanir ve cashout hattina gecilir.",
          routeTitle: "Sonraki cikis rotasi",
          routeWalletBody: "Wallet proof kapanmadan payout ve reward kapilari tam acilmaz.",
          routePayoutBody: "Payout hazir; cikisi kilitlemeden request gonder.",
          routeRewardsBody: "Vault acikken pass ve cosmetic odullerini topla.",
          routeTradeBody: "Henuz trade lane acik; quote ve intent ile rotayi ileri it.",
          routeLabelWallet: "proof gate",
          routeLabelPayout: "cashout window",
          routeLabelRewards: "prize market",
          routeLabelTrade: "mint route",
          routeSideTitle: "Bagli koridorlar",
          routeSideBody: "Ayni odadan acilan wallet, payout ve reward cikislari.",
          rewardsExit: "Prize market",
          walletExit: "Proof lane",
          payoutExit: "Cashout window",
          tradeLane: "Mint rotasi",
          tradeBody: "Quote al, intent kilitle ve gerekiyorsa zincir adimini tamamla.",
          walletLane: "Proof lane",
          walletBody: "Cuzdani bagla, challenge dogrula ve payout yolunu ac.",
          payoutLane: "Cashout penceresi",
          payoutBody: "Hazir bakiyeyi secilen para biriminde payout istegine cevir.",
          rewardsLane: "Prize market",
          rewardsBody: "Pass ve cosmetic odulleri buradan toplanir.",
          latestLane: "Son rota izi",
          latestBody: "En son quote, intent ve payout hareketleri burada kalir.",
          manualTools: "Arka ofis araclari",
          manualBody: "Tx hash, request id ve imza gibi agir alanlari ana rotadan ayri tut.",
          walletOn: "wallet acik",
          walletOff: "wallet kapali",
          payoutReady: "payout hazir",
          payoutLocked: "payout kilitli",
          premium: "premium",
          standard: "standard",
          quoteHint: "USD miktari",
          chainHint: "Chain",
          addressHint: "Wallet adresi",
          currencyHint: "Payout para birimi",
          challengeHint: "Challenge ref",
          signatureHint: "Wallet signature"
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
          <span className="akrChip">Bal {Math.floor(summary.token_balance)}</span>
          <span className="akrChip">{summary.wallet_chain || shortStatus(summary.wallet_active ? "1" : "", copy.walletOn, copy.walletOff)}</span>
          <span className="akrChip">{summary.premium_active ? copy.premium : copy.standard}</span>
        </div>
        <div className="akrCurrencyHud">
          <span className="akrCurrencyChip akrCurrencySC">{summary.token_symbol || "TOK"} ${summary.token_price_usd.toFixed(4)}</span>
          <span className="akrCurrencyChip akrCurrencyHC">{summary.payout_requestable_btc.toFixed(8)} BTC</span>
          <span className="akrCurrencyChip akrCurrencyRC">{summary.route_status || "-"}</span>
        </div>
      </div>

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
              {catalog.passes.length + catalog.cosmetics.length} items
            </span>
          </div>
          <div className="akrActionRow">
            <button className="akrBtn akrBtnAccent" onClick={nextVaultRoute.onPress}>
              {nextVaultRoute.cta}
            </button>
            <button className="akrBtn akrBtnGhost" onClick={props.onRefresh}>
              {t(props.lang, "vault_refresh")}
            </button>
          </div>
        </div>
        <div className="akrGameSpotlightAside">
          <h4>{copy.routeSideTitle}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.routeSideBody}</p>
          <div className="akrQuickHintGrid">
            <button className="akrQuickHintCard" onClick={props.onWalletVerify}>
              <span className="akrKicker">{copy.walletExit}</span>
              <strong>{t(props.lang, "vault_wallet_verify")}</strong>
            </button>
            <button className="akrQuickHintCard" onClick={props.onPayoutRequest}>
              <span className="akrKicker">{copy.payoutExit}</span>
              <strong>{t(props.lang, "vault_payout_request")}</strong>
            </button>
            <button
              className="akrQuickHintCard"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_vault")}
            >
              <span className="akrKicker">{copy.rewardsExit}</span>
              <strong>{t(props.lang, "shell_panel_open_rewards")}</strong>
            </button>
          </div>
        </div>
      </section>

      <div className="akrGameActionGrid">
        <button className="akrActionFeatureCard isPrimary" onClick={props.onBuyIntent}>
          <p className="akrKicker">{copy.tradeLane}</p>
          <h3>{t(props.lang, "vault_buy_intent")}</h3>
          <p>{copy.tradeBody}</p>
          <span className="akrChip">
            {props.quoteUsd || "0"} {props.quoteChain || "-"}
          </span>
        </button>
        <button className="akrActionFeatureCard" onClick={props.onWalletVerify}>
          <p className="akrKicker">{copy.walletLane}</p>
          <h3>{t(props.lang, "vault_wallet_verify")}</h3>
          <p>{summary.wallet_address_masked || copy.walletBody}</p>
          <span className="akrChip">{summary.wallet_active ? copy.walletOn : copy.walletOff}</span>
        </button>
        <button className="akrActionFeatureCard" onClick={props.onPayoutRequest}>
          <p className="akrKicker">{copy.payoutLane}</p>
          <h3>{t(props.lang, "vault_payout_request")}</h3>
          <p>{copy.payoutBody}</p>
          <span className="akrChip">{summary.payout_can_request ? copy.payoutReady : copy.payoutLocked}</span>
        </button>
        <button
          className="akrActionFeatureCard"
          onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_vault")}
        >
          <p className="akrKicker">{copy.rewardsLane}</p>
          <h3>{t(props.lang, "shell_panel_open_rewards")}</h3>
          <p>{copy.rewardsBody}</p>
          <span className="akrChip">
            {catalog.passes.length + catalog.cosmetics.length} items
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
        <section className="akrMiniPanel">
          <h4>{copy.tradeLane}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.tradeBody}</p>
          <div className="akrInputRow">
            <input value={props.quoteUsd} onChange={(e) => props.onQuoteUsdChange(e.target.value)} placeholder={copy.quoteHint} aria-label="quote-usd" />
            <input value={props.quoteChain} onChange={(e) => props.onQuoteChainChange(e.target.value)} placeholder={copy.chainHint} aria-label="quote-chain" />
          </div>
          <div className="akrChipRow">
            <span className="akrChip">Quote ${latest.quote_usd.toFixed(2)}</span>
            <span className="akrChip">Token {latest.quote_token_amount.toFixed(4)}</span>
            <span className="akrChip">Rate {latest.quote_rate.toFixed(6)}</span>
          </div>
          <div className="akrActionRow">
            <button className="akrBtn akrBtnGhost" onClick={props.onQuote}>
              {t(props.lang, "vault_quote")}
            </button>
            <button className="akrBtn akrBtnAccent" onClick={props.onBuyIntent}>
              {t(props.lang, "vault_buy_intent")}
            </button>
          </div>
        </section>

        <section className="akrMiniPanel">
          <h4>{copy.walletLane}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.walletBody}</p>
          <div className="akrInputRow">
            <input value={props.walletChain} onChange={(e) => props.onWalletChainChange(e.target.value)} placeholder={copy.chainHint} aria-label="wallet-chain" />
            <input value={props.walletAddress} onChange={(e) => props.onWalletAddressChange(e.target.value)} placeholder={copy.addressHint} aria-label="wallet-address" />
          </div>
          <div className="akrChipRow">
            <span className="akrChip">{summary.wallet_kyc_status || "-"}</span>
            <span className="akrChip">{summary.wallet_address_masked || "-"}</span>
            <span className="akrChip">{summary.route_status || "-"}</span>
          </div>
          <div className="akrActionRow">
            <button className="akrBtn akrBtnGhost" disabled={props.walletChallengeLoading} onClick={props.onWalletChallenge}>
              {t(props.lang, "vault_wallet_challenge")}
            </button>
            <button className="akrBtn akrBtnAccent" disabled={props.walletVerifyLoading} onClick={props.onWalletVerify}>
              {t(props.lang, "vault_wallet_verify")}
            </button>
            <button className="akrBtn akrBtnGhost" disabled={props.walletUnlinkLoading} onClick={props.onWalletUnlink}>
              {t(props.lang, "vault_wallet_unlink")}
            </button>
          </div>
        </section>
      </div>

      <div className="akrSplit">
        <section className="akrMiniPanel">
          <h4>{copy.payoutLane}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.payoutBody}</p>
          <div className="akrInputRow">
            <input
              value={props.payoutCurrency}
              onChange={(e) => props.onPayoutCurrencyChange(e.target.value)}
              placeholder={copy.currencyHint}
              aria-label="payout-currency"
            />
          </div>
          <div className="akrChipRow">
            <span className="akrChip">Req {summary.payout_requestable_btc.toFixed(8)} BTC</span>
            <span className="akrChip">Entitled {summary.payout_entitled_btc.toFixed(8)} BTC</span>
            <span className="akrChip">{summary.payout_unlock_tier || "-"}</span>
          </div>
          <div className="akrActionRow">
            <button className="akrBtn akrBtnAccent" disabled={props.payoutRequestLoading} onClick={props.onPayoutRequest}>
              {t(props.lang, "vault_payout_request")}
            </button>
            <button
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
              placeholder="request id"
            />
            <input
              value={props.submitTxHash}
              onChange={(e) => props.onSubmitTxHashChange(e.target.value)}
              aria-label="submit-tx-hash"
              placeholder="tx hash"
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
            <button className="akrBtn akrBtnGhost" onClick={props.onSubmitTx}>
              {t(props.lang, "vault_submit_tx")}
            </button>
            <button className="akrBtn akrBtnGhost" onClick={props.onRefresh}>
              {t(props.lang, "vault_refresh")}
            </button>
          </div>
        </div>
      </details>

      {!view.has_data ? <p className="akrMuted">{t(props.lang, "vault_empty")}</p> : null}
      {props.advanced ? <pre className="akrJsonBlock">{JSON.stringify(props.vaultData || {}, null, 2)}</pre> : null}
    </section>
  );
}
