/* Reference messenger UX. Original Supabase chat handlers remain authoritative. */
(()=>{
 const page=document.getElementById('chatPage');
 const content=document.getElementById('chatContent');
 const list=document.getElementById('dmChats');
 const groups=document.getElementById('chatGroups');
 const title=document.getElementById('chatTitle');
 if(!page||!content||!list||!groups||!title)return;
 const firstCard=list.closest('.card');
 const threadCard=title.closest('.card');
 const back=document.createElement('button');back.type='button';back.className='lvk-chat-back';back.textContent='‹';back.setAttribute('aria-label','Назад к чатам');
 title.before(back);
 const mobileHead=document.createElement('div');mobileHead.className='lvk-chat-mobile-head';mobileHead.textContent='Общайся в группах и личных сообщениях';
 firstCard.insertBefore(mobileHead,firstCard.firstChild);
 const close=()=>{if(typeof window.lvkCloseConversation==='function')window.lvkCloseConversation();else page.classList.remove('lvk-thread-open');};
 back.addEventListener('click',close);
 // Existing handlers open conversations; only switch the mobile panel after their click.
 for(const box of [list,groups])box.addEventListener('click',e=>{
   if(e.target.closest('button'))page.classList.add('lvk-thread-open');
 });
 document.querySelectorAll('[data-page],.nav button,.bottom-nav button').forEach(el=>el.addEventListener('click',()=>{
   if(!el.closest('#chatPage'))close();
 }));
 const send=document.getElementById('sendChatButton');if(send){send.textContent='➤';send.setAttribute('aria-label','Отправить сообщение')}
 const sync=()=>{
   for(const box of [list,groups])for(const button of box.querySelectorAll('button')){
     if(!button.hasAttribute('aria-label'))button.setAttribute('aria-label',button.textContent.trim());
   }
 };
 new MutationObserver(sync).observe(list,{childList:true});
 new MutationObserver(sync).observe(groups,{childList:true});
 sync();
})();
