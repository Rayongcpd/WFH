/**
 * WFH System - API Bridge
 * สื่อสารกับ Google Apps Script Web App ผ่าน fetch
 */

const API = (() => {
  // ⚠️ เปลี่ยน URL นี้เป็น Web App URL ของคุณ
  let BASE_URL = localStorage.getItem('wfh_api_url') || 'https://script.google.com/macros/s/AKfycbxqs3IJ-1gOt62PYx3oPIXlZIYo-GbNxwtFpdvMlrJ_mci4I7qmdCkhGTxaMeQl7rj2bw/exec';

  const setUrl = (url) => {
    BASE_URL = url.replace(/\/$/, '');
    localStorage.setItem('wfh_api_url', BASE_URL);
  };

  const getUrl = () => BASE_URL;

  const call = async (action, data = {}, method = 'POST') => {
    if (!BASE_URL) throw new Error('กรุณาตั้งค่า API URL ก่อน');

    const url = method === 'GET'
      ? `${BASE_URL}?action=${action}&${new URLSearchParams(data).toString()}`
      : `${BASE_URL}?action=${action}`;

    const options = { method, mode: 'cors', headers: {} };

    if (method === 'POST') {
      options.headers['Content-Type'] = 'text/plain';
      options.body = JSON.stringify(data);
    }

    const res = await fetch(url, options);
    if (!res.ok) throw new Error('Network error: ' + res.status);
    return res.json();
  };

  return { setUrl, getUrl, call };
})();
