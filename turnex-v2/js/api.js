const meta = document.querySelector('meta[name="api-base"]');
export const API_BASE = (meta && meta.content) ? meta.content.trim() : 'http://localhost:3000/api';

async function http(path, opts={}){
  const res = await fetch(`${API_BASE}${path}`, { headers:{'Content-Type':'application/json'}, ...opts });
  if(!res.ok){ let err; try{ err = await res.json(); }catch{ err = { error: res.statusText } } throw new Error(err.error||'Request failed'); }
  const ct = res.headers.get('content-type')||''; return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  health: () => http('/health'),
  services: () => http('/services')
};
