import type { UiPreferencesPatch, UiPreferencesResponse, WebAppAuth } from "../types";
import { getJson, postJson, withAuthQuery } from "./common";
import { parseUiPreferencesResponse } from "../../core/contracts/v2Validators.js";

export async function fetchUiPreferencesV2(auth: WebAppAuth): Promise<UiPreferencesResponse> {
  const query = withAuthQuery(auth);
  const response = await getJson<UiPreferencesResponse>(`/webapp/api/v2/ui/preferences?${query}`);
  return parseUiPreferencesResponse(response) as UiPreferencesResponse;
}

export async function postUiPreferencesV2(auth: WebAppAuth, patch: UiPreferencesPatch): Promise<UiPreferencesResponse> {
  const response = await postJson<UiPreferencesResponse>("/webapp/api/v2/ui/preferences", {
    uid: auth.uid,
    ts: auth.ts,
    sig: auth.sig,
    ...patch
  });
  return parseUiPreferencesResponse(response) as UiPreferencesResponse;
}

export interface NotificationPreferencesResponse {
  success: boolean;
  session?: string;
  data?: {
    api_version: string;
    alert_families: string[];
    notification_preferences: Record<string, { enabled: boolean; muted_until: string | null }>;
  };
}

export async function fetchNotificationPreferencesV2(auth: WebAppAuth): Promise<NotificationPreferencesResponse> {
  const query = withAuthQuery(auth);
  return getJson<NotificationPreferencesResponse>(`/webapp/api/v2/notification/preferences?${query}`);
}

export async function postNotificationPreferencesV2(
  auth: WebAppAuth,
  updates: Record<string, boolean | { enabled: boolean }>
): Promise<NotificationPreferencesResponse> {
  return postJson<NotificationPreferencesResponse>("/webapp/api/v2/notification/preferences", {
    uid: auth.uid,
    ts: auth.ts,
    sig: auth.sig,
    updates
  });
}
