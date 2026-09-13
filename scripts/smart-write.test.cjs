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
const sheets = require('../lib/google-sheets.ts');
rss.getRssLatestText = async () => 'MK의 실제 문체 표본입니다. 짧은 호흡을 유지해요.';
sheets.getProfile = async () => null;
const engine = require('../lib/writing/engine.ts');
const render = require('../lib/writing/render.ts');
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
    assert.match(run.persona.version, /^smart-write-v1:/);
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
