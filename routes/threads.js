// routes/threads.js - Threads 每日自動發文
// 每天台灣時間 09:00 自動發文，不需額外 npm 套件
const express = require('express');
const router = express.Router();
const basicAuth = require('express-basic-auth');

const THREADS_API = 'https://graph.threads.net/v1.0';
const SITE_URL = process.env.APP_URL || 'https://stanley-platform.up.railway.app';

const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'stanley']: process.env.ADMIN_PASS || 'admin123' },
  challenge: true
});

// ─── 7 天主題輪換（週日=0 … 週六=6）────────────────────────
const WEEKLY_THEMES = [
  // 週日 (0)
  {
    label: '週日療癒時光',
    intro: '☕ 週日早安！',
    topic: '咖啡的嗅覺療癒與銀髮認知活化，用一個輕鬆的生活實踐故事分享',
    page: '/coffee.html',
    tags: '#咖啡療癒 #銀髮生活 #CoffeePriority #花蓮咖啡 #週日早晨'
  },
  // 週一 (1)
  {
    label: '週一長照新知',
    intro: '🏥 週一健康出發！',
    topic: '台灣長照3.0政策最新動態、宜花東偏鄉補助，或照護者實用技巧',
    page: '/consulting.html',
    tags: '#長照3 #台灣長照 #銀髮健康 #StanleyHealthcare #宜花東'
  },
  // 週二 (2)
  {
    label: '週二咖啡知識',
    intro: '☕ 週二咖啡知識日！',
    topic: 'SCA 精品咖啡知識、特殊發酵處理法，或花蓮在地咖啡豆的風土故事',
    page: '/coffee.html',
    tags: '#精品咖啡 #SCAQGrader #CoffeePriority #花蓮咖啡 #手沖咖啡'
  },
  // 週三 (3)
  {
    label: '週三課程情報',
    intro: '🎓 課程情報！',
    topic: '銀髮咖啡師班課程內容、學員心得，或機構咖啡角規劃的實際案例',
    page: '/training.html',
    tags: '#銀髮咖啡師 #長照培訓 #咖啡課程 #花蓮課程 #認知活化'
  },
  // 週四 (4)
  {
    label: '週四精選推薦',
    intro: '🛍️ 本週精選！',
    topic: '阿里山有機咖啡豆、哥倫比亞玫瑰茶咖啡或青檸香頌冷萃特調包的特色與風味介紹',
    page: '/shop.html',
    tags: '#台灣精品咖啡 #有機咖啡 #阿里山咖啡 #CoffeePriority #選豆攻略'
  },
  // 週五 (5)
  {
    label: '週五宜花東故事',
    intro: '🌿 花蓮故事～',
    topic: '花蓮、宜蘭或台東的在地生活、自然環境與健康照護的獨特連結',
    page: '/index.html',
    tags: '#花蓮 #宜花東 #台灣東部 #在地生活 #自然療癒'
  },
  // 週六 (6)
  {
    label: '週六漢方養生',
    intro: '🌿 週六養生日！',
    topic: '傳統漢方養生食材、日常保健建議，或中醫觀點的銀髮健康生活實踐',
    page: '/coffee.html',
    tags: '#漢方養生 #中醫保健 #天然草本 #銀髮養生 #StanleyHealthcare'
  }
];

