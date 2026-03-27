import { useState, useCallback, useEffect } from "react";
import { getJson, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";
import type { Lang } from "../../i18n";

type TournamentEntry = {
  seed: number | null;
  bracket_slot: number | null;
  final_rank: number | null;
  reward_sc: number;
  reward_hc: number;
  eliminated_at: string | null;
  display_name: string;
  kingdom_tier: number;
};

type Tournament = {
  id: number;
  tournament_key: string;
  title_tr: string;
  title_en: string;
  status: "upcoming" | "registration" | "active" | "completed" | "cancelled";
  bracket_size: number;
  starts_at: string;
  ends_at: string;
  prize_pool_sc: number;
  prize_pool_hc: number;
  entry_count: number;
  user_joined: boolean;
};

type TournamentBracketProps = {
  lang: Lang;
  auth?: WebAppAuth | null;
};

function authParams(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

function formatDate(iso: string, isTr: boolean): string {
  const d = new Date(iso);
  return d.toLocaleDateString(isTr ? "tr-TR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status: Tournament["status"], isTr: boolean): { text: string; color: string } {
  switch (status) {
    case "registration": return { text: isTr ? "Kayıt Açık" : "Open", color: "#00ff88" };
    case "active":       return { text: isTr ? "Aktif" : "Live", color: "#e040fb" };
    case "upcoming":     return { text: isTr ? "Yakında" : "Soon", color: "#ffd700" };
    case "completed":    return { text: isTr ? "Bitti" : "Done", color: "rgba(255,255,255,0.3)" };
    default:             return { text: status, color: "rgba(255,255,255,0.3)" };
  }
}

export function TournamentBracket({ lang, auth }: TournamentBracketProps) {
  const isTr = lang === "tr";
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [entries, setEntries] = useState<TournamentEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinResult, setJoinResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const a = authParams(auth);
      const resp = await getJson<{ success: boolean; data: { tournaments: Tournament[] } }>(
        `/webapp/api/v2/season/tournaments?${new URLSearchParams({ uid: a.uid, ts: a.ts, sig: a.sig })}`
      );
      if (resp.success && resp.data?.tournaments) {
        setTournaments(resp.data.tournaments);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (key: string) => {
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    setExpanded(key);
    setDetailLoading(true);
    try {
      const a = authParams(auth);
      const resp = await getJson<{ success: boolean; data: { entries: TournamentEntry[] } }>(
        `/webapp/api/v2/season/tournaments/${key}?${new URLSearchParams({ uid: a.uid, ts: a.ts, sig: a.sig })}`
      );
      if (resp.success && resp.data?.entries) {
        setEntries(resp.data.entries);
      }
    } catch {
      setEntries([]);
    } finally {
      setDetailLoading(false);
    }
  }, [expanded, auth]);

  const joinTournament = useCallback(async (key: string) => {
    setJoining(key);
    setJoinResult(null);
    try {
      const a = authParams(auth);
      const resp = await postJson<{
        success: boolean;
        data?: { joined?: boolean; already_joined?: boolean };
        error?: string;
      }>(`/webapp/api/v2/season/tournaments/${key}/join`, a);

      if (resp.success) {
        const msg = resp.data?.already_joined
          ? (isTr ? "Zaten kayıtlısın!" : "Already registered!")
          : (isTr ? "Turnuvaya katıldın!" : "Joined the tournament!");
        setJoinResult({ ok: true, msg });
        await load();
      } else {
        const errMap: Record<string, string> = {
          registration_closed: isTr ? "Kayıt kapalı" : "Registration closed",
          bracket_full:        isTr ? "Kontenjan dolu" : "Bracket full",
        };
        setJoinResult({ ok: false, msg: errMap[resp.error || ""] || (isTr ? "Katılım başarısız" : "Join failed") });
      }
    } catch {
      setJoinResult({ ok: false, msg: isTr ? "Bağlantı hatası" : "Connection error" });
    } finally {
      setJoining(null);
    }
  }, [auth, isTr, load]);

  if (loading) {
    return (
      <div className="akrCard" style={{ padding: "12px", opacity: 0.4 }}>
        <div style={{ fontSize: 11 }}>{isTr ? "Turnuvalar yükleniyor..." : "Loading tournaments..."}</div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="akrCard" style={{ borderLeft: "3px solid #e040fb", padding: "12px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e040fb", marginBottom: 4 }}>
          🏆 {isTr ? "Turnuvalar" : "Tournaments"}
        </div>
        <div style={{ fontSize: 11, opacity: 0.5 }}>
          {isTr ? "Şu an aktif turnuva yok. Yakında!" : "No active tournaments. Stay tuned!"}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Section header */}
      <div className="akrCard" style={{ marginBottom: 6, padding: "8px 12px", borderLeft: "3px solid #e040fb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e040fb" }}>
              🏆 {isTr ? "Turnuvalar" : "Tournaments"}
            </div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>
              {isTr ? "Kayıt ol · Sıralamaya gir · Ödül kazan" : "Register · Climb the bracket · Win prizes"}
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#e040fb", fontFamily: "monospace" }}>
            {tournaments.length}
          </div>
        </div>
      </div>

      {/* Join result toast */}
      {joinResult && (
        <div style={{
          margin: "4px 0 8px", padding: "8px 12px", borderRadius: 10,
          background: joinResult.ok ? "rgba(0,255,136,0.12)" : "rgba(255,68,68,0.12)",
          border: `1px solid ${joinResult.ok ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)"}`,
          fontSize: 12, color: joinResult.ok ? "#00ff88" : "#ff4444", fontWeight: 600
        }}>
          {joinResult.ok ? "✅" : "❌"} {joinResult.msg}
        </div>
      )}

      {/* Tournament cards */}
      {tournaments.map((t) => {
        const sl = statusLabel(t.status, isTr);
        const isOpen = t.status === "registration" || t.status === "upcoming";
        const fillPct = Math.round((t.entry_count / t.bracket_size) * 100);
        const isExpanded = expanded === t.tournament_key;

        return (
          <div key={t.id} className="akrCard" style={{ borderLeft: `3px solid ${sl.color}`, marginBottom: 6, padding: 0, overflow: "hidden" }}>
            {/* Header row */}
            <div
              style={{ padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              onClick={() => loadDetail(t.tournament_key)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sl.color,
                    background: `${sl.color}18`, padding: "1px 6px", borderRadius: 4 }}>
                    {sl.text}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isTr ? t.title_tr : t.title_en}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* Fill bar */}
                  <div style={{ width: 60, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${fillPct}%`, background: sl.color, borderRadius: 2, transition: "width 0.4s" }} />
                  </div>
                  <span style={{ fontSize: 9, opacity: 0.5, fontFamily: "monospace" }}>
                    {t.entry_count}/{t.bracket_size}
                  </span>
                  <span style={{ fontSize: 9, opacity: 0.4 }}>
                    {formatDate(t.starts_at, isTr)}
                  </span>
                </div>
              </div>
              {/* Prize pool */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#ffd700", fontFamily: "monospace" }}>
                  {t.prize_pool_sc.toLocaleString()} SC
                </div>
                {t.prize_pool_hc > 0 && (
                  <div style={{ fontSize: 9, color: "#00d2ff", fontFamily: "monospace" }}>
                    +{t.prize_pool_hc} HC
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, opacity: 0.4, flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</span>
            </div>

            {/* Expanded: participant list + join button */}
            {isExpanded && (
              <div style={{ borderTop: `1px solid ${sl.color}22`, padding: "8px 12px 10px" }}>
                {/* Join button */}
                {isOpen && !t.user_joined && (
                  <button
                    className="akrBtn akrBtnAccent"
                    onClick={(e) => { e.stopPropagation(); joinTournament(t.tournament_key); }}
                    disabled={joining === t.tournament_key || t.entry_count >= t.bracket_size}
                    style={{ width: "100%", fontSize: 12, fontWeight: 700, marginBottom: 10,
                      opacity: (joining === t.tournament_key || t.entry_count >= t.bracket_size) ? 0.5 : 1 }}
                  >
                    {joining === t.tournament_key
                      ? (isTr ? "Kaydediliyor..." : "Registering...")
                      : t.entry_count >= t.bracket_size
                      ? (isTr ? "Kontenjan Dolu" : "Bracket Full")
                      : (isTr ? "🏆 Turnuvaya Katıl" : "🏆 Join Tournament")}
                  </button>
                )}
                {t.user_joined && (
                  <div style={{ textAlign: "center", fontSize: 11, color: "#00ff88", fontWeight: 700, marginBottom: 10 }}>
                    ✅ {isTr ? "Kayıtlısın!" : "You're registered!"}
                  </div>
                )}

                {/* Participant list */}
                <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", marginBottom: 6 }}>
                  {isTr ? "Katılımcılar" : "Participants"} ({t.entry_count})
                </div>
                {detailLoading ? (
                  <div style={{ textAlign: "center", fontSize: 11, opacity: 0.4, padding: 8 }}>
                    {isTr ? "Yükleniyor..." : "Loading..."}
                  </div>
                ) : entries.length > 0 ? (
                  entries.slice(0, 8).map((e, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "4px 0", borderBottom: i < Math.min(entries.length, 8) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 10, width: 20, textAlign: "center",
                          color: i < 3 ? ["#ffd700","#c0c0c0","#cd7f32"][i] : "rgba(255,255,255,0.3)",
                          fontWeight: 700
                        }}>
                          {i < 3 ? ["🥇","🥈","🥉"][i] : `${i+1}`}
                        </span>
                        <span style={{ fontSize: 11 }}>{e.display_name}</span>
                        <span style={{ fontSize: 9, opacity: 0.4 }}>T{e.kingdom_tier}</span>
                      </div>
                      {e.eliminated_at && (
                        <span style={{ fontSize: 9, opacity: 0.4 }}>✗</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", fontSize: 11, opacity: 0.4, padding: 8 }}>
                    {isTr ? "Henüz katılımcı yok" : "No participants yet"}
                  </div>
                )}

                {/* Prize breakdown */}
                <div style={{ marginTop: 10, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", marginBottom: 4 }}>
                    {isTr ? "Ödül Dağılımı" : "Prize Split"}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["🥇","50%"], ["🥈","30%"], ["🥉","20%"]].map(([medal, pct]) => (
                      <div key={medal} style={{ flex: 1, textAlign: "center", background: "rgba(255,215,0,0.05)", borderRadius: 6, padding: "4px 0" }}>
                        <div style={{ fontSize: 14 }}>{medal}</div>
                        <div style={{ fontSize: 9, color: "#ffd700", fontFamily: "monospace" }}>{pct}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
