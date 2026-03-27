import { useState, useCallback, useRef, useEffect } from "react";
import { buildActionRequestId, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";

type Props = {
  lang: "tr" | "en";
  auth?: WebAppAuth | null;
  onClose: () => void;
};

type Block = {
  id: number;
  hash: string;
  target: string;
  nonce: number;
  difficulty: number;
  mined: boolean;
  reward: number;
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

const HEX = "0123456789abcdef";
function randomHex(len: number): string {
  return Array.from({ length: len }, () => HEX[Math.floor(Math.random() * 16)]).join("");
}

function generateBlock(id: number, difficulty: number): Block {
  const target = "0".repeat(difficulty) + randomHex(8 - difficulty);
  return {
    id,
    hash: randomHex(8),
    target,
    nonce: 0,
    difficulty,
    mined: false,
    reward: difficulty * 15,
  };
}

export function HashRacer({ lang, auth, onClose }: Props) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "mining" | "done">("idle");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalMined, setTotalMined] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [hashRate, setHashRate] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [currentHash, setCurrentHash] = useState("00000000");
  const [flash, setFlash] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalMinedRef = useRef(0);
  const totalRewardRef = useRef(0);
  const tapCountRef = useRef(0);
  const hashRateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (hashRateRef.current) clearInterval(hashRateRef.current);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startGame = useCallback(() => {
    const initialBlocks = [
      generateBlock(1, 1),
      generateBlock(2, 1),
      generateBlock(3, 2),
      generateBlock(4, 2),
      generateBlock(5, 3),
      generateBlock(6, 3),
      generateBlock(7, 4),
    ];
    setPhase("mining");
    setBlocks(initialBlocks);
    setCurrentBlock(0);
    setTimeLeft(30);
    setTotalMined(0);
    setTotalReward(0);
    setHashRate(0);
    setTapCount(0);
    setCurrentHash("00000000");
    totalMinedRef.current = 0;
    totalRewardRef.current = 0;
    tapCountRef.current = 0;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          cleanup();
          setPhase("done");
          const a = authFields(auth);
          const reward = totalRewardRef.current;
          postJson("/webapp/api/v2/player/action", {
            ...a,
            action_key: "game_hash_racer",
            action_request_id: buildActionRequestId("game_hash_racer"),
            payload: { blocks_mined: totalMinedRef.current, reward_sc: reward, total_hashes: tapCountRef.current },
          }).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Hash rate tracker
    hashRateRef.current = setInterval(() => {
      setHashRate(tapCountRef.current);
      tapCountRef.current = 0;
      setTapCount(0);
    }, 1000);
  }, [auth, cleanup]);

  const handleMine = useCallback(() => {
    if (phase !== "mining") return;

    tapCountRef.current++;
    setTapCount((p) => p + 1);

    // Generate new hash attempt
    const newHash = randomHex(8);
    setCurrentHash(newHash);

    // Check if this hash matches the target pattern (leading zeros)
    const block = blocks[currentBlock];
    if (!block) return;

    const targetPrefix = "0".repeat(block.difficulty);
    if (newHash.startsWith(targetPrefix)) {
      // Block mined!
      setFlash(true);
      setTimeout(() => setFlash(false), 300);

      const updatedBlocks = [...blocks];
      updatedBlocks[currentBlock] = { ...block, mined: true, hash: newHash, nonce: tapCountRef.current };
      setBlocks(updatedBlocks);

      totalMinedRef.current++;
      totalRewardRef.current += block.reward;
      setTotalMined(totalMinedRef.current);
      setTotalReward(totalRewardRef.current);

      if (currentBlock + 1 < blocks.length) {
        setCurrentBlock(currentBlock + 1);
      } else {
        // All blocks mined — bonus!
        totalRewardRef.current += 100;
        setTotalReward(totalRewardRef.current);
        cleanup();
        setPhase("done");
        const a = authFields(auth);
        postJson("/webapp/api/v2/player/action", {
          ...a,
          action_key: "game_hash_racer",
          action_request_id: buildActionRequestId("game_hash_racer"),
          payload: { blocks_mined: totalMinedRef.current, reward_sc: totalRewardRef.current, total_hashes: tapCountRef.current, perfect: true },
        }).catch(() => {});
      }
    }
  }, [phase, blocks, currentBlock, auth, cleanup]);

  const block = blocks[currentBlock];

  return (
    <div style={{ background: "rgba(0,0,0,0.95)", borderRadius: 16, padding: 16, marginTop: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#A855F7" }}>
            ⛏️ {isTr ? "Hash Yarışçısı" : "Hash Racer"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
            {isTr ? "Blokları kazarak NXT madenciliği yap!" : "Mine blocks by tapping to find valid hashes!"}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>

      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⛏️</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
            {isTr
              ? "Hızlıca dokunarak hash dene. Doğru hash'i bulduğunda blok kazılır ve SC kazanırsın. 7 blok, 30 saniye, artan zorluk!"
              : "Tap rapidly to try hashes. When you find a valid hash, the block is mined and you earn SC. 7 blocks, 30 seconds, increasing difficulty!"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
            {[1, 1, 2, 2, 3, 3, 4].map((d, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: 6,
                background: `rgba(168,85,247,${0.1 + d * 0.1})`,
                border: "1px solid rgba(168,85,247,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: "#A855F7",
              }}>
                {d}★
              </div>
            ))}
          </div>
          <button
            onClick={startGame}
            style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            {isTr ? "Madenciliğe Başla" : "Start Mining"}
          </button>
        </div>
      )}

      {phase === "mining" && block && (
        <>
          {/* Status bar */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>⏱ {timeLeft}s</span>
            <span style={{ fontSize: 12, color: "#FFD700", fontWeight: 700 }}>{totalReward} SC</span>
            <span style={{ fontSize: 12, color: "#A855F7" }}>⛏ {totalMined}/7</span>
            <span style={{ fontSize: 12, color: "#00D2FF" }}>{hashRate} H/s</span>
          </div>

          {/* Block progress */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {blocks.map((b, i) => (
              <div key={b.id} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: b.mined ? "#A855F7" : i === currentBlock ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.06)",
                transition: "background 0.3s",
              }} />
            ))}
          </div>

          {/* Current block info */}
          <div style={{
            background: flash ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.03)",
            borderRadius: 12,
            padding: 16,
            textAlign: "center",
            marginBottom: 12,
            border: flash ? "1px solid #A855F7" : "1px solid rgba(255,255,255,0.04)",
            transition: "all 0.2s",
          }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
              {isTr ? "Blok" : "Block"} #{block.id} · {isTr ? "Zorluk" : "Difficulty"}: {"★".repeat(block.difficulty)}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8, fontFamily: "monospace" }}>
              {isTr ? "Hedef" : "Target"}: {block.target.slice(0, block.difficulty)}{"_".repeat(8 - block.difficulty)}
            </div>

            {/* Current hash display */}
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", letterSpacing: 2, marginBottom: 4 }}>
              {currentHash.split("").map((c, i) => (
                <span key={i} style={{ color: i < block.difficulty && c === "0" ? "#A855F7" : "rgba(255,255,255,0.6)" }}>
                  {c}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
              {isTr ? "Ödül" : "Reward"}: {block.reward} SC
            </div>
          </div>

          {/* Mine button */}
          <button
            onClick={handleMine}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(124,58,237,0.3))",
              border: "2px solid rgba(168,85,247,0.5)",
              borderRadius: 16,
              padding: "24px 0",
              color: "#A855F7",
              fontSize: 20,
              fontWeight: 700,
              cursor: "pointer",
              transition: "transform 0.05s",
            }}
            onTouchStart={(e) => { (e.target as HTMLElement).style.transform = "scale(0.97)"; }}
            onTouchEnd={(e) => { (e.target as HTMLElement).style.transform = "scale(1)"; }}
          >
            ⛏️ {isTr ? "HASH DENEMESİ YAP" : "TRY HASH"}
          </button>
        </>
      )}

      {phase === "done" && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{totalMined === 7 ? "🏆" : "⛏️"}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#A855F7", marginBottom: 4 }}>
            {totalReward} SC {isTr ? "kazanıldı!" : "earned!"}
          </div>
          {totalMined === 7 && (
            <div style={{ fontSize: 13, color: "#FFD700", marginBottom: 4 }}>
              ⭐ {isTr ? "TÜM BLOKLAR KAZILDI! +100 SC bonus" : "ALL BLOCKS MINED! +100 SC bonus"}
            </div>
          )}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
            ⛏ {totalMined}/7 {isTr ? "blok kazıldı" : "blocks mined"}
          </div>

          {/* Mined blocks */}
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 16 }}>
            {blocks.map((b) => (
              <div key={b.id} style={{
                width: 32, height: 32, borderRadius: 8,
                background: b.mined ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${b.mined ? "#A855F7" : "rgba(255,255,255,0.08)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12,
              }}>
                {b.mined ? "⛏" : "·"}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={startGame}
              style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              {isTr ? "Tekrar Oyna" : "Play Again"}
            </button>
            <button
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 24px", fontSize: 14, cursor: "pointer" }}
            >
              {isTr ? "Kapat" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
