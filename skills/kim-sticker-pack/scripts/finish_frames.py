#!/usr/bin/env python3
"""Compose supplied motion frames, authored timing and fixed caption. Never generates motion."""
import argparse, hashlib, html, json, shutil, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageColor
from fontTools.ttLib import TTFont
from media_io import palette_frames,validate,load_rights

def local_file(base,value):
    if not isinstance(value,str) or not value: raise ValueError('File path must be a nonempty string')
    rel=Path(value)
    if rel.is_absolute(): raise ValueError('Manifest paths must be relative to manifest directory')
    path=(base/rel).resolve()
    if not path.is_relative_to(base.resolve()): raise ValueError('Path escapes manifest directory')
    if not path.is_file(): raise ValueError('Input file does not exist: '+value)
    return path

MAX_SOURCE_EDGE=4096
MAX_FRAME_PIXELS=4_000_000
MAX_SOURCE_PIXELS=24_000_000
MAX_OUTPUT_PIXELS=16_000_000
MAX_SOURCE_BYTES=32*1024*1024

def preflight_frames(base,entries,size):
    if len(entries)*size*size>MAX_OUTPUT_PIXELS:raise ValueError('Output frame pixel budget exceeded; reduce size or frame count')
    total=0;paths=[];canvas=None
    for entry in entries:
        if not isinstance(entry,dict):raise ValueError('Every frame entry must be an object')
        file=local_file(base,entry['file'])
        if file.stat().st_size>MAX_SOURCE_BYTES:raise ValueError('Source file byte budget exceeded')
        with Image.open(file) as image:
            width,height=image.size
            if image.format!='PNG' or getattr(image,'n_frames',1)!=1:raise ValueError('Each source must be one static PNG frame')
            if max(width,height)>MAX_SOURCE_EDGE or width*height>MAX_FRAME_PIXELS:raise ValueError('Source frame dimensions/pixel budget exceeded')
            if canvas is not None and image.size!=canvas:raise ValueError('All source frames must share one registered canvas size')
            canvas=image.size;total+=width*height
        if total>MAX_SOURCE_PIXELS:raise ValueError('Total source pixel budget exceeded; reduce source resolution')
        paths.append(file)
    return paths

def check_font(path,index,text):
    font=TTFont(path,fontNumber=index,lazy=True)
    try: available=set().union(*(set(t.cmap) for t in font['cmap'].tables if t.isUnicode()))
    finally: font.close()
    missing=[c for c in text if not c.isspace() and ord(c) not in available]
    if missing:raise ValueError('Font missing glyphs: '+''.join(sorted(set(missing))))

