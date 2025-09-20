import { api, API_BASE } from './api.js';

console.log('TURNEX v2 app starting. API:', API_BASE);

function qs(sel, el=document){ return el.querySelector(sel); }
function qsa(sel, el=document){ return [...el.querySelectorAll(sel)]; }

async function boot(){
  // Health check
  try{
    const h = await api.health();
    console.log('API health:', h);
  }catch(err){ console.error('API health failed:', err.message); }

  // Render services (basic)
  const mount = qs('#servicesList');
  if(mount){
    mount.innerHTML = '<div class="text-body-secondary">Cargando servicios...</div>';
    try{
      const list = await api.services();
      if(!Array.isArray(list) || !list.length){
        mount.innerHTML = '<div class="text-body-secondary">Sin servicios disponibles.</div>';
      }else{
        mount.innerHTML = list.map(s=> `
          <div class="col-12 col-md-6 col-lg-4">
            <div class="card h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <div class="fw-semibold">${s.name||'Servicio'}</div>
                    <div class="small text-body-secondary">${s.description||''}</div>
                  </div>
                  <span class="badge text-bg-primary">${(s.duration||30)} min</span>
                </div>
                <div class="mt-2 fw-semibold">$${s.price||0}</div>
              </div>
            </div>
          </div>
        `).join('');
      }
    }catch(err){
      mount.innerHTML = `<div class="text-danger">Error cargando servicios: ${err.message}</div>`;
    }
  }
}

window.addEventListener('DOMContentLoaded', boot);
