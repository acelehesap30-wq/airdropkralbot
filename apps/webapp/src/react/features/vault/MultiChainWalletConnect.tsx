import { useState, useCallback, useEffect } from "react";
import type { Lang } from "../../i18n";

type Chain = "TON" | "ETH" | "BSC" | "SOL" | "BTC" | "TRX";

type MultiChainWalletConnectProps = {
  lang: Lang;
  walletVerified: boolean;
  walletChain: string;
  walletAddress: string;
  walletKycStatus: string;
  onChainSelect: (chain: string) => void;
  onAddressChange: (address: string) => void;
  onAutoVerify: () => void;
  onUnlink: () => void;
  autoVerifyLoading: boolean;
  unlinkLoading: boolean;
};

const CHAINS: { key: Chain; label: string; icon: string; placeholder: string }[] = [
  { key: "TON", label: "TON", icon: "💎", placeholder: "EQ... / UQ..." },
  { key: "ETH", label: "Ethereum", icon: "⟠", placeholder: "0x..." },
  { key: "BSC", label: "BNB Chain", icon: "🔶", placeholder: "0x..." },
  { key: "SOL", label: "Solana", icon: "◎", placeholder: "Base58 address" },
  { key: "BTC", label: "Bitcoin", icon: "₿", placeholder: "bc1... / 1... / 3..." },
  { key: "TRX", label: "Tron", icon: "⚡", placeholder: "T..." },
];