// ─── 靜態備用內文（AI 無法使用時）──────────────────────────
const FALLBACK_POSTS = [
  // 週日
  `☕ 週日早安！

「一杯咖啡的距離，是最短的陪伴。」

最近在研究咖啡與銀髮照護的連結，發現手沖過程中的嗅覺刺激、手部精細動作與專注儀式，對長輩的認知活化真的很有幫助。每個週日早晨，不妨邀家中長輩一起參與手沖的小小儀式——不只是喝咖啡，更是一場溫柔的腦部運動 ☕

你有和家人一起喝咖啡的習慣嗎？歡迎留言聊聊 💬

#咖啡療癒 #銀髮生活 #CoffeePriority #花蓮咖啡 #週日早晨`,

  // 週一
  `🏥 週一健康出發！

最近在研究台灣長照3.0的政策內容，發現智慧輔具補助範圍已擴大不少——AI離床感應器、GPS定位器、智慧藥盒等都納入申請範圍，宜花東偏鄉還有額外加乘補助。

對於家有長輩的朋友，建議提前了解這三份文件：
①照顧計畫書 ②評估報告 ③合格輔具清單

有在照顧家中長輩嗎？歡迎留言交流心得 💬

#長照3 #台灣長照 #銀髮健康 #StanleyHealthcare #宜花東`,

  // 週二
  `☕ 週二咖啡知識日！

你聽過「玫瑰茶發酵處理法」嗎？

哥倫比亞天堂莊園（Finca El Paraíso）將咖啡果實與玫瑰花瓣共同發酵，讓咖啡豆吸收玫瑰的花香與果酸，呈現出玫瑰、荔枝、茉莉的複雜風味層次。

身為 SCA Q Grader 學習者，每次接觸到這類特殊處理法都覺得咖啡的世界真的很深。精品咖啡不只是飲料，更像是一門值得慢慢探索的學問 🌹

你喝過最特別的咖啡是什麼？歡迎留言分享 💬

#精品咖啡 #SCAQGrader #CoffeePriority #花蓮咖啡 #手沖咖啡`,

  // 週三
  `🎓 分享一個正在規劃的課程概念

一直有個想法：把咖啡手沖課程和銀髮認知活化結合在一起。

課程設計大方向：
✏️ SCA 基礎咖啡知識
✏️ 手部精細動作訓練（研磨、注水）
✏️ 嗅覺與記憶的連結練習
✏️ 小班制，有陪伴感

還在籌備和摸索中，希望未來能真正幫助到長輩和照護者。

如果你是照護工作者或對這個主題有興趣，很想聽聽你的想法 💬

#銀髮咖啡師 #長照培訓 #咖啡課程 #花蓮課程 #認知活化`,

  // 週四
  `☕ 最近迷上阿里山他扶芽有機咖啡豆

海拔1600米，全程有機栽培，不施農藥也不用化學肥料。

風味喝起來有花香、黑糖和奶油的尾韻，層次很豐富。作為 Q Grader 學習者，每次杯測台灣本土精品豆都特別有成就感——我們自己的土地也能長出這麼好喝的咖啡 🌿

台灣精品咖啡還有很多值得被看見的故事，這是我很想推廣的事之一。

你喝過台灣本土精品咖啡嗎？歡迎留言聊聊 💬

#台灣精品咖啡 #有機咖啡 #阿里山咖啡 #CoffeePriority #選豆攻略`,

  // 週五
  `🌿 花蓮故事～

花蓮，是我覺得台灣最適合慢慢老的地方。

山與海在這裡相擁，生活節奏自然緩下來。在地農業、漢方資源豐富，照護的支持網絡就在左鄰右舍之間。

我在花蓮接觸醫護工作，慢慢形成一個想法：讓宜花東成為全台灣最幸福的長照區域。這還是個夢，但覺得值得為它努力 🌱

你心目中「好好老去」是什麼樣子的？歡迎留言分享 💬

#花蓮 #宜花東 #台灣東部 #在地生活 #自然療癒`,

  // 週六
  `🌿 週六養生日！今天聊聊漢方三寶

最近在整理日常保健的小知識，發現這三樣東西很實用：

🔴 枸杞：護眼明目，特別適合用眼過度的照護者
🟡 黃耆：補氣固表、幫助免疫，睡不好的長輩可以試試
🟤 紅棗：養血補中，每天泡水加 2-3 顆就夠

三者合用煮成養生茶，每日一杯，是很多家傳的日常智慧。不貴、不複雜，卻溫養全家。

你家有在喝養生茶嗎？有什麼配方歡迎留言分享 💬

#漢方養生 #中醫保健 #天然草本 #銀髮養生 #StanleyHealthcare`
];

// ─── AI 生成貼文（NVIDIA NIM）────────────────────────────
async function generatePostContent(dayOfWeek) {
  const theme = WEEKLY_THEMES[dayOfWeek];
  const fallback = FALLBACK_POSTS[dayOfWeek].replace(/SITE/g, SITE_URL);

  if (!process.env.NVIDIA_API_KEY) return fallback;

  const today = new Date().toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-72b-instruct',
        messages: [
          {
            role: 'system',
            content: `你是 Stanley 的 Threads 社群小編，正在籌備一個結合精品咖啡、銀髮長照與漢方養生的品牌，品牌名稱為「Coffee Priority」，基地在花蓮。目前品牌仍在籌備階段，尚未正式成立公司或開業，所以發文語氣是「個人分享知識與理念」，而不是「公司宣傳」。絕對不可以用「歡迎來電」「預約諮詢」「立即購買」「目前開課」「名額有限」等已開業的說法。語氣：真誠、有溫度、像在跟朋友聊天，偶爾帶點故事感。只輸出貼文本文，不加任何說明或引號。`
          },
          {
            role: 'user',
            content: `今天是${today}。請寫一則 Threads 貼文，主題「${theme.label}」。

內容要求：
1. 開頭固定用：「${theme.intro}」
2. 主題方向：${theme.topic}
3. 內文 150～180 字，分段清晰，有具體實用資訊或有趣的知識點
4. 語氣是「個人分享、學習中、籌備中」，例如「最近在研究⋯」「我很喜歡⋯」「未來希望⋯」，不可暗示已有公司或已開業
5. 結尾邀請讀者留言互動，例如：「你有類似的經驗嗎？歡迎留言聊聊 💬」
6. 最後加上：「${theme.tags}」
7. 全文（含 hashtags）不超過 480 字
8. 只輸出貼文，不加說明`
          }
        ],
        temperature: 0.82,
        max_tokens: 600
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) return fallback;

    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();

    // 確保不超過 Threads 500 字上限
    if (text.length >= 50 && text.length <= 500) return text;
    if (text.length > 500) return text.slice(0, 465) + '...\n\n' + theme.tags;
  } catch (err) {
    console.error('[Threads] AI 生成失敗:', err.message);
  }

  return fallback;
}

