/**
 * WFH System - Skeleton Loading UI
 * Generates skeleton placeholders for each section
 */

// ============================================
// SKELETON TEMPLATES
// ============================================

const Skeleton = {

  /**
   * Admin Hero Card skeleton
   * @returns {string} HTML
   */
  hero() {
    return `
      <div class="skeleton-hero">
        <div class="skeleton skeleton-hero-welcome"></div>
        <div class="skeleton skeleton-hero-name"></div>
        <div class="skeleton-hero-bar">
          <div class="skeleton-hero-bar-row">
            <div class="skeleton skeleton-hero-bar-row"></div>
            <div class="skeleton skeleton-hero-bar-row" style="width:40px"></div>
          </div>
          <div class="skeleton skeleton-hero-progress"></div>
          <div class="skeleton-hero-footer">
            <div class="skeleton"></div>
            <div class="skeleton"></div>
          </div>
        </div>
      </div>`;
  },

  /**
   * Stat cards skeleton (3 cards)
   * @param {number} count - number of stat cards
   * @returns {string} HTML
   */
  statCards(count = 3) {
    return `<div class="stat-grid">${Array(count).fill(`
      <div class="skeleton-stat-card">
        <div class="skeleton skeleton-stat-icon"></div>
        <div class="skeleton skeleton-stat-value"></div>
        <div class="skeleton skeleton-stat-label"></div>
      </div>`).join('')}</div>`;
  },

  /**
   * Member card grid skeleton
   * @param {number} count - number of member cards
   * @returns {string} HTML
   */
  memberCards(count = 4) {
    return `<div class="member-card-grid">${Array(count).fill(`
      <div class="member-item skeleton-card">
        <div class="member-header">
          <div class="skeleton skeleton-avatar"></div>
          <div style="flex:1">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
        </div>
        <div class="member-body">
          <div class="skeleton skeleton-text medium"></div>
          <div class="skeleton skeleton-text short"></div>
          <div class="skeleton skeleton-text xs"></div>
        </div>
      </div>`).join('')}</div>`;
  },

  /**
   * User dashboard header skeleton
   * @returns {string} HTML
   */
  userHeader() {
    return `
      <div class="skeleton-user-header">
        <div class="skeleton skeleton-user-avatar"></div>
        <div class="skeleton skeleton-user-name"></div>
        <div class="skeleton skeleton-user-sub"></div>
        <div class="skeleton skeleton-user-date"></div>
      </div>`;
  },

  /**
   * User stat pair skeleton (2 cards)
   * @returns {string} HTML
   */
  userStatPair() {
    return `
      <div class="stat-grid" style="grid-template-columns:1fr 1fr;max-width:360px;margin:0 auto 16px">
        <div class="skeleton-stat-card" style="text-align:center">
          <div class="skeleton skeleton-stat-value" style="margin:0 auto 6px"></div>
          <div class="skeleton skeleton-stat-label" style="margin:0 auto"></div>
        </div>
        <div class="skeleton-stat-card" style="text-align:center">
          <div class="skeleton skeleton-stat-value" style="margin:0 auto 6px"></div>
          <div class="skeleton skeleton-stat-label" style="margin:0 auto"></div>
        </div>
      </div>`;
  },

  /**
   * Action button skeleton
   * @returns {string} HTML
   */
  actionBtn() {
    return `<div class="skeleton skeleton-action-btn"></div>`;
  },

  /**
   * Timeline / recent logs skeleton
   * @param {number} count - number of timeline items
   * @returns {string} HTML
   */
  timeline(count = 3) {
    return Array(count).fill(`
      <div class="skeleton-timeline">
        <div class="skeleton skeleton-timeline-dot"></div>
        <div class="skeleton-timeline-content">
          <div class="skeleton skeleton-timeline-title"></div>
          <div class="skeleton skeleton-timeline-sub"></div>
        </div>
      </div>`).join('');
  },

  /**
   * Stats page (chart + list) skeleton
   * @returns {string} HTML
   */
  statsPage() {
    const chartBars = [60, 100, 80, 120, 90, 70, 110].map(h =>
      `<div class="skeleton skeleton-chart-bar" style="height:${h}px"></div>`
    ).join('');

    return `
      <div class="stat-grid" style="grid-template-columns:1fr 1fr;margin-bottom:16px">
        <div class="skeleton-stat-card" style="text-align:center">
          <div class="skeleton skeleton-stat-icon" style="margin:0 auto 8px"></div>
          <div class="skeleton skeleton-stat-value" style="margin:0 auto 6px"></div>
          <div class="skeleton skeleton-stat-label" style="margin:0 auto"></div>
        </div>
        <div class="skeleton-stat-card" style="text-align:center">
          <div class="skeleton skeleton-stat-icon" style="margin:0 auto 8px"></div>
          <div class="skeleton skeleton-stat-value" style="margin:0 auto 6px"></div>
          <div class="skeleton skeleton-stat-label" style="margin:0 auto"></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px"><div class="card-body">
        <div class="skeleton-chart">${chartBars}</div>
      </div></div>`;
  },

  /**
   * Stats list (log items) skeleton
   * @param {number} count
   * @returns {string} HTML
   */
  statsList(count = 4) {
    return Array(count).fill(`
      <div class="skeleton-item">
        <div class="skeleton skeleton-avatar" style="width:34px;height:34px"></div>
        <div style="flex:1">
          <div class="skeleton skeleton-title" style="margin-bottom:6px"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      </div>`).join('');
  },

  /**
   * Admin stats table skeleton
   * @param {number} rows
   * @returns {string} HTML
   */
  adminTable(rows = 5) {
    return Array(rows).fill(`
      <div class="skeleton-table-row">
        <div class="skeleton skeleton-table-cell w40"></div>
        <div style="display:flex;align-items:center;gap:8px;flex:1">
          <div class="skeleton skeleton-avatar sm"></div>
          <div style="flex:1">
            <div class="skeleton skeleton-text medium" style="margin-bottom:4px"></div>
            <div class="skeleton skeleton-text xs"></div>
          </div>
        </div>
        <div class="skeleton skeleton-table-cell w80"></div>
        <div class="skeleton skeleton-table-cell w40"></div>
        <div class="skeleton skeleton-table-cell w40"></div>
        <div class="skeleton skeleton-table-cell w40"></div>
        <div class="skeleton skeleton-table-cell w80"></div>
      </div>`).join('');
  },

  /**
   * Plan cards skeleton
   * @param {number} count
   * @returns {string} HTML
   */
  planCards(count = 2) {
    return Array(count).fill(`
      <div class="skeleton-plan">
        <div class="skeleton-plan-header">
          <div class="skeleton skeleton-avatar sm"></div>
          <div style="flex:1">
            <div class="skeleton skeleton-title" style="width:120px;margin-bottom:4px"></div>
            <div class="skeleton skeleton-text xs"></div>
          </div>
        </div>
        <div class="skeleton-plan-tasks">
          <div class="skeleton skeleton-plan-task" style="width:85%"></div>
          <div class="skeleton skeleton-plan-task" style="width:65%"></div>
          <div class="skeleton skeleton-plan-task" style="width:75%"></div>
        </div>
      </div>`).join('');
  },

  /**
   * Settings form skeleton
   * @param {number} groups - number of form groups
   * @returns {string} HTML
   */
  settingsForm(groups = 4) {
    return Array(groups).fill(`
      <div class="skeleton-form-group">
        <div class="skeleton skeleton-form-label"></div>
        <div class="skeleton skeleton-form-input"></div>
      </div>`).join('');
  },

  /**
   * Super control panel skeleton
   * @param {number} rows
   * @returns {string} HTML
   */
  superControl(rows = 4) {
    return `
      <div style="margin-bottom:16px;padding:16px;border-radius:12px;border:1px solid var(--border)">
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <div class="skeleton skeleton-title" style="width:140px;margin-bottom:8px"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
          <div style="flex:1;min-width:200px">
            <div class="skeleton skeleton-title" style="width:120px;margin-bottom:8px"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
        </div>
      </div>
      ${Array(rows).fill(`
      <div class="skeleton-item">
        <div class="skeleton skeleton-avatar"></div>
        <div style="flex:1">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      </div>`).join('')}`;
  }
};

// ============================================
// SKELETON INJECTION HELPERS
// ============================================

/**
 * Show skeleton in a specific element
 * @param {string} elementId - target element ID
 * @param {string} skeletonHtml - skeleton HTML to inject
 */
function showSkeleton(elementId, skeletonHtml) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = skeletonHtml;
}

/**
 * Replace skeleton with real content (with fade-in animation)
 * @param {string} elementId - target element ID
 * @param {string} contentHtml - real content HTML
 */
function replaceSkeleton(elementId, contentHtml) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = contentHtml;
  el.classList.add('skeleton-loaded');
  // Remove animation class after completion
  setTimeout(() => el.classList.remove('skeleton-loaded'), 400);
}
