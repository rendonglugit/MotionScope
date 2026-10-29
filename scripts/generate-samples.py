from PIL import Image, ImageDraw
from pathlib import Path
import math, json, base64

out=Path('public/samples');out.mkdir(parents=True,exist_ok=True)
def star(draw,cx,cy,r,fill):
    points=[]
    for i in range(10):
        a=i*math.pi/5-math.pi/2;radius=r if i%2==0 else r*.46
        points.append((cx+math.cos(a)*radius,cy+math.sin(a)*radius))
    draw.polygon(points,fill=fill)
frames=[]
for i in range(24):
    phase=i/24*2*math.pi
    img=Image.new('RGBA',(256,256));d=ImageDraw.Draw(img)
    d.ellipse((39,39,217,217),outline=(212,200,243,200),width=2)
    star(d,128,128,44+5*math.sin(phase),(158,125,226,255))
    star(d,128,128,26+3*math.sin(phase),(248,222,166,255))
    for j in range(5):
        a=phase+j*math.pi*2/5
        star(d,128+math.cos(a)*89,128+math.sin(a)*89,6+(j%2)*2,(188,163,237,255) if j%2 else (244,196,112,255))
    frames.append(img)
frames[0].save(out/'sparkle.apng',format='PNG',save_all=True,append_images=frames[1:],duration=80,loop=0,disposal=0,blend=0)
frames[0].save(out/'sparkle.webp',save_all=True,append_images=frames[1:],duration=80,loop=0,lossless=True)
gif=[]
for frame in frames:
    rgb=frame.convert('RGB').quantize(colors=255)
    mask=frame.getchannel('A').point(lambda a:255 if a==0 else 0)
    rgb.paste(255,mask=mask);rgb.info['transparency']=255
    gif.append(rgb)
gif[0].save(out/'sparkle.gif',save_all=True,append_images=gif[1:],duration=80,loop=0,disposal=2,transparency=255)
sheet=Image.new('RGBA',(128*6,128*4))
for i,frame in enumerate(frames):sheet.paste(frame.resize((128,128)),((i%6)*128,(i//6)*128))
sheet.save(out/'sparkle-sprite.png')
mascot=Image.new('RGBA',(256,256));d=ImageDraw.Draw(mascot)
star(d,128,128,113,(158,125,226,255));star(d,128,128,94,(184,161,240,255))
d.ellipse((90,110,104,131),fill=(66,46,106,255));d.ellipse((152,110,166,131),fill=(66,46,106,255))
d.arc((108,129,148,157),0,180,fill=(95,61,147,255),width=5)
d.ellipse((68,140,91,151),fill=(237,177,206,255));d.ellipse((165,140,188,151),fill=(237,177,206,255))
mascot.save(out/'scope-mascot.png')
Path('src/demo-avatar.js').write_text("export const avatarDataURI = 'data:image/png;base64,"+base64.b64encode((out/'scope-mascot.png').read_bytes()).decode()+"';\n",encoding='utf-8')
(out/'scope-mascot.atlas').write_text('scope-mascot.png\nsize: 256, 256\nfilter: Linear, Linear\npma: false\nmascot\n  bounds: 0, 0, 256, 256\n',encoding='utf-8')
skeleton={'skeleton':{'hash':'motionscope-original','spine':'4.2.0','x':-128,'y':0,'width':256,'height':256},'bones':[{'name':'root'},{'name':'body','parent':'root','y':128}],'slots':[{'name':'body','bone':'body','attachment':'mascot'}],'skins':[{'name':'default','attachments':{'body':{'mascot':{'width':256,'height':256}}}},{'name':'tiny','attachments':{'body':{'mascot':{'width':180,'height':180}}}}],'animations':{'float':{'bones':{'body':{'translate':[{'x':0,'y':0},{'time':.5,'x':0,'y':20},{'time':1,'x':0,'y':0}],'rotate':[{'value':-8},{'time':.5,'value':8},{'time':1,'value':-8}]}}},'hello':{'bones':{'body':{'rotate':[{'value':0},{'time':.2,'value':-20},{'time':.4,'value':20},{'time':.6,'value':-20},{'time':.8,'value':0}]}}}}}
(out/'scope-mascot.json').write_text(json.dumps(skeleton,ensure_ascii=False),encoding='utf-8')
print('Generated GIF, APNG, WebP, spritesheet and Spine 4.2 sample bundle.')
