// ── Config Store — game_configs CRUD ─────────────────────────

const _cache = new Map();
const CACHE_TTL_MS = 60_000; // 1 min
const _cacheTs = new Map();

async function getGameConfig(db, key) {
  const now = Date.now();
  if (_cache.has(key) && now - (_cacheTs.get(key) || 0) < CACHE_TTL_MS) {
    return _cache.get(key);
  }
  const result = await db.query(
    `SELECT value FROM game_configs WHERE key = $1;`,
    [key]
  );
  const val = result.rows[0]?.value || {};
  _cache.set(key, val);
  _cacheTs.set(key, now);
  return val;
}

async function setGameConfig(db, key, value) {
  await db.query(
    `INSERT INTO game_configs (key, value, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = now();`,
    [key, JSON.stringify(value)]
  );
  _cache.set(key, value);
  _cacheTs.set(key, Date.now());
}

async function getAllConfigs(db) {
  const result = await db.query(`SELECT key, value FROM game_configs ORDER BY key;`);
  return result.rows;
}

function invalidateCache(key) {
  if (key) { _cache.delete(key); _cacheTs.delete(key); }
  else { _cache.clear(); _cacheTs.clear(); }
}

module.exports = { getGameConfig, setGameConfig, getAllConfigs, invalidateCache };
