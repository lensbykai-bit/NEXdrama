let catalog = [];
let brand = { ...DEFAULT_BRAND };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function esc(value=''){ return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function showToast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove('show'),2200); }
function setBusy(button, busy, text='Working...'){ if(!button)return; if(busy){ button.dataset.old=button.textContent; button.textContent=text; button.disabled=true; } else { button.textContent=button.dataset.old || button.textContent; button.disabled=false; } }
function showModal(id){ $('#'+id).classList.add('show'); $('#'+id).setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
function closeModal(id){ $('#'+id).classList.remove('show'); $('#'+id).setAttribute('aria-hidden','true'); if(!$$('.modal.show').length) document.body.style.overflow=''; }
function brandMarkup(){
  const full=brand.name||'MOVIEFLIX', accent=(brand.accentWord||'').toUpperCase();
  if(accent && full.toUpperCase().endsWith(accent)) return `${esc(full.slice(0,-accent.length))}<span>${esc(full.slice(-accent.length))}</span>`;
  return esc(full);
}
function applyBrand(){
  $('#adminBrand').innerHTML=brandMarkup(); $('#authBrand').innerHTML=brandMarkup(); document.title=`${brand.name} Admin`;
  $('#brandName').value=brand.name||''; $('#brandAccent').value=brand.accentWord||''; $('#brandTagline').value=brand.tagline||'';
}
function modeText(){ return MovieDB.mode()==='supabase' ? '● Supabase Connected' : '● Demo Mode'; }
function applyModeUI(){
  const real=MovieDB.mode()==='supabase';
  $('#dbStatus').textContent=modeText(); $('#dbStatus').classList.toggle('connected',real);
  $('#dashboardModeBanner').innerHTML=real ? '<b>Live Database:</b> changes are shared across devices.' : '<b>Demo Mode:</b> changes are saved only in this browser until Supabase is connected.';
  $('#dashboardModeBanner').className=`mode-banner ${real?'live':'demo'}`;
  $('#connectionInfo').innerHTML=real ? '<strong>Connected</strong><span>Supabase URL and publishable key are loaded from config.js.</span>' : '<strong>Not connected</strong><span>Add your Supabase Project URL and publishable key to config.js, then reload.</span>';
  $('#demoResetPanel').classList.toggle('hidden',real);
}
function showAuth(message=''){
  $('#authScreen').classList.remove('hidden'); $('#dashboard').classList.add('hidden');
  const real=MovieDB.mode()==='supabase';
  $('#authModeBanner').textContent=real ? (message || 'Database connected — admin authorization is required.') : 'Demo Mode — no real login is required. Opening dashboard…';
  $('#authModeBanner').className=`mode-banner ${real?'live':'demo'}`;
}
function showDashboard(){ $('#authScreen').classList.add('hidden'); $('#dashboard').classList.remove('hidden'); }

async function reloadData(){
  [brand,catalog]=await Promise.all([MovieDB.getBrand(),MovieDB.getCatalog()]);
  applyBrand(); applyModeUI(); renderAll();
}
function renderStats(){
  $('#statMovies').textContent=catalog.filter(x=>x.type==='movie').length;
  $('#statSeries').textContent=catalog.filter(x=>x.type==='series').length;
  $('#statEpisodes').textContent=catalog.reduce((n,x)=>n+(x.episodes?.length||0),0);
  $('#statFeatured').textContent=catalog.filter(x=>x.featured).length;
  $('#recentList').innerHTML=catalog.slice(-6).reverse().map(x=>`<div class="admin-list-row"><div class="admin-avatar">${esc(x.title.slice(0,2).toUpperCase())}</div><div><strong>${esc(x.title)}</strong><span>${esc(x.type)} • ${esc(x.year)} • ${esc(x.genre||'Uncategorized')}</span></div><button data-edit="${esc(x.id)}">Edit</button></div>`).join('') || '<p class="muted">No content yet.</p>';
  $$('#recentList [data-edit]').forEach(b=>b.onclick=()=>openContentEditor(b.dataset.edit));
}
function filteredAdminCatalog(){
  const q=($('#adminSearch').value||'').toLowerCase(); const type=$('#adminTypeFilter').value;
  return catalog.filter(x=>(!q||`${x.title} ${x.genre}`.toLowerCase().includes(q)) && (type==='all'||x.type===type));
}
function renderTable(){
  const rows=filteredAdminCatalog();
  $('#contentTable').innerHTML=rows.map(x=>`<tr><td><div class="title-cell"><div class="tiny-poster">${esc(x.title.slice(0,1))}</div><div><strong>${esc(x.title)}</strong><span>${esc(x.genre||'—')}</span></div></div></td><td><span class="type-pill">${esc(x.type)}</span></td><td>${esc(x.year)}</td><td>${x.episodes?.length||0}</td><td>${x.featured?'★':'—'}</td><td><div class="row-actions"><button data-episodes="${esc(x.id)}">Episodes</button><button data-edit="${esc(x.id)}">Edit</button><button class="delete" data-delete="${esc(x.id)}">Delete</button></div></td></tr>`).join('') || '<tr><td colspan="6" class="empty-cell">No matching titles.</td></tr>';
  $$('#contentTable [data-edit]').forEach(b=>b.onclick=()=>openContentEditor(b.dataset.edit));
  $$('#contentTable [data-episodes]').forEach(b=>b.onclick=()=>openEpisodeManager(b.dataset.episodes));
  $$('#contentTable [data-delete]').forEach(b=>b.onclick=()=>deleteItem(b.dataset.delete));
}
function renderAll(){ renderStats(); renderTable(); }

function openContentEditor(id=''){
  const item=catalog.find(x=>x.id===id);
  $('#contentForm').reset(); $('#contentId').value=item?.id||''; $('#editorHeading').textContent=item?'Edit Title':'Add New Title';
  $('#titleInput').value=item?.title||''; $('#typeInput').value=item?.type||'movie'; $('#yearInput').value=item?.year||2026; $('#genreInput').value=item?.genre||''; $('#qualityInput').value=item?.quality||'HD'; $('#posterInput').value=item?.poster||''; $('#descriptionInput').value=item?.description||''; $('#featuredInput').checked=!!item?.featured;
  showModal('contentModal');
}
async function deleteItem(id){
  const item=catalog.find(x=>x.id===id); if(!item)return; if(!confirm(`Delete “${item.title}”?`))return;
  try{ await MovieDB.deleteItem(id); await reloadData(); showToast('Title deleted'); }catch(err){ showToast(err.message); }
}
$('#contentForm').onsubmit=async e=>{
  e.preventDefault(); const btn=$('#saveContentBtn'); setBusy(btn,true,'Saving...');
  try{
    const id=$('#contentId').value; const existing=catalog.find(x=>x.id===id);
    const item={ id:existing?.id||'', title:$('#titleInput').value.trim(), type:$('#typeInput').value, year:Number($('#yearInput').value)||2026, genre:$('#genreInput').value.trim(), quality:$('#qualityInput').value, poster:$('#posterInput').value.trim(), description:$('#descriptionInput').value.trim(), featured:$('#featuredInput').checked, accent:existing?.accent ?? Math.floor(Math.random()*360), episodes:existing?.episodes||[] };
    const saved=await MovieDB.saveItem(item,!existing);
    if(!existing && item.type==='movie') await MovieDB.saveEpisode(saved.id,{number:1,title:'Full Movie',duration:'',videoUrl:''},true);
    await reloadData(); closeModal('contentModal'); showToast(existing?'Title updated':'Title added');
  }catch(err){ showToast(err.message); } finally { setBusy(btn,false); }
};

function clearEpisodeForm(){ $('#episodeId').value=''; $('#episodeNumber').value='1'; $('#episodeTitle').value=''; $('#episodeDuration').value=''; $('#episodeVideo').value=''; }
function openEpisodeManager(itemId){
  const item=catalog.find(x=>x.id===itemId); if(!item)return;
  $('#episodeItemId').value=itemId; $('#episodeHeading').textContent=`${item.title} — ${item.type==='series'?'Episodes':'Video'}`; clearEpisodeForm(); renderEpisodeList(item); showModal('episodeModal');
}
function renderEpisodeList(item){
  $('#episodeAdminList').innerHTML=[...(item.episodes||[])].sort((a,b)=>a.number-b.number).map(ep=>`<div class="episode-admin-row"><div><b>${item.type==='series'?`EP ${esc(ep.number)}`:'VIDEO'} — ${esc(ep.title||'Untitled')}</b><span>${esc(ep.duration||'No duration')} • ${ep.videoUrl?'Video URL added':'No video URL'}</span></div><div><button data-ep-edit="${esc(ep.id)}">Edit</button><button class="delete" data-ep-delete="${esc(ep.id)}">Delete</button></div></div>`).join('') || '<p class="muted">No episodes yet.</p>';
  $$('#episodeAdminList [data-ep-edit]').forEach(btn=>btn.onclick=()=>{ const ep=item.episodes.find(x=>x.id===btn.dataset.epEdit); if(!ep)return; $('#episodeId').value=ep.id; $('#episodeNumber').value=ep.number; $('#episodeTitle').value=ep.title||''; $('#episodeDuration').value=ep.duration||''; $('#episodeVideo').value=ep.videoUrl||''; });
  $$('#episodeAdminList [data-ep-delete]').forEach(btn=>btn.onclick=async()=>{ if(!confirm('Delete this episode?'))return; try{ await MovieDB.deleteEpisode(item.id,btn.dataset.epDelete); await reloadData(); const fresh=catalog.find(x=>x.id===item.id); renderEpisodeList(fresh); showToast('Episode deleted'); }catch(err){showToast(err.message);} });
}
$('#episodeForm').onsubmit=async e=>{
  e.preventDefault(); const btn=$('#saveEpisodeBtn'); setBusy(btn,true,'Saving...');
  try{
    const item=catalog.find(x=>x.id===$('#episodeItemId').value); if(!item)throw new Error('Title not found.');
    const id=$('#episodeId').value; const existing=item.episodes.find(x=>x.id===id);
    const n=Number($('#episodeNumber').value)||1;
    const ep={id:existing?.id||'',number:n,title:$('#episodeTitle').value.trim()||(item.type==='movie'?'Full Movie':`Episode ${n}`),duration:$('#episodeDuration').value.trim(),videoUrl:$('#episodeVideo').value.trim()};
    await MovieDB.saveEpisode(item.id,ep,!existing); await reloadData(); clearEpisodeForm(); renderEpisodeList(catalog.find(x=>x.id===item.id)); showToast(existing?'Episode updated':'Episode added');
  }catch(err){showToast(err.message);} finally{setBusy(btn,false);}
};
$('#clearEpisodeBtn').onclick=clearEpisodeForm;

$('#brandForm').onsubmit=async e=>{
  e.preventDefault();
  try{ brand=await MovieDB.saveBrand({name:$('#brandName').value.trim()||'MOVIEFLIX',accentWord:$('#brandAccent').value.trim(),tagline:$('#brandTagline').value.trim()}); applyBrand(); showToast('Brand saved'); }
  catch(err){showToast(err.message);}
};
$('#exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),brand,catalog},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='movieflix-v3-backup.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
};
$('#resetBtn').onclick=async()=>{ if(!confirm('Reset Demo Mode data?'))return; try{await MovieDB.resetDemo(); await reloadData(); showToast('Demo restored');}catch(err){showToast(err.message);} };

$('#adminSearch').oninput=renderTable; $('#adminTypeFilter').onchange=renderTable;
$('#newContentBtn').onclick=()=>{switchTab('contentTab');openContentEditor();}; $('#newContentBtn2').onclick=()=>openContentEditor();
function switchTab(id){ $$('.admin-tab').forEach(x=>x.classList.add('hidden')); $('#'+id).classList.remove('hidden'); $$('.side-link').forEach(x=>x.classList.toggle('active',x.dataset.tab===id)); }
$$('.side-link').forEach(btn=>btn.onclick=()=>switchTab(btn.dataset.tab));
$$('[data-close]').forEach(btn=>btn.onclick=()=>closeModal(btn.dataset.close));
$$('.modal').forEach(modal=>modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal.id);}));
window.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal.show').forEach(m=>closeModal(m.id));});

