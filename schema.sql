-- ============================================================================
-- OTS Desk — PostgreSQL Database Schema (v1)
-- Order Management & Profit Tracking SaaS
-- Operated by HZ Creations Ltd (beta) → future IT company
-- ============================================================================
-- Run order: this file creates every table, index, trigger and helper.
-- Engine: PostgreSQL 15+
-- ============================================================================

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS  (fixed value sets — keeps data clean, prevents typos)
-- ---------------------------------------------------------------------------
CREATE TYPE user_role         AS ENUM ('owner', 'user');
CREATE TYPE subscription_state AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');
CREATE TYPE order_status       AS ENUM (
  'to_ship','label_created','preparing','on_hold','on_the_way',
  'in_transit','out_for_delivery','delivered','completed','cancelled','refunded'
);

-- ---------------------------------------------------------------------------
-- USERS  (one row per account — sellers + the owner)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name         TEXT        NOT NULL,
  last_name          TEXT        NOT NULL,
  email              CITEXT      NOT NULL UNIQUE,      -- case-insensitive email
  phone              TEXT        NOT NULL,
  company_name       TEXT,                             -- optional
  password_hash      TEXT        NOT NULL,             -- bcrypt/argon2 hash, never plain
  role               user_role   NOT NULL DEFAULT 'user',
  primary_platform   TEXT,                             -- Walmart / TikTok Shop / etc.
  heard_from         TEXT,                             -- Google / Facebook / Friend...
  email_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
  -- billing cycle anchors to this date (registration-date cycle, not calendar month)
  registered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users (email);

-- ---------------------------------------------------------------------------
-- OTP CODES  (email verification + password reset)
-- ---------------------------------------------------------------------------
CREATE TABLE otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  email       CITEXT      NOT NULL,          -- allow OTP before user row exists (signup)
  code_hash   TEXT        NOT NULL,          -- store HASH of the 6-digit code, not the code
  purpose     TEXT        NOT NULL,          -- 'signup' | 'reset'
  expires_at  TIMESTAMPTZ NOT NULL,          -- typically now() + 10 minutes
  consumed    BOOLEAN     NOT NULL DEFAULT FALSE,
  attempts    INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_email_purpose ON otp_codes (email, purpose);

-- ---------------------------------------------------------------------------
-- SUBSCRIPTIONS  (one active row per user — PayPal now, Stripe later)
-- ---------------------------------------------------------------------------
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state                 subscription_state NOT NULL DEFAULT 'trialing',
  provider              TEXT,                    -- 'paypal' | 'stripe' | 'manual_beta'
  provider_sub_id       TEXT,                    -- PayPal subscription ID
  price_usd             NUMERIC(8,2) NOT NULL DEFAULT 9.99,
  trial_ends_at         TIMESTAMPTZ,             -- end of the free month
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,             -- next charge date (cycle anchor)
  reminder_7d_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_3d_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subs_user ON subscriptions (user_id);
CREATE INDEX idx_subs_state ON subscriptions (state);

-- ---------------------------------------------------------------------------
-- USER SETTINGS  (platform fee %, category fees, cost defaults)
--   Stored as JSONB so each user can add unlimited platforms/categories.
-- ---------------------------------------------------------------------------
CREATE TABLE user_settings (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- e.g. [{"platform":"Walmart","category":"Electronics","pct":8},
  --       {"platform":"Walmart","category":null,"pct":15}, ...]
  platform_fees  JSONB NOT NULL DEFAULT '[]',
  default_prep   NUMERIC(8,2) NOT NULL DEFAULT 1.50,
  default_label  NUMERIC(8,2) NOT NULL DEFAULT 4.25,
  sort_newest_first BOOLEAN NOT NULL DEFAULT TRUE,
  column_layout  JSONB NOT NULL DEFAULT '[]',   -- saved show/hide + order of columns
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ORDERS  (the heart of the system)
--   Raw input columns are stored. Calculated columns (item cost, total cost,
--   net profit, margin, loss) are DERIVED — see the calc helpers below so the
--   formulas live in one place and can never "break".
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- serial number is assigned per user PER BILLING-CYCLE MONTH, locked to date.
  serial_no          INT,                    -- 1,2,3... within the cycle month
  cycle_month        TEXT,                   -- 'YYYY-MM' bucket used for the month tabs

  -- order identity & dates
  platform_order_id  TEXT,
  order_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  ship_by            DATE,
  est_delivery       DATE,                   -- platform estimate
  exp_delivery       DATE,                   -- carrier expected delivery
  note               TEXT,

  -- status & supplier
  status             order_status NOT NULL DEFAULT 'to_ship',
  supplier           TEXT,                   -- Amazon / Walmart / Sam's Club ...
  supplier_order_id  TEXT,
  supplier_est_delivery DATE,
  sku                TEXT,

  -- money inputs
  qty                INT          NOT NULL DEFAULT 1,
  per_item_cost      NUMERIC(10,2) NOT NULL DEFAULT 0,
  selling_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  prep_cost          NUMERIC(10,2) NOT NULL DEFAULT 0,
  label_cost         NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  fee_is_manual      BOOLEAN NOT NULL DEFAULT FALSE,   -- true = user typed exact fee
  refund_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- shipping
  carrier            TEXT,                   -- UPS / USPS / FedEx ...
  tracking_number    TEXT,
  label_created_date DATE,

  -- customer
  customer_name      TEXT,
  customer_phone     TEXT,
  address_line1      TEXT,
  address_line2      TEXT,
  city               TEXT,
  state              TEXT,
  zip                TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- duplicate-safe imports: same platform_order_id can't exist twice per user
  CONSTRAINT uq_user_platform_order UNIQUE (user_id, platform_order_id)
);
CREATE INDEX idx_orders_user_cycle ON orders (user_id, cycle_month);
CREATE INDEX idx_orders_user_date  ON orders (user_id, order_date);
CREATE INDEX idx_orders_sku        ON orders (user_id, sku);
CREATE INDEX idx_orders_status     ON orders (user_id, status);

-- ---------------------------------------------------------------------------
-- INVENTORY  (2-step / FBM stock by SKU)
--   Sold units are computed live from orders, so we only store what's added.
-- ---------------------------------------------------------------------------
CREATE TABLE inventory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sku           TEXT NOT NULL,
  source        TEXT,                         -- bought from
  qty_added     INT  NOT NULL DEFAULT 0,
  purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0,  -- total, not per-item
  other_expense NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_sku UNIQUE (user_id, sku)   -- one stock row per SKU; re-adds accumulate
);
CREATE INDEX idx_inventory_user ON inventory (user_id);

-- ---------------------------------------------------------------------------
-- AUDIT / ACTIVITY LOG  (feeds the owner admin console)
-- ---------------------------------------------------------------------------
CREATE TABLE activity_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event       TEXT NOT NULL,     -- 'signup' | 'login' | 'payment' | 'payment_failed'
                                  -- | 'import' | 'export' | 'otp_verified' | 'cancel'
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_created ON activity_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- SESSIONS  (JWT refresh tokens / login history) — simple version
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash  TEXT NOT NULL,
  ip            TEXT,
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

-- ---------------------------------------------------------------------------
-- updated_at auto-touch trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_users_touch      BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_subs_touch       BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_orders_touch     BEFORE UPDATE ON orders       FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_inventory_touch  BEFORE UPDATE ON inventory    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_settings_touch   BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
