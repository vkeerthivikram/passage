/* No remote scripts, cookies, or page contents are sent without a Save action. */
const api = globalThis.browser ?? chrome;
const el = id => document.getElementById(id);
let sourceUrl = '';
let savedSource = null;
const operationId = crypto.randomUUID();
function serverUrl() {
  const url = new URL(el('server').value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw new Error('Use HTTPS, or localhost for development.');
  if (url.username || url.password || url.search || url.hash) throw new Error('Enter a server URL without credentials or query parameters.');
  return url.origin;
}
async function request(path, body) {
  const response = await fetch(serverUrl()+ '/api/v1' + path, {method:body ? 'POST':'GET', headers:{'Content-Type':'application/json', Authorization:'Bearer '+el('token').value}, ...(body ? {body:JSON.stringify(body)} : {})});
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message ?? 'Request failed ('+response.status+').');
  return value;
}
async function connect() {
  const origin = serverUrl();
  const granted = await api.permissions.request({origins:[origin+'/*']});
  if (!granted) throw new Error('Server access was not granted.');
  await request('/me');
  await api.storage.local.set({server:origin,token:el('token').value});
  el('status').textContent='Connected. Token stays in this browser profile.';
}
el('connect').addEventListener('click',()=>connect().catch(error=>el('status').textContent=error.message));
el('capture').addEventListener('submit',async event=>{
  event.preventDefault();el('save').disabled=true;el('status').textContent='Saving…';
  try {
    if (!savedSource) {
      const sources = await request('/sources?limit=100');
      savedSource = sources.items.find(source=>source.sourceUrl===sourceUrl && source.title===el('title').value);
      if (!savedSource) {
        const created=await request('/sources',{title:el('title').value,author:el('author').value,category:'articles',sourceUrl,tags:[]});
        savedSource=created.item ?? created.source ?? created;
      }
    }
    const result=await request('/sync/push',{operations:[{opId:operationId,entity:'highlight',action:'create',id:operationId,payload:{sourceId:savedSource.id,text:el('text').value,note:el('note').value,tags:el('tags').value.split(',').map(x=>x.trim()).filter(Boolean)}}]});
    const outcomes=result.results ?? result;
    if (!Array.isArray(outcomes) || !['applied','duplicate'].includes(outcomes[0]?.status)) throw new Error(outcomes[0]?.message ?? 'Server did not confirm save. Retry safely.');
    el('status').textContent='Saved to your library.';
  }catch(error){el('status').textContent=error.message;el('save').disabled=false;}
});
(async()=>{
  const settings=await api.storage.local.get(['server','token']);el('server').value=settings.server??'';el('token').value=settings.token??'';
  const [tab]=await api.tabs.query({active:true,currentWindow:true});
  if (!tab?.id || !/^https?:/.test(tab.url??'')) {el('status').textContent='Open a webpage and select a passage first.';return;}
  const [{result}]=await api.scripting.executeScript({target:{tabId:tab.id},func:()=>({text:window.getSelection()?.toString()??'',title:document.title,url:location.href,author:document.querySelector('meta[name="author"]')?.content??''})});
  el('text').value=result.text;el('title').value=result.title;el('author').value=result.author;sourceUrl=result.url;
})().catch(error=>el('status').textContent=error.message);
