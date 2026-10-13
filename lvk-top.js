/* LVK public leaderboard; requires lvk_top_leaders() SQL function. */
(()=>{
 const button=document.getElementById('lvkTopRefresh');
 const body=document.getElementById('lvkTopBody');
 const status=document.getElementById('lvkTopStatus');
 if(!button||!body||!status)return;
 const format=n=>Number(n||0).toLocaleString('uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₴';
 const initials=s=>String(s||'?').trim().slice(0,2).toUpperCase();
 let busy=false;
 async function load(){
  if(busy)return;busy=true;button.disabled=true;status.textContent='Загружаем рейтинг…';
  try{
   if(!window.supabase||!window.lvkTopClient){throw new Error('Не удалось подключиться к Supabase');}
   const {data,error}=await window.lvkTopClient.rpc('lvk_top_leaders');
   if(error)throw error;
   body.replaceChildren();
   const rows=Array.isArray(data)?data:[];
   if(!rows.length){status.textContent='Пока нет облачных сделок для рейтинга.';return;}
   rows.forEach((item,i)=>{
    const tr=document.createElement('tr');
    const place=document.createElement('td');place.textContent=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
    const user=document.createElement('td');const wrap=document.createElement('div');wrap.className='lvk-top-user';
    const avatar=document.createElement('span');avatar.className='lvk-top-avatar';avatar.textContent=initials(item.nickname);
    const name=document.createElement('span');name.className='lvk-top-name';name.textContent=item.nickname||'Участник LVK';
    wrap.append(avatar,name);user.append(wrap);
    const profit=document.createElement('td');profit.className='lvk-top-profit';profit.textContent=format(item.profit_uah);
    tr.append(place,user,profit);body.append(tr);
   });
   status.textContent='Обновлено: '+new Date().toLocaleString('ru-RU')+' · Участников: '+rows.length;
  }catch(e){status.textContent='Не удалось загрузить топ: '+(e.message||String(e))+'. Проверь SQL-файл LVK_TOP_SETUP.sql в Supabase.';}
  finally{busy=false;button.disabled=false;}
 }
 button.addEventListener('click',load);
 document.querySelectorAll('[data-page="topPage"]').forEach(b=>b.addEventListener('click',load));
 // The existing site initializes its Supabase client as a top-level lexical variable.
 // Expose it from the same inline script before this script is loaded.
})();
