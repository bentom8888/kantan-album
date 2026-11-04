"use strict";
/* かんたん画像アルバム スマホ版：アルバム表示部分
   PC版 v0.6.0 の「スマホで見る.html」(表示部 0.5.8) と同じ画面・操作を、
   枠(iframe)を使わずにアプリの画面へ直接表示するためのもの。
   データは「スマホで見る.html」の中の ALBUM_DATA を JSON として読み取って使う（プログラムとしては実行しない）。 */
window.KAA_VIEW = {
  css: "\n:root{font-family:system-ui,-apple-system,\"Segoe UI\",\"Yu Gothic\",Meiryo,sans-serif;color:#202631;background:#eef1f5}*{box-sizing:border-box}[hidden]{display:none!important}html{width:100%;overflow-x:hidden}body{margin:0;width:100%;overflow-x:hidden}header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #d7dde5;padding:10px 12px}h1{font-size:18px;margin:0 0 8px}.filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}select,input{width:100%;min-width:0;border:1px solid #b7c1cf;border-radius:8px;background:#fff;padding:9px;font:inherit}.status{margin-top:7px;color:#5a6574;font-size:12px}.main{padding:10px 10px 88px;max-width:1100px;width:100%;min-width:0;margin:auto}.meta{min-width:0;background:#fff;border:1px solid #d7dde5;border-radius:10px;padding:10px 12px;margin-bottom:8px}.title{font-weight:700;font-size:16px;line-height:1.45;overflow-wrap:anywhere}.detail{font-size:12px;color:#56708f;margin-top:4px}.comment{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;font-size:14px;background:#f3f7ff;border:1px solid #dce7fa;border-radius:9px;padding:10px 12px;margin:8px 0}.viewer{width:100%;min-width:0;position:relative;background:#141820;border-radius:10px;min-height:260px;height:min(67vh,820px);display:flex;align-items:center;justify-content:center;overflow:hidden}.viewer img{max-width:100%;max-height:100%;object-fit:contain}.missing{color:#fff;padding:24px;text-align:center}.arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:48px;height:48px;border:0;border-radius:50%;background:#fffffff0;font-size:38px;line-height:42px;color:#16202e}.prev{left:8px}.next{right:8px}.footer{display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap;color:#596473;font-size:12px;padding:8px 2px}.source{color:#1768ca;text-decoration:none}.empty{background:#fff;border-radius:10px;padding:40px 18px;text-align:center;color:#617082}.bottom{position:fixed;left:0;right:0;bottom:0;z-index:6;background:#ffffffee;border-top:1px solid #d7dde5;padding:9px 12px;display:flex;gap:10px}.bottom button{flex:1;border:1px solid #9eabb9;background:#fff;border-radius:10px;padding:12px;font:inherit;font-weight:700}.bottom button:active{background:#e9f1fb}.viewer img{cursor:zoom-in;touch-action:manipulation}.navrow{display:flex;gap:10px;justify-content:space-between;padding:8px 0}.navrow button{flex:1;min-height:44px;border:1px solid #aeb8c6;border-radius:9px;background:#fff;font:inherit;font-weight:700}.zoom{position:fixed;inset:0;z-index:50;background:#05070a;display:flex;flex-direction:column;color:#fff}.zoom[hidden]{display:none!important}.zoombar{flex:0 0 auto;display:flex;gap:8px;align-items:center;padding:8px;background:#111720ef;border-bottom:1px solid #303845}.zoombar button{border:1px solid #647184;background:#fff;color:#111;border-radius:8px;padding:8px 11px;font:inherit;font-weight:700}.zoomtitle{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}.zoomlevel{min-width:46px;text-align:center;font-size:12px;color:#d7e0eb}.zoomstage{position:relative;flex:1;min-height:0;overflow:auto;touch-action:none;display:flex;align-items:center;justify-content:center;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.zoomstage img{display:block;object-fit:contain;max-width:100%;max-height:100%;cursor:zoom-in}.zoomstage.zoomed{align-items:flex-start;justify-content:flex-start}.zoomstage.zoomed img{max-width:none;max-height:none;cursor:zoom-out}.zoomnav{flex:0 0 auto;display:flex;gap:10px;padding:8px;background:#111720}.zoomnav button{flex:1;min-height:44px;border:1px solid #647184;border-radius:8px;background:#fff;color:#111;font:inherit;font-weight:700}@media(min-width:720px){.filters{grid-template-columns:repeat(6,minmax(0,1fr))}.bottom{display:none}.main{padding-bottom:20px}}\n",
  html: "\n<header>\n  <h1>かんたん画像アルバム <small style=\"font-size:11px;color:#687585\">スマホ版 0.5.8</small></h1>\n  <div class=\"filters\">\n    <select id=\"category\"><option value=\"\">すべての項目</option></select>\n    <select id=\"name\"><option value=\"\">すべての名前</option></select>\n    <select id=\"pattern\"><option value=\"\">すべての種類</option></select>\n    <select id=\"set\"><option value=\"\">すべての検証セット</option></select>\n    <input id=\"search\" placeholder=\"セット名・コメント検索\">\n    <select id=\"sortOrder\" aria-label=\"並び順\"><option value=\"savedNew\">保存：新しい順</option><option value=\"savedOld\">保存：古い順</option><option value=\"titleNew\">名前の日付：新しい順</option><option value=\"titleOld\">名前の日付：古い順</option></select>\n  </div>\n  <div id=\"status\" class=\"status\"></div>\n</header>\n<main class=\"main\">\n  <div id=\"empty\" class=\"empty\" hidden>該当する画像がありません。</div>\n  <section id=\"content\">\n    <div class=\"meta\">\n      <div id=\"title\" class=\"title\"></div>\n      <div id=\"detail\" class=\"detail\"></div>\n    </div>\n    <div id=\"comment\" class=\"comment\" hidden></div>\n    <div id=\"viewer\" class=\"viewer\">\n      <img id=\"image\" alt=\"\">\n      <div id=\"missing\" class=\"missing\" hidden>画像ファイルが見つかりません</div>\n    </div>\n    <div class=\"navrow\"><button id=\"prev\" type=\"button\">‹ 前の画像</button><button id=\"next\" type=\"button\">次の画像 ›</button></div>\n    <div class=\"footer\"><span id=\"count\"></span><a id=\"source\" class=\"source\" target=\"_blank\" rel=\"noopener noreferrer\">元サイトを開く</a></div>\n  </section>\n</main>\n<div class=\"bottom\"><button id=\"bottomPrev\">‹ 前へ</button><button id=\"bottomNext\">次へ ›</button></div>\n<div id=\"zoom\" class=\"zoom\" hidden>\n  <div class=\"zoombar\">\n    <button id=\"zoomClose\" type=\"button\">閉じる</button>\n    <div id=\"zoomTitle\" class=\"zoomtitle\"></div>\n    <button id=\"zoomOut\" type=\"button\">－</button>\n    <span id=\"zoomLevel\" class=\"zoomlevel\">100%</span>\n    <button id=\"zoomIn\" type=\"button\">＋</button>\n  </div>\n  <div id=\"zoomStage\" class=\"zoomstage\"><img id=\"zoomImage\" alt=\"\"></div>\n  <div class=\"zoomnav\"><button id=\"zoomPrev\" type=\"button\">‹ 前の画像</button><button id=\"zoomNext\" type=\"button\">次の画像 ›</button></div>\n</div>\n",
  start: function (ALBUM_DATA) {

const $=id=>document.getElementById(id);
let flat=[];let index=0;let zoomScale=1;let zoomTouches=null;let lastTap=0;let suppressTap=false;
const text=v=>typeof v==='string'?v:'';
const unique=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
function option(select,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o)}
function selectedSets(ignoreSet=false){const cat=$('category').value,n=$('name').value,p=$('pattern').value,setId=ignoreSet?'':$('set').value,q=$('search').value.trim().toLocaleLowerCase();return ALBUM_DATA.items.filter(item=>{const hay=[item.title,item.category,item.chartName,item.pattern,item.memo,...item.images.map(x=>x.memo)].join(' ').toLocaleLowerCase();return(!cat||item.category===cat)&&(!n||item.chartName===n)&&(!p||item.pattern===p)&&(!setId||item.id===setId)&&(!q||hay.includes(q))})}
function rebuildDependentFilters(changed){
  const cat=$('category').value;
  if(cat&&cat!=='FXチャート'){$('name').value='';$('pattern').value='';$('name').hidden=true;$('pattern').hidden=true}else{$('name').hidden=false;$('pattern').hidden=false}
  const base=ALBUM_DATA.items.filter(item=>(!cat||item.category===cat));
  const oldName=$('name').value,oldPattern=$('pattern').value;
  if(changed==='category'){
    $('name').replaceChildren();option($('name'),'','すべての名前');unique(base.map(x=>x.chartName)).forEach(v=>option($('name'),v,v));if([...$('name').options].some(o=>o.value===oldName))$('name').value=oldName;
    const afterName=base.filter(x=>!$('name').value||x.chartName===$('name').value);
    $('pattern').replaceChildren();option($('pattern'),'','すべての種類');unique(afterName.map(x=>x.pattern)).forEach(v=>option($('pattern'),v,v));if([...$('pattern').options].some(o=>o.value===oldPattern))$('pattern').value=oldPattern;
  } else if(changed==='name'){
    const afterName=base.filter(x=>!$('name').value||x.chartName===$('name').value);
    $('pattern').replaceChildren();option($('pattern'),'','すべての種類');unique(afterName.map(x=>x.pattern)).forEach(v=>option($('pattern'),v,v));if([...$('pattern').options].some(o=>o.value===oldPattern))$('pattern').value=oldPattern;
  }
  const current=$('set').value;
  $('set').replaceChildren();option($('set'),'','すべての検証セット');
  const sets=selectedSets(true);sets.forEach(item=>option($('set'),item.id,item.title||'タイトルなし'));
  if(sets.some(x=>x.id===current))$('set').value=current;
}
function applyFilters(){
  const sets=selectedSets(false);flat=[];
  sets.forEach((item,setPos)=>item.images.forEach((img,imgPos)=>flat.push({item,img,setPos,imgPos,setTotal:sets.length})));
  if(index>=flat.length)index=Math.max(0,flat.length-1);
  $('status').textContent='該当 '+sets.length+'セット / '+flat.length+'枚 ・ 作成 '+new Date(ALBUM_DATA.generatedAt).toLocaleString('ja-JP');
  render();
}
function combinedComment(item,img){const a=text(item.memo).trim(),b=text(img.memo).trim();return[a&&(b?'セット共通のコメント\n'+a:a),b&&(a?'この画像のコメント\n'+b:b)].filter(Boolean).join('\n\n')}
function updateZoom(){
  if($('zoom').hidden||!flat.length)return;
  const row=flat[index],item=row.item,img=row.img;
  $('zoomTitle').textContent=item.title||'タイトルなし';
  if(img.src){$('zoomImage').src=img.src;$('zoomImage').hidden=false}else{$('zoomImage').removeAttribute('src');$('zoomImage').hidden=true}
  const stage=$('zoomStage');$('zoomLevel').textContent=Math.round(zoomScale*100)+'%';
  if(zoomScale<=1){stage.classList.remove('zoomed');$('zoomImage').style.width='';$('zoomImage').style.height='';stage.scrollTo(0,0)}
  else{stage.classList.add('zoomed');$('zoomImage').style.width=(zoomScale*100)+'%';$('zoomImage').style.height='auto'}
}
function setZoom(value){zoomScale=Math.max(1,Math.min(4,value));updateZoom()}
function openZoom(){if(!flat.length)return;zoomScale=1;$('zoom').hidden=false;document.body.style.overflow='hidden';updateZoom()}
function closeZoom(){$('zoom').hidden=true;document.body.style.overflow='';zoomScale=1}
function render(){
  const empty=!flat.length;$('empty').hidden=!empty;$('content').hidden=empty;if(empty)return;
  const row=flat[index],item=row.item,img=row.img;$('title').textContent=item.title||'タイトルなし';
  $('detail').textContent=[item.category,item.chartName,item.pattern].filter(Boolean).join(' ／ ');
  const c=combinedComment(item,img);$('comment').hidden=!c;$('comment').textContent=c;
  if(img.src){$('image').src=img.src;$('image').hidden=false;$('missing').hidden=true}else{$('image').removeAttribute('src');$('image').hidden=true;$('missing').hidden=false}
  const inSet=item.images.length;const sets=selectedSets(false);const setNo=sets.findIndex(x=>x.id===item.id)+1;$('count').textContent='セット '+setNo+' / '+sets.length+' ・ 画像 '+(row.imgPos+1)+' / '+inSet+' ・ 全体 '+(index+1)+' / '+flat.length;
  const url=text(img.pageUrl);$('source').hidden=!/^https?:\/\//i.test(url);if(!$('source').hidden)$('source').href=url;
}
function step(delta){
  if(!flat.length)return;
  const inZoom=!$('zoom').hidden;
  index=(index+delta+flat.length)%flat.length;
  zoomScale=1;
  render();
  if(inZoom){updateZoom();return;}
  // Every navigation lands at the same chart position, regardless of comment length.
  const viewer=$('viewer');
  const header=document.querySelector('header');
  const top=window.scrollY+viewer.getBoundingClientRect().top-(header?header.getBoundingClientRect().height:0)-8;
  window.scrollTo({top:Math.max(0,top),left:0,behavior:'instant'});
}
['prev','bottomPrev'].forEach(id=>$(id).addEventListener('click',()=>step(-1)));['next','bottomNext'].forEach(id=>$(id).addEventListener('click',()=>step(1)));
$('image').addEventListener('click',openZoom);
$('zoomClose').addEventListener('click',closeZoom);
$('zoomIn').addEventListener('click',()=>setZoom(zoomScale+1));
$('zoomOut').addEventListener('click',()=>setZoom(zoomScale-1));
$('zoomPrev').addEventListener('click',()=>step(-1));
$('zoomNext').addEventListener('click',()=>step(1));
// Touch gestures are reserved for zooming and panning, never navigation.
const zs=$('zoomStage');
function touchDistance(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
zs.addEventListener('touchstart',e=>{
  if(e.touches.length===2){zoomTouches={kind:'pinch',distance:touchDistance(e.touches[0],e.touches[1]),scale:zoomScale};suppressTap=true}
  else if(e.touches.length===1){suppressTap=false;zoomTouches={kind:'pan',x:e.touches[0].clientX,y:e.touches[0].clientY,left:zs.scrollLeft,top:zs.scrollTop,moved:false}}
},{passive:false});
zs.addEventListener('touchmove',e=>{
  if(!zoomTouches)return;
  e.preventDefault();
  if(e.touches.length===2){
    if(zoomTouches.kind!=='pinch')zoomTouches={kind:'pinch',distance:touchDistance(e.touches[0],e.touches[1]),scale:zoomScale};
    const distance=touchDistance(e.touches[0],e.touches[1]);
    if(zoomTouches.distance>0){const next=Math.max(1,Math.min(4,zoomTouches.scale*distance/zoomTouches.distance));if(Math.abs(next-zoomScale)>0.015)setZoom(next)}
    suppressTap=true;
  }else if(e.touches.length===1&&zoomTouches.kind==='pan'){
    const dx=e.touches[0].clientX-zoomTouches.x,dy=e.touches[0].clientY-zoomTouches.y;
    if(Math.abs(dx)+Math.abs(dy)>8){zoomTouches.moved=true;suppressTap=true}
    if(zoomScale>1){zs.scrollLeft=zoomTouches.left-dx;zs.scrollTop=zoomTouches.top-dy}
  }
},{passive:false});
zs.addEventListener('touchend',e=>{
  if(e.touches.length===0){
    if(zoomTouches?.kind==='pan'&&!zoomTouches.moved&&!suppressTap){const now=Date.now();if(now-lastTap<360){e.preventDefault();setZoom(zoomScale<=1?2:1);lastTap=0}else lastTap=now}else{lastTap=0}
    zoomTouches=null;
    suppressTap=false;
  }else if(e.touches.length===1){zoomTouches={kind:'pan',x:e.touches[0].clientX,y:e.touches[0].clientY,left:zs.scrollLeft,top:zs.scrollTop,moved:true}}
},{passive:false});
zs.addEventListener('touchcancel',()=>{zoomTouches=null;suppressTap=false},{passive:true});
$('zoomImage').addEventListener('dblclick',e=>{if(e.sourceCapabilities?.firesTouchEvents)return;e.preventDefault();setZoom(zoomScale<=1?2:1)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('zoom').hidden)closeZoom();if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1)});
$('category').addEventListener('change',()=>{index=0;rebuildDependentFilters('category');applyFilters()});
$('name').addEventListener('change',()=>{index=0;rebuildDependentFilters('name');applyFilters()});
$('pattern').addEventListener('change',()=>{index=0;rebuildDependentFilters('pattern');applyFilters()});
$('set').addEventListener('change',()=>{index=0;applyFilters()});$('search').addEventListener('input',()=>{index=0;rebuildDependentFilters('search');applyFilters()});
unique(ALBUM_DATA.items.map(x=>x.category)).forEach(v=>option($('category'),v,v));
unique(ALBUM_DATA.items.map(x=>x.chartName)).forEach(v=>option($('name'),v,v));
unique(ALBUM_DATA.items.map(x=>x.pattern)).forEach(v=>option($('pattern'),v,v));

