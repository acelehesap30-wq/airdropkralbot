-- V088__nxt_onchain_token_tracking.sql
-- Track on-chain NXT token mints, burns, and holder snapshots for BSC integration

-- On-chain mint/burn log (backend records after each on-chain tx)
CREATE TABLE IF NOT EXISTS token_onchain_txns (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  token_symbol TEXT NOT NULL DEFAULT 'NXT',
  chain TEXT NOT NULL DEFAULT 'BSC',
  tx_type TEXT NOT NULL, -- 'mint', 'burn', 'transfer', 'buy'
  tx_hash TEXT NOT NULL,
  from_address TEXT NOT NULL DEFAULT '',
  to_address TEXT NOT NULL DEFAULT '',
  amount NUMERIC(24,8) NOT NULL,
  block_number BIGINT,
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'pending', 'confirmed', 'failed'
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'token_onchain_txns_type_check'
  ) THEN
    ALTER TABLE token_onchain_txns
      ADD CONSTRAINT token_onchain_txns_type_check
      CHECK (tx_type IN ('mint', 'burn', 'transfer', 'buy', 'airdrop'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_token_onchain_txns_hash
  ON token_onchain_txns(tx_hash) WHERE tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_token_onchain_txns_user_created
  ON token_onchain_txns(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_onchain_txns_chain_type
  ON token_onchain_txns(chain, tx_type, created_at DESC);

-- On-chain contract deployment record
CREATE TABLE IF NOT EXISTS token_contracts (
  id BIGSERIAL PRIMARY KEY,
  token_symbol TEXT NOT NULL,
  chain TEXT NOT NULL,
  chain_id INT NOT NULL,
  contract_address TEXT NOT NULL,
  deployer_address TEXT NOT NULL,
  deploy_tx_hash TEXT,
  deploy_block BIGINT,
  abi_version TEXT NOT NULL DEFAULT 'v1',
  explorer_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_token_contracts_active
  ON token_contracts(token_symbol, chain) WHERE is_active = TRUE;

-- User wallet address mapping (user links their BSC wallet for NXT)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bsc_wallet_address TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_bsc_wallet
  ON users(bsc_wallet_address) WHERE bsc_wallet_address IS NOT NULL;
