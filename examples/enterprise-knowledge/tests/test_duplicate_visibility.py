"""Exact-body visibility tests in an isolated database, not enterprise SSO."""
import tempfile
import unittest

from app.storage import Storage, AppError, digest
from app.retrieval import Retriever


class DuplicateVisibilityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = Storage(self.tmp.name)
        self.add_copy(1, 'source-a', 'First title')
        self.add_copy(2, 'source-b', 'Different title')

    def add_copy(self, row, identity, title):
        body = 'zebra exact controlled text'
        with self.store.connect() as db:
            db.execute('INSERT INTO passages VALUES(?,?,?,?,?,?,?)',
                       (row, identity, body, title, 'https://example.test/'+identity, digest(body), 'fixture'))
            db.execute('INSERT INTO passage_fts(rowid,id,title,text) VALUES(?,?,?,?)',
                       (row, identity, title, body))

    def event(self, identity, revision, operation, allowed=()):
        return self.store.apply_event({'event_id': f'{identity}-{revision}', 'passage_id': identity,
            'revision': revision, 'operation': operation, 'allowed_principals': list(allowed),
            'label': 'controlled_experiment'})

    def test_restriction_hides_identical_body_with_another_id_and_title(self):
        self.event('source-a', 1, 'restrict', ['support'])
        with self.assertRaises(AppError):
            self.store.get('source-b')
        self.assertEqual(self.store.get('source-b', 'support')['id'], 'source-b')
        self.assertEqual(self.store.list_passages()['items'], [])
        self.assertEqual(Retriever(self.store).search('zebra', 'bm25')['results'], [])

    def test_restoring_one_source_preserves_other_sources_restriction(self):
        self.event('source-a', 1, 'restrict', ['support'])
        self.event('source-b', 1, 'restrict', ['public'])
        for principal in ('public', 'support'):
            with self.assertRaises(AppError):
                self.store.get('source-a', principal)
        self.event('source-a', 2, 'restore')
        with self.assertRaises(AppError):
            self.store.get('source-a', 'support')
        self.assertEqual(self.store.get('source-a', 'public')['id'], 'source-a')

    def test_later_ingested_copy_inherits_existing_delete(self):
        self.event('source-a', 1, 'delete')
        self.add_copy(3, 'later-copy', 'Late import')
        self.assertIn('later-copy', self.store.allowed_ids('public'))
        with self.assertRaises(AppError):
            self.store.get('later-copy', 'support')


if __name__ == '__main__':
    unittest.main()
