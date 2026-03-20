/**
 * Blueprint: Global app state via Zustand
 * Holds bootstrap data, balances, wallet state, locale, progression
 */
import { create } from 'zustand';
import type { BootstrapResponse, CurrencyBalance, BootstrapSession, ProgressionSnapshot } from '@airdropkralbot/contracts';

interface WalletState {
  linked: boolean;
  chain: string | null;
  address: string | null;
}

const initialProgression: ProgressionSnapshot = {
  streak_days: 0,
  streak_multiplier: 1.0,
  daily_tasks_completed: 0,
  daily_tasks_total: 5,
  season_id: 1,
  season_day: 1,
  season_days_left: 30,
  season_points: 0,
  season_rank: null,
  tier_progress_pct: 0,
  next_tier: 1,
  active_anomaly: null,
  next_best_moves: [],
};

interface AppState {
  // Bootstrap
  bootstrapped: boolean;
  apiVersion: string | null;
  userId: number | null;
  telegramId: number | null;
  username: string | null;
  kingdomTier: number;
  locale: 'tr' | 'en';

  // Session — HMAC auth for API calls
  session: BootstrapSession | null;

  // Raw bootstrap payload for pages that need full data
  bootstrapData: BootstrapResponse | null;

  // Economy — Blueprint: unified currency model
  balances: CurrencyBalance;

  // Wallet — Blueprint: TON primary
  wallet: WalletState;

  // Progression — Blueprint: streak, season, tasks, tier
  progression: ProgressionSnapshot;

  // Monetization
  passActive: boolean;

  // Runtime
  runtimeFlags: Record<string, boolean>;

  // Actions
  setBootstrap: (data: BootstrapResponse) => void;
  setSession: (session: BootstrapSession) => void;
  setBootstrapData: (data: BootstrapResponse) => void;
  setLocale: (locale: 'tr' | 'en') => void;
  setBalances: (balances: Partial<CurrencyBalance>) => void;
  setWallet: (wallet: Partial<WalletState>) => void;
  setProgression: (progression: Partial<ProgressionSnapshot>) => void;
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
  session: null,
  bootstrapData: null,
  balances: { ...initialBalances },
  wallet: { ...initialWallet },
  progression: { ...initialProgression },
  passActive: false,
  runtimeFlags: {},

  setSession: (session) => set({ session }),
  setBootstrapData: (data) => set({ bootstrapData: data }),

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
      progression: data.progression ?? { ...initialProgression },
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

  setProgression: (partial) =>
    set((state) => ({
      progression: { ...state.progression, ...partial },
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
      session: null,
      bootstrapData: null,
      balances: { ...initialBalances },
      wallet: { ...initialWallet },
      progression: { ...initialProgression },
      passActive: false,
      runtimeFlags: {},
    }),
}));
