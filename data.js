const STORAGE_KEY = 'movieflix_v3_catalog';
const BRAND_KEY = 'movieflix_v3_brand';

const DEFAULT_BRAND = {
  name: 'MOVIEFLIX',
  accentWord: 'FLIX',
  tagline: 'Movies & Series'
};

const DEFAULT_CATALOG = [
  {
    id: 'demo-last-horizon', title: 'The Last Horizon', type: 'series', year: 2026,
    genre: 'Sci‑Fi, Adventure', quality: 'HD', featured: true,
    description: 'A cinematic sci‑fi adventure about a crew searching for a new home beyond the known universe.',
    poster: '', accent: 205,
    episodes: [
      { id: 'demo-lh-1', number: 1, title: 'Beyond the Signal', duration: '45 min', videoUrl: '' },
      { id: 'demo-lh-2', number: 2, title: 'Silent Orbit', duration: '46 min', videoUrl: '' },
      { id: 'demo-lh-3', number: 3, title: 'The Gate', duration: '44 min', videoUrl: '' }
    ]
  },
  {
    id: 'demo-shadow-city', title: 'Shadow City', type: 'movie', year: 2026,
    genre: 'Action', quality: 'HD', featured: false,
    description: 'A relentless courier uncovers a secret that puts an entire neon city at risk.',
    poster: '', accent: 340,
    episodes: [{ id: 'demo-sc-1', number: 1, title: 'Full Movie', duration: '1h 48m', videoUrl: '' }]
  },
  {
    id: 'demo-blue-signal', title: 'Blue Signal', type: 'movie', year: 2026,
    genre: 'Sci‑Fi', quality: '4K', featured: false,
    description: 'A mysterious radio transmission changes the lives of a group of young engineers.',
    poster: '', accent: 210,
    episodes: [{ id: 'demo-bs-1', number: 1, title: 'Full Movie', duration: '2h 04m', videoUrl: '' }]
  },
  {
    id: 'demo-empire-of-ash', title: 'Empire of Ash', type: 'series', year: 2026,
    genre: 'Fantasy, Drama', quality: 'HD', featured: false,
    description: 'Rival houses fight to rebuild a kingdom after a devastating war.',
    poster: '', accent: 18,
    episodes: [
      { id: 'demo-ea-1', number: 1, title: 'The Return', duration: '51 min', videoUrl: '' },
      { id: 'demo-ea-2', number: 2, title: 'Ashes', duration: '49 min', videoUrl: '' }
    ]
  }
];

function cloneDefaultCatalog(){ return JSON.parse(JSON.stringify(DEFAULT_CATALOG)); }
function makeId(value){
  return String(value || 'item').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') + '-' + Date.now().toString(36).slice(-6);
}
function localLoadCatalog(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : cloneDefaultCatalog();
  } catch { return cloneDefaultCatalog(); }
}
function localSaveCatalog(catalog){ localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog)); }
function localLoadBrand(){
  try { return { ...DEFAULT_BRAND, ...(JSON.parse(localStorage.getItem(BRAND_KEY) || '{}')) }; }
  catch { return { ...DEFAULT_BRAND }; }
}
function localSaveBrand(brand){ localStorage.setItem(BRAND_KEY, JSON.stringify(brand)); }
function localReset(){
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(BRAND_KEY);
  return cloneDefaultCatalog();
}
