function isChunkLoadError(error: unknown) {
  const message =
    error instanceof Error ? `${error.name} ${error.message}` : String(error || "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("loading chunk") ||
    normalized.includes("chunkloaderror") ||
    normalized.includes("importing a module script failed") ||
    normalized.includes("failed to fetch module")
  );
}

export async function lazyRetry<T>(importer: () => Promise<T>, cacheKey: string): Promise<T> {
  try {
    const mod = await importer();
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(`akr:lazy-retry:${cacheKey}`);
    }
    return mod;
  } catch (error) {
    if (typeof window !== "undefined" && isChunkLoadError(error)) {
      const retryKey = `akr:lazy-retry:${cacheKey}`;
      const alreadyRetried = window.sessionStorage.getItem(retryKey) === "1";
      if (!alreadyRetried) {
        window.sessionStorage.setItem(retryKey, "1");
        window.location.replace(window.location.href);
        return new Promise<T>(() => {});
      }
      window.sessionStorage.removeItem(retryKey);
    }
    throw error;
  }
}
