-- V106: P2P Marketplace — NXT sell/buy orders

CREATE TABLE IF NOT EXISTS market_orders (
  id          BIGSERIAL PRIMARY KEY,
  seller_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nxt_amount  NUMERIC(18,9) NOT NULL,
  nxt_price   NUMERIC(18,9) NOT NULL,
  status      VARCHAR(16) DEFAULT 'open',
  buyer_id    BIGINT REFERENCES users(id),
  house_fee   NUMERIC(18,9) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  filled_at   TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_market_orders_open
  ON market_orders(status, created_at DESC) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_market_orders_seller
  ON market_orders(seller_id, created_at DESC);
