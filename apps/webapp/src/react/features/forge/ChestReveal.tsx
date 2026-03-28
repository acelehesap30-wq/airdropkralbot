import { useState, useCallback, useEffect, useRef } from "react";
import { getJson, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";
import type { Lang } from "../../i18n";

type FXParticle = { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; r:number; g:number; b:number; size:number };

/** Canvas particle celebration burst */
function ChestBurst({ color, mega }: { color: string; mega?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.width, H = c.height;
    let alive = true;
    const ps: FXParticle[] = [];
    // Parse hex color
    const m = /([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(color.replace("#",""));
    const [cr,cg,cb] = m ? [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)] : [255,215,0];
    const count = mega ? 55 : 30;
    for (let i = 0; i < count; i++) {
      const a = Math.random()*Math.PI*2;
      const spd = 1.5+Math.random()*(mega?7:5);
      ps.push({x:W/2,y:H*0.6,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2.5,life:30+Math.random()*30,maxLife:60,r:cr+Math.random()*40,g:cg+Math.random()*30,b:cb,size:2+Math.random()*2.5});
    }
    // Gold sparkles for all
    for (let i = 0; i < 15; i++) {
      const a = Math.random()*Math.PI*2;
      ps.push({x:W/2,y:H*0.6,vx:Math.cos(a)*(2+Math.random()*3),vy:Math.sin(a)*2-3,life:35+Math.random()*20,maxLife:55,r:255,g:255,b:200,size:1.5});
    }
    const draw = () => {
      if (!alive) return;
      ctx.clearRect(0,0,W,H);
      for (const p of ps) {
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.12; p.life--;
        const al = p.life/p.maxLife;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size*al+0.3,0,Math.PI*2);
        ctx.fillStyle=`rgba(${Math.min(255,p.r|0)},${Math.min(255,p.g|0)},${Math.min(255,p.b|0)},${al})`;
        ctx.fill();
      }
      ps.splice(0,ps.length,...ps.filter(p=>p.life>0));
      if (ps.length>0) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    return ()=>{alive=false;};
  },[color,mega]);
  return <canvas ref={ref} width={300} height={100} style={{display:"block",width:"100%",pointerEvents:"none"}} />;
}

type ChestDef = {
  type: "common" | "rare" | "epic";
  label_tr: string;
  label_en: string;
  desc_tr: string;
  desc_en: string;
  cost_sc: number;
  cost_hc: number;
  icon: string;
  color: string;
  ready: boolean;
  ready_in_ms: number;
  can_afford: boolean;
};

type ChestRevealProps = {
  lang: Lang;
  auth?: WebAppAuth | null;
};

function authParams(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

function fmtMs(ms: number, isTr: boolean): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return isTr ? `${h}s ${m}dk` : `${h}h ${m}m`;
  const s = Math.floor((ms % 60_000) / 1000);
  return isTr ? `${m}dk ${s}s` : `${m}m ${s}s`;
}

export function ChestReveal({ lang, auth }: ChestRevealProps) {
  const isTr = lang === "tr";
  const [chests, setChests] = useState<ChestDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{
    chest_type: string; reward_sc: number; reward_hc: number; reward_rc: number; label: string
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const a = authParams(auth);
      const resp = await getJson<{ success: boolean; data: { chests: ChestDef[] } }>(
        `/webapp/api/v2/forge/chests?${new URLSearchParams({ uid: a.uid, ts: a.ts, sig: a.sig })}`
      );
      if (resp.success && resp.data?.chests) {
        setChests(resp.data.chests);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
    // Tick every 30s to update cooldown labels
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  // Re-check cooldowns on tick
  useEffect(() => {
    if (tick > 0) load();
  }, [tick, load]);

  const openChest = useCallback(async (type: string) => {
    if (opening) return;
    setOpening(type);
    setReveal(null);
    setError(null);
    try {
      const a = authParams(auth);
      const resp = await postJson<{
        success: boolean;
        data?: { chest_type: string; reward_sc: number; reward_hc: number; reward_rc: number; reward_label: string };
        error?: string;
        ready_in_ms?: number;
      }>("/webapp/api/v2/forge/chests/open", { ...a, chest_type: type });

      if (resp.success && resp.data) {
        const d = resp.data;
        setReveal({
          chest_type: d.chest_type,
          reward_sc: d.reward_sc,
          reward_hc: d.reward_hc,
          reward_rc: d.reward_rc,
          label: d.reward_label
        });
        await load();
      } else {
        const errMap: Record<string, string> = {
          cooldown_active:   isTr ? "Henüz hazır değil!" : "Not ready yet!",
          insufficient_sc:   isTr ? "Yeterli SC yok" : "Not enough SC",
          insufficient_hc:   isTr ? "Yeterli HC yok" : "Not enough HC",
        };
        setError(errMap[resp.error || ""] || (isTr ? "Hata oluştu" : "Error occurred"));
      }
    } catch {
      setError(isTr ? "Bağlantı hatası" : "Connection error");
    } finally {
      setOpening(null);
    }
  }, [opening, auth, isTr, load]);

  if (loading) {
    return (
      <div className="akrCard" style={{ borderLeft: "3px solid #ffd700", padding: "12px", opacity: 0.4 }}>
        <div style={{ fontSize: 11 }}>{isTr ? "Sandıklar yükleniyor..." : "Loading chests..."}</div>
      </div>
    );
  }

  const chestColor = (type: string) =>
    type === "epic" ? "#e040fb" : type === "rare" ? "#00d2ff" : "#00ff88";

  return (
    <div>
      {/* Section header */}
      <div className="akrCard" style={{ marginBottom: 6, padding: "8px 12px", borderLeft: "3px solid #ffd700" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd700" }}>
          📦 {isTr ? "Sandık Açma" : "Chest Reveal"}
        </div>
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1 }}>
          {isTr ? "Seç · Aç · İçindekini keşfet" : "Pick · Open · Discover what's inside"}
        </div>
      </div>

      {/* Error flash */}
      {error && (
        <div style={{ margin: "0 0 8px", padding: "8px 12px", borderRadius: 10,
          background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.3)",
          fontSize: 12, color: "#ff4444", fontWeight: 600 }}>
          ❌ {error}
        </div>
      )}

      {/* Reveal celebration */}
      {reveal && (
        <div style={{
          margin: "0 0 8px", padding: "16px 12px", borderRadius: 12,
          background: `linear-gradient(135deg, ${chestColor(reveal.chest_type)}18, rgba(0,0,0,0.3))`,
          border: `2px solid ${chestColor(reveal.chest_type)}60`,
          textAlign: "center",
          animation: "none"
        }}>
          <ChestBurst color={chestColor(reveal.chest_type)} mega={reveal.chest_type === "epic"} />
          <div style={{ fontSize: 32, marginBottom: 6 }}>
            {reveal.chest_type === "epic" ? "🔮" : reveal.chest_type === "rare" ? "💠" : "📦"}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: chestColor(reveal.chest_type), marginBottom: 8 }}>
            {isTr ? "Sandık Açıldı!" : "Chest Opened!"} ✨
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {reveal.reward_sc > 0 && (
              <span style={{ fontSize: 13, fontWeight: 800, color: "#ffd700", fontFamily: "monospace",
                background: "rgba(255,215,0,0.12)", padding: "4px 10px", borderRadius: 8 }}>
                +{reveal.reward_sc} SC
              </span>
            )}
            {reveal.reward_hc > 0 && (
              <span style={{ fontSize: 13, fontWeight: 800, color: "#00d2ff", fontFamily: "monospace",
                background: "rgba(0,210,255,0.12)", padding: "4px 10px", borderRadius: 8 }}>
                +{reveal.reward_hc} HC
              </span>
            )}
            {reveal.reward_rc > 0 && (
              <span style={{ fontSize: 13, fontWeight: 800, color: "#e040fb", fontFamily: "monospace",
                background: "rgba(224,64,251,0.12)", padding: "4px 10px", borderRadius: 8 }}>
                +{reveal.reward_rc} RC
              </span>
            )}
          </div>
        </div>
      )}

      {/* Chest cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
        {chests.map((chest) => {
          const color = chest.color;
          const isOpening = opening === chest.type;
          const disabled = isOpening || !chest.ready || !chest.can_afford;

          return (
            <div key={chest.type} className="akrCard" style={{
              borderLeft: `3px solid ${color}`,
              opacity: (!chest.can_afford && chest.ready) ? 0.55 : 1
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Chest icon with animated glow when ready */}
                <div style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                  background: `${color}15`,
                  border: `2px solid ${chest.ready && chest.can_afford ? color : color + "40"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24,
                  boxShadow: chest.ready && chest.can_afford ? `0 0 16px ${color}40` : undefined
                }}>
                  {chest.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}>
                    {isTr ? chest.label_tr : chest.label_en}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.55, marginTop: 1 }}>
                    {isTr ? chest.desc_tr : chest.desc_en}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                    {chest.cost_sc > 0 && (
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 5,
                        background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)",
                        color: "#ffd700", fontFamily: "monospace" }}>
                        {chest.cost_sc} SC
                      </span>
                    )}
                    {chest.cost_hc > 0 && (
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 5,
                        background: "rgba(0,210,255,0.1)", border: "1px solid rgba(0,210,255,0.2)",
                        color: "#00d2ff", fontFamily: "monospace" }}>
                        {chest.cost_hc} HC
                      </span>
                    )}
                    {chest.cost_sc === 0 && chest.cost_hc === 0 && (
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 5,
                        background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)",
                        color: "#00ff88" }}>
                        {isTr ? "Ücretsiz" : "Free"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action column */}
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  {!chest.ready ? (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, opacity: 0.45, marginBottom: 3 }}>
                        {isTr ? "Hazır olma süresi" : "Ready in"}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: "monospace", color: "#ffd700" }}>
                        {fmtMs(chest.ready_in_ms, isTr)}
                      </div>
                    </div>
                  ) : (
                    <button
                      className="akrBtn akrBtnAccent"
                      onClick={() => openChest(chest.type)}
                      disabled={disabled}
                      style={{
                        fontSize: 11, fontWeight: 700, padding: "8px 14px",
                        opacity: disabled ? 0.5 : 1,
                        background: disabled ? undefined : `linear-gradient(135deg, ${color}, ${color}aa)`,
                        border: `1px solid ${color}`,
                        boxShadow: !disabled ? `0 0 12px ${color}40` : undefined
                      }}
                    >
                      {isOpening
                        ? (isTr ? "Açılıyor..." : "Opening...")
                        : !chest.can_afford
                        ? (isTr ? "Yetersiz" : "No funds")
                        : (isTr ? "🎁 Aç" : "🎁 Open")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
