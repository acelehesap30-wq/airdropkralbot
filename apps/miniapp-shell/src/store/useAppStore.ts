/**
 * Blueprint: Global app state via Zustand
 * Holds bootstrap data, balances, wallet state, locale
 */
import { create } from 'zustand';
import type { CurrencyBalance, BootstrapResponse } from '@airdropkralbot/contracts';

interface WalletState {
  linked: boolean;
  chain: string | null;
  address: string | null;
}

interface AppState {
  // Bootstrap
  bootstrapped: boolean;
  apiVersion: string | null;
  userId: number | null;
  telegramId: number | null;
  username: string | null;
  kingdomTier: number;
  locale: 'tr' | 'en';

  // Economy — Blueprint: unified currency model
  balances: CurrencyBalance;

  // Wallet — Blueprint: TON primary
  wallet: WalletState;

  // Monetization
  passActive: boolean;

  // Runtime
  runtimeFlags: Record<string, boolean>;

  // Actions
  setBootstrap: (data: BootstrapResponse) => void;
  setLocale: (locale: 'tr' | 'en') => void;
  setBalances: (balances: Partial<CurrencyBalance>) => void;
  setWallet: (wallet: Partial<WalletState>) => void;
  reset: () => void;
}

const initialBalances: CurrencyBalance = {
  sc: 0,
  hc: 0,
  rc: 0,
  nxt: 0,
  payout_available: 0,
};

const initialWallet: WalletState = {
  linked: false,
  chain: null,
  address: null,
};

export const useAppStore = create<AppState>((set) => ({
  bootstrapped: false,
  apiVersion: null,
  userId: null,
  telegramId: null,
  username: null,
  kingdomTier: 0,
  locale: 'tr',
  balances: { ...initialBalances },
  wallet: { ...initialWallet },
  passActive: false,
  runtimeFlags: {},

  setBootstrap: (data) =>
    set({
      bootstrapped: true,
      apiVersion: data.api_version,
      userId: data.user?.id ?? null,
      telegramId: data.user?.telegram_id ?? null,
      username: data.user?.username ?? null,
      kingdomTier: data.user?.kingdom_tier ?? 0,
      locale: (data.user?.locale as 'tr' | 'en') ?? 'tr',
      balances: data.balances ?? { ...initialBalances },
      wallet: data.wallet_session
        ? {
            linked: data.wallet_session.linked,
            chain: data.wallet_session.chain,
            address: data.wallet_session.address,
          }
        : { ...initialWallet },
      passActive: data.monetization?.pass_active ?? false,
      runtimeFlags: data.runtime_flags_effective ?? {},
    }),

  setLocale: (locale) => set({ locale }),

  setBalances: (partial) =>
    set((state) => ({
      balances: { ...state.balances, ...partial },
    })),

  setWallet: (partial) =>
    set((state) => ({
      wallet: { ...state.wallet, ...partial },
    })),

  reset: () =>
    set({
      bootstrapped: false,
      apiVersion: null,
      userId: null,
      telegramId: null,
      username: null,
      kingdomTier: 0,
      locale: 'tr',
      balances: { ...initialBalances },
      wallet: { ...initialWallet },
      passActive: false,
      runtimeFlags: {},
    }),
}));
