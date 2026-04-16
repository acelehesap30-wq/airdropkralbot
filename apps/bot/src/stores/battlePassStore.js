// ── Battle Pass Store — season + user progression ──────────────

async function getActiveSeason(db) {
  const result = await db.query(
    `SELECT id, name, starts_at, ends_at, premium_cost, xp_per_level, max_levels
     FROM battle_pass_seasons
     WHERE status = 'active' AND now() BETWEEN starts_at AND ends_at
     ORDER BY starts_at DESC LIMIT 1;`
  );
  return result.rows[0] || null;
}

async function getUserBattlePass(db, userId, seasonId) {
  const result = await db.query(
    `SELECT user_id, season_id, is_premium, xp_at_start, claimed_free, claimed_premium
     FROM user_battle_pass
     WHERE user_id = $1 AND season_id = $2;`,
    [userId, seasonId]
  );
  return result.rows[0] || null;
}

async function joinBattlePass(db, userId, seasonId, currentXp) {
  const result = await db.query(
    `INSERT INTO user_battle_pass (user_id, season_id, xp_at_start)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, season_id) DO NOTHING
     RETURNING user_id, season_id, is_premium, xp_at_start, claimed_free, claimed_premium;`,
    [userId, seasonId, currentXp]
  );
  return result.rows[0] || null;
}

async function upgradeToPremium(db, userId, seasonId) {
  const result = await db.query(
    `UPDATE user_battle_pass SET is_premium = TRUE
     WHERE user_id = $1 AND season_id = $2 AND is_premium = FALSE
     RETURNING user_id, season_id, is_premium;`,
    [userId, seasonId]
  );
  return result.rows[0] || null;
}

async function getRewardsForSeason(db, seasonId) {
  const result = await db.query(
    `SELECT level, tier, reward_nxt, label
     FROM battle_pass_rewards
     WHERE season_id = $1
     ORDER BY level ASC, tier DESC;`,
    [seasonId]
  );
  return result.rows;
}

async function claimLevelReward(db, userId, seasonId, level, tier) {
  const column = tier === "premium" ? "claimed_premium" : "claimed_free";
  const result = await db.query(
    `UPDATE user_battle_pass
     SET ${column} = array_append(${column}, $3)
     WHERE user_id = $1 AND season_id = $2 AND NOT ($3 = ANY(${column}))
     RETURNING user_id, ${column};`,
    [userId, seasonId, level]
  );
  return result.rows[0] || null;
}

async function getRewardByLevel(db, seasonId, level, tier) {
  const result = await db.query(
    `SELECT level, tier, reward_nxt, label
     FROM battle_pass_rewards
     WHERE season_id = $1 AND level = $2 AND tier = $3;`,
    [seasonId, level, tier]
  );
  return result.rows[0] || null;
}

module.exports = {
  getActiveSeason,
  getUserBattlePass,
  joinBattlePass,
  upgradeToPremium,
  getRewardsForSeason,
  claimLevelReward,
  getRewardByLevel
};
