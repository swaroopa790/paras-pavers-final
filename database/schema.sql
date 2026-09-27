USE paras_pavers;

-- ============================================================
-- Paras Pavers — MySQL Schema
-- ============================================================

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_reviews_product
ON product_reviews(product_id);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Seed data
-- ============================================================

INSERT INTO products
(name, description, category, thickness_mm, image_url, is_active)
VALUES
(
  'Zig-Zag Block',
  'Heavy duty paving block',
  'Industrial / Road',
  80,
  '/assets/products/zig-zag-block.jpg',
  1
),
(
  'Toras Interlock',
  'Residential interlocking paver',
  'Residential',
  60,
  '/assets/products/toras-interlock.jpg',
  1
),
(
  'Grass Paver',
  'Eco-friendly drainage paver',
  'Landscaping',
  NULL,
  '/assets/products/grass-paver.jpg',
  1
),
(
  'Chequered Tile',
  'Durable tile for parking areas',
  'Parking',
  NULL,
  '/assets/products/chequered-tile.jpg',
  1
);