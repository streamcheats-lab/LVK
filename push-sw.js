/* LVK Web Push worker. Separate scope; does not replace existing sw.js. */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {body: event.data?.text() || 'Новое сообщение'}; }
  const title = String(data.title || 'LVK');
  const options = {body: String(data.body || 'Новое уведомление'), icon: './icon.png', badge: './icon.png', tag: String(data.tag || 'lvk'), data: {url: new URL('../index.html?page=chatPage', self.registration.scope).href}};
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = event.notification.data?.url || new URL('../index.html?page=chatPage', self.registration.scope).href;
    const windows = await clients.matchAll({type:'window',includeUncontrolled:true});
    const match = windows.find(c => c.url.startsWith(new URL(target).origin));
    if (match) { await match.focus(); match.postMessage({type:'LVK_OPEN_CHAT'}); }
    else await clients.openWindow(target);
  })());
});
