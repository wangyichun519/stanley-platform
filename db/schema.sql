-- ============================================
-- 健康生活品牌整合平台 資料庫結構
-- Stanley Healthcare Platform Schema
-- ============================================

-- 會員資料表
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  member_type TEXT DEFAULT 'general',
  org TEXT,
  occupation TEXT,
  health_notes TEXT,
  points INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 顧問預約資料表
CREATE TABLE IF NOT EXISTS consulting_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  preferred_time TEXT,
  urgent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  total_amount INTEGER,
  deposit_paid INTEGER DEFAULT 0,
  payment_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 課程資料表
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  instructor TEXT DEFAULT 'Stanley',
  date TEXT NOT NULL,
  time TEXT,
  location TEXT DEFAULT '花蓮',
  duration_hours INTEGER,
  price INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  registered INTEGER DEFAULT 0,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 課程報名資料表
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER REFERENCES courses(id),
  name TEXT NOT NULL,
  id_last4 TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  occupation TEXT,
  org TEXT,
  need_receipt INTEGER DEFAULT 0,
  receipt_title TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 露營活動資料表
CREATE TABLE IF NOT EXISTS camping_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  event_type TEXT,
  description TEXT,
  date TEXT NOT NULL,
  location TEXT,
  price_adult INTEGER,
  price_elder INTEGER,
  price_child INTEGER,
  capacity INTEGER,
  registered INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 露營報名資料表
CREATE TABLE IF NOT EXISTS camping_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER REFERENCES camping_events(id),
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  adults INTEGER DEFAULT 0,
  elders INTEGER DEFAULT 0,
  children INTEGER DEFAULT 0,
  health_notes TEXT,
  need_accessibility INTEGER DEFAULT 0,
  diet_restriction TEXT,
  need_shuttle INTEGER DEFAULT 0,
  addons_json TEXT,
  total_amount INTEGER,
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 商品資料表
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  price INTEGER NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  ltc_subsidy INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 訂單資料表
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  items_json TEXT,
  total INTEGER NOT NULL,
  shipping_method TEXT DEFAULT 'delivery',
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入示範課程資料
INSERT OR IGNORE INTO courses (title, description, date, time, location, duration_hours, price, capacity, category) VALUES
('失智症照護實務講座', '了解失智症核心症狀、照護技巧與家屬支持策略。適合照服員、家屬及一般民眾參加。', '2026-03-15', '09:00-12:00', '花蓮市（報名後通知地點）', 3, 500, 30, 'dementia'),
('照服員核心訓練課程', '符合長照3.0規範的照服員完整訓練，90小時結訓核發證書。', '2026-04-01', '09:00-17:00', '花蓮市', 90, 8000, 20, 'caregiver'),
('感染控制實務課程', '醫護及照護人員必備感控知識，含實作演練。', '2026-03-22', '13:00-19:00', '花蓮市', 6, 800, 25, 'infection'),
('銀髮咖啡師初級班', '結合SCA精品咖啡知識與認知活化訓練，6週課程，每週六上午。', '2026-04-05', '每週六 09:00-11:00', '花蓮市 Coffee Priority 工作坊', 12, 3800, 12, 'coffee'),
('漢方養生照護工作坊', '結合中醫養生與現代照護，認識常用中藥材在日常照護中的應用。', '2026-03-29', '14:00-17:00', '花蓮市', 3, 600, 20, 'tcm');

-- 插入示範商品資料
INSERT OR IGNORE INTO products (name, category, description, price, stock, ltc_subsidy) VALUES
('花蓮精品咖啡豆 - 秀姑巒莊園', 'coffee', '海拔1200米，水洗處理，風味：柑橘蜂蜜，自家烘焙。150g', 520, 50, 0),
('花蓮精品咖啡豆 - 吉安日曬', 'coffee', '日曬處理，風味：莓果巧克力，自家烘焙。150g', 580, 30, 0),
('長者友善手沖咖啡組', 'coffee', '輕量手沖壺+濾杯+量匙，適合長者操作練習。', 880, 20, 0),
('銀髮養生茶禮盒', 'tcm', '精選六款漢方茶包，舒緩、助眠、活力配方，中藥行嚴選。20包/盒', 680, 40, 0),
('漢方沐浴包 - 舒活配方', 'tcm', '艾草+薑黃+菊花，促進循環，適合長者泡澡/泡腳。6包/組', 420, 60, 0),
('智慧離床感應器', 'ltc', '長照3.0補助輔具項目。床墊式設計，離床即時通知家屬App。', 3800, 10, 1),
('GPS走失防護定位器', 'ltc', '長照3.0補助輔具項目。輕薄可佩戴，電子圍籬+即時定位。', 4200, 10, 1),
('三代同堂露營輕量椅', 'camping', '適合長者的低重心折疊椅，含扶手，承重120kg，附提袋。', 1280, 15, 0);
