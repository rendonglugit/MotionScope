import {assert,canvasIn,findLocal,imageFrom,resourceURL} from '../core.js';

export async function lottieAdapter(file,files,host,urls) {
  const {default:lottie}=await import('lottie-web/build/player/lottie_light');
  const data=JSON.parse(await file.text());assert(data.layers&&data.fr&&data.w,'不是有效的 Lottie JSON。');
  for(const asset of data.assets||[]) {
    if(!asset.p) continue;
    if(asset.p.startsWith('data:image/')) continue;
    const local=findLocal(files,(asset.u||'')+asset.p,file.localPath||file.name);
    assert(local,`缺少图片 ${asset.u||''}${asset.p}。请同时导入图片或 ZIP。外部链接不会自动请求。`);
    asset.p=resourceURL(local,urls);asset.u='';asset.e=1;
  }
  const warnings=[];
  for(const font of data.fonts?.list||[]) {if(font.fPath) warnings.push(`字体 ${font.fFamily} 使用系统字体替代，请在本机安装原字体。`);font.fPath='';font.fOrigin='n';}
  if(data.chars?.length) warnings.push('包含导出字形；替换文字可能缺字。');
  warnings.push('使用无表达式 SVG 播放器；AE 表达式不会执行。');
  let anim,last=0;
  async function build(){anim?.destroy();host.replaceChildren();anim=lottie.loadAnimation({container:host,renderer:'svg',autoplay:false,loop:false,animationData:structuredClone(data),rendererSettings:{progressiveLoad:false}});await new Promise((resolve,reject)=>{anim.addEventListener('DOMLoaded',resolve);anim.addEventListener('data_failed',()=>reject(new Error('Lottie 资源加载失败。')));});anim.setSubframe(false);anim.goToAndStop(last*data.fr,true);}
  await build();
  const textLayers=[];
  function walk(layers,path='root'){for(const [i,l] of (layers||[]).entries()){if(l.ty===5&&l.t?.d?.k) textLayers.push({layer:l,id:`${path}/${i}`,name:l.nm||`文字 ${i}`});} }
  walk(data.layers);for(const a of data.assets||[]) if(a.layers)walk(a.layers,a.id);
  const resources=[...textLayers.map(({layer,id,name})=>({id,type:'text',label:name,value:layer.t.d.k[0]?.s?.t||''})),...(data.assets||[]).filter(a=>a.p).map(a=>({id:a.id,type:'image',label:a.id}))];
  return {meta:{format:'Lottie',width:data.w,height:data.h,fps:data.fr,frames:data.op-data.ip,duration:(data.op-data.ip)/data.fr,frameSource:'文件声明',runtime:'lottie-web 5.13.0 · SVG light',layers:data.layers.length},resources,warnings,markers:data.markers||[],seek:async t=>{last=t;anim.goToAndStop(t*data.fr,true);},replace:async(id,value)=>{const text=textLayers.find(t=>t.id===id);if(text){for(const k of text.layer.t.d.k) k.s.t=value;}else{const a=data.assets.find(a=>a.id===id);a.p=value;a.u='';a.e=1;}await build();},snapshot:()=>({svg:host.querySelector('svg')}),destroy:()=>anim.destroy()};
}

let pagPromise;
export async function pagAdapter(file,files,host,urls) {
  const [{PAGInit},{default:wasmURL}]=await Promise.all([import('libpag'),import('libpag/lib/libpag.wasm?url')]);
  const PAG=await (pagPromise??=PAGInit({locateFile:()=>wasmURL}));
  const pag=await PAG.PAGFile.load(await file.arrayBuffer());
  const c=canvasIn(host,pag.width(),pag.height());let view;
  try { view=await PAG.PAGView.init(pag,c,{useScale:false,useCanvas2D:true});assert(view,'浏览器无法创建 PAG WebGL 视图。'); }catch(e){pag.destroy();throw e;}
  const duration=pag.duration()/1e6,fps=pag.frameRate(),resources=[];const retained=[];
  for(let i=0;i<pag.numTexts();i++) resources.push({id:`text:${i}`,type:'text',label:`文字图层 ${i}`,value:pag.getTextData(i).text});
  for(let i=0;i<pag.numImages();i++) resources.push({id:`image:${i}`,type:'image',label:`占位图片 ${i}`});
  await view.flush();
  return {meta:{format:'PAG',width:c.width,height:c.height,duration,fps,frames:Math.round(duration*fps),frameSource:'时长 × 文件帧率',runtime:'libpag 4.1.8 · WASM / WebGL',version:`Tag ${pag.tagLevel()}`},resources,warnings:['文字显示依赖本机字体。替换仅影响当前预览，不会改写 PAG。'],seek:async t=>{view.setProgress(Math.min(1,t/duration));await view.flush();},replace:async(id,value)=>{const [kind,n]=id.split(':');if(kind==='text'){const doc=pag.getTextData(+n);doc.text=value;pag.replaceText(+n,doc);}else {const img=await imageFrom(value);const p=PAG.PAGImage.fromSource(img);retained.push(p);pag.replaceImage(+n,p);}await view.flush();},snapshot:()=>({canvas:c}),destroy:()=>{view.destroy();retained.forEach(x=>x.destroy());pag.destroy();}};
}

export async function svgaAdapter(file,files,host,urls) {
  const mod=await import('svgaplayerweb');const SVGA=mod.default||mod;
  const wrapper=document.createElement('div');wrapper.style.cssText='width:100%;height:100%';host.replaceChildren(wrapper);
  const parser=new SVGA.Parser(),player=new SVGA.Player(wrapper);
  let data;
  const {default:JSZip}=await import('jszip');
  window.JSZip=JSZip;window.JSZipUtils={getBinaryContent:async(url,callback)=>{try{const response=await fetch(url);callback(null,await response.arrayBuffer());}catch(e){callback(e);}}};
  try{data=await new Promise((resolve,reject)=>parser.load(resourceURL(file,urls),resolve,reject));}catch(e){player.clear();throw new Error(`SVGA 解析失败：${e?.message||String(e)||'文件损坏或格式不兼容'}`);}
  player.clearsAfterStop=false;player.setVideoItem(data);player.setContentMode('AspectFit');player.stepToFrame(0,false);
  const size=data.videoSize||{},fps=data.FPS||20,frames=data.frames;
  return {meta:{format:'SVGA',width:size.width,height:size.height,fps,frames,duration:frames/fps,frameSource:'文件声明',runtime:'svgaplayerweb 2.3.2 · Canvas',layers:data.sprites?.length},resources:Object.keys(data.images||{}).map(id=>({id,type:'imageText',label:id,value:''})),warnings:['每个图片 key 可替换图片，或叠加文字。音频预览暂不播放。'],seek:async t=>player.stepToFrame(Math.min(frames-1,Math.floor(t*fps)),false),replace:async(id,value,type)=>{if(type==='text')player.setText({text:value,size:'24px',color:'#ffffff'},id);else {player.setImage(value,id);player.stepToFrame(player._currentFrame||0,false);const img=player._renderer?._bitmapCache?.[id];if(img?.decode)await img.decode();}player.stepToFrame(player._currentFrame||0,false);},snapshot:()=>({canvas:wrapper.querySelector('canvas')}),destroy:()=>{player.stopAnimation();player.clear();wrapper.remove();}};
}
