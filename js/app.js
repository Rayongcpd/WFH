/**
 * WFH System - Core App Logic
 * State, Auth, Navigation
 */

// ============================================
// APP STATE
// ============================================
const AppState = {
  currentUser: null,
  isAdmin: false,
  membersCache: [],
  configCache: null,
  latestLog: null,
  currentPage: 1,
  itemsPerPage: 20,
  role: 'member',
  DEFAULT_AVATAR: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E`,
  calendarDate: new Date(),
  selectedDate: new Date().toLocaleDateString('en-CA')
};

// ============================================
// THEME
// ============================================
function initTheme() {
  const savedTheme = localStorage.getItem('wfh_theme') || 'light';
  document.body.setAttribute('data-theme', savedTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = savedTheme === 'dark' ? 'fi fi-rr-sun' : 'fi fi-rr-moon';
  }
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('wfh_theme', newTheme);
  
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = newTheme === 'dark' ? 'fi fi-rr-sun' : 'fi fi-rr-moon';
  }
}

// ============================================
// UTILITIES
// ============================================
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showLoading(show) {
  const el = document.getElementById('loading');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'flex'; el.offsetHeight; el.classList.add('show'); }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('show'); setTimeout(() => el.style.display = 'none', 200); }
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('show');
}

function showToast(msg, type = 'success') {
  Swal.fire({ icon: type, title: msg, timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
}

// ============================================
// AUTH
// ============================================
async function checkAutoLogin() {
  showLoading(true);
  // Load config
  try {
    const cfgRes = await API.call('getConfig', {}, 'GET');
    if (cfgRes.success) { AppState.configCache = cfgRes.config; applyConfig(cfgRes.config); }
  } catch(e){}

  const saved = localStorage.getItem('wfh_session');
  if (saved) {
    try {
      const { u, p } = JSON.parse(saved);
      if (u && p) {
        const res = await API.call('login', { username: u, password: p });
        if (res.success) {
          await finalizeLogin(res.profile, u, p);
          return;
        }
      }
    } catch (e) { localStorage.removeItem('wfh_session'); }
  }
  showLoading(false);
  document.getElementById('loginScreen').style.display = 'flex';
}

async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('user').value.trim();
  const p = document.getElementById('pass').value.trim();
  if (!u || !p) { Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบ', 'warning'); return; }

  const btn = e.target.querySelector('button[type="submit"]');
  const oldText = btn.innerHTML;
  btn.innerHTML = '<i class="fi fi-rr-spinner" style="animation:spin 1s linear infinite; margin-right:6px"></i> กำลังเข้าสู่ระบบ...';
  btn.disabled = true;
  btn.style.opacity = '0.7';

  try {
    const res = await API.call('login', { username: u, password: p });
    if (res.success) {
      await finalizeLogin(res.profile, u, p);
      showToast('เข้าสู่ระบบสำเร็จ');
    } else {
      Swal.fire('เข้าสู่ระบบไม่สำเร็จ', res.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
    }
  } catch (err) {
    Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถเชื่อมต่อได้', 'error');
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

async function finalizeLogin(profile, username, password) {
  AppState.currentUser = profile || {};
  AppState.role = (profile.role || '').toLowerCase();
  AppState.isAdmin = ['admin', 'subadmin', 'superadmin'].includes(AppState.role);
  AppState.isSuperAdmin = AppState.role === 'superadmin';

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';

  applyRoleUI();
  await loadMembers();
  await switchTab('home');

  localStorage.setItem('wfh_session', JSON.stringify({ u: username, p: password, profile: profile }));
  showLoading(false);
}

function logout() {
  Swal.fire({
    title: 'ยืนยันออกจากระบบ', icon: 'question',
    showCancelButton: true, confirmButtonColor: '#0ea5e9', cancelButtonText: 'ยกเลิก', confirmButtonText: 'ออกจากระบบ'
  }).then(r => {
    if (r.isConfirmed) {
      localStorage.removeItem('wfh_session');
      AppState.currentUser = null; AppState.isAdmin = false;
      document.getElementById('appScreen').style.display = 'none';
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('user').value = '';
      document.getElementById('pass').value = '';
    }
  });
}

// ============================================
// CONFIG
// ============================================
function applyConfig(cfg) {
  if (!cfg) return;
  const name = cfg.org_name || cfg.app_name || 'WFH System';
  document.title = name;
  document.querySelectorAll('[data-app-name]').forEach(el => el.textContent = name);
  const descEl = document.getElementById('loginAppDesc');
  if (descEl) descEl.textContent = cfg.org_address || 'ระบบลงเวลาทำงานที่บ้าน';

  // Apply org logo
  if (cfg.org_logo) {
    const sidebarIcon = document.getElementById('sidebarBrandIcon');
    if (sidebarIcon) {
      sidebarIcon.style.background = 'transparent';
      sidebarIcon.innerHTML = `<img src="${cfg.org_logo}" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.style.background='';this.parentElement.innerHTML='<i class=fi fi-sr-home></i>'">`;
    }
    const loginIcon = document.getElementById('loginLogo');
    if (loginIcon) {
      loginIcon.style.background = 'transparent';
      loginIcon.innerHTML = `<img src="${cfg.org_logo}" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.style.background='';this.parentElement.innerHTML='<i class=fi fi-sr-home></i>'">`;
    }
  }

  // Apply staff label
  const staffLabel = cfg.staff_label || 'เจ้าหน้าที่';
  document.querySelectorAll('[data-staff-label]').forEach(el => el.textContent = staffLabel);
}

