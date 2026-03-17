type RouteStripStep = {
  kicker: string;
  title: string;
  body: string;
  stateLabel: string;
  signals?: string[];
  tone?: "active" | "done" | "idle";
  onClick?: () => void;
};

type RouteStripProps = {
  panelKey: string;
  focusKey: string;
  title: string;
  body: string;
  steps: RouteStripStep[];
};

export function RouteStrip(props: RouteStripProps) {
  return (
    <section className="akrRouteStrip" data-akr-panel-key={props.panelKey} data-akr-focus-key={props.focusKey}>
      <div className="akrRouteStripHeader">
        <p className="akrKicker">{props.title}</p>
        <p className="akrMuted">{props.body}</p>
      </div>
      <div className="akrRouteStripGrid">
        {props.steps.map((step, index) => {
          const toneClassName =
            step.tone === "active" ? "akrRouteStep isActive" : step.tone === "done" ? "akrRouteStep isDone" : "akrRouteStep";
          return (
            <button type="button" key={`${props.focusKey}_${index}_${step.title}`} className={toneClassName} onClick={step.onClick}>
              <span className="akrRouteStepIndex">{String(index + 1).padStart(2, "0")}</span>
              <span className="akrKicker">{step.kicker}</span>
              <strong>{step.title}</strong>
              <span className="akrRouteStepStatus">{step.stateLabel}</span>
              {step.signals?.length ? (
                <div className="akrChipRow akrRouteStepSignals">
                  {step.signals.map((signal) => (
                    <span key={`${props.focusKey}_${index}_${signal}`} className="akrChip">
                      {signal}
                    </span>
                  ))}
                </div>
              ) : null}
              <p>{step.body}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
