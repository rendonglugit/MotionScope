import {assert,canvasIn,frameAt,frameTime,imageFrom,parsePNG,parseWebP,pixelBudget,resourceURL,validateGrid} from '../core.js';

function timedResult(format,canvas,delays,draw,warnings=[],extra={}) {
  let current=-1;
  const duration=delays.reduce((a,b)=>a+b,0)/1000;
  return {meta:{format,width:canvas.width,height:canvas.height,frames:delays.length,duration,fps:delays.length/duration,frameSource:'逐帧时长（平均 FPS）',runtime:'Canvas 2D · 本地解码',...extra},resources:[],warnings,delays,seek:async t=>{const next=frameAt(delays,t*1000);if(next!==current){await draw(next);current=next;}},frameTime:i=>frameTime(delays,i),snapshot:()=>({canvas}),destroy:()=>{}};
}
export async function gifAdapter(file,files,host) {
  const {parseGIF,decompressFrames}=await import('gifuct-js');const parsed=parseGIF(await file.arrayBuffer());
  const count=parsed.frames.filter(f=>f.image).length;pixelBudget(parsed.lsd.width,parsed.lsd.height,count);
  const frames=decompressFrames(parsed,true);assert(frames.length,'GIF 没有图像帧。');
  const c=canvasIn(host,parsed.lsd.width,parsed.lsd.height),ctx=c.getContext('2d');
  const patch=document.createElement('canvas'),pctx=patch.getContext('2d');let rendered=-1,saved;
  function draw(index){if(index<=rendered){ctx.clearRect(0,0,c.width,c.height);rendered=-1;saved=null;}
    for(let i=rendered+1;i<=index;i++) {
      const previous=frames[i-1];if(previous?.disposalType===2)ctx.clearRect(previous.dims.left,previous.dims.top,previous.dims.width,previous.dims.height);else if(previous?.disposalType===3&&saved)ctx.putImageData(saved,0,0);
      const f=frames[i];saved=f.disposalType===3?ctx.getImageData(0,0,c.width,c.height):null;
      patch.width=f.dims.width;patch.height=f.dims.height;pctx.putImageData(new ImageData(f.patch,f.dims.width,f.dims.height),0,0);ctx.drawImage(patch,f.dims.left,f.dims.top);
    }rendered=index;
  }
  draw(0);return timedResult('GIF',c,frames.map(f=>Math.max(10,f.delay||100)),draw,['按帧时长播放；零时长帧采用 10 ms 下限。透明 disposal 按 Canvas 合成。']);
}
export async function pngAdapter(file,files,host,urls=[]) {
  const buffer=await file.arrayBuffer(),info=parsePNG(buffer);
  if(info.frames===1&&!info.delays.length) return spriteAdapter(file,files,host,urls);
  pixelBudget(info.width,info.height,info.frames);
  const mod=await import('upng-js'),UPNG=mod.default||mod;const decoded=UPNG.decode(buffer),frames=UPNG.toRGBA8(decoded);
  const c=canvasIn(host,info.width,info.height),ctx=c.getContext('2d');const draw=i=>ctx.putImageData(new ImageData(new Uint8ClampedArray(frames[i]),c.width,c.height),0,0);draw(0);
  return timedResult('APNG',c,decoded.frames.map(f=>Math.max(10,f.delay||10)),draw,['帧率显示为按帧时长计算的平均值。']);
}
export async function webpAdapter(file,files,host,urls) {
  const info=parseWebP(await file.arrayBuffer());
  if(!info.frames.length)return spriteAdapter(file,files,host,urls);
  pixelBudget(info.width,info.height,info.frames.length);
  const c=canvasIn(host,info.width,info.height),ctx=c.getContext('2d');
  const images=[];
  try {for(const frame of info.frames){const u=URL.createObjectURL(new Blob([frame.buffer],{type:'image/webp'}));try{images.push(await imageFrom(u));}finally{URL.revokeObjectURL(u);}}}catch(e){throw new Error(`当前浏览器无法解码 WebP 帧：${e.message}`);}
  let rendered=-1;
  const clear=(x=0,y=0,w=c.width,h=c.height)=>{ctx.clearRect(x,y,w,h);const [r,g,b,a]=info.background;if(a){ctx.fillStyle=`rgba(${r},${g},${b},${a/255})`;ctx.fillRect(x,y,w,h);}};
  function draw(index){if(index<=rendered){clear();rendered=-1;}for(let i=rendered+1;i<=index;i++){const p=info.frames[i-1];if(p?.dispose)clear(p.x,p.y,p.width,p.height);const f=info.frames[i];if(f.replace)ctx.clearRect(f.x,f.y,f.width,f.height);ctx.drawImage(images[i],f.x,f.y);}rendered=index;}
  clear();draw(0);return timedResult('WebP',c,info.frames.map(f=>f.delay),draw,['解析 ANMF 帧并按 blend / disposal 合成；平均 FPS 不代表恒定帧率。']);
}
export async function spriteAdapter(file,files,host,urls=[]) {
  const img=await imageFrom(resourceURL(file,urls));pixelBudget(img.naturalWidth,img.naturalHeight);
  const c=canvasIn(host,img.naturalWidth,img.naturalHeight),ctx=c.getContext('2d');let config={columns:1,rows:1,count:1,fps:24},mode='frame',time=0;
  const meta={format:'Spritesheet',width:c.width,height:c.height,frames:1,fps:24,duration:1/24,frameSource:'用户配置',runtime:'Canvas 2D · 网格切分'};
  function draw(){const w=img.naturalWidth/config.columns,h=img.naturalHeight/config.rows,full=mode!=='frame';c.width=full?img.naturalWidth:w;c.height=full?img.naturalHeight:h;ctx.clearRect(0,0,c.width,c.height);const i=Math.min(config.count-1,Math.floor(time*config.fps));if(full){ctx.drawImage(img,0,0);if(mode==='grid'){ctx.strokeStyle='#8871ed';ctx.lineWidth=1;for(let x=0;x<=config.columns;x++){ctx.beginPath();ctx.moveTo(x*w,0);ctx.lineTo(x*w,c.height);ctx.stroke();}for(let y=0;y<=config.rows;y++){ctx.beginPath();ctx.moveTo(0,y*h);ctx.lineTo(c.width,y*h);ctx.stroke();}ctx.fillStyle='#8065dc44';ctx.fillRect((i%config.columns)*w,Math.floor(i/config.columns)*h,w,h);}}else ctx.drawImage(img,(i%config.columns)*w,Math.floor(i/config.columns)*h,w,h,0,0,w,h);}
  draw();return {meta,resources:[],warnings:['静态图片默认以 1 × 1 显示。将其作为雪碧图时，请设置网格及有效帧数；FPS 来自手动配置。'],grid:config,displaySize:()=>({width:c.width,height:c.height}),getSettings:()=>({mode}),restoreSettings:s=>{mode=['frame','grid','original'].includes(s.mode)?s.mode:'frame';draw();},configure:next=>{const m=validateGrid(img.naturalWidth,img.naturalHeight,next);Object.assign(config,next);Object.assign(meta,m);draw();},setMode:m=>{mode=m;draw();},seek:async t=>{time=t;draw();},snapshot:()=>({canvas:c}),destroy:()=>{}};
}
