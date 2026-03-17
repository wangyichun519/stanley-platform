// routes/shop.js - 選物商店 API
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { sendOrderConfirm } = require('./mailer');

// 取得商品列表
router.get('/products', (req, res) => {
  const db = getDb();
  const { category } = req.query;
  let query = 'SELECT * FROM products WHERE active=1';
  const params = [];
  if (category) { query += ' AND category=?'; params.push(category); }
  query += ' ORDER BY category, name';
  res.json(db.prepare(query).all(...params));
});

// 建立訂單
router.post('/order', async (req, res) => {
  const db = getDb();
  const { customer_name, phone, email, address, items, shipping_method, note } = req.body;

  if (!customer_name || !phone || !email || !items?.length) {
    return res.status(400).json({ success: false, message: '請填寫所有必填欄位' });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const order_no = `ORD${Date.now()}`;

  try {
    const result = db.prepare(`
      INSERT INTO orders (order_no, customer_name, phone, email, address, items_json, total, shipping_method, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(order_no, customer_name, phone, email, address, JSON.stringify(items), total, shipping_method, note);

    res.json({ success: true, order_no, order_id: result.lastInsertRowid, total });
  } catch (err) {
    console.error('訂單建立失敗:', err);
    res.status(500).json({ success: false, message: '系統錯誤，請稍後再試' });
  }
});

// 後台：取得所有訂單
router.get('/orders', (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(orders);
});

// 後台：更新訂單狀態
router.patch('/orders/:id', (req, res) => {
  const db = getDb();
  const { payment_status } = req.body;
  db.prepare('UPDATE orders SET payment_status=? WHERE id=?').run(payment_status, req.params.id);
  res.json({ success: true });
});

// 後台：商品管理
router.post('/products', (req, res) => {
  const db = getDb();
  const { name, category, description, price, stock, ltc_subsidy } = req.body;
  const result = db.prepare(`
    INSERT INTO products (name, category, description, price, stock, ltc_subsidy)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, category, description, price, stock, ltc_subsidy ? 1 : 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.patch('/products/:id', (req, res) => {
  const db = getDb();
  const { stock, active, price } = req.body;
  db.prepare('UPDATE products SET stock=?, active=?, price=? WHERE id=?').run(stock, active ? 1 : 0, price, req.params.id);
  res.json({ success: true });
});

module.exports = router;
