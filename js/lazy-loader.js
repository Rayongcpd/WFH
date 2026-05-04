/**
 * WFH System - Lazy Resource Loader
 * Loads Chart.js and Leaflet on-demand to reduce initial page load
 */

const LazyLoader = (() => {
  const _loaded = {};
  const _loading = {};

  /**
   * Load a script dynamically
   * @param {string} url - script URL
   * @returns {Promise<void>}
   */
  function loadScript(url) {
    if (_loaded[url]) return Promise.resolve();
    if (_loading[url]) return _loading[url];

    _loading[url] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => { _loaded[url] = true; delete _loading[url]; resolve(); };
      s.onerror = () => { delete _loading[url]; reject(new Error('Failed to load: ' + url)); };
      document.body.appendChild(s);
    });
    return _loading[url];
  }

  /**
   * Load a stylesheet dynamically
   * @param {string} url - CSS URL
   * @returns {Promise<void>}
   */
  function loadCSS(url) {
    if (_loaded[url]) return Promise.resolve();
    if (_loading[url]) return _loading[url];

    _loading[url] = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => { _loaded[url] = true; delete _loading[url]; resolve(); };
      link.onerror = () => { _loaded[url] = true; delete _loading[url]; resolve(); };
      document.head.appendChild(link);
    });
    return _loading[url];
  }

  /**
   * Load Leaflet (CSS + JS) on demand
   * @returns {Promise<void>}
   */
  async function loadLeaflet() {
    if (typeof L !== 'undefined') return;
    await Promise.all([
      loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),
      loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
    ]);
  }

  /**
   * Load Chart.js on demand
   * @returns {Promise<void>}
   */
  async function loadChartJS() {
    if (typeof Chart !== 'undefined') return;
    await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4');
  }

  return { loadScript, loadCSS, loadLeaflet, loadChartJS };
})();
