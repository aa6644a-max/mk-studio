// content.js 의 데이터를 장면 DOM으로 변환. 개인 사실은 여기에 하드코딩하지 않는다.
(() => {
  const C = window.CONTENT;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const head = (lines, cls = '') =>
    `<h1 class="headline ${cls}">${lines.map((l, i) =>
      `<span class="ln"><span class="${l.accent ? 'accent' : ''}" style="--i:${i}">${esc(l.t)}</span></span>`).join('')}</h1>`;
  const photo = (src, alt) => src ? `<img src="${esc(src)}" alt="${esc(alt)}">` : '';

  const body = {
    hook: s => `<div class="hook-ring"></div><div class="hook-ring b"></div>`,
    before: s => `<div class="ghost" aria-hidden="true">${esc(s.ghost)}</div>`,
    doubt: s => `<div class="track a" aria-hidden="true">${(esc(s.repeat) + ' ').repeat(6)}</div><div class="track b" aria-hidden="true">${(esc(s.repeat) + ' ').repeat(6)}</div><div class="tag">${esc(s.tag)}</div>`,
    turn: s => `<div class="bignum" aria-hidden="true">${esc(s.bignum)}</div>`,
    experience: s => `<div class="cards">${s.cards.map((c, i) =>
      `<div class="card" style="--i:${i}">${photo(c.photo, c.word)}<div class="lab">${esc(c.label)}</div><div><div class="word">${esc(c.word)}</div><div class="det">${esc(c.detail)}</div></div></div>`).join('')}</div>`,
    journey: s => `<div class="map"><svg viewBox="0 0 1000 160" preserveAspectRatio="none"><path pathLength="1" d="M0 80 C 180 10, 320 150, 500 80 S 820 10, 1000 80"/></svg>${
      s.nodes.map((n, i) => `<div class="node" style="--i:${i};left:${[0, 50, 100][i]}%"><span class="l">${esc(n.label)}</span><span class="d">${esc(n.detail)}</span><span class="e">${esc(n.en)}</span></div>`).join('')}</div>`,
    today: s => `<div class="photo-wrap"><div class="photo">${s.photo ? photo(s.photo, '') : '실제 사진 / 결과물'}</div><p>${esc(s.photoCaption)}</p></div>`,
    next: s => `<div class="circle"></div><div class="thanks">${esc(s.thanks)}</div>`
  };

  const stage = document.getElementById('stage');
  C.scenes.forEach((s, idx) => {
    const el = document.createElement('section');
    el.className = `scene t-${s.theme}`;
    el.dataset.id = s.id;
    el.style.setProperty('--n', s.headline.length);
    el.innerHTML = `${(body[s.id] || (() => ''))(s)}<div class="eyebrow">${esc(s.eyebrow)}</div>${head(s.headline)}${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ''}<div class="foot">${String(idx + 1).padStart(2, '0')} / ${String(C.scenes.length).padStart(2, '0')}</div>`;
    stage.appendChild(el);
  });
  document.title = C.meta.title;
})();