$('#showSignupBtn').onclick=()=>{ $('#loginForm').classList.add('hidden'); $('#showSignupBtn').classList.add('hidden'); $('#signupForm').classList.remove('hidden'); $('#authHeading').textContent='Create Account'; };
$('#backLoginBtn').onclick=()=>{ $('#signupForm').classList.add('hidden'); $('#loginForm').classList.remove('hidden'); $('#showSignupBtn').classList.remove('hidden'); $('#authHeading').textContent='Admin Login'; };
$('#loginForm').onsubmit=async e=>{
  e.preventDefault(); const btn=$('#loginBtn'); setBusy(btn,true,'Signing in...');
  try{
    await MovieDB.signIn($('#loginEmail').value.trim(),$('#loginPassword').value);
    if(!(await MovieDB.isAdmin())){ await MovieDB.signOut(); throw new Error('This account is not authorized as an admin.'); }
    await reloadData(); showDashboard(); showToast('Signed in');
  }catch(err){showAuth(err.message); showToast(err.message);} finally{setBusy(btn,false);}
};
$('#signupForm').onsubmit=async e=>{
  e.preventDefault(); const btn=$('#signupBtn'); setBusy(btn,true,'Creating...');
  try{
    const result=await MovieDB.signUp($('#signupEmail').value.trim(),$('#signupPassword').value);
    const msg=result?.user?.identities?.length===0 ? 'Account may already exist.' : 'Account created. Verify email if required, then add it to admins using setup.sql.';
    showToast(msg); $('#backLoginBtn').click();
  }catch(err){showToast(err.message);} finally{setBusy(btn,false);}
};
$('#logoutBtn').onclick=async()=>{ await MovieDB.signOut(); showAuth('Signed out.'); };

async function init(){
  showAuth();
  try{
    brand=await MovieDB.getBrand(); applyBrand(); applyModeUI();
    if(MovieDB.mode()==='demo'){
      await reloadData(); showDashboard(); return;
    }
    const session=await MovieDB.getSession();
    if(!session) return;
    if(!(await MovieDB.isAdmin())){ await MovieDB.signOut(); showAuth('This signed-in account is not authorized as an admin.'); return; }
    await reloadData(); showDashboard();
  }catch(err){ console.error(err); showAuth(err.message); showToast(err.message); }
}
init();
