/* Plain announcement text only. URLs are links, never HTML or remote fetches. */
(function(root){
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function text(value){return String(value).split(/(https?:\/\/[^\s<>"']+)/gi).map((part,i)=>{
  if(i%2===0)return escape(part);
  const raw=part.replace(/[.,!?;:)}\]]+$/g,''),tail=part.slice(raw.length);let u;
  try{u=new URL(raw);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return escape(part);}catch{return escape(part);}
  return '<a href="'+escape(u.href)+'" target="_blank" rel="noopener noreferrer">'+escape(raw)+'</a>'+escape(tail);
 }).join('');}
 function links(value){return (Array.isArray(value)?value:[]).map(link=>{
  if(!link||typeof link.text!=='string'||typeof link.url!=='string'||!/^https?:\/\//i.test(link.url)||/[\s<>"\\]/u.test(link.url))return '';
  let u;try{u=new URL(link.url);if(!['https:','http:'].includes(u.protocol)||!u.hostname||u.username||u.password)return '';}catch{return '';}
  return '<p class="n-body n-link"><a href="'+escape(u.href)+'" target="_blank" rel="noopener noreferrer">'+escape(link.text)+'</a></p>';
 }).join('');}
 root.NoticeFormat=Object.freeze({text,links});
})(typeof window==='object'?window:globalThis);
