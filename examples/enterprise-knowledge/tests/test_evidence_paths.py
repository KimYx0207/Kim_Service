"""Controlled file/child-command checks; never launch an API or browser."""
import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from scripts import ingest

capture_path = Path(__file__).resolve().parents[1] / 'scripts/capture-tutorial.py'
spec = importlib.util.spec_from_file_location('capture_tutorial_under_test', capture_path)
capture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capture)


def controlled_source(root):
    source = root / 'source'
    source.mkdir(parents=True)
    with zipfile.ZipFile(source/'cloud.jsonl.zip', 'w') as archive:
        archive.writestr('cloud.jsonl', json.dumps({'_id': 'fixture-1', 'text': 'controlled fixture'})+'\n')
    queries = ''.join(json.dumps({'_id': f'q-{i}', 'text': 'controlled query'})+'\n' for i in range(188))
    for name in ('cloud_lastturn.jsonl', 'cloud_questions.jsonl', 'cloud_rewrite.jsonl'):
        (source/name).write_text(queries)
    (source/'qrels.tsv').write_text('query-id\tcorpus-id\tscore\n'+
        ''.join(f'q-{i % 188}\tfixture-1\t1\n' for i in range(494)))
    (source/'LICENSE').write_text('Controlled test fixture, not official corpus bytes')


class EvidencePathTests(unittest.TestCase):
    def test_ingest_custom_manifest_isolated_and_default_remains_compatible(self):
        for custom in (True, False):
            with self.subTest(custom=custom), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                controlled_source(root/'data')
                target = root/'isolated/report.json' if custom else root/'evidence/ingest-manifest.json'
                args = ['ingest.py', '--data-dir', str(root/'data')]
                if custom:
                    args += ['--output-manifest', str(target)]
                with patch.object(ingest, 'ROOT', root), patch('sys.argv', args), \
                        patch('scripts.ingest.urllib.request.urlopen') as network, \
                        contextlib.redirect_stdout(io.StringIO()):
                    ingest.main()
                    ingest.main()
                network.assert_not_called()
                result = json.loads(target.read_text())
                self.assertEqual(result['validation']['passages'], 1)
                if custom:
                    self.assertFalse((root/'evidence/ingest-manifest.json').exists())

    def test_capture_passes_selected_data_root_without_starting_a_child(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            data = root/'chosen-data'
            output = root/'captures'
            args = ['capture-tutorial.py', '--data-dir', str(data), '--output', str(output),
                    '--port', '4187', '--browser-path', '/controlled/not-a-browser']
            with patch('sys.argv', args), patch.object(capture.subprocess, 'Popen',
                    side_effect=RuntimeError('controlled stop before creating any process')) as child, \
                    patch.object(capture.urllib.request, 'urlopen') as network, \
                    patch.object(capture.socket, 'socket') as sockets, \
                    contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(capture.main(), 2)
            command = child.call_args.args[0]
            self.assertEqual(command[command.index('--data-dir')+1], str(data.resolve()))
            run = json.loads((output/'manifest.json').read_text())['runs'][-1]
            self.assertEqual(run['data_dir'], str(data.resolve()))
            self.assertEqual(run['status'], 'blocked')
            self.assertEqual(run['steps'], [])
            network.assert_not_called()
            sockets.assert_not_called()

    def test_capture_omitted_data_dir_preserves_environment_and_default(self):
        for value in (None, 'isolated-relative-data', '/controlled/absolute-data'):
            with self.subTest(environment=value), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                environment = {} if value is None else {'KNOWLEDGE_DATA_DIR': value}
                output = root/'captures'
                args = ['capture-tutorial.py', '--output', str(output), '--port', '4187',
                        '--browser-path', '/controlled/not-a-browser']
                with patch.dict(capture.os.environ, environment, clear=True), patch.object(capture, 'ROOT', root), \
                        patch('sys.argv', args), patch.object(capture.subprocess, 'Popen',
                        side_effect=RuntimeError('controlled stop before process creation')) as child, \
                        contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                    self.assertEqual(capture.main(), 2)
                self.assertNotIn('--data-dir', child.call_args.args[0], 'Let the API retain its existing environment/default resolution')
                expected = Path(value) if value is not None else root/'data'
                if not expected.is_absolute():
                    expected = root/expected
                run = json.loads((output/'manifest.json').read_text())['runs'][-1]
                self.assertEqual(run['data_dir'], str(expected.resolve()))


if __name__ == '__main__':
    unittest.main()