def finish(manifest,out,font_path,font_index=0,commercial=False):
    manifest=Path(manifest);base=manifest.parent;out=Path(out)
    if out.exists() or out.is_symlink():raise ValueError('Output already exists; choose a new directory')
    if manifest.stat().st_size>1024*1024:raise ValueError('Manifest exceeds 1 MiB')
    m=json.loads(manifest.read_text(encoding='utf-8'))
    if not isinstance(m,dict):raise ValueError('Manifest must be a JSON object')
    rights=load_rights(local_file(base,m['rights']),commercial)
    for key in ['name','font_license','animation_method']:
        if not isinstance(m.get(key),str) or not m[key].strip():raise ValueError('Missing '+key)
    if commercial and (not isinstance(m.get('font_commercial_evidence'),str) or not m['font_commercial_evidence'].strip()):raise ValueError('Commercial font evidence required')
    size=m.get('size',320);font_size=m.get('font_size',40);reserve=m.get('caption_area',64);budget=m.get('max_bytes',1048576)
    if not isinstance(size,int) or not 128<=size<=1024:raise ValueError('size must be 128..1024')
    if not isinstance(font_size,int) or not size*.08<=font_size<=size*.2:raise ValueError('Font size must remain readable at chat size')
    if not isinstance(reserve,int) or not size*.15<=reserve<=size*.45:raise ValueError('Invalid caption area')
    if not isinstance(budget,int) or budget<=0:raise ValueError('max_bytes must be positive')
    lines=m.get('caption_lines')
    if not isinstance(lines,list) or not 1<=len(lines)<=2 or any(not isinstance(x,str) or not x.strip() or '\n' in x for x in lines):raise ValueError('Use one or two explicit nonempty caption lines')
    if Path(font_path).stat().st_size>MAX_SOURCE_BYTES:raise ValueError('Font file exceeds 32 MiB')
    for color in [m.get('ink','#25375C'),m.get('outline','#FFFFFF')]:
        if not isinstance(color,str):raise ValueError('Colors must be CSS-style color strings')
        try:ImageColor.getrgb(color)
        except ValueError:raise ValueError('Invalid text color: '+color)
    check_font(font_path,font_index,''.join(lines));font=ImageFont.truetype(str(font_path),font_size,index=font_index)
    entries=m.get('frames')
    if not isinstance(entries,list) or not 3<=len(entries)<=120:raise ValueError('Provide 3 to 120 genuine ordered motion frames')
    source_paths=preflight_frames(base,entries,size)
    phases={'anticipation','action','follow-through','settle','hold'};frames=[];durations=[];inputs=[]
    for source_index,item in enumerate(entries):
        if not isinstance(item,dict):raise ValueError('Every frame entry must be an object')
        duration=item.get('duration_ms')
        if type(duration)!=int or not 20<=duration<=655350 or duration%10:raise ValueError('Frame duration must be 20..655350ms in 10ms increments')
        if item.get('phase') not in phases:raise ValueError('Describe the semantic phase of every frame')
        file=source_paths[source_index]
        with Image.open(file) as source:im=source.convert('RGBA')
        if not im.getchannel('A').getbbox() or im.getchannel('A').getextrema()[0]!=0:raise ValueError('Frame must contain visible art and transparent background')
        bbox=im.getchannel('A').getbbox()
        if bbox[0]==0 or bbox[1]==0 or bbox[2]==im.width or bbox[3]==im.height:raise ValueError('Source frame touches canvas edge; repair truncated art before composition')
        if frames and im.size!=frames[0].size:raise ValueError('All source frames must share one registered canvas size')
        frames.append(im);durations.append(duration);inputs.append({'file':item['file'],'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'duration_ms':duration,'phase':item['phase']})
    if 'action' not in [x['phase'] for x in entries]:raise ValueError('No actual action phase supplied')
    if len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames})<3:raise ValueError('At least 3 distinct source frames required; static holds are not motion')
    # One union crop across all frames preserves registration and avoids tiny characters.
    crop_box=None
    if m.get('crop_to_content',True):
        union=Image.new('L',frames[0].size)
        for frame in frames:union=ImageChops.lighter(union,frame.getchannel('A'))
        crop_box=union.getbbox();frames=[f.crop(crop_box) for f in frames]
    layout=m.get('layout',{})
    if not isinstance(layout,dict):raise ValueError('layout must be a JSON object')
    position=layout.get('position','bottom');angle=layout.get('angle_deg',0)
    if position not in ['top','bottom','overlay']:raise ValueError('position must be top, bottom or overlay')
    if type(angle) not in [int,float] or not math.isfinite(angle) or abs(angle)>30:raise ValueError('angle_deg must be finite and within -30..30')
    # Same scale and offset for every frame. Overlay intentionally permits torso overlap.
    region=layout.get('art_region',[8,reserve+6,size-16,size-reserve-12] if position=='top' else [8,6,size-16,size-12 if position=='overlay' else size-reserve-12])
    if not isinstance(region,list) or len(region)!=4 or any(type(v)!=int for v in region):raise ValueError('art_region must contain integer x,y,width,height')
    rx,ry,rw,rh=region
    if min(rx,ry)<4 or min(rw,rh)<=0 or rx+rw>size-4 or ry+rh>size-4:raise ValueError('art_region violates canvas safe margin')
    scale=min(rw/frames[0].width,rh/frames[0].height)
    w,h=round(frames[0].width*scale),round(frames[0].height*scale);offset=(rx+(rw-w)//2,ry)
    caption=Image.new('RGBA',(size,size));draw=ImageDraw.Draw(caption);stroke=max(2,round(size*.01));line_height=round(font_size*1.3)
    total_height=line_height*len(lines)
    if total_height>reserve-8:raise ValueError('Caption area too small; enlarge area or revise line layout')
    y=size-reserve+(reserve-total_height)//2
    for line in lines:
        box=draw.textbbox((0,0),line,font=font,stroke_width=stroke)
        if box[2]-box[0]>size-16:raise ValueError('Caption too wide; use two lines or revise layout, not tiny text')
        draw.text((size/2,y),line,font=font,anchor='mt',fill=m.get('ink','#25375C'),stroke_width=stroke,stroke_fill=m.get('outline','#FFFFFF'));y+=line_height
    # Crop only the caption layer, rotate it, then place at explicit fixed center.
    text_layer=caption.crop(caption.getbbox())
    if angle:text_layer=text_layer.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
    default_center=[size/2,reserve/2] if position=='top' else [size/2,size*.74] if position=='overlay' else None
    center=layout.get('center')
    if center is None:center=default_center
    if center is not None or angle:
        if center is None:center=[size/2,size-reserve/2]
        if not isinstance(center,list) or len(center)!=2 or any(type(v) not in [int,float] or not math.isfinite(v) for v in center):raise ValueError('caption center must be two finite pixel coordinates')
        x,y=round(center[0]-text_layer.width/2),round(center[1]-text_layer.height/2)
        if min(x,y)<4 or x+text_layer.width>size-4 or y+text_layer.height>size-4:raise ValueError('Caption rotation/position violates safe margin')
        caption=Image.new('RGBA',(size,size));caption.alpha_composite(text_layer,(x,y))
    caption_alpha=caption.getchannel('A');protection_count=0
    finished=[]
    for n,source in enumerate(frames):
        protected=entries[n].get('protected_regions',[])
        if not isinstance(protected,list):raise ValueError('protected_regions must be a list')
        for box in protected:
            if not isinstance(box,list) or len(box)!=4 or any(type(v)!=int for v in box):raise ValueError('protected_regions use integer left,top,right,bottom output coordinates')
            left,top,right,bottom=box
            if not 0<=left<right<=size or not 0<=top<bottom<=size:raise ValueError('Invalid protected region')
            protection_count+=1
            if caption_alpha.crop(box).getbbox():raise ValueError('Caption overlaps marked eyes/expression/gesture region in frame '+str(n))
        f=Image.new('RGBA',(size,size));f.alpha_composite(source.resize((w,h),Image.Resampling.LANCZOS),offset);f.alpha_composite(caption);finished.append(f)
    out.mkdir(parents=True);(out/'frames').mkdir();(out/'source').mkdir()
    reproducible=json.loads(json.dumps(m));reproducible['rights']='rights.json'
    for i,item in enumerate(entries):
        src=local_file(base,item['file']);relative=f'source/{i:03d}.png';shutil.copy2(src,out/relative);reproducible['frames'][i]['file']=relative
    (out/'manifest.json').write_text(json.dumps(reproducible,ensure_ascii=False,indent=2),encoding='utf-8')
    for i,f in enumerate(finished):f.save(out/'frames'/f'{i:03d}.png')
    encoded=palette_frames(finished);dest=out/'sticker.gif'
    encoded[0].save(dest,save_all=True,append_images=encoded[1:],duration=durations,loop=0,disposal=2,transparency=0,optimize=False)
    report=validate(dest,budget);report.update({'name':m['name'],'caption_lines':lines,'font_sha256':hashlib.sha256(Path(font_path).read_bytes()).hexdigest(),'font_index':font_index,'font_license':m['font_license'],'animation_method':m['animation_method'],'source_frames':inputs,'common_crop':crop_box,'layout':{'position':position,'angle_deg':angle,'caption_center':center,'art_region':region,'caption_bbox':caption.getbbox()},'marked_regions_checked':protection_count,'semantic_occlusion_review':'pending; only user-specified regions are mechanically checked','actual_role':'Compositing, caption rendering and authored timing only. Does not generate or certify natural character motion.','visual_review':'pending','user_approval':'not_inferred'})
    if report['duration_ms']!=sum(durations):report['errors'].append('encoded-duration-mismatch')
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');shutil.copy2(manifest,out/'input-manifest.json');(out/'rights.json').write_text(json.dumps(rights,ensure_ascii=False,indent=2),encoding='utf-8')
    # All-frame contact sheets and actual 160px display previews.
    for label,bg in [('light','white'),('dark','#171C27')]:
        cols=min(8,len(finished));rows=(len(finished)+cols-1)//cols;board=Image.new('RGB',(cols*160,rows*180),bg);d=ImageDraw.Draw(board)
        for i,f in enumerate(finished):
            tile=f.resize((160,160),Image.Resampling.LANCZOS);x=(i%cols)*160;y=(i//cols)*180;board.paste(tile,(x,y),tile);d.text((x+3,y+162),f'{i:02d} {durations[i]}ms',fill='black' if label=='light' else 'white')
        board.save(out/f'chat-160-{label}.png')
    (out/'DISTRIBUTION-NOTICE.txt').write_text('This workspace includes supplied source PNGs, original manifest, rights and attribution metadata, and file hashes. Review these files for private paths, notes, reference data and redistribution rights before sharing. Do not distribute the entire workspace by default. The preview GIF alone still requires character, font and other applicable rights. No natural-motion or approval claim is made.',encoding='utf-8')
    (out/'preview.html').write_text('<!doctype html><meta charset="utf-8"><title>'+html.escape(m['name'])+'</title><style>figure{display:inline-block;padding:24px}img{width:160px;height:160px}</style><h1>'+html.escape(m['name'])+'</h1><p>真实播放两轮后复核动作和中文。自动技术检查不代表自然动作或用户认可。</p><figure style="background:white"><img src="sticker.gif"></figure><figure style="background:#171C27"><img src="sticker.gif"></figure>',encoding='utf-8')
    print(json.dumps({'out':str(out),'frames':report['frames'],'duration_ms':report['duration_ms'],'bytes':report['bytes'],'errors':report['errors']},ensure_ascii=False))
    if report['errors']:raise ValueError('Technical validation failed; inspect report.json; do not deliver as finished')
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('manifest');p.add_argument('out');p.add_argument('--font',required=True);p.add_argument('--font-index',type=int,default=0);p.add_argument('--commercial',action='store_true')
    a=p.parse_args()
    try:finish(a.manifest,a.out,a.font,a.font_index,a.commercial)
    except (ValueError,OSError,KeyError,TypeError) as e:p.exit(2,str(e)+'\n')