// ============================================
// NAVIGATION
// ============================================
function applyRoleUI() {
  buildSidebarMenu();
  updateSidebarUser();
  buildBottomNav();
}

function buildSidebarMenu() {
  const menu = document.getElementById('sidebarMenu');
  if (!menu) return;
  let h = '<div class="sidebar-menu-label">เมนูหลัก</div>';
  if (AppState.isAdmin) {
    h += menuItem('home', 'fi fi-rr-apps', 'ภาพรวม');
    h += menuItem('map', 'fi fi-rr-map', 'แผนที่');
    h += menuItem('plans', 'fi fi-rr-clipboard-list-check', 'แผนงาน');
    h += menuItem('adminStats', 'fi fi-rr-chart-pie', 'สรุปสถิติ');
    h += '<div class="sidebar-menu-label" style="margin-top:16px;">จัดการ</div>';
    h += menuItem('settings', 'fi fi-rr-settings', 'ตั้งค่า');
    if (AppState.isSuperAdmin) {
      h += menuItem('superControl', 'fi fi-rr-shield-check', 'ควบคุมโหมด');
    }
  } else {
    h += menuItem('home', 'fi fi-rr-home', 'หน้าหลัก');
    h += menuItem('plans', 'fi fi-rr-clipboard-list-check', 'แผนงาน');
    h += menuItem('stats', 'fi fi-rr-chart-histogram', 'สถิติ');
    h += menuItem('map', 'fi fi-rr-map', 'แผนที่');
  }
  menu.innerHTML = h;
  menu.querySelector('.nav-link-sidebar')?.classList.add('active');
}

function buildBottomNav() {
  const nav = document.getElementById('bottomNav');
  if (!nav) return;
  const items = AppState.isAdmin
    ? [
      { tab: 'home', icon: 'fi fi-rr-apps', label: 'ภาพรวม' },
      { tab: 'map', icon: 'fi fi-rr-map', label: 'แผนที่' },
      { tab: 'plans', icon: 'fi fi-rr-clipboard-list-check', label: 'แผนงาน' },
      { tab: 'adminStats', icon: 'fi fi-rr-chart-pie', label: 'สรุป' },
      ...(AppState.isSuperAdmin ? [{ tab: 'superControl', icon: 'fi fi-rr-shield-check', label: 'โหมด' }] : [])
    ]
    : [
      { tab: 'home', icon: 'fi fi-rr-home', label: 'หน้าหลัก' },
      { tab: 'plans', icon: 'fi fi-rr-clipboard-list-check', label: 'แผนงาน' },
      { tab: 'stats', icon: 'fi fi-rr-chart-histogram', label: 'สถิติ' },
      { tab: 'map', icon: 'fi fi-rr-map', label: 'แผนที่' },
    ];
  nav.innerHTML = items.map(i => `
    <button class="bn-item" data-tab="${i.tab}" onclick="switchTab('${i.tab}')">
      <div class="bn-icon-wrap"><i class="${i.icon}"></i></div>
      <span class="bn-label">${i.label}</span>
    </button>`).join('');
}

