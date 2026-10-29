import {assert,ext,resourceURL,stem} from '../core.js';
import {createLatestTask,createVideoFrameDriver} from './video-frame-driver.js';

const placeholder='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="#bca6ef"/><circle cx="64" cy="48" r="22" fill="#fff"/><path d="M23 117c0-50 82-50 82 0" fill="#fff"/></svg>');
async function waitUntil(test,message,signal,ms=15000){
  const start=performance.now();
  while(!test()){signal.throwIfAborted();assert(performance.now()-start<ms,message);await new Promise(resolve=>setTimeout(resolve,50));}
}
async function seekVideo(video,time,render,signal){
  signal.throwIfAborted();
  if(video.readyState<2||video.seeking)await waitUntil(()=>video.readyState>=2&&!video.seeking,'视频定位等待解码超时。',signal,5000);
  if(!video.seeking&&Math.abs(video.currentTime-time)<0.001){render();return;}
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>fail(new Error('视频定位超时。浏览器可能不支持该编码。')),5000);
    function clean(){clearTimeout(timer);video.removeEventListener('seeked',done);video.removeEventListener('error',failed);signal.removeEventListener('abort',aborted);}
    function fail(error){clean();reject(error);}
    function done(){clean();try{signal.throwIfAborted();render();resolve();}catch(e){reject(e);}}
    function failed(){fail(new Error('视频解码失败。请检查编码与配套配置。'));}
    function aborted(){fail(signal.reason);}
    video.addEventListener('seeked',done);video.addEventListener('error',failed);signal.addEventListener('abort',aborted,{once:true});
    video.currentTime=time;
  });
}
export async function videoAdapter(file,files,host,urls,format='auto',overrides={}){
  const configs=[];
  for(const f of files.filter(f=>ext(f.name)==='json')){try{const data=JSON.parse(await f.text());if(data.info?.rgbFrame)configs.push({file:f,data});}catch{}}
  const same=configs.find(c=>stem(c.file.name)===stem(file.name)),configEntry=same||(configs.length===1?configs[0]:null);
  if(format==='auto')format=configEntry?'VAP':'YYEVA';
  const source=resourceURL(file,urls),seeks=createLatestTask();
  let player,video,config,driver,controller,draw,resources=[],disposed=false,speed=1,resumeVisible=false,renderError=null,playRequest=0;
  function cleanup(){
    playRequest++;driver?.dispose();driver=null;controller?.abort();
    const oldVideo=video||player?.video;
    // VAP 1.0.5 removes its element without stopping or unloading the decoder.
    oldVideo?.pause();player?.destroy();player=null;video=null;
    if(oldVideo){oldVideo.removeAttribute('src');oldVideo.load();oldVideo.remove();}
  }
  async function play(){
    if(disposed||!video)return;
    const currentVideo=video,currentDriver=driver,request=++playRequest;
    if(format==='YYEVA'){player.renderer.isPlay=true;player.animator.isPlay=true;player.animator.start();player.isPlay=true;}
    try{await currentVideo.play();if(disposed||video!==currentVideo||request!==playRequest||currentVideo.paused)return;currentDriver?.start();}
    catch(e){if(disposed||request!==playRequest)return;currentDriver?.pause();throw e;}
  }
  function pause(){playRequest++;resumeVisible=false;driver?.pause();video?.pause();if(format==='YYEVA'&&player?.renderer)player.stop();}
  async function init(effects={}){
    cleanup();resumeVisible=false;renderError=null;controller=new AbortController();const {signal}=controller;
    if(format==='VAP'){
      assert(configEntry,'VAP 需要配套 JSON。请同时导入 MP4 和 VAP 配置 JSON。');
      config=structuredClone(configEntry.data);const info=config.info;
      assert([info.w,info.h,info.fps].every(n=>Number.isFinite(n)&&n>0)&&info.fps<=120,'VAP 尺寸或帧率配置无效。');
      const {InspectionVap,createVapDraw}=await import('./vap-renderer.js');signal.throwIfAborted();
      const defaults={};for(const s of config.src||[])defaults[s.srcTag]=s.srcType==='txt'?'MotionScope':placeholder;
      player=new InspectionVap({container:host,src:source,config,width:info.w,height:info.h,fps:info.fps,mute:true,loop:true,accurate:false,...defaults,...effects});
      // Keep the video in WebKit's compositor; display:none can stop decoding.
      player.video.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none';
      player.video.setAttribute('aria-hidden','true');
      await waitUntil(()=>player?.gl&&player.video?.readyState>=2,'VAP 加载失败：请检查 MP4 编码和配套 JSON。',signal);
      video=player.video;video.pause();player.cancelRequestAnimation();
      driver=createVideoFrameDriver({video,render:createVapDraw(player),fps:info.fps,onError:error=>{renderError=error;video?.pause();}});
      draw=()=>driver.draw();
      video.addEventListener('playing',()=>{if(!video.paused)driver?.start();},{signal});video.addEventListener('pause',()=>driver?.pause(),{signal});
      document.addEventListener('visibilitychange',()=>{
        if(document.hidden){playRequest++;resumeVisible=!!video&&!video.paused;driver?.pause();video?.pause();}
        else if(resumeVisible){resumeVisible=false;void play().catch(error=>{renderError=error;});}
      },{signal});
      resources=(config.src||[]).map(s=>({id:s.srcTag,type:s.srcType==='txt'?'text':'image',label:s.srcTag,value:s.srcType==='txt'?(effects[s.srcTag]||'MotionScope'):''}));
    }else{
      const {yyEva}=await import('yyeva');signal.throwIfAborted();
      player=await yyEva({container:host,videoUrl:file,autoplay:false,loop:true,endPause:true,mute:true,useMetaData:true,usePrefetch:true,useVideoDBCache:false,useFrameCache:false,useOfsRender:false,useAccurate:false,renderType:'webgl',resizeCanvas:'percent',showPlayerInfo:false,logLevel:'error',effects});
      video=player.renderer?.video||player.video;assert(video&&player.renderer,'YYEVA 初始化失败。请检查视频编码。');
      config=player.renderer.videoEntity.config;
      assert(config?.descript,'没有识别到 YYEVA 元数据。普通双通道 MP4 不能自动当作 YYEVA；VAP 请连同 JSON 导入并切换协议。');
      player.stop();draw=()=>{const renderer=player.renderer,wasPlaying=renderer.isPlay;renderer.isPlay=true;renderer.currentFrame=-1;renderer.render(Math.round(video.currentTime*(config.descript.fps||30)));renderer.isPlay=wasPlaying;};
      resources=(config.effect||[]).map(s=>({id:s.effectTag,type:s.effectType==='txt'?'text':'image',label:s.effectTag,value:effects[s.effectTag]?.text||''}));
      await waitUntil(()=>video.readyState>=2,'YYEVA 视频解码超时。',signal);
    }
    signal.throwIfAborted();video.pause();video.playbackRate=speed;draw();
  }
  try{await init(overrides);}catch(e){cleanup();throw e;}
  const d=format==='VAP'?config.info:config.descript,rgb=d.rgbFrame,fps=d.fps||30,duration=video.duration;
  const meta={format,width:format==='VAP'?d.w:rgb[2],height:format==='VAP'?d.h:rgb[3],fps,frames:d.f||Math.round(duration*fps),duration,frameSource:d.f?'配置声明（视频定位近似）':'时长 × 配置帧率（近似）',runtime:format==='VAP'?'video-animation-player 1.0.5 · 帧同步调度 / WebGL':'yyeva 1.2.0 · WebGL',videoSize:`${video.videoWidth} × ${video.videoHeight}`};
  async function seek(time){
    const targetVideo=video,signal=controller.signal;
    return seeks.run(async()=>{if(disposed||video!==targetVideo||signal.aborted)return;await seekVideo(targetVideo,Math.max(0,Math.min(time,Math.max(0,duration-1/fps))),draw,signal);});
  }
  return {meta,resources,native:true,
    warnings:['视频默认静音。时间定位受视频关键帧及浏览器解码影响，不能保证与原始导出帧精确对应。','动态资源替换会重建播放器。预览通过仍需在 App 真机检查。'],
    getTime:()=>video?.currentTime||0,getDiagnostics:()=>({...driver?.diagnostics(),error:renderError?.message||null}),play,pause,seek,
    setSpeed:value=>{speed=value;if(video)video.playbackRate=speed;},
    replace:async(id,value,type)=>{const old=video.currentTime;pause();overrides[id]=format==='YYEVA'?(type==='text'?{text:value}:value):value;try{await init(overrides);await seek(old);}catch(e){cleanup();throw e;}},
    snapshot:()=>{draw();const canvas=host.querySelector('canvas'),copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);return {canvas:copy};},
    destroy:()=>{if(disposed)return;disposed=true;seeks.dispose();cleanup();},
  };
}
