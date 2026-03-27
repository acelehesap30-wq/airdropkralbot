import { useState, useCallback, useRef, useEffect } from "react";
import { buildActionRequestId, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";
import type { Lang } from "../../i18n";
import { NexusRush } from "./NexusRush";

type MiniGamesProps = { lang: Lang; auth?: WebAppAuth | null; sc: number };

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function rrect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "plasma" as const, icon: "⚡", tr: "Plazma",  en: "Plasma", color: "#e040fb" },
  { id: "coin"   as const, icon: "🪙", tr: "Yazı·Tura", en: "Coin", color: "#ffd700" },
  { id: "spin"   as const, icon: "🎰", tr: "Çark",    en: "Spin",   color: "#00d2ff" },
  { id: "vault"  as const, icon: "💎", tr: "Vault",   en: "Vault",  color: "#00ff88" },
  { id: "sniper" as const, icon: "🎯", tr: "Keskin",  en: "Sniper", color: "#ff6600" },
  { id: "rush"   as const, icon: "🚀", tr: "Rush",    en: "Rush",   color: "#00d2ff" },
];
type TabId = "plasma" | "coin" | "spin" | "vault" | "sniper" | "rush";

// ─── shared types ─────────────────────────────────────────────────────────────
type PlasmaRing  = { id:number; r:number; alpha:number; color:string; tilt:number };
type PlasmaSpark = { x:number; y:number; z:number; vx:number; vy:number; vz:number; life:number; color:string };
type FloatText   = { x:number; y:number; vy:number; text:string; life:number; color:string };
type Particle    = { x:number; y:number; vx:number; vy:number; life:number; r:number; g:number; b:number };

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 1 — PLASMA CORE TAP BLITZ  (3D sphere · combo · shockwave)
// ═══════════════════════════════════════════════════════════════════════════════
function TapBlitz({ lang, auth }: { lang:Lang; auth?:WebAppAuth|null }) {
  const isTr = lang === "tr";
  const [phase, setPhase]       = useState<"idle"|"playing"|"done">("idle");
  const [taps, setTaps]         = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [reward, setReward]     = useState<number|null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval>|null>(null);
  const rafRef    = useRef<number>(0);
  const stRef     = useRef({
    taps:0, rings:[] as PlasmaRing[], sparks:[] as PlasmaSpark[],
    floatTexts:[] as FloatText[], comboTimes:[] as number[], combo:0,
    shockwave:0, shockwaveR:0,
    levelBurst:0, levelBurstR:0, levelBurstColor:"#ffd700",
    lastLevelMilestone:0,
    nextId:0, phase:"idle" as "idle"|"playing"|"done",
  });

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let alive = true;
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2 - 6;
    const COLS = ["#e040fb","#00d6ff","#ff6090","#ffd700","#00ff88"];
    const FOV = 220;

    const draw = () => {
      if (!alive) return;
      ctx.fillStyle = "#060010"; ctx.fillRect(0,0,W,H);
      const st = stRef.current;
      const tn = Date.now()*0.001;
      const intensity = Math.min(1, st.taps/80);
      const coreR = 30 + intensity*24;

      // starfield
      for (let i=0;i<14;i++) {
        const sx=(Math.sin(i*2.7+tn*0.3)*0.5+0.5)*W;
        const sy=(Math.cos(i*1.9+tn*0.2)*0.5+0.5)*H;
        ctx.beginPath(); ctx.arc(sx,sy,0.7,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${0.08+0.07*Math.sin(i*3.1+tn)})`; ctx.fill();
      }
      // perspective floor grid
      const gy0=cy+coreR+20, ghorizon=gy0-52;
      ctx.save(); ctx.globalAlpha=0.10+intensity*0.13;
      for (let col=-5;col<=5;col++) {
        ctx.beginPath(); ctx.moveTo(cx+col*22,gy0); ctx.lineTo(cx+col*2.5,ghorizon);
        ctx.strokeStyle=col%2===0?"#e040fb":"#00d6ff"; ctx.lineWidth=0.55; ctx.stroke();
      }
      for (let row=0;row<6;row++) {
        const p=row/5, y=gy0-(p*(gy0-ghorizon)), hw=(1-p)*105+p*4;
        ctx.beginPath(); ctx.moveTo(cx-hw,y); ctx.lineTo(cx+hw,y);
        ctx.strokeStyle=row%2===0?"rgba(224,64,251,0.5)":"rgba(0,214,255,0.5)";
        ctx.lineWidth=0.5; ctx.stroke();
      }
      ctx.restore();

      // milestone shockwave
      if (st.shockwave>0) {
        st.shockwaveR+=5; st.shockwave-=0.035;
        ctx.beginPath(); ctx.arc(cx,cy,st.shockwaveR,0,Math.PI*2);
        ctx.strokeStyle=`rgba(255,215,0,${st.shockwave})`; ctx.lineWidth=3.5; ctx.stroke();
        // second ring
        ctx.beginPath(); ctx.arc(cx,cy,st.shockwaveR*0.65,0,Math.PI*2);
        ctx.strokeStyle=`rgba(224,64,251,${st.shockwave*0.6})`; ctx.lineWidth=1.5; ctx.stroke();
      }
      // power level burst ring
      if (st.levelBurst>0) {
        st.levelBurstR+=7; st.levelBurst-=0.028;
        const [lr,lg,lb]=hexToRgb(st.levelBurstColor);
        for(let ri=0;ri<3;ri++){
          const rr=st.levelBurstR*(1-ri*0.22);
          ctx.beginPath(); ctx.arc(cx,cy,rr,0,Math.PI*2);
          ctx.strokeStyle=`rgba(${lr},${lg},${lb},${st.levelBurst*(0.9-ri*0.25)})`; ctx.lineWidth=3-ri*0.8; ctx.stroke();
        }
      }
      // ambient glow rings
      for (let i=3;i>=0;i--) {
        const pulse=Math.sin(tn*2.4+i*1.2)*0.5+0.5;
        ctx.beginPath(); ctx.arc(cx,cy,coreR*(2+i*0.75),0,Math.PI*2);
        ctx.strokeStyle=`rgba(224,64,251,${(0.05-i*0.01)*pulse*(0.4+intensity*0.6)})`;
        ctx.lineWidth=2.2-i*0.35; ctx.stroke();
      }
      // tap rings (3D tilted)
      for (const ring of st.rings) {
        ring.r+=4; ring.alpha-=0.038;
        if (ring.alpha>0) {
          ctx.save(); ctx.translate(cx,cy); ctx.rotate(ring.tilt*0.3); ctx.scale(1,Math.cos(ring.tilt));
          ctx.beginPath(); ctx.arc(0,0,ring.r,0,Math.PI*2);
          ctx.strokeStyle=ring.color+Math.round(ring.alpha*255).toString(16).padStart(2,"0");
          ctx.lineWidth=2; ctx.stroke(); ctx.restore();
        }
      }
      st.rings=st.rings.filter(r=>r.alpha>0);
      // 3D perspective sparks
      for (const sp of st.sparks) {
        sp.x+=sp.vx; sp.y+=sp.vy; sp.vy+=0.1; sp.z+=sp.vz; sp.life-=0.044;
        if (sp.life>0) {
          const sc2=FOV/(FOV+sp.z*0.8);
          ctx.beginPath(); ctx.arc(cx+(sp.x-cx)*sc2, cy+(sp.y-cy)*sc2, 3*sp.life*sc2, 0, Math.PI*2);
          const [r,g,b]=hexToRgb(sp.color);
          ctx.fillStyle=`rgba(${r},${g},${b},${sp.life})`; ctx.fill();
        }
      }
      st.sparks=st.sparks.filter(s=>s.life>0);
      // sphere shadow
      ctx.beginPath(); ctx.ellipse(cx,cy+coreR*0.9,coreR*0.8,coreR*0.17,0,0,Math.PI*2);
      ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.fill();
      // 3D sphere Lambert + specular
      const lx=cx-coreR*0.38, ly=cy-coreR*0.44;
      const c1=intensity>0.6?"#ffd700":intensity>0.3?"#e040fb":"#6020a0";
      const c2=intensity>0.6?"#ff4400":intensity>0.3?"#00d6ff":"#2000ff";
      const bodyG=ctx.createRadialGradient(lx,ly,0,cx,cy,coreR);
      bodyG.addColorStop(0,c1); bodyG.addColorStop(0.5,c2); bodyG.addColorStop(1,"rgba(2,0,10,0.97)");
      ctx.shadowBlur=44*(0.28+intensity); ctx.shadowColor=c1;
      ctx.beginPath(); ctx.arc(cx,cy,coreR,0,Math.PI*2); ctx.fillStyle=bodyG; ctx.fill(); ctx.shadowBlur=0;
      const spX=cx-coreR*0.28, spY=cy-coreR*0.36;
      const specG=ctx.createRadialGradient(spX,spY,0,spX,spY,coreR*0.43);
      specG.addColorStop(0,"rgba(255,255,255,0.60)"); specG.addColorStop(0.4,"rgba(255,255,255,0.12)"); specG.addColorStop(1,"rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx,cy,coreR,0,Math.PI*2); ctx.fillStyle=specG; ctx.fill();
      // combo ring
      if (st.combo>=3 && st.phase==="playing") {
        const comboColor=st.combo>=8?"#ffd700":st.combo>=5?"#ff6090":"#e040fb";
        ctx.beginPath(); ctx.arc(cx,cy,coreR+8+st.combo*1.1,0,Math.PI*2);
        ctx.strokeStyle=comboColor; ctx.lineWidth=2.5;
        ctx.globalAlpha=Math.min(1,(st.combo-2)/6)*0.8;
        ctx.shadowBlur=14; ctx.shadowColor=comboColor; ctx.stroke(); ctx.shadowBlur=0; ctx.globalAlpha=1;
      }
      // tap count
      if (st.phase==="playing") {
        ctx.font=`bold ${24+intensity*16}px monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.shadowBlur=10; ctx.shadowColor="#fff"; ctx.fillStyle="rgba(255,255,255,0.94)";
        ctx.fillText(String(st.taps),cx,cy); ctx.shadowBlur=0;
        if (st.combo>=3) {
          ctx.font=`bold ${10+st.combo*0.4}px monospace`;
          ctx.fillStyle=st.combo>=8?"#ffd700":st.combo>=5?"#ff6090":"#e040fb";
          ctx.fillText(`x${st.combo} COMBO`,cx,cy+coreR+14);
        }
      }
      // orbiting nodes z-sorted
      const nodes=[];
      for (let i=0;i<4;i++) {
        const tiltA=(i%2===0)?0.45:-0.35, ang=tn*(1.25+i*0.22)+i*(Math.PI/2), oR=coreR*1.75+intensity*14;
        nodes.push({ox:Math.cos(ang)*oR, oy:Math.sin(ang)*oR*Math.cos(tiltA), oz:Math.sin(ang)*oR*Math.sin(tiltA), col:COLS[i]});
      }
      nodes.sort((a,b)=>b.oz-a.oz);
      for (const nd of nodes) {
        const sc3=FOV/(FOV+nd.oz*0.25);
        ctx.beginPath(); ctx.arc(cx+nd.ox*sc3,cy+nd.oy*sc3,(2.6+intensity*2.6)*sc3,0,Math.PI*2);
        ctx.fillStyle=nd.col; ctx.shadowBlur=12*sc3; ctx.shadowColor=nd.col; ctx.fill(); ctx.shadowBlur=0;
      }
      // floating text
      for (const ft of st.floatTexts) {
        ft.y+=ft.vy; ft.life-=0.022;
        if (ft.life>0) {
          ctx.font=`bold ${Math.floor(12+ft.life*5)}px monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.globalAlpha=Math.min(1,ft.life*2); ctx.shadowBlur=8; ctx.shadowColor=ft.color;
          ctx.fillStyle=ft.color; ctx.fillText(ft.text,ft.x,ft.y); ctx.shadowBlur=0; ctx.globalAlpha=1;
        }
      }
      st.floatTexts=st.floatTexts.filter(f=>f.life>0);
      rafRef.current=requestAnimationFrame(draw);
    };
    rafRef.current=requestAnimationFrame(draw);
    return ()=>{alive=false; cancelAnimationFrame(rafRef.current);};
  },[]);

  const tapCore=useCallback(()=>{
    const st=stRef.current; if(st.phase!=="playing") return;
    st.taps++; setTaps(st.taps);
    const now=Date.now();
    st.comboTimes.push(now);
    st.comboTimes=st.comboTimes.filter(t=>now-t<1000);
    st.combo=st.comboTimes.length;
    const canvas=canvasRef.current; if(!canvas) return;
    const cx=canvas.width/2, cy=canvas.height/2-6;
    const COLS=["#e040fb","#00d6ff","#ff6090","#ffd700","#00ff88"];
    const col=COLS[st.taps%COLS.length];
    st.rings.push({id:st.nextId++,r:26,alpha:0.88,color:col,tilt:[0,0.6,-0.4,0.85,-0.55,0.3][st.nextId%6]});
    for(let i=0;i<8;i++){
      const a=Math.random()*Math.PI*2, spd=2+Math.random()*4.5;
      st.sparks.push({x:cx,y:cy,z:-28+Math.random()*56,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-1.8,vz:Math.random()*2-1,life:1,color:col});
    }
    if(st.taps===25||st.taps===50||st.taps===75){
      st.shockwave=1; st.shockwaveR=28;
      st.floatTexts.push({x:cx,y:cy-52,vy:-1.2,text:`${st.taps} 🔥`,life:1,color:"#ffd700"});
    }
    // Power-level bursts at 30/60/90 taps
    const LEVEL_MILESTONES=[30,60,90];
    if(LEVEL_MILESTONES.includes(st.taps)&&st.taps!==st.lastLevelMilestone){
      st.lastLevelMilestone=st.taps;
      const lvlColor=st.taps===30?"#00ff88":st.taps===60?"#e040fb":"#ffd700";
      st.levelBurst=1; st.levelBurstR=0; st.levelBurstColor=lvlColor;
      const lvlLabel=st.taps===30?(isTr?"LV.2 ⚡":"LV.2 ⚡"):st.taps===60?(isTr?"LV.3 🔥":"LV.3 🔥"):(isTr?"MAX 👑":"MAX 👑");
      st.floatTexts.push({x:cx,y:cy-65,vy:-1.8,text:lvlLabel,life:1.4,color:lvlColor});
      // extra sparks burst
      for(let i=0;i<20;i++){
        const a=i/20*Math.PI*2,spd=4+Math.random()*5;
        st.sparks.push({x:cx,y:cy,z:0,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,vz:0,life:1,color:lvlColor});
      }
    }
    if(st.combo>=5) st.floatTexts.push({x:cx+Math.random()*60-30,y:cy-36,vy:-0.9,text:`x${st.combo}!`,life:1,color:st.combo>=8?"#ffd700":"#e040fb"});
  },[]);

  const startGame=useCallback(()=>{
    const st=stRef.current;
    st.taps=0;st.rings=[];st.sparks=[];st.floatTexts=[];st.comboTimes=[];st.combo=0;st.shockwave=0;st.shockwaveR=0;st.levelBurst=0;st.levelBurstR=0;st.lastLevelMilestone=0;st.phase="playing";
    setPhase("playing");setTaps(0);setTimeLeft(10);setReward(null);
    timerRef.current=setInterval(()=>{
      setTimeLeft(prev=>{
        if(prev<=1){
          clearInterval(timerRef.current!);
          stRef.current.phase="done"; setPhase("done");
          const earned=stRef.current.taps*2; setReward(earned);
          postJson("/webapp/api/v2/player/action",{...authFields(auth),action_key:"game_tap_blitz",action_request_id:buildActionRequestId("game_tap_blitz"),payload:{taps:stRef.current.taps,reward_sc:earned}}).catch(()=>{});
          return 0;
        }
        return prev-1;
      });
    },1000);
  },[auth]);

  useEffect(()=>()=>{if(timerRef.current)clearInterval(timerRef.current);},[]);
  const tapRank=taps>=80?(isTr?"Efsane":"Legend"):taps>=60?(isTr?"Hızlı":"Fast"):taps>=40?(isTr?"İyi":"Good"):taps>=20?"Normal":(isTr?"Yavaş":"Slow");

  return (
    <div className="akrCard" style={{borderLeft:"3px solid #e040fb",padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 12px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#e040fb"}}>⚡ {isTr?"Plazma Çekirdeği":"Plasma Core"}</div>
          <div style={{fontSize:10,opacity:0.5}}>{isTr?"10s · Çekirdeği patlat · Combo kazan":"10s · Blast the core · Build combos"}</div>
        </div>
        {phase==="playing"&&<span style={{fontSize:13,color:timeLeft<=3?"#ff4444":"#e040fb",fontFamily:"monospace",fontWeight:700}}>{timeLeft}s</span>}
        {phase==="done"&&<span style={{fontSize:12,color:"#ffd700",fontFamily:"monospace"}}>+{reward} SC</span>}
      </div>
      <div style={{position:"relative",cursor:phase==="playing"?"crosshair":"default"}} onClick={phase==="playing"?tapCore:undefined}>
        <canvas ref={canvasRef} width={340} height={155} style={{display:"block",width:"100%"}}/>
        {phase==="idle"&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <button onClick={e=>{e.stopPropagation();startGame();}} style={{background:"linear-gradient(135deg,#e040fb,#7c00ff)",color:"#fff",border:"none",borderRadius:12,padding:"12px 36px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 0 28px rgba(224,64,251,0.55)"}}>
              {isTr?"BAŞLAT":"LAUNCH"}
            </button>
          </div>
        )}
        {phase==="done"&&(
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(6,0,16,0.78)"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#e040fb",fontFamily:"monospace",textShadow:"0 0 14px #e040fb"}}>{taps} {isTr?"vuruş":"hits"} · {tapRank}</div>
            <div style={{fontSize:12,color:"#ffd700",marginTop:4}}>+{reward} SC</div>
            <button onClick={e=>{e.stopPropagation();stRef.current.phase="idle";stRef.current.combo=0;setPhase("idle");setTaps(0);setReward(null);}} style={{marginTop:10,background:"rgba(224,64,251,0.15)",border:"1px solid rgba(224,64,251,0.4)",color:"#e040fb",borderRadius:8,padding:"7px 22px",fontSize:12,cursor:"pointer"}}>
              {isTr?"Tekrar":"Replay"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 2 — COIN FLIP (3D Canvas · spotlight · bounce landing)
// ═══════════════════════════════════════════════════════════════════════════════
type TrailDot = { x:number; y:number; alpha:number; color:string };

function CoinFlip({ lang, auth, sc }: { lang:Lang; auth?:WebAppAuth|null; sc:number }) {
  const isTr = lang === "tr";
  const [bet, setBet]           = useState(50);
  const [choice, setChoice]     = useState<"heads"|"tails"|null>(null);
  const [phase, setPhase]       = useState<"idle"|"flipping"|"done">("idle");
  const [flipResult, setFlipResult] = useState<{side:"heads"|"tails";won:boolean;amount:number}|null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const stRef     = useRef({
    phase:"idle" as "idle"|"flipping"|"done",
    angle:0, startTime:0, duration:1800,
    targetFace:"heads" as "heads"|"tails",
    face:"heads" as "heads"|"tails",
    choice:null as "heads"|"tails"|null,
    particles:[] as Particle[],
    trail:[] as TrailDot[],
    bounceY:0, bounceVY:0, bouncing:false,
    resultTriggered:false,
    onDone:null as ((side:"heads"|"tails",won:boolean,amount:number)=>void)|null,
  });

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    let alive=true;
    const W=canvas.width, H=canvas.height;
    const cx=W/2, cy=H/2+2;
    const R=40;

    const draw=()=>{
      if(!alive) return;
      const st=stRef.current;
      const now=Date.now();
      const tn=now*0.0007;

      ctx.fillStyle="#080012"; ctx.fillRect(0,0,W,H);

      // atmospheric spotlight from above
      const spotG=ctx.createRadialGradient(cx,0,0,cx,H*0.35,H*0.75);
      spotG.addColorStop(0,"rgba(255,215,0,0.06)"); spotG.addColorStop(0.5,"rgba(200,150,0,0.02)"); spotG.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=spotG; ctx.fillRect(0,0,W,H);

      // felt table
      const tableY=cy+R+14;
      if(tableY<H){
        const tg=ctx.createLinearGradient(0,tableY,0,H);
        tg.addColorStop(0,"rgba(0,50,25,0.28)"); tg.addColorStop(1,"rgba(0,20,10,0.55)");
        ctx.fillStyle=tg; ctx.fillRect(0,tableY,W,H-tableY);
        ctx.save(); ctx.globalAlpha=0.032;
        for(let xi=0;xi<W;xi+=8){ ctx.beginPath();ctx.moveTo(xi,tableY);ctx.lineTo(xi,H);ctx.strokeStyle="#00ff88";ctx.lineWidth=0.4;ctx.stroke(); }
        ctx.restore();
        ctx.beginPath();ctx.moveTo(0,tableY);ctx.lineTo(W,tableY);ctx.strokeStyle="rgba(0,255,136,0.07)";ctx.lineWidth=1;ctx.stroke();
      }
      // starfield
      for(let i=0;i<8;i++){
        const sx=(Math.sin(i*2.1+tn)*0.5+0.5)*W, sy=(Math.cos(i*1.7+tn)*0.5+0.5)*(tableY||H)*0.9;
        ctx.beginPath();ctx.arc(sx,sy,0.7,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${0.15+0.1*Math.sin(i+tn*2)})`;ctx.fill();
      }

      // coin physics
      let scaleX=1;
      const coinCY = cy + stRef.current.bounceY;

      if(st.phase==="flipping"){
        const elapsed=now-st.startTime;
        const p=Math.min(1,elapsed/st.duration);
        const eased=1-Math.pow(1-p,3);
        const totalDeg=eased*(st.targetFace==="heads"?720:900);
        st.angle=totalDeg;
        scaleX=Math.cos((totalDeg*Math.PI)/180);
        if(p<0.95) st.trail.push({x:cx,y:coinCY,alpha:0.4,color:scaleX>=0?"#ffd700":"#9b4dff"});
        if(p>=1&&!st.resultTriggered){
          st.resultTriggered=true; st.phase="done"; st.face=st.targetFace; scaleX=1;
          st.bounceVY=-7; st.bouncing=true;
          const won=st.targetFace===st.choice;
          const [pr,pg,pb]=won?[0,255,136]:[255,68,68];
          for(let i=0;i<28;i++){
            const a=Math.random()*Math.PI*2,spd=2+Math.random()*5;
            st.particles.push({x:cx,y:coinCY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,life:1,r:pr,g:pg,b:pb});
          }
          if(st.onDone) st.onDone(st.targetFace,won,won?Math.floor(0):0);
        }
      } else if(st.phase==="idle"){
        scaleX=Math.cos(now*0.0009);
      }
      // bounce physics
      if(st.bouncing){
        st.bounceVY+=0.55;
        st.bounceY+=st.bounceVY;
        if(st.bounceY>=0&&st.bounceVY>0){
          st.bounceY=0; st.bounceVY*=-0.42;
          if(Math.abs(st.bounceVY)<0.5){st.bouncing=false;st.bounceY=0;}
        }
      }

      // trail dots
      for(const d of st.trail){
        d.alpha-=0.03;
        if(d.alpha>0){
          ctx.beginPath();ctx.arc(cx,coinCY,R*0.9*Math.abs(scaleX||0.5),0,Math.PI*2);
          ctx.strokeStyle=d.color+Math.round(d.alpha*255).toString(16).padStart(2,"0");
          ctx.lineWidth=1; ctx.stroke();
        }
      }
      st.trail=st.trail.filter(d=>d.alpha>0);

      const absScale=Math.max(0.01,Math.abs(scaleX));
      const faceNow=st.phase==="done"?st.face:(st.phase==="idle"?"heads":(scaleX>=0?"heads":"tails"));

      // coin shadow on table
      ctx.beginPath(); ctx.ellipse(cx,coinCY+R+8,R*absScale*0.82,7,0,0,Math.PI*2);
      ctx.fillStyle=`rgba(0,0,0,${0.18+absScale*0.12})`; ctx.fill();

      // coin body
      ctx.save();
      ctx.shadowBlur=30+10*Math.sin(tn*2); ctx.shadowColor=faceNow==="heads"?"#ffd700":"#9b4dff";
      const grad=ctx.createLinearGradient(cx-R*absScale,coinCY-R,cx+R*absScale,coinCY+R);
      if(faceNow==="heads"){
        grad.addColorStop(0,"#7a4d00");grad.addColorStop(0.35,"#FFD700");grad.addColorStop(0.65,"#FFF5A0");grad.addColorStop(1,"#7a4d00");
      } else {
        grad.addColorStop(0,"#3b0082");grad.addColorStop(0.35,"#9b4dff");grad.addColorStop(0.65,"#c8a0ff");grad.addColorStop(1,"#3b0082");
      }
      ctx.beginPath(); ctx.ellipse(cx,coinCY,R*absScale,R,0,0,Math.PI*2);
      ctx.fillStyle=grad; ctx.fill();
      ctx.strokeStyle=faceNow==="heads"?"rgba(255,215,0,0.55)":"rgba(155,77,255,0.55)";
      ctx.lineWidth=2.5; ctx.stroke(); ctx.restore();

      // specular
      const specG=ctx.createRadialGradient(cx-R*absScale*0.3,coinCY-R*0.35,0,cx,coinCY,R*0.7);
      specG.addColorStop(0,"rgba(255,255,255,0.38)");specG.addColorStop(0.5,"rgba(255,255,255,0.06)");specG.addColorStop(1,"rgba(255,255,255,0)");
      ctx.beginPath(); ctx.ellipse(cx,coinCY,R*absScale,R,0,0,Math.PI*2); ctx.fillStyle=specG; ctx.fill();

      // edge ridges
      for(let ring=1;ring<=2;ring++){
        ctx.beginPath(); ctx.ellipse(cx,coinCY,(R-ring*4)*absScale,R-ring*4,0,0,Math.PI*2);
        ctx.strokeStyle=faceNow==="heads"?`rgba(255,215,0,${0.18-ring*0.05})`:`rgba(155,77,255,${0.18-ring*0.05})`;
        ctx.lineWidth=0.7; ctx.stroke();
      }
      // face text
      if(absScale>0.18){
        ctx.save(); ctx.translate(cx,coinCY); ctx.scale(absScale,1);
        ctx.font=`bold ${Math.floor(15*Math.min(1,absScale))}px monospace`;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillStyle=faceNow==="heads"?"rgba(60,30,0,0.85)":"rgba(20,0,50,0.85)";
        ctx.fillText(faceNow==="heads"?(isTr?"YAZI":"HEAD"):(isTr?"TURA":"TAIL"),0,0);
        ctx.restore();
      }
      // burst particles
      for(const p of st.particles){
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; p.life-=0.034;
        if(p.life>0){ ctx.beginPath();ctx.arc(p.x,p.y,3*p.life,0,Math.PI*2);ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${p.life})`;ctx.fill(); }
      }
      st.particles=st.particles.filter(p=>p.life>0);
      rafRef.current=requestAnimationFrame(draw);
    };
    rafRef.current=requestAnimationFrame(draw);
    return()=>{alive=false;cancelAnimationFrame(rafRef.current);};
  },[isTr]);

  const flip=useCallback(async()=>{
    const st=stRef.current;
    if(!choice||st.phase==="flipping"||sc<bet) return;
    setPhase("flipping");setFlipResult(null);
    st.phase="flipping";st.startTime=Date.now();st.duration=1800;
    st.resultTriggered=false;st.particles=[];st.trail=[];st.choice=choice;st.bounceY=0;st.bouncing=false;
    let resolvedSide:"heads"|"tails"=Math.random()>0.5?"heads":"tails";
    let resolvedWon=false,resolvedAmount=0;
    try{
      const a=authFields(auth);
      const resp=await postJson<{success:boolean;data:{result_side?:"heads"|"tails";won?:boolean;reward_sc?:number}}>(
        "/webapp/api/v2/player/action",{...a,action_key:"game_coin_flip",action_request_id:buildActionRequestId("game_coin_flip"),payload:{bet_sc:bet,choice}});
      if(resp.success&&resp.data){
        resolvedSide=resp.data.result_side||resolvedSide;resolvedWon=!!resp.data.won;resolvedAmount=Number(resp.data.reward_sc||0);
      } else { resolvedSide=Math.random()>0.5?"heads":"tails";resolvedWon=resolvedSide===choice;resolvedAmount=resolvedWon?Math.floor(bet*1.8):0; }
    }catch{ resolvedSide=Math.random()>0.5?"heads":"tails";resolvedWon=resolvedSide===choice;resolvedAmount=resolvedWon?Math.floor(bet*1.8):0; }
    st.targetFace=resolvedSide;
    st.onDone=()=>{ setFlipResult({side:resolvedSide,won:resolvedWon,amount:resolvedAmount}); setPhase("done"); };
  },[choice,bet,sc,auth]);

  return(
    <div className="akrCard" style={{borderLeft:"3px solid #ffd700",padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 12px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#ffd700"}}>🪙 {isTr?"Yazı Tura":"Coin Flip"}</div>
          <div style={{fontSize:10,opacity:0.5}}>{isTr?"SC bahis koy · x1.8 ödül":"Bet SC · x1.8 reward"}</div>
        </div>
        {flipResult&&<span style={{fontSize:13,fontWeight:800,color:flipResult.won?"#00ff88":"#ff4444",fontFamily:"monospace"}}>{flipResult.won?`+${flipResult.amount}`:`-${bet}`} SC</span>}
      </div>
      <canvas ref={canvasRef} width={340} height={125} style={{display:"block",width:"100%"}}/>
      <div style={{padding:"6px 12px 12px"}}>
        <div style={{display:"flex",gap:6,marginBottom:8,justifyContent:"center"}}>
          {[10,25,50,100].map(v=>(
            <button key={v} className="akrBtn akrBtnSm" onClick={()=>setBet(v)}
              style={{opacity:bet===v?1:0.4,border:bet===v?"1px solid #ffd700":"1px solid transparent",fontSize:10}}>{v} SC</button>
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
        <button className="akrBtn akrBtnAccent" onClick={flip} disabled={!choice||phase==="flipping"||sc<bet}
          style={{width:"100%",opacity:(!choice||phase==="flipping"||sc<bet)?0.4:1}}>
          {phase==="flipping"?(isTr?"Uçuyor...":"Flipping..."):sc<bet?(isTr?"Yetersiz SC":"Not enough SC"):(isTr?`${bet} SC Bahis`:`Flip ${bet} SC`)}
        </button>
        {phase==="done"&&<button className="akrBtn" onClick={()=>{stRef.current.phase="idle";setPhase("idle");setFlipResult(null);setChoice(null);}} style={{width:"100%",marginTop:6,fontSize:12,opacity:0.7}}>{isTr?"Yeni Oyun":"New Game"}</button>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 3 — DAILY SPIN (3D Tilted Wheel · physics-correct landing)
// ═══════════════════════════════════════════════════════════════════════════════
const WHEEL_PRIZES=[
  {label:"10 SC",  value:10,  color:"#00ff88",weight:30},
  {label:"25 SC",  value:25,  color:"#00d2ff",weight:25},
  {label:"50 SC",  value:50,  color:"#e040fb",weight:15},
  {label:"1 HC",   value:100, color:"#ffd700",weight:10},
  {label:"100 SC", value:100, color:"#ff8800",weight:8},
  {label:"x2 SC",  value:200, color:"#ff4444",weight:5},
  {label:"3 HC",   value:300, color:"#00ffaa",weight:4},
  {label:"500 SC", value:500, color:"#ff00ff",weight:3},
];

function DailySpin({lang,auth}:{lang:Lang;auth?:WebAppAuth|null}){
  const isTr=lang==="tr";
  const [spinning,setSpinning]=useState(false);
  const [result,setResult]=useState<{label:string;value:number;color:string}|null>(null);
  const [canSpin,setCanSpin]=useState(()=>{
    const last=localStorage.getItem("akr_daily_spin_ts");
    return !last||Date.now()-Number(last)>86400000;
  });
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const rafRef=useRef<number>(0);
  const wsRef=useRef<{
    rot:number; velocity:number; spinning:boolean;
    settled:boolean; settleCallbackFired:boolean; prizeIdx:number;
    tickFlash:number; lastBoundaryCount:number;
    particles:Particle[];
    jackpotFlash:number;
    onSettle:null|(()=>void);
  }>({
    rot:0, velocity:0, spinning:false,
    settled:false, settleCallbackFired:false, prizeIdx:-1,
    tickFlash:0, lastBoundaryCount:0,
    particles:[],
    jackpotFlash:0,
    onSettle:null,
  });

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    let alive=true;
    const W=canvas.width, H=canvas.height;
    const cx=W/2, cy=H/2+8;
    const R=Math.min(W,H)*0.38;
    const N=WHEEL_PRIZES.length;
    const seg=(Math.PI*2)/N;
    const TILT=0.40;
    const RIM_H=15;
    const FRICTION=0.976;

    const draw=()=>{
      if(!alive) return;
      const ws=wsRef.current;
      const tn=Date.now()*0.001;

      // physics
      if(ws.spinning){
        ws.velocity*=FRICTION;
        ws.rot+=ws.velocity;
        // tick flash when crossing sector boundary
        const boundaryCount=Math.floor(ws.rot/seg);
        if(boundaryCount!==ws.lastBoundaryCount){ ws.tickFlash=1; ws.lastBoundaryCount=boundaryCount; }
        if(ws.tickFlash>0) ws.tickFlash-=0.1;

        if(ws.velocity<0.004){
          ws.velocity=0; ws.spinning=false;
          if(!ws.settled&&ws.prizeIdx>=0){
            ws.settled=true;
            // micro-correct to exact landing
            const ideal=Math.PI/2-ws.prizeIdx*seg-seg/2;
            const k=Math.round((ws.rot-ideal)/(Math.PI*2));
            ws.rot=ideal+Math.PI*2*k;
            // burst particles
            const prize=WHEEL_PRIZES[ws.prizeIdx];
            const [pr,pg,pb]=hexToRgb(prize.color);
            const isJackpot=ws.prizeIdx>=5; // x2 SC, 3 HC, 500 SC
            const burstCount=isJackpot?90:38;
            for(let i=0;i<burstCount;i++){
              const a=Math.random()*Math.PI*2,spd=(isJackpot?3:2)+Math.random()*(isJackpot?10:7);
              ws.particles.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-4,life:1,r:isJackpot?255:pr,g:isJackpot?215:pg,b:isJackpot?0:pb});
            }
            if(isJackpot){ ws.jackpotFlash=55; }
          }
        }
      }
      // fire settle callback exactly once
      if(ws.settled&&!ws.settleCallbackFired&&ws.onSettle){
        ws.settleCallbackFired=true;
        ws.onSettle();
      }

      ctx.fillStyle="#050010"; ctx.fillRect(0,0,W,H);

      // outer halo
      const halo=ctx.createRadialGradient(cx,cy,R*0.65,cx,cy,R*1.2);
      halo.addColorStop(0,"rgba(0,0,0,0)");
      halo.addColorStop(0.7,`rgba(50,0,100,${0.06+0.04*Math.sin(tn*1.8)})`);
      halo.addColorStop(1,"rgba(0,0,0,0)");
      ctx.beginPath();ctx.arc(cx,cy,R*1.2,0,Math.PI*2);ctx.fillStyle=halo;ctx.fill();

      // 3D rim depth (trapezoid side faces)
      for(let i=0;i<N;i++){
        const s=ws.rot+i*seg-Math.PI/2, e=s+seg, mid=(s+e)/2;
        const sinMid=Math.sin(mid);
        if(sinMid>0){
          const depth=RIM_H*sinMid;
          const x1=cx+Math.cos(s)*R, y1=cy+Math.sin(s)*R*TILT;
          const x2=cx+Math.cos(e)*R, y2=cy+Math.sin(e)*R*TILT;
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
          ctx.lineTo(x2,y2+depth); ctx.lineTo(x1,y1+depth); ctx.closePath();
          const [pr,pg,pb]=hexToRgb(WHEEL_PRIZES[i].color);
          ctx.fillStyle=`rgba(${pr*0.4|0},${pg*0.4|0},${pb*0.4|0},0.88)`;
          ctx.strokeStyle=WHEEL_PRIZES[i].color+"30"; ctx.lineWidth=0.4; ctx.fill(); ctx.stroke();
        }
      }

      // wheel face (tilted)
      ctx.save(); ctx.translate(cx,cy); ctx.scale(1,TILT);
      for(let i=0;i<N;i++){
        const s=ws.rot+i*seg-Math.PI/2, e=s+seg, mid=s+seg/2;
        const prize=WHEEL_PRIZES[i];
        ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,R,s,e); ctx.closePath();
        const gx=Math.cos(mid)*R*0.55, gy=Math.sin(mid)*R*0.55;
        const grd=ctx.createRadialGradient(gx,gy,0,0,0,R);
        grd.addColorStop(0,prize.color+"70"); grd.addColorStop(0.65,prize.color+"26"); grd.addColorStop(1,prize.color+"08");
        ctx.fillStyle=grd; ctx.fill(); ctx.strokeStyle=prize.color+"38"; ctx.lineWidth=0.8; ctx.stroke();
        // label (un-squish text)
        const lr=R*0.63;
        ctx.save(); ctx.translate(Math.cos(mid)*lr,Math.sin(mid)*lr); ctx.rotate(mid+Math.PI/2); ctx.scale(1,1/TILT);
        ctx.font="bold 10px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillStyle=prize.color; ctx.shadowBlur=5; ctx.shadowColor=prize.color;
        ctx.fillText(prize.label,0,0); ctx.shadowBlur=0; ctx.restore();
      }
      // outer rim
      ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,255,255,${0.10+0.05*Math.sin(tn*3)})`; ctx.lineWidth=2.5; ctx.stroke();
      // tick flash glow on rim
      if(ws.tickFlash>0){
        ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2);
        ctx.strokeStyle=`rgba(255,255,255,${ws.tickFlash*0.4})`; ctx.lineWidth=5; ctx.stroke();
      }
      // center hub
      const hub=ctx.createRadialGradient(0,0,0,0,0,R*0.17);
      hub.addColorStop(0,"rgba(255,255,255,0.28)"); hub.addColorStop(1,"rgba(0,0,0,0.65)");
      ctx.beginPath(); ctx.arc(0,0,R*0.17,0,Math.PI*2); ctx.fillStyle=hub; ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.22)"; ctx.lineWidth=1.5; ctx.stroke();
      ctx.restore();

      // front rim bottom edge
      ctx.save(); ctx.translate(cx,cy+RIM_H*0.55); ctx.scale(1,TILT*0.8);
      ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2);
      ctx.strokeStyle="rgba(255,255,255,0.07)"; ctx.lineWidth=1.8; ctx.stroke(); ctx.restore();

      // pointer with dynamic glow
      const pY=cy-R*TILT-5;
      const pointerGlow=Math.min(60,20+ws.velocity*150);
      ctx.save(); ctx.shadowBlur=pointerGlow; ctx.shadowColor="#ffd700";
      ctx.beginPath(); ctx.moveTo(cx,pY); ctx.lineTo(cx-10,pY+22); ctx.lineTo(cx+10,pY+22); ctx.closePath();
      ctx.fillStyle="#ffd700"; ctx.fill(); ctx.restore();

      // particles
      for(const p of ws.particles){
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.11; p.life-=0.024;
        if(p.life>0){ ctx.beginPath();ctx.arc(p.x,p.y,3.5*p.life,0,Math.PI*2);ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${p.life})`;ctx.fill(); }
      }
      ws.particles=ws.particles.filter(p=>p.life>0);

      // jackpot screen flash
      if(ws.jackpotFlash>0){
        ws.jackpotFlash--;
        const fAlpha=(ws.jackpotFlash/55)*0.42;
        const fg=ctx.createRadialGradient(cx,cy,0,cx,cy,R*1.5);
        fg.addColorStop(0,`rgba(255,215,0,${fAlpha})`);
        fg.addColorStop(0.6,`rgba(255,140,0,${fAlpha*0.5})`);
        fg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=fg; ctx.fillRect(0,0,W,H);
        // JACKPOT text at peak
        if(ws.jackpotFlash>30){
          const tScale=Math.min(1,(55-ws.jackpotFlash)/8);
          ctx.save();
          ctx.globalAlpha=(ws.jackpotFlash-30)/25;
          ctx.font=`bold ${Math.round(22*tScale)}px monospace`;
          ctx.fillStyle="#ffd700";
          ctx.textAlign="center";
          ctx.shadowBlur=20; ctx.shadowColor="#ffd700";
          ctx.fillText("✨ JACKPOT! ✨",cx,cy-R*0.55);
          ctx.restore();
        }
      }

      rafRef.current=requestAnimationFrame(draw);
    };
    rafRef.current=requestAnimationFrame(draw);
    return()=>{alive=false;cancelAnimationFrame(rafRef.current);};
  },[]);

  const spin=useCallback(async()=>{
    const ws=wsRef.current;
    if(ws.spinning||spinning||!canSpin) return;
    setSpinning(true); setResult(null);
    const total=WHEEL_PRIZES.reduce((s,p)=>s+p.weight,0);
    let rr=Math.random()*total, prizeIdx=0;
    for(let i=0;i<WHEEL_PRIZES.length;i++){rr-=WHEEL_PRIZES[i].weight;if(rr<=0){prizeIdx=i;break;}}
    const prize=WHEEL_PRIZES[prizeIdx];

    // deterministic physics: calculate v0 so wheel naturally decelerates to prize position
    const N=WHEEL_PRIZES.length, seg=(Math.PI*2)/N, FRICTION=0.976;
    const targetFinalRot=Math.PI/2-prizeIdx*seg-seg/2;
    const curRot=ws.rot;
    let delta=((targetFinalRot-curRot%(Math.PI*2))%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
    if(delta<Math.PI*0.5) delta+=Math.PI*2;
    delta+=Math.PI*2*5; // 5 extra full rotations for drama
    // v0 = totalDistance * (1 - friction) since sum of geometric series = v0/(1-r)
    ws.velocity=delta*(1-FRICTION);
    ws.spinning=true;
    ws.settled=false;
    ws.settleCallbackFired=false;
    ws.prizeIdx=prizeIdx;
    ws.onSettle=()=>{
      setResult(prize); setSpinning(false); setCanSpin(false);
      localStorage.setItem("akr_daily_spin_ts",String(Date.now()));
    };

    postJson("/webapp/api/v2/player/action",{...authFields(auth),
      action_key:"game_daily_spin",action_request_id:buildActionRequestId("game_daily_spin"),
      payload:{prize_label:prize.label,prize_value:prize.value}}).catch(()=>{});
  },[spinning,canSpin,auth]);

  return(
    <div className="akrCard" style={{borderLeft:"3px solid #00d2ff",padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 12px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#00d2ff"}}>🎰 {isTr?"Günlük Çark":"Daily Spin"}</div>
          <div style={{fontSize:10,opacity:0.5}}>{isTr?"Günde 1 çevirme hakkı · Şansını dene":"1 spin per day · Try your luck"}</div>
        </div>
        {result&&<span style={{fontSize:14,fontWeight:800,color:result.color,fontFamily:"monospace"}}>🎉 {result.label}</span>}
      </div>
      <canvas ref={canvasRef} width={320} height={270} style={{display:"block",width:"100%"}}/>
      <div style={{padding:"0 12px 12px"}}>
        <button className="akrBtn akrBtnAccent" onClick={spin} disabled={spinning||!canSpin}
          style={{width:"100%",opacity:(spinning||!canSpin)?0.4:1}}>
          {spinning?(isTr?"Dönüyor...":"Spinning..."):!canSpin?(isTr?"Yarın tekrar gel":"Come back tomorrow"):(isTr?"Çarkı Çevir":"Spin the Wheel")}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 4 — NEXUS VAULT (Crystal Hunt · 3D bevel · risk meter)
// ═══════════════════════════════════════════════════════════════════════════════
const VAULT_GEM_REWARD=40;

function NexusVault({lang,auth,sc:_sc}:{lang:Lang;auth?:WebAppAuth|null;sc:number}){
  const isTr=lang==="tr";
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const rafRef=useRef<number>(0);
  const vRef=useRef({
    cells:[] as number[],
    revealed:Array(9).fill(false) as boolean[],
    flipAnim:Array(9).fill(0) as number[],
    phase:"playing" as "playing"|"lost"|"won"|"cashout"|"bonus",
    gemsFound:0,
    particles:[] as Particle[],
    dangerRatio:0,
  });
  const [gamePhase,setGamePhase]=useState<"playing"|"lost"|"won"|"cashout"|"bonus">("playing");
  const [gemsFound,setGemsFound]=useState(0);
  const [roundKey,setRoundKey]=useState(0);
  const [bonusChests,setBonusChests]=useState<number[]>([]);
  const [bonusPicked,setBonusPicked]=useState<number|null>(null);

  useEffect(()=>{
    const vt=vRef.current;
    const arr=[0,0,0,0,0,1,1,1,1];
    for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
    vt.cells=arr; vt.revealed=Array(9).fill(false); vt.flipAnim=Array(9).fill(0);
    vt.phase="playing"; vt.gemsFound=0; vt.particles=[]; vt.dangerRatio=0;
    setGamePhase("playing"); setGemsFound(0);
  },[roundKey]);

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    let alive=true;
    const W=canvas.width, H=canvas.height;
    const COLS2=3, cW=78, cH=72, cGap=8;
    const gridW=COLS2*cW+(COLS2-1)*cGap;
    const gridH=3*cH+2*cGap;
    const gx0=(W-gridW)/2;
    const BAR_H=10, BAR_Y=36;
    const gy0=BAR_Y+BAR_H+18+(H-BAR_Y-BAR_H-18-gridH)/2;

    const draw=()=>{
      if(!alive) return;
      const vt=vRef.current;
      const tn=Date.now()*0.001;

      ctx.fillStyle="#040010"; ctx.fillRect(0,0,W,H);

      // background nebula
      for(let i=0;i<3;i++){
        const bx=(Math.sin(i*2.1+tn*0.2)*0.5+0.5)*W;
        const by=(Math.cos(i*1.7+tn*0.15)*0.5+0.5)*H;
        const bg=ctx.createRadialGradient(bx,by,0,bx,by,90);
        const bc=i===0?"#00ff88":i===1?"#4400ff":"#00d2ff";
        bg.addColorStop(0,bc+"0a"); bg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
      }

      // holographic scan lines
      ctx.save(); ctx.globalAlpha=0.03;
      for(let y=0;y<H;y+=4){
        ctx.fillStyle=y%8===0?"rgba(0,255,136,1)":"rgba(0,100,60,1)";
        ctx.fillRect(0,y,W,1);
      }
      ctx.restore();

      // risk meter bar
      const safeRemaining=5-vt.gemsFound;
      const totalUnrevealed=9-vt.revealed.filter(Boolean).length;
      const dangerRatio=totalUnrevealed>0?(1-safeRemaining/totalUnrevealed):0;
      vt.dangerRatio=dangerRatio;
      const barX=16, barW=W-32;
      // bg
      ctx.fillStyle="rgba(255,255,255,0.06)";
      rrect(ctx,barX,BAR_Y,barW,BAR_H,4); ctx.fill();
      // fill
      if(dangerRatio>0){
        ctx.save();
        ctx.beginPath(); rrect(ctx,barX,BAR_Y,barW*dangerRatio,BAR_H,4); ctx.clip();
        const barG=ctx.createLinearGradient(barX,0,barX+barW,0);
        barG.addColorStop(0,"rgba(0,255,136,0.9)"); barG.addColorStop(0.4,"rgba(255,200,0,0.9)"); barG.addColorStop(1,"rgba(255,50,50,0.95)");
        ctx.fillStyle=barG; ctx.fillRect(barX,BAR_Y,barW,BAR_H); ctx.restore();
      }
      ctx.font="8px monospace"; ctx.textAlign="left"; ctx.textBaseline="middle";
      ctx.fillStyle="rgba(255,255,255,0.3)"; ctx.fillText("RISK",barX+3,BAR_Y+BAR_H/2);
      ctx.textAlign="right";
      ctx.fillStyle=dangerRatio>0.6?"#ff4444":dangerRatio>0.3?"#ffd700":"#00ff88";
      ctx.fillText(`${(dangerRatio*100).toFixed(0)}%`,barX+barW-3,BAR_Y+BAR_H/2);

      // flip anim progress
      for(let i=0;i<9;i++){ if(vt.revealed[i]&&vt.flipAnim[i]<1) vt.flipAnim[i]=Math.min(1,vt.flipAnim[i]+0.055); }

      // draw cells
      for(let row=0;row<3;row++){
        for(let col=0;col<COLS2;col++){
          const i=row*COLS2+col;
          const cx2=gx0+col*(cW+cGap)+cW/2, cy2=gy0+row*(cH+cGap)+cH/2;
          const fp=vt.flipAnim[i], isRevealed=vt.revealed[i], isGem=vt.cells[i]===0;
          const pulse=Math.sin(tn*2.2+i*0.8)*0.5+0.5;
          const flipScale=fp<0.5?(1-fp*2):(fp*2-1);
          const scY=Math.max(0.001,flipScale);

          ctx.save();
          // 3D drop shadow (offset, drawn first without transform)
          ctx.fillStyle="rgba(0,0,0,0.4)";
          rrect(ctx,cx2-cW/2+5,cy2-cH/2+6,cW,cH,10); ctx.fill();

          ctx.translate(cx2,cy2); ctx.scale(1,scY); ctx.translate(-cx2,-cy2);

          if(!isRevealed||fp<0.5){
            // CLOSED cell
            const glow=0.12+pulse*0.08;
            const cellG=ctx.createLinearGradient(cx2-cW/2,cy2-cH/2,cx2+cW/2,cy2+cH/2);
            cellG.addColorStop(0,`rgba(0,${80+pulse*40|0},60,${glow})`);
            cellG.addColorStop(1,`rgba(0,40,30,${glow*0.6})`);
            ctx.fillStyle=cellG; rrect(ctx,cx2-cW/2,cy2-cH/2,cW,cH,10); ctx.fill();
            // 3D bevel highlight (top-left lighter)
            const bevHL=ctx.createLinearGradient(cx2-cW/2,cy2-cH/2,cx2+cW/2,cy2+cH/2);
            bevHL.addColorStop(0,"rgba(255,255,255,0.10)"); bevHL.addColorStop(1,"rgba(0,0,0,0.18)");
            ctx.fillStyle=bevHL; rrect(ctx,cx2-cW/2,cy2-cH/2,cW,cH,10); ctx.fill();
            // border
            ctx.strokeStyle=`rgba(0,${180+pulse*60|0},120,${0.35+pulse*0.2})`; ctx.lineWidth=1.4;
            rrect(ctx,cx2-cW/2,cy2-cH/2,cW,cH,10); ctx.stroke();
            // corner shine
            ctx.strokeStyle="rgba(255,255,255,0.08)"; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(cx2-cW/2+10,cy2-cH/2); ctx.lineTo(cx2-cW/2,cy2-cH/2); ctx.lineTo(cx2-cW/2,cy2-cH/2+8); ctx.stroke();
            // mystery icon
            if(!isRevealed){
              ctx.font="bold 22px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
              ctx.fillStyle=`rgba(0,${200+pulse*55|0},140,${0.5+pulse*0.3})`;
              ctx.shadowBlur=8+pulse*6; ctx.shadowColor="#00ff88";
              ctx.fillText("?",cx2,cy2); ctx.shadowBlur=0;
            }
          } else {
            // REVEALED cell
            const revG=ctx.createLinearGradient(cx2-cW/2,cy2-cH/2,cx2+cW/2,cy2+cH/2);
            if(isGem){ revG.addColorStop(0,"rgba(0,255,136,0.22)"); revG.addColorStop(1,"rgba(0,80,50,0.12)"); }
            else { revG.addColorStop(0,"rgba(255,50,50,0.22)"); revG.addColorStop(1,"rgba(100,0,0,0.12)"); }
            ctx.fillStyle=revG; rrect(ctx,cx2-cW/2,cy2-cH/2,cW,cH,10); ctx.fill();
            ctx.strokeStyle=isGem?"rgba(0,255,136,0.6)":"rgba(255,80,80,0.6)"; ctx.lineWidth=1.8;
            rrect(ctx,cx2-cW/2,cy2-cH/2,cW,cH,10); ctx.stroke();
            ctx.font="28px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
            ctx.shadowBlur=18; ctx.shadowColor=isGem?"#00ff88":"#ff4444";
            ctx.fillText(isGem?"💎":"💀",cx2,cy2); ctx.shadowBlur=0;
          }
          ctx.restore();
        }
      }

      // particles
      for(const p of vt.particles){
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.13; p.life-=0.028;
        if(p.life>0){ ctx.beginPath();ctx.arc(p.x,p.y,3.5*p.life,0,Math.PI*2);ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${p.life})`;ctx.fill(); }
      }
      vt.particles=vt.particles.filter(p=>p.life>0);
      rafRef.current=requestAnimationFrame(draw);
    };
    rafRef.current=requestAnimationFrame(draw);
    return()=>{alive=false;cancelAnimationFrame(rafRef.current);};
  },[roundKey]);

  const revealCell=useCallback((i:number)=>{
    const vt=vRef.current;
    if(vt.revealed[i]||vt.phase!=="playing") return;
    vt.revealed[i]=true;
    const isGem=vt.cells[i]===0;
    const canvas=canvasRef.current;
    if(canvas){
      const COLS2=3, cW=78, cH=72, cGap=8;
      const gridW2=COLS2*cW+(COLS2-1)*cGap, gx0=(canvas.width-gridW2)/2;
      const BAR_H=10, BAR_Y=36;
      const gridH=3*cH+2*cGap;
      const gy0=BAR_Y+BAR_H+18+(canvas.height-BAR_Y-BAR_H-18-gridH)/2;
      const col=i%COLS2, row=Math.floor(i/COLS2);
      const cx2=gx0+col*(cW+cGap)+cW/2, cy2=gy0+row*(cH+cGap)+cH/2;
      const [pr,pg,pb]=isGem?[0,255,136]:[255,60,60];
      for(let j=0;j<(isGem?20:32);j++){
        const a=Math.random()*Math.PI*2, spd=2+Math.random()*(isGem?5:7);
        vt.particles.push({x:cx2,y:cy2,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,life:1,r:pr,g:pg,b:pb});
      }
    }
    if(!isGem){
      vt.phase="lost"; vt.revealed=Array(9).fill(true); setGamePhase("lost");
      postJson("/webapp/api/v2/player/action",{...authFields(auth),action_key:"game_nexus_vault",action_request_id:buildActionRequestId("game_nexus_vault"),payload:{gems_found:vt.gemsFound,reward_sc:0,busted:true}}).catch(()=>{});
    } else {
      vt.gemsFound++; setGemsFound(vt.gemsFound);
      if(vt.gemsFound>=5){
        vt.phase="bonus"; setGamePhase("bonus");
        const rewards=[100,200,400]; for(let i=2;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rewards[i],rewards[j]]=[rewards[j],rewards[i]];}
        setBonusChests(rewards); setBonusPicked(null);
      }
    }
  },[auth]);

  const cashOut=useCallback(()=>{
    const vt=vRef.current;
    if(vt.phase!=="playing"||vt.gemsFound===0) return;
    vt.phase="cashout"; setGamePhase("cashout");
    postJson("/webapp/api/v2/player/action",{...authFields(auth),action_key:"game_nexus_vault",action_request_id:buildActionRequestId("game_nexus_vault"),payload:{gems_found:vt.gemsFound,reward_sc:VAULT_GEM_REWARD*vt.gemsFound,busted:false}}).catch(()=>{});
  },[auth]);

  const handleCanvasClick=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    const vt=vRef.current; if(vt.phase!=="playing") return;
    const canvas=e.currentTarget;
    const rect=canvas.getBoundingClientRect();
    const scaleX2=canvas.width/rect.width, scaleY2=canvas.height/rect.height;
    const mx=(e.clientX-rect.left)*scaleX2, my=(e.clientY-rect.top)*scaleY2;
    const COLS2=3, cW=78, cH=72, cGap=8;
    const gridW2=COLS2*cW+(COLS2-1)*cGap, gx0=(canvas.width-gridW2)/2;
    const BAR_H=10, BAR_Y=36, gridH=3*cH+2*cGap;
    const gy0=BAR_Y+BAR_H+18+(canvas.height-BAR_Y-BAR_H-18-gridH)/2;
    for(let row=0;row<3;row++){
      for(let col=0;col<COLS2;col++){
        const i=row*COLS2+col;
        const cx2=gx0+col*(cW+cGap), cy2=gy0+row*(cH+cGap);
        if(mx>=cx2&&mx<=cx2+cW&&my>=cy2&&my<=cy2+cH){revealCell(i);return;}
      }
    }
  },[revealCell]);

  const earned=gemsFound*VAULT_GEM_REWARD;
  const isGameOver=gamePhase==="lost"||gamePhase==="won"||gamePhase==="cashout"||gamePhase==="bonus";

  return(
    <div className="akrCard" style={{borderLeft:"3px solid #00ff88",padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 12px 4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#00ff88"}}>💎 Nexus Vault</div>
          <div style={{fontSize:10,opacity:0.5}}>{isTr?"5 kristal bul · Tuzağa düşme · Erken çık":"Find 5 gems · Avoid traps · Cash out"}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:"#00ff88",fontFamily:"monospace",fontWeight:700}}>💎 {gemsFound}/5</div>
          {gemsFound>0&&gamePhase==="playing"&&<div style={{fontSize:10,color:"#ffd700",fontFamily:"monospace"}}>+{earned} SC</div>}
        </div>
      </div>
      <div style={{position:"relative"}}>
        <canvas ref={canvasRef} width={320} height={320}
          style={{display:"block",width:"100%",cursor:gamePhase==="playing"?"pointer":"default"}}
          onClick={handleCanvasClick}/>
        {isGameOver&&(
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(4,0,16,0.88)",backdropFilter:"blur(2px)",padding:"12px 16px"}}>
            {gamePhase==="lost"&&<>
              <div style={{fontSize:32,marginBottom:8}}>💀</div>
              <div style={{fontSize:18,fontWeight:800,color:"#ff4444",fontFamily:"monospace",textShadow:"0 0 16px #ff4444"}}>{isTr?"PATLATILDI!":"BUSTED!"}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:4}}>{isTr?`${gemsFound} kristal bulundu`:`Found ${gemsFound} gems`}</div>
            </>}
            {gamePhase==="bonus"&&<>
              <div style={{fontSize:22,marginBottom:6}}>🏆</div>
              <div style={{fontSize:14,fontWeight:800,color:"#ffd700",marginBottom:4}}>{isTr?"TÜM KRİSTALLER! BONUS SANDIK!":"ALL GEMS! BONUS CHEST!"}</div>
              <div style={{fontSize:10,opacity:0.6,marginBottom:10}}>{isTr?"Bir sandık seç — bonus ödül!":"Pick a chest — bonus reward!"}</div>
              <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                {bonusChests.map((val,idx)=>(
                  <button key={idx} onClick={()=>{
                    if(bonusPicked!==null) return;
                    setBonusPicked(idx);
                    const totalReward=VAULT_GEM_REWARD*5+200+val;
                    vRef.current.phase="won"; setGamePhase("won");
                    postJson("/webapp/api/v2/player/action",{...authFields(auth),action_key:"game_nexus_vault",action_request_id:buildActionRequestId("game_nexus_vault"),payload:{gems_found:5,reward_sc:totalReward,busted:false,bonus:val}}).catch(()=>{});
                  }}
                    style={{width:72,height:72,borderRadius:14,fontSize:28,cursor:bonusPicked===null?"pointer":"default",border:`2px solid ${bonusPicked===null?"rgba(255,215,0,0.5)":bonusPicked===idx?"#ffd700":"rgba(255,255,255,0.12)"}`,background:bonusPicked===idx?"rgba(255,215,0,0.18)":"rgba(255,255,255,0.04)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"all 0.2s",boxShadow:bonusPicked===null?"0 0 14px rgba(255,215,0,0.18)":"none"}}>
                    <span>{bonusPicked===idx?`+${val}`:"📦"}</span>
                    {bonusPicked===idx&&<span style={{fontSize:8,color:"#ffd700",marginTop:2}}>SC</span>}
                  </button>
                ))}
              </div>
            </>}
            {gamePhase==="won"&&<>
              <div style={{fontSize:32,marginBottom:8}}>🏆</div>
              <div style={{fontSize:18,fontWeight:800,color:"#ffd700",fontFamily:"monospace",textShadow:"0 0 16px #ffd700"}}>{isTr?"TAM KAZANIM!":"JACKPOT!"}</div>
              <div style={{fontSize:14,color:"#00ff88",marginTop:6,fontFamily:"monospace",fontWeight:700}}>+{VAULT_GEM_REWARD*5+200+(bonusPicked!==null?bonusChests[bonusPicked]:0)} SC</div>
              {bonusPicked!==null&&<div style={{fontSize:11,color:"#ffd700",opacity:0.8}}>💎 +{bonusChests[bonusPicked]} SC {isTr?"bonus":"bonus"}</div>}
            </>}
            {(gamePhase==="cashout")&&<>
              <div style={{fontSize:32,marginBottom:8}}>💰</div>
              <div style={{fontSize:18,fontWeight:800,color:"#00ff88",fontFamily:"monospace",textShadow:"0 0 16px #00ff88"}}>{isTr?"ÇIKARILDI!":"CASHED OUT!"}</div>
              <div style={{fontSize:14,color:"#ffd700",marginTop:6,fontFamily:"monospace",fontWeight:700}}>+{earned} SC</div>
            </>}
            {gamePhase!=="bonus"&&(
              <button onClick={()=>setRoundKey(k=>k+1)}
                style={{marginTop:16,background:"rgba(0,255,136,0.15)",border:"1px solid rgba(0,255,136,0.45)",color:"#00ff88",borderRadius:10,padding:"10px 28px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 0 16px rgba(0,255,136,0.2)"}}>
                {isTr?"Yeni Oyun":"New Game"}
              </button>
            )}
          </div>
        )}
      </div>
      {!isGameOver&&(
        <div style={{padding:"4px 12px 12px"}}>
          <button className="akrBtn" onClick={cashOut} disabled={gemsFound===0}
            style={{width:"100%",opacity:gemsFound===0?0.3:1,border:"1px solid rgba(0,255,136,0.4)",color:"#00ff88",fontSize:12,fontWeight:700}}>
            {gemsFound===0?(isTr?"Kristal seç":"Pick a crystal"):(isTr?`${earned} SC Çıkar`:`Cash Out ${earned} SC`)}
          </button>
          <div style={{fontSize:10,textAlign:"center",opacity:0.35,marginTop:5}}>{isTr?"Tuzağa basssan her şeyi kaybedersin":"Hit a trap and lose everything"}</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 5 — NEXUS SNIPER (Precision Timing · 5 shots · moving target)
// ═══════════════════════════════════════════════════════════════════════════════
type SniperShot = { x:number; y:number; hit:boolean; score:number; life:number };

function NexusSniper({lang,auth}:{lang:Lang;auth?:WebAppAuth|null}){
  const isTr=lang==="tr";
  const [phase,setPhase]=useState<"idle"|"playing"|"done">("idle");
  const [shotsLeft,setShotsLeft]=useState(5);
  const [totalScore,setTotalScore]=useState(0);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const rafRef=useRef<number>(0);
  const snRef=useRef({
    phase:"idle" as "idle"|"playing"|"done",
    shotsLeft:5, totalScore:0,
    time:0, speed:1.0,
    tx:0, ty:0,
    shots:[] as SniperShot[],
    flash:0,
  });

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    let alive=true;
    const W=canvas.width, H=canvas.height;
    const cx=W/2, cy=H/2;
    const BULL_R=16;
    let lastTime=0;

    const draw=(timestamp:number)=>{
      if(!alive) return;
      const dt=Math.min(0.05,(timestamp-lastTime)/1000); lastTime=timestamp;
      const sn=snRef.current;
      if(sn.phase==="playing") sn.time+=dt;
      const tn=sn.time;

      ctx.fillStyle="#020010"; ctx.fillRect(0,0,W,H);

      // holographic grid
      ctx.save(); ctx.globalAlpha=0.07;
      for(let gx=0;gx<W;gx+=20){ ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.strokeStyle="#ff6600";ctx.lineWidth=0.4;ctx.stroke(); }
      for(let gy=0;gy<H;gy+=20){ ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.strokeStyle="#ff6600";ctx.lineWidth=0.4;ctx.stroke(); }
      ctx.restore();

      // screen flash
      if(sn.flash>0){
        ctx.fillStyle=`rgba(255,100,0,${sn.flash*0.2})`; ctx.fillRect(0,0,W,H);
        sn.flash=Math.max(0,sn.flash-0.1);
      }

      if(sn.phase==="playing"){
        // Lissajous target movement
        const speed=sn.speed;
        const tx=cx+Math.sin(tn*speed*1.1)*W*0.30;
        const ty=cy+Math.cos(tn*speed*0.75)*H*0.28;
        sn.tx=tx; sn.ty=ty;

        // laser crosshair lines (faint)
        ctx.save(); ctx.globalAlpha=0.18; ctx.strokeStyle="#ff6600"; ctx.lineWidth=0.5;
        ctx.setLineDash([5,5]);
        ctx.beginPath();ctx.moveTo(tx,0);ctx.lineTo(tx,H);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,ty);ctx.lineTo(W,ty);ctx.stroke();
        ctx.setLineDash([]); ctx.restore();

        // target rings (3D depth)
        for(let ring=4;ring>=1;ring--){
          const rr=BULL_R*ring*1.6;
          const pulse=0.10+0.06*Math.sin(tn*3.5+ring*0.7);
          ctx.beginPath(); ctx.arc(tx,ty,rr,0,Math.PI*2);
          ctx.strokeStyle=`rgba(255,${Math.max(0,120-ring*20)},0,${pulse})`;
          ctx.lineWidth=ring===1?1.8:0.7; ctx.stroke();
        }
        // bullseye glow
        const bull=ctx.createRadialGradient(tx,ty,0,tx,ty,BULL_R*2);
        bull.addColorStop(0,"rgba(255,140,0,0.6)"); bull.addColorStop(0.6,"rgba(255,60,0,0.2)"); bull.addColorStop(1,"rgba(255,30,0,0)");
        ctx.fillStyle=bull; ctx.beginPath(); ctx.arc(tx,ty,BULL_R*2,0,Math.PI*2); ctx.fill();
        // bullseye core
        ctx.beginPath(); ctx.arc(tx,ty,BULL_R,0,Math.PI*2);
        const coreG=ctx.createRadialGradient(tx-BULL_R*0.3,ty-BULL_R*0.3,0,tx,ty,BULL_R);
        coreG.addColorStop(0,"#ff9900"); coreG.addColorStop(0.5,"#ff4400"); coreG.addColorStop(1,"#cc2200");
        ctx.fillStyle=coreG; ctx.fill();
        ctx.strokeStyle="rgba(255,200,100,0.9)"; ctx.lineWidth=1.5; ctx.stroke();
        // center dot
        ctx.beginPath(); ctx.arc(tx,ty,3,0,Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();

        // crosshair tick marks
        const tick=BULL_R+6;
        ctx.strokeStyle="rgba(255,102,0,0.7)"; ctx.lineWidth=1.5;
        [[tx,ty-tick,tx,ty-tick-8],[tx,ty+tick,tx,ty+tick+8],[tx-tick,ty,tx-tick-8,ty],[tx+tick,ty,tx+tick+8,ty]].forEach(([x1,y1,x2,y2])=>{
          ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
        });

        // HUD
        ctx.font="bold 11px monospace"; ctx.textBaseline="top";
        ctx.textAlign="left"; ctx.fillStyle="rgba(255,102,0,0.85)"; ctx.fillText(`🎯 ${sn.shotsLeft}`,10,8);
        ctx.textAlign="right"; ctx.fillStyle="rgba(255,200,100,0.85)"; ctx.fillText(`${sn.totalScore} SC`,W-10,8);
        // shot accuracy hint bar
        const hintX=cx-40, hintW=80, hintY=H-18;
        ctx.fillStyle="rgba(255,255,255,0.05)"; ctx.fillRect(hintX,hintY,hintW,4);
        const acc=Math.max(0,1-sn.speed*0.15);
        ctx.fillStyle=`rgba(255,${(acc*200)|0},0,0.6)`; ctx.fillRect(hintX,hintY,hintW*acc,4);
      }

      // shot markers (floating score text)
      for(const sh of sn.shots){
        sh.life-=0.016;
        if(sh.life>0){
          const alpha=Math.min(1,sh.life*2);
          ctx.beginPath(); ctx.arc(sh.x,sh.y,5*(1.1-sh.life*0.5),0,Math.PI*2);
          ctx.strokeStyle=`rgba(${sh.hit?"0,255,136":"255,60,60"},${alpha})`; ctx.lineWidth=2; ctx.stroke();
          ctx.beginPath(); ctx.arc(sh.x,sh.y,2,0,Math.PI*2);
          ctx.fillStyle=sh.hit?"#00ff88":"#ff4444"; ctx.fill();
          if(sh.score>0){
            ctx.font=`bold 12px monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
            ctx.globalAlpha=alpha; ctx.fillStyle=sh.hit?"#ffd700":"rgba(255,255,255,0.5)";
            ctx.fillText(`+${sh.score}`,sh.x,sh.y-(1-sh.life)*36-10);
            ctx.globalAlpha=1;
          }
        }
      }
      sn.shots=sn.shots.filter(s=>s.life>0);

      rafRef.current=requestAnimationFrame(draw);
    };
    rafRef.current=requestAnimationFrame(draw);
    return()=>{alive=false;cancelAnimationFrame(rafRef.current);};
  },[]);

  const fireShot=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    const sn=snRef.current; if(sn.phase!=="playing") return;
    const canvas=canvasRef.current; if(!canvas) return;
    const rect=canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(canvas.width/rect.width);
    const my=(e.clientY-rect.top)*(canvas.height/rect.height);
    const dx=mx-sn.tx, dy=my-sn.ty;
    const dist=Math.sqrt(dx*dx+dy*dy);
    let score=0;
    if(dist<8) score=100;
    else if(dist<18) score=60;
    else if(dist<30) score=30;
    else if(dist<50) score=10;
    const hit=dist<50;
    sn.shots.push({x:mx,y:my,hit,score,life:1});
    sn.flash=1; sn.totalScore+=score; sn.shotsLeft-=1; sn.speed+=0.1;
    setTotalScore(sn.totalScore); setShotsLeft(sn.shotsLeft);
    if(sn.shotsLeft<=0){
      sn.phase="done"; setPhase("done");
      postJson("/webapp/api/v2/player/action",{...authFields(auth),action_key:"game_nexus_sniper",action_request_id:buildActionRequestId("game_nexus_sniper"),payload:{shots:5,score_sc:sn.totalScore}}).catch(()=>{});
    }
  },[auth]);

  const startGame=useCallback(()=>{
    const sn=snRef.current;
    sn.phase="playing";sn.shotsLeft=5;sn.totalScore=0;sn.time=0;sn.shots=[];sn.flash=0;sn.speed=1.0;
    setPhase("playing");setShotsLeft(5);setTotalScore(0);
  },[]);

  const rank=totalScore>=400?(isTr?"⚡ Efsane":"⚡ Legend"):totalScore>=250?(isTr?"🎯 Keskin":"🎯 Sharp"):totalScore>=100?(isTr?"👁 Usta":"👁 Skilled"):(isTr?"🔰 Acemi":"🔰 Rookie");

  return(
    <div className="akrCard" style={{borderLeft:"3px solid #ff6600",padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 12px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#ff6600"}}>🎯 {isTr?"Nexus Nişancı":"Nexus Sniper"}</div>
          <div style={{fontSize:10,opacity:0.5}}>{isTr?"5 atış · Hedefe tam vur · SC kazan":"5 shots · Hit the mark · Earn SC"}</div>
        </div>
        {phase==="playing"&&<span style={{fontSize:12,color:"#ff6600",fontFamily:"monospace",fontWeight:700}}>{shotsLeft} 🎯 · {totalScore} SC</span>}
        {phase==="done"&&<span style={{fontSize:12,color:"#ffd700",fontFamily:"monospace",fontWeight:700}}>+{totalScore} SC</span>}
      </div>
      <div style={{position:"relative",cursor:phase==="playing"?"crosshair":"default"}}>
        <canvas ref={canvasRef} width={340} height={170} style={{display:"block",width:"100%"}}
          onClick={phase==="playing"?fireShot:undefined}/>
        {phase==="idle"&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <button onClick={e=>{e.stopPropagation();startGame();}} style={{background:"linear-gradient(135deg,#ff6600,#cc2200)",color:"#fff",border:"none",borderRadius:12,padding:"12px 36px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 0 28px rgba(255,102,0,0.55)"}}>
              {isTr?"NİŞAN AL":"TAKE AIM"}
            </button>
          </div>
        )}
        {phase==="done"&&(
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(2,0,16,0.85)"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#ff6600",fontFamily:"monospace",textShadow:"0 0 14px #ff6600"}}>{rank}</div>
            <div style={{fontSize:14,color:"#ffd700",marginTop:6,fontFamily:"monospace",fontWeight:700}}>+{totalScore} SC</div>
            <button onClick={e=>{e.stopPropagation();snRef.current.phase="idle";setPhase("idle");}} style={{marginTop:12,background:"rgba(255,102,0,0.15)",border:"1px solid rgba(255,102,0,0.4)",color:"#ff6600",borderRadius:8,padding:"8px 24px",fontSize:12,cursor:"pointer"}}>
              {isTr?"Tekrar":"Replay"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — MiniGames with 5-tab bar
// ═══════════════════════════════════════════════════════════════════════════════
export function MiniGames(props: MiniGamesProps) {
  const isTr = props.lang === "tr";
  const [activeTab, setActiveTab] = useState<TabId>("plasma");

  return (
    <div style={{ marginTop: 8 }}>
      <div className="akrCard akrCardGlow" style={{ marginBottom: 6, padding: "8px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎮</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{isTr ? "Mini Oyunlar" : "Mini Games"}</div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>{isTr ? "6 × 3D arena · SC/HC kazan" : "6 × 3D arena · Earn SC/HC"}</div>
          </div>
        </div>
      </div>

      {/* tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, padding: "0 2px" }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 700, lineHeight: 1.2,
                background: active ? `${tab.color}1a` : "rgba(255,255,255,0.03)",
                border: active ? `1.5px solid ${tab.color}` : "1.5px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                color: active ? tab.color : "rgba(255,255,255,0.30)",
                cursor: "pointer", transition: "all 0.18s",
                boxShadow: active ? `0 0 14px ${tab.color}38` : "none",
              }}>
              <div style={{ fontSize: 15, lineHeight: 1 }}>{tab.icon}</div>
              <div style={{ fontSize: 8, marginTop: 2 }}>{isTr ? tab.tr : tab.en}</div>
            </button>
          );
        })}
      </div>

      {/* active game */}
      {activeTab === "plasma" && <TapBlitz   lang={props.lang} auth={props.auth} />}
      {activeTab === "coin"   && <CoinFlip   lang={props.lang} auth={props.auth} sc={props.sc} />}
      {activeTab === "spin"   && <DailySpin  lang={props.lang} auth={props.auth} />}
      {activeTab === "vault"  && <NexusVault lang={props.lang} auth={props.auth} sc={props.sc} />}
      {activeTab === "sniper" && <NexusSniper lang={props.lang} auth={props.auth} />}
      {activeTab === "rush"   && <NexusRush  lang={props.lang} auth={props.auth} />}
    </div>
  );
}
