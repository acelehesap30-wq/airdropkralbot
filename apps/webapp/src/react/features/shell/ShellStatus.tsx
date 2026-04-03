import { useEffect, useState } from "react";
import { t, type Lang } from "../../i18n";

type ShellStatusProps = {
  lang: Lang;
  loading: boolean;
  error: string;
};

export function ShellStatus(props: ShellStatusProps) {
  const [dismissed, setDismissed] = useState(false);
  const [prevError, setPrevError] = useState("");

  // Reset dismissed state when error changes
  useEffect(() => {
    if (props.error && props.error !== prevError) {
      setDismissed(false);
      setPrevError(props.error);
    }
  }, [props.error, prevError]);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!props.error || dismissed) return;
    const timer = setTimeout(() => setDismissed(true), 6000);
    return () => clearTimeout(timer);
  }, [props.error, dismissed]);

  return (
    <>
      {props.loading && (
        <div className="akrToast" style={{
          position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, padding: "8px 16px", borderRadius: 10,
          background: "rgba(0,214,255,0.12)", border: "1px solid rgba(0,214,255,0.2)",
          color: "#00d6ff", fontSize: 12, fontWeight: 600, backdropFilter: "blur(8px)",
          animation: "none", pointerEvents: "none"
        }}>
          {t(props.lang, "loading")}
        </div>
      )}
      {props.error && !props.loading && !dismissed && (
        <div className="akrToast akrToastError" style={{
          position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, padding: "10px 16px", borderRadius: 12,
          background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.25)",
          color: "#ff6b6b", fontSize: 12, fontWeight: 600, backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", gap: 10, maxWidth: "90vw"
        }}>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t(props.lang, "error_prefix")}: {props.error}
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6, color: "rgba(255,255,255,0.6)", padding: "3px 10px",
              fontSize: 10, cursor: "pointer", whiteSpace: "nowrap"
            }}
          >
            {props.lang === "tr" ? "Kapat" : "Dismiss"}
          </button>
        </div>
      )}
    </>
  );
}

