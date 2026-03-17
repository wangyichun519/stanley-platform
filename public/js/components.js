// public/js/components.js - 共用導覽列與頁尾
const NAV_LINKS = [
  { href: '/index.html', label: '首頁' },
  { href: '/consulting.html', label: '🏥 顧問服務' },
  { href: '/training.html', label: '📚 教育訓練' },
  { href: '/camping.html', label: '🏕️ 療癒露營' },
  { href: '/coffee.html', label: '☕ 咖啡工坊' },
  { href: '/shop.html', label: '🛍️ 選物商店' },
];

function renderNavbar(activePath) {
  const links = NAV_LINKS.map(l => {
    const isActive = window.location.pathname.includes(l.href.replace('/',''));
    return `<li><a href="${l.href}" class="${isActive ? 'active' : ''}">${l.label}</a></li>`;
  }).join('');

  return `
  <nav class="navbar">
    <a href="/index.html" class="navbar-brand">
      <span class="logo-icon">🌿</span>
      <div>
        <div class="brand-text">Stanley 健康生活顧問</div>
        <div class="brand-sub">Coffee Priority × 漢方療癒 × 花蓮</div>
      </div>
    </a>
    <ul class="navbar-links">${links}</ul>
  </nav>`;
}

function renderFooter() {
  return `
  <footer>
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="footer-brand">🌿 Stanley 健康生活顧問</div>
          <p style="font-size:13px;margin-top:8px;">醫管顧問 × Coffee Priority × 漢方養生 × 花蓮在地療癒</p>
        </div>
        <div>
          <h4>服務項目</h4>
          <a href="/consulting.html">醫管顧問服務</a>
          <a href="/training.html">教育訓練課程</a>
          <a href="/camping.html">休閒療癒露營</a>
          <a href="/coffee.html">咖啡療癒工作坊</a>
        </div>
        <div>
          <h4>選物商店</h4>
          <a href="/shop.html?cat=coffee">Coffee Priority 咖啡</a>
          <a href="/shop.html?cat=tcm">漢方養生選物</a>
          <a href="/shop.html?cat=ltc">長照智慧輔具</a>
          <a href="/shop.html?cat=camping">露營裝備</a>
        </div>
        <div>
          <h4>聯絡我們</h4>
          <a href="mailto:">Email 諮詢</a>
          <a href="#">花蓮 × 宜花東服務</a>
          <a href="/admin">後台管理</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 Stanley 健康生活顧問 | Coffee Priority | 花蓮在地醫護專業品牌</p>
        <p style="margin-top:6px;font-size:12px;">精神護理 × SCA Q Grader × 漢方傳承 × 長照3.0顧問</p>
      </div>
    </div>
  </footer>`;
}

// Toast 通知
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `toast ${type}`;
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// API 呼叫封裝
async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiGet(url) {
  const res = await fetch(url);
  return res.json();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const navEl = document.getElementById('navbar');
  if (navEl) navEl.innerHTML = renderNavbar();
  const footerEl = document.getElementById('footer');
  if (footerEl) footerEl.innerHTML = renderFooter();
});
