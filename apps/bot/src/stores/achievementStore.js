// ── Achievement Store — achievements + XP/level ─────────────

const XP_PER_LEVEL = [0]; // index 0 unused; XP_PER_LEVEL[n] = XP needed for level n
for (let i = 1; i <= 100; i++) XP_PER_LEVEL.push(Math.round(100 * Math.pow(i, 1.5)));

// ── Achievements ─────────────────────────────────────────────
async function getAllAchievements(db) {
  const result = await db.query(`SELECT * FROM achievements ORDER BY id;`);
  return result.rows;
}

async function getUserAchievements(db, userId) {
  const result = await db.query(
    `SELECT a.key, a.title_tr, a.title_en, a.reward_nxt, ua.unlocked_at
     FROM user_achievements ua
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = $1
     ORDER BY ua.unlocked_at DESC;`,
    [userId]
  );
  return result.rows;
}

async function unlockAchievement(db, userId, achievementKey) {
  const ach = await db.query(`SELECT id, reward_nxt FROM achievements WHERE key = $1;`, [achievementKey]);
  if (!ach.rows[0]) return null;

  const result = await db.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, achievement_id) DO NOTHING
     RETURNING user_id, achievement_id;`,
    [userId, ach.rows[0].id]
  );
  if (!result.rows[0]) return null; // already unlocked
  return { key: achievementKey, reward_nxt: Number(ach.rows[0].reward_nxt || 0) };
}

async function hasAchievement(db, userId, achievementKey) {
  const result = await db.query(
    `SELECT 1 FROM user_achievements ua
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = $1 AND a.key = $2
     LIMIT 1;`,
    [userId, achievementKey]
  );
  return result.rows.length > 0;
}

// ── XP & Level ───────────────────────────────────────────────
async function addXp(db, userId, amount) {
  if (!amount || amount <= 0) return null;

  const result = await db.query(
    `UPDATE identities SET xp = COALESCE(xp, 0) + $2 WHERE user_id = $1
     RETURNING xp, level;`,
    [userId, amount]
  );
  if (!result.rows[0]) return null;

  const row = result.rows[0];
  const currentXp = Number(row.xp || 0);
  const currentLevel = Number(row.level || 1);
  const newLevel = computeLevel(currentXp);

  if (newLevel > currentLevel) {
    await db.query(
      `UPDATE identities SET level = $2 WHERE user_id = $1;`,
      [userId, newLevel]
    );
    return { xp: currentXp, oldLevel: currentLevel, newLevel, leveledUp: true };
  }
  return { xp: currentXp, oldLevel: currentLevel, newLevel: currentLevel, leveledUp: false };
}

function computeLevel(xp) {
  for (let lvl = XP_PER_LEVEL.length - 1; lvl >= 1; lvl--) {
    if (xp >= XP_PER_LEVEL[lvl]) return lvl;
  }
  return 1;
}

function xpForNextLevel(currentLevel) {
  const next = Math.min(currentLevel + 1, 100);
  return XP_PER_LEVEL[next] || XP_PER_LEVEL[100];
}

module.exports = {
  getAllAchievements,
  getUserAchievements,
  unlockAchievement,
  hasAchievement,
  addXp,
  computeLevel,
  xpForNextLevel,
  XP_PER_LEVEL
};
