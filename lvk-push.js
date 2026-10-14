/* LVK Web Push: per-device registration and subscription diagnostics. */
(()=>{
 const enable=document.getElementById('lvkPushEnable'),disable=document.getElementById('lvkPushDisable'),status=document.getElementById('lvkPushStatus');
 if(!enable||!disable)return;
 const say=s=>{if(status)status.textContent=s;};
 const getKey=()=>String(window.LVK_VAPID_PUBLIC_KEY||'').trim();
 const bytes=s=>{const raw=atob((s+'='.repeat((4-s.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));};
 const keyBytes=()=>{
   const key=getKey();if(!key)throw Error('Не указан публичный VAPID-ключ в lvk-push-config.js');
   const decoded=bytes(key);
   if(decoded.length!==65||decoded[0]!==4)throw Error('Неверный публичный VAPID-ключ: нужен P-256 publicKey (обычно 87 символов)');
   return decoded;
 };
 const registration=async()=>{
   if(!isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('Web Push не поддерживается или сайт открыт не по HTTPS');
   return navigator.serviceWorker.register('./push-sw.js',{scope:'./lvk-push/',updateViaCache:'none'});
 };
 const save=async sub=>{
   if(!currentUser||!sb)throw Error('Сначала войди в LVK');
   const data=sub.toJSON();if(!data.keys?.p256dh||!data.keys?.auth)throw Error('Браузер не предоставил ключи подписки');
   const {error}=await sb.from('lvk_push_subscriptions').upsert({endpoint:data.endpoint,user_id:currentUser.id,p256dh:data.keys.p256dh,auth_key:data.keys.auth},{onConflict:'endpoint'});
   if(error)throw Error('Подписка браузера создана, но Supabase не сохранил её: '+error.message);
 };
 async function syncExisting(){
   if(!currentUser||Notification.permission!=='granted')return;
   try{
     const reg=await registration();const sub=await reg.pushManager.getSubscription();if(!sub)return;
     const old=sub.options?.applicationServerKey,desired=keyBytes();
     if(old&&(new Uint8Array(old).length!==desired.length||new Uint8Array(old).some((v,i)=>v!==desired[i]))){say('VAPID-ключ изменён. Нажми «Включить уведомления», чтобы переподписаться.');return;}
     await save(sub);say('Push-подписка этого устройства синхронизирована с Supabase.');
   }catch(e){console.warn('LVK push sync:',e);say('Push: '+(e.message||e));}
 }
 enable.addEventListener('click',async()=>{
   enable.disabled=true;
   try{
     if(!currentUser)throw Error('Сначала войди в аккаунт LVK');
     const key=keyBytes();const reg=await registration();
     const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Разрешение на уведомления не предоставлено');
     let sub=await reg.pushManager.getSubscription();
     if(sub){const old=sub.options?.applicationServerKey;if(old&&(new Uint8Array(old).length!==key.length||new Uint8Array(old).some((v,i)=>v!==key[i]))){await sub.unsubscribe();sub=null;}}
     sub ||= await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
     await save(sub);
     say('✓ Подписка сохранена в Supabase. Теперь проверь доставку тестовым сообщением с другого аккаунта.');
   }catch(e){say('Ошибка: '+(e.message||e));}finally{enable.disabled=false;}
 });
 disable.addEventListener('click',async()=>{
   disable.disabled=true;
   try{
     const reg=await registration(),sub=await reg.pushManager.getSubscription();
     if(sub){if(currentUser){const {error}=await sb.from('lvk_push_subscriptions').delete().eq('endpoint',sub.endpoint).eq('user_id',currentUser.id);if(error)throw error;}await sub.unsubscribe();}
     say('Уведомления отключены на этом устройстве.');
   }catch(e){say('Ошибка: '+(e.message||e));}finally{disable.disabled=false;}
 });
 // Do NOT unsubscribe on sign-out: logging out or closing the tab must not
 // silently destroy the browser's background push subscription.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncExisting();});
 window.addEventListener('focus',syncExisting);
 setTimeout(syncExisting,2500);
})();
