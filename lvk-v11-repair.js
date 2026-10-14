/* v11: recover group admin controls after asynchronous chat loading */
(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const button=byId('lvkGroupSettingsButton');
if(!button)return;
let requestId=0;
async function sync(){
 const seq=++requestId;
 const group=typeof activeChatGroup!=='undefined'?activeChatGroup:null;
 const page=byId('chatPage');
 if(!group||(typeof activeDirectChat!=='undefined'&&activeDirectChat)||!page?.classList.contains('lvk-thread-open')||!currentUser||!sb){button.style.display='none';return;}
 try{
  const {data,error}=await sb.rpc('lvk_can_manage_group',{p_group:group.id});
  if(error)throw error;
  if(seq!==requestId||activeChatGroup?.id!==group.id||!page.classList.contains('lvk-thread-open'))return;
  button.style.display=data?'inline-flex':'none';
  button.title=data?'Изменить название, аватар и участников':'Нет прав';
 }catch(e){if(seq!==requestId)return;button.style.display='none';console.warn('LVK: group admin permission check failed',e);}
}
// Use actual conversation selections, rather than relying on a wrapper around a global function.
byId('chatGroups')?.addEventListener('click',()=>{setTimeout(sync,50);setTimeout(sync,500);},true);
byId('dmChats')?.addEventListener('click',()=>{requestId++;button.style.display='none';},true);
new MutationObserver(()=>{if(!byId('chatPage')?.classList.contains('lvk-thread-open')){requestId++;button.style.display='none';}}).observe(byId('chatPage'),{attributes:true,attributeFilter:['class']});
// Close other menus when opening one; close on outside click.
document.addEventListener('click',e=>{
 const menu=e.target.closest('details.lvk-contact-menu');
 document.querySelectorAll('details.lvk-contact-menu[open]').forEach(d=>{if(d!==menu)d.open=false;});
});
})();
