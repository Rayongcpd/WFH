/**
 * WFH System - API Bridge
 * สื่อสารกับ Google Apps Script Web App ผ่าน fetch
 */

const API = (() => {
  // ⚠️ ต้องใส่ Web App URL ใหม่ทุกครั้งหลัง Deploy ใน GAS
  // ดูที่ Deploy → Manage deployments → Web app → URL
  let BASE_URL = localStorage.getItem('wfh_api_url') || 'https://script.google.com/macros/s/AKfycbxeSeTXIlsRVPqKH2S7fZ92I6c0_5CemDz3tsox7lgIR7MtsEvVO62pFtssVSz2p-PkaQ/exec';

  const setUrl = (url) => {
    BASE_URL = url.replace(/\/$/, '');
    localStorage.setItem('wfh_api_url', BASE_URL);
  };

  const getUrl = () => BASE_URL;

  const call = async (action, data = {}, method = 'POST') => {
    if (!BASE_URL) throw new Error('กรุณาตั้งค่า API URL ก่อน (Deploy GAS ใหม่แล้วต้องเปลี่ยน URL)');

    const url = method === 'GET'
      ? `${BASE_URL}?action=${action}&${new URLSearchParams(data).toString()}`
      : `${BASE_URL}?action=${action}`;

    const options = { method, mode: 'cors', headers: {} };

    if (method === 'POST') {
      options.headers['Content-Type'] = 'text/plain';
      options.body = JSON.stringify(data);
    }

    const res = await fetch(url, options);
    if (!res.ok) throw new Error('Network error: ' + res.status + ' — URL อาจเปลี่ยนหลัง Deploy ใหม่ กรุณาอัปเดตใน Settings');
    return res.json();
  };

  return { setUrl, getUrl, call };
})();
