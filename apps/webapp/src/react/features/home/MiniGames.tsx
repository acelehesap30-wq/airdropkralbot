import { useState, useCallback, useRef, useEffect } from "react";
import { t, type Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";

type MiniGamesProps = {
  lang: Lang;
  auth?: WebAppAuth | null;
  sc: number;
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

// ─── PLASMA CORE TAP BLITZ ────────────────────────
type PlasmaRing = { id:number; r:number; alpha:number; color:string };
type PlasmaSpark = { x:number; y:number; vx:number; vy:number; life:number; color:string };

function TapBlitz({ lang, auth }: { lang: Lang; auth?: WebAppAuth | null }) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [reward, setReward] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef({ taps:0, rings:[] as PlasmaRing[], sparks:[] as PlasmaSpark[], nextId:0, phase:"idle" });

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2;
    const COLORS = ["#e040fb","#00d6ff","#ff6090","#ffd700","#00ff88"];

    const draw = () => {
      if (!alive) return;
      ctx.clearRect(0,0,W,H);

      // Dark BG
      ctx.fillStyle = "#080012";
      ctx.fillRect(0,0,W,H);

      const st = stateRef.current;
      const t = Date.now()*0.001;

      // Core intensity grows with taps
      const intensity = Math.min(1, st.taps/80);
      const coreSize = 28 + intensity*20;

      // Outer glow rings (ambient)
      for (let i=3;i>=0;i--) {
        const r2 = coreSize*(1.8+i*0.7);
        const pulse = Math.sin(t*2+i)*0.5+0.5;
        ctx.beginPath();
        ctx.arc(cx,cy,r2,0,Math.PI*2);
        ctx.strokeStyle=`rgba(224,64,251,${(0.06-i*0.01)*pulse*(0.4+intensity*0.6)})`;
        ctx.lineWidth=3-i*0.5;
        ctx.stroke();
      }

      // Energy rings (on tap)
      for (const ring of st.rings) {
        ring.r += 3; ring.alpha -= 0.04;
        if (ring.alpha>0) {
          ctx.beginPath();
          ctx.arc(cx,cy,ring.r,0,Math.PI*2);
          ctx.strokeStyle = ring.color.replace("rgb","rgba").replace(")",`,${ring.alpha})`);
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      st.rings = st.rings.filter(r=>r.alpha>0);

      // Sparks
      for (const sp of st.sparks) {
        sp.x+=sp.vx; sp.y+=sp.vy; sp.vy+=0.15; sp.life-=0.05;
        if (sp.life>0) {
          ctx.beginPath();
          ctx.arc(sp.x,sp.y,2*sp.life,0,Math.PI*2);
          ctx.fillStyle=sp.color.replace("rgb","rgba").replace(")",`,${sp.life})`);
          ctx.fill();
        }
      }
      st.sparks = st.sparks.filter(s=>s.life>0);

      // Core plasma
      const coreGrad = ctx.createRadialGradient(cx,cy,0,cx,cy,coreSize);
      const c1 = intensity>0.6 ? "#ffd700" : intensity>0.3 ? "#e040fb" : "#6020a0";
      const c2 = intensity>0.6 ? "#ff4400" : intensity>0.3 ? "#00d6ff" : "#2000ff";
      coreGrad.addColorStop(0,c1);
      coreGrad.addColorStop(0.5,c2);
      coreGrad.addColorStop(1,"transparent");
      ctx.shadowBlur = 40*(0.3+intensity);
      ctx.shadowColor = c1;
      ctx.beginPath();
      ctx.arc(cx,cy,coreSize,0,Math.PI*2);
      ctx.fillStyle=coreGrad;
      ctx.fill();
      ctx.shadowBlur=0;

      // Tap count text
      if (st.phase==="playing") {
        ctx.fillStyle="rgba(255,255,255,0.9)";
        ctx.font=`bold ${28+intensity*12}px monospace`;
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillText(String(st.taps), cx, cy);
      }

      // Orbiting particles
      for (let i=0;i<4;i++) {
        const angle = t*1.5 + i*(Math.PI/2) + intensity*t;
        const orbitR = coreSize*1.6+intensity*10;
        const ox=cx+Math.cos(angle)*orbitR, oy=cy+Math.sin(angle)*orbitR;
        ctx.beginPath(); ctx.arc(ox,oy,2+intensity*2,0,Math.PI*2);
        ctx.fillStyle=COLORS[i]; ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return ()=>{ alive=false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const tapCore = useCallback(() => {
    const st = stateRef.current;
    if (st.phase!=="playing") return;
    st.taps++;
    setTaps(st.taps);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx=canvas.width/2, cy=canvas.height/2;
    const COLORS = ["#e040fb","#00d6ff","#ff6090","#ffd700","#00ff88"];
    const col = COLORS[st.taps%COLORS.length];
    st.rings.push({id:st.nextId++, r:30, alpha:0.8, color:col});
    for (let i=0;i<6;i++) {
      const a=Math.random()*Math.PI*2, spd=2+Math.random()*3;
      st.sparks.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-1,life:1,color:col});
    }
  }, []);

  const startGame = useCallback(() => {
    const st = stateRef.current;
    st.taps=0; st.rings=[]; st.sparks=[]; st.phase="playing";
    setPhase("playing"); setTaps(0); setTimeLeft(10); setReward(null);
    timerRef.current = setInterval(()=>{
      setTimeLeft(prev=>{
        if (prev<=1) {
          if (timerRef.current) clearInterval(timerRef.current);
          stateRef.current.phase="done";
          setPhase("done");
          const earned = stateRef.current.taps*2;
          setReward(earned);
          const a=authFields(auth);
          postJson("/webapp/api/v2/player/action",{...a,
            action_key:"game_tap_blitz",
            action_request_id:buildActionRequestId("game_tap_blitz"),
            payload:{taps:stateRef.current.taps,reward_sc:earned}
          }).catch(()=>{});
          return 0;
        }
        return prev-1;
      });
    },1000);
  },[auth]);

  useEffect(()=>()=>{if(timerRef.current)clearInterval(timerRef.current);},[]);

  const tapRank = taps>=80?(isTr?"Efsane":"Legend"):taps>=60?(isTr?"Hızlı":"Fast"):taps>=40?(isTr?"İyi":"Good"):taps>=20?(isTr?"Normal":"Normal"):(isTr?"Yavaş":"Slow");

  return (
    <div className="akrCard" style={{borderLeft:"3px solid #e040fb",padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 12px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#e040fb"}}>⚡ {isTr?"Plazma Çekirdeği":"Plasma Core"}</div>
          <div style={{fontSize:10,opacity:0.5}}>{isTr?"10s·Çekirdeği patlat":"10s · Detonate the core"}</div>
        </div>
        {phase==="playing"&&<span style={{fontSize:12,color:timeLeft<=3?"#ff4444":"#e040fb",fontFamily:"monospace",fontWeight:700}}>{timeLeft}s</span>}
        {phase==="done"&&<span style={{fontSize:12,color:"#ffd700",fontFamily:"monospace"}}>+{reward} SC</span>}
      </div>

      {/* Canvas always visible */}
      <div style={{position:"relative",cursor:phase==="playing"?"pointer":"default"}} onClick={phase==="playing"?tapCore:undefined}>
        <canvas ref={canvasRef} width={340} height={130} style={{display:"block",width:"100%"}}/>
        {phase==="idle"&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <button onClick={e=>{e.stopPropagation();startGame();}} style={{background:"linear-gradient(135deg,#e040fb,#7c00ff)",color:"#fff",border:"none",borderRadius:10,padding:"10px 28px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 0 20px rgba(224,64,251,0.4)"}}>
              {isTr?"BAŞLAT":"LAUNCH"}
            </button>
          </div>
        )}
        {phase==="done"&&(
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(8,0,18,0.7)"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#e040fb",fontFamily:"monospace"}}>{taps} {isTr?"vuruş":"hits"} · {tapRank}</div>
            <button onClick={e=>{e.stopPropagation();stateRef.current.phase="idle";setPhase("idle");setTaps(0);setReward(null);}} style={{marginTop:8,background:"rgba(224,64,251,0.15)",border:"1px solid rgba(224,64,251,0.4)",color:"#e040fb",borderRadius:8,padding:"6px 20px",fontSize:12,cursor:"pointer"}}>
              {isTr?"Tekrar":"Replay"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COIN FLIP (Canvas 3D) ─────────────────────────
type CoinParticle = { x:number; y:number; vx:number; vy:number; life:number; r:number; g:number; b:number };

function CoinFlip({ lang, auth, sc }: { lang: Lang; auth?: WebAppAuth | null; sc: number }) {
  const isTr = lang === "tr";
  const [bet, setBet] = useState(50);
  const [choice, setChoice] = useState<"heads" | "tails" | null>(null);
  const [phase, setPhase] = useState<"idle" | "flipping" | "done">("idle");
  const [flipResult, setFlipResult] = useState<{ side: "heads"|"tails"; won: boolean; amount: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const stRef = useRef({
    phase: "idle" as "idle"|"flipping"|"done",
    angle: 0, startTime: 0, duration: 1800,
    targetFace: "heads" as "heads"|"tails",
    face: "heads" as "heads"|"tails",
    choice: null as "heads"|"tails"|null,
    particles: [] as CoinParticle[],
    resultTriggered: false,
    onDone: null as ((side:"heads"|"tails",won:boolean,amount:number)=>void) | null
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2 + 4;
    const R = 40;

    const draw = () => {
      if (!alive) return;
      const st = stRef.current;
      const now = Date.now();

      ctx.fillStyle = "#080012";
      ctx.fillRect(0,0,W,H);

      // Starfield ambient
      const t = now * 0.0007;
      for (let i=0;i<8;i++) {
        const sx = (Math.sin(i*2.1+t)*0.5+0.5)*W;
        const sy = (Math.cos(i*1.7+t)*0.5+0.5)*H;
        ctx.beginPath(); ctx.arc(sx,sy,0.8,0,Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${0.2+0.1*Math.sin(i+t*2)})`;
        ctx.fill();
      }

      // Compute coin Y-rotation angle
      let scaleX = 1;
      if (st.phase === "flipping") {
        const elapsed = now - st.startTime;
        const p = Math.min(1, elapsed / st.duration);
        const eased = 1 - Math.pow(1-p, 3);
        const totalDeg = eased * (st.targetFace === "heads" ? 720 : 900); // land on correct face
        st.angle = totalDeg;
        scaleX = Math.cos((totalDeg * Math.PI) / 180);
        if (p >= 1 && !st.resultTriggered) {
          st.resultTriggered = true;
          st.phase = "done";
          st.face = st.targetFace;
          scaleX = 1;
          // Particles
          const won = st.targetFace === st.choice;
          const pr = won?0:255, pg = won?255:68, pb = won?136:68;
          for (let i=0;i<24;i++) {
            const a = Math.random()*Math.PI*2, spd = 2+Math.random()*5;
            st.particles.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,life:1,r:pr,g:pg,b:pb});
          }
          if (st.onDone) st.onDone(st.targetFace, won, won ? Math.floor(0) : 0);
        }
      } else if (st.phase === "idle") {
        scaleX = Math.cos(now * 0.001);
      }

      const absScale = Math.max(0.01, Math.abs(scaleX));
      const isHeads = scaleX >= 0;
      const faceNow = st.phase === "done" ? st.face : (st.phase === "idle" ? "heads" : (isHeads ? "heads" : "tails"));

      // Coin shadow
      ctx.beginPath();
      ctx.ellipse(cx, cy+R+6, R*absScale*0.85, 8, 0, 0, Math.PI*2);
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();

      // Coin glow
      ctx.save();
      ctx.shadowBlur = 28 + 10*Math.sin(t*2);
      ctx.shadowColor = faceNow==="heads" ? "#ffd700" : "#9b4dff";

      const grad = ctx.createLinearGradient(cx-R*absScale, cy-R, cx+R*absScale, cy+R);
      if (faceNow==="heads") {
        grad.addColorStop(0,"#7a4d00"); grad.addColorStop(0.35,"#FFD700");
        grad.addColorStop(0.65,"#FFF5A0"); grad.addColorStop(1,"#7a4d00");
      } else {
        grad.addColorStop(0,"#3b0082"); grad.addColorStop(0.35,"#9b4dff");
        grad.addColorStop(0.65,"#c8a0ff"); grad.addColorStop(1,"#3b0082");
      }
      ctx.beginPath();
      ctx.ellipse(cx, cy, R*absScale, R, 0, 0, Math.PI*2);
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = faceNow==="heads" ? "rgba(255,215,0,0.6)" : "rgba(155,77,255,0.6)";
      ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();

      // Edge highlights (ridged coin effect)
      for (let ring=1;ring<=2;ring++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, (R-ring*4)*absScale, R-ring*4, 0, 0, Math.PI*2);
        ctx.strokeStyle = faceNow==="heads" ? `rgba(255,215,0,${0.2-ring*0.06})` : `rgba(155,77,255,${0.2-ring*0.06})`;
        ctx.lineWidth = 0.8; ctx.stroke();
      }

      // Face symbol
      if (absScale > 0.18) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(absScale, 1);
        ctx.font = `bold ${Math.floor(16*Math.min(1,absScale))}px monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = faceNow==="heads" ? "rgba(60,30,0,0.85)" : "rgba(20,0,50,0.85)";
        ctx.fillText(faceNow==="heads"?(isTr?"YAZI":"HEAD"):(isTr?"TURA":"TAIL"), 0, 0);
        ctx.restore();
      }

      // Particles
      for (const p of st.particles) {
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; p.life-=0.035;
        if (p.life>0) {
          ctx.beginPath(); ctx.arc(p.x,p.y,3*p.life,0,Math.PI*2);
          ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${p.life})`; ctx.fill();
        }
      }
      st.particles = st.particles.filter(p=>p.life>0);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { alive=false; cancelAnimationFrame(rafRef.current); };
  }, [isTr]);

  const flip = useCallback(async () => {
    const st = stRef.current;
    if (!choice || st.phase==="flipping" || sc<bet) return;
    setPhase("flipping"); setFlipResult(null);
    st.phase="flipping"; st.startTime=Date.now(); st.duration=1800;
    st.resultTriggered=false; st.particles=[]; st.choice=choice;

    let resolvedSide: "heads"|"tails" = Math.random()>0.5?"heads":"tails";
    let resolvedWon = false, resolvedAmount = 0;

    try {
      const a = authFields(auth);
      const resp = await postJson<any>("/webapp/api/v2/player/action", {
        ...a, action_key:"game_coin_flip",
        action_request_id:buildActionRequestId("game_coin_flip"),
        payload:{bet_sc:bet,choice}
      });
      if (resp.success && resp.data) {
        resolvedSide = resp.data.result_side || resolvedSide;
        resolvedWon = !!resp.data.won;
        resolvedAmount = Number(resp.data.reward_sc || 0);
      } else {
        resolvedSide = Math.random()>0.5?"heads":"tails";
        resolvedWon = resolvedSide===choice;
        resolvedAmount = resolvedWon ? Math.floor(bet*1.8) : 0;
      }
    } catch {
      resolvedSide = Math.random()>0.5?"heads":"tails";
      resolvedWon = resolvedSide===choice;
      resolvedAmount = resolvedWon ? Math.floor(bet*1.8) : 0;
    }

    // Update particle color now that we know result
    st.targetFace = resolvedSide;
    st.onDone = () => {
      setFlipResult({ side:resolvedSide, won:resolvedWon, amount:resolvedAmount });
      setPhase("done");
    };
  }, [choice, bet, sc, auth]);

  return (
    <div className="akrCard" style={{borderLeft:"3px solid #ffd700",padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 12px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#ffd700"}}>🪙 {isTr?"Yazı Tura":"Coin Flip"}</div>
          <div style={{fontSize:10,opacity:0.5}}>{isTr?"SC bahis koy · x1.8 ödül":"Bet SC · x1.8 reward"}</div>
        </div>
        {flipResult && (
          <span style={{fontSize:13,fontWeight:800,color:flipResult.won?"#00ff88":"#ff4444",fontFamily:"monospace"}}>
            {flipResult.won?`+${flipResult.amount}`:`-${bet}`} SC
          </span>
        )}
      </div>

      <canvas ref={canvasRef} width={340} height={120} style={{display:"block",width:"100%"}} />

      <div style={{padding:"6px 12px 12px"}}>
        <div style={{display:"flex",gap:6,marginBottom:8,justifyContent:"center"}}>
          {[10,25,50,100].map(v=>(
            <button key={v} className="akrBtn akrBtnSm" onClick={()=>setBet(v)}
              style={{opacity:bet===v?1:0.4,border:bet===v?"1px solid #ffd700":"1px solid transparent",fontSize:10}}>
              {v} SC
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button className="akrBtn" onClick={()=>setChoice("heads")}
            style={{flex:1,fontSize:12,fontWeight:600,background:choice==="heads"?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.03)",border:choice==="heads"?"1px solid #ffd700":"1px solid rgba(255,255,255,0.08)",borderRadius:8}}>
            👑 {isTr?"Yazı":"Heads"}
          </button>
          <button className="akrBtn" onClick={()=>setChoice("tails")}
            style={{flex:1,fontSize:12,fontWeight:600,background:choice==="tails"?"rgba(155,77,255,0.15)":"rgba(255,255,255,0.03)",border:choice==="tails"?"1px solid #9b4dff":"1px solid rgba(255,255,255,0.08)",borderRadius:8}}>
            🔢 {isTr?"Tura":"Tails"}
          </button>
        </div>
        <button className="akrBtn akrBtnAccent" onClick={flip}
          disabled={!choice||phase==="flipping"||sc<bet}
          style={{width:"100%",opacity:(!choice||phase==="flipping"||sc<bet)?0.4:1}}>
          {phase==="flipping"?(isTr?"Uçuyor...":"Flipping..."):sc<bet?(isTr?"Yetersiz SC":"Not enough SC"):(isTr?`${bet} SC Bahis`:`Flip ${bet} SC`)}
        </button>
      </div>
    </div>
  );
}

// ─── DAILY SPIN (Canvas wheel) ─────────────────────
const WHEEL_PRIZES = [
  { label: "10 SC",   value: 10,  color: "#00ff88", weight: 30 },
  { label: "25 SC",   value: 25,  color: "#00d2ff", weight: 25 },
  { label: "50 SC",   value: 50,  color: "#e040fb", weight: 15 },
  { label: "1 HC",    value: 100, color: "#ffd700", weight: 10 },
  { label: "100 SC",  value: 100, color: "#ff8800", weight: 8  },
  { label: "x2 SC",   value: 200, color: "#ff4444", weight: 5  },
  { label: "3 HC",    value: 300, color: "#00ffaa", weight: 4  },
  { label: "500 SC",  value: 500, color: "#ff00ff", weight: 3  },
];

type WheelParticle = { x:number; y:number; vx:number; vy:number; life:number; r:number; g:number; b:number };

function DailySpin({ lang, auth }: { lang: Lang; auth?: WebAppAuth | null }) {
  const isTr = lang === "tr";
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; value: number; color: string } | null>(null);
  const [canSpin, setCanSpin] = useState(() => {
    const lastSpin = localStorage.getItem("akr_daily_spin_ts");
    if (!lastSpin) return true;
    return Date.now() - Number(lastSpin) > 86400000;
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const wsRef = useRef({
    rot: 0,        // current rotation (rad)
    velocity: 0,   // rad/frame
    spinning: false,
    particles: [] as WheelParticle[],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2 + 4;
    const R = Math.min(W,H)*0.41;
    const N = WHEEL_PRIZES.length;
    const seg = (Math.PI*2)/N;

    const draw = () => {
      if (!alive) return;
      const ws = wsRef.current;
      const t = Date.now()*0.001;

      // Physics
      if (ws.spinning) {
        ws.velocity *= 0.976;
        ws.rot += ws.velocity;
        if (ws.velocity < 0.003) {
          ws.velocity = 0; ws.spinning = false;
        }
      }

      ctx.fillStyle = "#050010";
      ctx.fillRect(0,0,W,H);

      // Outer pulse halo
      const haloGrad = ctx.createRadialGradient(cx,cy,R*0.7,cx,cy,R*1.15);
      haloGrad.addColorStop(0,"rgba(0,0,0,0)");
      haloGrad.addColorStop(0.7,`rgba(60,0,120,${0.06+0.04*Math.sin(t*1.8)})`);
      haloGrad.addColorStop(1,"rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx,cy,R*1.15,0,Math.PI*2);
      ctx.fillStyle=haloGrad; ctx.fill();

      // Sectors
      for (let i=0;i<N;i++) {
        const s = ws.rot + i*seg - Math.PI/2;
        const e = s + seg;
        const mid = s + seg/2;
        const prize = WHEEL_PRIZES[i];

        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.arc(cx,cy,R,s,e);
        ctx.closePath();

        const gx = cx + Math.cos(mid)*R*0.55;
        const gy = cy + Math.sin(mid)*R*0.55;
        const grd = ctx.createRadialGradient(gx,gy,0,cx,cy,R);
        grd.addColorStop(0, prize.color+"55");
        grd.addColorStop(0.7, prize.color+"18");
        grd.addColorStop(1, prize.color+"06");
        ctx.fillStyle = grd; ctx.fill();
        ctx.strokeStyle = prize.color+"30"; ctx.lineWidth=1; ctx.stroke();

        // Label
        const lr = R*0.63;
        const lx = cx + Math.cos(mid)*lr;
        const ly = cy + Math.sin(mid)*lr;
        ctx.save();
        ctx.translate(lx,ly); ctx.rotate(mid+Math.PI/2);
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = prize.color;
        ctx.shadowBlur=5; ctx.shadowColor=prize.color;
        ctx.fillText(prize.label, 0, 0);
        ctx.shadowBlur=0;
        ctx.restore();
      }

      // Outer ring with shimmer
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,255,255,${0.08+0.04*Math.sin(t*3)})`; ctx.lineWidth=2.5; ctx.stroke();

      // Center hub
      const hubGrd = ctx.createRadialGradient(cx,cy,0,cx,cy,R*0.17);
      hubGrd.addColorStop(0,"rgba(255,255,255,0.2)"); hubGrd.addColorStop(1,"rgba(0,0,0,0.6)");
      ctx.beginPath(); ctx.arc(cx,cy,R*0.17,0,Math.PI*2);
      ctx.fillStyle=hubGrd; ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=1.5; ctx.stroke();

      // Pointer (top)
      ctx.save();
      ctx.shadowBlur=14; ctx.shadowColor="#ffd700";
      ctx.beginPath();
      ctx.moveTo(cx, cy-R+2);
      ctx.lineTo(cx-9, cy-R+20);
      ctx.lineTo(cx+9, cy-R+20);
      ctx.closePath();
      ctx.fillStyle="#ffd700"; ctx.fill();
      ctx.restore();

      // Particles
      for (const p of ws.particles) {
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.12; p.life-=0.025;
        if (p.life>0) {
          ctx.beginPath(); ctx.arc(p.x,p.y,3.5*p.life,0,Math.PI*2);
          ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${p.life})`; ctx.fill();
        }
      }
      ws.particles = ws.particles.filter(p=>p.life>0);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return ()=>{ alive=false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const spin = useCallback(async () => {
    const ws = wsRef.current;
    if (ws.spinning || spinning || !canSpin) return;
    setSpinning(true); setResult(null);

    // Weighted random prize
    const total = WHEEL_PRIZES.reduce((s,p)=>s+p.weight, 0);
    let r = Math.random()*total, prizeIdx = 0;
    for (let i=0;i<WHEEL_PRIZES.length;i++) {
      r -= WHEEL_PRIZES[i].weight;
      if (r<=0) { prizeIdx=i; break; }
    }
    const prize = WHEEL_PRIZES[prizeIdx];

    // Launch physics spin
    ws.spinning = true;
    ws.velocity = 0.32 + Math.random()*0.12;

    // API
    try {
      const a = authFields(auth);
      await postJson("/webapp/api/v2/player/action", {
        ...a, action_key:"game_daily_spin",
        action_request_id:buildActionRequestId("game_daily_spin"),
        payload:{prize_label:prize.label, prize_value:prize.value}
      });
    } catch {}

    // Snap to prize + burst after ~4s
    setTimeout(() => {
      const N = WHEEL_PRIZES.length;
      const seg = (Math.PI*2)/N;
      ws.velocity = 0; ws.spinning = false;
      // Snap rotation so prize is at pointer (top)
      ws.rot = (-prizeIdx*seg - seg/2 + Math.PI/2 + Math.PI*2*5) % (Math.PI*2*100);

      // Particle burst
      const canvas = canvasRef.current;
      if (canvas) {
        const cx=canvas.width/2, cy=canvas.height/2+4;
        const hex = prize.color.replace("#","");
        const pr=parseInt(hex.slice(0,2),16), pg=parseInt(hex.slice(2,4),16), pb=parseInt(hex.slice(4,6),16);
        for (let i=0;i<32;i++) {
          const a=Math.random()*Math.PI*2, spd=2+Math.random()*6;
          ws.particles.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-3,life:1,r:pr,g:pg,b:pb});
        }
      }
      setResult(prize); setSpinning(false); setCanSpin(false);
      localStorage.setItem("akr_daily_spin_ts", String(Date.now()));
    }, 4200);
  }, [spinning, canSpin, auth]);

  return (
    <div className="akrCard" style={{borderLeft:"3px solid #00d2ff",padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 12px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#00d2ff"}}>🎰 {isTr?"Günlük Çark":"Daily Spin"}</div>
          <div style={{fontSize:10,opacity:0.5}}>{isTr?"Günde 1 çevirme hakkı · Şansını dene":"1 spin per day · Try your luck"}</div>
        </div>
        {result && <span style={{fontSize:14,fontWeight:800,color:result.color,fontFamily:"monospace"}}>🎉 {result.label}</span>}
      </div>

      <canvas ref={canvasRef} width={320} height={260} style={{display:"block",width:"100%"}} />

      <div style={{padding:"0 12px 12px"}}>
        <button className="akrBtn akrBtnAccent" onClick={spin}
          disabled={spinning||!canSpin}
          style={{width:"100%",opacity:(spinning||!canSpin)?0.4:1}}>
          {spinning?(isTr?"Dönüyor...":"Spinning..."):!canSpin?(isTr?"Yarın tekrar gel":"Come back tomorrow"):(isTr?"Çarkı Çevir":"Spin the Wheel")}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────
export function MiniGames(props: MiniGamesProps) {
  const isTr = props.lang === "tr";

  return (
    <div style={{ marginTop: 8 }}>
      <div className="akrCard akrCardGlow" style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🎮</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {isTr ? "Mini Oyunlar" : "Mini Games"}
            </div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>
              {isTr ? "Oyna, kazan, sıralamalarda yüksel" : "Play, earn, climb the leaderboards"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <TapBlitz lang={props.lang} auth={props.auth} />
        <CoinFlip lang={props.lang} auth={props.auth} sc={props.sc} />
        <DailySpin lang={props.lang} auth={props.auth} />
      </div>
    </div>
  );
}
