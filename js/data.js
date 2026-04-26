/**
 * WFH System - Data Operations
 * Check-in/out, Members CRUD, Plans
 */

// ============================================
// CHECK-IN / CHECK-OUT
// ============================================
async function handleCheckIn() {
  const last = AppState.latestLog;
  if (last && last.type === 'Check-in') {
    // Check-out flow
    const r = await Swal.fire({
      title: 'ยืนยันการออกงาน?', icon: 'question',
      showCancelButton: true, confirmButtonColor: '#ef4444',
      cancelButtonText: 'ยกเลิก', confirmButtonText: 'ออกงาน'
    });
    if (r.isConfirmed) performGPSAction('Check-out');
    return;
  }
  // Check-in flow
  performGPSAction('Check-in');
}

async function performGPSAction(type) {
  showLoading(true);
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 15000, maximumAge: 0
      });
    });

    // Mock GPS Detection
    if (pos.coords.accuracy === 0 || pos.coords.accuracy > 1500) {
      showLoading(false);
      Swal.fire('พิกัดผิดปกติ', 'ระบบตรวจพบความแม่นยำของ GPS ผิดปกติ (อาจเกิดจากการจำลองพิกัดหรือสัญญาณอ่อนมาก) กรุณาลองใหม่อีกครั้ง', 'warning');
      return;
    }

    const payload = {
      username: AppState.currentUser.username,
      fullName: AppState.currentUser.fullName,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy
    };

    const action = type === 'Check-in' ? 'checkIn' : 'checkOut';
    const res = await API.call(action, payload);
    showLoading(false);

    if (res.success) {
      if (type === 'Check-in' && res.locationStatus) {
        const isHome = res.locationStatus === 'at_home';
        const icon = isHome ? '🏠' : '⚠️';
        const statusText = isHome
          ? `อยู่ในพื้นที่บ้าน`
          : res.locationStatus === 'outside'
            ? `อยู่นอกพื้นที่บ้าน (${res.distFromHome}m)`
            : 'ยังไม่ได้ตั้งค่าพิกัดบ้าน';
        Swal.fire({
          icon: isHome ? 'success' : 'warning',
          title: `${icon} เข้างานสำเร็จ`,
          html: `<div style="font-size:0.9rem;color:#475569;">${statusText}</div>`,
          timer: 2500, showConfirmButton: false
        });
      } else {
        showToast(type === 'Check-in' ? 'เข้างานสำเร็จ' : 'ออกงานสำเร็จ');
      }
      renderUserDashboard();
    } else {
      Swal.fire('ผิดพลาด', res.message || 'ไม่สามารถบันทึกได้', 'error');
    }
  } catch (err) {
    showLoading(false);
    if (err.code === 1) {
      Swal.fire('ไม่อนุญาต GPS', 'กรุณาเปิดการเข้าถึงตำแหน่งที่ตั้ง', 'error');
    } else {
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถระบุตำแหน่งได้', 'error');
    }
  }
}

// ============================================
// USER DASHBOARD
// ============================================
async function renderUserDashboard() {
  if (!AppState.currentUser) return;

  const nickEl = document.getElementById('dashNick');
  const nameEl = document.getElementById('dashFullName');
  const avatarEl = document.getElementById('dashAvatar');
  const dateEl = document.getElementById('dashDate');

  if (nickEl) {
    const staffLabel = AppState.configCache?.staff_label || 'เจ้าหน้าที่';
    nickEl.textContent = AppState.currentUser.nickname || staffLabel;
  }
  if (nameEl) nameEl.textContent = AppState.currentUser.fullName || '-';
  if (avatarEl && AppState.currentUser.imageLH3) avatarEl.src = AppState.currentUser.imageLH3;
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long' });

  const hc = document.getElementById('homeLocationContainer');
  if (hc) {
    if (AppState.currentUser.homeLat) {
      hc.innerHTML = `<div style="padding:10px 16px; border-radius:12px; background:var(--success-bg); border:1px dashed var(--success); display:inline-block; text-align:center;">
        <div style="font-size:0.85rem; font-weight:700; color:var(--success); display:flex; align-items:center; justify-content:center; gap:6px;">
          <i class="fi fi-rr-map-marker-home"></i> ตั้งค่าพิกัดบ้านเรียบร้อยแล้ว
        </div>
        <div style="font-size:0.75rem; color:var(--gray); margin-top:4px;">หากต้องการเปลี่ยนแปลงพิกัดใหม่ กรุณาติดต่อ Admin</div>
      </div>`;
    } else {
      hc.innerHTML = `<button onclick="openSetHomeLocation()" style="background:var(--primary-bg);border:1.5px solid #bae6fd;padding:10px 20px;border-radius:12px;color:var(--primary);font-weight:700;font-size:0.82rem;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px">
        <i class="fi fi-rr-map-marker-home"></i> ตั้งค่าพิกัดบ้าน
      </button>`;
    }
  }

  try {
    const data = await API.call('getPersonalStats', { username: AppState.currentUser.username, requestorUsername: AppState.currentUser.username }, 'GET');
    if (!data.success) return;

    const si = document.getElementById('dashStatIn');
    const so = document.getElementById('dashStatHours');
    if (si) si.textContent = data.totalCheckIn || 0;
    if (so) so.textContent = data.totalCheckOut || 0;

    const lastLog = data.recentLogs && data.recentLogs.length > 0 ? data.recentLogs[0] : null;
    AppState.latestLog = lastLog;
    renderActionArea(lastLog);
    renderDashboardRecent(data.recentLogs);
  } catch (e) { console.error('Dashboard error:', e); }
}

