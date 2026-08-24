let catalog = [];
let brand = { ...DEFAULT_BRAND };
let activeGenre = 'All';
let searchQuery = '';
let currentItem = null;
let currentEpisode = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function esc(value=''){
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function safeCssUrl(value=''){
  return String(value).replace(/["'()\\\n\r]/g, c => encodeURIComponent(c));
}
function brandMarkup(name){
  const full = name || brand.name || 'MOVIEFLIX';
  const accent = (brand.accentWord || '').toUpperCase();
  if (accent && full.toUpperCase().endsWith(accent)) {
    const cut = full.slice(0, full.length - accent.length);
    return `${esc(cut)}<span>${esc(full.slice(-accent.length))}</span>`;
  }
  return esc(full);
}
function applyBrand(){
  $('#brandLogo').innerHTML = brandMarkup(brand.name);
  $('#footerBrand').innerHTML = brandMarkup(brand.name);
  document.title = `${brand.name} — ${brand.tagline || 'Movies & Series'}`;
}
function posterStyle(item){
  const img = (item.poster || '').trim();
  if (img) return `background-image:linear-gradient(180deg,transparent 45%,rgba(0,0,0,.78)),url("${safeCssUrl(img)}")`;
  const h = Number(item.accent ?? 340);
  return `background-image:radial-gradient(circle at 67% 24%,hsla(${h},70%,70%,.55),transparent 15%),linear-gradient(145deg,hsl(${h} 48% 30%),#11151d 58%,hsl(${(h+35)%360} 55% 18%))`;
}
function card(item, i){
  const epMeta = item.type === 'series' ? `${item.episodes?.length || 0} Episodes` : item.genre;
  return `<article class="card" data-id="${esc(item.id)}" tabindex="0">
    <div class="poster" style="${posterStyle(item)}">
      <span class="index">${String(i+1).padStart(2,'0')}</span><span class="quality">${esc(item.quality || 'HD')}</span>
      <span class="card-play">▶</span>
    </div>
    <h3>${esc(item.title)}</h3><p>${esc(item.year)} • ${esc(epMeta)}</p>
  </article>`;
}
function filterCatalog(){
  return catalog.filter(item => {
    const haystack = `${item.title} ${item.genre} ${item.year} ${item.type}`.toLowerCase();
    const qOk = !searchQuery || haystack.includes(searchQuery.toLowerCase());
    const gOk = activeGenre === 'All' || (item.genre || '').split(',').map(x=>x.trim()).includes(activeGenre);
    return qOk && gOk;
  });
}
function render(){
  const filtered = filterCatalog();
  const movies = filtered.filter(x=>x.type==='movie');
  const series = filtered.filter(x=>x.type==='series');
  $('#movieGrid').innerHTML = movies.map(card).join('');
  $('#seriesGrid').innerHTML = series.map(card).join('');
  const latest = series.flatMap(item => (item.episodes || []).map(ep => ({item,ep}))).slice(-12).reverse();
  $('#episodeList').innerHTML = latest.map(({item,ep}) => `<article class="episode" data-item="${esc(item.id)}" data-episode="${esc(ep.id)}">
    <div class="episode-thumb" style="${posterStyle(item)}"><span>EP ${esc(ep.number)}</span></div>
    <div><h4>${esc(item.title)}</h4><p>Episode ${esc(ep.number)} • ${esc(ep.duration || '—')} • ${esc(item.quality || 'HD')}</p></div>
  </article>`).join('');
  $('#movies').classList.toggle('hidden', movies.length===0);
  $('#series').classList.toggle('hidden', series.length===0);
  $('#latest').classList.toggle('hidden', latest.length===0);
  $('#emptyState').classList.toggle('hidden', filtered.length!==0);
  bindDynamic();
}
function renderGenres(){
  const set = new Set();
  catalog.forEach(x => (x.genre || '').split(',').map(v=>v.trim()).filter(Boolean).forEach(v=>set.add(v)));
  const genres = ['All', ...[...set].sort()];
  $('#genreFilters').innerHTML = genres.map(g=>`<button class="filter-chip ${g===activeGenre?'active':''}" data-genre="${esc(g)}">${esc(g)}</button>`).join('');
  $$('#genreFilters [data-genre]').forEach(btn => btn.onclick = () => { activeGenre = btn.dataset.genre; renderGenres(); render(); });
}
function featuredItem(){ return catalog.find(x=>x.featured) || catalog[0]; }
function renderHero(){
  const item = featuredItem();
  if(!item){ $('#hero').classList.add('hero-empty'); return; }
  $('#hero').classList.remove('hero-empty');
  $('#heroBadge').textContent = `FEATURED ${item.type.toUpperCase()}`;
  const words = item.title.toUpperCase().split(' ');
  const last = words.pop() || '';
  $('#heroTitle').innerHTML = `${esc(words.join(' '))}<br><span>${esc(last)}</span>`;
  $('#heroDescription').textContent = item.description || '';
  $('#heroMeta').innerHTML = `<span>${esc(item.year)}</span><span>•</span><span>${item.type==='series' ? `${item.episodes?.length||0} Episodes` : esc(item.genre)}</span><span>•</span><span>${esc(item.quality||'HD')}</span>`;
  $('#heroBackdrop').setAttribute('style', posterStyle(item));
  $('#heroWatch').onclick = () => openPlayer(item.id, item.episodes?.[0]?.id);
  $('#heroInfo').onclick = () => openDetails(item.id);
}
function bindDynamic(){
  $$('.card').forEach(el => {
    const action = () => openDetails(el.dataset.id);
    el.onclick = action;
    el.onkeydown = e => { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); action(); } };
  });
  $$('.episode').forEach(el => el.onclick = () => openPlayer(el.dataset.item, el.dataset.episode));
}
function openDetails(id){
  const item = catalog.find(x=>x.id===id); if(!item) return;
  currentItem = item;
  $('#detailPoster').setAttribute('style', posterStyle(item));
  $('#detailType').textContent = item.type.toUpperCase();
  $('#detailTitle').textContent = item.title;
  $('#detailMeta').innerHTML = `<span>${esc(item.year)}</span><span>${esc(item.genre)}</span><span>${esc(item.quality||'HD')}</span>`;
  $('#detailDescription').textContent = item.description || 'No description yet.';
  $('#detailEpisodes').innerHTML = (item.episodes || []).map(ep => `<button data-ep="${esc(ep.id)}"><b>${item.type==='series' ? `EP ${esc(ep.number)}` : 'PLAY'}</b><span>${esc(ep.title || '')}</span><small>${esc(ep.duration || '')}</small></button>`).join('') || '<p class="muted">No episode added yet.</p>';
  $$('#detailEpisodes [data-ep]').forEach(btn => btn.onclick = ()=>openPlayer(item.id,btn.dataset.ep));
  $('#detailWatch').onclick = () => openPlayer(item.id, item.episodes?.[0]?.id);
  showModal('detailModal');
}
function normalizeVideoUrl(url){
  const value = (url || '').trim();
  if(!value) return {kind:'none',url:''};
  let u;
  try { u = new URL(value); } catch { return {kind:'none',url:''}; }
  if(!['https:','http:'].includes(u.protocol)) return {kind:'none',url:''};
  if(/\.(mp4|webm|ogg)(\?.*)?$/i.test(u.href)) return {kind:'video',url:u.href};
  if(u.hostname.includes('youtube.com')){
    const id = u.searchParams.get('v');
    if(id && /^[\w-]{6,20}$/.test(id)) return {kind:'embed',url:`https://www.youtube.com/embed/${id}?autoplay=1`};
  }
  if(u.hostname==='youtu.be'){
    const id=u.pathname.slice(1).split('/')[0];
    if(/^[\w-]{6,20}$/.test(id)) return {kind:'embed',url:`https://www.youtube.com/embed/${id}?autoplay=1`};
  }
  if(u.hostname.includes('vimeo.com')){
    const id = u.pathname.split('/').filter(Boolean).pop();
    if(/^\d+$/.test(id || '')) return {kind:'embed',url:`https://player.vimeo.com/video/${id}?autoplay=1`};
  }
  return {kind:'embed',url:u.href};
}
function openPlayer(itemId, episodeId){
  const item = catalog.find(x=>x.id===itemId); if(!item) return;
  const ep = (item.episodes || []).find(x=>x.id===episodeId) || item.episodes?.[0];
  if(!ep){ showToast('No episode available yet'); return; }
  currentItem=item; currentEpisode=ep;
  $('#playerTitle').textContent = item.title;
  $('#playerEpisode').textContent = item.type==='series' ? `EP ${ep.number} • ${ep.title||''}` : ep.title || 'Full Movie';
  $('#playerEpisodes').innerHTML = (item.episodes || []).map(x=>`<button class="${x.id===ep.id?'active':''}" data-play="${esc(x.id)}">${item.type==='series'?`EP ${esc(x.number)}`:'PLAY'}</button>`).join('');
  $$('#playerEpisodes [data-play]').forEach(btn => btn.onclick = ()=>openPlayer(item.id,btn.dataset.play));
  const source = normalizeVideoUrl(ep.videoUrl);
  const video=$('#html5Player'), iframe=$('#embedPlayer'), placeholder=$('#videoPlaceholder');
  video.pause(); video.removeAttribute('src'); video.load(); iframe.src='about:blank';
  video.classList.remove('show'); iframe.classList.remove('show'); placeholder.classList.remove('hidden');
  if(source.kind==='video'){ video.src=source.url; video.classList.add('show'); placeholder.classList.add('hidden'); }
  else if(source.kind==='embed'){ iframe.src=source.url; iframe.classList.add('show'); placeholder.classList.add('hidden'); }
  showModal('playerModal');
}
function showModal(id){ $('#'+id).classList.add('show'); $('#'+id).setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
function closeModal(id){
  const el=$('#'+id); el.classList.remove('show'); el.setAttribute('aria-hidden','true');
  if(id==='playerModal'){ $('#html5Player').pause(); $('#embedPlayer').src='about:blank'; }
  if(!$$('.modal.show').length) document.body.style.overflow='';
}
function showToast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove('show'),2200); }

