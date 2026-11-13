/* Browser storage adapter. Failures retain the live draft and expose a status;
 * one key per capability keeps edits to other tasks independent. */
const draftError = (message, code) => Object.assign(new Error(message), { code });
function checkDraftSize(text, maxBytes) {
  if (maxBytes !== undefined && new TextEncoder().encode(text).byteLength > maxBytes) {
    throw draftError('草稿超过当前配置的大小上限，完整内容仍保留在本页。', 'DRAFT_TOO_LARGE');
  }
}
function taskDraftRecord(value, capabilityId) {
  if (!value || ![1,2].includes(value.schemaVersion) || typeof value.capabilityId !== 'string' ||
      value.capabilityId !== capabilityId || !value.draft || typeof value.draft !== 'object') {
    throw draftError('草稿格式或所属能力不匹配，请选择原来的能力或使用对应版本。', 'DRAFT_FORMAT');
  }
  const draft=value.draft;
  const generated=value.schemaVersion===2 && value.requestMode==='generated';
  if(value.schemaVersion===2 && (!['generated','authored'].includes(value.requestMode) ||
    (generated && (draft.manual!==false || draft.request!==undefined)))) {
    throw draftError('草稿的请求来源记录不完整，原草稿已保留。', 'DRAFT_HISTORY');
  }
  for(const key of ['goal','materials','host','componentVersion',...(generated?[]:['request'])]) {
    if(typeof draft[key]!=='string')throw draftError('草稿缺少完整内容，原草稿已保留。', 'DRAFT_FIELDS');
  }
  if(typeof draft.manual!=='boolean'||(draft.previousRequest!==undefined&&typeof draft.previousRequest!=='string')) {
    throw draftError('草稿编辑记录不完整，原草稿已保留。', 'DRAFT_HISTORY');
  }
  return {goal:draft.goal,materials:draft.materials,host:draft.host,request:generated?'':draft.request,
    componentVersion:draft.componentVersion,manual:draft.manual,
    ...(generated?{requestMode:'generated'}:{}),
    ...(draft.previousRequest===undefined?{}:{previousRequest:draft.previousRequest})};
}

export function parseTaskDraft(text, capabilityId, {maxBytes} = {}) {
  checkDraftSize(text,maxBytes);
  return taskDraftRecord(JSON.parse(text),capabilityId);
}

function generatedDraft(draft, generatedRequest) {
  return !draft.manual && ((typeof generatedRequest==='string' && draft.request===generatedRequest) ||
    (draft.requestMode==='generated' && draft.request===''));
}

export function serializeTaskDraft(capabilityId, draft, {generatedRequest,maxBytes} = {}) {
  const record=taskDraftRecord({schemaVersion:1,capabilityId,draft},capabilityId);
  const generated=generatedDraft(draft,generatedRequest);
  if(generated)delete record.request;
  const text=JSON.stringify({schemaVersion:2,capabilityId,requestMode:generated?'generated':'authored',draft:record},null,2)+'\n';
  checkDraftSize(text,maxBytes);
  return text;
}

export function createTaskDraftStore({getStorage, keyPrefix, maxBytes}) {
  const memory=new Map(),loaded=new Set(),protectedRecords=new Set(),states=new Map();
  const key=id=>keyPrefix+':'+encodeURIComponent(id);
  function get(id) {
    if(!loaded.has(id)){
      loaded.add(id);
      let text;
      try {text=getStorage().getItem(key(id));}
      catch {states.set(id,'unavailable');}
      if(text!==undefined&&text!==null){
        try {memory.set(id,parseTaskDraft(text,id,{maxBytes}));states.set(id,'restored');}
        catch {protectedRecords.add(id);states.set(id,'unreadable');}
      }
    }
    const value=memory.get(id);
    return value?{...value}:undefined;
  }
  function set(id, draft, {generatedRequest} = {}) {
    get(id);
    const record=taskDraftRecord({schemaVersion:1,capabilityId:id,draft},id);
    if(generatedDraft(draft,generatedRequest)){record.request='';record.requestMode='generated';}
    // Even a failed save keeps the full source and authored edits available for recovery.
    memory.set(id,record);
    if(protectedRecords.has(id)){states.set(id,'unreadable');return false;}
    try {
      const text=serializeTaskDraft(id,draft,{generatedRequest,maxBytes});
      getStorage().setItem(key(id),text);states.set(id,'saved');return true;
    }
    catch(error) {states.set(id,error.code==='DRAFT_TOO_LARGE'?'too_large':'unavailable');return false;}
  }
  function remove(id) {
    try {getStorage().removeItem(key(id));}
    catch {states.set(id,'delete_failed');return false;}
    memory.delete(id);protectedRecords.delete(id);loaded.add(id);states.set(id,'empty');return true;
  }
  return Object.freeze({get,set,remove,status:id=>states.get(id)||'empty'});
}
