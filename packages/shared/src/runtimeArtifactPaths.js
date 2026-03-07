"use strict";

const path = require("path");

function resolveRuntimeArtifactsDir(repoRootDir) {
  const repoRoot = path.resolve(String(repoRootDir || process.cwd()));
  const explicit = String(process.env.AKB_RUNTIME_ARTIFACT_DIR || "").trim();
  if (!explicit) {
    return path.join(repoRoot, ".runtime-artifacts");
  }
  if (path.isAbsolute(explicit)) {
    return explicit;
  }
  return path.resolve(repoRoot, explicit);
}

function resolveKpiBundleArtifactPaths(repoRootDir) {
  const rootDir = resolveRuntimeArtifactsDir(repoRootDir);
  const outDir = path.join(rootDir, "kpi");
  return {
    outDir,
    latestJsonPath: path.join(outDir, "V5_KPI_BUNDLE_latest.json"),
    latestMdPath: path.join(outDir, "V5_KPI_BUNDLE_latest.md")
  };
}

module.exports = {
  resolveRuntimeArtifactsDir,
  resolveKpiBundleArtifactPaths
};
