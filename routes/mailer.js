// routes/mailer.js - Email 通知服務（Nodemailer + Gmail port 587）
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_PASS || '').replace(/\s/g, '') // 移除應用程式密碼中的空格
  },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 15000,
  socketTimeout: 15000
});

const BRAND = 'Stanley 健康生活顧問';
const LOGO_COLOR = '#2D4A2D';

// 共用 Email 樣板框架
function emailWrapper(content) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Noto Sans TC', sans-serif; background:#F5F0E8; margin:0; padding:20px; }
  .container { max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; }
  .header { background:${LOGO_COLOR}; color:#fff; padding:30px; text-align:center; }
  .header h1 { margin:0; font-size:22px; letter-spacing:2px; }
  .header p { margin:8px 0 0; opacity:0.8; font-size:13px; }
  .body { padding:30px; color:#333; line-height:1.8; }
  .highlight { background:#E8EDE5; border-left:4px solid ${LOGO_COLOR}; padding:15px 20px; border-radius:4px; margin:20px 0; }
  .btn { display:inline-block; background:${LOGO_COLOR}; color:#fff; padding:12px 28px; border-radius:6px; text-decoration:none; margin:20px 0; }
  .footer { background:#F5F0E8; padding:20px; text-align:center; color:#888; font-size:12px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>☕ ${BRAND}</h1>
    <p>醫管顧問 × 咖啡療癒 × 自然長照</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>花蓮 × Coffee Priority × 傳統漢方</p>
    <p>如有疑問請聯絡：${process.env.EMAIL_USER}</p>
  </div>
</div>
</body></html>`;
}

// ─── 各類通知信 ────────────────────────────────────

// 顧問預約確認
async function sendConsultingConfirm(to, data) {
  const content = `
    <p>親愛的 <strong>${data.contact_name || data.org_name}</strong>，您好！</p>
    <p>感謝您預約顧問服務，我們已收到您的申請，將於 <strong>1-2個工作天</strong> 內與您聯繫確認細節。</p>
    <div class="highlight">
      <p><strong>📋 預約資訊</strong></p>
      <p>機構／姓名：${data.org_name}</p>
      <p>服務類型：${data.service_type}</p>
      <p>偏好聯絡時段：${data.preferred_time || '未指定'}</p>
    </div>
    <p>Stanley 護理長將親自與您聯繫，提供最專業的醫管顧問服務。</p>
  `;
  await transporter.sendMail({
    from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `【${BRAND}】顧問預約確認 - ${data.service_type}`,
    html: emailWrapper(content)
  });
}

// 課程報名確認
async function sendCourseConfirm(to, data, course) {
  const content = `
    <p>親愛的 <strong>${data.name}</strong>，您好！</p>
    <p>您已成功報名課程，請保留此確認信作為報名憑證。</p>
    <div class="highlight">
      <p><strong>📚 課程資訊</strong></p>
      <p>課程名稱：${course.title}</p>
      <p>上課日期：${course.date}</p>
      <p>上課時間：${course.time}</p>
      <p>上課地點：${course.location}</p>
      <p>費用：NT$${course.price}（已付款）</p>
    </div>
    <p>⚠️ 注意事項：請準時報到，上課前請保持電話暢通。</p>
    <p>開課前3天我們會再發送提醒通知給您。</p>
  `;
  await transporter.sendMail({
    from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `【${BRAND}】課程報名成功 - ${course.title}`,
    html: emailWrapper(content)
  });
}

// 課程開課提醒
async function sendCourseReminder(to, name, course) {
  const content = `
    <p>親愛的 <strong>${name}</strong>，您好！</p>
    <p>提醒您，您報名的課程將在 <strong>3天後</strong> 開始！</p>
    <div class="highlight">
      <p><strong>⏰ 課程提醒</strong></p>
      <p>課程名稱：${course.title}</p>
      <p>上課日期：${course.date} ${course.time}</p>
      <p>上課地點：${course.location}</p>
    </div>
    <p>期待與您相見！如有任何問題請提前告知。</p>
  `;
  await transporter.sendMail({
    from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `【提醒】${course.title} 即將在3天後開始`,
    html: emailWrapper(content)
  });
}

// 訂單確認
async function sendOrderConfirm(to, order) {
  const items = JSON.parse(order.items_json || '[]');
  const itemList = items.map(i => `<li>${i.name} × ${i.qty} = NT$${i.price * i.qty}</li>`).join('');
  const content = `
    <p>親愛的 <strong>${order.customer_name}</strong>，您好！</p>
    <p>感謝您的訂購！我們將盡快處理您的訂單。</p>
    <div class="highlight">
      <p><strong>🛍️ 訂單明細</strong></p>
      <p>訂單編號：${order.order_no}</p>
      <ul>${itemList}</ul>
      <p><strong>合計：NT$${order.total}</strong></p>
      <p>配送方式：${order.shipping_method === 'delivery' ? '宅配' : '門市取貨'}</p>
    </div>
    <p>出貨後我們會再通知您，感謝您支持花蓮在地品牌！</p>
  `;
  await transporter.sendMail({
    from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `【${BRAND}】訂單確認 #${order.order_no}`,
    html: emailWrapper(content)
  });
}

module.exports = { sendConsultingConfirm, sendCourseConfirm, sendCourseReminder, sendOrderConfirm };
