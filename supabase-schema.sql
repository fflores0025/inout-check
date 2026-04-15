-- ============================================================
-- TAQUILLA ONLINE — Supabase Schema
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── EVENTS ──────────────────────────────────────────────────────────────────
CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  tipo          TEXT NOT NULL CHECK (tipo IN ('concierto','corporativo','nocturno','festival')),
  fecha_inicio  TIMESTAMPTZ NOT NULL,
  fecha_fin     TIMESTAMPTZ,
  venue_nombre  TEXT NOT NULL,
  venue_direccion TEXT,
  venue_ciudad  TEXT NOT NULL,
  imagen_url    TEXT,
  imagen_banner_url TEXT,
  aforo_total   INTEGER NOT NULL DEFAULT 0,
  estado        TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','publicado','agotado','cancelado','finalizado')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TICKET TYPES ────────────────────────────────────────────────────────────
CREATE TABLE ticket_types (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  descripcion      TEXT,
  tipo_zona        TEXT NOT NULL DEFAULT 'general' CHECK (tipo_zona IN ('general','vip','backstage','pista','grada','palco')),
  precio           NUMERIC(10,2) NOT NULL,
  stock_total      INTEGER NOT NULL,
  stock_disponible INTEGER NOT NULL,
  max_por_persona  INTEGER NOT NULL DEFAULT 4,
  venta_inicio     TIMESTAMPTZ,
  venta_fin        TIMESTAMPTZ,
  activo           BOOLEAN DEFAULT TRUE,
  color            TEXT,
  beneficios       TEXT[],
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stock_check CHECK (stock_disponible >= 0 AND stock_disponible <= stock_total)
);

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT UNIQUE NOT NULL,
  nombre     TEXT NOT NULL,
  telefono   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number          TEXT UNIQUE NOT NULL,
  customer_id           UUID REFERENCES customers(id),
  customer_email        TEXT NOT NULL,
  customer_nombre       TEXT NOT NULL,
  customer_telefono     TEXT,
  event_id              UUID NOT NULL REFERENCES events(id),
  subtotal              NUMERIC(10,2) NOT NULL,
  comision              NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(10,2) NOT NULL,
  estado                TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completado','fallido','reembolsado')),
  sumup_checkout_id     TEXT,
  sumup_transaction_id  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TICKETS ─────────────────────────────────────────────────────────────────
CREATE TABLE tickets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
  event_id       UUID NOT NULL REFERENCES events(id),
  qr_code        TEXT UNIQUE NOT NULL,
  rfid_uid       TEXT,
  rfid_cargado   BOOLEAN DEFAULT FALSE,
  estado         TEXT NOT NULL DEFAULT 'valido' CHECK (estado IN ('valido','usado','anulado','transferido')),
  numero_entrada TEXT NOT NULL,
  holder_nombre  TEXT,
  used_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RFID CARDS ──────────────────────────────────────────────────────────────
CREATE TABLE rfid_cards (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  uid         TEXT UNIQUE NOT NULL,
  alias       TEXT,
  activa      BOOLEAN DEFAULT TRUE,
  ticket_ids  UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── VALIDATION LOG ──────────────────────────────────────────────────────────
CREATE TABLE validation_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID REFERENCES tickets(id),
  tipo        TEXT NOT NULL CHECK (tipo IN ('qr','rfid')),
  codigo      TEXT NOT NULL,
  resultado   TEXT NOT NULL CHECK (resultado IN ('valido','invalido','ya_usado','no_encontrado')),
  device_info TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_events_slug       ON events(slug);
CREATE INDEX idx_events_estado     ON events(estado);
CREATE INDEX idx_events_fecha      ON events(fecha_inicio);
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);
CREATE INDEX idx_orders_email      ON orders(customer_email);
CREATE INDEX idx_orders_checkout   ON orders(sumup_checkout_id);
CREATE INDEX idx_tickets_qr        ON tickets(qr_code);
CREATE INDEX idx_tickets_rfid      ON tickets(rfid_uid);
CREATE INDEX idx_tickets_order     ON tickets(order_id);
CREATE INDEX idx_rfid_uid          ON rfid_cards(uid);

