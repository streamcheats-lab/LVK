/* Visibility is controlled by explicit conversation selection, not by rendered messages. */
(()=>{
 const page=document.getElementById('chatPage');
 if(!page)return;
 const close=()=>page.classList.remove('lvk-thread-open');
 close();
 const open=()=>page.classList.add('lvk-thread-open');
 const chatLists=['dmChats','chatGroups'];
 for(const id of chatLists){
   document.getElementById(id)?.addEventListener('click',event=>{
     if(event.target.closest('button[data-group-id],button'))open();
   });
 }
 page.querySelector('.lvk-chat-back')?.addEventListener('click',close);
 // Rebind if the back control is inserted after this script by a later module.
 page.addEventListener('click',event=>{
   if(event.target.closest('.lvk-chat-back'))close();
 });
 // Switching tabs or leaving the chat screen must reset the conversation view.
 document.addEventListener('click',event=>{
   const tab=event.target.closest('[data-page],#chatTabGroups,#chatTabSupport');
   if(tab)close();
 });
 // External entry points (contacts/search/notifications) open the thread explicitly.
 for(const id of ['contactsList','nicknameResult','lvkNotificationsList']){
   document.getElementById(id)?.addEventListener('click',event=>{
     if(event.target.closest('button')){
       // Let existing click handler navigate and load the conversation first.
       queueMicrotask(()=>{
         if(page.classList.contains('active') && document.getElementById('chatTitle')?.textContent?.trim()!=='Выбери чат')open();
       });
     }
   });
 }
})();
