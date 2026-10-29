import {readdir,readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
const target='public/licenses';await mkdir(target,{recursive:true});const seen=new Set(),records=[];
async function collect(dir){let pkg;try{pkg=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));}catch{return;}
  if(!pkg.name||seen.has(pkg.name+'@'+pkg.version))return;seen.add(pkg.name+'@'+pkg.version);
  const names=(await readdir(dir)).filter(n=>/^(license|licence|copying|notice)(\.|$)/i.test(n)),id=(pkg.name+'-'+pkg.version).replace(/[^a-zA-Z0-9._-]/g,'_');
  const copied=[];for(const name of names){try{const dest=id+'-'+name;await copyFile(path.join(dir,name),path.join(target,dest));copied.push(dest);}catch{}}
  records.push({name:pkg.name,version:pkg.version,license:pkg.license||'See package',files:copied,repository:pkg.repository});
}
for(const item of await readdir('node_modules/.pnpm')){const directory=path.join('node_modules/.pnpm',item,'node_modules');let names;try{names=await readdir(directory);}catch{continue;}
 for(const name of names.filter(n=>!n.startsWith('.'))){if(name.startsWith('@')){for(const n of await readdir(path.join(directory,name)))await collect(path.join(directory,name,n));}else await collect(path.join(directory,name));}}
records.sort((a,b)=>a.name.localeCompare(b.name));await writeFile(path.join(target,'index.json'),JSON.stringify(records,null,2));
await copyFile('LICENSE',path.join(target,'MotionScope-MIT.txt'));await copyFile('THIRD_PARTY_NOTICES.md','public/THIRD_PARTY_NOTICES.md');process.stdout.write(`Collected ${records.length} package license records.\n`);
