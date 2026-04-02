import { useState, useRef, useEffect, useCallback } from "react";
import { t, type Lang } from "../../i18n";

type OnboardingOverlayProps = {
  lang: Lang;
  onContinue: () => void;
  onLangChange?: (lang: Lang) => void;
  onNavigateTab?: (tab: string) => void;
};

const STEPS = [
  { key: "welcome", phase: "intro", label: "I" },
  { key: "onboarding_step_1", phase: "explore", label: "II" },
  { key: "onboarding_step_2", phase: "battle", label: "III" },
  { key: "onboarding_step_3", phase: "earn", label: "IV" },
  { key: "onboarding_step_4", phase: "wallet", label: "V" },
  { key: "onboarding_step_5", phase: "launch", label: "VI" },
] as const;

/* ── Canvas icon painters ── */
const DPR = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number) {
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);
  return ctx;
}

function drawCastle(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const cx = w / 2, cy = h / 2;
  // outer glow ring
  const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 56);
  glow.addColorStop(0, `rgba(56,208,255,${0.15 + Math.sin(t * 2) * 0.08})`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // base
  ctx.fillStyle = "#1a3a5c";
  ctx.fillRect(cx - 28, cy - 8, 56, 30);
  // towers
  ctx.fillStyle = "#245080";
  ctx.fillRect(cx - 30, cy - 28, 14, 42);
  ctx.fillRect(cx + 16, cy - 28, 14, 42);
  // center tower
  ctx.fillStyle = "#2e6090";
  ctx.fillRect(cx - 10, cy - 36, 20, 48);
  // windows (glow)
  ctx.fillStyle = `rgba(56,208,255,${0.6 + Math.sin(t * 3) * 0.3})`;
  ctx.fillRect(cx - 4, cy - 24, 8, 8);
  ctx.fillRect(cx - 4, cy - 10, 8, 6);
  // battlement details
  ctx.fillStyle = "#3a78a8";
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(cx + i * 8 - 3, cy - 40, 5, 6);
  }
  // flag
  ctx.strokeStyle = "#e0e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 40);
  ctx.lineTo(cx, cy - 54);
  ctx.stroke();
  ctx.fillStyle = `hsl(${(t * 30) % 360}, 70%, 60%)`;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 54);
  ctx.lineTo(cx + 10, cy - 50);
  ctx.lineTo(cx, cy - 46);
  ctx.fill();
}

