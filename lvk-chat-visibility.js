/* One source of truth for chat list / conversation visibility. */
(()=>{
 const page=document.getElementById('chatPage');
 if(!page)return;
 const close=()=>{
   if(typeof window.lvkCloseConversation==='function')window.lvkCloseConversation();
   else page.classList.remove('lvk-thread-open');
 };
 close();
 page.addEventListener('click',event=>{
   if(event.target.closest('.lvk-chat-back')){event.preventDefault();close();return;}
   const button=event.target.closest('#dmChats button[data-dm-id],#chatGroups button[data-group-id]');
   if(button){page.classList.add('lvk-thread-open');return;}
 });
 document.addEventListener('click',event=>{
   if(event.target.closest('[data-page],.nav button,.bottom-nav button,#chatTabGroups,#chatTabSupport')){
     if(!event.target.closest('#dmChats,#chatGroups'))close();
   }
 });
 for(const id of ['contactsList','nicknameResult','lvkNotificationsList']){
   document.getElementById(id)?.addEventListener('click',event=>{
     if(!event.target.closest('button'))return;
     queueMicrotask(()=>{
       if(page.classList.contains('active') && document.getElementById('chatTitle')?.textContent?.trim()!=='Выбери чат')
         page.classList.add('lvk-thread-open');
     });
   });
 }
})();
