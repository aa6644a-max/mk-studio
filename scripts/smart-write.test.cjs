/* Run TS modules with the project's installed compiler; no paid API calls. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...args);
};
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  module._compile(output.outputText, filename);
};
const queue = [], calls = [];
class FakeAI {
  static APIError = class extends Error {};
  messages = { create: async request => {
    calls.push(request);
    const answer = queue.shift();
    assert.ok(answer, `Unexpected model request: ${request.tool_choice.name}`);
    return { content: [{ type: 'tool_use', name: request.tool_choice.name, input: answer }], usage: { input_tokens: 10, output_tokens: 10 }, stop_reason: 'tool_use' };
  } };
}
const load = Module._load;
const fakeSheets = { getProfile: async () => null };
Module._load = function (request, ...args) {
  if (request === '@anthropic-ai/sdk') return FakeAI;
  if (request === '@/lib/google-sheets' || request === '../lib/google-sheets.ts') return fakeSheets;
  return load.call(this, request, ...args);
};
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;
process.env.ANTHROPIC_API_KEY = 'test-not-a-real-key';
const types = require('../lib/writing/types.ts');
const repository = require('../lib/writing/repository.ts');
const tools = require('../lib/writing/tools.ts');
const rss = require('../lib/rss-client.ts');
const styleText = require('../lib/style-text.ts');
const sheets = require('../lib/google-sheets.ts');
const realGetRssLatestText = rss.getRssLatestText; // 엔진 테스트용 스텁을 덮기 전에 원본을 보관한다.
rss.getRssLatestText = async () => 'MK의 실제 문체 표본입니다. 짧은 호흡을 유지해요.';
sheets.getProfile = async () => null;
const engine = require('../lib/writing/engine.ts');
const render = require('../lib/writing/render.ts');
const media = require('../lib/writing/movie-media.ts');
const tmdb = require('../lib/tmdb.ts');
const { isPublicIPv4, readPublicPage } = require('../lib/writing/read-url.ts');
const { checkOrigin } = require('../lib/writing/http.ts');
const { NextRequest } = require('next/server');
const brief = () => types.parseBrief({ topic: '전시 정보 정리', experience: '진행자로 참여했습니다. 마지막 질문이 오래 남았어요.', audience: '', length: 'short', attachments: [{ kind: 'document', name: '공지.txt', text: '전시 기간 9월 15일부터 30일까지. 입장료 무료.' }, { kind: 'photo', name: '현장.jpg', text: '전시 입구에서 본 안내판' }] });
const strategy = () => ({ domain: '문화', intent: '정보 안내', audience: '관람객', question: '언제 방문할까요?', angle: '실제 공지를 바탕으로 관람 준비를 돕기', keywords: ['전시', '관람'], outline: ['방문 준비'], length: 500, voice: 'light', limitations: [] });
const article = () => ({ titles: ['전시 관람 안내', '전시 방문 준비', '전시 일정 정리', '전시를 보는 방법', '전시 입장 정보'], sections: [{ id: 'intro', heading: '방문 준비', paragraphs: Array.from({ length: 5 }, () => '이번 전시는 공지에 안내된 일정에 맞춰 살펴보면 좋겠습니다. **입장 정보를 먼저 확인**하고 내게 맞는 시간을 골라 보는 것도 한 방법이겠죠.'), sourceIds: ['attachment-1'], experienceIds: [], imageIds: ['attachment-2'], facts: [{ label: '입장료', value: '무료' }] }], hashtags: ['전시', '문화', '관람', '일정', '안내'] });

test('mixed attachments preserve topic, experience and separate sources; invalid inputs fail', () => {
  const b = brief();
  assert.equal(b.attachments.length, 2);
  assert.equal(b.attachments[0].id, 'attachment-1');
  assert.match(b.experience, /진행자/);
  assert.throws(() => types.parseBrief({ ...b, attachments: [{ kind: 'url', name: 'bad', text: 'javascript:alert(1)' }] }));
  assert.throws(() => types.parseBrief({ ...b, attachments: [{ kind: 'document', name: 'empty', text: '' }] }));
  assert.throws(() => types.parseBrief({ ...b, attachments: Array.from({ length: 7 }, () => ({ kind: 'url', name: 'link', text: 'https://example.com' })) }));
  assert.throws(() => types.parseStrategy({ ...strategy(), length: NaN }));
  assert.throws(() => types.parseArticle({ ...article(), sections: [article().sections[0], article().sections[0]] }));
});

test('public reader rejects private, reserved, IPv6 and normalized loopback addresses', async () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '198.18.0.1', '203.0.113.1', '::1', '::ffff:127.0.0.1', '0.0.0.0', '224.0.0.1']) assert.equal(isPublicIPv4(ip), false, ip);
  assert.equal(isPublicIPv4('8.8.8.8'), true);
  await assert.rejects(readPublicPage('http://2130706433/'), /공개/);
  await assert.rejects(readPublicPage('http://[::1]/'), /공개/);
  await assert.rejects(readPublicPage('file:///C:/Windows/win.ini'), /공개/);
});

test('same-origin requests use the real host; other origins and cross-site requests are rejected', () => {
  const request = headers => new NextRequest('http://localhost:3002/api/smart-write/runs', { headers });
  assert.doesNotThrow(() => checkOrigin(request({ host: '127.0.0.1:3002', origin: 'http://127.0.0.1:3002' })));
  assert.throws(() => checkOrigin(request({ host: 'localhost:3002', origin: 'https://example.com' })), /같은 사이트/);
  assert.throws(() => checkOrigin(request({ host: 'localhost:3002', origin: 'null' })), /같은 사이트/);
  assert.throws(() => checkOrigin(request({ host: 'localhost:3002', 'sec-fetch-site': 'cross-site' })), /허용되지/);
});

test('production requires durable database storage', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try { assert.throws(() => repository.storageKind(), /DATABASE_URL/); }
  finally { process.env.NODE_ENV = previous; }
});

test('tool tasks are allowlisted, deduplicated and bounded; invented URLs are skipped', () => {
  const run = engine.newRun(randomUUID(), brief());
  assert.throws(() => tools.parseTasks([{ tool: 'shell', query: 'cmd', reason: 'bad' }]));
  const task = { tool: 'naver_web', query: '전시 공지', reason: '일정 확인', status: 'pending' };
  engine.enqueueTasks(run, [task, { ...task }, { tool: 'read_url', query: 'https://invented.example/a', reason: '원문', status: 'pending' }]);
  assert.equal(run.tasks.length, 1);
  engine.enqueueTasks(run, Array.from({ length: 20 }, (_, i) => ({ ...task, query: `query-${i}` })));
  assert.equal(run.tasks.length, engine.MAX_RESEARCH_CALLS);
  assert.ok(run.notices.length);
});

test('missing TMDB credentials never return legacy mock data', async () => {
  const key = process.env.TMDB_API_KEY; delete process.env.TMDB_API_KEY;
  try { await assert.rejects(tools.executeTool({ tool: 'tmdb_search', query: '테스트 영화', reason: '작품 식별', status: 'pending' }), /설정/); }
  finally { if (key) process.env.TMDB_API_KEY = key; }
});

test('renderer escapes all model content and only renders attached photo markers', () => {
  const run = engine.newRun(randomUUID(), brief()); run.article = article(); run.strategy = strategy();
  run.article.titles[0] = '<script>alert(1)</script>';
  run.article.sections[0].paragraphs = ['<img src=x onerror=alert(1)> **강조**'];
  run.sources[0].url = 'javascript:alert(1)';
  const html = render.renderArticle(run);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('href="javascript:'));
  assert.match(html, /<b>강조<\/b>/);
  assert.match(html, /현장.jpg/);
  assert.equal((html.match(/MK LINK \| 협업 문의/g) || []).length, 1);
});

test('quality checks unknown sources, empty experience, missing photos and persona violations', () => {
  const run = engine.newRun(randomUUID(), { ...brief(), experience: '' }); run.article = article(); run.strategy = strategy();
  run.article.sections[0].sourceIds = ['invented'];
  run.article.sections[0].experienceIds = ['experience'];
  run.article.sections[0].imageIds = [];
  run.article.sections[0].paragraphs.push('결론적으로 좋았습니다.');
  const issues = render.lintArticle(run);
  assert.ok(issues.some(i => i.kind === 'evidence'));
  assert.ok(issues.some(i => i.kind === 'experience'));
  assert.ok(issues.some(i => i.kind === 'voice'));
  assert.ok(issues.some(i => i.message.includes('사진')));
});

test('durable runs enforce ownership, optimistic versions and concurrent mutation leases', async () => {
  const run = engine.newRun(randomUUID(), brief());
  await repository.createRun('owner-a', run);
  assert.equal((await repository.createRun('owner-a', { ...run, brief: { ...run.brief, topic: 'different' } })).brief.topic, run.brief.topic);
  await assert.rejects(repository.getRun('owner-b', run.id), /찾을 수/);
  const results = await Promise.allSettled([
    repository.mutateRun('owner-a', run.id, 0, async r => { await new Promise(resolve => setTimeout(resolve, 50)); r.stage = 'planning'; }),
    repository.mutateRun('owner-a', run.id, 0, async r => { r.stage = 'cancelled'; }),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const saved = await repository.getRun('owner-a', run.id);
  assert.equal(saved.version, 1);
  await assert.rejects(repository.mutateRun('owner-a', run.id, 0, async () => {}), /먼저 반영/);
  assert.equal(repository.storageKind(), 'local');
});

test('full pipeline: research, original source follow-up, experience question, MK draft, audit and repair', async () => {
  const run = engine.newRun(randomUUID(), brief());
  const originalTool = tools.executeTool;
  tools.executeTool = async task => ({ sources: [{ id: task.tool === 'read_url' ? 'original' : 'snippet', kind: task.tool === 'read_url' ? 'web' : 'snippet', title: '공식 공지', url: 'https://example.com/exhibition', text: '9월 15일부터 30일까지. 입장료 무료.', retrievedAt: new Date().toISOString() }] });
  try {
    queue.push({ tasks: [{ tool: 'naver_web', query: '전시 공식 공지', reason: '일정', mediaType: 'movie' }], rationale: '공식 일정 조사' });
    await engine.advanceRun(run); assert.equal(run.stage, 'researching');
    await engine.advanceRun(run); assert.equal(run.stage, 'planning');
    queue.push({ strategy: strategy(), tasks: [{ tool: 'read_url', query: 'https://example.com/exhibition', reason: '원문 확인', mediaType: 'movie' }], questions: [] });
    await engine.advanceRun(run); assert.equal(run.stage, 'researching');
    await engine.advanceRun(run); assert.equal(run.sources.find(s => s.id === 'original').kind, 'web');
    queue.push({ strategy: strategy(), tasks: [], questions: [{ text: '진행하면서 어떤 점이 남았나요?', kind: 'experience', options: [] }] });
    await engine.advanceRun(run); assert.equal(run.stage, 'awaiting_input');
    await assert.rejects(engine.answerRun(run, {}));
    await engine.answerRun(run, { [run.questions[0].id]: '관객들의 마지막 질문이 기억납니다.' });
    queue.push({ strategy: strategy(), tasks: [], questions: [] });
    await engine.advanceRun(run); assert.equal(run.stage, 'drafting');
    queue.push(article()); await engine.advanceRun(run); assert.equal(run.stage, 'checking');
    queue.push({ issues: [{ kind: 'voice', severity: 'error', sectionId: 'intro', message: '반복 문장을 정리하세요.' }] });
    await engine.advanceRun(run); assert.equal(run.stage, 'drafting');
    queue.push(article()); await engine.advanceRun(run); assert.equal(run.repairs, 1);
    queue.push({ issues: [] }); await engine.advanceRun(run); assert.equal(run.stage, 'ready');
    assert.match(run.persona.version, /^smart-write-v2:/);
    const draftCalls = calls.filter(c => c.tool_choice.name === 'write_article');
    assert.equal(draftCalls.length, 2);
    for (const call of draftCalls) { assert.match(call.system, /단락 호흡/); assert.match(call.messages[0].content, /진행자로 참여/); }
    assert.equal(queue.length, 0);
  } finally { tools.executeTool = originalTool; }
});

test('repair attempts are bounded; unresolved problems are visible, not ready', async () => {
  const run = engine.newRun(randomUUID(), brief()); run.stage = 'checking'; run.strategy = strategy(); run.article = article(); run.repairs = 2;
  queue.push({ issues: [{ kind: 'experience', severity: 'error', sectionId: 'intro', message: '사용자가 말하지 않은 경험입니다.' }] });
  await engine.advanceRun(run); assert.equal(run.stage, 'needs_review');
  assert.ok(run.issues.some(i => i.kind === 'experience'));
});

test('invalid generated structure preserves prior work and records a retry stage', async () => {
  const run = engine.newRun(randomUUID(), brief()); run.stage = 'drafting'; run.strategy = strategy();
  queue.push({ sections: [] });
  await engine.advanceRun(run); assert.equal(run.stage, 'failed'); assert.equal(run.retryStage, 'drafting');
  assert.equal(run.sources.length, 1); assert.ok(run.error);
});

test('a strategy serialized as a JSON string is still accepted', () => {
  const parsed = types.parseStrategy(JSON.stringify(strategy()));
  assert.equal(parsed.voice, 'light');
  assert.equal(parsed.outline.length, 1);
  assert.throws(() => types.parseStrategy('{ not json'), /입력 형식/);
});

test('an unusable voice or length falls back instead of discarding research', async () => {
  const run = engine.newRun(randomUUID(), brief()); run.stage = 'planning';
  queue.push({ strategy: { ...strategy(), voice: '감상 중심', length: 120 }, tasks: [], questions: [] });
  await engine.advanceRun(run);
  assert.equal(run.stage, 'drafting');
  assert.equal(run.strategy.voice, 'full');
  assert.equal(run.strategy.length, 500);
  assert.ok(run.notices.some(n => n.includes('기본 MK 문체')));
});

test('a strategy the model wrapped in a string survives the planning stage', async () => {
  const run = engine.newRun(randomUUID(), brief()); run.stage = 'planning';
  queue.push({ strategy: JSON.stringify(strategy()), tasks: [], questions: [] });
  await engine.advanceRun(run);
  assert.equal(run.stage, 'drafting');
  assert.equal(run.strategy.voice, 'light');
});

const movieDetail = () => ({ title: '테스트 영화', runtime: 110, posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg', backdropUrls: Array.from({length: 7}, (_, i) => `https://image.tmdb.org/t/p/original/still${i}.jpg`) });
function movieRun() {
  const run = engine.newRun(randomUUID(), brief()); run.stage = 'ready'; run.strategy = strategy();
  const src = {id:'movie-1',kind:'tmdb',title:'테스트 영화',url:'https://www.themoviedb.org/movie/27205',text:'{"runtime":110}',retrievedAt:'2026-09-14T00:00:00Z'};
  src.images = media.movieImages(src.id,src.title,movieDetail());run.sources.push(src);
  run.article=article();
  run.article.sections = ['intro','synopsis','acting','direction','theme','visuals','outro'].map((id,i) => ({...article().sections[0],id,heading: i===0||i===6?'':id==='synopsis'?'줄거리':id,paragraphs:[`본문 ${i} 첫 문단입니다. 두 번째 문장입니다.`,`본문 ${i} 다음 문단입니다. 여운이 남습니다.`],facts:[],sourceIds:['movie-1'],imageIds:i===0?['attachment-2']:[]}));
  return run;
}

test('TMDB image catalog caps at five stills, deduplicates files and rejects arbitrary image URLs', () => {
  const detail=movieDetail();detail.backdropUrls.unshift(detail.backdropUrls[0],'https://evil.example/pic.jpg','https://image.tmdb.org@evil.example/pic.jpg','http://image.tmdb.org/t/p/original/a.jpg');
  const images=media.movieImages('movie-1','제목 <script>',detail);
  assert.equal(images.length,6);assert.equal(images.filter(i=>i.kind==='still').length,5);assert.equal(new Set(images.map(i=>i.url)).size,6);
  assert.equal(media.safeTmdbImageUrl('https://image.tmdb.org/t/p/original/a.jpg?redirect=evil'),'');
  assert.equal(media.safeTmdbImageUrl('https://image.tmdb.org.evil.example/t/p/original/a.jpg'),'');
});

test('movie sources retain images while legacy source hydration preserves factual snapshots', async () => {
  const old=tmdb.getMovieDetails,key=process.env.TMDB_API_KEY;process.env.TMDB_API_KEY='test';let calls=0;
  tmdb.getMovieDetails=async ()=>{calls++;return movieDetail();};
  try {
    const src=await tools.movieSource({id:27205,title:'테스트 영화',year:'2010',mediaType:'movie',posterUrl:null});
    assert.equal(src.images.length,6);assert.equal(JSON.parse(src.text).runtime,110);
    const legacy={...src,id:'legacy',images:undefined,text:'preserve old source',retrievedAt:'2020-01-01'};
    await tools.hydrateMovieImages([legacy]);
    assert.equal(legacy.text,'preserve old source');assert.equal(legacy.retrievedAt,'2020-01-01');assert.equal(legacy.images.length,6);
    assert.ok(legacy.images.every(i=>i.id.startsWith('legacy-')));
    await tools.hydrateMovieImages([legacy]);assert.equal(calls,2);
  } finally {tmdb.getMovieDetails=old;if(key)process.env.TMDB_API_KEY=key;else delete process.env.TMDB_API_KEY;}
});

test('movie placement restores omissions and spreads stills without changing prose or uploaded photos', () => {
  const run=movieRun();const before=run.article.sections.map(s=>s.paragraphs.join('\n'));
  // Simulate all stills being clustered at the end by the model.
  run.article.sections.at(-1).imageIds=run.sources[1].images.map(i=>i.id);
  media.placeMovieImages(run);
  assert.deepEqual(run.article.sections.map(s=>s.paragraphs.join('\n')),before);
  assert.ok(run.article.sections[0].imageIds.includes('attachment-2'));
  assert.ok(run.article.sections[0].imageIds.includes('movie-1-poster-1'));
  assert.ok(run.article.sections[1].imageIds.includes('movie-1-still-1'));
  assert.equal(run.article.sections.at(-1).imageIds.length,0);
  const stillSections=run.article.sections.filter(s=>s.imageIds.some(id=>id.includes('-still-')));
  assert.equal(stillSections.length,5);
  const placed=JSON.stringify(run.article);media.placeMovieImages(run);assert.equal(JSON.stringify(run.article),placed);
  const html=render.renderArticle(run);
  assert.equal((html.match(/<img /g)||[]).length,6);assert.match(html,/이미지 출처: TMDB/);assert.match(html,/현장.jpg/);
  assert.ok(!render.lintArticle(run).some(i=>i.message.includes('이미지')));
});

test('short articles interleave stills with paragraphs and never create extra prose to fit photos', () => {
  const run=movieRun();run.article.sections=run.article.sections.slice(0,1);
  media.placeMovieImages(run);
  assert.equal(run.article.sections[0].paragraphs.length,2);
  assert.equal(run.article.sections[0].imageIds.filter(id=>id.includes('-still-')).length,2);
  const html=render.renderArticle(run);
  assert.ok(html.indexOf('본문 0 첫')<html.indexOf('still0.jpg'));
  assert.ok(html.indexOf('still0.jpg')<html.indexOf('본문 0 다음'));
  assert.ok(html.indexOf('본문 0 다음')<html.indexOf('still1.jpg'));
});

test('comparison media remains within the matching film; unrelated film sources are not inserted', () => {
  const run=movieRun(),second={...run.sources[1],id:'movie-2'};second.images=media.movieImages(second.id,'다른 영화',movieDetail());
  run.sources.push(second);run.article.sections[3].sourceIds=['movie-2'];
  media.placeMovieImages(run);
  assert.ok(run.article.sections[3].imageIds.some(id=>id.startsWith('movie-2-')));
  assert.ok(!run.article.sections[3].imageIds.some(id=>id.startsWith('movie-1-')));
  assert.ok(run.article.sections.filter(s=>s.id!=='direction').every(s=>!s.imageIds.some(id=>id.startsWith('movie-2-'))));
});

test('completed drafts can receive movie images without AI calls or content changes', async () => {
  const run=movieRun(),before=render.articleText(run.article),count=calls.length;
  await engine.restoreMovieImages(run);
  assert.equal(render.articleText(run.article),before);assert.equal(calls.length,count);assert.equal(run.stage,'ready');
  assert.equal((render.renderArticle(run).match(/<img /g)||[]).length,6);
  run.stage='drafting';await assert.rejects(engine.restoreMovieImages(run),/완성/);
});

test('plain-text RSS descriptions keep their body when signatures are stripped', () => {
  const header=styleText.htmlToStyleText('MK LINK LOCAL 안남숙 작가 개인전 소개 얼마 전 호작질미술관에서 진행 중인 전시를 소개해드린 적이 있는데요.');
  assert.ok(header.startsWith('안남숙 작가'));
  assert.ok(!/MK\s*LINK/i.test(header));
  const signed=styleText.htmlToStyleText('<p>본문 <b>핵심 구절</b>입니다.</p><p>협업 문의 메일로 주세요</p>');
  assert.ok(signed.includes('본문 **핵심 구절**입니다.'));
  assert.ok(!signed.includes('협업 문의'));
});

test('style reference survives the MK LINK header and ranks posts about the same subject first', async () => {
  // 네이버 RSS의 description은 태그가 없는 평문 300~400자로 온다. 그 조건을 그대로 재현한다.
  const body=name=>`MK LINK REVIEW ${name} 이번 작품은 생각보다 여운이 길게 남았는데요. 그래서 조금 더 적어보려 합니다. `.repeat(6);
  const item=(title,name)=>`<item><title><![CDATA[${title}]]></title><description><![CDATA[${body(name)}]]></description></item>`;
  const feed=`<rss><channel>${[item('대구 플리마켓 북성로 대화장날 후기','플리마켓'),item('경주기행 리뷰 | 실상은 가족의 이야기','경주기행'),item('영화 인턴 원작 복습 리뷰','인턴')].join('')}</channel></rss>`;
  const realFetch=global.fetch;
  global.fetch=async()=>({ok:true,status:200,text:async()=>feed});
  try{
    const keywords=rss.styleKeywordsForTopic('경주기행 봤는데 가족 이야기가 좋았어요');
    assert.ok(keywords.includes('경주기행'));
    const text=await realGetRssLatestText('shock552',3,keywords);
    assert.ok(!/MK\s*LINK/i.test(text));
    assert.ok(text.includes('여운이 길게 남았는데요'));
    assert.ok(text.indexOf('경주기행 리뷰')<text.indexOf('플리마켓'));
    assert.ok(text.length>=800);
  } finally { global.fetch=realFetch; }
});
