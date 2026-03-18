function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function withSignedAuthFields(auth, value = {}) {
  const nextValue = asRecord(value);
  return {
    ...nextValue,
    uid: auth.uid,
    ts: auth.ts,
    sig: auth.sig
  };
}
