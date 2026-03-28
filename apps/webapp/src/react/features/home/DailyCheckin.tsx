import { useState, useCallback, useEffect, useRef } from "react";
import { getJson, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";
import type { Lang } from "../../i18n";

type ConfettiP = { x:number;y:number;vx:number;vy:number;life:number;maxLife:number;r:number;g:number;b:number;rot:number;w:number;h:number };

/** Canvas confetti celebration — plays once then stops */
function ConfettiBurst({ mega }: { mega?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d"); if(!ctx) return;
    const W=c.width, H=c.height;
    let alive=true;
    const ps:ConfettiP[]=[];
    const colors:Array<[number,number,number]>=[[255,215,0],[0,214,255],[224,64,251],[0,255,136],[255,100,50]];
    const count=mega?65:35;
    for(let i=0;i<count;i++){
      const [r,g,b]=colors[i%colors.length];
      const angle=-Math.PI/2+((Math.random()-0.5)*Math.PI*0.8);
      const spd=3+Math.random()*(mega?8:5);
      ps.push({x:W/2+(Math.random()-0.5)*60,y:H*0.85,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,life:50+Math.random()*40,maxLife:90,r,g,b,rot:Math.random()*Math.PI*2,w:3+Math.random()*4,h:2+Math.random()*2});
    }
    const draw=()=>{
      if(!alive)return;
      ctx.clearRect(0,0,W,H);
      for(const p of ps){
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.rot+=0.05; p.life--;
        const a=Math.min(1,p.life/30);
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${a})`;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        ctx.restore();
      }
      ps.splice(0,ps.length,...ps.filter(p=>p.life>0));
      if(ps.length>0) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    return()=>{alive=false;};
  },[mega]);
  return <canvas ref={ref} width={260} height={120} style={{display:"block",width:"100%",pointerEvents:"none",position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)"}} />;
}

type CalendarDay = {
  date: string;
  claimed: boolean;
  day_of_streak: number | null;
  reward_sc: number;
  reward_hc: number;
  is_today: boolean;
};

type DailyData = {
  claimed_today: boolean;
  current_streak: number;
  next_reward: { day: number; sc: number; hc: number };
  calendar: CalendarDay[];
};

type DailyCheckinProps = {
  lang: Lang;
  auth?: WebAppAuth | null;
};

function authParams(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

export function DailyCheckin({ lang, auth }: DailyCheckinProps) {
  const isTr = lang === "tr";
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [reward, setReward] = useState<{ sc: number; hc: number; streak: number; mega: boolean } | null>(null);
  const [showReward, setShowReward] = useState(false);
  const sparkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const a = authParams(auth);
      const resp = await getJson<{ success: boolean; data: DailyData }>(
        `/webapp/api/v2/player/daily?${new URLSearchParams({ uid: a.uid, ts: a.ts, sig: a.sig })}`
      );
      if (resp.success && resp.data) {
        setData(resp.data);
        setClaimed(resp.data.claimed_today);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (sparkRef.current) clearTimeout(sparkRef.current); }, []);

  const handleClaim = useCallback(async () => {
    if (claiming || claimed || !data) return;
    setClaiming(true);
    try {
      const a = authParams(auth);
      const resp = await postJson<{
        success: boolean;
        data: { claimed: boolean; day_of_streak: number; reward_sc: number; reward_hc: number; is_mega: boolean };
        error?: string;
      }>("/webapp/api/v2/player/daily/claim", a);

      if (resp.success && resp.data?.claimed) {
        const r = resp.data;
        setReward({ sc: r.reward_sc, hc: r.reward_hc, streak: r.day_of_streak, mega: r.is_mega });
        setShowReward(true);
        setClaimed(true);
        sparkRef.current = setTimeout(() => setShowReward(false), 3500);
        await load();
      }
    } catch {
      // silent
    } finally {
      setClaiming(false);
    }
  }, [claiming, claimed, data, auth, load]);

  if (loading) {
    return (
      <div className="akrCard" style={{ padding: "12px", opacity: 0.4 }}>
        <div style={{ fontSize: 11 }}>{isTr ? "Günlük ödül yükleniyor..." : "Loading daily reward..."}</div>
      </div>
    );
  }

  if (!data) return null;

  const streak = data.current_streak;
  const nextReward = data.next_reward;
  const streakColor = streak >= 7 ? "#ffd700" : streak >= 4 ? "#e040fb" : streak >= 2 ? "#00d2ff" : "#00ff88";

  return (
    <div className="akrCard" style={{ borderLeft: "3px solid #ffd700", padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 12px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd700" }}>
            🗓️ {isTr ? "Günlük Giriş Ödülü" : "Daily Check-in"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1 }}>
            {isTr ? "Her gün giriş yap, ödülleri büyüt" : "Log in daily, grow your rewards"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: streakColor, fontFamily: "monospace" }}>
            🔥 {streak}
          </div>
          <div style={{ fontSize: 9, opacity: 0.4 }}>{isTr ? "seri" : "streak"}</div>
        </div>
      </div>

      {/* 7-day calendar */}
      <div style={{ padding: "0 12px 8px", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {data.calendar.map((day) => {
          const isToday = day.is_today;
          const bg = day.claimed
            ? "rgba(255,215,0,0.12)"
            : isToday
            ? "rgba(255,255,255,0.07)"
            : "rgba(255,255,255,0.02)";
          const border = day.claimed
            ? "1px solid rgba(255,215,0,0.4)"
            : isToday
            ? "1px solid rgba(255,255,255,0.2)"
            : "1px solid rgba(255,255,255,0.06)";
          const dayLabel = new Date(day.date).toLocaleDateString(isTr ? "tr-TR" : "en-US", { weekday: "narrow" });

          return (
            <div key={day.date} style={{
              background: bg,
              border,
              borderRadius: 8,
              padding: "6px 2px",
              textAlign: "center",
              position: "relative",
              boxShadow: isToday && !day.claimed ? "0 0 8px rgba(255,215,0,0.2)" : undefined
            }}>
              <div style={{ fontSize: 8, opacity: 0.45, marginBottom: 2 }}>{dayLabel}</div>
              {day.claimed ? (
                <div style={{ fontSize: 14 }}>✅</div>
              ) : isToday ? (
                <div style={{ fontSize: 14 }}>🎁</div>
              ) : (
                <div style={{ fontSize: 14, opacity: 0.25 }}>·</div>
              )}
              <div style={{ fontSize: 7, marginTop: 2, color: day.claimed ? "#ffd700" : "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                {day.reward_sc > 0 ? `${day.reward_sc >= 1000 ? `${day.reward_sc/1000}k` : day.reward_sc}` : "·"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reward preview / claim button */}
      {!claimed ? (
        <div style={{ padding: "0 12px 10px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {nextReward.sc > 0 && (
              <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 6, color: "#ffd700", fontFamily: "monospace" }}>
                +{nextReward.sc} SC
              </span>
            )}
            {nextReward.hc > 0 && (
              <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(0,210,255,0.1)", border: "1px solid rgba(0,210,255,0.25)", borderRadius: 6, color: "#00d2ff", fontFamily: "monospace" }}>
                +{nextReward.hc} HC
              </span>
            )}
            <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, opacity: 0.6 }}>
              {isTr ? `Gün ${streak + 1}` : `Day ${streak + 1}`}
              {(streak + 1) % 7 === 0 ? " 🏆" : ""}
            </span>
          </div>
          <button
            className="akrBtn akrBtnAccent"
            onClick={handleClaim}
            disabled={claiming}
            style={{ width: "100%", fontSize: 13, fontWeight: 700, opacity: claiming ? 0.6 : 1 }}
          >
            {claiming
              ? (isTr ? "İşleniyor..." : "Claiming...")
              : (isTr ? "🎁 Bugünkü Ödülü Al" : "🎁 Claim Today's Reward")}
          </button>
        </div>
      ) : (
        <div style={{ padding: "0 12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#00ff88", fontWeight: 600 }}>
            ✅ {isTr ? "Bugünkü ödül toplandı!" : "Today's reward claimed!"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>
            {isTr ? "Yarın yeni ödül gelecek" : "Come back tomorrow for more"}
          </div>
        </div>
      )}

      {/* Reward pop animation */}
      {showReward && reward && (
        <div style={{
          position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
          background: reward.mega ? "linear-gradient(135deg,#ffd700,#ff8800)" : "rgba(20,20,30,0.97)",
          border: reward.mega ? "2px solid #ffd700" : "1px solid rgba(0,255,136,0.4)",
          borderRadius: 16, padding: "18px 28px", zIndex: 9999,
          textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          animation: "fadeInDown 0.3s ease", overflow: "visible"
        }}>
          <div style={{ position: "relative" }}><ConfettiBurst mega={reward.mega} /></div>
          <div style={{ fontSize: reward.mega ? 32 : 24, marginBottom: 6 }}>
            {reward.mega ? "🏆" : "🎁"}
          </div>
          <div style={{ fontSize: reward.mega ? 14 : 12, fontWeight: 700, color: reward.mega ? "#1a1a2e" : "#ffd700", marginBottom: 4 }}>
            {reward.mega
              ? (isTr ? "MEGA ÖDÜL! 7. GÜN!" : "MEGA REWARD! DAY 7!")
              : (isTr ? "Ödül Toplandı!" : "Reward Claimed!")}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {reward.sc > 0 && (
              <span style={{ fontSize: 13, fontWeight: 800, color: reward.mega ? "#1a1a2e" : "#ffd700", fontFamily: "monospace" }}>
                +{reward.sc} SC
              </span>
            )}
            {reward.hc > 0 && (
              <span style={{ fontSize: 13, fontWeight: 800, color: reward.mega ? "#1a1a2e" : "#00d2ff", fontFamily: "monospace" }}>
                +{reward.hc} HC
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, marginTop: 6, opacity: reward.mega ? 0.7 : 0.5, color: reward.mega ? "#1a1a2e" : undefined }}>
            {isTr ? `🔥 ${reward.streak} günlük seri!` : `🔥 ${reward.streak}-day streak!`}
          </div>
        </div>
      )}
    </div>
  );
}
