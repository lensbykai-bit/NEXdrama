const MovieDB = (() => {
  const SESSION_KEY = 'movieflix_v3_supabase_session';
  const cfg = window.MOVIEFLIX_CONFIG || {};
  const cleanBase = String(cfg.supabaseUrl || '').replace(/\/+$/, '');
  const apiKey = String(cfg.publishableKey || '').trim();
  const configured = /^https:\/\/.+\.supabase\.co$/i.test(cleanBase) && apiKey.length > 15;

  function isConfigured(){ return configured; }
  function mode(){ return configured ? 'supabase' : 'demo'; }

  function readSession(){
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }
  function saveSession(value){
    if(value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else localStorage.removeItem(SESSION_KEY);
  }
  function normalizeSession(raw){
    if(!raw?.access_token) return null;
    return {
      access_token: raw.access_token,
      refresh_token: raw.refresh_token || '',
      expires_at: Date.now() + Math.max(60, Number(raw.expires_in || 3600)) * 1000,
      user: raw.user || null
    };
  }

  async function parseResponse(res){
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if(!res.ok){
      const msg = body?.msg || body?.message || body?.error_description || body?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return body;
  }

  async function authRequest(path, options = {}){
    if(!configured) throw new Error('Supabase is not configured yet.');
    const headers = { apikey: apiKey, 'Content-Type':'application/json', ...(options.headers || {}) };
    const res = await fetch(`${cleanBase}${path}`, { ...options, headers });
    return parseResponse(res);
  }

  async function refreshSession(){
    const old = readSession();
    if(!old?.refresh_token) return null;
    try {
      const raw = await authRequest('/auth/v1/token?grant_type=refresh_token', {
        method:'POST', body:JSON.stringify({ refresh_token: old.refresh_token })
      });
      const next = normalizeSession(raw); saveSession(next); return next;
    } catch { saveSession(null); return null; }
  }

  async function getSession(){
    if(!configured) return null;
    const session = readSession();
    if(!session?.access_token) return null;
    if(Number(session.expires_at || 0) < Date.now() + 60000) return refreshSession();
    return session;
  }

  async function signIn(email, password){
    const raw = await authRequest('/auth/v1/token?grant_type=password', {
      method:'POST', body:JSON.stringify({ email, password })
    });
    const session = normalizeSession(raw); saveSession(session); return session;
  }

  async function signUp(email, password){
    const raw = await authRequest('/auth/v1/signup', {
      method:'POST', body:JSON.stringify({ email, password })
    });
    if(raw?.access_token){ const session = normalizeSession(raw); saveSession(session); }
    return raw;
  }

  async function signOut(){
    const session = readSession();
    try {
      if(configured && session?.access_token){
        await fetch(`${cleanBase}/auth/v1/logout`, {
          method:'POST', headers:{ apikey:apiKey, Authorization:`Bearer ${session.access_token}` }
        });
      }
    } finally { saveSession(null); }
  }

  async function rest(path, options = {}, requireAuth = false){
    if(!configured) throw new Error('Supabase is not configured yet.');
    const session = await getSession();
    if(requireAuth && !session?.access_token) throw new Error('Admin login required.');
    const headers = { apikey: apiKey, ...(options.headers || {}) };
    if(session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    if(options.body != null && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${cleanBase}/rest/v1/${path}`, { ...options, headers });
    return parseResponse(res);
  }

  async function isAdmin(){
    if(!configured) return true;
    const session = await getSession();
    const uid = session?.user?.id;
    if(!uid) return false;
    const rows = await rest(`admins?select=user_id&user_id=eq.${encodeURIComponent(uid)}`, {}, true);
    return Array.isArray(rows) && rows.length > 0;
  }

  function rowToItem(row){
    return {
      id: row.id, title: row.title, type: row.type, year: row.year, genre: row.genre || '',
      quality: row.quality || 'HD', poster: row.poster || '', description: row.description || '',
      featured: !!row.featured, accent: Number(row.accent ?? 210), episodes: []
    };
  }
  function rowToEpisode(row){
    return { id:row.id, number:Number(row.number || 1), title:row.title || '', duration:row.duration || '', videoUrl:row.video_url || '' };
  }

  async function getBrand(){
    if(!configured) return localLoadBrand();
    const rows = await rest('site_settings?select=id,name,accent_word,tagline&id=eq.1');
    const row = rows?.[0];
    return row ? { name:row.name || 'MOVIEFLIX', accentWord:row.accent_word || '', tagline:row.tagline || '' } : { ...DEFAULT_BRAND };
  }

  async function getCatalog(){
    if(!configured) return localLoadCatalog();
    const [items, episodes] = await Promise.all([
      rest('catalog_items?select=*&order=created_at.asc'),
      rest('episodes?select=*&order=number.asc')
    ]);
    const map = new Map((items || []).map(row => [row.id, rowToItem(row)]));
    (episodes || []).forEach(row => {
      const item = map.get(row.item_id);
      if(item) item.episodes.push(rowToEpisode(row));
    });
    return [...map.values()];
  }

  async function saveBrand(brand){
    if(!configured){ localSaveBrand(brand); return brand; }
    const body = { name:brand.name, accent_word:brand.accentWord || '', tagline:brand.tagline || '' };
    const rows = await rest('site_settings?id=eq.1', {
      method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify(body)
    }, true);
    return rows?.[0] ? { name:rows[0].name, accentWord:rows[0].accent_word || '', tagline:rows[0].tagline || '' } : brand;
  }

  async function saveItem(item, isNew = false){
    if(!configured){
      const catalog = localLoadCatalog();
      if(item.featured) catalog.forEach(x => x.featured = false);
      const normalized = { ...item, id:item.id || makeId(item.title), episodes:item.episodes || [] };
      const idx = catalog.findIndex(x => x.id === normalized.id);
      if(idx >= 0) catalog[idx] = normalized; else catalog.push(normalized);
      localSaveCatalog(catalog); return normalized;
    }
    if(item.featured){
      await rest('catalog_items?featured=eq.true', { method:'PATCH', body:JSON.stringify({ featured:false }) }, true);
    }
    const payload = {
      title:item.title, type:item.type, year:Number(item.year), genre:item.genre || '', quality:item.quality || 'HD',
      poster:item.poster || '', description:item.description || '', featured:!!item.featured, accent:Number(item.accent ?? 210)
    };
    if(isNew || !item.id){
      const rows = await rest('catalog_items', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(payload) }, true);
      return rowToItem(rows[0]);
    }
    const rows = await rest(`catalog_items?id=eq.${encodeURIComponent(item.id)}`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify(payload) }, true);
    return rowToItem(rows[0]);
  }

  async function deleteItem(id){
    if(!configured){ const catalog = localLoadCatalog().filter(x => x.id !== id); localSaveCatalog(catalog); return; }
    await rest(`catalog_items?id=eq.${encodeURIComponent(id)}`, { method:'DELETE' }, true);
  }

  async function saveEpisode(itemId, ep, isNew = false){
    if(!configured){
      const catalog = localLoadCatalog(); const item = catalog.find(x => x.id === itemId); if(!item) throw new Error('Title not found.');
      item.episodes ||= [];
      const normalized = { ...ep, id:ep.id || makeId('episode') };
      const idx = item.episodes.findIndex(x => x.id === normalized.id);
      if(idx >= 0) item.episodes[idx] = normalized; else item.episodes.push(normalized);
      localSaveCatalog(catalog); return normalized;
    }
    const payload = { item_id:itemId, number:Number(ep.number || 1), title:ep.title || '', duration:ep.duration || '', video_url:ep.videoUrl || '' };
    if(isNew || !ep.id){
      const rows = await rest('episodes', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(payload) }, true);
      return rowToEpisode(rows[0]);
    }
    const rows = await rest(`episodes?id=eq.${encodeURIComponent(ep.id)}`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify(payload) }, true);
    return rowToEpisode(rows[0]);
  }

  async function deleteEpisode(itemId, episodeId){
    if(!configured){
      const catalog = localLoadCatalog(); const item = catalog.find(x => x.id === itemId);
      if(item) item.episodes = (item.episodes || []).filter(x => x.id !== episodeId);
      localSaveCatalog(catalog); return;
    }
    await rest(`episodes?id=eq.${encodeURIComponent(episodeId)}`, { method:'DELETE' }, true);
  }

  async function resetDemo(){ if(!configured) return localReset(); throw new Error('Reset is available only in Demo Mode.'); }

  return { isConfigured, mode, getSession, signIn, signUp, signOut, isAdmin, getBrand, getCatalog, saveBrand, saveItem, deleteItem, saveEpisode, deleteEpisode, resetDemo };
})();
