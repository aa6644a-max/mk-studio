// 장면 전환·키보드·노트·스케일. 자동 재생 없음.
(() => {
  const C = window.CONTENT, scenes = [...document.querySelectorAll('.scene')], N = scenes.length;
  const stage = document.getElementById('stage'), bar = document.querySelector('#progress i');
  const count = document.getElementById('count'), notes = document.getElementById('notes');
  const params = new URLSearchParams(location.search);
  const ch = 'BroadcastChannel' in window ? new BroadcastChannel('youth-showcase') : null;
  let cur = -1, gen = 0;

  function fit() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%,-50%) scale(${k})`;
  }
  addEventListener('resize', fit); fit();

  function renderNotes() {
    const s = C.scenes[cur];
    notes.innerHTML = `<b>${String(cur + 1).padStart(2, '0')} · ${s.name} · ${s.time}</b>${s.note}`;
  }

  function go(n, fromRemote) {
    n = Math.max(0, Math.min(N - 1, n));
    if (n === cur) return;
    const prev = scenes[cur], my = ++gen;
    scenes.forEach(el => { if (el !== prev) el.classList.remove('active', 'out'); });
    if (prev) { prev.classList.remove('active'); prev.classList.add('out'); setTimeout(() => { if (gen === my) prev.classList.remove('out'); }, 650); }
    cur = n;
    const el = scenes[cur];
    el.classList.remove('out'); void el.offsetWidth; el.classList.add('active'); // 애니메이션 재시작
    bar.style.width = ((cur + 1) / N * 100) + '%';
    count.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')} · ${C.scenes[cur].name}`;
    if (!notes.hidden) renderNotes();
    history.replaceState(null, '', '#' + (cur + 1));
    if (!fromRemote && ch) ch.postMessage({ go: cur });
  }

  function toggleNotes() { notes.hidden = !notes.hidden; if (!notes.hidden) renderNotes(); }
  function fullscreen() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }

  // 발표자 창: 보조 모니터에 노트·다음 장면 표시. 메인 화면에는 노트가 나오지 않는다.
  function openPresenter() {
    const w = window.open('', 'presenter', 'width=900,height=600');
    if (!w) return;
    const data = JSON.stringify(C.scenes.map(s => ({ n: s.name, t: s.time, note: s.note, h: s.headline.map(l => l.t).join(' ') })));
    w.document.open();
    w.document.write(`<!doctype html><meta charset=utf-8><title>발표자 노트</title><body style="font:20px/1.6 sans-serif;background:#10151b;color:#fff;padding:28px"><div id=a></div><hr style="opacity:.2"><div id=b style="opacity:.6"></div><script>
const D=${data};let i=0;const ch=new BroadcastChannel('youth-showcase');
function r(){const s=D[i],x=D[i+1];a.innerHTML='<div style="color:#d8fb65;font-weight:800">'+(i+1)+'/'+D.length+' · '+s.n+' · '+s.t+'</div><h1>'+s.h+'</h1><p style="font-size:26px">'+s.note+'</p>';b.textContent=x?'NEXT → '+x.h:'END'}
ch.onmessage=e=>{i=e.data.go;r()};r();
addEventListener('keydown',e=>{if(['ArrowRight',' '].includes(e.key))ch.postMessage({cmd:1});if(e.key=='ArrowLeft')ch.postMessage({cmd:-1})});<\/script>`);
    w.document.close();
  }
  if (ch) ch.onmessage = e => { if ('go' in e.data) go(e.data.go, true); else if (e.data.cmd) go(cur + e.data.cmd); };

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); go(cur + 1); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(cur - 1); }
    else if (k === 'Home') go(0); else if (k === 'End') go(N - 1);
    else if (k.toLowerCase() === 'f') fullscreen();
    else if (k.toLowerCase() === 'n') toggleNotes();
    else if (k.toLowerCase() === 'p') openPresenter();
    else if (k.toLowerCase() === 'h') document.body.classList.toggle('hide-ui');
  });

  // 터치: 오른쪽 탭/왼쪽 스와이프 = 다음, 왼쪽 탭/오른쪽 스와이프 = 이전
  let tx = 0, ty = 0;
  addEventListener('touchstart', e => { tx = e.changedTouches[0].clientX; ty = e.changedTouches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1));
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) go(cur + (tx > innerWidth / 2 ? 1 : -1));
  }, { passive: true });

  if (params.has('static')) document.body.classList.add('static');
  if (params.has('clean')) document.body.classList.add('hide-ui');
  const start = parseInt(params.get('scene') || location.hash.slice(1), 10);
  go(Number.isFinite(start) ? start - 1 : 0);
  window.showcaseGo = go;
})();
