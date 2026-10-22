// content.js 의 데이터를 장면 DOM으로 변환. 개인 사실은 여기에 하드코딩하지 않는다.
(() => {
  const C = window.CONTENT;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const head = (lines, cls = '') =>
    `<h1 class="headline ${cls}">${lines.map((l, i) =>
      `<span class="ln"><span class="${l.accent ? 'accent' : ''}" style="--i:${i}">${esc(l.t)}</span></span>`).join('')}</h1>`;
  const photo = (src, alt) => src ? `<img src="${esc(src)}" alt="${esc(alt)}">` : '';
  // 경로를 비워 두면 assets/photos/<이름>.(jpg|jpeg|png|webp) 를 자동으로 찾는다. 없으면 자리표시자 유지.
  const auto = name => `<img data-auto="${esc(name)}" alt="">`;

  const body = {
    hook: () => `<div class="hook-ring"></div><div class="hook-ring b"></div>`,
    film: s => body.ghost(s) + `<div class="film"><div class="film-strip" data-seconds="${s.film.seconds || 30}">${Array.from({ length: s.film.count }, (_, i) =>
      `<div class="film-frame"><span>현장 ${String(i + 1).padStart(2, '0')}</span>${auto(s.film.prefix + '-' + (i + 1))}</div>`).join('')}</div></div>`,
    ghost: s => `<div class="ghost" style="font-size:${s.ghostSize || 600}px" aria-hidden="true">${esc(s.ghost)}</div>`,
    track: s => `<div class="track a" aria-hidden="true">${(esc(s.repeat) + ' ').repeat(6)}</div><div class="track b" aria-hidden="true">${(esc(s.repeat) + ' ').repeat(6)}</div><div class="tag">${esc(s.tag)}</div>`,
    bignum: s => `<div class="bignum" aria-hidden="true">${esc(s.bignum)}</div>`,
    chips: s => `<div class="chips">${s.chips.map((c, i) => `<span class="chip" style="--i:${i}">${esc(c)}</span>`).join('')}</div>`,
    cards: s => `<div class="cards${s.slots ? ' tall' : ''}">${s.cards.map((c, i) =>
      `<div class="card" style="--i:${i}"><div class="lab">${esc(c.label)}</div>${s.slots ? `<div class="slot"><span>PHOTO</span>${c.photo ? photo(c.photo, c.word) : auto(s.id + '-' + (i + 1))}</div>` : photo(c.photo, c.word)}<div><div class="word">${esc(c.word)}</div>${c.detail ? `<div class="det">${esc(c.detail)}</div>` : ''}</div></div>`).join('')}</div>`,
    timeline: s => { const n = s.nodes.length; return `<div class="map"><svg viewBox="0 0 1000 160" preserveAspectRatio="none"><path pathLength="1" d="M0 80 C 180 10, 320 150, 500 80 S 820 10, 1000 80"/></svg>${
      s.nodes.map((x, i) => `<div class="node" style="--i:${i};left:${i / (n - 1) * 100}%"><span class="l">${esc(x.label)}</span>${x.detail ? `<span class="d">${esc(x.detail)}</span>` : ''}</div>`).join('')}</div>`; },
    photo: s => `<div class="photo-wrap"><div class="photo"><span>실제 사진</span>${s.photo ? photo(s.photo, '') : auto(s.id)}</div><p>${esc(s.photoCaption)}</p></div>`,
    end: s => `<div class="circle"></div><div class="thanks">${esc(s.thanks)}</div>`
  };

  const stage = document.getElementById('stage');
  C.scenes.forEach((s, idx) => {
    const el = document.createElement('section');
    el.className = `scene t-${s.theme}`;
    el.dataset.id = s.id;
    el.style.setProperty('--n', s.headline.length);
    el.innerHTML = `${(body[s.kind] || (() => ''))(s)}<div class="eyebrow">${esc(s.eyebrow)}</div>${head(s.headline)}${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ''}<div class="foot">${String(idx + 1).padStart(2, '0')} / ${String(C.scenes.length).padStart(2, '0')}</div>`;
    stage.appendChild(el);
  });
  // 자동 사진: 확장자를 순서대로 시도. 하나라도 찾으면 못 찾은 필름 프레임은 제거한다.
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  const load = img => new Promise(res => {
    const base = 'assets/photos/' + img.dataset.auto + '.';
    let k = 0;
    img.onload = () => res(true);
    const emb = window.PHOTOS && window.PHOTOS[img.dataset.auto]; // build-single.py --photos 로 내장된 사진
    if (emb) { img.src = emb; return; }
    img.onerror = () => { if (++k < exts.length) img.src = base + exts[k]; else { img.remove(); res(false); } };
    img.src = base + exts[0];
  });
  window.photosReady = Promise.all([...document.querySelectorAll('img[data-auto]')].map(img => {
    const frame = img.closest('.film-frame');
    return load(img).then(ok => ({ frame, ok }));
  })).then(rs => {
    document.querySelectorAll('.film-strip').forEach(strip => {
      const mine = rs.filter(r => r.frame && strip.contains(r.frame));
      if (mine.some(r => r.ok)) mine.filter(r => !r.ok).forEach(r => r.frame.remove());
    });
  });
  document.title = C.meta.title;
})();
