import { useCallback, useEffect, useRef } from "react";
import { TonConnectButton, useTonAddress, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { t, type Lang } from "../../i18n";

type TonWalletConnectProps = {
  lang: Lang;
  onWalletConnected: (chain: string, address: string) => void;
  onWalletDisconnected: () => void;
  walletChallengeLoading: boolean;
  walletVerifyLoading: boolean;
  onWalletChallenge: () => void;
  onWalletVerify: () => void;
};

export function TonWalletConnect(props: TonWalletConnectProps) {
  const wallet = useTonWallet();
  const address = useTonAddress(false);
  const [tonConnectUI] = useTonConnectUI();
  const prevAddressRef = useRef<string>("");

  const { onWalletConnected, onWalletDisconnected } = props;

  useEffect(() => {
    if (address && address !== prevAddressRef.current) {
      prevAddressRef.current = address;
      onWalletConnected("TON", address);
    }
    if (!address && prevAddressRef.current) {
      prevAddressRef.current = "";
      onWalletDisconnected();
    }
  }, [address, onWalletConnected, onWalletDisconnected]);

  const handleDisconnect = useCallback(async () => {
    try {
      await tonConnectUI.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }, [tonConnectUI]);

  const copy =
    props.lang === "tr"
      ? {
          title: "TON Cuzdan Baglantisi",
          body: "Cuzdanini bagla, bakiye ve payout islemlerini dogrudan cuzdan uzerinden yonet.",
          connected: "Cuzdan Bagli",
          disconnected: "Cuzdan Bagli Degil",
          connectHint: "Asagidaki butona tiklayarak TON cuzdanini bagla.",
          addressLabel: "Adres",
          chainLabel: "Zincir",
          verifyHint: "Cuzdan baglantisini dogrulamak icin challenge ve verify islemlerini tamamla.",
          disconnect: "Baglantıyi Kes"
        }
      : {
          title: "TON Wallet Connection",
          body: "Connect your wallet to manage balances and payout operations directly.",
          connected: "Wallet Connected",
          disconnected: "Wallet Not Connected",
          connectHint: "Click the button below to connect your TON wallet.",
          addressLabel: "Address",
          chainLabel: "Chain",
          verifyHint: "Complete challenge and verify steps to confirm the wallet link.",
          disconnect: "Disconnect"
        };

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "-";

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
            <span className="akrChip akrChipInfo">{copy.connected}</span>
            <span className="akrChip">{copy.chainLabel}: TON</span>
            <span className="akrChip">{copy.addressLabel}: {shortAddress}</span>
          </div>
          <p className="akrMuted">{copy.verifyHint}</p>
          <div className="akrActionRow">
            <button
              type="button"
              className="akrBtn akrBtnGhost"
              disabled={props.walletChallengeLoading}
              onClick={props.onWalletChallenge}
            >
              {t(props.lang, "vault_wallet_challenge")}
            </button>
            <button
              type="button"
              className="akrBtn akrBtnAccent"
              disabled={props.walletVerifyLoading}
              onClick={props.onWalletVerify}
            >
              {t(props.lang, "vault_wallet_verify")}
            </button>
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
