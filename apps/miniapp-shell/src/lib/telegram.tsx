'use client';

import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

// Blueprint: Telegram WebApp SDK types
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    text: string;
    isVisible: boolean;
    isActive: boolean;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    setParams: (params: { color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

interface TelegramContext {
  webApp: TelegramWebApp | null;
  user: TelegramWebApp['initDataUnsafe']['user'] | null;
  initData: string;
  startParam: string | null;
  isReady: boolean;
  /** Blueprint: locale precedence — stored override > Telegram > profile > region > TR */
  locale: 'tr' | 'en';
}

const TelegramCtx = createContext<TelegramContext>({
  webApp: null,
  user: null,
  initData: '',
  startParam: null,
  isReady: false,
  locale: 'tr',
});

export function useTelegram() {
  return useContext(TelegramCtx);
}

export function TelegramProvider({ children }: { children: React.ReactNode }): any {
  const [ctx, setCtx] = useState<TelegramContext>({
    webApp: null,
    user: null,
    initData: '',
    startParam: null,
    isReady: false,
    locale: 'tr',
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      // Not inside Telegram — dev mode
      setCtx((prev) => ({ ...prev, isReady: true }));
      return;
    }

    tg.ready();
    tg.expand();

    // Blueprint: locale precedence
    const langCode = tg.initDataUnsafe.user?.language_code ?? '';
    const locale = langCode.startsWith('en') ? 'en' : 'tr';

    setCtx({
      webApp: tg,
      user: tg.initDataUnsafe.user ?? null,
      initData: tg.initData,
      startParam: tg.initDataUnsafe.start_param ?? null,
      isReady: true,
      locale,
    });
  }, []);

  return createElement(TelegramCtx.Provider, { value: ctx }, children) as any;
}