function renderActionArea(lastLog) {
  const c = document.getElementById('dashActionArea');
  if (!c) return;
  const isIn = lastLog && lastLog.type === 'Check-in';

  if (isIn) {
    const t = lastLog.timestamp ? lastLog.timestamp.split(' ')[1] : '';
    const locIcon = lastLog.locationStatus === 'at_home' ? '🏠' : lastLog.locationStatus === 'outside' ? '⚠️' : '📍';
    c.innerHTML = `
      <div class="status-badge status-online">
        <div class="pulse-dot"></div>
        <div style="flex:1">
          <div class="status-title">กำลังทำงานที่บ้าน ${locIcon}</div>
          <div class="status-sub">เข้างานเมื่อ ${escHtml(t)} น.</div>
        </div>
      </div>
      <button onclick="handleCheckIn()" class="action-btn action-btn-out">
        <div class="action-btn-icon"><i class="fi fi-rr-sign-out-alt"></i></div>
        <div class="action-btn-title">ลงเวลาออกงาน</div>
        <div class="action-btn-sub">สิ้นสุดการทำงาน</div>
      </button>`;
  } else {
    c.innerHTML = `
      <button onclick="handleCheckIn()" class="action-btn action-btn-in">
        <div class="action-btn-icon"><i class="fi fi-sr-fingerprint"></i></div>
        <div class="action-btn-title">ลงเวลาเข้างาน</div>
        <div class="action-btn-sub">เริ่มทำงานที่บ้าน</div>
      </button>`;
  }
}

function renderDashboardRecent(logs) {
  const el = document.getElementById('dashRecentList');
  if (!el) return;
  if (!logs || !logs.length) {
    el.innerHTML = '<div class="empty-state"><i class="fi fi-rr-calendar-clock"></i><span>ยังไม่มีประวัติ</span></div>';
    return;
  }
  el.innerHTML = logs.slice(0, 5).map((l, i) => {
    const isIn = l.type === 'Check-in';
    const icon = isIn ? 'fi-sr-shield-check' : 'fi-rr-sign-out-alt';
    const color = isIn ? 'var(--success)' : 'var(--danger)';
    const bg = isIn ? 'var(--success-bg)' : 'var(--danger-bg)';
    const locBadge = l.locationStatus === 'at_home' ? '<span class="loc-badge home">🏠 บ้าน</span>'
      : l.locationStatus === 'outside' ? '<span class="loc-badge away">⚠️ นอกพื้นที่</span>' : '';
    return `
      <div class="timeline-item">
        <div class="timeline-dot" style="background:${bg};color:${color}"><i class="fi ${icon}"></i></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-type">${isIn ? 'เข้างาน' : 'ออกงาน'} ${locBadge}</span>
            <span class="timeline-time" style="color:${color}">${escHtml(l.timestamp?.split(' ')[1] || '')} น.</span>
          </div>
          <div class="timeline-date">${escHtml(l.timestamp?.split(' ')[0] || '')}</div>
        </div>
      </div>`;
  }).join('');
}

// ============================================
// USER STATS
// ============================================
async function loadUserStats() {
  try {
    const data = await API.call('getPersonalStats', { username: AppState.currentUser.username }, 'GET');
    if (!data.success) return;

    const si = document.getElementById('statInTotal');
    const so = document.getElementById('statOutTotal');
    if (si) si.textContent = data.totalCheckIn || 0;
    if (so) so.textContent = data.totalCheckOut || 0;

    // Chart
    if (typeof Chart !== 'undefined' && data.chartLabels) {
      const ctx = document.getElementById('statsChart')?.getContext('2d');
      if (ctx) {
        if (window._statsChart) window._statsChart.destroy();
        window._statsChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.chartLabels,
            datasets: [
              { label: 'เข้างาน', data: data.chartDataIn, backgroundColor: '#0ea5e9', borderRadius: 6 },
              { label: 'ออกงาน', data: data.chartDataOut, backgroundColor: '#f43f5e', borderRadius: 6 }
            ]
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
      }
    }

    // History with Pagination
    const logs = data.recentLogs || [];
    AppState.myStatsLogs = logs;
    AppState.myStatsPage = 1;
    renderMyStatsPage();

  } catch (e) { console.error('Stats error:', e); }
}

function renderMyStatsPage() {
  const listEl = document.getElementById('myStatsList');
  const pageEl = document.getElementById('myStatsPagination');
  const logs = AppState.myStatsLogs || [];
  const pageSize = 10;
  const totalPages = Math.ceil(logs.length / pageSize) || 1;
  const p = AppState.myStatsPage || 1;
  
  const start = (p - 1) * pageSize;
  const end = start + pageSize;
  const currentLogs = logs.slice(start, end);

  if (listEl) {
    if (currentLogs.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><span>ไม่มีประวัติ</span></div>';
    } else {
      listEl.innerHTML = currentLogs.map(l => {
        const isIn = l.type === 'Check-in';
        return `<div class="stat-log-item">
          <div class="stat-log-icon ${isIn ? 'in' : 'out'}"><i class="fi ${isIn ? 'fi-rr-sign-in-alt' : 'fi-rr-sign-out-alt'}"></i></div>
          <div class="stat-log-info">
            <div class="stat-log-type">${escHtml(l.type)}</div>
            <div class="stat-log-time">${escHtml(l.timestamp)}</div>
          </div>
        </div>`;
      }).join('');
    }
  }

  if (pageEl) {
    if (totalPages > 1) {
      pageEl.innerHTML = `
        <button class="btn-outline" style="padding:4px 8px;font-size:0.75rem;" onclick="AppState.myStatsPage=Math.max(1, AppState.myStatsPage-1);renderMyStatsPage()" ${p===1?'disabled':''}>ก่อนหน้า</button>
        <span style="font-size:0.8rem;align-self:center;">หน้า ${p} / ${totalPages}</span>
        <button class="btn-outline" style="padding:4px 8px;font-size:0.75rem;" onclick="AppState.myStatsPage=Math.min(${totalPages}, AppState.myStatsPage+1);renderMyStatsPage()" ${p===totalPages?'disabled':''}>ถัดไป</button>
      `;
    } else {
      pageEl.innerHTML = '';
    }
  }
}

