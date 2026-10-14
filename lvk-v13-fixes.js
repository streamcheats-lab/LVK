/* v13: anchor action menus to the three-dot button within the viewport. */
(()=>{'use strict';
const root=document.getElementById('contactsPage');if(!root)return;
function position(menu){if(!menu?.open)return;
 const trigger=menu.querySelector('summary'),panel=menu.querySelector('.contact-actions');if(!trigger||!panel)return;
 const r=trigger.getBoundingClientRect(),width=Math.min(230,innerWidth-16);
 const left=Math.max(8,Math.min(innerWidth-width-8,r.right-width));
 const roomBelow=innerHeight-r.bottom-12,roomAbove=r.top-12;
 const below=roomBelow>=Math.min(250,roomAbove)||roomBelow>roomAbove;
 const height=Math.min(panel.scrollHeight||250,320,Math.max(100,below?roomBelow:roomAbove));
 const top=below?Math.min(innerHeight-height-8,r.bottom+6):Math.max(8,r.top-height-6);
 menu.style.setProperty('--lvk-menu-left',left+'px');menu.style.setProperty('--lvk-menu-top',top+'px');
}
root.addEventListener('toggle',e=>{const m=e.target;if(!m.matches?.('details.lvk-contact-menu')||!m.open)return;
 root.querySelectorAll('details.lvk-contact-menu[open]').forEach(x=>{if(x!==m)x.open=false});
 requestAnimationFrame(()=>position(m));},true);
root.addEventListener('click',e=>{const summary=e.target.closest('details.lvk-contact-menu summary');if(summary){requestAnimationFrame(()=>position(summary.parentElement))}},true);
function closeMenus(){root.querySelectorAll('details.lvk-contact-menu[open]').forEach(m=>m.open=false)}
window.addEventListener('resize',closeMenus);window.addEventListener('scroll',closeMenus,true);
root.addEventListener('click',e=>{if(e.target.closest('details.lvk-contact-menu .contact-actions button'))closeMenus()});
})();
