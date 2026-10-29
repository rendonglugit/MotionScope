import {assert,ext,resourceURL,stem} from '../core.js';
const placeholder='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="#bca6ef"/><circle cx="64" cy="48" r="22" fill="#fff"/><path d="M23 117c0-50 82-50 82 0" fill="#fff"/></svg>');
async function waitUntil(test,message,ms=15000){const start=performance.now();while(!test()){assert(performance.now()-start<ms,message);await new Promise(r=>setTimeout(r,50));}}
async function seekVideo(video,t,render){
  assert(video.readyState>=2,'视频仍在解码，请稍后。');
  if(Math.abs(video.currentTime-t)<0.001){render?.();return;}
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{clean();reject(new Error('视频定位超时。浏览器可能不支持该编码。'));},5000);function clean(){clearTimeout(timer);video.removeEventListener('seeked',done);}function done(){clean();render?.();resolve();}video.addEventListener('seeked',done);video.currentTime=t;});
}
export async function videoAdapter(file,files,host,urls,format='auto',overrides={}) {
  const configs=[];
  for(const f of files.filter(f=>ext(f.name)==='json')) {try{const d=JSON.parse(await f.text());if(d.info?.rgbFrame)configs.push({file:f,data:d});}catch{}}
  const same=configs.find(c=>stem(c.file.name)===stem(file.name)),configEntry=same||(configs.length===1?configs[0]:null);
  if(format==='auto')format=configEntry?'VAP':'YYEVA';
  const source=resourceURL(file,urls);let player,video,config,resources=[],draw;
  async function init(effects={}) {
    if(player){player.destroy();host.replaceChildren();}
    if(format==='VAP') {
      assert(configEntry,'VAP 需要配套 JSON。请同时导入 MP4 和 VAP 配置 JSON。');
      config=structuredClone(configEntry.data);assert(config.info.w&&config.info.h&&config.info.fps,'VAP info 配置不完整。');
      const {default:Vap}=await import('video-animation-player/src/index.ts');
      const defaults={};for(const s of config.src||[]) defaults[s.srcTag]=s.srcType==='txt'?'MotionScope':placeholder;
      player=new Vap({container:host,src:source,config,width:config.info.w,height:config.info.h,fps:config.info.fps,mute:true,loop:true,accurate:false,...defaults,...effects});
      await waitUntil(()=>player.gl&&player.video?.readyState>=2,'VAP 加载失败：请检查 MP4 编码和配套 JSON。');
      player.pause();video=player.video;draw=()=>{player.cancelRequestAnimation();player.drawFrame(null,null);};
      resources=(config.src||[]).map(s=>({id:s.srcTag,type:s.srcType==='txt'?'text':'image',label:s.srcTag,value:s.srcType==='txt'?(effects[s.srcTag]||'MotionScope'):''}));
    } else {
      // The official engine reads embedded yyeffectmp4json metadata locally.
      const {yyEva}=await import('yyeva');
      player=await yyEva({container:host,videoUrl:file,autoplay:false,loop:true,endPause:true,mute:true,useMetaData:true,usePrefetch:true,useVideoDBCache:false,useFrameCache:false,useOfsRender:false,useAccurate:false,renderType:'webgl',resizeCanvas:'percent',showPlayerInfo:false,logLevel:'error',effects});
      video=player.renderer?.video||player.video;
      assert(video&&player.renderer,'YYEVA 初始化失败。请检查视频编码。');
      config=player.renderer.videoEntity.config;
      assert(config?.descript,'没有识别到 YYEVA 元数据。普通双通道 MP4 不能自动当作 YYEVA；VAP 请连同 JSON 导入并切换协议。');
      player.stop();draw=()=>{const renderer=player.renderer,wasPlaying=renderer.isPlay;renderer.isPlay=true;renderer.currentFrame=-1;renderer.render(Math.round(video.currentTime*(config.descript.fps||30)));renderer.isPlay=wasPlaying;};
      resources=(config.effect||[]).map(s=>({id:s.effectTag,type:s.effectType==='txt'?'text':'image',label:s.effectTag,value:effects[s.effectTag]?.text||''}));
      await waitUntil(()=>video.readyState>=2,'YYEVA 视频解码超时。');draw();
    }
    video.pause();
  }
  try{await init(overrides);}catch(e){player?.destroy();throw e;}
  const d=format==='VAP'?config.info:config.descript,rgb=d.rgbFrame;const fps=d.fps||null,duration=video.duration;
  const meta={format,width:format==='VAP'?d.w:rgb[2],height:format==='VAP'?d.h:rgb[3],fps,frames:d.f||Math.round(duration*fps),duration,frameSource:d.f?'配置声明（视频定位近似）':'时长 × 配置帧率（近似）',runtime:format==='VAP'?'video-animation-player 1.0.5 · WebGL':'yyeva 1.2.0 · WebGL',videoSize:`${video.videoWidth} × ${video.videoHeight}`};
  return {meta,resources,warnings:['视频默认静音。时间定位受视频关键帧及浏览器解码影响，不能保证与原始导出帧精确对应。','动态资源替换会重建播放器。预览通过仍需在 App 真机检查。'],native:true,getTime:()=>video.currentTime,play:async()=>{if(format==='YYEVA'){player.renderer.isPlay=true;player.animator.isPlay=true;player.animator.start();player.isPlay=true;}await video.play();},pause:()=>{video.pause();if(format==='YYEVA')player.stop();},seek:async t=>seekVideo(video,Math.min(t,Math.max(0,duration-0.04)),draw),setSpeed:s=>{video.playbackRate=s;},replace:async(id,value,type)=>{const old=video.currentTime;overrides[id]=format==='YYEVA'?(type==='text'?{text:value}:value):value;await init(overrides);await seekVideo(video,old,draw);},snapshot:()=>{draw();const source=host.querySelector('canvas'),copy=document.createElement('canvas');copy.width=source.width;copy.height=source.height;copy.getContext('2d').drawImage(source,0,0);return {canvas:copy};},destroy:()=>{player.destroy();}};
}
