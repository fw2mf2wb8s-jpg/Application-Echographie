/* Static application assets only. Never cache patient inputs, reports, APIs or external resources. */
importScripts('./offline-assets.js');
const PREFIX='echo-cardiaque-static-';
const CACHE=PREFIX+self.ECHO_OFFLINE.version;
const URLS=self.ECHO_OFFLINE.files.map(path=>new URL(path,self.registration.scope).href);
const allowed=new Set(URLS);
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // All-or-nothing: a partial download must not be declared ready.
  await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload',credentials:'same-origin'})));
 })());
 // Do not skip waiting here: observations in open tabs must not be reloaded.
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url),base=new URL(self.registration.scope);
 if(req.method!=='GET'||url.origin!==base.origin)return;
 let target=url.href;
 if(req.mode==='navigate'&&(url.pathname===base.pathname||url.pathname===base.pathname+'index.html'))target=base.href;
 if(!allowed.has(target))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),hit=await cache.match(target);
  // No runtime cache writes: only the fixed public files above are stored.
  return hit||fetch(req);
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){event.waitUntil(self.skipWaiting());return;}
 if(event.data?.type==='OFFLINE_STATUS')event.waitUntil((async()=>{
  const cache=await caches.open(CACHE),keys=await cache.keys(),present=new Set(keys.map(r=>r.url));
  event.ports[0]?.postMessage({ready:URLS.every(url=>present.has(url)),version:self.ECHO_OFFLINE.version,release:self.ECHO_OFFLINE.release,count:URLS.length});
 })());
});
