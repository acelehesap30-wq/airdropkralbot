-- V100: Achievement system + player XP/level

CREATE TABLE IF NOT EXISTS achievements (
  id            SERIAL PRIMARY KEY,
  key           VARCHAR(64) UNIQUE NOT NULL,
  title_tr      VARCHAR(128) NOT NULL,
  title_en      VARCHAR(128) NOT NULL,
  description_tr VARCHAR(256) DEFAULT '',
  description_en VARCHAR(256) DEFAULT '',
  reward_nxt    NUMERIC(18,9) DEFAULT 0,
  condition_json JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INT NOT NULL REFERENCES achievements(id),
  unlocked_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements(user_id);

-- XP and level on identities
ALTER TABLE identities ADD COLUMN IF NOT EXISTS xp BIGINT DEFAULT 0;
ALTER TABLE identities ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;

-- Seed achievements
INSERT INTO achievements (key, title_tr, title_en, description_tr, description_en, reward_nxt, condition_json) VALUES
  ('first_deposit',   'Ilk Yatirim',       'First Deposit',      'Ilk TON yatirimini yap',          'Make your first TON deposit',       100,  '{"type":"deposit_count","threshold":1}'),
  ('slot_master',     'Slot Ustasi',        'Slot Master',        '100 slot oyunu oyna',              'Play 100 slot games',               500,  '{"type":"slot_count","threshold":100}'),
  ('duel_champion',   'Duel Sampiyonu',     'Duel Champion',      '10 duel kazan',                    'Win 10 duels',                      300,  '{"type":"duel_wins","threshold":10}'),
  ('streak_king',     'Streak Krali',       'Streak King',        '30 gun ust uste checkin yap',      'Check in 30 days in a row',         1000, '{"type":"streak","threshold":30}'),
  ('referral_boss',   'Referral Patronu',   'Referral Boss',      '10 kisi davet et',                 'Invite 10 people',                  2000, '{"type":"referral_count","threshold":10}'),
  ('whale',           'Balina',             'Whale',              '50K NXT bakiyeye ulas',            'Reach 50K NXT balance',             0,    '{"type":"balance","threshold":50000}'),
  ('tournament_victor','Turnuva Galibi',    'Tournament Victor',  'Bir turnuva kazan',                'Win a tournament',                  500,  '{"type":"tournament_wins","threshold":1}'),
  ('high_roller',     'Yuksek Bahisci',     'High Roller',        'Tek seferde 5000+ NXT bahis koy',  'Place a single bet of 5000+ NXT',   200,  '{"type":"max_bet","threshold":5000}'),
  ('lucky_seven',     'Sansli Yedili',      'Lucky Seven',        '7 gun streak bonus al',            'Get 7-day streak bonus',            150,  '{"type":"streak","threshold":7}'),
  ('centurion',       'Yuzbasci',           'Centurion',          'Seviye 100e ulas',                 'Reach level 100',                   5000, '{"type":"level","threshold":100}')
ON CONFLICT (key) DO NOTHING;
