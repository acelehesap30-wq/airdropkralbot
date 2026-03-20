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
  const [verifyStep, setVerifyStep] = useState<"idle" | "verifying" | "done" | "error">("idle");

  const { onWalletConnected, onWalletDisconnected } = props;

  useEffect(() => {
    if (address && address !== prevAddressRef.current) {
      prevAddressRef.current = address;
      onWalletConnected("TON", address);
    }
    if (!address && prevAddressRef.current) {
      prevAddressRef.current = "";
      setVerifyStep("idle");
      onWalletDisconnected();
    }
  }, [address, onWalletConnected, onWalletDisconnected]);

  useEffect(() => {
    if (props.walletVerified) setVerifyStep("done");
  }, [props.walletVerified]);

  const handleDisconnect = useCallback(async () => {
    try {
      await tonConnectUI.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }, [tonConnectUI]);

  const handleVerifyClick = useCallback(() => {
    setVerifyStep("verifying");
    props.onWalletAutoVerify();
  }, [props.onWalletAutoVerify]);

  const copy =
    props.lang === "tr"
      ? {
          title: "TON Cuzdan Baglantisi",
          body: "Cuzdanini bagla, bakiye ve payout islemlerini dogrudan cuzdan uzerinden yonet.",
          connected: "Cuzdan Bagli",
          verified: "Dogrulanmis",
          disconnected: "Cuzdan Bagli Degil",
          connectHint: "Asagidaki butona tiklayarak TON cuzdanini bagla.",
          addressLabel: "Adres",
          chainLabel: "Zincir",
          verifyHint: "Cuzdani dogrulamak icin asagidaki butona tikla. Islem otomatik tamamlanacak.",
          verifyingHint: "Cuzdan dogrulamasi devam ediyor...",
          verifiedHint: "Cuzdan basariyla dogrulandi. Payout ve premium ozellikler acik.",
          disconnect: "Baglantıyi Kes",
          verify: "Cuzdani Dogrula",
          verifying: "Dogrulaniyor...",
          unlink: "Baglantıyı Kaldır",
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
            {isVerified ? copy.verifiedHint : isVerifying ? copy.verifyingHint : copy.verifyHint}
          </p>
          <div className="akrActionRow">
            {!isVerified ? (
              <button
                type="button"
                className="akrBtn akrBtnAccent"
                disabled={isVerifying}
                onClick={handleVerifyClick}
              >
                {isVerifying ? copy.verifying : copy.verify}
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