-- ─── FUNCTION: Decrease stock atomically ─────────────────────────────────────
CREATE OR REPLACE FUNCTION decrease_ticket_stock(
  p_ticket_type_id UUID,
  p_quantity INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE ticket_types
  SET stock_disponible = stock_disponible - p_quantity
  WHERE id = p_ticket_type_id
    AND stock_disponible >= p_quantity;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente para ticket_type %', p_ticket_type_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── FUNCTION: Generate order number ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'ORD-';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfid_cards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_log ENABLE ROW LEVEL SECURITY;

-- Public can read published events and their ticket types
CREATE POLICY "events_public_read" ON events FOR SELECT USING (estado = 'publicado');
CREATE POLICY "ticket_types_public_read" ON ticket_types FOR SELECT USING (activo = TRUE);

-- Service role bypasses RLS (for API routes)
-- All other writes go through service role in API routes

-- ─── SAMPLE DATA ─────────────────────────────────────────────────────────────
INSERT INTO events (slug, nombre, descripcion, tipo, fecha_inicio, venue_nombre, venue_direccion, venue_ciudad, aforo_total, estado) VALUES
(
  'noche-electronica-2025',
  'Noche Electrónica',
  'La noche más esperada del año. Música electrónica, ambiente exclusivo y zonas VIP.',
  'nocturno',
  NOW() + INTERVAL '30 days',
  'Club Noctua',
  'Calle Gran Vía 45',
  'Madrid',
  500,
  'publicado'
),
(
  'festival-verano-2025', 
  'Festival de Verano',
  'Tres escenarios, más de 20 artistas, acceso backstage para los privilegiados.',
  'festival',
  NOW() + INTERVAL '60 days',
  'Parque del Retiro',
  'Paseo de la Chopera',
  'Madrid',
  2000,
  'publicado'
),
(
  'congreso-tech-2025',
  'Tech Summit Madrid 2025',
  'El congreso de tecnología más importante del sur de Europa.',
  'corporativo',
  NOW() + INTERVAL '45 days',
  'IFEMA',
  'Av. del Partenón 5',
  'Madrid',
  1000,
  'publicado'
);

-- Ticket types for Noche Electrónica
INSERT INTO ticket_types (event_id, nombre, tipo_zona, precio, stock_total, stock_disponible, max_por_persona, beneficios) 
SELECT id, 'Entrada General', 'general', 15.00, 400, 400, 4, ARRAY['Acceso sala principal','Guardarropa incluido']
FROM events WHERE slug = 'noche-electronica-2025';

INSERT INTO ticket_types (event_id, nombre, tipo_zona, precio, stock_total, stock_disponible, max_por_persona, beneficios, color)
SELECT id, 'VIP Zona Premium', 'vip', 35.00, 80, 80, 2, ARRAY['Acceso zona VIP','Barra libre 2h','Guardarropa incluido','Acceso prioritario'], '#C9A84C'
FROM events WHERE slug = 'noche-electronica-2025';

-- Ticket types for Festival
INSERT INTO ticket_types (event_id, nombre, tipo_zona, precio, stock_total, stock_disponible, max_por_persona, beneficios)
SELECT id, 'Abono General', 'general', 45.00, 1800, 1800, 6, ARRAY['Acceso todos los escenarios','Zonas de descanso']
FROM events WHERE slug = 'festival-verano-2025';

INSERT INTO ticket_types (event_id, nombre, tipo_zona, precio, stock_total, stock_disponible, max_por_persona, beneficios, color)
SELECT id, 'Acceso Backstage', 'backstage', 120.00, 50, 50, 1, ARRAY['Todo lo de General','Meet & Greet con artistas','Zona catering exclusiva','Credencial oficial'], '#E03030'
FROM events WHERE slug = 'festival-verano-2025';

-- Ticket types for Tech Summit
INSERT INTO ticket_types (event_id, nombre, tipo_zona, precio, stock_total, stock_disponible, max_por_persona, beneficios)
SELECT id, 'Entrada Estándar', 'general', 99.00, 800, 800, 2, ARRAY['Acceso todas las ponencias','Networking lunch','Materiales del congreso']
FROM events WHERE slug = 'congreso-tech-2025';

INSERT INTO ticket_types (event_id, nombre, tipo_zona, precio, stock_total, stock_disponible, max_por_persona, beneficios, color)
SELECT id, 'VIP Business', 'vip', 249.00, 100, 100, 1, ARRAY['Todo lo estándar','Acceso sala VIP','Cena de networking','Grabaciones de todas las charlas'], '#C9A84C'
FROM events WHERE slug = 'congreso-tech-2025';

-- ─── ORDER ITEMS (cart snapshot, needed for webhook processing) ───────────────
CREATE TABLE order_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  unit_price     NUMERIC(10,2) NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