function menuItem(tab, icon, label) {
  return `<button class="nav-link-sidebar" data-tab="${tab}" onclick="switchTab('${tab}')">
    <i class="${icon}"></i><span>${label}</span></button>`;
}

function updateSidebarUser() {
  if (!AppState.currentUser) return;
  const n = AppState.currentUser.nickname || AppState.currentUser.fullName || '-';
  const staffLabel = AppState.configCache?.staff_label || 'เจ้าหน้าที่';
  const r = AppState.role === 'superadmin' ? '👑 Super Admin'
    : AppState.role === 'admin' ? 'Administrator'
    : AppState.role === 'subadmin' ? 'Sub-Admin' : staffLabel;
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('sidebarUserName', n); el('sidebarUserRole', r);
  el('adminWelcomeName', n);
  const img = document.getElementById('sidebarAvatar');
  if (img) img.src = AppState.currentUser.imageLH3 || AppState.DEFAULT_AVATAR;
}

async function switchTab(tab) {
  closeSidebar();
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-link-sidebar').forEach(el => el.classList.remove('active'));
  document.querySelector(`.nav-link-sidebar[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('#bottomNav .bn-item').forEach(b => b.classList.toggle('bn-active', b.dataset.tab === tab));

  const titles = { home: 'ภาพรวม', map: 'แผนที่', stats: 'สถิติ', adminStats: 'สรุปสถิติ', settings: 'ตั้งค่า', plans: 'แผนงาน', superControl: '👑 ควบคุมโหมด' };
  const ht = document.getElementById('headerPageTitle');
  if (ht) ht.textContent = titles[tab] || tab;

  if (tab === 'home') {
    if (AppState.isAdmin) {
      document.getElementById('viewHome')?.classList.add('active');
      await loadAdminDashboard();
    } else {
      document.getElementById('viewUserDashboard')?.classList.add('active');
      await renderUserDashboard();
    }
  } else if (tab === 'map') {
    document.getElementById('viewMap')?.classList.add('active');
    setTimeout(() => { if (typeof initMap === 'function') initMap(); }, 200);
  } else if (tab === 'stats') {
    document.getElementById('viewStats')?.classList.add('active');
    if (typeof loadUserStats === 'function') await loadUserStats();
  } else if (tab === 'adminStats') {
    document.getElementById('viewAdminStats')?.classList.add('active');
    if (typeof loadAdminStats === 'function') await loadAdminStats();
  } else if (tab === 'settings') {
    document.getElementById('viewSettings')?.classList.add('active');
    if (typeof loadSettingsForm === 'function') await loadSettingsForm();
  } else if (tab === 'plans') {
    document.getElementById('viewPlans')?.classList.add('active');
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof loadDailyPlans === 'function') await loadDailyPlans();
  } else if (tab === 'superControl') {
    document.getElementById('viewSuperControl')?.classList.add('active');
    if (typeof loadSuperControlPanel === 'function') await loadSuperControlPanel();
  }
}

// ============================================
// MEMBERS
// ============================================
async function loadMembers() {
  // Show member list skeleton
  showSkeleton('memberList', Skeleton.memberCards(4));
  try {
    const res = await API.call('getMembers', {}, 'GET');
    if (res.success) {
      let items = res.items || [];
      // Filter out superadmin if current user is not superadmin
      if (AppState.role !== 'superadmin') {
        items = items.filter(m => m.role !== 'superadmin');
      }

      // Sort members by priority: ผู้บริหาร > หัวหน้าฝ่าย > ผู้อำนวยการ > เจ้าหน้าที่
      AppState.membersCache = items.sort((a, b) => {
        const getPrio = (m) => {
          const p = m.position || '';
          const d = m.department || '';
          if (p.includes('ผู้บริหาร') || d.includes('ผู้บริหาร')) return 1;
          if (p.includes('หัวหน้าฝ่าย') || d.includes('หัวหน้าฝ่าย')) return 2;
          if (p.includes('ผู้อำนวยการ') || d.includes('ผู้อำนวยการ')) return 3;
          return 4; // เจ้าหน้าที่ or others
        };
        const pa = getPrio(a);
        const pb = getPrio(b);
        if (pa !== pb) return pa - pb;
        
        // If same priority (like "เจ้าหน้าที่"), sort by department to group them together
        if (a.department !== b.department) {
          return (a.department || '').localeCompare(b.department || '', 'th');
        }
        return (a.fullName || '').localeCompare(b.fullName || '', 'th');
      });
      
      if (AppState.isAdmin && typeof renderMemberList === 'function') renderMemberList();
      if (AppState.isAdmin && typeof updateAdminStats === 'function') updateAdminStats();
    }
  } catch (e) { console.error('loadMembers:', e); }
}

// ============================================
// ADMIN DASHBOARD
// ============================================
async function loadAdminDashboard() {
  // Show skeleton in hero and stat areas
  showSkeleton('adminHeroArea', Skeleton.hero());
  showSkeleton('adminStatArea', Skeleton.statCards(3));
  try {
    const res = await API.call('getTodayStats', {}, 'GET');
    if (res.success) {
      const validMembers = AppState.membersCache.filter(m => !['admin', 'subadmin', 'superadmin'].includes(m.role));
      const validCount = validMembers.length;
      const activeCount = res.activeCount || 0;
      const offCount = validCount - activeCount;
      const pct = validCount > 0 ? Math.round((activeCount / validCount) * 100) : 0;

      // Replace hero skeleton with real hero card
      replaceSkeleton('adminHeroArea', `
        <div class="hero-card">
          <div class="hero-inner">
            <div class="hero-welcome">สวัสดี 👋</div>
            <div class="hero-name" id="adminWelcomeName">${escHtml(AppState.currentUser?.nickname || AppState.currentUser?.fullName || 'Admin')}</div>
            <div class="duty-bar">
              <div class="duty-bar-header"><span>อัตราเข้าทำงาน</span><span id="dutyPercent">${pct}%</span></div>
              <div class="duty-progress"><div class="duty-progress-fill" id="dutyProgressFill" style="width:${pct}%"></div></div>
              <div class="duty-bar-footer"><span>🟢 ทำงาน: <b id="dutyOnCount">${activeCount}</b></span><span>⚫ ออกงาน: <b id="dutyOffCount">${offCount}</b></span></div>
            </div>
          </div>
        </div>`);

      // Replace stat cards skeleton with real stat cards
      const staffLabel = AppState.configCache?.staff_label || 'เจ้าหน้าที่';
      replaceSkeleton('adminStatArea', `
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background:var(--primary-bg)"><i class="fi fi-rr-users" style="color:var(--primary);font-size:18px"></i></div>
            <div class="stat-value" id="execTotal">${validCount}</div>
            <div class="stat-label">${escHtml(staffLabel)}ทั้งหมด</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:var(--success-bg)"><i class="fi fi-rr-laptop" style="color:var(--success);font-size:18px"></i></div>
            <div class="stat-value" style="color:var(--success)" id="execOnDuty">${activeCount}</div>
            <div class="stat-label">กำลังทำงาน</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#f1f5f9"><i class="fi fi-rr-moon" style="color:var(--light-gray);font-size:18px"></i></div>
            <div class="stat-value" style="color:var(--light-gray)" id="execOffDuty">${offCount}</div>
            <div class="stat-label">ออกงานแล้ว</div>
          </div>
        </div>`);
    }
  } catch (e) { console.error('Admin dashboard error:', e); }
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme
  initTheme();

  // Check API URL
  if (!API.getUrl()) {
    document.getElementById('apiSetupScreen').style.display = 'flex';
    document.getElementById('loginScreen').style.display = 'none';
    showLoading(false);
  } else {
    checkAutoLogin();
  }

  // Clock
  function updateClock() {
    const el = document.getElementById('heroDateTime');
    if (!el) return;
    const now = new Date();
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์'];
    el.textContent = `วัน${days[now.getDay()]} ${now.toLocaleDateString('th-TH')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`;
  }
  updateClock();
  setInterval(updateClock, 30000);
});

function saveApiUrl() {
  const url = document.getElementById('apiUrlInput').value.trim();
  if (!url) { Swal.fire('แจ้งเตือน', 'กรุณากรอก URL', 'warning'); return; }
  API.setUrl(url);
  document.getElementById('apiSetupScreen').style.display = 'none';
  checkAutoLogin();
}

function togglePassVis() {
  const p = document.getElementById('pass');
  const icon = document.getElementById('togglePassIcon');
  if (p.type === 'password') { p.type = 'text'; icon.className = 'fi fi-rr-eye-crossed'; }
  else { p.type = 'password'; icon.className = 'fi fi-rr-eye'; }
}
