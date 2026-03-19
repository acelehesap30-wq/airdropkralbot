'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

/**
 * Blueprint: MainButton mirrors only one next-best action.
 * Shows context-aware CTA based on current route and game state.
 * Hides on /settings and /admin pages.
 */

/** Route-specific theme colors for the MainButton */
const ROUTE_COLORS: Record<string, string> = {
  '/hub':      '#00d2ff', // cyan — central hub
  '/missions': '#ff4444', // red — mission quarter
  '/forge':    '#ffd700', // gold — loot forge
  '/exchange': '#e040fb', // purple — exchange district
  '/season':   '#ffd700', // gold — season hall
  '/vault':    '#00ff88', // green — secure vault
  '/arena':    '#ff4444', // red — elite arena
};

const ROUTE_TEXT_COLORS: Record<string, string> = {
  '/hub':      '#ffffff',
  '/missions': '#ffffff',
  '/forge':    '#000000',
  '/exchange': '#ffffff',
  '/season':   '#000000',
  '/vault':    '#000000',
  '/arena':    '#ffffff',
};

interface MainButtonAction {
  text: string;
  color: string;
  textColor: string;
  route: string;
}

/** Hidden routes — MainButton is not shown on these */
const HIDDEN_ROUTES = ['/settings', '/admin'];

/**
 * Resolves the next-best-action for the MainButton given the
 * current pathname and the global app / game state.
 */
function resolveAction(
  pathname: string,
  state: {
    runtimeFlags: Record<string, boolean>;
    balances: { payout_available?: number };
    bootstrapData: unknown;
  },
): MainButtonAction | null {
  // Hide on settings & admin
  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;

  const color = ROUTE_COLORS[pathname] ?? '#00d2ff';
  const textColor = ROUTE_TEXT_COLORS[pathname] ?? '#ffffff';

  switch (pathname) {
    case '/':
    case '/hub': {
      // If there's a loot reveal pending (runtime flag), prioritise that
      const revealPending = state.runtimeFlags['loot_reveal_pending'] === true;
      return {
        text: revealPending ? 'Open Loot' : 'Start Mission',
        color,
        textColor,
        route: revealPending ? '/forge' : '/missions',
      };
    }

    case '/missions': {
      // If any mission is currently active, show "Complete Task"; otherwise "Accept Mission"
      const hasActive = state.runtimeFlags['mission_active'] === true;
      return {
        text: hasActive ? 'Complete Task' : 'Accept Mission',
        color,
        textColor,
        route: '/missions', // stays on page — the page handles the action
      };
    }

    case '/forge': {
      // If the user has pending boxes, "Open Box"; otherwise "Fuse Items"
      const hasBoxes = state.runtimeFlags['boxes_available'] === true;
      return {
        text: hasBoxes ? 'Open Box' : 'Fuse Items',
        color,
        textColor,
        route: '/forge',
      };
    }

    case '/exchange':
      return { text: 'Trade Now', color, textColor, route: '/exchange' };

    case '/season':
      return { text: 'View Rewards', color, textColor, route: '/season' };

    case '/vault': {
      const eligible = (state.balances.payout_available ?? 0) > 0;
      return {
        text: eligible ? 'Request Payout' : 'Request Payout',
        color,
        textColor,
        route: '/vault',
      };
    }

    case '/arena':
      return { text: 'Find Match', color, textColor, route: '/arena' };

    default:
      return null;
  }
}

export function useMainButton(pathname: string) {
  const { webApp } = useTelegram();
  const router = useRouter();
  const { runtimeFlags, balances, bootstrapData } = useAppStore();

  // Keep the handler ref stable so we can properly offClick
  const handlerRef = useRef<(() => void) | null>(null);

  const action = resolveAction(pathname, { runtimeFlags, balances, bootstrapData });

  const handleClick = useCallback(() => {
    if (!action) return;

    // Haptic feedback on CTA press
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    } catch {
      // noop outside Telegram
    }

    router.push(action.route);
  }, [action, router]);

  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return;

    const mb = webApp?.MainButton;
    if (!mb) return;

    // Remove previous handler if any
    if (handlerRef.current) {
      mb.offClick(handlerRef.current);
      handlerRef.current = null;
    }

    if (!action) {
      mb.hide();
      return;
    }

    // Configure the button — setText + setParams for color theming
    mb.setText(action.text);
    mb.setParams({
      color: action.color,
      text_color: action.textColor,
    });
    mb.enable();
    mb.show();

    // Attach click handler
    handlerRef.current = handleClick;
    mb.onClick(handleClick);

    return () => {
      if (handlerRef.current) {
        mb.offClick(handlerRef.current);
        handlerRef.current = null;
      }
      mb.hide();
    };
  }, [webApp, action, handleClick]);
}
