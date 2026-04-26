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

  // Auto-invalidate size when container resizes (orientation change, window resize, etc.)
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (wfhMap) wfhMap.invalidateSize();
    }).observe(container);
  }
  window.addEventListener('resize', () => {
    if (wfhMap) setTimeout(() => wfhMap.invalidateSize(), 150);
  });

  loadMapData();
}

async function loadMapData() {
  if (!wfhMap) return;
  try {
    const res = await API.call('getAllLocations', {
      requestorUsername: AppState.currentUser?.username || ''
    }, 'GET');
    if (!res.success) return;

    // Clear old markers & lines
    wfhMarkers.forEach(m => wfhMap.removeLayer(m));
    wfhMarkers = [];

    let locs = res.locations || [];
    // Filter out superadmin if current user is not superadmin
    if (AppState.role !== 'superadmin') {
      locs = locs.filter(loc => {
        const m = AppState.membersCache.find(x => x.username === loc.username);
        return m ? m.role !== 'superadmin' : true;
      });
    }

    const bounds = [];

    locs.forEach(loc => {
      if (!loc.lat || !loc.lng) return;
      const isOnline = loc.type === 'Check-in';
      const color = isOnline ? '#10b981' : '#94a3b8';
      const statusText = isOnline ? '🟢 กำลังทำงาน' : '⚫ ออกงานแล้ว';
      const locStatus = loc.locationStatus === 'at_home' ? '🏠 อยู่ที่บ้าน'
        : loc.locationStatus === 'outside' ? '⚠️ นอกพื้นที่' : '';

      // Mode badges for popup
      const ghostBadge = loc.ghostProtocol
        ? '<div style="font-size:0.7rem;color:#6366f1;font-weight:700;margin-top:2px;">👻 Ghost Protocol</div>'
        : '';
      const echoBadge = loc.originEcho
        ? '<div style="font-size:0.7rem;color:#f59e0b;font-weight:700;margin-top:2px;">🔮 Origin Echo</div>'
        : '';

      // Origin Echo: dashed amber border on marker
      const markerBorder = loc.originEcho
        ? 'border: 3px dashed #f59e0b;'
        : `border: 3px solid ${color};`;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:36px;height:36px;border-radius:50%;${markerBorder}background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);overflow:hidden;">
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
          ${ghostBadge}${echoBadge}
          <div style="font-size:0.72rem;color:#94a3b8;">อัปเดต: ${escHtml(loc.timestamp || '')}</div>
        </div>`);

      wfhMarkers.push(marker);
      bounds.push([loc.lat, loc.lng]);

      // ──────────────────────────────────────────────────
      // Origin Echo line (superadmin only)
      // Backend returns echoLine: { realLat, realLng, homeLat, homeLng }
      // ──────────────────────────────────────────────────
      if (loc.echoLine) {
        const el = loc.echoLine;

        // Red dot at real location
        const realIcon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 0 6px rgba(239,68,68,0.7);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        const realMarker = L.marker([el.realLat, el.realLng], { icon: realIcon }).addTo(wfhMap);
        realMarker.bindPopup(`
          <div style="min-width:160px;font-family:'IBM Plex Sans Thai',sans-serif;">
            <div style="font-weight:700;font-size:0.85rem;color:#ef4444;">📍 ตำแหน่งจริง (SuperAdmin)</div>
            <div style="font-size:0.8rem;font-weight:600;margin-top:2px;">${escHtml(loc.fullName)}</div>
            <div style="font-size:0.7rem;color:#f59e0b;margin-top:4px;">🔮 Origin Echo Active</div>
            <div style="font-size:0.7rem;color:#94a3b8;">พิกัดบ้าน: ${el.homeLat.toFixed(5)}, ${el.homeLng.toFixed(5)}</div>
          </div>`);
        wfhMarkers.push(realMarker);

        // Dashed amber polyline: real → home
        const line = L.polyline(
          [[el.realLat, el.realLng], [el.homeLat, el.homeLng]],
          { color: '#f59e0b', weight: 2.5, dashArray: '8 6', opacity: 0.85 }
        ).addTo(wfhMap);
        line.bindTooltip(`🔮 Origin Echo: ${escHtml(loc.fullName)}`, {
          permanent: false,
          direction: 'center',
          className: 'echo-tooltip'
        });
        wfhMarkers.push(line);

        bounds.push([el.realLat, el.realLng]);
      }
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