// ============================================
// ADMIN STATS
// ============================================
async function loadAdminStats() {
  try {
    const res = await API.call('getAllStats', {}, 'GET');
    if (!res.success) return;

    let stats = (res.stats || []);
    // Filter out superadmin from stats if not superadmin
    if (AppState.role !== 'superadmin') {
      stats = stats.filter(s => {
        const m = AppState.membersCache.find(x => x.username === s.username);
        return m ? m.role !== 'superadmin' : true;
      });
    }

    stats.sort((a, b) => {
      const getPrio = (m) => {
        const p = m.position || '';
        const d = m.department || '';
        if (p.includes('ผู้บริหาร') || d.includes('ผู้บริหาร')) return 1;
        if (p.includes('หัวหน้าฝ่าย') || d.includes('หัวหน้าฝ่าย')) return 2;
        if (p.includes('ผู้อำนวยการ') || d.includes('ผู้อำนวยการ')) return 3;
        return 4;
      };
      const pa = getPrio(a);
      const pb = getPrio(b);
      if (pa !== pb) return pa - pb;
      if (a.department !== b.department) return (a.department || '').localeCompare(b.department || '', 'th');
      return (a.fullName || '').localeCompare(b.fullName || '', 'th');
    });

    let totalIn = 0, totalOut = 0;
    stats.forEach(s => { totalIn += s.checkIn; totalOut += s.checkOut; });

    const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setVal('indvTotalIn', totalIn);
    setVal('indvTotalOut', totalOut);
    setVal('indvTotalMembers', stats.length);

    const tbody = document.getElementById('indvTableBody');
    if (tbody) {
      tbody.innerHTML = stats.map((s, i) => `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td><div style="display:flex;align-items:center;gap:8px">
            <img src="${s.image || ''}" style="width:30px;height:30px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">
            <div><div style="font-weight:600">${escHtml(s.fullName)}</div><div style="font-size:0.72rem;color:#94a3b8">${escHtml(s.department || '')}</div></div>
          </div></td>
          <td>${escHtml(s.department || '-')}</td>
          <td style="text-align:center;color:var(--success);font-weight:700">${s.checkIn}</td>
          <td style="text-align:center;color:var(--danger);font-weight:700">${s.checkOut}</td>
          <td style="text-align:center;color:#f59e0b;font-weight:700">${s.lateCount || 0}</td>
          <td style="text-align:center;font-weight:700">${escHtml(s.totalWorkingTime || '0 นาที')}</td>
          <td style="font-size:0.78rem">${escHtml(s.lastIn || '-')}</td>
          <td style="font-size:0.78rem">${escHtml(s.lastOut || '-')}</td>
          <td style="text-align:center"><button onclick="printUserReport('${s.username}')" style="background:var(--primary-bg);border:none;color:var(--primary);padding:4px 8px;border-radius:6px;cursor:pointer;"><i class="fi fi-rr-print"></i></button></td>
        </tr>`).join('');
    }
  } catch (e) { console.error('Admin stats error:', e); }
}

