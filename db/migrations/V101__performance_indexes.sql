-- V101: Performance indexes for NXT economy tables

CREATE INDEX IF NOT EXISTS idx_currency_balances_nxt_user
  ON currency_balances(user_id) WHERE currency = 'NXT';

CREATE INDEX IF NOT EXISTS idx_house_ledger_created
  ON house_ledger(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_house_ledger_source
  ON house_ledger(source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nxt_transfers_pending
  ON nxt_transfers(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_nxt_transfers_user_date
  ON nxt_transfers(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ton_deposits_created
  ON ton_deposits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_escrows_status
  ON game_escrows(status, game_ref);
