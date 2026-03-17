// routes/consulting.js - 顧問預約 API
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { sendConsultingConfirm } = require('./mailer');
const axios = require('axios');
const crypto = require('crypto');

// 取得所有服務類型列表
router.get('/services', (req, res) => {
  const services = [
    { id: 'snq', name: 'SNQ國家品質標章申請輔導', price: 30000, unit: '專案' },
    { id: 'accreditation', name: '評鑑輔導（精神護理之家）', price: 25000, unit: '專案' },
    { id: 'ltc30', name: '醫照整合顧問（長照3.0）', price: 15000, unit: '月' },
    { id: 'smart', name: '智慧輔具導入規劃', price: 12000, unit: '專案' },
    { id: 'training', name: '護理長培訓課程設計', price: 10000, unit: '專案' },
    { id: 'legal', name: '法規諮詢（單次）', price: 3000, unit: '小時' }
  ];
  res.json(services);
});

// 送出預約申請
router.post('/request', async (req, res) => {
  const db = getDb();
  const { org_name, contact_name, phone, email, service_type, description, preferred_time, urgent } = req.body;

  if (!org_name || !phone || !email || !service_type) {
    return res.status(400).json({ success: false, message: '請填寫所有必填欄位' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO consulting_requests (org_name, contact_name, phone, email, service_type, description, preferred_time, urgent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(org_name, contact_name, phone, email, service_type, description, preferred_time, urgent ? 1 : 0);

    // 發送確認信（非同步，不影響回應）
    sendConsultingConfirm(email, { org_name, contact_name, service_type, preferred_time })
      .catch(err => console.error('發信失敗:', err.message));

    res.json({ success: true, id: result.lastInsertRowid, message: '預約申請已送出！我們將在1-2個工作天內與您聯繫。' });
  } catch (err) {
    console.error('預約失敗:', err);
    res.status(500).json({ success: false, message: '系統錯誤，請稍後再試' });
  }
});

// 取得所有預約（後台用）
router.get('/list', (req, res) => {
  const db = getDb();
  const requests = db.prepare('SELECT * FROM consulting_requests ORDER BY created_at DESC').all();
  res.json(requests);
});

// 更新預約狀態（後台用）
router.patch('/:id/status', (req, res) => {
  const db = getDb();
  const { status, total_amount, notes } = req.body;
  db.prepare('UPDATE consulting_requests SET status=?, total_amount=?, notes=? WHERE id=?')
    .run(status, total_amount, notes, req.params.id);
  res.json({ success: true });
});

module.exports = router;
