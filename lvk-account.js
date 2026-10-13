/* LVK account navigation: reuse original controls and Supabase handlers. */
(()=>{
 const $=id=>document.getElementById(id);
 const overlay=$('lvkAuthOverlay');
 function showAuth(){overlay.hidden=false;document.body.classList.add('lvk-modal-open');$('authEmail')?.focus()}
 function hideAuth(){overlay.hidden=true;document.body.classList.remove('lvk-modal-open')}
 $('lvkCloseAuth').addEventListener('click',hideAuth);
 overlay.addEventListener('click',e=>{if(e.target===overlay)hideAuth()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)hideAuth()});
 $('lvkOpenProfile').addEventListener('click',()=>{if(!currentUser){showAuth();return}navigate('profilePage')});
 $('lvkOpenAbout').addEventListener('click',()=>navigate('aboutPage'));
 $('lvkProfileLogout').addEventListener('click',()=>{$('signOut').click();navigate('settings')});
 // Existing navigation attaches click handlers only at initialization; this menu item is added afterward.
 document.querySelector('.lvk-more-menu [data-page="contactsPage"]')?.addEventListener('click',()=>navigate('contactsPage'));
 const tabs=[...document.querySelectorAll('[data-contact-tab]')];
 function selectTab(tab){tabs.forEach(b=>{const active=b.dataset.contactTab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});$('lvkSavedContacts').hidden=tab!=='saved';$('lvkBlockedContacts').hidden=tab!=='blocked';}
 tabs.forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.contactTab)));
 const contactsNav=document.querySelector('.nav [data-page="contactsPage"]');
 contactsNav.addEventListener('click',()=>{loadShadowContacts().catch(console.error);loadBlockedUsers().catch(console.error);selectTab('saved')});
 const menuContacts=document.querySelector('.lvk-more-menu [data-page="contactsPage"]');
 menuContacts?.addEventListener('click',()=>{loadShadowContacts().catch(console.error);loadBlockedUsers().catch(console.error);selectTab('saved')});
 // Live status reflects the actual Supabase subscription check, not a static PRO label.
 const proStatus=$('proStatus');
 function sync(){
  const loggedIn=!!currentUser;
  const label=loggedIn?'Аккаунт подключён':'Не выполнен вход · Войти / Регистрация';
  $('lvkLoginLabel').textContent=label;
  $('lvkProfileIdentity').textContent=loggedIn?'Аккаунт LVK':'Войдите в аккаунт';
  $('lvkProfileSession').textContent=loggedIn?'Вы вошли в аккаунт LVK.':'Вход не выполнен.';
  const badge=document.querySelector('.lvk-more-pro');
  if(badge){badge.hidden=!(loggedIn&&proActive);badge.textContent='✦ LVK PRO';}
  document.body.classList.toggle('lvk-pro-active',loggedIn&&proActive);
  if(loggedIn&&!overlay.hidden)hideAuth();
 }
 new MutationObserver(sync).observe(proStatus,{childList:true,characterData:true,subtree:true});
 new MutationObserver(sync).observe($('authStatus'),{childList:true,characterData:true,subtree:true});
 // Refresh account display on authentication events, including cross-tab sign-outs.
 if(typeof sb!=='undefined'&&sb)sb.auth.onAuthStateChange(()=>setTimeout(sync,0));
 sync();
})();
