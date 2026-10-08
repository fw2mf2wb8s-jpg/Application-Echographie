/* Public explanatory text only. Never reads or sends clinical input values. */
(()=>{
 const preview=new URLSearchParams(location.search).get('editor-preview')==='1'&&window.parent!==window;
 let texts={},enabled=false,applying=false;
 const seen=new WeakMap(),nodes=new Map();
 const status=document.createElement('div');status.className='editorial-status';status.innerHTML='<span>Textes explicatifs : version intégrée.</span> <a href="/admin" target="_blank" rel="noopener">Administration des textes</a>';
 document.querySelector('.shell').prepend(status);const label=status.querySelector('span');
 const hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 async function scan(){if(applying)return;applying=true;try{for(const el of document.querySelectorAll('#content .tech,#content .limitations,#content p')){
  if(el.closest('.valve-figure,figure,.report-values')||el.querySelector('input,select,button,table,a,.formula')||el.closest('[contenteditable]'))continue;
  if(!seen.has(el)){const original=el.textContent.trim(),section=el.closest('section')?.id||'general';if(!original||original.length>6000)continue;const key=await hash(section+'|'+original);seen.set(el,{key,original,section,html:el.innerHTML});if(!nodes.has(key))nodes.set(key,new Set());nodes.get(key).add(el);if(preview){el.classList.add('editable-text');el.tabIndex=0;el.setAttribute('role','button');el.title='Modifier ce texte';const choose=()=>{if(enabled)parent.postMessage({type:'echo-edit-select',...seen.get(el),html:undefined},location.origin);};el.addEventListener('click',choose);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});}}
  const info=seen.get(el),change=texts[info.key];if(change&&change.original===info.original&&change.section===info.section){if(el.textContent!==change.text)el.textContent=change.text;}else if(el.innerHTML!==info.html)el.innerHTML=info.html;
 }}finally{applying=false;}}
 new MutationObserver(()=>{scan();}).observe(document.getElementById('content'),{childList:true,subtree:true});
 if(preview){document.body.classList.add('editor-preview');label.textContent='Prévisualisation éditoriale — aucune observation patient.';window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='echo-edit-preview')return;texts=e.data.texts||{};enabled=!!e.data.enabled;scan();});scan().then(()=>parent.postMessage({type:'echo-edit-ready'},location.origin));}
 else fetch('/api/texts',{cache:'no-store',credentials:'omit'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{texts=data.texts||{};label.textContent=data.date?'Textes explicatifs publiés le '+new Date(data.date).toLocaleString('fr-FR')+'.':'Textes explicatifs : version intégrée.';scan();}).catch(()=>{label.textContent='Hors ligne / service indisponible : textes explicatifs intégrés à cette version (dernières corrections en ligne non chargées).';});
})();
