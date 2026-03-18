// server.js - Express 主程式
require('dotenv').config();
const express = require('express');
const basicAuth = require('express-basic-auth');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── 安全 Headers（Helmet）────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false // 允許 inline script（前端需要）
}));

// ─── 速率限制（Rate Limiting）─────────────────────────
const generalLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: '請求過於頻繁，請稍後再試' });
const apiLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: '請求過於頻繁，請稍後再試' });
const aiLimit = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'AI 使用次數過多，請稍後再試' });

app.use(generalLimit);
app.use('/api/', apiLimit);
app.use('/api/coffee-ai', aiLimit);

// ─── Middleware ──────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── 後台保護（HTTP Basic Auth）────────────────────
const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'stanley']: process.env.ADMIN_PASS || 'admin123' },
  challenge: true,
  realm: 'Stanley Healthcare Admin'
});
app.use('/admin', adminAuth);
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ─── 後台 API 認證 middleware ─────────────────────────
const requireAdmin = (req, res, next) => {
  adminAuth(req, res, next);
};

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

// ─── AI 咖啡顧問（NVIDIA NIM）─────────────────────────
app.post('/api/coffee-ai', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: '請輸入訊息' });

    const systemPrompt = `你是「Coffee Priority 咖啡療癒工作坊」的 AI 咖啡顧問，由 Stanley 老師（SCA Q Grader 認證）授權。
你的任務是根據訪客的口味偏好、健康狀況或需求，推薦最適合的課程或咖啡豆。

【我們的服務】
1. 銀髮咖啡師初級班 - NT$3,800 / 6週課程（每週六 09:00-11:00），適合銀髮族、長輩，融入認知活化訓練，本期剩4名額
2. 機構咖啡角規劃顧問 - NT$15,000起，適合護理之家、長照機構，包含空間規劃＋培訓＋3個月追蹤
3. 花蓮精品咖啡豆 - 宜花東在地莊園豆，SCA Q Grader 親自杯測，自家烘焙，限量供應

【口味推薦指南】
- 喜歡清爽、果香、酸感 → 推薦淺焙花蓮富里高山豆
- 喜歡平衡、甜感、堅果香 → 推薦中焙壽豐莊園豆
- 喜歡濃郁、可可、醇厚 → 推薦深焙日曬豆

請用親切、簡短的繁體中文回覆（150字內），針對訪客問題直接給建議，並自然引導他們行動（報名/購買/LINE諮詢）。`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages,
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('NVIDIA API error:', err);
      return res.status(500).json({ error: 'AI 服務暫時無法使用' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '抱歉，請稍後再試。';
    res.json({ reply });
  } catch (e) {
    console.error('coffee-ai error:', e);
    res.status(500).json({ error: 'AI 服務暫時無法使用' });
  }
});

// ─── 測試信件 ─────────────────────────────────────────
app.get('/api/test-email', async (req, res) => {
  const { sendConsultingConfirm } = require('./routes/mailer');
  try {
    await sendConsultingConfirm(process.env.EMAIL_USER, {
      org_name: '測試機構',
      contact_name: 'Stanley',
      service_type: '測試服務',
      preferred_time: '上午'
    });
    res.json({ success: true, message: `信件已寄出至 ${process.env.EMAIL_USER}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