// ============================================
// MEMBER LIST (Admin)
// ============================================
function renderMemberList() {
  const el = document.getElementById('memberList');
  if (!el) return;

  // Filter members: Hide superadmin from others, but show to superadmin themselves
  let members = AppState.membersCache;
  if (AppState.role !== 'superadmin') {
    members = members.filter(m => m.role !== 'superadmin');
  }

  const badge = document.getElementById('memberCountBadge');
  if (badge) badge.textContent = members.length + ' คน';

  el.innerHTML = '<div class="member-card-grid">' + members.map((m) => {
    const posLabel = m.position || AppState.configCache?.staff_label || 'เจ้าหน้าที่';
    let roleBadge = '';
    if (m.role === 'superadmin') roleBadge = '<span class="admin-badge" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;">👑 Super</span>';
    else if (m.role === 'admin') roleBadge = '<span class="admin-badge">Admin</span>';
    else if (m.role === 'subadmin') roleBadge = '<span class="admin-badge" style="background:#fef3c7;color:#d97706;">Sub-Admin</span>';

    let roleBtn = '';
    if ((AppState.role === 'admin' || AppState.role === 'superadmin') && m.username !== AppState.currentUser.username && m.username !== 'admin') {
      if (m.role === 'subadmin') {
        roleBtn = `<button onclick="toggleMemberRole('${m.id}', 'member', '${m.fullName.replace(/'/g, "\\'")}')" style="background:transparent;color:#d97706;border:1.5px dashed #fcd34d;border-radius:6px;padding:3px 8px;font-size:0.68rem;cursor:pointer;display:inline-flex;align-items:center;gap:3px;font-family:inherit;" title="ลดสิทธิ์เป็นสมาชิกทั่วไป"><i class="fi fi-rr-arrow-small-down"></i> ลดสิทธิ์</button>`;
      } else if (m.role !== 'admin' && m.role !== 'superadmin') {
        roleBtn = `<button onclick="toggleMemberRole('${m.id}', 'subadmin', '${m.fullName.replace(/'/g, "\\'")}')" style="background:transparent;color:#0284c7;border:1.5px dashed #bae6fd;border-radius:6px;padding:3px 8px;font-size:0.68rem;cursor:pointer;display:inline-flex;align-items:center;gap:3px;font-family:inherit;" title="เพิ่มสิทธิ์เป็น Sub-Admin"><i class="fi fi-rr-arrow-small-up"></i> เพิ่มสิทธิ์</button>`;
      }
    }

    // SuperAdmin mode badges
    let modeBadges = '';
    if (AppState.isSuperAdmin && m.role !== 'superadmin') {
      if (m.ghostProtocol) modeBadges += '<span class="mode-badge-inline" style="background:#ede9fe;color:#6d28d9;">👻 Ghost</span> ';
      if (m.originEcho) modeBadges += '<span class="mode-badge-inline" style="background:#fef3c7;color:#b45309;">🔮 Echo</span>';
    }

    let resetBtn = '';
    let editBtn = '';
    if (AppState.role === 'admin' || AppState.role === 'superadmin') {
      editBtn = `<button onclick="openMemberEditModal('${m.id}')" style="background:var(--card-bg);color:var(--gray);border:1px solid var(--border);border-radius:6px;padding:3px 6px;font-size:0.7rem;cursor:pointer" title="แก้ไขข้อมูล"><i class="fi fi-rr-edit"></i></button>`;
      if (m.homeLat) {
        resetBtn = `<button onclick="resetMemberHomeLocation('${m.id}', '${m.fullName.replace(/'/g, "\\'")}')" style="background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger);border-radius:6px;padding:3px 6px;font-size:0.7rem;cursor:pointer" title="รีเซ็ตพิกัด"><i class="fi fi-rr-refresh"></i></button>`;
      }
    }

    const avatarStatus = m.isWorking ? 'status-online' : 'status-offline';
    const statusTitle = m.isWorking ? 'กำลังทำงาน' : 'ออกงานแล้ว';
    const homeStatus = m.homeLat ? '<span style="color:var(--success);font-size:0.72rem;"><i class="fi fi-rr-check" style="font-size:0.6rem"></i> ตั้งพิกัดแล้ว</span>' : '<span style="color:var(--light-gray);font-size:0.72rem;">ยังไม่ตั้งพิกัด</span>';

    return `
    <div class="member-item">
      <div class="member-header">
        <div class="member-avatar-wrap">
          <img src="${m.imageLH3 || ''}" class="member-avatar ${avatarStatus}" title="${statusTitle}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23ccc%22 viewBox=%220 0 24 24%22%3E%3Cpath d=%22M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z%22/%3E%3C/svg%3E'">
        </div>
        <div style="flex:1;min-width:0;">
          <div class="member-name">${escHtml(m.fullName)} ${roleBadge}</div>
          <div class="member-meta">${escHtml(m.nickname || '-')} · @${escHtml(m.username)}</div>
        </div>
      </div>
      <div class="member-body">
        <div class="member-detail-row"><i class="fi fi-rr-briefcase"></i> ${escHtml(posLabel)}</div>
        <div class="member-detail-row"><i class="fi fi-rr-building"></i> ${escHtml(m.department || 'ไม่ระบุกลุ่ม')}</div>
        <div class="member-detail-row"><i class="fi fi-rr-marker"></i> ${homeStatus}</div>
        ${modeBadges ? `<div style="margin-top:6px;">${modeBadges}</div>` : ''}
      </div>
      <div class="member-footer">
        <div class="member-actions">
          ${editBtn}
          ${resetBtn}
          ${roleBtn}
        </div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

async function resetMemberHomeLocation(id, name) {
  const staffLabel = AppState.configCache?.staff_label || 'เจ้าหน้าที่';
  const r = await Swal.fire({
    title: 'ยืนยันการรีเซ็ตพิกัด?',
    html: `คุณต้องการรีเซ็ตพิกัดบ้านของ <b>${escHtml(name)}</b> ใช่หรือไม่?<br><span style="font-size:0.85rem;color:var(--gray)">หลังจากรีเซ็ต ${staffLabel}จะสามารถตั้งพิกัดใหม่ด้วยตัวเองได้อีกครั้ง</span>`,
    icon: 'warning', showCancelButton: true, confirmButtonText: 'รีเซ็ตพิกัด', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#ef4444'
  });
  if (!r.isConfirmed) return;
  showLoading(true);
  try {
    const res = await API.call('resetHomeLocation', { id: id, adminUsername: AppState.currentUser.username });
    showLoading(false);
    if (res.success) {
      showToast('รีเซ็ตพิกัดสำเร็จ');
      loadMembers();
    } else {
      Swal.fire('ผิดพลาด', res.message, 'error');
    }
  } catch (e) {
    showLoading(false);
    Swal.fire('ผิดพลาด', e.message, 'error');
  }
}

async function toggleMemberRole(id, role, name) {
  const staffLabel = AppState.configCache?.staff_label || 'เจ้าหน้าที่';
  const roleName = role === 'subadmin' ? 'Sub-Admin' : staffLabel;
  const r = await Swal.fire({
    title: 'ยืนยันการปรับสถานะ?',
    html: `คุณต้องการเปลี่ยนสถานะของ <b>${escHtml(name)}</b> เป็น <b>${roleName}</b> ใช่หรือไม่?`,
    icon: 'question', showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#0ea5e9'
  });
  if (!r.isConfirmed) return;
  showLoading(true);
  try {
    const res = await API.call('updateRole', { id: id, role: role, adminUsername: AppState.currentUser.username });
    showLoading(false);
    if (res.success) {
      showToast('ปรับสถานะสำเร็จ');
      loadMembers();
    } else {
      Swal.fire('ผิดพลาด', res.message, 'error');
    }
  } catch (e) {
    showLoading(false);
    Swal.fire('ผิดพลาด', e.message, 'error');
  }
}

// ============================================
// HOME LOCATION
// ============================================
async function openSetHomeLocation() {
  if (AppState.currentUser.homeLat) {
    Swal.fire('แจ้งเตือน', 'คุณได้ตั้งพิกัดบ้านไปแล้ว หากต้องการเปลี่ยนแปลงกรุณาติดต่อ Admin', 'warning');
    return;
  }
  const r = await Swal.fire({
    title: '📍 ตั้งพิกัดบ้าน',
    html: 'ระบบจะใช้ตำแหน่งปัจจุบันเป็นพิกัดบ้านของคุณ<br>ใช้สำหรับตรวจสอบว่าทำงานที่บ้านจริง',
    icon: 'info', showCancelButton: true, confirmButtonText: 'ตั้งพิกัดเลย', cancelButtonText: 'ยกเลิก'
  });
  if (!r.isConfirmed) return;

  showLoading(true);
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
    });
    const res = await API.call('saveHomeLocation', {
      id: AppState.currentUser.id,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      radius: 200
    });
    showLoading(false);
    if (res.success) {
      AppState.currentUser.homeLat = pos.coords.latitude;
      AppState.currentUser.homeLng = pos.coords.longitude;
      Swal.fire({ icon: 'success', title: '🏠 บันทึกพิกัดบ้านสำเร็จ', timer: 2000, showConfirmButton: false });
      renderUserDashboard();
    }
  } catch (e) {
    showLoading(false);
    Swal.fire('ผิดพลาด', 'ไม่สามารถระบุตำแหน่งได้', 'error');
  }
}

// ============================================
// DAILY PLANS
// ============================================
async function loadDailyPlans() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const res = await API.call('getDailyPlans', { date: today }, 'GET');
    const el = document.getElementById('plansList');
    if (!el) return;
    const plans = (res.success && res.plans) ? res.plans : [];
    if (!plans.length) {
      AppState.plansCache = [];
      el.innerHTML = '<div class="empty-state"><i class="fi fi-rr-clipboard-list-check"></i><span>ยังไม่มีแผนงานวันนี้</span></div>';
      return;
    }
    AppState.plansCache = plans;
    el.innerHTML = plans.map(p => {
      const isOwner = p.username === AppState.currentUser.username || AppState.isAdmin;
      const actions = isOwner ? `
        <div style="display:flex;gap:12px;margin-left:12px;">
          <button onclick="openPlanModal('${p.id}')" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:16px"><i class="fi fi-rr-edit"></i></button>
          <button onclick="deletePlan('${p.id}')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px"><i class="fi fi-rr-trash"></i></button>
        </div>` : '';
      return `
      <div class="plan-card">
        <div class="plan-header" style="align-items:flex-start">
          <div style="flex:1">
            <div class="plan-name">${escHtml(p.fullName)}</div>
            <div class="plan-time">${escHtml(p.timestamp)}</div>
          </div>
          ${actions}
        </div>
        <div class="plan-tasks">${(p.tasks || []).map(t => `<div class="plan-task-item"><i class="fi fi-rr-check-circle"></i> ${escHtml(t)}</div>`).join('')}</div>
        ${p.note ? `<div class="plan-note">${escHtml(p.note)}</div>` : ''}
      </div>`;
    }).join('');
  } catch (e) { console.error('Plans error:', e); }
}

function openPlanModal(planId = '') {
  document.getElementById('planId').value = planId;
  const modalTitle = document.querySelector('#planModal .modal-header h3');
  if (planId) {
    const p = (AppState.plansCache || []).find(x => x.id === planId);
    if (p) {
      document.getElementById('planTasks').value = p.tasks.join('\n');
      document.getElementById('planNote').value = p.note || '';
    }
    if (modalTitle) modalTitle.innerHTML = '<i class="fi fi-rr-edit" style="margin-right:8px"></i> แก้ไขแผนงาน';
  } else {
    document.getElementById('planTasks').value = '';
    document.getElementById('planNote').value = '';
    if (modalTitle) modalTitle.innerHTML = '<i class="fi fi-rr-clipboard-list-check" style="margin-right:8px"></i> เพิ่มแผนงาน';
  }
  openModal('planModal');
}

async function submitDailyPlan(e) {
  e.preventDefault();
  const id = document.getElementById('planId')?.value;
  const tasksText = document.getElementById('planTasks')?.value.trim();
  const note = document.getElementById('planNote')?.value.trim();
  if (!tasksText) { Swal.fire('แจ้งเตือน', 'กรุณากรอกรายการงาน', 'warning'); return; }

  const tasks = tasksText.split('\n').filter(t => t.trim());
  showLoading(true);
  try {
    let res;
    if (id) {
      res = await API.call('updateDailyPlan', { id: id, username: AppState.currentUser.username, tasks: tasks, note: note });
    } else {
      res = await API.call('saveDailyPlan', {
        username: AppState.currentUser.username,
        fullName: AppState.currentUser.fullName,
        tasks: tasks, note: note
      });
    }
    showLoading(false);
    if (res.success) {
      closeModal('planModal');
      showToast(id ? 'อัปเดตแผนงานสำเร็จ' : 'บันทึกแผนงานสำเร็จ');
      loadDailyPlans();
    } else {
      Swal.fire('ผิดพลาด', res.message, 'error');
    }
  } catch (e) { showLoading(false); Swal.fire('ผิดพลาด', e.message, 'error'); }
}

async function deletePlan(id) {
  const r = await Swal.fire({ title: 'ยืนยันการลบ?', text: 'คุณต้องการลบแผนงานนี้ใช่หรือไม่', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก' });
  if (!r.isConfirmed) return;
  showLoading(true);
  try {
    const res = await API.call('deleteDailyPlan', { id: id, username: AppState.currentUser.username });
    showLoading(false);
    if (res.success) { showToast('ลบแผนงานสำเร็จ'); loadDailyPlans(); }
    else Swal.fire('ผิดพลาด', res.message, 'error');
  } catch (e) { showLoading(false); Swal.fire('ผิดพลาด', e.message, 'error'); }
}

// ============================================
// SETTINGS (Admin)
// ============================================
async function loadSettingsForm() {
  try {
    const res = await API.call('getConfig', {}, 'GET');
    if (!res.success) return;
    const cfg = res.config;
    const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ''; };
    setVal('settingAppName', cfg.org_name || cfg.app_name);
    setVal('settingStaffLabel', cfg.staff_label || 'เจ้าหน้าที่');
    setVal('settingAddress', cfg.org_address);
    setVal('settingPhone', cfg.org_phone);
    setVal('settingHomeRadius', cfg.home_radius || 200);
    setVal('settingLateTime', cfg.late_time || '08:30');
    setVal('settingTelegramBot', cfg.telegram_bot_token);
    setVal('settingTelegramChat', cfg.telegram_chat_id);

    // Show existing logo
    const logoPreview = document.getElementById('settingLogoPreview');
    if (logoPreview && cfg.org_logo) {
      logoPreview.innerHTML = `<img src="${cfg.org_logo}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<i class=fi fi-sr-home style=font-size:20px;color:var(--primary)></i>'">`;
    }
  } catch (e) { }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  showLoading(true);
  try {
    // Upload logo if selected
    const logoInput = document.getElementById('settingLogoFile');
    if (logoInput && logoInput.files && logoInput.files[0]) {
      const file = logoInput.files[0];
      if (file.size > 2 * 1024 * 1024) {
        showLoading(false);
        Swal.fire('ขนาดไฟล์ใหญ่เกินไป', 'กรุณาเลือกรูปขนาดไม่เกิน 2MB', 'warning');
        return;
      }
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });
      const logoRes = await API.call('uploadLogo', { image: { dataUrl: dataUrl, name: file.name } });
      if (logoRes.success && logoRes.logoUrl) {
        const cfg = AppState.configCache || {};
        cfg.org_logo = logoRes.logoUrl;
        AppState.configCache = cfg;
      }
    }

    const cfg = AppState.configCache || {};
    cfg.org_name = document.getElementById('settingAppName')?.value.trim();
    cfg.app_name = cfg.org_name;
    cfg.staff_label = document.getElementById('settingStaffLabel')?.value.trim() || 'เจ้าหน้าที่';
    cfg.org_address = document.getElementById('settingAddress')?.value.trim();
    cfg.org_phone = document.getElementById('settingPhone')?.value.trim();
    cfg.home_radius = parseInt(document.getElementById('settingHomeRadius')?.value) || 200;
    cfg.late_time = document.getElementById('settingLateTime')?.value || '08:30';
    cfg.telegram_bot_token = document.getElementById('settingTelegramBot')?.value.trim();
    cfg.telegram_chat_id = document.getElementById('settingTelegramChat')?.value.trim();

    await API.call('saveConfig', cfg);
    AppState.configCache = cfg;
    applyConfig(cfg);
    showLoading(false);
    showToast('บันทึกการตั้งค่าสำเร็จ');
  } catch (e) { showLoading(false); Swal.fire('ผิดพลาด', e.message, 'error'); }
}

function previewSettingLogo(input) {
  const preview = document.getElementById('settingLogoPreview');
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire('ขนาดไฟล์ใหญ่เกินไป', 'กรุณาเลือกรูปขนาดไม่เกิน 2MB', 'warning');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      if (preview) {
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
      }
    };
    reader.readAsDataURL(file);
  }
}

// ============================================
// REGISTER
// ============================================
function openRegisterModal() { openModal('registerModal'); }

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUser').value.trim();
  if (!/^[A-Za-z0-9]+$/.test(username)) {
    Swal.fire('Username ไม่ถูกต้อง', 'ต้องเป็นภาษาอังกฤษหรือตัวเลขเท่านั้น', 'warning');
    return;
  }

  showLoading(true);
  try {
    const data = {
      fullName: document.getElementById('regName')?.value.trim(),
      nickname: document.getElementById('regNick')?.value.trim(),
      position: document.getElementById('regPosition')?.value.trim(),
      department: document.getElementById('regDept')?.value.trim(),
      phone: document.getElementById('regPhone').value.trim(),
      username: username,
      password: document.getElementById('regPass').value
    };
    const res = await API.call('register', data);
    showLoading(false);
    if (res.success) {
      closeModal('registerModal');
      if (AppState.currentUser) {
        loadMembers();
        showToast('เพิ่มสมาชิกสำเร็จ');
      } else {
        // Auto login
        const lr = await API.call('login', { username: data.username, password: data.password });
        if (lr.success) await finalizeLogin(lr.profile, data.username, data.password);
      }
    } else {
      Swal.fire('ผิดพลาด', res.message, 'error');
    }
  } catch (e) { showLoading(false); Swal.fire('ผิดพลาด', e.message, 'error'); }
}

function openForgotModal() { openModal('forgotModal'); }

async function handleForgotSubmit(e) {
  e.preventDefault();
  showLoading(true);
  try {
    const res = await API.call('resetPassword', {
      username: document.getElementById('forgotUser').value,
      phone: document.getElementById('forgotPhone').value,
      newPass: document.getElementById('forgotNewPass').value
    });
    showLoading(false);
    if (res.success) { closeModal('forgotModal'); showToast('เปลี่ยนรหัสผ่านสำเร็จ'); }
    else Swal.fire('ผิดพลาด', res.message, 'error');
  } catch (e) { showLoading(false); Swal.fire('ผิดพลาด', e.message, 'error'); }
}

// ============================================
// PROFILE MANAGEMENT
// ============================================
function openProfileModal(memberData) {
  const u = memberData || AppState.currentUser;
  if (!u) return;
  
  document.getElementById('profId').value = u.id || '';
  document.getElementById('profName').value = u.fullName || '';
  document.getElementById('profNick').value = u.nickname || '';
  document.getElementById('profPosition').value = u.position || '';
  document.getElementById('profDept').value = u.department || '';
  document.getElementById('profPhone').value = u.phone || '';
  document.getElementById('profImage').value = '';
  
  const preview = document.getElementById('profPreview');
  if (u.imageLH3) {
    preview.src = u.imageLH3;
    preview.style.display = 'inline-block';
  } else {
    preview.style.display = 'none';
  }
  
  // Update modal title based on whether editing self or others
  const titleEl = document.querySelector('#profileModal h3');
  if (titleEl) titleEl.innerHTML = memberData ? `<i class="fi fi-rr-user-pen"></i> แก้ไขข้อมูล: ${escHtml(u.fullName)}` : `<i class="fi fi-rr-user"></i> ข้อมูลส่วนตัว`;

  openModal('profileModal');
}

function openMemberEditModal(id) {
  const m = AppState.membersCache.find(x => x.id === id);
  if (m) openProfileModal(m);
}

function previewProfileImage(input) {
  const preview = document.getElementById('profPreview');
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('ขนาดไฟล์ใหญ่เกินไป', 'กรุณาเลือกรูปภาพขนาดไม่เกิน 5MB', 'warning');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.src = e.target.result;
      preview.style.display = 'inline-block';
    }
    reader.readAsDataURL(file);
  }
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const u = AppState.currentUser;
  if (!u) return;
  
  const fileInput = document.getElementById('profImage');
  let imagePayload = null;
  
  showLoading(true);
  
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(ev) {
      imagePayload = { dataUrl: ev.target.result, name: file.name };
      await submitProfileUpdate(imagePayload);
    };
    reader.readAsDataURL(file);
  } else {
    await submitProfileUpdate(null);
  }
}

async function submitProfileUpdate(imagePayload) {
  const payload = {
    id: document.getElementById('profId')?.value || AppState.currentUser.id,
    fullName: document.getElementById('profName')?.value.trim(),
    nickname: document.getElementById('profNick')?.value.trim(),
    position: document.getElementById('profPosition')?.value.trim(),
    department: document.getElementById('profDept')?.value.trim(),
    phone: document.getElementById('profPhone')?.value.trim()
  };
  if (imagePayload) {
    payload.image = imagePayload;
  }
  
  try {
    const res = await API.call('updateMember', payload);
    showLoading(false);
    if (res.success) {
      closeModal('profileModal');
      showToast('อัปเดตโปรไฟล์สำเร็จ');
      
      // Update local state if editing self
      if (payload.id === AppState.currentUser.id) {
        AppState.currentUser.fullName = payload.fullName;
        AppState.currentUser.nickname = payload.nickname;
        AppState.currentUser.position = payload.position;
        AppState.currentUser.department = payload.department;
        AppState.currentUser.phone = payload.phone;
        if (imagePayload) AppState.currentUser.imageLH3 = imagePayload.dataUrl;
        updateSidebarUser();
      }
      
      const userDash = document.getElementById('viewUserDashboard');
      if (userDash && userDash.classList.contains('active')) {
        renderUserDashboard();
      }
      if (AppState.isAdmin) {
        loadMembers();
      }
    } else {
      Swal.fire('ผิดพลาด', res.message, 'error');
    }
  } catch (err) {
    showLoading(false);
    Swal.fire('ผิดพลาด', err.message, 'error');
  }
}

// ============================================
// EXPORT & PRINT
// ============================================
async function exportToCSV() {
  showLoading(true);
  try {
    const res = await API.call('getExportData', {}, 'GET');
    showLoading(false);
    if (!res.success) { Swal.fire('ผิดพลาด', 'ไม่สามารถดึงข้อมูลได้', 'error'); return; }
    
    let csv = '\uFEFF'; // BOM for Excel Thai support
    csv += 'ลำดับ,วันที่,ชื่อผู้ใช้,ชื่อ-นามสกุล,กลุ่ม,เวลาทำงานรวม,มาสาย\n';
    
    const summary = res.dailySummary || [];
    const userMap = res.userMap || {};
    
    summary.forEach((s, i) => {
      const u = userMap[s.username] || {};
      const lateTxt = s.isLate ? 'ใช่' : 'ไม่ใช่';
      csv += `${i+1},${s.date},${s.username},${u.fullName || '-'},${u.department || '-'},${s.workingHoursStr},${lateTxt}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'WFH_Export_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
  } catch (e) {
    showLoading(false);
    Swal.fire('ผิดพลาด', e.message, 'error');
  }
}

async function printUserReport(username) {
  showLoading(true);
  try {
    const res = await API.call('getPersonalStats', {
      username: username,
      requestorUsername: AppState.currentUser?.username || ''
    }, 'GET');
    showLoading(false);
    if (!res.success) { Swal.fire('ผิดพลาด', 'ไม่สามารถดึงข้อมูลได้', 'error'); return; }
    
    const w = window.open('', '_blank');
    const uName = escHtml(username);
    const html = `
      <html><head><title>รายงาน - ${uName}</title>
      <style>
        body { font-family: 'Sarabun', sans-serif; padding: 20px; }
        h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f1f5f9; }
      </style></head>
      <body onload="window.print();">
        <h2>รายงานการลงเวลา WFH</h2>
        <p><strong>ชื่อ-สกุล:</strong> ${escHtml(res.fullName || username)}</p>
        <p><strong>เวลาทำงานรวม:</strong> ${escHtml(res.totalWorkingTime || '0 นาที')}</p>
        <p><strong>จำนวนครั้งเข้างาน:</strong> ${res.totalCheckIn}</p>
        <p><strong>จำนวนครั้งออกงาน:</strong> ${res.totalCheckOut}</p>
        <table>
          <thead><tr><th>ประวัติ (ล่าสุด)</th><th>ประเภท</th><th>ตำแหน่ง</th></tr></thead>
          <tbody>
            ${(res.recentLogs||[]).map(l => `<tr><td>${escHtml(l.timestamp)}</td><td>${escHtml(l.type)}</td><td>${escHtml(l.locationStatus)}</td></tr>`).join('')}
          </tbody>
        </table>
      </body></html>
    `;
    w.document.write(html);
    w.document.close();
  } catch(e) {
    showLoading(false);
    Swal.fire('ผิดพลาด', e.message, 'error');
  }
}

// ============================================
// SUPER ADMIN - MODE CONTROL PANEL
// ============================================
async function loadSuperControlPanel() {
  if (!AppState.isSuperAdmin) return;
  const el = document.getElementById('superControlContent');
  if (!el) return;
  el.innerHTML = '<div style="padding:24px;text-align:center;"><i class="fi fi-rr-spinner"></i> กำลังโหลด...</div>';

  try {
    const res = await API.call('getMembers', {}, 'GET');
    if (!res.success) return;
    const members = (res.items || []).filter(m => m.role !== 'superadmin').sort((a, b) => {
      const getPrio = (m) => {
        const p = m.position || '';
        const d = m.department || '';
        if (p.includes('ผู้บริหาร') || d.includes('ผู้บริหาร')) return 1;
        if (p.includes('หัวหน้าฝ่าย') || d.includes('หัวหน้าฝ่าย')) return 2;
        if (p.includes('ผู้อำนวยการ') || d.includes('ผู้อำนวยการ')) return 3;
        return 4;
      };
      const pa = getPrio(a);
      const pb = getPrio(b);
      if (pa !== pb) return pa - pb;
      if (a.department !== b.department) return (a.department || '').localeCompare(b.department || '', 'th');
      return (a.fullName || '').localeCompare(b.fullName || '', 'th');
    });

    el.innerHTML = `
      <div style="margin-bottom:20px;padding:16px;background:var(--card-bg);border-radius:12px;border:1px solid var(--border);">
        <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-size:1.1rem;">👻</span>
              <strong style="color:#6d28d9;">Ghost Protocol</strong>
            </div>
            <div style="font-size:0.8rem;color:var(--gray);line-height:1.5;">เมื่อเข้า/ออกงาน จะ<strong>ไม่แสดงตัว</strong>บนแผนที่ของ User ทั่วไป<br>Admin, SubAdmin, SuperAdmin ยังเห็นได้ตามปกติ</div>
          </div>
          <div style="flex:1;min-width:200px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-size:1.1rem;">🔮</span>
              <strong style="color:#b45309;">Origin Echo</strong>
            </div>
            <div style="font-size:0.8rem;color:var(--gray);line-height:1.5;">แผนที่แสดง<strong>พิกัดบ้าน</strong>แทนตำแหน่งจริงสำหรับทุกคน<br>SuperAdmin เห็นตำแหน่งจริง + เส้นสีเหลืองลากไปบ้าน</div>
          </div>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
          <thead>
            <tr style="background:var(--card-bg);">
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid var(--border);">ชื่อ / Username</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid var(--border);">Role</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid var(--border);">พิกัดบ้าน</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid var(--border);">
                <span style="color:#6d28d9;">👻</span> Ghost Protocol
              </th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid var(--border);">
                <span style="color:#b45309;">🔮</span> Origin Echo
              </th>
            </tr>
          </thead>
          <tbody>
            ${members.map(m => {
              const hasHome = !!(m.homeLat);
              const roleLbl = m.role === 'admin'
                ? '<span style="color:#0ea5e9;font-weight:700;">Admin</span>'
                : m.role === 'subadmin'
                  ? '<span style="color:#f59e0b;font-weight:700;">Sub-Admin</span>'
                  : '<span style="color:var(--gray);">Member</span>';
              return `<tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px 12px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <img src="${m.imageLH3 || ''}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">
                    <div>
                      <div style="font-weight:600;">${escHtml(m.fullName)}</div>
                      <div style="font-size:0.75rem;color:var(--gray);">@${escHtml(m.username)}</div>
                    </div>
                  </div>
                </td>
                <td style="padding:10px 12px;text-align:center;">${roleLbl}</td>
                <td style="padding:10px 12px;text-align:center;">${hasHome ? '🏠 ตั้งแล้ว' : '<span style="color:var(--danger);">ยังไม่ตั้ง</span>'}</td>
                <td style="padding:10px 12px;text-align:center;">
                  <label class="mode-toggle-wrap" title="Ghost Protocol">
                    <input type="checkbox" class="mode-toggle" onchange="setGhostProtocol('${m.id}', this.checked)" ${m.ghostProtocol ? 'checked' : ''}>
                    <span class="mode-toggle-slider ghost"></span>
                  </label>
                </td>
                <td style="padding:10px 12px;text-align:center;">
                  <label class="mode-toggle-wrap" title="Origin Echo${!hasHome ? ' (ต้องตั้งพิกัดบ้านก่อน)' : ''}">
                    <input type="checkbox" class="mode-toggle" onchange="setOriginEcho('${m.id}', this.checked)" ${m.originEcho ? 'checked' : ''} ${!hasHome ? 'disabled' : ''}>
                    <span class="mode-toggle-slider echo" style="${!hasHome ? 'opacity:0.4;cursor:not-allowed;' : ''}"></span>
                  </label>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    el.innerHTML = '<div style="padding:24px;color:var(--danger);">เกิดข้อผิดพลาด: ' + escHtml(e.message) + '</div>';
  }
}

async function setGhostProtocol(targetUserId, enabled) {
  try {
    const res = await API.call('toggleGhostProtocol', {
      superadminUsername: AppState.currentUser.username,
      targetUserId: targetUserId,
      enabled: enabled
    });
    if (res.success) {
      showToast(res.message || (enabled ? '👻 เปิด Ghost Protocol' : '👻 ปิด Ghost Protocol'));
    } else {
      Swal.fire('ผิดพลาด', res.message, 'error');
      loadSuperControlPanel(); // revert UI
    }
  } catch (e) {
    Swal.fire('ผิดพลาด', e.message, 'error');
    loadSuperControlPanel();
  }
}

async function setOriginEcho(targetUserId, enabled) {
  try {
    const res = await API.call('toggleOriginEcho', {
      superadminUsername: AppState.currentUser.username,
      targetUserId: targetUserId,
      enabled: enabled
    });
    if (res.success) {
      showToast(res.message || (enabled ? '🔮 เปิด Origin Echo' : '🔮 ปิด Origin Echo'));
    } else {
      Swal.fire('ผิดพลาด', res.message, 'error');
      loadSuperControlPanel();
    }
  } catch (e) {
    Swal.fire('ผิดพลาด', e.message, 'error');
    loadSuperControlPanel();
  }
}
