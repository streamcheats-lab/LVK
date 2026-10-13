/* LVK avatars: independent Supabase table and storage bucket; does not modify deals or chat handlers. */
(()=>{
 const avatarCache=new Map(); const pending=new Set();
 const preview=document.getElementById('lvkMyAvatarPreview');
 const input=document.getElementById('lvkAvatarFile');
 const status=document.getElementById('lvkAvatarInfo');
 const remove=document.getElementById('lvkAvatarRemove');
 const bucket='lvk-avatars';
 function imageFor(path){if(!path||!sb)return null;return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl+'?v='+encodeURIComponent(path)}
 function paint(el,url){if(!el)return;const old=el.querySelector('img');if(old)old.remove();if(url){const img=document.createElement('img');img.alt='Аватар';img.loading='lazy';img.referrerPolicy='no-referrer';img.src=url;img.onerror=()=>img.remove();el.prepend(img)}}
 function paintAll(uid){const path=avatarCache.get(uid);const url=imageFor(path);document.querySelectorAll('[data-lvk-avatar-id]').forEach(el=>{if(el.dataset.lvkAvatarId===uid)paint(el,url)});if(currentUser?.id===uid)paint(preview,url)}
 async function load(uid){if(!sb||!uid||pending.has(uid)||avatarCache.has(uid))return;pending.add(uid);try{const {data,error}=await sb.from('lvk_avatars').select('avatar_path').eq('user_id',uid).maybeSingle();if(error){if(!window.lvkAvatarSchemaWarned){console.warn('LVK avatars: apply lvk-avatars-setup.sql',error.message);window.lvkAvatarSchemaWarned=true}return}avatarCache.set(uid,data?.avatar_path||null);paintAll(uid)}finally{pending.delete(uid)}}
 window.lvkAttachAvatar=(el,uid)=>{if(!uid||!el)return;el.dataset.lvkAvatarId=uid; if(avatarCache.has(uid))paint(el,imageFor(avatarCache.get(uid)));else load(uid).catch(console.warn)};
 async function refreshSelf(){if(!currentUser){paint(preview,null);return}await load(currentUser.id);paintAll(currentUser.id)}
 async function save(file){if(!currentUser){status.textContent='Сначала войди в аккаунт.';return}if(!sb){status.textContent='Нет соединения с Supabase.';return}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){status.textContent='Нужен JPG, PNG или WebP.';return}
 if(file.size>2*1024*1024){status.textContent='Размер фото должен быть до 2 МБ.';return}
 input.disabled=true;status.textContent='Загружаем фото…';
 try{const uid=currentUser.id;const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];const path=uid+'/'+crypto.randomUUID()+'.'+ext;
 const upload=await sb.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});if(upload.error)throw upload.error;
 const old=avatarCache.get(uid);const {error}=await sb.from('lvk_avatars').upsert({user_id:uid,avatar_path:path},{onConflict:'user_id'});
 if(error){await sb.storage.from(bucket).remove([path]);throw error}
 avatarCache.set(uid,path);paintAll(uid);status.textContent='Аватар сохранён. Другие пользователи увидят его при обновлении чата.';
 if(old&&old!==path)await sb.storage.from(bucket).remove([old]);
 }catch(e){status.textContent='Ошибка загрузки: '+e.message+' (проверь SQL-настройку аватаров)'}finally{input.disabled=false;input.value=''} }
 input?.addEventListener('change',()=>{const file=input.files?.[0];if(file)save(file)});
 remove?.addEventListener('click',async()=>{if(!currentUser)return status.textContent='Сначала войди в аккаунт.';remove.disabled=true;try{const uid=currentUser.id;const old=avatarCache.get(uid);const {error}=await sb.from('lvk_avatars').delete().eq('user_id',uid);if(error)throw error;avatarCache.set(uid,null);paintAll(uid);if(old)await sb.storage.from(bucket).remove([old]);status.textContent='Аватар удалён.'}catch(e){status.textContent='Ошибка: '+e.message}finally{remove.disabled=false}});
 if(sb)sb.auth.onAuthStateChange(()=>setTimeout(refreshSelf,150));setTimeout(refreshSelf,500);
 // Update cached avatars when another user changes a picture in the same open session.
 if(sb)sb.channel('lvk-avatar-updates').on('postgres_changes',{event:'*',schema:'public',table:'lvk_avatars'},payload=>{const uid=payload.new?.user_id||payload.old?.user_id;if(uid){avatarCache.set(uid,payload.new?.avatar_path||null);paintAll(uid)}}).subscribe();
})();