$('#searchBtn').onclick=()=>{ $('#searchPanel').classList.add('show'); $('#searchInput').focus(); };
$('#closeSearch').onclick=()=>{ $('#searchPanel').classList.remove('show'); $('#searchInput').value=''; searchQuery=''; render(); };
$('#searchInput').oninput=e=>{ searchQuery=e.target.value; render(); };
$('#menuBtn').onclick=()=>$('#nav').classList.toggle('open');
$$('[data-close]').forEach(btn=>btn.onclick=()=>closeModal(btn.dataset.close));
$$('.modal').forEach(modal=>modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal.id);}));
window.addEventListener('keydown',e=>{ if(e.key==='Escape'){ $$('.modal.show').forEach(m=>closeModal(m.id)); $('#searchPanel').classList.remove('show'); } });

async function init(){
  try {
    [brand, catalog] = await Promise.all([MovieDB.getBrand(), MovieDB.getCatalog()]);
    applyBrand(); renderGenres(); renderHero(); render();
    if(MovieDB.mode()==='demo') showToast('Demo Mode — connect Supabase for shared data');
  } catch(err){
    console.error(err);
    catalog=[]; applyBrand(); renderGenres(); renderHero(); render();
    showToast(`Could not load database: ${err.message}`);
  }
}
init();
