let workflowReady=false;
function configureWorkflow(){
 const doppler=groups.find(g=>g.id==='lvsystole').subs.find(s=>s.name.startsWith('Doppler'));
 doppler.items.splice(doppler.items.findIndex(x=>x.id==='ls_vti')+1,0,ls('ls_svvol','VES volumétrique VG — VTD − VTS','mL','Volumes 2D Simpson du même examen ; VTD − VTS. Volume éjecté total : ne pas confondre avec le VES antérograde Doppler, notamment en cas de fuite mitrale.','Selon gabarit / charge',{calc:['lm_edv','lm_esv'],operation:'svvol'}));
 doppler.items.find(x=>x.id==='ls_sv').name='VES Doppler sous-aortique';
 const order=['lvmorphology','lvsystole','lvdiastole','og','morphology','systole','diastole','od','valves','lvad'];
 groups.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
}
function isAF(){const r=document.getElementById('rhythm').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return !/sinusal|sans fa|pas de fa/.test(r)&&/\b(?:acfa|fa|af)\b|fibrillation (?:atriale|auriculaire)/.test(r)}
function refreshStandardVisibility(){
 const dt=field('lv_dt');if(dt?.closest){dt.closest('tr').classList.toggle('advanced-measure',!isAF());}
 const item=all.find(x=>x.id==='lv_dt');if(item)item.advanced=!isAF();
}
function setLinkedValue(id,result,active,note){
 const e=field(id);if(active){if(e.dataset.linked!=='true')e.dataset.manual=e.value;e.dataset.linked='true';e.readOnly=true;e.value=result===null?'':fmt(result);e.dataset.exact=result===null?'':String(result);e.title=note;}
 else if(e.dataset.linked==='true'){e.value=e.dataset.manual||'';e.dataset.linked='';e.dataset.exact='';e.readOnly=false;e.title='Saisie manuelle en l’absence des données nécessaires au calcul.';}
 update(e);
}
function syncSharedCalculations(){
 if(!workflowReady)return;
 const get=id=>value(all.find(x=>x.id===id));
 const hasVolume=!!field('lm_edv').value.trim()||!!field('lm_esv').value.trim();
 setLinkedValue('lv_ef',get('ls_efcalc'),hasVolume,'Calcul automatique : 100 × (VTD − VTS) / VTD. Deux volumes valides requis.');
 const exp=vexNumber('vx_exp',.1,100),collapse=vexNumber('vx_collapse',0,100);
 const spontaneous=document.getElementById('intubated').value==='no'&&document.getElementById('niv').value==='no';
 const rap=spontaneous&&exp!==null&&collapse!==null?(exp<=21&&collapse>=50?3:exp>21&&collapse<50?15:8):null;
 const tr=get('lv_tr'),result=tr!==null&&tr>0&&rap!==null?4*tr*tr+rap:null;
 const hasCaval=!!document.getElementById('vx_exp').value.trim()||!!document.getElementById('vx_collapse').value.trim();
 setLinkedValue('lv_pasp',result,hasCaval,'PAPS estimée = 4 × Vmax IT² + POD. Valable sans obstacle pulmonaire / RVOT, avec IT et POD fiables.');
 const note=document.getElementById('pasp-calculation-note');if(note)note.textContent=result!==null?'PAPS calculée : '+fmt(result)+' mmHg (POD estimée '+rap+' mmHg). Sans obstacle pulmonaire / RVOT ; signal IT fiable requis.':'PAPS automatique : renseigner Vmax IT, VCI expiratoire, collapsibilité et respiration spontanée (Intubé : Non ; VNI / CPAP : Non). Pas de chiffre automatique sous pression positive.';
 refreshStandardVisibility();syncRVOTProxy();
}
function resetLinkedValues(){for(const id of ['lv_ef','lv_pasp']){const e=field(id);e.dataset.manual='';e.dataset.linked='';e.dataset.exact='';e.readOnly=false;}const s=document.getElementById('rvot-plane');if(s)s.value='rvot_distal';}
function syncRVOTProxy(){const input=document.getElementById('rvot-simple'),plane=document.getElementById('rvot-plane');if(!input||!plane?.value)return;input.value=field(plane.value).value;input.setAttribute('aria-invalid',field(plane.value).getAttribute('aria-invalid')||'false');}
function initWorkflow(){
 // Move existing nodes (not copies), preserving fields and listeners.
 const nav=document.querySelector('.nav');for(const g of groups)nav.append(document.getElementById('tab-'+g.id));
 const panel=document.getElementById('diastole'),vex=panel.querySelector('.vexus-box');
 const caval=document.createElement('div');caval.className='vexus-box caval-first';caval.innerHTML='<div class="subhead"><span class="tag">1. Veine cave inférieure et pression auriculaire droite</span></div><div class="table-wrap"><table><thead><tr><th>Indice</th><th>Valeur patient</th><th>Valeur normale</th><th class="quality-head">Critères de qualité</th></tr></thead><tbody></tbody></table></div>';
 for(const id of ['vx_ivc','vx_exp','vx_collapse'])caval.querySelector('tbody').append(document.getElementById(id).closest('tr'));
 const empty=vex.querySelectorAll('.table-wrap');for(const wrap of empty)if(!wrap.querySelector('tbody tr')){const prev=wrap.previousElementSibling;if(prev?.classList.contains('subhead'))prev.remove();wrap.remove();}
 caval.append(document.getElementById('vex-cvp').closest('.vexus-result'));
 panel.querySelector('.section-head').after(caval);
 const head=document.createElement('h3');head.className='workflow-subtitle';head.textContent='2. Paramètres de fonction diastolique VD';caval.after(head);
 vex.querySelector('h2').textContent='3. Congestion veineuse — VExUS C';
 const tr=field('rvot_distal').closest('tr');tr.insertAdjacentHTML('afterend','<tr class="standard-only"><td class="idx"><strong>RVOT</strong><small><label for="rvot-plane">Coupe / site</label><select id="rvot-plane"><option value="rvot_distal">PSAX — distal</option><option value="rvot_plax">PLAX — proximal</option></select></small></td><td class="measure"><div class="field"><input id="rvot-simple" inputmode="decimal" aria-label="RVOT simplifié"><span>mm</span></div></td><td class="normal">&lt; 29 mm : PSAX distal<br>&lt; 33 mm : PLAX proximal</td><td class="tech">Télédiastole ; mesure perpendiculaire. PSAX distal : juste avant l’anneau pulmonaire. PLAX proximal : paroi libre VD → septum. Les deux sites ne sont pas interchangeables ; le choix de coupe conserve chaque mesure séparément.</td></tr>');
 document.getElementById('rvot-plane').addEventListener('change',syncRVOTProxy);
 document.getElementById('rvot-simple').addEventListener('input',e=>{const target=field(document.getElementById('rvot-plane').value);target.value=e.target.value;target.dispatchEvent(new Event('input',{bubbles:true}));});
 field('lv_pasp').closest('td').insertAdjacentHTML('beforeend','<small id="pasp-calculation-note" class="calculation-note"></small>');
 field('lv_ef').closest('tr').querySelector('.idx small').textContent='Automatique si les volumes 2D sont saisis ; sinon saisie directe.';
 field('ls_efcalc').closest('tr').hidden=true;
 document.addEventListener('input',()=>{syncSharedCalculations();refreshICUNotice()});document.addEventListener('change',syncSharedCalculations);
 workflowReady=true;syncSharedCalculations();selectTab('lvmorphology');
}
