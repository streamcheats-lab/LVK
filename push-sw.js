/* LVK Web Push: background notifications and navigation. */
self.addEventListener('push',event=>{
 let data={};
 try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text()||'Новое сообщение'}}
 const url=new URL('./index.html?page=chatPage',self.location.href).href;
 const options={
  body:String(data.body||'Новое сообщение'),
  icon:new URL('./icon.png',self.location.href).href,
  badge:new URL('./icon.png',self.location.href).href,
  tag:String(data.tag||('lvk-'+Date.now())),
  data:{url,chatId:data.chatId||null},
  renotify:false
 };
 event.waitUntil(self.registration.showNotification(String(data.title||'LVK'),options));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const data=event.notification.data||{};
  const target=data.url||new URL('./index.html?page=chatPage',self.location.href).href;
  const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
  const match=windows.find(c=>new URL(c.url).origin===new URL(target).origin);
  if(match){await match.focus();match.postMessage({type:'LVK_OPEN_CHAT',chatId:data.chatId||null});}
  else await clients.openWindow(target);
 })());
});
