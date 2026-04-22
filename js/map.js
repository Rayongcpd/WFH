/**
 * WFH System - Map & GPS
 */
let wfhMap = null;
let wfhMarkers = [];

function initMap() {
  if (wfhMap) { wfhMap.invalidateSize(); return; }
  const container = document.getElementById('map');
  if (!container) return;

  wfhMap = L.map('map').setView([13.0, 100.5], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(wfhMap);

  loadMapData();
}

async function loadMapData() {
  if (!wfhMap) return;
  try {
    const res = await API.call('getAllLocations', {}, 'GET');
    if (!res.success) return;

    // Clear old markers
    wfhMarkers.forEach(m => wfhMap.removeLayer(m));
    wfhMarkers = [];

    const locs = res.locations || [];
    const bounds = [];

    locs.forEach(loc => {
      if (!loc.lat || !loc.lng) return;
      const isOnline = loc.type === 'Check-in';
      const color = isOnline ? '#10b981' : '#94a3b8';
      const statusText = isOnline ? '🟢 กำลังทำงาน' : '⚫ ออกงานแล้ว';
      const locStatus = loc.locationStatus === 'at_home' ? '🏠 อยู่ที่บ้าน'
        : loc.locationStatus === 'outside' ? '⚠️ นอกพื้นที่' : '';

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:36px;height:36px;border-radius:50%;border:3px solid ${color};background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);overflow:hidden;">
          ${loc.image ? `<img src="${loc.image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<i class="fi fi-rr-user" style="color:${color};font-size:16px;"></i>`}
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(wfhMap);
      marker.bindPopup(`
        <div style="min-width:180px;font-family:'IBM Plex Sans Thai',sans-serif;">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px;">${escHtml(loc.fullName)}</div>
          <div style="font-size:0.78rem;color:#64748b;margin-bottom:4px;">${statusText}</div>
          ${locStatus ? `<div style="font-size:0.78rem;margin-bottom:4px;">${locStatus}</div>` : ''}
          <div style="font-size:0.72rem;color:#94a3b8;">อัปเดต: ${escHtml(loc.timestamp || '')}</div>
        </div>`);

      wfhMarkers.push(marker);
      bounds.push([loc.lat, loc.lng]);
    });

    if (bounds.length > 0) wfhMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  } catch (e) { console.error('Map load error:', e); }
}

function mapLocateMe() {
  if (!wfhMap) return;
  navigator.geolocation.getCurrentPosition(pos => {
    wfhMap.setView([pos.coords.latitude, pos.coords.longitude], 16);
    L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
      radius: 8, color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.5
    }).addTo(wfhMap).bindPopup('📍 ตำแหน่งของคุณ').openPopup();
  }, () => {
    Swal.fire('ไม่สามารถระบุตำแหน่ง', 'กรุณาเปิด GPS', 'warning');
  });
}
