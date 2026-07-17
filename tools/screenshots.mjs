import puppeteer from 'puppeteer';
import http from 'http'; import fs from 'fs'; import path from 'path';
import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const FACES=[['Fraunces','fraunces',[300,400,500,600,700]],['Karla','karla',[400,500,600,700]],['IBM Plex Mono','ibm-plex-mono',[400,500,600]]];
let css=''; for(const [f,p,ws] of FACES) for(const w of ws)
  css+=`@font-face{font-family:"${f}";font-style:normal;font-weight:${w};font-display:block;src:url(/f/${p}-latin-${w}-normal.woff2) format("woff2");}\n`;
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<link rel="preconnect"[\s\S]*?rel="stylesheet">/, `<style>${css}</style>`);
const T={'.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{
  if(q.url.startsWith('/f/')){const f=q.url.slice(3),pkg=f.split('-latin-')[0];
    const fp=path.join(HERE,'node_modules/@fontsource',pkg,'files',f);
    if(fs.existsSync(fp)){r.writeHead(200,{'Content-Type':'font/woff2'});return r.end(fs.readFileSync(fp));} r.writeHead(404);return r.end();}
  const f=path.join(ROOT, q.url.split('?')[0]), e=path.extname(f);
  if(T[e]&&fs.existsSync(f)){r.writeHead(200,{'Content-Type':T[e]});return r.end(fs.readFileSync(f));}
  r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(html);}).listen(8600);
const b=await puppeteer.launch({headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],
  ...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const p=await b.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.setViewport({width:390,height:844,deviceScaleFactor:2});
await p.goto('http://localhost:8600',{waitUntil:'networkidle0'});
await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,700));

// contrôle avant capture : plus aucun texte parasite
const clean=await p.evaluate(()=>{
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); const st=[]; let n;
  while(n=w.nextNode()){const t=n.textContent.trim(); if(!t)continue;
    if(n.parentElement.closest('nav,.bar,main,.sheet,.toast,script,style'))continue; st.push(t.slice(0,30));}
  return st;
});
console.log('texte parasite avant capture :', clean.length?clean:'aucun ✓');

await p.evaluate(()=>{
  let sd=2026; const rnd=()=>(sd=(sd*1103515245+12345)%2147483648)/2147483648;
  const G=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
  const sports=['Course','Natation','Muscu salle','Randonnée','Escalade'];
  for(let i=104;i>=0;i--){ const s=addD(today(),-i);
    if(rnd()<0.05){DB.days[s]=Object.assign(blank(),{na:true});continue;}
    const d=Object.assign(blank(),{sleep:+(7.4+G()*0.8).toFixed(2),energy:Math.min(5,Math.max(1,Math.round(3.4+G()*0.9))),
      mood:Math.min(5,Math.max(1,Math.round(3.5+G()*0.9))),hunger:Math.min(5,Math.max(1,Math.round(3+G()*0.8))),
      steps:Math.round(9200+G()*2600),km:+(6.4+G()*2).toFixed(1),water:+(2.4+G()*0.5).toFixed(2),
      protein:rnd()<.78?1:0,ultra:rnd()<.28?1:0,snacking:rnd()<.33?1:0,weight:+(59.4+G()*0.5-i*0.004).toFixed(1),
      meals:{breakfast:Math.min(2,Math.round(1.4+G()*0.6)),lunch:Math.min(2,Math.round(1.5+G()*0.5)),
             snack:rnd()<.5?Math.round(rnd()*2):null,dinner:Math.min(2,Math.round(1.5+G()*0.5))},
      social:{Instagram:Math.round(Math.max(0,42+G()*25)),YouTube:Math.round(Math.max(0,28+G()*20)),Substack:Math.round(Math.max(0,14+G()*10))}});
    if(rnd()<0.62){const t=sports[Math.floor(rnd()*sports.length)],u=unitOf(t);
      d.sessions=[{type:t,min:Math.round(38+G()*14),rpe:Math.min(5,Math.max(1,Math.round(3.2+G()))),
        dist:u?(u==='m'?+(1.4+G()*0.3).toFixed(2):+(7.6+G()*2).toFixed(1)):null}];}
    DB.days[s]=d;}
  [104,76,49,21].forEach(o=>{const s=addD(today(),-o);DB.days[s]=DB.days[s]||blank();DB.days[s].periodStart=true;
    const e=addD(s,3);DB.days[e]=DB.days[e]||blank();DB.days[e].periodEnd=true;});
  DB.weeks[isoWeek(today())]={waist:69.5,hips:94,thigh:55.5,arm:27.5,win:'Quatre séances malgré une semaine chargée.',adjust:'Boire plus tôt'};
  S().showBody=true; S().lastExport=addD(today(),-4); S().goalLabel='Semi-marathon'; S().goalDate=addD(today(),87);
  save();});
for(const [v,n] of [['day','01-aujourdhui'],['stats','02-bilans'],['week','03-semaine'],['guide','04-repertoire']]){
  await p.evaluate(x=>go(x),v); await new Promise(r=>setTimeout(r,850));
  await p.screenshot({path:path.join(ROOT,`${n}.png`), clip:{x:0,y:0,width:390,height:845}});
  console.log('  '+n+'.png');
}
console.log(errs.length?'ERREURS: '+errs.join(' | '):'✓ aucune erreur JS');
await b.close(); srv.close();
