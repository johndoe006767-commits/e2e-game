import {createServer} from 'node:http';
import {createReadStream, closeSync, mkdirSync, openSync} from 'node:fs';
import {access, realpath, stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const SCRIPT=fileURLToPath(import.meta.url);
const ROOT=path.resolve(path.dirname(SCRIPT),'..');
const DIST=path.join(ROOT,'dist');
const PORT=Number(process.env.E2E_GAME_PORT||5174);
const HOST='127.0.0.1';
const URL_BASE=`http://${HOST}:${PORT}`;
const HEALTH='/__face_value_local__/health';
const RUNTIME=path.join(ROOT,'.local-game');
const LOG=path.join(RUNTIME,`server-${PORT}.log`);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.wav':'audio/wav','.mp3':'audio/mpeg','.txt':'text/plain; charset=utf-8'};

async function inspectServer(){
  try{
    const response=await fetch(`${URL_BASE}${HEALTH}`,{signal:AbortSignal.timeout(800)});
    const info=await response.json().catch(()=>null);
    return info?.app==='e2e-game-local'&&info.root===ROOT&&Number.isInteger(info.pid)?info:{occupied:true};
  }catch(error){
    if(error.cause?.code==='ECONNREFUSED')return null;
    return {occupied:true};
  }
}

function busyError(){return new Error(`Port ${PORT} is already being used by another app. Close that app and try again. No existing process was stopped.`)}

async function openBrowser(){
  if(process.argv.includes('--no-open'))return;
  await new Promise((resolve,reject)=>{
    const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'/usr/bin/open':'xdg-open';
    const args=process.platform==='win32'?['url.dll,FileProtocolHandler',URL_BASE]:[URL_BASE];
    const child=spawn(command,args,{stdio:'ignore',windowsHide:true});
    child.once('error',reject);
    child.once('exit',code=>code===0?resolve():reject(new Error(`The game is running. Open ${URL_BASE} in your browser.`)));
  });
}

async function start(){
  await access(path.join(DIST,'index.html')).catch(()=>{throw new Error('The built game is missing. Keep the e2e-game folder beside the Start Game launcher. See README.md for rebuilding instructions.')});
  const existing=await inspectServer();
  if(existing?.occupied)throw busyError();
  if(!existing){
    mkdirSync(RUNTIME,{recursive:true});
    const log=openSync(LOG,'a');
    const child=spawn(process.execPath,[SCRIPT,'serve'],{cwd:ROOT,detached:true,stdio:['ignore',log,log],env:process.env});
    closeSync(log);
    let spawnError;
    child.on('error',error=>{spawnError=error});
    child.unref();
    let ready=false;
    for(let attempt=0;attempt<50;attempt++){
      if(spawnError)throw spawnError;
      await delay(120);
      const state=await inspectServer();
      if(state?.occupied)throw busyError();
      if(state){ready=true;break}
    }
    if(!ready)throw new Error(`The local server did not start. Details: ${LOG}`);
  }
  console.log(`E2E Game is ready: ${URL_BASE}`);
  console.log('The game runs on this computer.');
  await openBrowser();
}

async function stop(){
  const server=await inspectServer();
  if(!server){console.log('E2E Game is already stopped.');return}
  if(server.occupied)throw busyError();
  try{process.kill(server.pid,'SIGTERM')}catch(error){if(error.code!=='ESRCH')throw error}
  for(let attempt=0;attempt<30;attempt++){
    await delay(100);
    const state=await inspectServer();
    if(!state||state.pid!==server.pid){console.log('E2E Game stopped.');return}
  }
  throw new Error('The game server is still closing. Try the Stop Game launcher again.');
}

async function serve(){
  const root=await realpath(DIST);
  const server=createServer(async(req,res)=>{
    // Only the built game is served; source, drafts, and personal files stay outside it.
    const reply=(status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message)};
    if(![`${HOST}:${PORT}`,`localhost:${PORT}`].includes(req.headers.host))return reply(403,'Local access only.');
    if(req.method!=='GET'&&req.method!=='HEAD')return reply(405,'Method not allowed.');
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,URL_BASE).pathname)}catch{return reply(400,'Invalid path.')}
    if(pathname===HEALTH){
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      return res.end(req.method==='HEAD'?undefined:JSON.stringify({app:'e2e-game-local',root:ROOT,pid:process.pid}));
    }
    const requested=path.resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
    if(!requested.startsWith(`${root}${path.sep}`))return reply(404,'Not found.');
    try{
      const file=await realpath(requested);
      if(!file.startsWith(`${root}${path.sep}`))return reply(404,'Not found.');
      const metadata=await stat(file);
      if(!metadata.isFile())return reply(404,'Not found.');
      res.writeHead(200,{'Content-Type':TYPES[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':metadata.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')return res.end();
      const stream=createReadStream(file);
      stream.on('error',()=>res.destroy());
      res.on('close',()=>stream.destroy());
      stream.pipe(res);
    }catch{return reply(404,'Not found.')}
  });
  server.on('error',error=>{console.error(error.message);process.exitCode=1});
  server.listen(PORT,HOST,()=>console.log(`${new Date().toISOString()} E2E Game listening at ${URL_BASE}`));
  const shutdown=()=>{server.close(()=>process.exit(0));server.closeAllConnections()};
  process.once('SIGTERM',shutdown);
  process.once('SIGINT',shutdown);
}

try{
  if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw new Error('The local game port must be between 1024 and 65535.');
  const action=process.argv[2]||'start';
  if(action==='start')await start();
  else if(action==='stop')await stop();
  else if(action==='serve')await serve();
  else throw new Error('Use start or stop.');
}catch(error){console.error(error.message);process.exitCode=1}
