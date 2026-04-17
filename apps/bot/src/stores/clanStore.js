// ── Clan Store — CRUD for clans and membership ─────────────────

async function createClan(db, { name, tag, leaderId }) {
  const result = await db.query(
    `INSERT INTO clans (name, tag, leader_id)
     VALUES ($1, $2, $3)
     RETURNING id, name, tag, leader_id, treasury, total_xp, member_cap, created_at;`,
    [name, tag, leaderId]
  );
  const clan = result.rows[0];
  // Add leader as first member
  await db.query(
    `INSERT INTO clan_members (user_id, clan_id, role)
     VALUES ($1, $2, 'leader');`,
    [leaderId, clan.id]
  );
  return clan;
}

async function getClanById(db, clanId) {
  const result = await db.query(
    `SELECT c.*, u.telegram_id AS leader_tg
     FROM clans c JOIN users u ON u.id = c.leader_id
     WHERE c.id = $1 AND c.disbanded_at IS NULL;`,
    [clanId]
  );
  return result.rows[0] || null;
}

async function getClanByTag(db, tag) {
  const result = await db.query(
    `SELECT * FROM clans WHERE tag = $1 AND disbanded_at IS NULL;`,
    [tag]
  );
  return result.rows[0] || null;
}

async function getUserClan(db, userId) {
  const result = await db.query(
    `SELECT c.*, cm.role, cm.contributed, cm.joined_at
     FROM clan_members cm
     JOIN clans c ON c.id = cm.clan_id
     WHERE cm.user_id = $1 AND c.disbanded_at IS NULL;`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getClanMembers(db, clanId) {
  const result = await db.query(
    `SELECT cm.user_id, cm.role, cm.contributed, cm.joined_at,
            u.telegram_id, i.public_name
     FROM clan_members cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN identities i ON i.user_id = cm.user_id
     WHERE cm.clan_id = $1
     ORDER BY cm.contributed DESC, cm.joined_at ASC;`,
    [clanId]
  );
  return result.rows;
}

async function joinClan(db, userId, clanId) {
  const result = await db.query(
    `INSERT INTO clan_members (user_id, clan_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING user_id, clan_id, role;`,
    [userId, clanId]
  );
  return result.rows[0] || null;
}

async function leaveClan(db, userId) {
  const result = await db.query(
    `DELETE FROM clan_members WHERE user_id = $1 RETURNING clan_id, role;`,
    [userId]
  );
  return result.rows[0] || null;
}

async function countMembers(db, clanId) {
  const result = await db.query(
    `SELECT COUNT(*) AS cnt FROM clan_members WHERE clan_id = $1;`,
    [clanId]
  );
  return Number(result.rows[0]?.cnt || 0);
}

async function donateToClan(db, userId, clanId, amount) {
  await db.query(
    `UPDATE clans SET treasury = treasury + $2 WHERE id = $1;`,
    [clanId, amount]
  );
  await db.query(
    `UPDATE clan_members SET contributed = contributed + $2
     WHERE user_id = $1 AND clan_id = $3;`,
    [userId, amount, clanId]
  );
}

async function addClanXp(db, clanId, xp) {
  if (!xp || xp <= 0) return;
  await db.query(
    `UPDATE clans SET total_xp = total_xp + $2 WHERE id = $1;`,
    [clanId, xp]
  );
}

async function getTopClans(db, limit = 10) {
  const result = await db.query(
    `SELECT c.id, c.name, c.tag, c.treasury, c.total_xp,
            (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) AS members
     FROM clans c
     WHERE c.disbanded_at IS NULL
     ORDER BY c.total_xp DESC, c.treasury DESC
     LIMIT $1;`,
    [limit]
  );
  return result.rows;
}

async function disbandClan(db, clanId) {
  await db.query(
    `UPDATE clans SET disbanded_at = now() WHERE id = $1;`,
    [clanId]
  );
  await db.query(`DELETE FROM clan_members WHERE clan_id = $1;`, [clanId]);
}

module.exports = {
  createClan,
  getClanById,
  getClanByTag,
  getUserClan,
  getClanMembers,
  joinClan,
  leaveClan,
  countMembers,
  donateToClan,
  addClanXp,
  getTopClans,
  disbandClan
};
