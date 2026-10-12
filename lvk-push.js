/* LVK Web Push UI. Set the public VAPID key below after generating keys. */
const LVK_VAPID_PUBLIC_KEY = 'PASTE_YOUR_PUBLIC_VAPID_KEY_HERE';
const lvkPushStatus = document.getElementById('lvkPushStatus');
const lvkPushEnable = document.getElementById('lvkPushEnable');
const lvkPushDisable = document.getElementById('lvkPushDisable');
const lvkPushSay = text => { if(lvkPushStatus) lvkPushStatus.textContent=text; };
function lvkBase64ToBytes(str) {
  const pad='='.repeat((4-str.length%4)%4);
  const raw=atob((str+pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function lvkPushRegistration(){
  if(!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw Error('Push не поддерживается этим браузером');
  return navigator.serviceWorker.register('./push-sw.js',{scope:'./lvk-push/',updateViaCache:'none'});
}
async function lvkPushSaveSubscription(sub){
  if(!currentUser) throw Error('Сначала войдите в аккаунт');
  const info=sub.toJSON();
  if(!info.keys?.p256dh || !info.keys?.auth) throw Error('Не удалось прочитать ключи подписки');
  const {error}=await sb.from('lvk_push_subscriptions').upsert({endpoint:info.endpoint,user_id:currentUser.id,p256dh:info.keys.p256dh,auth_key:info.keys.auth},{onConflict:'endpoint'});
  if(error)throw error;
}
lvkPushEnable.addEventListener('click',async()=>{
  lvkPushEnable.disabled=true;
  try {
    if(!currentUser) throw Error('Сначала войдите в аккаунт в разделе «Ещё»');
    if(LVK_VAPID_PUBLIC_KEY.startsWith('PASTE_')) throw Error('Администратор ещё не настроил ключ Web Push');
    const reg=await lvkPushRegistration();
    const permission=await Notification.requestPermission();
    if(permission!=='granted') throw Error('Разрешение на уведомления не предоставлено');
    const existing=await reg.pushManager.getSubscription();
    const sub=existing || await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:lvkBase64ToBytes(LVK_VAPID_PUBLIC_KEY)});
    await lvkPushSaveSubscription(sub);
    lvkPushSay('Уведомления включены. Сообщения будут приходить в фоне.');
  } catch(e) { lvkPushSay('Ошибка: '+(e.message||e)); }
  finally { lvkPushEnable.disabled=false; }
});
lvkPushDisable.addEventListener('click',async()=>{
  lvkPushDisable.disabled=true;
  try {
    const reg=await lvkPushRegistration();
    const sub=await reg.pushManager.getSubscription();
    if(sub){
      if(currentUser)await sb.from('lvk_push_subscriptions').delete().eq('endpoint',sub.endpoint).eq('user_id',currentUser.id);
      await sub.unsubscribe();
    }
    lvkPushSay('Фоновые уведомления отключены на этом устройстве.');
  } catch(e) {lvkPushSay('Ошибка: '+(e.message||e));}
  finally {lvkPushDisable.disabled=false;}
});
// Existing sign-out button: unsubscribe before ending the authenticated session.
const lvkSignOut=document.getElementById('signOut');
if(lvkSignOut){
 const oldSignOut=lvkSignOut.onclick;
 lvkSignOut.onclick=async function(event){
   try {
     const reg=await navigator.serviceWorker.getRegistration('./lvk-push/');
     const sub=await reg?.pushManager?.getSubscription();
     if(sub && currentUser){
       await sb.from('lvk_push_subscriptions').delete().eq('endpoint',sub.endpoint).eq('user_id',currentUser.id);
       await sub.unsubscribe();
     }
   }catch(e){console.warn('LVK push logout cleanup',e)}
   return oldSignOut?.call(this,event);
 };
}
