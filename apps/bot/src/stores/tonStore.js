// ── TON Store — DB operations for on-chain tracking ─────────

// ── Deposits ──────────────────────────────────────────────────
async function recordDeposit(db, { userId, txHash, fromAddress, tonAmount, nxtCredited, nxtRate, memo }) {
  try {
    const result = await db.query(
      `INSERT INTO ton_deposits (user_id, tx_hash, from_address, ton_amount, nxt_credited, nxt_rate, memo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tx_hash) DO NOTHING
       RETURNING id, user_id, ton_amount, nxt_credited;`,
      [userId, txHash, fromAddress, tonAmount, nxtCredited, nxtRate, memo || ""]
    );
    return result.rows[0] || null; // null = duplicate
  } catch (err) {
    if (err.code === "23505") return null; // unique violation
    throw err;
  }
}

async function getDepositByTxHash(db, txHash) {
  const result = await db.query(
    `SELECT * FROM ton_deposits WHERE tx_hash = $1 LIMIT 1;`,
    [txHash]
  );
  return result.rows[0] || null;
}

async function getUserDeposits(db, userId, limit = 10) {
  const result = await db.query(
    `SELECT id, tx_hash, from_address, ton_amount, nxt_credited, nxt_rate, memo, confirmed_at
     FROM ton_deposits
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2;`,
    [userId, Math.min(50, limit)]
  );
  return result.rows;
}

async function getLastProcessedDepositTimestamp(db) {
  const result = await db.query(
    `SELECT MAX(confirmed_at) AS last_ts FROM ton_deposits;`
  );
  return result.rows[0]?.last_ts || null;
}

// ── NXT Transfers ─────────────────────────────────────────────
async function recordNxtTransfer(db, { userId, toAddress, nanoAmount, txHash, type }) {
  const result = await db.query(
    `INSERT INTO nxt_transfers (user_id, to_address, nano_amount, tx_hash, type, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, nano_amount, type, status;`,
    [userId, toAddress, nanoAmount, txHash || null, type || "payout", txHash ? "sent" : "pending"]
  );
  return result.rows[0];
}

async function confirmNxtTransfer(db, transferId, txHash) {
  const result = await db.query(
    `UPDATE nxt_transfers
     SET status = 'confirmed', tx_hash = $2, confirmed_at = now()
     WHERE id = $1
     RETURNING *;`,
    [transferId, txHash]
  );
  return result.rows[0] || null;
}

async function failNxtTransfer(db, transferId, errorMsg) {
  const result = await db.query(
    `UPDATE nxt_transfers
     SET status = 'failed', error_msg = $2
     WHERE id = $1
     RETURNING *;`,
    [transferId, String(errorMsg || "unknown").slice(0, 500)]
  );
  return result.rows[0] || null;
}

async function getUserNxtTransfers(db, userId, limit = 10) {
  const result = await db.query(
    `SELECT id, to_address, nano_amount, tx_hash, type, status, created_at, confirmed_at
     FROM nxt_transfers
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2;`,
    [userId, Math.min(50, limit)]
  );
  return result.rows;
}

// ── House Sweeps ──────────────────────────────────────────────
async function recordSweep(db, { tonAmount, toAddress, triggeredBy }) {
  const result = await db.query(
    `INSERT INTO house_sweeps (ton_amount, to_address, triggered_by, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id, ton_amount, to_address, triggered_by;`,
    [tonAmount, toAddress, triggeredBy || "auto"]
  );
  return result.rows[0];
}

async function confirmSweep(db, sweepId, txHash) {
  const result = await db.query(
    `UPDATE house_sweeps
     SET status = 'confirmed', tx_hash = $2, confirmed_at = now()
     WHERE id = $1
     RETURNING *;`,
    [sweepId, txHash]
  );
  return result.rows[0] || null;
}

async function failSweep(db, sweepId, errorMsg) {
  const result = await db.query(
    `UPDATE house_sweeps
     SET status = 'failed', error_msg = $2
     WHERE id = $1
     RETURNING *;`,
    [sweepId, String(errorMsg || "unknown").slice(0, 500)]
  );
  return result.rows[0] || null;
}

async function getRecentSweeps(db, limit = 10) {
  const result = await db.query(
    `SELECT * FROM house_sweeps ORDER BY created_at DESC LIMIT $1;`,
    [Math.min(50, limit)]
  );
  return result.rows;
}

async function getTotalSwept(db) {
  const result = await db.query(
    `SELECT COALESCE(SUM(ton_amount), 0) AS total
     FROM house_sweeps
     WHERE status = 'confirmed';`
  );
  return Number(result.rows[0]?.total || 0);
}

// ── Game Escrows ──────────────────────────────────────────────
async function lockEscrow(db, { userId, gameType, gameRef, nxtAmount }) {
  const result = await db.query(
    `INSERT INTO game_escrows (user_id, game_type, game_ref, nxt_amount, status)
     VALUES ($1, $2, $3, $4, 'locked')
     RETURNING id, user_id, nxt_amount;`,
    [userId, gameType, gameRef, nxtAmount]
  );
  return result.rows[0];
}

async function releaseEscrow(db, escrowId) {
  const result = await db.query(
    `UPDATE game_escrows SET status = 'released', resolved_at = now() WHERE id = $1 RETURNING *;`,
    [escrowId]
  );
  return result.rows[0] || null;
}

async function forfeitEscrow(db, escrowId) {
  const result = await db.query(
    `UPDATE game_escrows SET status = 'forfeited', resolved_at = now() WHERE id = $1 RETURNING *;`,
    [escrowId]
  );
  return result.rows[0] || null;
}

async function getLockedEscrows(db, gameRef) {
  const result = await db.query(
    `SELECT * FROM game_escrows WHERE game_ref = $1 AND status = 'locked' ORDER BY created_at;`,
    [gameRef]
  );
  return result.rows;
}

// ── House Ledger ──────────────────────────────────────────────
async function recordHouseEarning(db, { source, gameRef, tonAmount, nxtAmount, note }) {
  const result = await db.query(
    `INSERT INTO house_ledger (source, game_ref, ton_amount, nxt_amount, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id;`,
    [source, gameRef || null, tonAmount || 0, nxtAmount || 0, note || null]
  );
  return result.rows[0];
}

async function getHouseStats(db, hours = 24) {
  const result = await db.query(
    `SELECT
       COUNT(*) AS total_entries,
       COALESCE(SUM(ton_amount), 0) AS total_ton,
       COALESCE(SUM(nxt_amount), 0) AS total_nxt
     FROM house_ledger
     WHERE created_at > now() - make_interval(hours => $1);`,
    [hours]
  );
  return result.rows[0];
}

module.exports = {
  recordDeposit,
  getDepositByTxHash,
  getUserDeposits,
  getLastProcessedDepositTimestamp,
  recordNxtTransfer,
  confirmNxtTransfer,
  failNxtTransfer,
  getUserNxtTransfers,
  recordSweep,
  confirmSweep,
  failSweep,
  getRecentSweeps,
  getTotalSwept,
  lockEscrow,
  releaseEscrow,
  forfeitEscrow,
  getLockedEscrows,
  recordHouseEarning,
  getHouseStats
};
