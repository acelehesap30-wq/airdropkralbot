import { useState, useCallback, useRef, useEffect } from "react";
import { buildActionRequestId, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";

type Props = { lang: "tr" | "en"; auth?: WebAppAuth | null; onClose: () => void };

type Token3D = {
  id: number; type: "SC"|"HC"|"RC"|"NXT"|"SCAM";
  x: number; y: number; z: number; // normalized 0-1
  vy: number; vz: number;
  r: number; g: number; b: number; label: string; pts: number;
  spin: number; spinV: number;
};

type Particle = { x:number; y:number; vx:number; vy:number; life:number; r:number; g:number; b:number; size:number };

const TCONF = {
  SC:   { r:255,g:215,b:0,   pts:5,  label:"SC" },
  HC:   { r:0,  g:200,b:255, pts:15, label:"HC" },
  RC:   { r:168,g:85, b:247, pts:25, label:"RC" },
  NXT:  { r:16, g:255,b:145, pts:50, label:"NXT" },
  SCAM: { r:255,g:60, b:80,  pts:-30,label:"SCAM" },
} as const;

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid:auth.uid, ts:auth.ts, sig:auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid:p.get("uid")||"", ts:p.get("ts")||String(Date.now()), sig:p.get("sig")||"" };
}

export function AirdropCatcher({ lang, auth, onClose }: Props) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle"|"playing"|"done">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [caught, setCaught] = useState({SC:0,HC:0,RC:0,NXT:0,SCAM:0});
  const [flashMsg, setFlashMsg] = useState<{text:string;color:string}|null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    phase:"idle", tokens:[] as Token3D[], particles:[] as Particle[],
    catcherX:0.5, score:0, combo:0, bestCombo:0, caught:{SC:0,HC:0,RC:0,NXT:0,SCAM:0},
    nextId:0, stars:[] as {x:number;y:number;b:number}[],
  });
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const rafRef   = useRef<number>(0);

  // Init stars
  useEffect(() => {
    const st = stateRef.current;
    st.stars = Array.from({length:60}).map(()=>({x:Math.random(),y:Math.random(),b:Math.random()}));
  }, []);

  const explode = useCallback((cx:number, cy:number, r:number, g:number, b:number, n=18) => {
    const st = stateRef.current;
    for (let i=0;i<n;i++) {
      const a = (i/n)*Math.PI*2;
      const spd = 1.5+Math.random()*3;
      st.particles.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-1,
        life:1,r,g,b,size:2+Math.random()*4});
    }
  }, []);

  const spawnToken = useCallback(() => {
    const st = stateRef.current;
    if (st.phase !== "playing") return;
    const types: Array<Token3D["type"]> = ["SC","SC","SC","HC","HC","RC","NXT","SCAM","SCAM"];
    const type = types[Math.floor(Math.random()*types.length)];
    const cfg = TCONF[type];
    st.tokens.push({
      id: st.nextId++, type,
      x: 0.05+Math.random()*0.9, y:-0.05, z:0.3+Math.random()*0.7,
      vy: 0.004+Math.random()*0.006, vz:0,
      r:cfg.r, g:cfg.g, b:cfg.b, label:cfg.label, pts:cfg.pts,
      spin:0, spinV:(Math.random()-0.5)*0.1,
    });
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    cancelAnimationFrame(rafRef.current);
  }, []);

  // Main canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;

    const draw = () => {
      if (!alive) return;
      const W = canvas.width, H = canvas.height;
      const st = stateRef.current;
      ctx.clearRect(0,0,W,H);

      // Background gradient
      const bg = ctx.createRadialGradient(W/2,H*0.4,0, W/2,H/2,W*0.8);
      bg.addColorStop(0,"rgba(8,15,40,1)");
      bg.addColorStop(1,"rgba(2,5,20,1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,W,H);

      // Stars
      for (const s of st.stars) {
        const pulse = 0.4+0.6*Math.abs(Math.sin(Date.now()*0.001*s.b*2));
        ctx.beginPath();
        ctx.arc(s.x*W, s.y*H, 0.8+s.b, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${0.2+s.b*0.4*pulse})`;
        ctx.fill();
      }

      // Scanlines
      for (let y=0; y<H; y+=4) {
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(0,y,W,2);
      }

      // Perspective grid floor
      ctx.save();
      ctx.strokeStyle = "rgba(0,200,255,0.08)";
      ctx.lineWidth = 0.5;
      const gH = H*0.15;
      const gy = H-gH;
      for (let i=0;i<=10;i++) {
        const x = (i/10)*W;
        ctx.beginPath(); ctx.moveTo(x,gy); ctx.lineTo(W/2,H); ctx.stroke();
      }
      for (let j=0;j<=4;j++) {
        const t2 = j/4;
        const y = gy + t2*(H-gy);
        const w = (1-t2*0.8)*W;
        ctx.beginPath(); ctx.moveTo((W-w)/2,y); ctx.lineTo((W+w)/2,y); ctx.stroke();
      }
      ctx.restore();

      // Tokens (3D perspective)
      const catcherY = H*0.88;
      const catchZone = 0.05;
      const toRemove = new Set<number>();

      for (const tok of st.tokens) {
        tok.y += tok.vy;
        tok.spin += tok.spinV;
        const perspective = 0.4+tok.z*0.6;
        const px = (tok.x-0.5)*perspective*W + W/2;
        const py = tok.y*H;
        const sz = 14*perspective + 4;

        // Check catch
        const catcherPx = st.catcherX*W;
        if (py >= catcherY-sz && py <= catcherY+sz*2 && Math.abs(px-catcherPx) < 55*perspective) {
          toRemove.add(tok.id);
          const pts = tok.pts;
          if (tok.type==="SCAM") {
            st.score += pts; st.combo=0;
            explode(px, py, 255,60,80, 20);
          } else {
            st.score = Math.max(0, st.score + Math.round(pts*(1+st.combo*0.1)));
            st.combo++;
            if (st.combo>st.bestCombo) st.bestCombo=st.combo;
            explode(px, py, tok.r, tok.g, tok.b, 15);
          }
          st.caught = {...st.caught, [tok.type]: st.caught[tok.type]+1};
          setScore(st.score); setCombo(st.combo); setBestCombo(st.bestCombo); setCaught({...st.caught});
          continue;
        }
        if (tok.y > 1.05) { toRemove.add(tok.id); continue; }

        // Draw token
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(tok.spin);
        ctx.shadowBlur = 20*perspective;
        ctx.shadowColor = `rgb(${tok.r},${tok.g},${tok.b})`;

        // Outer ring
        ctx.beginPath();
        ctx.arc(0,0,sz*1.3,0,Math.PI*2);
        ctx.strokeStyle = `rgba(${tok.r},${tok.g},${tok.b},${0.3*perspective})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner disk
        const grad = ctx.createRadialGradient(0,0,0, 0,0,sz);
        grad.addColorStop(0, `rgba(${tok.r},${tok.g},${tok.b},0.9)`);
        grad.addColorStop(1, `rgba(${tok.r},${tok.g},${tok.b},0.2)`);
        ctx.beginPath();
        ctx.arc(0,0,sz,0,Math.PI*2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Label
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(8,sz*0.7)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tok.label, 0, 0);
        ctx.restore();
      }
      st.tokens = st.tokens.filter(t=>!toRemove.has(t.id));

      // Particles
      for (const p of st.particles) {
        p.x += p.vx*0.4; p.y += p.vy*0.4; p.vy+=0.08; p.life-=0.04;
        if (p.life>0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.life})`;
          ctx.fill();
        }
      }
      st.particles = st.particles.filter(p=>p.life>0);

      // Catcher
      const cx = st.catcherX*W;
      ctx.save();
      ctx.shadowBlur = 25;
      ctx.shadowColor = "#00d6ff";
      // Catcher base bar
      const barW = 90, barH = 10;
      const catGrad = ctx.createLinearGradient(cx-barW/2, catcherY, cx+barW/2, catcherY);
      catGrad.addColorStop(0,"rgba(0,60,100,0.8)");
      catGrad.addColorStop(0.5,"rgba(0,214,255,0.9)");
      catGrad.addColorStop(1,"rgba(0,60,100,0.8)");
      ctx.fillStyle = catGrad;
      ctx.roundRect(cx-barW/2, catcherY-barH/2, barW, barH, 8);
      ctx.fill();
      // Catcher sides
      ctx.beginPath();
      ctx.moveTo(cx-barW/2,catcherY); ctx.lineTo(cx-barW/2-8,catcherY+24);
      ctx.moveTo(cx+barW/2,catcherY); ctx.lineTo(cx+barW/2+8,catcherY+24);
      ctx.strokeStyle="rgba(0,214,255,0.6)"; ctx.lineWidth=2; ctx.stroke();
      ctx.restore();

      // Scan beam from catcher
      const beamAlpha = 0.04 + 0.02*Math.sin(Date.now()*0.005);
      ctx.fillStyle = `rgba(0,214,255,${beamAlpha})`;
      ctx.beginPath();
      ctx.moveTo(cx-barW/2, catcherY);
      ctx.lineTo(cx+barW/2, catcherY);
      ctx.lineTo(cx+barW/2+20, 0);
      ctx.lineTo(cx-barW/2-20, 0);
      ctx.closePath();
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { alive=false; cancelAnimationFrame(rafRef.current); };
  }, [explode]);

  const handleMove = useCallback((e: React.TouchEvent|React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    stateRef.current.catcherX = Math.max(0.05, Math.min(0.95, (clientX-rect.left)/rect.width));
  }, []);

  const startGame = useCallback(() => {
    const st = stateRef.current;
    st.phase="playing"; st.score=0; st.combo=0; st.bestCombo=0; st.nextId=0;
    st.tokens=[]; st.particles=[];
    st.caught={SC:0,HC:0,RC:0,NXT:0,SCAM:0};
    setPhase("playing"); setScore(0); setTimeLeft(20); setCombo(0); setBestCombo(0);
    setCaught({SC:0,HC:0,RC:0,NXT:0,SCAM:0}); setFlashMsg(null);

    timerRef.current = setInterval(()=> {
      setTimeLeft(prev => {
        if (prev<=1) {
          cleanup(); stateRef.current.phase="done"; setPhase("done");
          const a=authFields(auth);
          const reward=Math.max(0,stateRef.current.score);
          postJson("/webapp/api/v2/player/action",{...a,
            action_key:"game_airdrop_catcher",
            action_request_id:buildActionRequestId("game_airdrop_catcher"),
            payload:{score:stateRef.current.score,reward_sc:reward,best_combo:stateRef.current.bestCombo,caught:stateRef.current.caught}
          }).catch(()=>{});
          return 0;
        }
        return prev-1;
      });
    }, 1000);
    spawnRef.current = setInterval(spawnToken, 700);
  }, [auth, cleanup, spawnToken]);

  useEffect(()=>()=>cleanup(),[cleanup]);

  const finalScore = stateRef.current.score;
  const finalBestCombo = stateRef.current.bestCombo;
  const finalCaught = stateRef.current.caught;

  return (
    <div style={{background:"rgba(2,8,25,0.98)",borderRadius:20,overflow:"hidden",border:"1px solid rgba(0,214,255,0.2)"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"rgba(0,214,255,0.05)",borderBottom:"1px solid rgba(0,214,255,0.1)"}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"#00d6ff",letterSpacing:1}}>
            ◈ {isTr?"NEXUS YAĞMURU":"NEXUS RAIN"}
          </div>
          <div style={{fontSize:10,color:"rgba(0,214,255,0.5)",marginTop:1}}>
            {isTr?"Token'ları yakala · SCAM'den kaç":"Catch tokens · Dodge SCAMs"}
          </div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"rgba(255,255,255,0.5)",width:28,height:28,cursor:"pointer",fontSize:14}}>✕</button>
      </div>

      {phase==="idle" && (
        <div style={{padding:"20px 16px",textAlign:"center"}}>
          {/* Token legend */}
          <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap",marginBottom:20}}>
            {(["SC","HC","RC","NXT","SCAM"] as const).map(type=>(
              <div key={type} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"4px 10px",border:`1px solid rgba(${TCONF[type].r},${TCONF[type].g},${TCONF[type].b},0.3)`}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:`rgb(${TCONF[type].r},${TCONF[type].g},${TCONF[type].b})`,boxShadow:`0 0 6px rgb(${TCONF[type].r},${TCONF[type].g},${TCONF[type].b})`}}/>
                <span style={{fontSize:11,color:`rgb(${TCONF[type].r},${TCONF[type].g},${TCONF[type].b})`,fontWeight:600}}>{type}</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{TCONF[type].pts>0?`+${TCONF[type].pts}`:TCONF[type].pts}</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:20,lineHeight:1.6}}>
            {isTr?"Parmağını kaydır · Combo yakalayarak çarpan kazan · SCAM sıfırlar":"Swipe to catch · Build combos for multiplier · SCAM resets combo"}
          </div>
          <button onClick={startGame} style={{
            background:"linear-gradient(135deg,#00d6ff,#0066ff)",color:"#fff",border:"none",
            borderRadius:12,padding:"13px 36px",fontSize:14,fontWeight:700,cursor:"pointer",
            boxShadow:"0 0 30px rgba(0,214,255,0.4)",letterSpacing:1
          }}>{isTr?"BAŞLAT — 20s":"LAUNCH — 20s"}</button>
        </div>
      )}

      {phase==="playing" && (
        <>
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 16px",background:"rgba(0,0,0,0.3)"}}>
            <span style={{fontSize:12,color:"#ff6060",fontWeight:700,fontFamily:"monospace"}}>⏱ {String(timeLeft).padStart(2,"0")}s</span>
            <span style={{fontSize:12,color:"#00d6ff",fontWeight:700,fontFamily:"monospace"}}>◈ {score}</span>
            <span style={{fontSize:12,color:combo>3?"#10ff90":"rgba(255,255,255,0.4)",fontWeight:700,fontFamily:"monospace"}}>⚡×{combo}</span>
          </div>
          <canvas
            ref={canvasRef} width={380} height={340}
            onTouchMove={handleMove} onMouseMove={handleMove}
            style={{display:"block",width:"100%",touchAction:"none"}}
          />
        </>
      )}

      {phase==="done" && (
        <div style={{padding:"24px 16px",textAlign:"center"}}>
          <div style={{fontSize:32,fontWeight:800,color:"#00d6ff",marginBottom:4,fontFamily:"monospace"}}>
            +{Math.max(0,finalScore)} SC
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:16}}>
            {isTr?"En iyi kombo":"Best combo"}: ×{finalBestCombo}
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap",marginBottom:20}}>
            {(["SC","HC","RC","NXT"] as const).filter(t=>finalCaught[t]>0).map(t=>(
              <span key={t} style={{fontSize:11,color:`rgb(${TCONF[t].r},${TCONF[t].g},${TCONF[t].b})`,background:"rgba(255,255,255,0.04)",borderRadius:6,padding:"3px 8px"}}>
                {t} ×{finalCaught[t]}
              </span>
            ))}
            {finalCaught.SCAM>0&&<span style={{fontSize:11,color:"#ff3c50",background:"rgba(255,60,80,0.1)",borderRadius:6,padding:"3px 8px"}}>SCAM ×{finalCaught.SCAM}</span>}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <button onClick={startGame} style={{background:"linear-gradient(135deg,#00d6ff,#0066ff)",color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              {isTr?"Tekrar":"Replay"}
            </button>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 24px",fontSize:13,cursor:"pointer"}}>
              {isTr?"Kapat":"Close"}
            </button>
          </div>
        </div>
      )}

      {/* Keep canvas mounted while playing for rAF */}
      {phase==="playing" && null}
    </div>
  );
}
