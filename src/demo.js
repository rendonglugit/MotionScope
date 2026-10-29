import {avatarDataURI} from './demo-avatar.js';
const k = value => ({a:0,k:value});
const ease={i:{x:[0.65],y:[1]},o:{x:[0.35],y:[0]}};
const keys=(values,times)=>({a:1,k:values.map((s,i)=>({...ease,t:times[i],s:Array.isArray(s)?s:[s],...(i<values.length-1?{e:Array.isArray(values[i+1])?values[i+1]:[values[i+1]]}:{})}))});
const color=hex=>[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255,1];
function group(shapes,fill,stroke,width=2){return {ty:'gr',it:[...shapes,...(fill?[{ty:'fl',c:k(color(fill)),o:k(100),r:1}]:[]),...(stroke?[{ty:'st',c:k(color(stroke)),o:k(100),w:k(width),lc:2,lj:2}]:[]),{ty:'tr',p:k([0,0]),a:k([0,0]),s:k([100,100]),r:k(0),o:k(100),sk:k(0),sa:k(0)}]};}
const path=points=>({ty:'sh',ks:k({i:points.map(()=>[0,0]),o:points.map(()=>[0,0]),v:points,c:true})});
export function demoData(){
  const layers=[];
  function layer(name,shapes,p=[256,238],opts={}) {layers.push({ddd:0,ind:layers.length+1,ty:4,nm:name,sr:1,ks:{o:k(100),r:k(0),p:k([...p,0]),a:k([0,0,0]),s:k([100,100,100]),...opts},ao:0,shapes,ip:0,op:120,st:0,bm:0});}
  for(let i=0;i<12;i++){const a=i*Math.PI/6,r=146+(i%3)*18;layer(`闪光 ${i+1}`,[group([path([[0,-7],[2,-2],[7,0],[2,2],[0,7],[-2,2],[-7,0],[-2,-2]])],i%2?'#b8abf5':'#f6bc65')],[256+Math.cos(a)*r,250+Math.sin(a)*r],{s:keys([[40,40,100],[110,110,100],[40,40,100]],[i*2,60+i*2,120+i*2]),o:keys([30,100,30],[0,60,120])});}
  layer('轨道',[group([{ty:'el',p:k([0,0]),s:k([290,130])}],null,'#dcd5f0',1.5)],[256,265],{r:k(-24)});
  layer('礼盒',[group([path([[-83,-30],[0,-74],[83,-30],[83,60],[0,108],[-83,60]])],'#8f74e8','#6e50cc',2),group([path([[-83,-30],[0,14],[83,-30],[0,-74]])],'#cbb8ff','#6e50cc',2),group([path([[0,14],[83,-30],[83,60],[0,108]])],'#7755d4'),group([path([[-16,-64],[0,-74],[16,-65],[-67,-20],[-83,-30]])],'#ffe3a3'),group([path([[64,-40],[83,-30],[16,7],[0,14],[-83,-30],[-65,-40],[0,-5]])],'#f9cc78'),group([path([[-12,8],[0,14],[12,8],[12,101],[0,108],[-12,101]])],'#ffe3a3')],[256,224],{p:keys([[256,224,0],[256,211,0],[256,224,0]],[0,60,120]),r:keys([-3,3,-3],[0,60,120])});
  layer('蝴蝶结',[group([{ty:'el',p:k([-24,-5]),s:k([52,34])}],null,'#f9cc78',11),group([{ty:'el',p:k([24,-5]),s:k([52,34])}],null,'#ffe3a3',11),group([{ty:'el',p:k([0,3]),s:k([20,20])}],'#ffdf9a')],[256,154],{p:keys([[256,154,0],[256,141,0],[256,154,0]],[0,60,120])});
  layers.unshift({ddd:0,ind:99,ty:5,nm:'礼物祝福语',sr:1,ks:{o:k(100),r:k(0),p:k([256,398,0]),a:k([0,0,0]),s:k([100,100,100])},t:{d:{k:[{s:{s:22,f:'Arial',t:'送你一份星光',j:2,tr:0,lh:30,ls:0,fc:color('#9b8cae').slice(0,3)},t:0}]},p:{},m:{g:1,a:k([0,0])},a:[]},ip:0,op:120,st:0,bm:0});
  layers.unshift({ddd:0,ind:100,ty:2,nm:'头像占位图',refId:'avatar',sr:1,ks:{o:k(100),r:k(0),p:k([256,358,0]),a:k([128,128,0]),s:k([13,13,100])},ip:0,op:120,st:0,bm:0});
  return {v:'5.13.0',fr:30,ip:0,op:120,w:512,h:512,nm:'星光礼盒',ddd:0,fonts:{list:[{fName:'Arial',fFamily:'Arial',fStyle:'Regular',ascent:75}]},assets:[{id:'avatar',w:256,h:256,u:'',p:avatarDataURI,e:1}],layers,markers:[{tm:0,cm:'循环开始',dr:0},{tm:60,cm:'悬浮最高点',dr:0}]};
}
