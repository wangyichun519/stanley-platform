// server.js - Express 主程式
require('dotenv').config();
const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── 後台保護（HTTP Basic Auth）────────────────────
app.use('/admin', basicAuth({
  users: { [process.env.ADMIN_USER || 'stanley']: process.env.ADMIN_PASS || 'admin123' },
  challenge: true,
  realm: 'Stanley Healthcare Admin'
}));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ─── API 路由 ─────────────────────────────────────────
app.use('/api/consulting', require('./routes/consulting'));
app.use('/api/training', require('./routes/training'));
app.use('/api/shop', require('./routes/shop'));
app.use('/api/linepay', require('./routes/linepay'));

// ─── 後台 API（統計資料）───────────────────────────
app.get('/api/admin/dashboard', basicAuth({
  users: { [process.env.ADMIN_USER || 'stanley']: process.env.ADMIN_PASS || 'admin123' }
}), (req, res) => {
  const { getDb } = require('./db/database');
  const db = getDb();
  
  const today = new Date().toISOString().split('T')[0];
  
  const stats = {
    consulting_pending: db.prepare("SELECT COUNT(*) as n FROM consulting_requests WHERE status='pending'").get().n,
    consulting_total: db.prepare("SELECT COUNT(*) as n FROM consulting_requests").get().n,
    training_today: db.prepare("SELECT COUNT(*) as n FROM registrations WHERE date(created_at)=?").get(today).n,
    training_revenue_month: db.prepare(`
      SELECT COALESCE(SUM(c.price),0) as total FROM registrations r
      JOIN courses c ON r.course_id=c.id
      WHERE r.payment_status='paid' AND strftime('%Y-%m', r.created_at)=strftime('%Y-%m','now')
    `).get().total,
    orders_pending: db.prepare("SELECT COUNT(*) as n FROM orders WHERE payment_status='pending'").get().n,
    orders_revenue_month: db.prepare("SELECT COALESCE(SUM(total),0) as t FROM orders WHERE payment_status='paid' AND strftime('%Y-%m', created_at)=strftime('%Y-%m','now')").get().t,
    members_total: db.prepare("SELECT COUNT(*) as n FROM members").get().n
  };
  
  res.json(stats);
});

// ─── 健康檢查 ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── 啟動 ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
🌿 Stanley 健康生活品牌平台
✅ 伺服器啟動：http://localhost:${PORT}
📋 顧問接單：http://localhost:${PORT}/consulting.html
📚 教育訓練：http://localhost:${PORT}/training.html
🛍️  選物商店：http://localhost:${PORT}/shop.html
☕ 咖啡療癒：http://localhost:${PORT}/coffee.html
🏕️  露營體驗：http://localhost:${PORT}/camping.html
🔒 後台管理：http://localhost:${PORT}/admin
  `);
});

module.exports = app;
