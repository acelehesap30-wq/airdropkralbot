import { useState, useCallback, useRef } from "react";
import type { Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";

type ResourceMergeProps = {
  lang: Lang;
};

function authFields() {
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

type Cell = { type: "sc" | "hc" | "rc" | "nxt" | "empty"; level: number };

const COLORS: Record<string, string> = {
  sc: "#00ff88", hc: "#00d2ff", rc: "#e040fb", nxt: "#ffd700", empty: "transparent"
};
const ICONS: Record<string, string> = {
  sc: "💰", hc: "💎", rc: "🔮", nxt: "⭐", empty: ""
};

function randomCell(): Cell {
  const types: Cell["type"][] = ["sc", "sc", "sc", "hc", "hc", "rc"];
  return { type: types[Math.floor(Math.random() * types.length)], level: 1 };
}

function initGrid(): Cell[] {
  return Array.from({ length: 16 }, () => randomCell());
}

/**
 * ResourceMerge: 4x4 grid of SC/HC/RC cells.
 * Tap two adjacent same-type cells to merge them (level up).
 * Level 3 SC = HC, Level 3 HC = RC, Level 3 RC = NXT.
 * Goal: Create NXT tokens in 30 seconds.
 */
export function ResourceMerge({ lang }: ResourceMergeProps) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [grid, setGrid] = useState<Cell[]>(initGrid());
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [merges, setMerges] = useState(0);
  const [nxtCreated, setNxtCreated] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [rewardSC, setRewardSC] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const nxtRef = useRef(0);

  const startGame = useCallback(() => {
    setGrid(initGrid());
    setSelected(null);
    setScore(0);
    setMerges(0);
    setNxtCreated(0);
    scoreRef.current = 0;
    nxtRef.current = 0;
    setTimeLeft(30);
    setRewardSC(0);
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("done");
          const earned = scoreRef.current + nxtRef.current * 50;
          setRewardSC(earned);
          // API claim
          const a = authFields();
          postJson("/webapp/api/v2/player/action", {
            ...a,
            action_key: "game_tap_blitz",
            action_request_id: buildActionRequestId("game_resource_merge"),
            payload: { taps: scoreRef.current, reward_sc: earned }
          }).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const isAdjacent = (a: number, b: number) => {
    const rowA = Math.floor(a / 4), colA = a % 4;
    const rowB = Math.floor(b / 4), colB = b % 4;
    return (Math.abs(rowA - rowB) + Math.abs(colA - colB)) === 1;
  };

  const handleCellClick = useCallback((index: number) => {
    if (phase !== "playing") return;
    const cell = grid[index];
    if (cell.type === "empty" || cell.type === "nxt") return;

    if (selected === null) {
      setSelected(index);
      return;
    }

    if (selected === index) {
      setSelected(null);
      return;
    }

    const selCell = grid[selected];

    // Check if same type + adjacent
    if (selCell.type === cell.type && selCell.level === cell.level && isAdjacent(selected, index)) {
      const newGrid = [...grid];
      const newLevel = cell.level + 1;

      if (newLevel >= 3) {
        // Promote to next tier
        const promotionMap: Record<string, Cell["type"]> = { sc: "hc", hc: "rc", rc: "nxt" };
        const promoted = promotionMap[cell.type] || "nxt";

        if (promoted === "nxt") {
          newGrid[index] = { type: "nxt", level: 1 };
          nxtRef.current += 1;
          setNxtCreated((n) => n + 1);
          scoreRef.current += 25;
          setScore((s) => s + 25);
        } else {
          newGrid[index] = { type: promoted, level: 1 };
          scoreRef.current += 10;
          setScore((s) => s + 10);
        }
      } else {
        newGrid[index] = { type: cell.type, level: newLevel };
        scoreRef.current += 5;
        setScore((s) => s + 5);
      }

      // Replace merged cell with new random
      newGrid[selected] = randomCell();
      setGrid(newGrid);
      setMerges((m) => m + 1);
    }

    setSelected(null);
  }, [phase, grid, selected]);

  return (
    <div className="akrCard" style={{ borderLeft: "3px solid #ff8800", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>⚗️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ff8800" }}>
            {isTr ? "Kaynak Birleştirme" : "Resource Merge"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>
            {isTr ? "Aynı kaynakları birleştir, NXT üret" : "Merge same resources, create NXT"}
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <>
          <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 6, lineHeight: 1.5 }}>
            {isTr
              ? "SC+SC→SC₂, SC₂+SC₂→HC | HC+HC→HC₂, HC₂+HC₂→RC | RC+RC→RC₂, RC₂+RC₂→NXT"
              : "SC+SC→SC₂, SC₂+SC₂→HC | HC+HC→HC₂, HC₂+HC₂→RC | RC+RC→RC₂, RC₂+RC₂→NXT"}
          </div>
          <button className="akrBtn akrBtnAccent" onClick={startGame} style={{ width: "100%" }}>
            {isTr ? "Başla (30s)" : "Start (30s)"}
          </button>
        </>
      )}

      {phase === "playing" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{isTr ? `Süre: ${timeLeft}s` : `Time: ${timeLeft}s`}</span>
            <span style={{ fontSize: 10, color: "#ff8800", fontFamily: "var(--font-mono)" }}>
              {score} pts | {nxtCreated} NXT
            </span>
          </div>
          <div style={{
            width: "100%", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 6
          }}>
            <div style={{
              width: `${(timeLeft / 30) * 100}%`, height: "100%",
              background: timeLeft <= 10 ? "#ff4444" : "#ff8800",
              borderRadius: 2, transition: "width 1s linear"
            }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {grid.map((cell, i) => {
              const isSelected = selected === i;
              const color = COLORS[cell.type] || "transparent";
              const icon = ICONS[cell.type] || "";
              return (
                <button
                  key={i}
                  onClick={() => handleCellClick(i)}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 8,
                    border: isSelected
                      ? `2px solid ${color}`
                      : `1px solid ${color}30`,
                    background: cell.type === "empty" ? "rgba(0,0,0,0.2)" : `${color}12`,
                    fontSize: cell.type === "nxt" ? 18 : 14,
                    cursor: cell.type === "empty" ? "default" : "pointer",
                    position: "relative",
                    transition: "all 0.15s ease",
                    transform: isSelected ? "scale(1.1)" : "scale(1)"
                  }}
                >
                  {icon}
                  {cell.level > 1 && cell.type !== "nxt" && (
                    <span style={{
                      position: "absolute", bottom: 1, right: 3,
                      fontSize: 8, color, fontWeight: 700, fontFamily: "var(--font-mono)"
                    }}>
                      {cell.level}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase === "done" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>⚗️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#ff8800", fontFamily: "var(--font-mono)" }}>
            {score} {isTr ? "puan" : "pts"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "6px 0" }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{merges} {isTr ? "birleştirme" : "merges"}</span>
            <span style={{ fontSize: 11, color: "#ffd700" }}>{nxtCreated} NXT</span>
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
