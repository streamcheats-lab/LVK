/* LVK visual enhancements. Original Supabase actions remain in index.html. */
(()=>{
 const $=id=>document.getElementById(id);
 const createModal=$('lvkCreateModal'), inviteModal=$('lvkInviteModal');
 function openModal(modal){modal.hidden=false;document.body.classList.add('lvk-modal-open');modal.querySelector('input:not([readonly])')?.focus();}
 function closeModal(modal){modal.hidden=true;if(createModal.hidden&&inviteModal.hidden)document.body.classList.remove('lvk-modal-open');}
 document.querySelectorAll('[data-close-lvk]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('.lvk-overlay'))));
 [createModal,inviteModal].forEach(modal=>modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal)}));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal(createModal);closeModal(inviteModal)}});
 // Move the actual support panel, keeping its original IDs and event listeners intact.
 const support=$('chatSupportSection');
 const settings=$('settings');
 const moreTitle=document.createElement('div');moreTitle.className='lvk-more-hero';
 moreTitle.innerHTML='<div class="lvk-more-avatar">L</div><div><strong>LVK</strong><span>Профиль и настройки приложения</span></div><span class="lvk-more-pro">✦ PRO</span>';
 settings.insertBefore(moreTitle,settings.firstChild);
 const supportCard=document.createElement('div');supportCard.className='lvk-more-support';
 const supportHeader=document.createElement('button');supportHeader.type='button';supportHeader.className='lvk-more-link';
 supportHeader.innerHTML='<span class="lvk-more-icon">☏</span><span><strong>Поддержка LVK</strong><small>Написать администрации · Бесплатно</small></span><span class="lvk-more-chevron">⌄</span>';
 const supportContent=document.createElement('div');supportContent.className='lvk-more-support-content';supportContent.hidden=true;
 support.style.display='block';supportContent.appendChild(support);
 supportHeader.setAttribute('aria-expanded','false');supportHeader.setAttribute('aria-controls','lvkMoreSupportContent');supportContent.id='lvkMoreSupportContent';
 supportHeader.addEventListener('click',()=>{const opening=supportContent.hidden;supportContent.hidden=!opening;supportHeader.classList.toggle('expanded',opening);supportHeader.setAttribute('aria-expanded',String(opening));if(opening){support.style.display='block';loadSupportMessages().catch(e=>{$('supportInfo').textContent=e.message});}});
 supportCard.append(supportHeader,supportContent);moreTitle.after(supportCard);
 $('chatTabSupport').style.display='none';$('chatTabGroups').textContent='Чаты и группы';
 $('chatPage').classList.add('lvk-premium-chat');
 // Telegram-style quick search filters already loaded groups and personal dialogs.
 const chatListCard=$('dmChats')?.closest('.card');
 if(chatListCard){
  const search=document.createElement('input');search.type='search';search.className='lvk-tg-search';
  search.placeholder='⌕  Поиск групп и чатов...';search.setAttribute('aria-label','Поиск групп и чатов');
  chatListCard.insertBefore(search,chatListCard.firstChild);
  const apply=()=>{const q=search.value.trim().toLocaleLowerCase('ru');
   for(const id of ['dmChats','chatGroups']) for(const el of $(id)?.querySelectorAll('button')||[])
    el.hidden=!!q&&!el.textContent.toLocaleLowerCase('ru').includes(q);
  };
  search.addEventListener('input',apply);
  new MutationObserver(apply).observe($('dmChats'),{childList:true});
  new MutationObserver(apply).observe($('chatGroups'),{childList:true});
 }

 const tools=$('newGroupName').closest('.chat-tools');
 tools.classList.add('lvk-create-trigger');
 $('newGroupName').style.display='none';
 const oldButton=$('createGroupButton');oldButton.style.display='none';
 const newButton=document.createElement('button');newButton.type='button';newButton.className='primary lvk-new-group';newButton.textContent='＋ Создать группу';tools.appendChild(newButton);
 newButton.addEventListener('click',()=>{if(!currentUser||!proActive){chatInfo('Для создания группы нужен LVK PRO');return} $('lvkModalGroupName').value='';$('lvkCreateError').textContent='';openModal(createModal)});
 $('lvkConfirmGroup').addEventListener('click',async()=>{
  const name=$('lvkModalGroupName').value.trim();if(name.length<3){$('lvkCreateError').textContent='Введите минимум 3 символа';return}
  $('newGroupName').value=name;const button=$('lvkConfirmGroup');button.disabled=true;
  try{const success=await createChatGroup();if(success)closeModal(createModal);else $('lvkCreateError').textContent=$('chatInfo').textContent||'Не удалось создать группу'}
  finally{button.disabled=false}
 });
 $('lvkModalGroupName').addEventListener('keydown',e=>{if(e.key==='Enter')$('lvkConfirmGroup').click()});
 window.lvkOpenInviteModal=()=>{
  if(!activeChatGroup?.invite_code||activeChatGroup.is_system)return;
  const url=new URL(location.href);url.searchParams.set('invite',activeChatGroup.invite_code);
  $('lvkInviteLink').value=url.toString();$('lvkInviteFeedback').textContent='';openModal(inviteModal);
 };
 $('lvkModalCopy').addEventListener('click',async()=>{
  const link=$('lvkInviteLink').value;
  try{await navigator.clipboard.writeText(link);$('lvkInviteFeedback').textContent='✓ Ссылка скопирована'}
  catch{ $('lvkInviteLink').focus();$('lvkInviteLink').select();$('lvkInviteFeedback').textContent='Выделено — нажми Ctrl+C, чтобы скопировать';}
 });
 $('lvkModalShare').addEventListener('click',async()=>{
  const url=$('lvkInviteLink').value;
  if(navigator.share){try{await navigator.share({title:'Приглашение в группу LVK',url})}catch(e){if(e.name!=='AbortError')$('lvkInviteFeedback').textContent='Не удалось поделиться'}}
  else {$('lvkModalCopy').click();$('lvkInviteFeedback').textContent='Ссылка готова для отправки';}
 });
 // Presence is session-based. Only users connected to this Supabase presence channel appear online.
 let presenceChannel=null,presenceUser=null;const onlineIds=new Set();
 const groupMembers=new Map();let membersLoadedFor=null;
 async function loadGroupPresenceMembers(){
  if(!sb||!currentUser?.id)return;
  const {data,error}=await sb.rpc('lvk_my_group_presence_members');
  if(error){console.warn('LVK group online RPC:',error.message);return}
  groupMembers.clear();
  for(const row of data||[]){if(!groupMembers.has(row.group_id))groupMembers.set(row.group_id,new Set());groupMembers.get(row.group_id).add(row.user_id)}
  membersLoadedFor=currentUser.id;updatePresenceUI();
 }
 window.lvkRefreshGroupPresence=()=>loadGroupPresenceMembers().catch(console.warn);
 function updateGroupPresence(){
  document.querySelectorAll('#chatGroups [data-group-id]').forEach(button=>{
   const ids=groupMembers.get(button.dataset.groupId);
   let badge=button.querySelector('.lvk-group-online');
   if(!badge){badge=document.createElement('small');badge.className='lvk-group-online';button.append(badge)}
   badge.textContent=ids?'✓ Онлайн: '+[...ids].filter(id=>onlineIds.has(id)).length:'Онлайн: —';
  });
  if(typeof activeChatGroup!=='undefined'&&activeChatGroup?.id){
   const ids=groupMembers.get(activeChatGroup.id);
   let badge=$('lvkGroupPresence');if(!badge){badge=document.createElement('small');badge.id='lvkGroupPresence';$('chatTitle').after(badge)}
   badge.textContent=ids?'✓ Онлайн: '+[...ids].filter(id=>onlineIds.has(id)).length:'Онлайн: —';badge.hidden=false;
  }else{const badge=$('lvkGroupPresence');if(badge)badge.hidden=true}
 }
 new MutationObserver(()=>updateGroupPresence()).observe($('chatGroups'),{childList:true});
 
 window.lvkSetChatPresence=peer=>{
  let badge=$('lvkChatPresence');if(!badge){badge=document.createElement('div');badge.id='lvkChatPresence';$('chatTitle').after(badge)}
  badge.dataset.peer=peer||'';badge.hidden=!peer;updatePresenceUI();
 };
 function updatePresenceUI(){
  document.querySelectorAll('#dmChats [data-peer-id]').forEach(button=>{
   let status=button.querySelector('.lvk-user-status');if(!status){status=document.createElement('span');status.className='lvk-user-status';button.append(status)}
   const online=onlineIds.has(button.dataset.peerId);status.textContent=online?'✓ В сети':'✕ Не в сети';status.classList.toggle('online',online);
  });
  const badge=$('lvkChatPresence');if(badge&&!badge.hidden){const online=onlineIds.has(badge.dataset.peer);badge.textContent=online?'✓ В сети':'✕ Не в сети';badge.classList.toggle('online',online)}
  updateGroupPresence();
 }
 const listObserver=new MutationObserver(()=>updatePresenceUI());listObserver.observe($('dmChats'),{childList:true});
 async function ensurePresence(){
  if(!sb||!currentUser?.id){if(presenceChannel){await sb?.removeChannel(presenceChannel);presenceChannel=null;presenceUser=null}onlineIds.clear();groupMembers.clear();membersLoadedFor=null;updatePresenceUI();return}
  if(presenceChannel&&presenceUser===currentUser.id){if(membersLoadedFor!==currentUser.id)await loadGroupPresenceMembers();return;}
  if(presenceChannel)await sb.removeChannel(presenceChannel);
  presenceUser=currentUser.id;await loadGroupPresenceMembers();
  presenceChannel=sb.channel('lvk-presence-v1',{config:{presence:{key:currentUser.id}}});
  presenceChannel.on('presence',{event:'sync'},()=>{
   onlineIds.clear();const state=presenceChannel.presenceState();Object.keys(state).forEach(id=>{if(state[id]?.length)onlineIds.add(id)});updatePresenceUI();
  }).subscribe(async status=>{if(status==='SUBSCRIBED'){try{await presenceChannel.track({connected_at:new Date().toISOString()})}catch(e){console.warn('Presence tracking unavailable',e)}}});
 }
 setInterval(()=>ensurePresence().catch(console.warn),6000);setInterval(()=>{if(currentUser?.id)loadGroupPresenceMembers().catch(console.warn)},60000);ensurePresence().catch(console.warn);
})();
