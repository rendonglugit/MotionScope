import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('public/samples',{recursive:true});
await mkdir('public/licenses',{recursive:true});
const sources=[
 ['rose.svga','https://raw.githubusercontent.com/svga/SVGAPlayer-Web/a218cbeca656a748d0384a06b07844e91e46b5fa/tests/samples/rose.svga'],
 ['yyeva-gift.mp4','https://raw.githubusercontent.com/yylive/YYEVA-Web/575cf8fc6e0b80b113a57fbd021b44bcd8357cd9/projects/es5-demo/public/demo3/dynamic_264_mid.mp4'],
 ['logo.pag','https://media.githubusercontent.com/media/Tencent/libpag/8a63822b0f64f899f07e36ca9f6a183adb7e5525/assets/PAG_LOGO.pag'],
];
const manifest=[];
for(const [name,url] of sources){const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);const data=Buffer.from(await response.arrayBuffer());if(data.length<200)throw new Error(`${name}: source may be Git LFS pointer`);await writeFile(`public/samples/${name}`,data);manifest.push({name,url,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});process.stdout.write(`${name}: ${data.length} bytes\n`);}
for(const [from,to] of [['demo.mp4','vap-gift.mp4'],['demo.json','vap-gift.json']]){await copyFile(`node_modules/video-animation-player/demo/src/components/${from}`,`public/samples/${to}`);const b=await readFile(`public/samples/${to}`);manifest.push({name:to,url:'https://github.com/Tencent/vap/tree/master/web/demo/src/components',npmVersion:'video-animation-player@1.0.5',bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
await writeFile('public/samples/sources.json',JSON.stringify(manifest,null,2));
