const pool = require('../config/db');

// GET /api/products
async function getProducts(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY id ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
async function getProductById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      const err = new Error('Invalid product id');
      err.status = 400;
      throw err;
    }
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!rows.length) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id/reviews
async function getReviews(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      const err = new Error('Invalid product id');
      err.status = 400;
      throw err;
    }
    const [rows] = await pool.query(
      'SELECT id, customer_name, rating, review, created_at FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 50',
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id/rating
async function getRatingSummary(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      const err = new Error('Invalid product id');
      err.status = 400;
      throw err;
    }
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count, COALESCE(AVG(rating),0) AS average FROM product_reviews WHERE product_id = ?',
      [id]
    );
    const { count, average } = rows[0];
    res.json({
      success: true,
      data: { count, average: Math.round(Number(average) * 10) / 10 }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/products/:id/reviews
async function postReview(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      const err = new Error('Invalid product id');
      err.status = 400;
      throw err;
    }

    let { customer_name, rating, review } = req.body || {};
    rating = Number(rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      const err = new Error('rating must be an integer between 1 and 5');
      err.status = 400;
      throw err;
    }

    // Basic sanitization / length limits (parameterized query prevents SQL injection)
    customer_name = (customer_name || '').toString().trim().slice(0, 100) || null;
    review = (review || '').toString().trim().slice(0, 1000) || null;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const err = new Error('Database connection failed. Please try again later.');
      err.status = 503;
      throw err;
    }

    try {
      const [productRows] = await connection.query('SELECT id FROM products WHERE id = ?', [id]);
      if (!productRows.length) {
        const err = new Error('Product not found');
        err.status = 404;
        throw err;
      }

      await connection.query(
        'INSERT INTO product_reviews (product_id, customer_name, rating, review) VALUES (?, ?, ?, ?)',
        [id, customer_name, rating, review]
      );

      res.status(201).json({ success: true, message: 'Review submitted' });
    } catch (err) {
      next(err);
    } finally {
      if (connection) connection.release();
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { getProducts, getProductById, getReviews, getRatingSummary, postReview };
