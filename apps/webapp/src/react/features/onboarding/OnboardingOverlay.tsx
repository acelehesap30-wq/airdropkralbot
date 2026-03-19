import { useState } from "react";
import { t, type Lang } from "../../i18n";

type OnboardingOverlayProps = {
  lang: Lang;
  onContinue: () => void;
  onLangChange?: (lang: Lang) => void;
  onNavigateTab?: (tab: string) => void;
};

const STEPS = [
  { icon: "🌌", key: "welcome", phase: "intro" },
  { icon: "🏠", key: "onboarding_step_1", phase: "explore" },
  { icon: "⚔️", key: "onboarding_step_2", phase: "battle" },
  { icon: "💰", key: "onboarding_step_3", phase: "earn" },
  { icon: "🔗", key: "onboarding_step_4", phase: "wallet" },
  { icon: "🎯", key: "onboarding_step_5", phase: "launch" },
] as const;

export function OnboardingOverlay(props: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  const renderWelcomeStep = () => (
    <div className="akrOnboardingWelcome">
      <div className="akrOnboardingLogo">🏰</div>
      <h1 className="akrOnboardingHeadline">{t(props.lang, "onboarding_welcome_headline")}</h1>
      <p className="akrOnboardingSub">{t(props.lang, "onboarding_welcome_sub")}</p>

      <div className="akrOnboardingLangPicker">
        <button
          className={`akrBtn akrBtnSmall${props.lang === "tr" ? " akrBtnAccent" : " akrBtnGhost"}`}
          onClick={() => props.onLangChange?.("tr")}
        >
          🇹🇷 Türkçe
        </button>
        <button
          className={`akrBtn akrBtnSmall${props.lang === "en" ? " akrBtnAccent" : " akrBtnGhost"}`}
          onClick={() => props.onLangChange?.("en")}
        >
          🇬🇧 English
        </button>
      </div>

      <div className="akrOnboardingTrust">
        <h3 className="akrOnboardingTrustTitle">{t(props.lang, "onboarding_trust_title")}</h3>
        <ul className="akrOnboardingTrustList">
          <li>✅ {t(props.lang, "onboarding_trust_1")}</li>
          <li>✅ {t(props.lang, "onboarding_trust_2")}</li>
          <li>✅ {t(props.lang, "onboarding_trust_3")}</li>
        </ul>
      </div>
    </div>
  );

  const renderGuideStep = () => (
    <div className="akrOnboardingGuide">
      <div className="akrOnboardingStepHero">
        <span className="akrOnboardingStepHeroIcon">{current.icon}</span>
      </div>
      <p className="akrOnboardingStepDesc">{t(props.lang, current.key)}</p>
      {current.phase === "wallet" && (
        <p className="akrOnboardingHint">{t(props.lang, "onboarding_wallet_hint")}</p>
      )}
    </div>
  );

  const renderLaunchStep = () => (
    <div className="akrOnboardingLaunch">
      <div className="akrOnboardingStepHero">
        <span className="akrOnboardingStepHeroIcon">🚀</span>
      </div>
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
        <div className="akrOnboardingSteps">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`akrOnboardingStep${i === step ? " isActive" : ""}${i < step ? " isDone" : ""}`}
            >
              <span className="akrOnboardingStepIcon">{i < step ? "✅" : s.icon}</span>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="akrOnboardingActions">
          {step > 0 && (
            <button
              className="akrBtn akrBtnGhost"
              onClick={() => setStep(step - 1)}
            >
              ← {props.lang === "en" ? "Back" : "Geri"}
            </button>
          )}
          {step === 0 && <div />}
          <button
            className="akrBtn akrBtnAccent"
            onClick={() => {
              if (isLastStep) {
                props.onContinue();
              } else {
                setStep(step + 1);
              }
            }}
          >
            {isLastStep
              ? t(props.lang, "onboarding_continue")
              : props.lang === "en" ? "Next →" : "İleri →"
            }
          </button>
        </div>
      </div>
    </div>
  );
}