function drawCompass(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const cx = w / 2, cy = h / 2, r = 30;
  // outer ring
  ctx.strokeStyle = "rgba(56,208,255,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // tick marks
  ctx.strokeStyle = "rgba(132,180,255,0.3)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    ctx.lineTo(cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 1));
    ctx.stroke();
  }
  // needle
  const angle = t * 0.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = "#38d0ff";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(-5, 6);
  ctx.lineTo(5, 6);
  ctx.fill();
  ctx.fillStyle = "#ff6b8a";
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(-5, -6);
  ctx.lineTo(5, -6);
  ctx.fill();
  ctx.restore();
  // center dot
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSwords(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const cx = w / 2, cy = h / 2;
  const swing = Math.sin(t * 2) * 0.15;
  // left sword
  ctx.save();
  ctx.translate(cx - 8, cy);
  ctx.rotate(-0.4 + swing);
  ctx.fillStyle = "#c0d0e0";
  ctx.fillRect(-2, -30, 4, 36);
  ctx.fillStyle = "#8b7355";
  ctx.fillRect(-4, 6, 8, 10);
  ctx.fillStyle = "#d4a843";
  ctx.fillRect(-6, 4, 12, 3);
  ctx.restore();
  // right sword
  ctx.save();
  ctx.translate(cx + 8, cy);
  ctx.rotate(0.4 - swing);
  ctx.fillStyle = "#c0d0e0";
  ctx.fillRect(-2, -30, 4, 36);
  ctx.fillStyle = "#8b7355";
  ctx.fillRect(-4, 6, 8, 10);
  ctx.fillStyle = "#d4a843";
  ctx.fillRect(-6, 4, 12, 3);
  ctx.restore();
  // spark effect
  const sparkAlpha = 0.4 + Math.sin(t * 6) * 0.4;
  ctx.fillStyle = `rgba(255,220,100,${sparkAlpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy - 18, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoin(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const cx = w / 2, cy = h / 2;
  const scaleX = Math.cos(t * 1.5);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(Math.abs(scaleX) * 0.8 + 0.2, 1);
  // coin body
  const coinGrad = ctx.createRadialGradient(0, -5, 2, 0, 0, 26);
  coinGrad.addColorStop(0, "#ffe066");
  coinGrad.addColorStop(0.7, "#d4a020");
  coinGrad.addColorStop(1, "#a07818");
  ctx.fillStyle = coinGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  // inner ring
  ctx.strokeStyle = "rgba(255,240,180,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.stroke();
  // symbol
  if (Math.abs(scaleX) > 0.3) {
    ctx.fillStyle = "#a07818";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 0, 1);
  }
  ctx.restore();
  // shine particles
  for (let i = 0; i < 3; i++) {
    const angle = t * 1.2 + (i / 3) * Math.PI * 2;
    const dist = 32 + Math.sin(t * 2 + i) * 4;
    ctx.fillStyle = `rgba(255,224,100,${0.3 + Math.sin(t * 3 + i) * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChainLink(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const cx = w / 2, cy = h / 2;
  const shift = Math.sin(t * 1.5) * 4;
  // left link
  ctx.strokeStyle = "#38d0ff";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 20 - shift, cy - 12);
  ctx.bezierCurveTo(cx - 36, cy - 12, cx - 36, cy + 12, cx - 20 - shift, cy + 12);
  ctx.lineTo(cx - 2, cy + 12);
  ctx.moveTo(cx - 20 - shift, cy - 12);
  ctx.lineTo(cx - 2, cy - 12);
  ctx.stroke();
  // right link
  ctx.strokeStyle = "#a78bfa";
  ctx.beginPath();
  ctx.moveTo(cx + 20 + shift, cy - 12);
  ctx.bezierCurveTo(cx + 36, cy - 12, cx + 36, cy + 12, cx + 20 + shift, cy + 12);
  ctx.lineTo(cx + 2, cy + 12);
  ctx.moveTo(cx + 20 + shift, cy - 12);
  ctx.lineTo(cx + 2, cy - 12);
  ctx.stroke();
  // connection glow
  const gAlpha = 0.4 + Math.sin(t * 3) * 0.3;
  ctx.fillStyle = `rgba(167,139,250,${gAlpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawRocket(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const cx = w / 2, cy = h / 2 + Math.sin(t * 2) * 3;
  // exhaust
  for (let i = 0; i < 4; i++) {
    const ey = cy + 22 + i * 6 + Math.sin(t * 8 + i) * 2;
    const er = 6 - i * 1.2;
    ctx.fillStyle = `rgba(255,${140 + i * 30},50,${0.6 - i * 0.14})`;
    ctx.beginPath();
    ctx.arc(cx, ey, Math.max(er, 1), 0, Math.PI * 2);
    ctx.fill();
  }
  // body
  ctx.fillStyle = "#d8e4f0";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 24);
  ctx.bezierCurveTo(cx - 10, cy - 16, cx - 10, cy + 16, cx - 8, cy + 20);
  ctx.lineTo(cx + 8, cy + 20);
  ctx.bezierCurveTo(cx + 10, cy + 16, cx + 10, cy - 16, cx, cy - 24);
  ctx.fill();
  // window
  ctx.fillStyle = "#38d0ff";
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 5, 0, Math.PI * 2);
  ctx.fill();
  // fins
  ctx.fillStyle = "#5080b0";
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 14);
  ctx.lineTo(cx - 16, cy + 22);
  ctx.lineTo(cx - 8, cy + 20);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 8, cy + 14);
  ctx.lineTo(cx + 16, cy + 22);
  ctx.lineTo(cx + 8, cy + 20);
  ctx.fill();
  // stars
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 6; i++) {
    const sx = cx + Math.sin(t + i * 1.1) * 36;
    const sy = cy + Math.cos(t * 0.7 + i * 1.7) * 28;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

const PAINTERS: Record<string, (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void> = {
  intro: drawCastle,
  explore: drawCompass,
  battle: drawSwords,
  earn: drawCoin,
  wallet: drawChainLink,
  launch: drawRocket,
};

/* ── Animated step canvas ── */
function StepCanvas({ phase }: { phase: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 120, H = 120;
    const ctx = setupCanvas(canvas, W, H);
    const painter = PAINTERS[phase] || drawCastle;
    startRef.current = performance.now();

    const loop = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      ctx.clearRect(0, 0, W, H);
      painter(ctx, W, H, elapsed);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 120, height: 120, display: "block", margin: "0 auto 12px" }}
    />
  );
}

/* ── Step indicator dots (no emojis) ── */
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="akrOnboardingSteps">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`akrOnboardingStep${i === current ? " isActive" : ""}${i < current ? " isDone" : ""}`}
        >
          <span className="akrOnboardingStepIcon"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: "50%", fontSize: 11, fontWeight: 700,
              background: i < current
                ? "rgba(52,211,153,0.25)"
                : i === current
                  ? "rgba(56,208,255,0.25)"
                  : "rgba(132,180,255,0.1)",
              color: i < current ? "#34d399" : i === current ? "#38d0ff" : "rgba(200,220,255,0.4)",
              border: `1px solid ${i < current ? "rgba(52,211,153,0.3)" : i === current ? "rgba(56,208,255,0.4)" : "rgba(132,180,255,0.1)"}`,
            }}
          >
            {i < current ? "\u2713" : STEPS[i].label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function OnboardingOverlay(props: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  const goNext = useCallback(() => {
    if (isLastStep) {
      props.onContinue();
    } else {
      setStep((s) => s + 1);
    }
  }, [isLastStep, props.onContinue]);

  const goPrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const renderWelcomeStep = () => (
    <div className="akrOnboardingWelcome">
      <StepCanvas phase="intro" />
      <h1 className="akrOnboardingHeadline">{t(props.lang, "onboarding_welcome_headline")}</h1>
      <p className="akrOnboardingSub">{t(props.lang, "onboarding_welcome_sub")}</p>

      <div className="akrOnboardingLangPicker">
        <button
          className={`akrBtn akrBtnSmall${props.lang === "tr" ? " akrBtnAccent" : " akrBtnGhost"}`}
          onClick={() => props.onLangChange?.("tr")}
        >
          TR Turkce
        </button>
        <button
          className={`akrBtn akrBtnSmall${props.lang === "en" ? " akrBtnAccent" : " akrBtnGhost"}`}
          onClick={() => props.onLangChange?.("en")}
        >
          EN English
        </button>
      </div>

      <div className="akrOnboardingTrust">
        <h3 className="akrOnboardingTrustTitle">{t(props.lang, "onboarding_trust_title")}</h3>
        <ul className="akrOnboardingTrustList">
          <li>{t(props.lang, "onboarding_trust_1")}</li>
          <li>{t(props.lang, "onboarding_trust_2")}</li>
          <li>{t(props.lang, "onboarding_trust_3")}</li>
        </ul>
      </div>
    </div>
  );

  const renderGuideStep = () => (
    <div className="akrOnboardingGuide">
      <StepCanvas phase={current.phase} />
      <p className="akrOnboardingStepDesc">{t(props.lang, current.key)}</p>
      {current.phase === "wallet" && (
        <p className="akrOnboardingHint">{t(props.lang, "onboarding_wallet_hint")}</p>
      )}
    </div>
  );

  const renderLaunchStep = () => (
    <div className="akrOnboardingLaunch">
      <StepCanvas phase="launch" />
      <p className="akrOnboardingStepDesc">{t(props.lang, current.key)}</p>
      <div className="akrOnboardingQuickActions">
        <button
          className="akrBtn akrBtnPrimary"
          onClick={() => {
            props.onNavigateTab?.("tasks");
            props.onContinue();
          }}
        >
          {t(props.lang, "onboarding_first_task")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="akrOnboardingOverlay">
      <div className="akrOnboardingCard">
        <h2 className="akrOnboardingTitle">{t(props.lang, "onboarding_title")}</h2>

        {/* Step progress bar */}
        <div className="akrOnboardingProgress">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`akrOnboardingProgressSegment${i <= step ? " isFilled" : ""}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="akrOnboardingContent">
          {current.phase === "intro" && renderWelcomeStep()}
          {current.phase === "launch" && renderLaunchStep()}
          {current.phase !== "intro" && current.phase !== "launch" && renderGuideStep()}
        </div>

        {/* Step indicator */}
        <StepDots total={STEPS.length} current={step} />

        {/* Navigation */}
        <div className="akrOnboardingActions">
          {step > 0 && (
            <button className="akrBtn akrBtnGhost" onClick={goPrev}>
              {t(props.lang, "nav_back")}
            </button>
          )}
          {step === 0 && <div />}
          <button className="akrBtn akrBtnAccent" onClick={goNext}>
            {isLastStep
              ? t(props.lang, "onboarding_continue")
              : t(props.lang, "nav_next")
            }
          </button>
        </div>
      </div>
    </div>
  );
}
