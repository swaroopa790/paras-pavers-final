const pool = require('./db');

/**
 * Bring the schema up on boot.
 *
 * Why this exists: the original setup expects you to run database/schema.sql
 * by hand in a SQL console. On a hosted MySQL that is one more thing to get
 * wrong (wrong database selected, wrong file, no console at all), and if it is
 * skipped the rating feature silently400s/500s. So we do it here instead —
 * idempotent, and safe to run on every restart.
 *
 * Everything in here is best-effort. A missing DDL privilege, a syntax this
 * server dislikes, or an unreachable host is logged and swallowed: the site
 * must still boot, and the frontend falls back to its hardcoded product list.
 */
const PRODUCT_TABLE = `
CREATE TABLE IF NOT EXISTS products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  description   VARCHAR(255) DEFAULT NULL,
  category      VARCHAR(100) DEFAULT NULL,
  thickness_mm  INT DEFAULT NULL,
  image_url     VARCHAR(500) DEFAULT NULL,
  price         DECIMAL(10,2) DEFAULT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const REVIEW_TABLE = `
CREATE TABLE IF NOT EXISTS product_reviews (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  product_id    INT NOT NULL,
  customer_name VARCHAR(100) DEFAULT NULL,
  rating        TINYINT NOT NULL,
  review        VARCHAR(1000) DEFAULT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_rating_range
    CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const CALC_TABLE = `
CREATE TABLE IF NOT EXISTS quantity_calculations (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  product_id        INT DEFAULT NULL,
  length            DECIMAL(10,3) NOT NULL,
  width             DECIMAL(10,3) NOT NULL,
  unit              VARCHAR(10) NOT NULL,
  block_length      DECIMAL(10,3) NOT NULL,
  block_width       DECIMAL(10,3) NOT NULL,
  wastage           DECIMAL(5,2) DEFAULT 0,
  depth             DECIMAL(10,3) DEFAULT NULL,
  land_area         DECIMAL(14,3) NOT NULL,
  estimated_blocks  INT NOT NULL,
  estimated_brass   DECIMAL(10,3) DEFAULT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_calc_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

/** image_url values must match the filenames in frontend/assets/products/. */
const SEED_PRODUCTS = [
  ['Zig-Zag Block', 'Heavy duty paving block', 'Industrial / Road', 80, '/assets/products/zig-zag-block.jpg'],
  ['Toras Interlock', 'Residential interlocking paver', 'Residential', 60, '/assets/products/toras-interlock.jpg'],
  ['Grass Paver', 'Eco-friendly drainage paver', 'Landscaping', null, '/assets/products/grass-paver.jpg'],
  ['Chequered Tile', 'Durable tile for parking areas', 'Parking', null, '/assets/products/chequered-tile.jpg']
];

async function run(conn, label, sql) {
  try {
    await conn.query(sql);
  } catch (err) {
    // 1061 = duplicate key name: the index already exists. Harmless.
    if (err.errno === 1061) return;
    console.warn(`[DB] ${label} skipped: ${err.message}`);
  }
}

async function initDatabase() {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.ping();

      await run(conn, 'products table', PRODUCT_TABLE);
      await run(conn, 'product_reviews table', REVIEW_TABLE);
      await run(conn, 'quantity_calculations table', CALC_TABLE);
      // MySQL has no "CREATE INDEX IF NOT EXISTS" — 1061 is swallowed above.
      await run(conn, 'reviews index', 'CREATE INDEX idx_reviews_product ON product_reviews(product_id)');

      const [rows] = await conn.query('SELECT COUNT(*) AS n FROM products');
      if (Number(rows[0].n) === 0) {
        await conn.query(
          'INSERT INTO products (name, description, category, thickness_mm, image_url) VALUES ?',
          [SEED_PRODUCTS]
        );
        console.log('[DB] Seeded 4 products');
      }
      console.log('[DB] Schema ready');
    } finally {
      conn.release();
    }
  } catch (err) {
    console.warn('[DB] Schema init skipped:', err.message);
    console.warn('[DB] Ratings/calculations will not persist until a database is reachable.');
  }
}

module.exports = initDatabase;
