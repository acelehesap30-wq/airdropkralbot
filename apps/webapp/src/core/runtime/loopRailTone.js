function toToneKey(value) {
  const tone = String(value || "neutral").trim().toLowerCase();
  if (tone === "safe") return "advantage";
  if (tone === "aggressive") return "pressure";
  if (["neutral", "balanced", "advantage", "pressure", "critical"].includes(tone)) {
    return tone;
  }
  return "neutral";
}

export function resolveLoopRailTone(baseTone, slot = "family") {
  const tone = toToneKey(baseTone);
  switch (slot) {
    case "family":
      return tone;
    case "flow":
      if (tone === "critical") return "pressure";
      if (tone === "pressure") return "balanced";
      if (tone === "advantage") return "safe";
      return "balanced";
    case "summary":
      if (tone === "neutral") return "balanced";
      if (tone === "advantage") return "safe";
      return tone;
    case "gate":
      if (tone === "advantage") return "balanced";
      if (tone === "neutral") return "pressure";
      return tone;
    case "lead":
      if (tone === "critical") return "pressure";
      return "balanced";
    case "window":
      if (tone === "critical") return "pressure";
      if (tone === "advantage") return "safe";
      return "balanced";
    case "pressure":
      if (tone === "advantage") return "balanced";
      if (tone === "neutral") return "pressure";
      return tone;
    case "response":
      if (tone === "critical") return "balanced";
      if (tone === "pressure") return "advantage";
      if (tone === "neutral") return "balanced";
      return "safe";
    case "attention":
      if (tone === "neutral") return "balanced";
      return tone;
    case "cadence":
      if (tone === "critical") return "pressure";
      if (tone === "neutral") return "balanced";
      if (tone === "advantage") return "safe";
      return "balanced";
    default:
      return tone;
  }
}
