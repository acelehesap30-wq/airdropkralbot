function normalizeDraft(value) {
  return String(value || "").trim();
}

export function preserveExistingDraft(nextDraft, currentDraft, emptyStates = [""]) {
  const normalizedCurrent = normalizeDraft(currentDraft);
  if (!normalizedCurrent) {
    return String(nextDraft || "");
  }

  const emptySet = new Set((Array.isArray(emptyStates) ? emptyStates : [""]).map((entry) => normalizeDraft(entry)));
  if (emptySet.has(normalizedCurrent)) {
    return String(nextDraft || "");
  }

  return String(currentDraft || "");
}