// ─── 呼叫 Threads Graph API ───────────────────────────────
async function postToThreads(text) {
  const userId = process.env.THREADS_USER_ID;
  const token  = process.env.THREADS_ACCESS_TOKEN;
  if (!userId || !token) throw new Error('THREADS_USER_ID 或 THREADS_ACCESS_TOKEN 未設定');

  // Step 1：建立文字容器
  const createRes = await fetch(`${THREADS_API}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ media_type: 'TEXT', text, access_token: token }).toString(),
    signal: AbortSignal.timeout(20000)
  });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.id) {
    throw new Error(`建立容器失敗: ${JSON.stringify(createData)}`);
  }

  // Step 2：等待容器準備（文字貼文通常 3-5 秒）
  await new Promise(r => setTimeout(r, 6000));

  // Step 3：發布
  const publishRes = await fetch(`${THREADS_API}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: createData.id, access_token: token }).toString(),
    signal: AbortSignal.timeout(20000)
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    throw new Error(`發布失敗: ${JSON.stringify(publishData)}`);
  }

  return { containerId: createData.id, postId: publishData.id };
}

// ─── 今日發文主流程 ───────────────────────────────────────
let _lastPost = { date: null, success: null, postId: null, error: null, text: null };

async function runDailyPost(forceDay = null) {
  const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });

  // 同一天不重複發（強制觸發例外）
  if (forceDay === null && _lastPost.date === today && _lastPost.success) {
    console.log('[Threads] 今日已發文，跳過');
    return _lastPost;
  }

  const taipeiNow = new Date(Date.now() + 8 * 3600000);
  const dayOfWeek = forceDay !== null ? forceDay : taipeiNow.getDay();

  console.log(`[Threads] 開始發文 (${WEEKLY_THEMES[dayOfWeek].label})`);

  try {
    const text = await generatePostContent(dayOfWeek);
    const result = await postToThreads(text);
    _lastPost = { date: today, success: true, postId: result.postId, error: null, text };
    console.log(`[Threads] ✅ 發文成功！Post ID: ${result.postId}`);
  } catch (err) {
    _lastPost = { date: today, success: false, postId: null, error: err.message, text: null };
    console.error(`[Threads] ❌ 發文失敗:`, err.message);
  }

  return _lastPost;
}

// ─── 自排程：每日台灣時間 09:00 發文 ────────────────────────
function startDailyScheduler() {
  if (!process.env.THREADS_USER_ID || !process.env.THREADS_ACCESS_TOKEN) {
    console.log('[Threads] ⚠️  未設定 THREADS_USER_ID / THREADS_ACCESS_TOKEN，自動發文停用');
    return;
  }

  function scheduleNextPost() {
    const nowUTC = Date.now();
    const taipeiMs = nowUTC + 8 * 3600000;
    const taipeiNow = new Date(taipeiMs);

    // 計算今日台灣時間 09:00
    const next9AM = new Date(taipeiNow);
    next9AM.setHours(9, 0, 0, 0);

    // 若已過 09:00，排到明日
    if (taipeiNow >= next9AM) next9AM.setDate(next9AM.getDate() + 1);

    const msUntil = next9AM.getTime() - taipeiNow.getTime();
    const nextUTC = new Date(next9AM.getTime() - 8 * 3600000);

    console.log(`[Threads] 下次發文：${nextUTC.toISOString()} (台灣時間 09:00)，距現在 ${Math.round(msUntil / 60000)} 分鐘`);

    setTimeout(async () => {
      await runDailyPost();
      scheduleNextPost(); // 發完後排下一次
    }, msUntil);
  }

  scheduleNextPost();
  console.log('[Threads] 自動發文排程已啟動 ✅');
}

// ─── OAuth 授權（一次性取得 Token）──────────────────────────
const APP_ID       = process.env.THREADS_APP_ID     || '1679750820036491';
const APP_SECRET   = process.env.THREADS_APP_SECRET || '';
const REDIRECT_URI = `${SITE_URL}/api/threads/callback`;

