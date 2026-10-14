/* v12: a private conversation must never expose group management. */
(()=>{
'use strict';
const get=id=>document.getElementById(id);
function hideGroupControlsForDm(){
 const dm=typeof activeDirectChat!=='undefined'&&activeDirectChat;
 const group=typeof activeChatGroup!=='undefined'&&activeChatGroup;
 if(!dm||group)return;
 const btn=get('lvkGroupSettingsButton');if(btn)btn.style.setProperty('display','none','important');
 const settings=get('lvkGroupSettings');if(settings)settings.hidden=true;
 const members=get('groupMembersPanel');if(members)members.style.display='none';
 const membersButton=get('groupMembersButton');if(membersButton)membersButton.style.display='none';
}
const chat=get('chatPage');if(chat)new MutationObserver(hideGroupControlsForDm).observe(chat,{attributes:true,attributeFilter:['class']});
get('dmChats')?.addEventListener('click',()=>{hideGroupControlsForDm();setTimeout(hideGroupControlsForDm,0);setTimeout(hideGroupControlsForDm,300)},true);
get('lvkGroupSettingsButton')?.addEventListener('click',e=>{if(typeof activeDirectChat!=='undefined'&&activeDirectChat){e.preventDefault();e.stopImmediatePropagation();hideGroupControlsForDm()}},true);
})();
