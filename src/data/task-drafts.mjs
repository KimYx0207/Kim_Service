/* Browser storage adapter. Failures retain the live draft and expose a status;
 * one key per capability keeps edits to other tasks independent. */
const draftError = (message, code) => Object.assign(new Error(message), { code });
function taskDraftRecord(value, capabilityId) {
  if (!value || value.schemaVersion !== 1 || typeof value.capabilityId !== 'string' ||
      value.capabilityId !== capabilityId || !value.draft || typeof value.draft !== 'object') {
    throw draftError('草稿格式或所属能力不匹配，请选择原来的能力或使用对应版本。', 'DRAFT_FORMAT');
  }
  const draft=value.draft;
  for(const key of ['goal','materials','host','request','componentVersion']) {
    if(typeof draft[key]!=='string')throw draftError('草稿缺少完整内容，原草稿已保留。', 'DRAFT_FIELDS');
  }
  if(typeof draft.manual!=='boolean'||(draft.previousRequest!==undefined&&typeof draft.previousRequest!=='string')) {
    throw draftError('草稿编辑记录不完整，原草稿已保留。', 'DRAFT_HISTORY');
  }
  return {goal:draft.goal,materials:draft.materials,host:draft.host,request:draft.request,
    componentVersion:draft.componentVersion,manual:draft.manual,
    ...(draft.previousRequest===undefined?{}:{previousRequest:draft.previousRequest})};
}

export function parseTaskDraft(text, capabilityId) {
  return taskDraftRecord(JSON.parse(text),capabilityId);
}

export function serializeTaskDraft(capabilityId, draft) {
  const value={schemaVersion:1,capabilityId,draft};
  return JSON.stringify({...value,draft:taskDraftRecord(value,capabilityId)},null,2)+'\n';
}

export function createTaskDraftStore({getStorage, keyPrefix}) {
  const memory=new Map(),loaded=new Set(),protectedRecords=new Set(),states=new Map();
  const key=id=>keyPrefix+':'+encodeURIComponent(id);
  function get(id) {
    if(!loaded.has(id)){
      loaded.add(id);
      let text;
      try {text=getStorage().getItem(key(id));}
      catch {states.set(id,'unavailable');}
      if(text!==undefined&&text!==null){
        try {memory.set(id,parseTaskDraft(text,id));states.set(id,'restored');}
        catch {protectedRecords.add(id);states.set(id,'unreadable');}
      }
    }
    const value=memory.get(id);
    return value?{...value}:undefined;
  }
  function set(id, draft) {
    get(id);
    const text=serializeTaskDraft(id,draft);
    memory.set(id,parseTaskDraft(text,id));
    if(protectedRecords.has(id)){states.set(id,'unreadable');return false;}
    try {getStorage().setItem(key(id),text);states.set(id,'saved');return true;}
    catch {states.set(id,'unavailable');return false;}
  }
  function remove(id) {
    try {getStorage().removeItem(key(id));}
    catch {states.set(id,'delete_failed');return false;}
    memory.delete(id);protectedRecords.delete(id);loaded.add(id);states.set(id,'empty');return true;
  }
  return Object.freeze({get,set,remove,status:id=>states.get(id)||'empty'});
}