export function MultiChainWalletConnect(props: MultiChainWalletConnectProps) {
  const [selectedChain, setSelectedChain] = useState<Chain | "">(
    (props.walletChain as Chain) || ""
  );
  const [addressInput, setAddressInput] = useState(props.walletAddress || "");
  const [step, setStep] = useState<"idle" | "verifying" | "done" | "error">(
    props.walletVerified ? "done" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const tr = props.lang === "tr";
  const copy = tr
    ? {
        title: "Cüzdan Bağlantısı",
        subtitle: "Desteklenen 6 ağdan birini seç ve cüzdanını bağla",
        selectChain: "Ağ Seç",
        enterAddress: "Cüzdan adresini gir",
        connect: "Bağla ve Doğrula",
        connecting: "Doğrulanıyor...",
        verified: "Doğrulandı",
        connected: "Bağlı",
        retry: "Tekrar Dene",
        unlink: "Bağlantıyı Kaldır",
        change: "Ağ Değiştir",
        verifiedMsg: "Cüzdan doğrulandı. Payout ve premium özellikler açık.",
        errorMsg: "Doğrulama başarısız. Lütfen adresi kontrol edip tekrar deneyin.",
        kycLabel: "KYC",
      }
    : {
        title: "Wallet Connection",
        subtitle: "Select one of 6 supported chains and connect your wallet",
        selectChain: "Select Chain",
        enterAddress: "Enter wallet address",
        connect: "Connect & Verify",
        connecting: "Verifying...",
        verified: "Verified",
        connected: "Connected",
        retry: "Retry",
        unlink: "Unlink Wallet",
        change: "Change Chain",
        verifiedMsg: "Wallet verified. Payout and premium features unlocked.",
        errorMsg: "Verification failed. Please check the address and try again.",
        kycLabel: "KYC",
      };

  const handleChainSelect = useCallback(
    (chain: Chain) => {
      setSelectedChain(chain);
      setAddressInput("");
      setStep("idle");
      setErrorMsg("");
      props.onChainSelect(chain);
      props.onAddressChange("");
    },
    [props]
  );

  const handleConnect = useCallback(() => {
    if (!selectedChain || !addressInput.trim()) return;
    props.onChainSelect(selectedChain);
    props.onAddressChange(addressInput.trim());
    setStep("verifying");
    setErrorMsg("");
    // Small delay to ensure state propagates before auto-verify
    setTimeout(() => props.onAutoVerify(), 50);
  }, [selectedChain, addressInput, props]);

  // Detect verification result
  const isVerified = props.walletVerified || step === "done";
  const isVerifying = props.autoVerifyLoading || step === "verifying";

  // Update step when verification completes
  useEffect(() => {
    if (props.walletVerified && step !== "done") {
      setStep("done");
      setErrorMsg("");
    }
  }, [props.walletVerified, step]);

  const activeChainInfo = CHAINS.find((c) => c.key === selectedChain);
  const shortAddr = props.walletAddress
    ? `${props.walletAddress.slice(0, 8)}...${props.walletAddress.slice(-6)}`
    : addressInput
    ? `${addressInput.slice(0, 8)}...${addressInput.slice(-6)}`
    : "";

  return (
    <section className="akrMiniPanel akrMultiChainWallet">
      <h4>{copy.title}</h4>
      <p className="akrMuted akrMiniPanelBody">{copy.subtitle}</p>

      {/* Chain selector grid */}
      {!isVerified && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 6,
            margin: "8px 0",
          }}
        >
          {CHAINS.map((chain) => (
            <button
              key={chain.key}
              type="button"
              onClick={() => handleChainSelect(chain.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 10px",
                borderRadius: 8,
                border:
                  selectedChain === chain.key
                    ? "1.5px solid rgba(0,210,255,0.7)"
                    : "1px solid rgba(255,255,255,0.08)",
                background:
                  selectedChain === chain.key
                    ? "rgba(0,210,255,0.1)"
                    : "rgba(255,255,255,0.03)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: selectedChain === chain.key ? 600 : 400,
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 16 }}>{chain.icon}</span>
              <span>{chain.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Address input (when chain selected, not verified) */}
      {selectedChain && !isVerified && (
        <div style={{ margin: "8px 0" }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 18 }}>{activeChainInfo?.icon}</span>
            <strong style={{ fontSize: 13 }}>
              {activeChainInfo?.label}
            </strong>
            <span
              className="akrChip"
              style={{ fontSize: 10, marginLeft: "auto" }}
            >
              {selectedChain}
            </span>
          </div>
          <input
            value={addressInput}
            onChange={(e) => {
              setAddressInput(e.target.value);
              props.onAddressChange(e.target.value);
            }}
            placeholder={activeChainInfo?.placeholder || copy.enterAddress}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(0,0,0,0.3)",
              color: "#fff",
              fontSize: 13,
              fontFamily: "monospace",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {errorMsg && (
            <p style={{ color: "#ff4444", fontSize: 11, margin: "4px 0" }}>
              {errorMsg}
            </p>
          )}
          <div className="akrActionRow" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="akrBtn akrBtnAccent"
              disabled={isVerifying || !addressInput.trim()}
              onClick={handleConnect}
            >
              {isVerifying
                ? copy.connecting
                : step === "error"
                ? copy.retry
                : copy.connect}
            </button>
            <button
              type="button"
              className="akrBtn akrBtnGhost"
              onClick={() => {
                setSelectedChain("");
                setAddressInput("");
                setStep("idle");
              }}
            >
              {copy.change}
            </button>
          </div>
        </div>
      )}

      {/* Verified state */}
      {isVerified && (
        <div style={{ margin: "8px 0" }}>
          <div className="akrChipRow">
            <span className="akrChip akrChipSuccess">{copy.verified}</span>
            <span className="akrChip">
              {activeChainInfo?.icon || "🔗"} {props.walletChain || selectedChain}
            </span>
            <span className="akrChip" style={{ fontFamily: "monospace", fontSize: 11 }}>
              {shortAddr}
            </span>
            {props.walletKycStatus &&
              props.walletKycStatus !== "unknown" && (
                <span className="akrChip">
                  {copy.kycLabel}: {props.walletKycStatus}
                </span>
              )}
          </div>
          <p className="akrMuted" style={{ fontSize: 11, margin: "6px 0" }}>
            {copy.verifiedMsg}
          </p>
          <div className="akrActionRow">
            <button
              type="button"
              className="akrBtn akrBtnGhost"
              disabled={props.unlinkLoading}
              onClick={() => {
                props.onUnlink();
                setStep("idle");
                setSelectedChain("");
                setAddressInput("");
              }}
            >
              {copy.unlink}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
