import { useState, useCallback, useRef, useEffect } from "react";
import { buildActionRequestId, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";

type Props = { lang: "tr" | "en"; auth?: WebAppAuth | null; onClose: () => void };

type Block = { id:number; difficulty:number; mined:boolean; reward:number; hash:string; nonce:number };

type MatrixColumn = { x:number; chars:string[]; y:number; speed:number };
type MineSpark = { x:number; y:number; vx:number; vy:number; life:number };

const HEX = "0123456789abcdef";
function rHex(n:number){ return Array.from({length:n},()=>HEX[Math.floor(Math.random()*16)]).join(""); }
function makeBlock(id:number,diff:number):Block{ return {id,difficulty:diff,mined:false,reward:diff*15,hash:rHex(8),nonce:0}; }

function authFields(auth?: WebAppAuth|null){
  if(auth) return {uid:auth.uid,ts:auth.ts,sig:auth.sig};
  const p=new URLSearchParams(window.location.search);
  return {uid:p.get("uid")||"",ts:p.get("ts")||String(Date.now()),sig:p.get("sig")||""};
}

export function HashRacer({ lang, auth, onClose }: Props) {
  const isTr = lang==="tr";
  const [phase, setPhase] = useState<"idle"|"mining"|"done">("idle");
  const [currentHash, setCurrentHash] = useState("00000000");
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalMined, setTotalMined] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [hashRate, setHashRate] = useState(0);
  const [mineFlash, setMineFlash] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    phase:"idle", currentHash:"00000000", blocks:[] as Block[],
    currentBlock:0, totalMined:0, totalReward:0, tapCount:0, sparks:[] as MineSpark[],
    matrix:[] as MatrixColumn[], nextId:0, flashUntil:0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const hrRef   = useRef<ReturnType<typeof setInterval>|null>(null);
  const rafRef  = useRef<number>(0);

  // Init matrix rain columns
  const initMatrix = useCallback((W:number)=>{
    const cols:MatrixColumn[] = [];
    for (let x=0;x<W;x+=12) {
      cols.push({x,chars:Array.from({length:12},()=>HEX[Math.floor(Math.random()*16)]),y:Math.random()*100,speed:0.5+Math.random()*1.5});
    }
    stateRef.current.matrix=cols;
  },[]);

  // Canvas render loop
  useEffect(()=>{
    const canvas=canvasRef.current;
    if (!canvas) return;
    const ctx=canvas.getContext("2d");
    if (!ctx) return;
    let alive=true;
    const W=canvas.width, H=canvas.height;
    initMatrix(W);

    const draw=()=>{
      if (!alive) return;
      const st=stateRef.current;
      const now=performance.now();
      ctx.clearRect(0,0,W,H);

      // Background
      ctx.fillStyle="#030810";
      ctx.fillRect(0,0,W,H);

      // Matrix rain (subtle background)
      ctx.font="10px monospace";
      for (const col of st.matrix) {
        col.y += col.speed;
        if (col.y > H+col.chars.length*12) col.y = -col.chars.length*12;
        for (let i=0;i<col.chars.length;i++) {
          const cy = col.y + i*12;
          if (cy<0 || cy>H) continue;
          const alpha = i===col.chars.length-1 ? 0.8 : 0.08*(1-i/col.chars.length);
          ctx.fillStyle = `rgba(168,85,247,${alpha})`;
          ctx.fillText(col.chars[i], col.x, cy);
        }
        // Occasionally flip a char
        if (Math.random()<0.03) col.chars[Math.floor(Math.random()*col.chars.length)]=HEX[Math.floor(Math.random()*16)];
      }

      // Flash overlay on mine
      if (now < st.flashUntil) {
        const flashAlpha = ((st.flashUntil-now)/300)*0.3;
        ctx.fillStyle=`rgba(168,85,247,${flashAlpha})`;
        ctx.fillRect(0,0,W,H);
      }

      // 3D perspective blockchain (top portion)
      const chainY = H*0.38;
      const bW=34, bH=20, bDepth=8;
      const blocks=st.blocks;
      if (blocks.length>0) {
        const totalW=blocks.length*(bW+6);
        let startX=(W-totalW)/2;
        for (let i=0;i<blocks.length;i++) {
          const bk=blocks[i];
          const x=startX+i*(bW+6), y=chainY;
          const isCurrent=i===st.currentBlock;
          const col = bk.mined ? "#a855f7" : isCurrent ? "#00d6ff" : "rgba(255,255,255,0.15)";
          const colDark = bk.mined ? "#6030a0" : isCurrent ? "#004488" : "rgba(255,255,255,0.05)";

          // Top face
          ctx.fillStyle = colDark;
          ctx.beginPath();
          ctx.moveTo(x+bDepth,y-bDepth); ctx.lineTo(x+bW+bDepth,y-bDepth);
          ctx.lineTo(x+bW,y); ctx.lineTo(x,y); ctx.closePath();
          ctx.fill();

          // Right face
          ctx.fillStyle=`rgba(0,0,0,0.5)`;
          ctx.beginPath();
          ctx.moveTo(x+bW,y); ctx.lineTo(x+bW+bDepth,y-bDepth);
          ctx.lineTo(x+bW+bDepth,y-bDepth+bH); ctx.lineTo(x+bW,y+bH); ctx.closePath();
          ctx.fill();

          // Front face
          const fGrad=ctx.createLinearGradient(x,y,x,y+bH);
          fGrad.addColorStop(0,col);
          fGrad.addColorStop(1,colDark);
          ctx.fillStyle=fGrad;
          ctx.fillRect(x,y,bW,bH);

          // Glow for current
          if (isCurrent&&!bk.mined) {
            const pulse=Math.sin(now*0.005)*0.5+0.5;
            ctx.shadowBlur=15*pulse; ctx.shadowColor="#00d6ff";
            ctx.strokeStyle="#00d6ff";
            ctx.lineWidth=1.5;
            ctx.strokeRect(x,y,bW,bH);
            ctx.shadowBlur=0;
          }

          // Difficulty stars
          ctx.fillStyle="rgba(255,255,255,0.7)";
          ctx.font="6px monospace";
          ctx.textAlign="center";
          ctx.fillText("★".repeat(bk.difficulty), x+bW/2, y+bH/2+2);

          // Chain connector
          if (i>0) {
            ctx.strokeStyle=`rgba(168,85,247,${bk.mined?0.5:0.15})`;
            ctx.lineWidth=1;
            ctx.setLineDash([3,3]);
            ctx.beginPath();
            ctx.moveTo(x-3,y+bH/2); ctx.lineTo(x-6,y+bH/2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Current hash display (center)
      if (st.phase==="mining") {
        const hash=st.currentHash;
        const block=blocks[st.currentBlock];
        const diff=block?.difficulty||1;
        ctx.font="bold 18px monospace";
        ctx.textAlign="center";
        const hx=W/2, hy=H*0.62;
        for (let i=0;i<hash.length;i++) {
          const charX = hx + (i-3.5)*14;
          const isMatch = i<diff && hash[i]==="0";
          ctx.fillStyle = isMatch ? "#a855f7" : "rgba(255,255,255,0.4)";
          ctx.shadowBlur = isMatch ? 10 : 0;
          ctx.shadowColor="#a855f7";
          ctx.fillText(hash[i], charX, hy);
        }
        ctx.shadowBlur=0;

        // Target prefix
        ctx.font="10px monospace";
        ctx.fillStyle="rgba(255,255,255,0.25)";
        ctx.fillText(`${isTr?"Hedef":"Target"}: ${"0".repeat(diff)}${"_".repeat(8-diff)}`, W/2, hy+18);
      }

      // Sparks
      for (const sp of st.sparks) {
        sp.x+=sp.vx; sp.y+=sp.vy; sp.vy+=0.1; sp.life-=0.04;
        if (sp.life>0) {
          ctx.beginPath();
          ctx.arc(sp.x,sp.y,3*sp.life,0,Math.PI*2);
          ctx.fillStyle=`rgba(168,85,247,${sp.life})`;
          ctx.fill();
        }
      }
      st.sparks=st.sparks.filter(s=>s.life>0);

      rafRef.current=requestAnimationFrame(draw);
    };
    rafRef.current=requestAnimationFrame(draw);
    return()=>{alive=false;cancelAnimationFrame(rafRef.current);};
  },[initMatrix, isTr]);

  const cleanup=useCallback(()=>{
    if(timerRef.current)clearInterval(timerRef.current);
    if(hrRef.current)clearInterval(hrRef.current);
  },[]);
  useEffect(()=>()=>cleanup(),[cleanup]);

  const handleMine=useCallback(()=>{
    const st=stateRef.current;
    if(st.phase!=="mining")return;
    st.tapCount++;
    const newHash=rHex(8);
    st.currentHash=newHash;
    setCurrentHash(newHash);

    const block=st.blocks[st.currentBlock];
    if(!block)return;
    const prefix="0".repeat(block.difficulty);
    if(newHash.startsWith(prefix)) {
      // Block mined!
      st.flashUntil=performance.now()+300;
      setMineFlash(true); setTimeout(()=>setMineFlash(false),300);

      const canvas=canvasRef.current;
      if(canvas) {
        const cx=canvas.width/2, cy=canvas.height*0.62;
        for(let i=0;i<20;i++){
          const a=Math.random()*Math.PI*2, spd=3+Math.random()*4;
          st.sparks.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,life:1});
        }
      }

      st.blocks[st.currentBlock]={...block,mined:true,hash:newHash,nonce:st.tapCount};
      setBlocks([...st.blocks]);
      st.totalMined++; st.totalReward+=block.reward;
      setTotalMined(st.totalMined); setTotalReward(st.totalReward);

      if(st.currentBlock+1<st.blocks.length) {
        st.currentBlock++;
        setCurrentBlock(st.currentBlock);
      } else {
        st.totalReward+=100;
        setTotalReward(st.totalReward);
        cleanup(); st.phase="done"; setPhase("done");
        const a=authFields(auth);
        postJson("/webapp/api/v2/player/action",{...a,
          action_key:"game_hash_racer",
          action_request_id:buildActionRequestId("game_hash_racer"),
          payload:{blocks_mined:st.totalMined,reward_sc:st.totalReward,total_hashes:st.tapCount,perfect:true}
        }).catch(()=>{});
      }
    }
  },[auth,cleanup]);

  const startGame=useCallback(()=>{
    const initialBlocks=[makeBlock(1,1),makeBlock(2,1),makeBlock(3,2),makeBlock(4,2),makeBlock(5,3),makeBlock(6,3),makeBlock(7,4)];
    const st=stateRef.current;
    st.phase="mining"; st.blocks=initialBlocks; st.currentBlock=0;
    st.totalMined=0; st.totalReward=0; st.tapCount=0; st.sparks=[];
    st.currentHash="00000000"; st.flashUntil=0;
    setPhase("mining"); setBlocks(initialBlocks); setCurrentBlock(0);
    setTimeLeft(30); setTotalMined(0); setTotalReward(0); setHashRate(0);
    setCurrentHash("00000000"); setMineFlash(false);

    timerRef.current=setInterval(()=>{
      setTimeLeft(prev=>{
        if(prev<=1){
          cleanup(); stateRef.current.phase="done"; setPhase("done");
          const a=authFields(auth);
          postJson("/webapp/api/v2/player/action",{...a,
            action_key:"game_hash_racer",
            action_request_id:buildActionRequestId("game_hash_racer"),
            payload:{blocks_mined:stateRef.current.totalMined,reward_sc:stateRef.current.totalReward,total_hashes:stateRef.current.tapCount}
          }).catch(()=>{});
          return 0;
        }
        return prev-1;
      });
    },1000);
    hrRef.current=setInterval(()=>{ setHashRate(st.tapCount); st.tapCount=0; },1000);
  },[auth,cleanup]);

  const block=blocks[currentBlock];

  return (
    <div style={{background:"rgba(3,8,16,0.98)",borderRadius:20,overflow:"hidden",border:"1px solid rgba(168,85,247,0.2)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"rgba(168,85,247,0.05)",borderBottom:"1px solid rgba(168,85,247,0.1)"}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"#a855f7",letterSpacing:1}}>◧ {isTr?"KUANTUM MADENCİ":"QUANTUM MINER"}</div>
          <div style={{fontSize:10,color:"rgba(168,85,247,0.5)",marginTop:1}}>{isTr?"Hash bul · Blok kazan · Zinciri büyüt":"Find hash · Mine block · Grow the chain"}</div>
        </div>
        <button onClick={onClose} style={{background:"rgba(168,85,247,0.1)",border:"1px solid rgba(168,85,247,0.2)",borderRadius:8,color:"rgba(255,255,255,0.5)",width:28,height:28,cursor:"pointer",fontSize:14}}>✕</button>
      </div>

      {phase==="idle"&&(
        <div style={{padding:"20px 16px",textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:16}}>
            {[1,1,2,2,3,3,4].map((d,i)=>(
              <div key={i} style={{width:30,height:30,borderRadius:6,background:`rgba(168,85,247,${0.08+d*0.06})`,border:"1px solid rgba(168,85,247,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#a855f7"}}>
                {"★".repeat(d)}
              </div>
            ))}
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:20,lineHeight:1.7}}>
            {isTr?"Her dokunuş rastgele hash üretir. Başındaki sıfır sayısı yeterince örtüşürse blok kazılır!"
            :"Each tap generates a random hash. Match enough leading zeros and the block is mined!"}
          </div>
          <button onClick={startGame} style={{background:"linear-gradient(135deg,#a855f7,#6030d0)",color:"#fff",border:"none",borderRadius:12,padding:"13px 36px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 0 30px rgba(168,85,247,0.35)"}}>
            {isTr?"MADENCİLİĞE BAŞLA":"START MINING"}
          </button>
        </div>
      )}

      {(phase==="mining"||phase==="done")&&(
        <>
          {phase==="mining"&&(
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 16px",background:"rgba(0,0,0,0.3)",fontFamily:"monospace",fontSize:11}}>
              <span style={{color:"#ff6060"}}>⏱ {String(timeLeft).padStart(2,"0")}s</span>
              <span style={{color:"#ffd700"}}>+{totalReward} SC</span>
              <span style={{color:"#a855f7"}}>⛏ {totalMined}/7</span>
              <span style={{color:"#00d6ff"}}>{hashRate} H/s</span>
            </div>
          )}

          <canvas ref={canvasRef} width={380} height={220} style={{display:"block",width:"100%"}}/>

          {phase==="mining"&&(
            <div style={{padding:"8px 16px 12px"}}>
              <button
                onClick={handleMine}
                style={{
                  width:"100%",background:mineFlash?"rgba(168,85,247,0.4)":"linear-gradient(135deg,rgba(168,85,247,0.2),rgba(96,48,208,0.2))",
                  border:`2px solid ${mineFlash?"#a855f7":"rgba(168,85,247,0.3)"}`,
                  borderRadius:14,padding:"20px 0",color:mineFlash?"#fff":"#a855f7",
                  fontSize:16,fontWeight:700,cursor:"pointer",letterSpacing:1,
                  transition:"all 0.15s",boxShadow:mineFlash?"0 0 30px rgba(168,85,247,0.6)":"none"
                }}
                onTouchStart={e=>{(e.currentTarget as HTMLElement).style.transform="scale(0.97)";}}
                onTouchEnd={e=>{(e.currentTarget as HTMLElement).style.transform="scale(1)";}}
              >
                ⛏ {isTr?"HASH DENEMESİ":"TRY HASH"}
              </button>
              {block&&(
                <div style={{textAlign:"center",marginTop:6,fontSize:10,color:"rgba(255,255,255,0.25)",fontFamily:"monospace"}}>
                  {isTr?"Blok":"Block"} #{block.id} · {"★".repeat(block.difficulty)} · {block.reward} SC
                </div>
              )}
            </div>
          )}
        </>
      )}

      {phase==="done"&&(
        <div style={{padding:"20px 16px",textAlign:"center"}}>
          <div style={{fontSize:30,fontWeight:800,color:"#a855f7",fontFamily:"monospace",marginBottom:4}}>
            +{totalReward} SC
          </div>
          {totalMined===7&&<div style={{fontSize:12,color:"#ffd700",marginBottom:8}}>⭐ {isTr?"TÜM BLOKLAR! +100 SC bonus":"ALL BLOCKS! +100 SC bonus"}</div>}
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:16}}>⛏ {totalMined}/7 {isTr?"blok":"blocks"}</div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <button onClick={startGame} style={{background:"linear-gradient(135deg,#a855f7,#6030d0)",color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              {isTr?"Tekrar":"Replay"}
            </button>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 24px",fontSize:13,cursor:"pointer"}}>
              {isTr?"Kapat":"Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
