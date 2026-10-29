import {assert,canvasIn,ext,findLocal,imageFrom,resourceURL} from '../core.js';
export async function spineAdapter(file,files,host,urls) {
  const S=await import('@esotericsoftware/spine-webgl');
  let json,buffer,version;
  if(ext(file.name)==='json'){json=JSON.parse(await file.text());version=json.skeleton?.spine;}
  else {buffer=new Uint8Array(await file.arrayBuffer());const input=new S.BinaryInput(buffer);input.readInt32();input.readInt32();version=input.readString();}
  assert(version?.startsWith('4.2.'),`Spine 导出版本 ${version||'未知'}：当前接入 4.2 运行时。请使用 Spine 4.2 重新导出；不同主次版本不能混用。`);
  const atlases=files.filter(f=>ext(f.name)==='atlas');assert(atlases.length,'缺少 .atlas 文件。请一并导入骨架、atlas 和纹理，或导入 ZIP。');
  const matching=atlases.find(f=>f.name.replace('.atlas','')===file.name.replace(/\.[^.]+$/,''));assert(matching||atlases.length===1,'发现多个 atlas，请分别导入每个骨架包。');const atlasFile=matching||atlases[0];
  const atlas=new S.TextureAtlas(await atlasFile.text()),c=canvasIn(host,720,720);const gl=c.getContext('webgl',{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true});assert(gl,'当前浏览器无法创建 WebGL。');
  const textures=[];let renderer;
  try {
    for(const page of atlas.pages){const f=findLocal(files,page.name,atlasFile.localPath||atlasFile.name);assert(f,`缺少 Spine 纹理 ${page.name}`);const img=await imageFrom(resourceURL(f,urls));const texture=new S.GLTexture(gl,img);textures.push(texture);page.setTexture(texture);}
    const loader=new S.AtlasAttachmentLoader(atlas),reader=json?new S.SkeletonJson(loader):new S.SkeletonBinary(loader),data=reader.readSkeletonData(json||buffer),skeleton=new S.Skeleton(data);
    assert(data.animations.length,'骨架中没有可播放的动作。');
    renderer=new S.SceneRenderer(c,gl);let selected=data.animations[0].name,skin=data.skins[0]?.name||'',debug=false;
    const state=new S.AnimationState(new S.AnimationStateData(data));let entry;
    const meta={format:'Spine',width:data.width||720,height:data.height||720,duration:data.animations[0].duration,fps:30,frames:Math.ceil(data.animations[0].duration*30-1e-5),frameSource:'30 FPS 检查采样，非源帧数',runtime:'spine-webgl 4.2.120',version};
    function reset(){skeleton.setToSetupPose();if(skin)skeleton.setSkinByName(skin);state.clearTracks();entry=state.setAnimation(0,selected,false);}
    reset();state.apply(skeleton);skeleton.updateWorldTransform(S.Physics.none);
    const offset=new S.Vector2(),size=new S.Vector2();skeleton.getBounds(offset,size,[]);
    renderer.camera.position.x=offset.x+size.x/2;renderer.camera.position.y=offset.y+size.y/2;
    renderer.camera.viewportWidth=renderer.camera.viewportHeight=Math.max(size.x,size.y,100)*1.35;renderer.camera.update();
    function draw(t){reset();entry.trackTime=t;state.apply(skeleton);skeleton.updateWorldTransform(S.Physics.none);gl.viewport(0,0,c.width,c.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);renderer.begin();renderer.drawSkeleton(skeleton,atlas.pages[0]?.pma||false);if(debug)renderer.drawSkeletonDebug(skeleton);renderer.end();}
    draw(0);
    return {meta,resources:[],warnings:['当前支持 Spine 4.2 JSON / skel + atlas + 纹理包。时间线按 30 FPS 采样。物理使用静态检查模式，不模拟完整游戏行为。','Spine Runtime 使用独立许可，参见开源许可说明。'],getSettings:()=>({action:selected,skin,debug}),restoreSettings:s=>{if(data.findAnimation(s.action))selected=s.action;if(data.findSkin(s.skin))skin=s.skin;debug=s.debug===true;meta.duration=data.findAnimation(selected).duration;meta.frames=Math.ceil(meta.duration*30-1e-5);draw(0);},actions:data.animations.map(a=>a.name),skins:data.skins.map(a=>a.name),setAction:name=>{selected=name;meta.duration=data.findAnimation(name).duration;meta.frames=Math.ceil(meta.duration*30-1e-5);draw(0);},setSkin:name=>{skin=name;draw(0);},setDebug:value=>{debug=value;draw(0);},seek:async t=>draw(t),snapshot:()=>({canvas:c}),destroy:()=>{renderer.dispose();atlas.dispose();}};
  }catch(e){renderer?.dispose();textures.forEach(t=>t.dispose());throw e;}
}
