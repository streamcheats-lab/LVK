/* Chat navigation: close state is authoritative, even after asynchronous refreshes. */
(()=>{
 const page=document.getElementById('chatPage');if(!page)return;
 const close=()=>{if(typeof window.lvkCloseConversation==='function')window.lvkCloseConversation();else page.classList.remove('lvk-thread-open');};
 close();
 // Capture phase: close BEFORE any other handler changes tabs or rerenders.
 document.addEventListener('click',e=>{
   if(e.target.closest('.lvk-chat-back')){e.preventDefault();e.stopPropagation();close();return;}
   if(e.target.closest('[data-page],.nav button,.bottom-nav button,#chatTabGroups,#chatTabSupport')){
     if(!e.target.closest('#dmChats,#chatGroups'))close();
   }
 },true);
 // Only a real click on a conversation may show the thread panel.
 page.addEventListener('click',e=>{
   if(e.target.closest('#dmChats button[data-dm-id],#chatGroups button[data-group-id]')){
     page.classList.add('lvk-thread-open');
   }
 });
})();
