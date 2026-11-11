import test from 'node:test';import assert from 'node:assert/strict';
import {scoreRetrieval,macroAverage}from '../scripts/score-retrieval.mjs';
test('duplicate result IDs do not inflate recall and still consume ranking slots',()=>{
 const q1=scoreRetrieval({relevantIds:['a','c'],retrievedIds:['b','a','a'],k:3});
 assert.equal(q1.hits,1);assert.equal(q1.precision,1/3);assert.equal(q1.recall,0.5);assert.equal(q1.reciprocalRank,0.5);
 const q2=scoreRetrieval({relevantIds:['z'],retrievedIds:[],k:3});
 assert.deepEqual(macroAverage([q1,q2],'recall'),{value:0.25,observed:2,excluded:0});
});
test('missing relevance labels remain unknown instead of a perfect score',()=>{
 const unlabeled=scoreRetrieval({relevantIds:[],retrievedIds:[],k:3});
 assert.equal(unlabeled.recall,null);assert.equal(unlabeled.precision,null);
 assert.deepEqual(macroAverage([unlabeled],'recall'),{value:null,observed:0,excluded:1});
 assert.throws(()=>scoreRetrieval({relevantIds:['a'],retrievedIds:[],k:0}));
});
