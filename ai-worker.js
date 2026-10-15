/** Cloudflare Worker (optional): set secret OPENAI_API_KEY using Cloudflare dashboard.
 * Set env ALLOWED_ORIGIN to your exact website origin, e.g. https://username.github.io.
 * WARNING: Origin restrictions alone do not authenticate callers or prevent abuse.
 * Add Cloudflare Access / rate limiting before enabling for a public or shared site.
 */
export default {
 async fetch(request, env) {
  const origin=request.headers.get('Origin')||'';
  const allowed=env.ALLOWED_ORIGIN||'';
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowed,'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
  if(!allowed||origin!==allowed)return new Response(JSON.stringify({error:'Origin not allowed'}),{status:403,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers});
  const raw=await request.text();if(raw.length>30000)return new Response(JSON.stringify({error:'Too long'}),{status:413,headers});
  let data;try{data=JSON.parse(raw)}catch{return new Response(JSON.stringify({error:'Bad JSON'}),{status:400,headers})}
  if(!data||typeof data.text!=='string'||data.text.length>20000)return new Response(JSON.stringify({error:'Bad input'}),{status:400,headers});
  if(!env.OPENAI_API_KEY)return new Response(JSON.stringify({error:'Missing server API key'}),{status:500,headers});
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.OPENAI_API_KEY},body:JSON.stringify({model:env.OPENAI_MODEL||'gpt-4.1-mini',instructions:'你是中文个人任务总结助理。严格仅依据提供的数据，整理成精炼、可操作的周期总结，分工作与生活、完成情况、待办风险和下一步。不得虚构未记录事实。对敏感信息不要进行推断。',input:data.text,max_output_tokens:1200})});
  if(!response.ok)return new Response(JSON.stringify({error:'AI service unavailable'}),{status:502,headers});
  const out=await response.json();const summary=(out.output||[]).flatMap(x=>x.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n');
  return new Response(JSON.stringify({summary}),{status:200,headers});
 }
};
