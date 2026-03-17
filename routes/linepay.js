// routes/linepay.js - LINE Pay 金流整合
const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const { getDb } = require('../db/database');

const LINEPAY_BASE = process.env.LINE_PAY_MODE === 'sandbox'
  ? 'https://sandbox-api-pay.line.me'
  : 'https://api-pay.line.me';

// 產生 LINE Pay 請求簽名
function generateSignature(channelSecret, uri, body, nonce) {
  const text = channelSecret + uri + JSON.stringify(body) + nonce;
  return crypto.createHmac('sha256', channelSecret).update(text).digest('base64');
}

// 建立 LINE Pay 請求 header
function getHeaders(uri, body) {
  const nonce = Date.now().toString();
  const signature = generateSignature(
    process.env.LINE_PAY_CHANNEL_SECRET,
    uri,
    body,
    nonce
  );
  return {
    'Content-Type': 'application/json',
    'X-LINE-ChannelId': process.env.LINE_PAY_CHANNEL_ID,
    'X-LINE-Authorization-Nonce': nonce,
    'X-LINE-Authorization': signature
  };
}

// ─── 建立付款請求 ───────────────────────────────
router.post('/request', async (req, res) => {
  const { amount, orderId, orderType, productName, redirectUrls } = req.body;
  
  const uri = '/v3/payments/request';
  const body = {
    amount,
    currency: 'TWD',
    orderId,
    packages: [{
      id: `pkg_${orderId}`,
      amount,
      products: [{ name: productName, quantity: 1, price: amount }]
    }],
    redirectUrls: {
      confirmUrl: `${process.env.BASE_URL}/api/linepay/confirm?type=${orderType}`,
      cancelUrl: `${process.env.BASE_URL}/api/linepay/cancel`
    }
  };

  try {
    const headers = getHeaders(uri, body);
    const response = await axios.post(`${LINEPAY_BASE}${uri}`, body, { headers });
    
    if (response.data.returnCode === '0000') {
      res.json({
        success: true,
        paymentUrl: response.data.info.paymentUrl.web,
        transactionId: response.data.info.transactionId
      });
    } else {
      throw new Error(response.data.returnMessage);
    }
  } catch (err) {
    console.error('LINE Pay 請求失敗:', err.message);
    res.status(500).json({ success: false, message: '金流建立失敗，請稍後再試' });
  }
});

// ─── 確認付款（LINE Pay 回調） ────────────────────
router.get('/confirm', async (req, res) => {
  const { transactionId, orderId, type } = req.query;
  const db = getDb();

  const uri = `/v3/payments/${transactionId}/confirm`;
  
  // 先查詢金額
  let amount = 0;
  let tableName = '';
  
  if (type === 'consulting') tableName = 'consulting_requests';
  else if (type === 'training') tableName = 'registrations';
  else if (type === 'camping') tableName = 'camping_registrations';
  else if (type === 'shop') tableName = 'orders';

  try {
    const record = db.prepare(`SELECT * FROM ${tableName} WHERE payment_id = ?`).get(orderId);
    if (!record) throw new Error('找不到訂單');
    
    amount = record.total_amount || record.total;

    const body = { amount, currency: 'TWD' };
    const headers = getHeaders(uri, body);
    const response = await axios.post(`${LINEPAY_BASE}${uri}`, body, { headers });

    if (response.data.returnCode === '0000') {
      // 更新付款狀態
      db.prepare(`UPDATE ${tableName} SET payment_status = 'paid' WHERE payment_id = ?`).run(orderId);
      res.redirect(`${process.env.BASE_URL}/payment-success.html?type=${type}`);
    } else {
      throw new Error(response.data.returnMessage);
    }
  } catch (err) {
    console.error('LINE Pay 確認失敗:', err.message);
    res.redirect(`${process.env.BASE_URL}/payment-fail.html`);
  }
});

// ─── 取消付款 ─────────────────────────────────────
router.get('/cancel', (req, res) => {
  res.redirect(`${process.env.BASE_URL}/payment-cancel.html`);
});

module.exports = router;
