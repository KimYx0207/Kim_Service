import test from 'node:test';
import assert from 'node:assert/strict';
import {createTaskDraftStore,parseTaskDraft,serializeTaskDraft} from '../src/data/task-drafts.mjs';

const draft={goal:'修好后继续',materials:'保留原文件',host:'meta-kim',request:'手写授权与下一步',componentVersion:'0.1.0',manual:true,previousRequest:''};
function fixture(){
  const records=new Map();
  const storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value),removeItem:key=>records.delete(key)};
  const create=()=>createTaskDraftStore({getStorage:()=>storage,keyPrefix:'test-draft'});
  return {records,storage,create};
}
test('a fresh page restores independent tasks, manual text and an intentionally empty undo version',()=>{
  const f=fixture(),first=f.create();
  first.set('task-a',draft);first.set('task-b',{...draft,goal:'另一项任务'});
  const next=f.create();assert.deepEqual(next.get('task-a'),draft);assert.equal(next.status('task-a'),'restored');
  assert.equal(next.get('task-b').goal,'另一项任务');
  next.set('task-a',{...draft,request:''});assert.equal(f.create().get('task-a').request,'');
  assert.equal(f.create().get('task-b').goal,'另一项任务');
});
test('denied reads and quota failures retain the latest editable/exportable draft without claiming it was saved',()=>{
  const denied=createTaskDraftStore({getStorage(){throw new Error('storage denied');},keyPrefix:'test'});
  assert.equal(denied.get('task-a'),undefined);assert.equal(denied.set('task-a',draft),false);
  assert.deepEqual(denied.get('task-a'),draft);assert.equal(denied.status('task-a'),'unavailable');
  const f=fixture(),store=f.create();store.set('task-a',draft);
  f.storage.setItem=()=>{throw new Error('quota');};
  const current={...draft,materials:'新增材料'};assert.equal(store.set('task-a',current),false);
  assert.deepEqual(parseTaskDraft(serializeTaskDraft('task-a',store.get('task-a')),'task-a'),current);
  assert.equal(f.create().get('task-a').materials,'保留原文件');
});
test('unknown versions and malformed saved records stay untouched while editing can continue in memory',()=>{
  for(const text of ['{broken',JSON.stringify({schemaVersion:9,capabilityId:'task-a',draft})]){
    const f=fixture();f.records.set('test-draft:task-a',text);const store=f.create();
    assert.equal(store.get('task-a'),undefined);assert.equal(store.status('task-a'),'unreadable');
    assert.equal(store.set('task-a',draft),false);assert.deepEqual(store.get('task-a'),draft);
    assert.equal(f.records.get('test-draft:task-a'),text);
    assert.equal(store.remove('task-a'),true);assert.equal(store.set('task-a',draft),true);
  }
});
test('draft files bind the selected capability and failed removal retains current work',()=>{
  assert.throws(()=>parseTaskDraft(serializeTaskDraft('task-b',draft),'task-a'),/不匹配/);
  const f=fixture(),store=f.create();store.set('task-a',draft);f.storage.removeItem=()=>{throw new Error('denied');};
  assert.equal(store.remove('task-a'),false);assert.deepEqual(store.get('task-a'),draft);
  assert.equal(store.status('task-a'),'delete_failed');
});