// 開始授權：手機開這個網址 → 跳到 Threads 授權頁
router.get('/auth/start', (req, res) => {
  const url = new URL('https://threads.net/oauth/authorize');
  url.searchParams.set('client_id', APP_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', 'threads_basic,threads_content_publish');
  url.searchParams.set('response_type', 'code');
  res.redirect(url.toString());
});

// 授權回調：自動換 Token，把結果顯示在畫面上，讓你複製到 Railway
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.send(`<h2 style="color:red">授權失敗：${error || '未收到授權碼'}</h2><a href="/">回首頁</a>`);
  }
  try {
    // 換短效 Token
    const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: APP_ID, client_secret: APP_SECRET,
        grant_type: 'authorization_code', redirect_uri: REDIRECT_URI, code }).toString()
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.send(`<h2>換取失敗</h2><pre>${JSON.stringify(tokenData, null, 2)}</pre>`);
    }

    // 換長效 Token（60天）
    const longRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&access_token=${tokenData.access_token}`
    );
    const longData = await longRes.json();
    const finalToken = longData.access_token || tokenData.access_token;
    const expiresAt  = new Date(Date.now() + (longData.expires_in || 5183944) * 1000).toLocaleDateString('zh-TW');

    // 顯示結果讓使用者複製到 Railway Variables
    res.send(`<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Threads 授權完成</title>
<style>body{font-family:sans-serif;background:#f5f0e8;padding:24px;max-width:600px;margin:0 auto}
.box{background:#fff;border-radius:12px;padding:28px;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,.08)}
h2{color:#2D4A2D;margin-top:0}label{font-size:13px;color:#888;font-weight:bold}
pre{background:#1a1a2e;color:#00ff88;padding:16px;border-radius:8px;word-break:break-all;white-space:pre-wrap;font-size:13px;user-select:all}
.step{background:#e8f5e8;border-left:4px solid #2D4A2D;padding:12px 16px;border-radius:4px;margin-bottom:12px;font-size:14px}
</style></head><body>
<div class="box">
  <h2>✅ Threads 授權成功！</h2>
  <p>請把以下兩個值複製到 <strong>Railway → Variables</strong></p>

  <label>THREADS_USER_ID（複製這串數字）</label>
  <pre>${tokenData.user_id}</pre>

  <label>THREADS_ACCESS_TOKEN（複製這串長 Token，有效至 ${expiresAt}）</label>
  <pre>${finalToken}</pre>
</div>
<div class="box">
  <h2>📋 接下來怎麼做</h2>
  <div class="step">① 複製上方兩個值</div>
  <div class="step">② 開啟 Railway → 你的 Service → Variables</div>
  <div class="step">③ 新增 <strong>THREADS_USER_ID</strong> 和 <strong>THREADS_ACCESS_TOKEN</strong></div>
  <div class="step">④ 儲存 → Railway 自動重啟 → 每天 09:00 開始自動發文 🎉</div>
</div>
</body></html>`);
  } catch (err) {
    res.send(`<h2>系統錯誤</h2><p>${err.message}</p>`);
  }
});

// ─── 管理 API 端點 ─────────────────────────────────────────

// 查看狀態（admin）
router.get('/status', adminAuth, (req, res) => {
  const taiwanTime = new Date(Date.now() + 8 * 3600000).toISOString().replace('T', ' ').slice(0, 19);
  res.json({
    last_post: _lastPost,
    credentials_set: !!(process.env.THREADS_USER_ID && process.env.THREADS_ACCESS_TOKEN),
    taiwan_time: taiwanTime,
    site_url: SITE_URL
  });
});

// 手動立即發文（admin，可指定 day 0-6）
router.post('/trigger', adminAuth, async (req, res) => {
  const forceDay = req.body.day !== undefined ? parseInt(req.body.day, 10) : null;
  if (forceDay !== null && (forceDay < 0 || forceDay > 6)) {
    return res.status(400).json({ success: false, message: 'day 必須是 0-6' });
  }
  try {
    const result = await runDailyPost(forceDay);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 預覽今日貼文內容（admin，不實際發出）
router.get('/preview', adminAuth, async (req, res) => {
  const dayParam = req.query.day !== undefined ? parseInt(req.query.day, 10) : null;
  const taipeiNow = new Date(Date.now() + 8 * 3600000);
  const dayOfWeek = (dayParam !== null && dayParam >= 0 && dayParam <= 6) ? dayParam : taipeiNow.getDay();
  const text = await generatePostContent(dayOfWeek);
  res.json({
    theme: WEEKLY_THEMES[dayOfWeek].label,
    day: dayOfWeek,
    length: text.length,
    text
  });
});

module.exports = { router, startDailyScheduler };
