import { useState, useCallback, useEffect, useRef } from "react";
import type { Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";

type QuickMatchProps = {
  lang: Lang;
};

function authFields() {
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

const SYMBOLS = ["💎", "⚡", "🔥", "🎯", "🪙", "⭐", "🏆", "🎰"];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * QuickMatch: Memory card matching game. Find all pairs in fewest moves.
 * 4x4 grid = 8 pairs. Score based on speed + efficiency.
 */
export function QuickMatch({ lang }: QuickMatchProps) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [rewardSC, setRewardSC] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockRef = useRef(false);

  const startGame = useCallback(() => {
    const pairs = shuffleArray([...SYMBOLS, ...SYMBOLS]);
    setCards(pairs);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setTimeElapsed(0);
    setRewardSC(0);
    setPhase("playing");
    lockRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);
  }, []);

  const handleFlip = useCallback((index: number) => {
    if (lockRef.current || phase !== "playing" || flipped.includes(index) || matched.has(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      lockRef.current = true;

      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        // Match found
        setTimeout(() => {
          setMatched((prev) => {
            const next = new Set(prev);
            next.add(newFlipped[0]);
            next.add(newFlipped[1]);

            // Check win (all 16 cards matched)
            if (next.size === 16) {
              if (timerRef.current) clearInterval(timerRef.current);
              setPhase("done");
              // Reward: more SC for fewer moves and faster time
              const movesBonus = Math.max(0, 40 - (moves + 1)) * 3;
              const earned = 20 + movesBonus;
              setRewardSC(earned);
              // API claim
              const a = authFields();
              postJson("/webapp/api/v2/player/action", {
                ...a,
                action_key: "game_quick_match",
                action_request_id: buildActionRequestId("game_quick_match"),
                payload: { moves: moves + 1, pairs: 8, reward_sc: earned }
              }).catch(() => {});
            }

            return next;
          });
          setFlipped([]);
          lockRef.current = false;
        }, 400);
      } else {
        // No match — flip back
        setTimeout(() => {
          setFlipped([]);
          lockRef.current = false;
        }, 800);
      }
    }
  }, [phase, flipped, matched, cards, moves]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div className="akrCard" style={{ borderLeft: "3px solid #00ffaa" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>🃏</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#00ffaa" }}>
            {isTr ? "Hafıza Eşleştirme" : "Quick Match"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>
            {isTr ? "Kartları eşleştir, ne kadar az hamle o kadar çok SC" : "Match cards - fewer moves = more SC"}
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <button className="akrBtn akrBtnAccent" onClick={startGame} style={{ width: "100%" }}>
          {isTr ? "Oyunu Başlat" : "Start Game"}
        </button>
      )}

      {phase === "playing" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, opacity: 0.6 }}>
              {moves} {isTr ? "hamle" : "moves"} | {timeElapsed}s
            </span>
            <span style={{ fontSize: 10, color: "#00ffaa" }}>
              {matched.size / 2}/8 {isTr ? "eşleşme" : "pairs"}
            </span>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4
          }}>
            {cards.map((symbol, i) => {
              const isFlipped = flipped.includes(i);
              const isMatched = matched.has(i);
              const isVisible = isFlipped || isMatched;
              return (
                <button
                  key={i}
                  onClick={() => handleFlip(i)}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 8,
                    border: isMatched
                      ? "1px solid rgba(0,255,170,0.3)"
                      : isFlipped
                        ? "1px solid rgba(0,210,255,0.4)"
                        : "1px solid rgba(255,255,255,0.08)",
                    background: isMatched
                      ? "rgba(0,255,170,0.08)"
                      : isFlipped
                        ? "rgba(0,210,255,0.1)"
                        : "rgba(255,255,255,0.03)",
                    fontSize: isVisible ? 20 : 14,
                    cursor: isMatched ? "default" : "pointer",
                    transition: "all 0.2s ease",
                    opacity: isMatched ? 0.5 : 1
                  }}
                >
                  {isVisible ? symbol : "?"}
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase === "done" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#00ffaa", fontFamily: "var(--font-mono)" }}>
            {isTr ? "Tamamlandı!" : "Complete!"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "6px 0" }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{moves} {isTr ? "hamle" : "moves"}</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{timeElapsed}s</span>
            <span style={{ fontSize: 11, color: "#00ff88" }}>+{rewardSC} SC</span>
          </div>
          <button className="akrBtn akrBtnGhost" onClick={startGame} style={{ width: "100%" }}>
            {isTr ? "Tekrar Oyna" : "Play Again"}
          </button>
        </div>
      )}
    </div>
  );
}
