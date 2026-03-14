import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";

const { Client } = pg;

function fail(message) {
  console.error(`[env-contract] FAIL ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`[env-contract] OK   ${message}`);
}

function warn(message) {
  console.log(`[env-contract] WARN ${message}`);
}

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    fail(`missing env file: ${envPath}`);
  }
  return dotenv.parse(fs.readFileSync(envPath, "utf8"));
}

function hasValue(env, key) {
  return Boolean(String(env[key] || "").trim());
}

function assertRequired(env, key) {
  if (!hasValue(env, key)) {
    fail(`required env is empty: ${key}`);
  }
  ok(`${key} is configured`);
}

function assertUrlMatches(env, key, matcher, helpText) {
  const value = String(env[key] || "").trim();
  if (!matcher.test(value)) {
    fail(`${key} is invalid. ${helpText}`);
  }
  ok(`${key} matches expected contract`);
}

async function checkDatabase(env) {
  const connectionString = String(env.DATABASE_URL || "").trim();
  const sslEnabled = String(env.DATABASE_SSL || "").trim() === "1";
  const client = new Client({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false
  });
  try {
    await client.connect();
    const result = await client.query(
      "select current_database() as current_database, current_user as current_user, now() as now"
    );
    ok(
      `DATABASE_URL connection succeeded (${result.rows[0].current_database} as ${result.rows[0].current_user})`
    );
  } catch (error) {
    fail(`DATABASE_URL connection failed: ${error.message}`);
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors after a failed connect
    }
  }
}

async function main() {
  const envPath = path.join(process.cwd(), ".env");
  const env = readEnvFile(envPath);
  const payoutKeys = [
    "BTC_PAYOUT_ADDRESS_PRIMARY",
    "TRX_PAYOUT_ADDRESS",
    "ETH_PAYOUT_ADDRESS",
    "SOL_PAYOUT_ADDRESS",
    "TON_PAYOUT_ADDRESS"
  ];

  assertRequired(env, "BOT_TOKEN");
  assertRequired(env, "ADMIN_API_TOKEN");
  assertRequired(env, "WEBAPP_HMAC_SECRET");
  assertRequired(env, "DATABASE_URL");
  assertRequired(env, "WEBAPP_PUBLIC_URL");

  for (const key of payoutKeys) {
    assertRequired(env, key);
  }

  assertUrlMatches(
    env,
    "WEBAPP_PUBLIC_URL",
    /^https:\/\/webapp\.k99-exchange\.xyz\/webapp$/i,
    "Expected https://webapp.k99-exchange.xyz/webapp"
  );
  assertUrlMatches(
    env,
    "ADMIN_API_BASE_URL",
    /^http:\/\/127\.0\.0\.1:4000$/i,
    "Expected local admin api URL http://127.0.0.1:4000"
  );

  if (!/^postgres(ql)?:\/\//i.test(String(env.DATABASE_URL || "").trim())) {
    fail("DATABASE_URL must start with postgres:// or postgresql://");
  }
  ok("DATABASE_URL scheme looks valid");

  if (String(env.DATABASE_SSL || "").trim() !== "1") {
    warn("DATABASE_SSL is not 1. Managed Postgres deployments usually need SSL.");
  } else {
    ok("DATABASE_SSL is enabled");
  }

  if (hasValue(env, "RUNTIME_GUARD_BASE_URL")) {
    assertUrlMatches(
      env,
      "RUNTIME_GUARD_BASE_URL",
      /^https:\/\/webapp\.k99-exchange\.xyz$/i,
      "Expected https://webapp.k99-exchange.xyz"
    );
  } else {
    warn("RUNTIME_GUARD_BASE_URL is empty. Falling back to WEBAPP_PUBLIC_URL in runtime scripts.");
  }

  await checkDatabase(env);
  ok("env contract check completed");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
