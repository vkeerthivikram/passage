import test from 'node:test';import assert from 'node:assert/strict';import {localDate,streak,parseCsv,SourceInput,HighlightInput} from '../src/index.js';
test('local date respects midnight in configured timezone',()=>assert.equal(localDate(new Date('2026-01-01T23:30:00Z'),'Asia/Kolkata'),'2026-01-02'));
test('streak allows unfinished today but breaks on gaps',()=>{assert.equal(streak(['2026-01-01','2026-01-02'],'2026-01-03'),2);assert.equal(streak(['2026-01-01'],'2026-01-03'),0);});
test('CSV handles embedded line breaks and escaped quotes',()=>assert.deepEqual(parseCsv('title,text\r\nBook,"A, B\n""C"""'),[{title:'Book',text:'A, B\n"C"'}]));
test('source and highlight reject invalid inputs',()=>{assert.equal(SourceInput.safeParse({title:''}).success,false);assert.equal(HighlightInput.safeParse({sourceId:'bad',text:'x'}).success,false);});
