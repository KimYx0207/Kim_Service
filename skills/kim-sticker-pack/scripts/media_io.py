"""Shared GIF encoding and technical checks. No character-motion generation."""
import hashlib,json
from pathlib import Path
from PIL import Image,ImageChops

def pixels(image):
    return image.get_flattened_data() if hasattr(image,'get_flattened_data') else image.getdata()

def palette_frames(frames):
    # One shared 255-colour palette plus reserved transparent slot prevents flicker.
    atlas=Image.new('RGB',(frames[0].width,len(frames)*frames[0].height),(255,255,255))
    for i,f in enumerate(frames): atlas.paste(f,(0,i*f.height),f)
    palette=atlas.quantize(colors=255,method=Image.Quantize.MEDIANCUT)
    table=[0,0,0]+palette.getpalette()[:765]
    result=[]
    for f in frames:
        rgb=Image.new('RGB',f.size,(255,255,255)); rgb.paste(f,mask=f.getchannel('A'))
        q=rgb.quantize(palette=palette,dither=Image.Dither.NONE)
        q.putdata([v+1 if a>=128 else 0 for v,a in zip(pixels(q),pixels(f.getchannel('A')))])
        q.putpalette(table); q.info['transparency']=0
        result.append(q)
    return result

def validate(path, max_bytes):
    with Image.open(path) as im:
        loop=im.info.get('loop'); frames=[]; durations=[]
        for i in range(im.n_frames):
            im.seek(i); frames.append(im.convert('RGBA')); durations.append(im.info.get('duration',0))
    unique=len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames})
    alpha=[f.getchannel('A') for f in frames]
    clear=all(a.getextrema()==(0,255) for a in alpha)
    clipped=any(a.crop((0,0,a.width,1)).getbbox() or a.crop((0,a.height-1,a.width,a.height)).getbbox() or a.crop((0,0,1,a.height)).getbbox() or a.crop((a.width-1,0,a.width,a.height)).getbbox() for a in alpha)
    def delta(a,b):
        # Compare visible results on both backgrounds so alpha-only motion counts.
        scores=[]
        for color in [(255,255,255,255),(0,0,0,255)]:
            aa=Image.alpha_composite(Image.new('RGBA',a.size,color),a).convert('RGB')
            bb=Image.alpha_composite(Image.new('RGBA',b.size,color),b).convert('RGB')
            scores.append(sum(pixels(ImageChops.difference(aa,bb).resize((64,64)).convert('L')))/(64*64))
        return max(scores)
    adjacent=[delta(frames[i],frames[(i+1)%len(frames)]) for i in range(len(frames))]
    errors=[]
    if unique<3: errors.append('not-animated')
    if loop!=0: errors.append('not-infinite-loop')
    if not clear: errors.append('missing-transparency')
    if clipped: errors.append('opaque-edge-clipping')
    if not all(d>0 for d in durations): errors.append('invalid-duration')
    if path.stat().st_size>max_bytes: errors.append('over-size-budget')
    if adjacent[-1]>max(1, max(adjacent[:-1],default=0)*1.75): errors.append('loop-seam-outlier')
    return {'file':path.name,'width':frames[0].width,'height':frames[0].height,'frames':len(frames),'unique_frames':unique,'duration_ms':sum(durations),'loop':loop,'bytes':path.stat().st_size,'transparent_every_frame':clear,'edge_clipping':bool(clipped),'loop_seam_delta':round(adjacent[-1],3),'max_adjacent_delta':round(max(adjacent),3),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'errors':errors,'visual_review':'pending'}

def load_rights(path,commercial=False):
    if Path(path).stat().st_size>128*1024:raise ValueError('Rights metadata exceeds 128 KiB')
    rights=json.loads(Path(path).read_text(encoding='utf-8'))
    if not isinstance(rights,dict): raise ValueError('Rights must be a JSON object')
    if not isinstance(rights.get('commercial_use'),bool): raise ValueError('commercial_use must be a boolean')
    for k in ['character','source','license','attribution']:
        if not isinstance(rights.get(k),str) or not rights[k].strip(): raise ValueError('Missing rights field: '+k)
    if commercial and rights['commercial_use'] is not True:
        raise ValueError('Commercial output blocked: rights not explicitly eligible')
    if rights['commercial_use'] is True and (not isinstance(rights.get('commercial_evidence'),str) or not rights['commercial_evidence'].strip()):
        raise ValueError('Commercial eligibility needs source evidence, not only a boolean')
    return rights
