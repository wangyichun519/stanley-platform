// routes/training.js - 教育訓練報名 API
const express = require('express');
const router = express.Router();
const basicAuth = require('express-basic-auth');
const { getDb } = require('../db/database');
const { sendCourseConfirm } = require('./mailer');

const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'stanley']: process.env.ADMIN_PASS || 'admin123' },
  challenge: true
});

// 取得所有開放課程
router.get('/courses', (req, res) => {
  const db = getDb();
  const courses = db.prepare(`
    SELECT *, (capacity - registered) AS seats_left 
    FROM courses 
    WHERE status = 'open' AND date >= date('now')
    ORDER BY date ASC
  `).all();
  res.json(courses);
});

// 取得單一課程詳情
router.get('/courses/:id', (req, res) => {
  const db = getDb();
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ message: '課程不存在' });
  res.json(course);
});

// 課程報名
router.post('/register', async (req, res) => {
  const db = getDb();
  const { course_id, name, id_last4, phone, email, occupation, org, need_receipt, receipt_title } = req.body;

  if (!course_id || !name || !phone || !email) {
    return res.status(400).json({ success: false, message: '請填寫所有必填欄位' });
  }

  try {
    // 檢查課程是否有名額
    const course = db.prepare('SELECT * FROM courses WHERE id = ? AND status = "open"').get(course_id);
    if (!course) return res.status(400).json({ success: false, message: '課程不存在或已關閉報名' });
    if (course.registered >= course.capacity) {
      return res.status(400).json({ success: false, message: '課程名額已滿' });
    }

    // 建立報名記錄
    const result = db.prepare(`
      INSERT INTO registrations (course_id, name, id_last4, phone, email, occupation, org, need_receipt, receipt_title, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(course_id, name, id_last4, phone, email, occupation, org, need_receipt ? 1 : 0, receipt_title);

    res.json({ 
      success: true, 
      registration_id: result.lastInsertRowid,
      course,
      message: '報名成功！請完成付款以確認名額。' 
    });
  } catch (err) {
    console.error('報名失敗:', err);
    res.status(500).json({ success: false, message: '系統錯誤，請稍後再試' });
  }
});

// 付款完成後更新狀態（由 LINE Pay 回調觸發）
router.post('/payment-confirm/:id', (req, res) => {
  const db = getDb();
  const reg = db.prepare('SELECT *, (SELECT title FROM courses WHERE id=course_id) as course_title FROM registrations WHERE id=?').get(req.params.id);
  if (!reg) return res.status(404).json({ message: '找不到報名記錄' });

  db.prepare('UPDATE registrations SET payment_status="paid" WHERE id=?').run(req.params.id);
  db.prepare('UPDATE courses SET registered=registered+1 WHERE id=?').run(reg.course_id);

  sendCourseConfirm(reg.email, reg, { 
    title: reg.course_title, 
    date: reg.date, 
    time: reg.time, 
    location: reg.location,
    price: reg.price 
  }).catch(console.error);

  res.json({ success: true });
});

// 後台：取得所有報名
router.get('/registrations', adminAuth, (req, res) => {
  const db = getDb();
  const regs = db.prepare(`
    SELECT r.*, c.title as course_title, c.date as course_date
    FROM registrations r
    LEFT JOIN courses c ON r.course_id = c.id
    ORDER BY r.created_at DESC
  `).all();
  res.json(regs);
});

// 後台：新增課程
router.post('/courses', adminAuth, (req, res) => {
  const db = getDb();
  const { title, description, date, time, location, duration_hours, price, capacity, category } = req.body;
  const result = db.prepare(`
    INSERT INTO courses (title, description, date, time, location, duration_hours, price, capacity, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, date, time, location, duration_hours, price, capacity, category);
  res.json({ success: true, id: result.lastInsertRowid });
});

module.exports = router;
