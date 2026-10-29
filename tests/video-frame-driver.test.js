import test from 'node:test';
import assert from 'node:assert/strict';
import {createVideoFrameDriver,createLatestTask} from '../src/adapters/video-frame-driver.js';
import {createVapDraw} from '../src/adapters/vap-draw.js';

function harness({fps=25,native=false,render}={}){
  let id=0;const callbacks=new Map(),times=[];
  const request=cb=>{callbacks.set(++id,cb);return id;},cancel=id=>callbacks.delete(id);
  const video={currentTime:0,readyState:4,paused:false,seeking:false};
  if(native){video.requestVideoFrameCallback=request;video.cancelVideoFrameCallback=cancel;}
  const errors=[];
  const driver=createVideoFrameDriver({video,fps,render:render||((t)=>times.push(t)),raf:request,caf:cancel,onError:e=>errors.push(e)});
  return {driver,video,callbacks,times,errors,
    step(time,mediaTime=time){video.currentTime=time;const batch=[...callbacks];callbacks.clear();for(const [,cb] of batch)cb(time*1000,{mediaTime});},
  };
}

test('fallback keeps source cadence across non-divisor FPS and high refresh screens',()=>{
  for(const fps of [20,24,25,29.97,30,60])for(const hz of [60,90,120]){
    const h=harness({fps});h.driver.start();
    for(let i=1;i<=2*hz;i++)h.step(i/hz);
    assert.ok(h.times.length>=Math.floor(2*fps)-1,`${fps} FPS on ${hz} Hz: only ${h.times.length} draws`);
    assert.ok(h.times.length<=Math.ceil(2*fps)+1,`${fps} FPS on ${hz} Hz: duplicate draws`);
    assert.equal(h.callbacks.size,1);h.driver.dispose();assert.equal(h.callbacks.size,0);
  }
});
test('decoded-frame mode uses mediaTime, owns one callback, and deduplicates frames',()=>{
  const h=harness({native:true,fps:25});for(let i=0;i<10;i++)h.driver.start();
  assert.equal(h.callbacks.size,1);h.step(.08,.04);h.step(.09,.04);h.step(.12,.08);
  assert.deepEqual(h.times,[.04,.08]);assert.equal(h.driver.diagnostics().mode,'requestVideoFrameCallback');
});
test('pause cancels rendering; seek and screenshot render once without a new loop',()=>{
  for(const native of [false,true]){const h=harness({native});h.driver.start();h.step(.1);h.driver.pause();const count=h.times.length;
    for(let i=0;i<120;i++)h.step(.1+i/120);
    assert.equal(h.times.length,count);assert.equal(h.callbacks.size,0);
    h.video.currentTime=1;h.driver.draw();assert.equal(h.times.length,count+1);assert.equal(h.callbacks.size,0);
    assert.equal(h.driver.diagnostics().running,false);
  }
});
test('late callbacks from a prior playback cannot fork the resumed chain',()=>{
  const h=harness({native:true});h.driver.start();const late=[...h.callbacks.values()][0];h.driver.pause();h.driver.start();late(0,{mediaTime:0});
  assert.equal(h.callbacks.size,1);assert.equal(h.times.length,0);h.step(.1);assert.equal(h.times.length,1);assert.equal(h.callbacks.size,1);
});
test('dispose rejects late callbacks and further render requests',()=>{
  const h=harness();h.driver.start();const late=[...h.callbacks.values()][0];h.driver.dispose();late(1);h.driver.start();h.driver.draw();
  assert.equal(h.callbacks.size,0);assert.equal(h.times.length,0);
});
test('render error stops the callback chain instead of leaking or spinning',()=>{
  const h=harness({render:()=>{throw new Error('lost context');}});h.driver.start();h.step(.1);
  assert.equal(h.errors.length,1);assert.equal(h.callbacks.size,0);assert.equal(h.driver.diagnostics().running,false);
});
test('rapid drag targets run the first and latest seek with no parallel decoder tasks',async()=>{
  const q=createLatestTask(),seen=[];let release,active=0,maxActive=0;
  const first=q.run(async()=>{active++;maxActive=Math.max(maxActive,active);seen.push(1);await new Promise(r=>release=r);active--;});
  const pending=[];for(let i=2;i<=100;i++)pending.push(q.run(async()=>{active++;maxActive=Math.max(maxActive,active);seen.push(i);active--;}));
  release();await Promise.all([first,...pending]);assert.deepEqual(seen,[1,100]);assert.equal(maxActive,1);
});
test('failed decoder task does not prevent the latest task from running',async()=>{
  const q=createLatestTask();const error=q.run(async()=>{throw new Error('decode error');});const next=q.run(async()=>42);
  await assert.rejects(error,/decode error/);await next;
});
test('disposed queue drops pending seeks',async()=>{
  const q=createLatestTask();let release,called=false;const first=q.run(()=>new Promise(r=>release=r));const last=q.run(async()=>called=true);
  q.dispose();release();await Promise.all([first,last]);assert.equal(called,false);
});
test('fusion uniform buffer clears overlays and selects by decoded media time',()=>{
  const uploaded=[];let draws=0;
  const gl={TEXTURE0:0,TEXTURE_2D:1,RGB:2,UNSIGNED_BYTE:3,COLOR_BUFFER_BIT:4,TRIANGLE_STRIP:5,getUniformLocation:()=>7,uniform1fv:(_l,a)=>uploaded.push([...a]),activeTexture(){},bindTexture(){},clear(){},texImage2D(){},drawArrays(){draws++;}};
  const parser={srcData:{one:{},two:{}},textureMap:{a:1,b:2},config:{info:{f:4,videoW:100,videoH:100,rgbFrame:[0,0,50,50]},frame:[{i:0,obj:[{srcId:'a',frame:[0,0,10,10],mFrame:[50,50,10,10]},{srcId:'b',frame:[10,10,10,10],mFrame:[60,60,10,10]}]},{i:1,obj:[{srcId:'a',frame:[0,0,10,10],mFrame:[50,50,10,10]}]}]}};
  const draw=createVapDraw({gl,vapFrameParser:parser,program:{},video:{},options:{fps:25},videoTexture:{}});
  draw(0);draw(.04);draw(.08);assert.equal(draws,3);assert.equal(uploaded[0][9],2);assert.ok(uploaded[1].slice(9).every(n=>n===0));assert.ok(uploaded[2].every(n=>n===0));
});
