/* Device-local static cache; no patient storage, analytics, or background submission. */
(()=>{
 const shell=document.querySelector('.shell');
 const box=document.createElement('aside');box.className='app-tools';box.setAttribute('aria-label','Application mobile et accès hors connexion');
 box.innerHTML=`<div class="app-tools-line"><span id="offline-status" role="status">Préparation de l’accès hors connexion…</span><button type="button" id="install-app">Installer sur mon téléphone</button><button type="button" id="update-app" hidden>Nouvelle version disponible</button></div><details id="install-help"><summary>Installation, hors connexion et confidentialité</summary><p><strong>iPhone / iPad :</strong> ouvrir cette adresse dans Safari, choisir Partager → Sur l’écran d’accueil ; activer « Ouvrir comme app web » si proposé, puis Ajouter.</p><p><strong>Android :</strong> ouvrir cette adresse dans Chrome puis « Installer sur mon téléphone ». Sinon, utiliser le menu ⋮ → Installer l’application / Ajouter à l’écran d’accueil. Dans un navigateur intégré, ouvrir d’abord le site dans Safari ou Chrome.</p><p>Après l’installation, ouvrir l’application une fois avec Internet et attendre <strong>« Hors connexion prêt »</strong>. Les tableaux, calculs et figures intégrées seront alors disponibles sans réseau ; les liens vers les publications complètes nécessitent Internet. Le système peut supprimer le cache : vérifier cet indicateur avant utilisation hors ligne.</p><p><strong>Aucune observation n’est sauvegardée.</strong> Seuls les fichiers publics de l’outil sont téléchargés. Utiliser un code patient non nominatif. Copier le compte rendu avant de recharger, mettre à jour ou fermer l’application ; le téléphone peut aussi interrompre une session en arrière-plan. Les copies de CR sont sous votre responsabilité.</p><p>Prototype : validation médicale indispensable. La version téléchargée ne garantit pas que les recommandations sont les plus récentes.</p><p id="app-version"></p><button type="button" id="check-update">Vérifier l’accès hors connexion / les mises à jour</button></details>`;
 shell.prepend(box);
 const status=document.getElementById('offline-status'),version=document.getElementById('app-version'),install=document.getElementById('install-app'),update=document.getElementById('update-app');
 const help=document.getElementById('install-help');let deferredInstall=null,registration=null,offline=null,reloadApproved=false,externalUpdate=false;
 let hadController=!!navigator.serviceWorker?.controller;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const installationState=()=>{install.hidden=standalone();};installationState();
 window.addEventListener('appinstalled',()=>{deferredInstall=null;install.hidden=true;});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;install.textContent='Installer l’application';});
 install.addEventListener('click',async()=>{
  if(!deferredInstall){help.open=true;help.scrollIntoView({block:'nearest'});return;}
  const prompt=deferredInstall;deferredInstall=null;
  try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')install.hidden=true;}catch{help.open=true;}
 });
 function showStatus(){
  if(externalUpdate){status.textContent='Nouvelle version activée dans une autre fenêtre. Cette observation reste sur sa version initiale jusqu’au rechargement.';return;}
  status.textContent=offline?.ready?(navigator.onLine?'Hors connexion prêt':'Mode hors connexion — prêt'):'Accès hors connexion non confirmé';
  if(offline)version.textContent='Version de l’application : '+offline.release+' · '+offline.version+'.';
 }
 async function readStatus(){
  const worker=navigator.serviceWorker?.controller||registration?.active;
  if(!worker)return;
  const channel=new MessageChannel();
  const result=await new Promise(resolve=>{const timer=setTimeout(()=>{channel.port1.close();resolve(null)},5000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data)};worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);});
  offline=result;showStatus();
 }
 function waiting(){update.hidden=!registration?.waiting&&!externalUpdate;}
 const dialog=document.createElement('dialog');dialog.className='pwa-update-dialog';dialog.setAttribute('aria-labelledby','update-title');dialog.innerHTML='<h2 id="update-title">Mettre à jour l’application ?</h2><p>Cette page sera rechargée : ses mesures et son compte rendu seront effacés. Copiez votre compte rendu avant de continuer. Les autres fenêtres ouvertes ne seront pas rechargées automatiquement.</p><div><button type="button" id="cancel-app-update" autofocus>Plus tard</button><button type="button" id="confirm-app-update">Mettre à jour et recharger</button></div>';document.body.append(dialog);
 update.addEventListener('click',()=>dialog.showModal());document.getElementById('cancel-app-update').onclick=()=>dialog.close();
 document.getElementById('confirm-app-update').onclick=()=>{dialog.close();if(registration?.waiting){reloadApproved=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}else if(externalUpdate)location.reload();};
 async function register(){
  if(!('serviceWorker' in navigator)||!window.isSecureContext){status.textContent='Hors connexion indisponible dans ce navigateur. Ouvrir le site HTTPS dans Safari ou Chrome.';return;}
  try{
   registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});waiting();
   function watch(worker){if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'){waiting();}if(worker.state==='activated')readStatus();if(worker.state==='redundant'&&!offline?.ready)status.textContent='Téléchargement hors connexion incomplet. Réessayer avec une connexion stable.';});}
   watch(registration.installing);registration.addEventListener('updatefound',()=>watch(registration.installing));
   navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadApproved){location.reload();return;}if(hadController){externalUpdate=true;showStatus();}else{hadController=true;readStatus();}waiting();});
   await navigator.serviceWorker.ready;await readStatus();
  }catch{status.textContent='Hors connexion indisponible : téléchargement ou stockage bloqué. L’outil reste utilisable en ligne.';}
 }
 document.getElementById('check-update').onclick=async()=>{status.textContent='Vérification…';try{if(registration){await registration.update();waiting();await readStatus();}else await register();}catch{showStatus();if(navigator.onLine)status.textContent+=' · Vérification réseau impossible.';}};
 window.addEventListener('offline',showStatus);window.addEventListener('online',()=>{showStatus();registration?.update().catch(()=>{});});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){readStatus().catch(()=>{});if(navigator.onLine)registration?.update().catch(()=>{});}});
 // Compact navigation keeps the desktop tabs and their original event handlers.
 const nav=document.querySelector('.nav'),picker=document.createElement('div');picker.className='mobile-section-picker';picker.innerHTML='<label for="mobile-section">Rubrique</label><select id="mobile-section" aria-label="Rubrique échographique"></select>';nav.before(picker);
 const select=picker.querySelector('select'),tabs=[...nav.querySelectorAll('[role="tab"]')];
 for(const tab of tabs){const option=document.createElement('option');option.value=tab.id;option.textContent=tab.textContent;select.append(option);}
 function syncTab(){for(const option of select.options){const hidden=document.getElementById(option.value).hidden;option.hidden=hidden;option.disabled=hidden;}const tab=tabs.find(t=>t.getAttribute('aria-selected')==='true');if(tab){select.value=tab.id;picker.dataset.side=tab.id==='tab-lvad'?'lvad':tab.id==='tab-valves'?'valves':/tab-(lv|og)/.test(tab.id)?'left':'right';}}
 syncTab();new MutationObserver(syncTab).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-selected','hidden']});
 select.addEventListener('change',()=>{document.getElementById(select.value).click();document.getElementById('content').scrollIntoView({block:'start'});});
 const actions=document.createElement('div');actions.className='mobile-actions';actions.setAttribute('role','group');actions.setAttribute('aria-label','Actions de l’observation');actions.innerHTML='<button type="button" class="primary" id="mobile-report">Compte rendu</button><button type="button" class="secondary" id="mobile-new-patient">Nouveau patient</button>';document.body.append(actions);
 document.getElementById('mobile-report').onclick=()=>document.getElementById('makeReport').click();document.getElementById('mobile-new-patient').onclick=()=>document.getElementById('resetPatient').click();
 if(window.visualViewport)visualViewport.addEventListener('resize',()=>{document.body.classList.toggle('keyboard-open',window.innerHeight-visualViewport.height>160)});
 register();
})();
