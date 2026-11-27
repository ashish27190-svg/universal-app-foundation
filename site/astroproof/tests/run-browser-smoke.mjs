// Real Chromium smoke test on an isolated loopback origin and disposable profile.
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const run=promisify(execFile),root=fileURLToPath(new URL('..',import.meta.url));
const chrome=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>p&&existsSync(p));
if(!chrome)throw Error('Chromium/Chrome missing; set CHROME_PATH. Browser QA cannot be skipped.');
const profile=await mkdtemp(join(tmpdir(),'astroproof-browser-qa-'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'');
    const target=resolve(root,name||'index.html');
    if(!target.startsWith(root.endsWith(sep)?root:root+sep))throw Error('outside root');
    const bytes=await readFile(target);
    res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found')}
});
try{
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
  const url='http://127.0.0.1:'+server.address().port+'/tests/browser-smoke.html';
  for(const [width,height] of [[390,844],[1440,900]]){
    const {stdout}=await run(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--user-data-dir='+profile+'-'+width,'--window-size='+width+','+height,'--virtual-time-budget=90000','--dump-dom',url],{timeout:180000,maxBuffer:4*1024*1024});
    const rendered=stdout.match(/<pre id="result"[^>]*>[\s\S]*?<\/pre>/);
    if(!rendered||!rendered[0].includes('data-qa-state="pass"'))throw Error('Rendered browser QA failed at '+width+': '+(rendered?.[0]||stdout.slice(0,2000)));
    console.log('PASS real Chromium '+width+'x'+height+': '+rendered[0].replace(/<[^>]+>/g,''));
  }
}finally{
  server.close();await rm(profile,{recursive:true,force:true});
  for(const width of [390,1440])await rm(profile+'-'+width,{recursive:true,force:true});
}