function titleDate(title){const m=String(title||'').match(/(\d{4})\s*[\/\-.年]\s*(\d{1,2})\s*[\/\-.月]\s*(\d{1,2})/);if(!m)return null;const mo=Number(m[2]),d=Number(m[3]);if(mo<1||mo>12||d<1||d>31)return null;return Date.UTC(Number(m[1]),mo-1,d)}
function sortItems(list,mode){const saved=i=>Date.parse(i.savedAt)||0;const s=[...list];if(mode==='savedOld')return s.sort((a,b)=>saved(a)-saved(b));if(mode==='titleNew'||mode==='titleOld'){const dir=mode==='titleNew'?-1:1;return s.sort((a,b)=>{const da=titleDate(a.title),db=titleDate(b.title);if(da===null&&db===null)return saved(b)-saved(a);if(da===null)return 1;if(db===null)return -1;return(da-db)*dir||(saved(a)-saved(b))*dir})}return s.sort((a,b)=>saved(b)-saved(a))}
function applySort(){const sorted=sortItems(ALBUM_DATA.items,$('sortOrder').value);ALBUM_DATA.items.splice(0,ALBUM_DATA.items.length,...sorted)}
try{const saved=localStorage.getItem('kaa.sortOrder');if(saved&&[...$('sortOrder').options].some(o=>o.value===saved))$('sortOrder').value=saved}catch{}
applySort();
$('sortOrder').addEventListener('change',()=>{try{localStorage.setItem('kaa.sortOrder',$('sortOrder').value)}catch{}index=0;applySort();rebuildDependentFilters('search');applyFilters();window.scrollTo({top:0,left:0,behavior:'instant'})});
rebuildDependentFilters('init');applyFilters();

  }
};
