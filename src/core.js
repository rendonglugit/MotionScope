export const MAX_FILE = 100 * 1024 * 1024;
export const MAX_PIXELS = 60 * 1024 * 1024;
export const ext = name => name.toLowerCase().split('.').pop();
export const stem = name => name.replace(/\.[^.]+$/, '');
export const basename = name => name.replace(/\\/g, '/').split('/').pop();
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bytes(n) { return n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(2)} MB`; }
export function assert(condition, message) { if (!condition) throw new Error(message); }
export function pixelBudget(w,h,n=1) { assert(w>0&&h>0&&w*h*n<=MAX_PIXELS, '素材解码后的像素过多（上限约 240 MB）。请减小尺寸或帧数后再导入。'); }
export function classify(name, json) {
  const type = ext(name);
  if (json) {
    if (json.skeleton && json.bones) return 'Spine';
    if (json.layers && json.fr && json.w) return 'Lottie';
    if (json.info?.rgbFrame) return 'VAP config';
    if (json.descript && json.datas) return 'YYEVA config';
    return 'JSON';
  }
  return ({pag:'PAG',svga:'SVGA',lottie:'Lottie',zip:'ZIP',skel:'Spine',mp4:'Video',gif:'GIF',apng:'APNG',webp:'WebP',png:'PNG',jpg:'Image',jpeg:'Image',atlas:'Atlas'})[type] || 'Unknown';
}
export function frameAt(delays, milliseconds) {
  let elapsed=0;
  for (let i=0;i<delays.length;i++) { elapsed+=delays[i]; if(milliseconds<elapsed) return i; }
  return Math.max(0,delays.length-1);
}
export function frameTime(delays,index) { return delays.slice(0,index).reduce((a,b)=>a+b,0)/1000; }
export function normalizeSettings(input={},duration) {
  const validSpeed=[.25,.5,1,1.5,2],validZoom=['fit','0.5','1','1.5','2'];
  const a=Number(input.rangeStart)||0,b=input.rangeEnd===null?null:Number(input.rangeEnd);
  const rangeValid=Number.isFinite(b)&&a>=0&&b>a&&b<=duration;
  return {time:Math.max(0,Math.min(Number(input.time)||0,duration)),playing:false,speed:validSpeed.includes(+input.speed)?+input.speed:1,zoom:validZoom.includes(String(input.zoom))?String(input.zoom):'fit',color:/^#[0-9a-f]{6}$/i.test(input.color)?input.color:'#eae6f3',background:['checker','white','dark','custom'].includes(input.background)?input.background:'checker',border:input.border===true,loop:input.loop!==false,rangeStart:rangeValid?a:0,rangeEnd:rangeValid?b:null};
}
export function validateGrid(imageWidth,imageHeight,{columns,rows,count,fps}) {
  assert([columns,rows,count,fps].every(Number.isFinite),'网格参数必须为数字。');
  assert(Number.isInteger(columns)&&columns>0&&columns<=256&&Number.isInteger(rows)&&rows>0&&rows<=256,'行列必须是 1–256 的整数。');
  assert(Number.isInteger(count)&&count>0&&count<=columns*rows,'有效帧数应为 1 到行数 × 列数。');
  assert(fps>0&&fps<=120,'播放帧率应为 0–120 之间的正数。');
  assert(imageWidth%columns===0&&imageHeight%rows===0,'图片尺寸不能整除网格，请检查行列。');
  return {width:imageWidth/columns,height:imageHeight/rows,frames:count,fps,duration:count/fps};
}
export function parseWebP(buffer) {
  const d=new DataView(buffer),u=new Uint8Array(buffer),s=(p,n)=>String.fromCharCode(...u.slice(p,p+n)),u24=p=>u[p]|u[p+1]<<8|u[p+2]<<16;
  assert(u.length>=12&&s(0,4)==='RIFF'&&s(8,4)==='WEBP','不是有效的 WebP 文件。');
  assert(d.getUint32(4,true)+8<=u.length,'WebP 数据不完整。');
  let width=0,height=0,background=[0,0,0,0],loop=0,frames=[];
  for(let p=12;p+8<=u.length;) {
    const tag=s(p,4),len=d.getUint32(p+4,true),v=p+8;
    assert(v+len<=u.length,'WebP 数据不完整。');
    if(tag==='VP8X') { assert(len>=10,'WebP 头不完整。');width=u24(v+4)+1;height=u24(v+7)+1; }
    if(tag==='ANIM') { assert(len>=6,'WebP 动画头不完整。');background=[u[v+2],u[v+1],u[v],u[v+3]];loop=d.getUint16(v+4,true); }
    if(tag==='ANMF') {
      assert(len>=16,'WebP 帧头不完整。');
      const data=u.slice(v+16,v+len),out=new Uint8Array(30+data.length),view=new DataView(out.buffer);
      const fw=u24(v+6)+1,fh=u24(v+9)+1,alpha=String.fromCharCode(...data.slice(0,4))==='ALPH'||(String.fromCharCode(...data.slice(0,4))==='VP8L'&&!!(data[12]&16));
      out.set([82,73,70,70]);view.setUint32(4,out.length-8,true);out.set([87,69,66,80,86,80,56,88],8);view.setUint32(16,10,true);out[20]=alpha?16:0;
      for(let k=0;k<3;k++){out[24+k]=((fw-1)>>(k*8))&255;out[27+k]=((fh-1)>>(k*8))&255;}out.set(data,30);
      frames.push({x:u24(v)*2,y:u24(v+3)*2,width:u24(v+6)+1,height:u24(v+9)+1,delay:Math.max(10,u24(v+12)),dispose:!!(u[v+15]&1),replace:!!(u[v+15]&2),buffer:out.buffer});
    }
    p=v+len+(len%2);
  }
  return {width,height,background,loop,frames};
}
export function parsePNG(buffer) {
  const d=new DataView(buffer),u=new Uint8Array(buffer);
  assert(u.length>=24&&u[0]===137&&u[1]===80,'不是有效的 PNG 文件。');
  const result={width:d.getUint32(16),height:d.getUint32(20),frames:1,delays:[]};
  for(let p=8;p+12<=u.length;) {
    const len=d.getUint32(p),type=String.fromCharCode(...u.slice(p+4,p+8));
    assert(p+12+len<=u.length,'PNG 数据不完整。');
    if(type==='acTL') {assert(len===8,'PNG 动画头不完整。');result.frames=d.getUint32(p+8);}
    if(type==='fcTL') {assert(len===26,'PNG 帧头不完整。');result.delays.push(Math.max(10,1000*d.getUint16(p+28)/(d.getUint16(p+30)||100)));}
    p+=12+len;
  }
  return result;
}
export async function expandFiles(files) {
  const output=[];let total=0;
  async function add(file,name) { total+=file.size;assert(total<=250*1024*1024,'一次导入最多 250 MB。');assert(output.length<500,'一次导入最多 500 个文件。');Object.defineProperty(file,'localPath',{value:name||file.webkitRelativePath||file.name,configurable:true});output.push(file); }
  for(const file of files) {
    assert(file.size<=MAX_FILE,`${file.name} 超过 100 MB 限制。`);
    if(['zip','lottie'].includes(ext(file.name))) {
      const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(await file.arrayBuffer());
      const entries=Object.values(zip.files).filter(f=>!f.dir&&!f.name.includes('__MACOSX'));
      assert(entries.length<=500,'压缩包文件数过多。');
      let declared=0;for(const e of entries) {declared+=e._data?.uncompressedSize||0;assert(declared<=250*1024*1024,'压缩包解压体积超过 250 MB。');}
      for(const entry of entries) { const data=await entry.async('uint8array');await add(new File([data],basename(entry.name)),`${stem(file.name)}/${entry.name}`); }
    } else await add(file);
  }
  return output;
}
export function findLocal(files,path,base='') {
  const clean=p=>p.replace(/\\/g,'/').replace(/^\.\//,'');const target=clean(path),folder=clean(base).split('/').slice(0,-1).join('/');
  const exact=files.find(f=>clean(f.localPath||f.name)===(folder?folder+'/':'')+target)||files.find(f=>clean(f.localPath||f.name)===target);
  if(exact) return exact;
  const matches=files.filter(f=>basename(f.name)===basename(target));
  assert(matches.length<=1,`资源 ${path} 有多个同名文件，请分别导入或保留目录结构。`);return matches[0];
}
export function download(name,data,type='application/json') { const binary=data instanceof Blob||data instanceof ArrayBuffer||ArrayBuffer.isView(data);const a=document.createElement('a'),url=URL.createObjectURL(new Blob([binary||typeof data==='string'?data:JSON.stringify(data,null,2)],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
export async function imageFrom(url) {const image=new Image();image.src=url;await image.decode();return image;}
export function canvasIn(host,w,h) { pixelBudget(w,h);const c=document.createElement('canvas');c.width=w;c.height=h;host.replaceChildren(c);return c; }
export function resourceURL(file, urls) {const url=URL.createObjectURL(file);urls.push(url);return url;}
