import contextlib,io,json,sys,tempfile,unittest,os,atexit
from unittest.mock import patch
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).parents[1]/'scripts'))
from finish_frames import finish,local_file,check_font,preflight_frames
from media_io import load_rights
from fontTools.ttLib import TTCollection
from font_fixture import build_fixture_font
def discover_font():
 explicit=os.environ.get('STICKER_TEST_FONT')
 if os.environ.get('STICKER_TEST_SYNTHETIC')=='1':
  if explicit:raise RuntimeError('Do not combine explicit font with forced synthetic fixture')
  return None,0
 candidates=[Path(explicit)] if explicit else [Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'),Path(os.environ.get('WINDIR','C:/Windows'))/'Fonts/msyh.ttc',Path(os.environ.get('WINDIR','C:/Windows'))/'Fonts/simhei.ttf',Path('/System/Library/Fonts/PingFang.ttc')]
 for path in candidates:
  if not path.is_file():continue
  if os.environ.get('STICKER_TEST_FONT_INDEX') is not None:indices=[int(os.environ['STICKER_TEST_FONT_INDEX'])]
  elif path.suffix.lower()=='.ttc':
   collection=TTCollection(path,lazy=True);indices=list(range(len(collection.fonts)));collection.close()
  else:indices=[0]
  for index in indices:
   try:check_font(path,index,'收到');return path,index
   except (ValueError,KeyError):continue
 if explicit:raise RuntimeError('Configured STICKER_TEST_FONT/INDEX cannot render required Chinese glyphs')
 return None,0
REAL_FONT,REAL_FONT_INDEX=discover_font()
FONT,FONT_INDEX=REAL_FONT,REAL_FONT_INDEX
if FONT is None:
 _fixture_dir=tempfile.TemporaryDirectory(prefix='sticker-test-font-')
 atexit.register(_fixture_dir.cleanup)
 FONT=build_fixture_font(Path(_fixture_dir.name)/'test-geometry.ttf');FONT_INDEX=0
FONT_NOTE='Real system CJK font, test only' if REAL_FONT is not None else 'Synthetic geometry font; does not validate readable Chinese'

class ExportTests(unittest.TestCase):
 def fixture(self,root):
  for n,x in enumerate([0,6,3]):
   im=Image.new('RGBA',(160,160));ImageDraw.Draw(im).rectangle((40+x,20,100+x,140),fill=(0,255,0,255));im.save(root/f'{n}.png')
  (root/'rights.json').write_text(json.dumps(dict(character='测试角色',source='synthetic test only',license='test',commercial_use=False,attribution='test')),encoding='utf-8')
  return dict(name='测试',rights='rights.json',font_license=FONT_NOTE,animation_method='synthetic regression fixture, not character generation',caption_lines=['收到'],frames=[dict(file=f'{n}.png',duration_ms=d,phase=p) for n,d,p in [(0,200,'anticipation'),(1,100,'action'),(2,400,'settle')]])
 def run_case(self,root,m):
  p=root/'manifest.json';p.write_text(json.dumps(m,ensure_ascii=False),encoding='utf-8')
  with contextlib.redirect_stdout(io.StringIO()):return finish(p,root/'out',FONT,FONT_INDEX)
 def test_timing_transparency_and_fixed_caption(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);r=self.run_case(root,self.fixture(root));self.assertEqual(r['duration_ms'],700);self.assertEqual(r['errors'],[]);self.assertEqual(r['caption_lines'],['收到']);self.assertEqual(r['user_approval'],'not_inferred')
   fs=[Image.open(root/'out/frames'/f'{i:03d}.png').convert('RGBA') for i in range(3)];self.assertEqual(fs[0].crop((0,256,320,320)).tobytes(),fs[1].crop((0,256,320,320)).tobytes())
 @unittest.skipUnless(REAL_FONT is not None,'No real CJK font: synthetic fixture does not validate Chinese rendering')
 def test_real_chinese_font_rendering(self):
  # Actual font loading/rendering only; readability still requires visual review.
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);r=self.run_case(root,self.fixture(root));self.assertEqual(r['caption_lines'],['收到'])
   self.assertTrue((root/'out/chat-160-dark.png').is_file())
 def test_source_edge_rejected_before_crop(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);m=self.fixture(root);im=Image.open(root/'0.png').convert('RGBA');ImageDraw.Draw(im).rectangle((0,20,40,100),fill='red');im.save(root/'0.png')
   with self.assertRaisesRegex(ValueError,'Source frame touches'):self.run_case(root,m)
   self.assertFalse((root/'out').exists())
 def test_top_and_tilted_overlay(self):
  for layout in [{'position':'top'},{'position':'overlay','center':[160,230],'angle_deg':-12}]:
   with tempfile.TemporaryDirectory() as t:
    root=Path(t);m=self.fixture(root);m['layout']=layout;r=self.run_case(root,m);self.assertEqual(r['errors'],[]);self.assertEqual(r['layout']['position'],layout['position']);self.assertEqual(r['semantic_occlusion_review'],'pending; only user-specified regions are mechanically checked')
 def test_protected_gesture_overlap_rejected(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);m=self.fixture(root);m['layout']={'position':'overlay','center':[160,230],'angle_deg':-12};m['frames'][1]['protected_regions']=[[100,180,220,280]]
   with self.assertRaisesRegex(ValueError,'Caption overlaps'):self.run_case(root,m)
 def test_caption_safe_margin(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);m=self.fixture(root);m['layout']={'position':'top','center':[10,10],'angle_deg':-12}
   with self.assertRaisesRegex(ValueError,'safe margin'):self.run_case(root,m)
 def test_invalid_layout_and_center(self):
  for layout in [[],{'position':'top','center':[]}]:
   with tempfile.TemporaryDirectory() as t:
    root=Path(t);m=self.fixture(root);m['layout']=layout
    with self.assertRaises(ValueError):self.run_case(root,m)
 def test_null_center_uses_position_default(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);m=self.fixture(root);m['layout']={'position':'top','center':None};r=self.run_case(root,m);self.assertEqual(r['layout']['caption_center'],[160,32])
 def test_invalid_rights_fields(self):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t)/'rights.json'
   for value in [None,[],{'character':'x','source':None,'license':'x','commercial_use':False,'attribution':'x'},{'character':'x','source':'x','license':'x','commercial_use':'yes','attribution':'x'}]:
    p.write_text(json.dumps(value),encoding='utf-8')
    with self.assertRaises(ValueError):load_rights(p)
 def test_symlink_input_escape(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);base=root/'input';base.mkdir();outside=root/'outside.png';outside.write_bytes(b'x')
   try:(base/'link.png').symlink_to(outside)
   except OSError as e:self.skipTest('Platform disallows symlink creation: '+str(e))
   with self.assertRaisesRegex(ValueError,'escapes'):local_file(base,'link.png')
 def test_source_dimension_limit_before_decode(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);Image.new('RGBA',(4097,1)).save(root/'wide.png')
   with patch.object(Image.Image,'convert',side_effect=AssertionError('must not decode')):
    with self.assertRaisesRegex(ValueError,'dimensions'):preflight_frames(root,[{'file':'wide.png'}],320)
 def test_source_total_pixel_limit(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);self.fixture(root)
   with patch('finish_frames.MAX_SOURCE_PIXELS',50_000):
    with self.assertRaisesRegex(ValueError,'Total source'):preflight_frames(root,[{'file':f'{i}.png'} for i in range(3)],320)
 def test_output_pixel_limit(self):
  with tempfile.TemporaryDirectory() as t:
   with self.assertRaisesRegex(ValueError,'Output frame'):preflight_frames(Path(t),[{}]*120,1024)
 def test_invalid_color_and_regions(self):
  for field,value in [('ink','not-a-colour'),('protected_regions',None),('protected_regions',[[-1,0,10,10]]),('protected_regions',[[0,0,500,20]])]:
   with tempfile.TemporaryDirectory() as t:
    root=Path(t);m=self.fixture(root)
    if field=='ink':m[field]=value
    else:m['frames'][0][field]=value
    with self.assertRaises(ValueError):self.run_case(root,m)
    self.assertFalse((root/'out').exists())
 def test_path_escape(self):
  with tempfile.TemporaryDirectory() as t:
   with self.assertRaises(ValueError):local_file(Path(t),'../secret')
 def test_missing_glyph(self):
  with self.assertRaises(ValueError):check_font(FONT,FONT_INDEX,'\U0010ffff')
 def test_static_frames_rejected(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);m=self.fixture(root)
   for f in m['frames']:f['file']='0.png'
   with self.assertRaisesRegex(ValueError,'distinct'):self.run_case(root,m)
 def test_tiny_text_rejected(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);m=self.fixture(root);m['font_size']=10
   with self.assertRaisesRegex(ValueError,'readable'):self.run_case(root,m)
 def test_timing_overflow_rejected(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);m=self.fixture(root);m['frames'][0]['duration_ms']=655360
   with self.assertRaisesRegex(ValueError,'duration'):self.run_case(root,m)
 def test_no_overwrite(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);m=self.fixture(root)
   try:(root/'out').symlink_to(root/'absent')
   except OSError as e:self.skipTest('Platform disallows symlink creation: '+str(e))
   with self.assertRaisesRegex(ValueError,'already'):self.run_case(root,m)
if __name__=='__main__':unittest.main()
