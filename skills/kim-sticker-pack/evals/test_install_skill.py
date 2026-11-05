import hashlib
from pathlib import Path
import sys,tempfile,unittest
sys.path.insert(0,str(Path(__file__).parents[1]/'scripts'))
from install_skill import install
SOURCE=Path(__file__).parents[1]
class InstallationTests(unittest.TestCase):
 def test_both_project_hosts_copy_complete_package(self):
  for host,directory in [('codex','.agents'),('claude','.claude')]:
   with tempfile.TemporaryDirectory() as tmp:
    target=install(host,tmp)
    self.assertEqual(target,Path(tmp).resolve()/directory/'skills/kim-sticker-pack')
    for src in SOURCE.rglob('*'):
     if src.is_file() and '__pycache__' not in src.parts and src.suffix!='.pyc':
      self.assertEqual(src.read_bytes(),(target/src.relative_to(SOURCE)).read_bytes())
    header=(target/'SKILL.md').read_text(encoding='utf-8').split('---',2)[1]
    self.assertIn('name: kim-sticker-pack',header);self.assertIn('description:',header)
    self.assertNotIn('allowed-tools:',header)
 def test_existing_install_is_preserved(self):
  with tempfile.TemporaryDirectory() as tmp:
   target=install('codex',tmp);(target/'user-note.txt').write_text('keep')
   with self.assertRaisesRegex(ValueError,'already'):install('codex',tmp)
   self.assertEqual((target/'user-note.txt').read_text(),'keep')
 def test_reject_symlink_target(self):
  with tempfile.TemporaryDirectory() as tmp:
   parent=Path(tmp)/'.claude/skills';parent.mkdir(parents=True)
   try:(parent/'kim-sticker-pack').symlink_to(Path(tmp)/'absent')
   except OSError as error:self.skipTest(str(error))
   with self.assertRaisesRegex(ValueError,'symlink'):install('claude',tmp)
 def test_invalid_scope_and_host(self):
  with tempfile.TemporaryDirectory() as tmp:
   for host,project,user in [('other',tmp,False),('codex',None,False),('claude',tmp,True)]:
    with self.assertRaises(ValueError):install(host,project,user)
if __name__=='__main__':unittest.main()
