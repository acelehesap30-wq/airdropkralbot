import { useState, useCallback, useRef, useEffect } from "react";
import type { Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";

type Props = { lang: Lang };

type Target = {
  id: number; x: number; y: number; size: number;
  r:number; g:number; b:number;
  born: number; ttl: number; // ttl in ms
  phase: "appear"|"active"|"dying"; ringScale: number;
};

type HitFX = { id:number; x:number; y:number; t:number; r:number; g:number; b:number };

function authFields() {
  const p = new URLSearchParams(window.location.search);
  return { uid:p.get("uid")||"", ts:p.get("ts")||String(Date.now()), sig:p.get("sig")||"" };
}

const PALETTE = [
  [0,214,255],[0,255,136],[255,90,50],[224,64,251],[255,215,0]
] as [number,number,number][];

export function ArenaChallenge({ lang }: Props) {
  const isTr = lang==="tr";
  const [phase, setPhase] = useState<"idle"|"playing"|"done">("idle");
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [rewardSC, setRewardSC] = useState(0);
  const [combo, setCombo] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    phase:"idle", targets:[] as Target[], hitFX:[] as HitFX[],
    score:0, hits:0, combo:0, nextId:0, hexGrid:[] as {cx:number;cy:number}[],
  });
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const spawnRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const rafRef   = useRef<number>(0);

  // Build hex grid positions (cosmetic background)
  const buildHexGrid = useCallback((W:number, H:number) => {
    const cells: {cx:number;cy:number}[] = [];
    const sz = 22;
    const dx = sz*1.73, dy = sz*1.5;
    const cols = Math.ceil(W/dx)+1, rows = Math.ceil(H/dy)+1;
    for (let row=0;row<rows;row++) for (let col=0;col<cols;col++) {
      const cx = col*dx + (row%2)*dx*0.5;
      const cy = row*dy;
      cells.push({cx,cy});
    }
    stateRef.current.hexGrid = cells;
  }, []);

  // Spawn new target
  const spawnTarget = useCallback((W:number, H:number) => {
    const st = stateRef.current;
    if (st.phase!=="playing") return;
    const margin = 40;
    const col = PALETTE[Math.floor(Math.random()*PALETTE.length)];
    const difficulty = Math.max(0.3, 1 - (15-((timerRef.current?1:0)))/15);
    const ttl = 1800 - difficulty*800;
    st.targets.push({
      id: st.nextId++, x:margin+Math.random()*(W-margin*2), y:margin+Math.random()*(H-margin*2),
      size: 24+Math.random()*12, r:col[0], g:col[1], b:col[2],
      born:performance.now(), ttl, phase:"appear", ringScale:0,
    });
    const delay = 600 + Math.random()*600 - difficulty*200;
    spawnRef.current = setTimeout(()=>spawnTarget(W,H), Math.max(200,delay));
  }, []);

  // Main canvas loop
  useEffect(()=>{
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;
    buildHexGrid(canvas.width, canvas.height);

    const drawHex = (cx:number, cy:number, sz:number, alpha:number) => {
      ctx.beginPath();
      for (let i=0;i<6;i++) {
        const a = (i/6)*Math.PI*2 - Math.PI/6;
        const x = cx+Math.cos(a)*sz, y = cy+Math.sin(a)*sz;
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0,200,255,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };

    const draw = () => {
      if (!alive) return;
      const W=canvas.width, H=canvas.height;
      const st=stateRef.current;
      const now=performance.now();
      ctx.clearRect(0,0,W,H);

      // BG
      ctx.fillStyle="#030a1a";
      ctx.fillRect(0,0,W,H);

      // Hex grid with depth pulse
      const hexPulse = Math.sin(now*0.0008)*0.02+0.03;
      for (const {cx,cy} of st.hexGrid) {
        const distC = Math.hypot(cx-W/2,cy-H/2)/(Math.hypot(W,H)*0.5);
        drawHex(cx, cy, 20, Math.max(0.02,hexPulse*(1-distC*0.8)));
      }

      // Grid energy sweep
      const sweepX = (Math.sin(now*0.0005)+1)*0.5*W;
      const sweepGrad = ctx.createLinearGradient(sweepX-60,0,sweepX+60,0);
      sweepGrad.addColorStop(0,"rgba(0,214,255,0)");
      sweepGrad.addColorStop(0.5,"rgba(0,214,255,0.04)");
      sweepGrad.addColorStop(1,"rgba(0,214,255,0)");
      ctx.fillStyle=sweepGrad; ctx.fillRect(0,0,W,H);

      // Targets
      for (const tgt of st.targets) {
        const age = (now-tgt.born)/tgt.ttl;
        if (age>=1) { tgt.phase="dying"; }

        const alpha = tgt.phase==="appear"
          ? Math.min(1, (now-tgt.born)/300)
          : tgt.phase==="dying" ? 0 : Math.max(0,1-age);

        const pulse = 1+Math.sin(now*0.005+tgt.id)*0.08;
        const sz = tgt.size * pulse * (tgt.phase==="appear" ? 0.5+0.5*Math.min(1,(now-tgt.born)/300) : 1);

        ctx.save();
        ctx.shadowBlur = 30*alpha;
        ctx.shadowColor = `rgba(${tgt.r},${tgt.g},${tgt.b},${alpha})`;

        // Outer rings
        for (let ring=0;ring<3;ring++) {
          const ringR = sz*(1+ring*0.5);
          const ringA = alpha*Math.max(0,0.5-ring*0.15)*Math.abs(Math.sin(now*0.004-ring));
          ctx.beginPath();
          ctx.arc(tgt.x,tgt.y,ringR,0,Math.PI*2);
          ctx.strokeStyle=`rgba(${tgt.r},${tgt.g},${tgt.b},${ringA})`;
          ctx.lineWidth=1;
          ctx.stroke();
        }

        // Core glow
        const grd = ctx.createRadialGradient(tgt.x,tgt.y,0,tgt.x,tgt.y,sz);
        grd.addColorStop(0,`rgba(${tgt.r},${tgt.g},${tgt.b},${0.95*alpha})`);
        grd.addColorStop(0.5,`rgba(${tgt.r},${tgt.g},${tgt.b},${0.5*alpha})`);
        grd.addColorStop(1,`rgba(${tgt.r},${tgt.g},${tgt.b},0)`);
        ctx.beginPath(); ctx.arc(tgt.x,tgt.y,sz,0,Math.PI*2);
        ctx.fillStyle=grd; ctx.fill();

        // Cross-hair lines
        ctx.strokeStyle=`rgba(${tgt.r},${tgt.g},${tgt.b},${0.6*alpha})`;
        ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.moveTo(tgt.x-sz*1.5,tgt.y); ctx.lineTo(tgt.x+sz*1.5,tgt.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tgt.x,tgt.y-sz*1.5); ctx.lineTo(tgt.x,tgt.y+sz*1.5); ctx.stroke();

        ctx.restore();

        // Cooldown arc
        if (tgt.phase==="active") {
          ctx.beginPath();
          ctx.arc(tgt.x,tgt.y,sz*1.2, -Math.PI/2, -Math.PI/2 + (1-age)*Math.PI*2);
          ctx.strokeStyle=`rgba(${tgt.r},${tgt.g},${tgt.b},0.4)`;
          ctx.lineWidth=2; ctx.stroke();
        }
      }

      // Prune dead targets
      st.targets = st.targets.filter(t=>t.phase!=="dying");

      // Hit FX
      for (const fx of st.hitFX) {
        const age2=(now-fx.t)/600;
        if (age2>1) continue;
        for (let ring=0;ring<4;ring++) {
          const r2=(age2+ring*0.1)*80;
          const a2=Math.max(0,(1-age2)*0.8);
          ctx.beginPath(); ctx.arc(fx.x,fx.y,r2,0,Math.PI*2);
          ctx.strokeStyle=`rgba(${fx.r},${fx.g},${fx.b},${a2/(ring+1)})`;
          ctx.lineWidth=2; ctx.stroke();
        }
        // "HIT" text
        ctx.fillStyle=`rgba(255,255,255,${Math.max(0,1-age2*2)})`;
        ctx.font="bold 18px monospace";
        ctx.textAlign="center";
        ctx.fillText(`+${3+st.combo*2}SC`, fx.x, fx.y-20*age2-10);
      }
      st.hitFX = st.hitFX.filter(fx=>(now-fx.t)<600);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return ()=>{ alive=false; cancelAnimationFrame(rafRef.current); };
  }, [buildHexGrid]);

  const handleTap = useCallback((e: React.TouchEvent|React.MouseEvent) => {
    const st=stateRef.current;
    if (st.phase!=="playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect=canvas.getBoundingClientRect();
    const scaleX=canvas.width/rect.width;
    const scaleY=canvas.height/rect.height;
    const cx = "touches" in e
      ? (e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0) - rect.left
      : e.clientX-rect.left;
    const cy = "touches" in e
      ? (e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0) - rect.top
      : e.clientY-rect.top;
    const px=cx*scaleX, py=cy*scaleY;

    // Find hit target (largest hit radius first)
    let best: Target|null=null, bestDist=Infinity;
    for (const tgt of st.targets) {
      if (tgt.phase==="dying") continue;
      const d=Math.hypot(px-tgt.x,py-tgt.y);
      if (d<tgt.size*2.5 && d<bestDist) { best=tgt; bestDist=d; }
    }
    if (best) {
      const hit=best;
      st.targets=st.targets.filter(t=>t.id!==hit.id);
      st.combo++;
      const pts=10+st.combo*5;
      st.score+=pts; st.hits++;
      st.hitFX.push({id:st.nextId++,x:hit.x,y:hit.y,t:performance.now(),r:hit.r,g:hit.g,b:hit.b});
      setScore(st.score); setHits(st.hits); setCombo(st.combo);
    } else {
      st.combo=0; setCombo(0);
    }
  }, []);

  const cleanup = useCallback(()=>{
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearTimeout(spawnRef.current);
  }, []);

  const startGame = useCallback(()=>{
    const st=stateRef.current;
    st.phase="playing"; st.score=0; st.hits=0; st.combo=0; st.targets=[]; st.hitFX=[];
    setPhase("playing"); setScore(0); setHits(0); setTimeLeft(15); setCombo(0); setRewardSC(0);

    const canvas=canvasRef.current;
    const W=canvas?.width||380, H=canvas?.height||320;
    spawnTarget(W,H);

    timerRef.current=setInterval(()=>{
      setTimeLeft(prev=>{
        if (prev<=1) {
          cleanup(); stateRef.current.phase="done"; setPhase("done");
          const earned=Math.floor(stateRef.current.score/5)+stateRef.current.hits*3;
          setRewardSC(earned);
          const a=authFields();
          postJson("/webapp/api/v2/player/action",{...a,
            action_key:"game_arena_reflex",
            action_request_id:buildActionRequestId("game_arena_reflex"),
            payload:{hits:stateRef.current.hits,score:stateRef.current.score,reward_sc:earned}
          }).catch(()=>{});
          return 0;
        }
        return prev-1;
      });
    },1000);
  },[spawnTarget, cleanup]);

  useEffect(()=>()=>cleanup(),[cleanup]);

  return (
    <div style={{background:"rgba(3,10,26,0.98)",borderRadius:20,overflow:"hidden",border:"1px solid rgba(0,214,255,0.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"rgba(0,214,255,0.04)",borderBottom:"1px solid rgba(0,214,255,0.08)"}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"#00d6ff",letterSpacing:2}}>⬡ HOLO ARENA</div>
          <div style={{fontSize:10,color:"rgba(0,214,255,0.4)",marginTop:1}}>{isTr?"Holografik hedefleri vur":"Destroy holographic targets"}</div>
        </div>
        <div style={{display:"flex",gap:12,fontFamily:"monospace",fontSize:11}}>
          {phase==="playing"&&<>
            <span style={{color:"#ff6060"}}>⏱{String(timeLeft).padStart(2,"0")}</span>
            <span style={{color:"#ffd700"}}>◈{score}</span>
            <span style={{color:combo>3?"#10ff90":"rgba(255,255,255,0.3)"}}>⚡{combo}</span>
          </>}
        </div>
      </div>

      {phase==="idle"&&(
        <div style={{padding:"24px 16px",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12,filter:"drop-shadow(0 0 20px #00d6ff)"}}>⬡</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:8,lineHeight:1.7}}>
            {isTr?"Holografik hedefler belirir — hızla dokun! Combo zinciri daha fazla SC verir. Hedefsiz vurular komboyu sıfırlar."
            :"Holographic targets emerge — tap fast! Combo chains multiply SC. Miss a target and combo resets."}
          </div>
          <button onClick={startGame} style={{background:"linear-gradient(135deg,#00d6ff,#8000ff)",color:"#fff",border:"none",borderRadius:12,padding:"13px 36px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 0 30px rgba(0,214,255,0.3)",marginTop:8}}>
            {isTr?"ARENA'YA GİR":"ENTER ARENA"}
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef} width={380} height={320}
        onTouchStart={handleTap} onClick={handleTap}
        style={{display:phase==="playing"?"block":"none",width:"100%",touchAction:"none",cursor:"crosshair"}}
      />

      {phase==="done"&&(
        <div style={{padding:"24px 16px",textAlign:"center"}}>
          <div style={{fontSize:32,fontWeight:800,color:"#ffd700",marginBottom:4,fontFamily:"monospace"}}>+{rewardSC} SC</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:20}}>
            {hits} {isTr?"isabet":"hits"} · {score} {isTr?"puan":"pts"}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <button onClick={startGame} style={{background:"linear-gradient(135deg,#00d6ff,#8000ff)",color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              {isTr?"Rematch":"Rematch"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
