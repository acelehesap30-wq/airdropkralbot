import { useCallback, useEffect, useRef, useState } from "react";
import { TonConnectButton, useTonAddress, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { t, type Lang } from "../../i18n";

type TonWalletConnectProps = {
  lang: Lang;
  walletVerified: boolean;
  walletKycStatus: string;
  onWalletConnected: (chain: string, address: string) => void;
  onWalletDisconnected: () => void;
  walletAutoVerifyLoading: boolean;
  onWalletAutoVerify: () => void;
  onWalletUnlink: () => void;
  walletUnlinkLoading: boolean;
};

export function TonWalletConnect(props: TonWalletConnectProps) {
  const wallet = useTonWallet();
  const address = useTonAddress(false);
  const [tonConnectUI] = useTonConnectUI();
  const prevAddressRef = useRef<string>("");
  const prevLoadingRef = useRef<boolean>(false);
  const [verifyStep, setVerifyStep] = useState<"idle" | "verifying" | "done" | "error">("idle");
  const [verifyError, setVerifyError] = useState<string>("");

  const { onWalletConnected, onWalletDisconnected } = props;

  useEffect(() => {
    if (address && address !== prevAddressRef.current) {
      prevAddressRef.current = address;
      onWalletConnected("TON", address);
    }
    if (!address && prevAddressRef.current) {
      prevAddressRef.current = "";
      setVerifyStep("idle");
      setVerifyError("");
      onWalletDisconnected();
    }
  }, [address, onWalletConnected, onWalletDisconnected]);

  useEffect(() => {
    if (props.walletVerified) {
      setVerifyStep("done");
      setVerifyError("");
    }
  }, [props.walletVerified]);

  // Detect verify failure: loading went from true→false without walletVerified becoming true
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = props.walletAutoVerifyLoading;
    if (wasLoading && !props.walletAutoVerifyLoading && !props.walletVerified && verifyStep === "verifying") {
      setVerifyStep("error");
      setVerifyError(props.lang === "tr"
        ? "Doğrulama başarısız. Lütfen tekrar deneyin."
        : "Verification failed. Please try again.");
    }
  }, [props.walletAutoVerifyLoading, props.walletVerified, verifyStep, props.lang]);

  const handleDisconnect = useCallback(async () => {
    try {
      await tonConnectUI.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }, [tonConnectUI]);

  const handleVerifyClick = useCallback(() => {
    setVerifyStep("verifying");
    setVerifyError("");
    props.onWalletAutoVerify();
  }, [props.onWalletAutoVerify]);

  const copy =
    props.lang === "tr"
      ? {
          title: "TON Cüzdan Bağlantısı",
          body: "Cüzdanını bağla, bakiye ve payout işlemlerini doğrudan cüzdan üzerinden yönet.",
          connected: "Cüzdan Bağlı",
          verified: "Doğrulanmış",
          disconnected: "Cüzdan Bağlı Değil",
          connectHint: "Aşağıdaki butona tıklayarak TON cüzdanını bağla.",
          addressLabel: "Adres",
          chainLabel: "Zincir",
          verifyHint: "Cüzdanı doğrulamak için aşağıdaki butona tıkla. İşlem otomatik tamamlanacak.",
          verifyingHint: "Cüzdan doğrulaması devam ediyor...",
          verifiedHint: "Cüzdan başarıyla doğrulandı. Payout ve premium özellikler açık.",
          disconnect: "Bağlantıyı Kes",
          verify: "Cüzdanı Doğrula",
          verifying: "Doğrulanıyor...",
          unlink: "Bağlantıyı Kaldır",
          kycLabel: "KYC"
        }
      : {
          title: "TON Wallet Connection",
          body: "Connect your wallet to manage balances and payout operations directly.",
          connected: "Wallet Connected",
          verified: "Verified",
          disconnected: "Wallet Not Connected",
          connectHint: "Click the button below to connect your TON wallet.",
          addressLabel: "Address",
          chainLabel: "Chain",
          verifyHint: "Click the button below to verify your wallet. The process is automatic.",
          verifyingHint: "Wallet verification in progress...",
          verifiedHint: "Wallet verified successfully. Payout and premium features unlocked.",
          disconnect: "Disconnect",
          verify: "Verify Wallet",
          verifying: "Verifying...",
          unlink: "Unlink Wallet",
          kycLabel: "KYC"
        };

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "-";

  const isVerified = props.walletVerified || verifyStep === "done";
  const isVerifying = props.walletAutoVerifyLoading || verifyStep === "verifying";

  return (
    <section className="akrMiniPanel akrTonWalletPanel">
      <h4>{copy.title}</h4>
      <p className="akrMuted akrMiniPanelBody">{copy.body}</p>

      <div className="akrTonConnectRow">
        <TonConnectButton />
      </div>

      {wallet ? (
        <>
          <div className="akrChipRow">
            <span className={`akrChip ${isVerified ? "akrChipSuccess" : "akrChipInfo"}`}>
              {isVerified ? copy.verified : copy.connected}
            </span>
            <span className="akrChip">{copy.chainLabel}: TON</span>
            <span className="akrChip">{copy.addressLabel}: {shortAddress}</span>
            {props.walletKycStatus && props.walletKycStatus !== "unknown" ? (
              <span className="akrChip">{copy.kycLabel}: {props.walletKycStatus}</span>
            ) : null}
          </div>
          <p className="akrMuted">
            {isVerified
              ? copy.verifiedHint
              : isVerifying
              ? copy.verifyingHint
              : verifyStep === "error"
              ? verifyError
              : copy.verifyHint}
          </p>
          {verifyStep === "error" && verifyError && (
            <p style={{ color: "#ff4444", fontSize: 11, margin: "4px 0" }}>{verifyError}</p>
          )}
          <div className="akrActionRow">
            {!isVerified ? (
              <button
                type="button"
                className="akrBtn akrBtnAccent"
                disabled={isVerifying}
                onClick={handleVerifyClick}
              >
                {isVerifying ? copy.verifying : verifyStep === "error" ? (props.lang === "tr" ? "Tekrar Dene" : "Retry") : copy.verify}
              </button>
            ) : (
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                disabled={props.walletUnlinkLoading}
                onClick={props.onWalletUnlink}
              >
                {copy.unlink}
              </button>
            )}
            <button
              type="button"
              className="akrBtn akrBtnGhost"
              onClick={handleDisconnect}
            >
              {copy.disconnect}
            </button>
          </div>
        </>
      ) : (
        <div className="akrChipRow">
          <span className="akrChip">{copy.disconnected}</span>
          <span className="akrMuted">{copy.connectHint}</span>
        </div>
      )}
    </section>
  );
}
