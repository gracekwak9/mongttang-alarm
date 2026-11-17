import './style.css';
import { todayKST, nextOccurrence, daysBetween, addDays, fmtFull, fmtShort, fmtMD, iso, specialYear, alertPlan, TIMELINE } from './calc.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const TYPES = {
  mom: { name: '엄마 생신', until: '엄마 생신까지', today: '오늘이 엄마 생신이에요', dateQ: '엄마 생신은<br />언제예요?', yearQ: '엄마는<br />몇 년생이세요?', unit: '년생', yearMsg: '환갑·칠순 같은 특별한 해를 미리 알려드려요', ph: '예) 1960' },
  dad: { name: '아빠 생신', until: '아빠 생신까지', today: '오늘이 아빠 생신이에요', dateQ: '아빠 생신은<br />언제예요?', yearQ: '아빠는<br />몇 년생이세요?', unit: '년생', yearMsg: '환갑·칠순 같은 특별한 해를 미리 알려드려요', ph: '예) 1960' },
  wedding: { name: '결혼기념일', until: '결혼기념일까지', today: '오늘이 결혼기념일이에요', dateQ: '부모님 결혼기념일은<br />언제예요?', yearQ: '부모님은<br />몇 년에 결혼하셨어요?', unit: '년', yearMsg: '은혼식·진주혼식 같은 특별한 해를 미리 알려드려요', ph: '예) 1990' },
};

// 테스트용: ?today=2026-11-17 로 기준일 고정
const qsToday = new URLSearchParams(location.search).get('today');
const TODAY = qsToday ? new Date(qsToday + 'T00:00:00Z') : todayKST();

const state = { type: null, calendar: 'solar', month: null, day: null, year: null, r: null, teaserShown: false };
const stack = ['home'];
let busy = false;

/* ───────── navigation (Figma: PUSH 0.35 ease-out / DISSOLVE 0.3) ───────── */
async function go(name, { back = false, mode = 'push' } = {}) {
  if (busy) return; busy = true;
  const cur = $('.screen.is-active'), next = $(`[data-screen="${name}"]`);
  if (!cur || cur === next) { busy = false; return; }
  if (reduce || mode === 'none') {
    cur.classList.remove('is-active'); next.classList.add('is-active');
  } else if (mode === 'dissolve') {
    next.style.opacity = '0'; next.classList.add('anim', 'is-active'); next.style.zIndex = 2;
    requestAnimationFrame(() => requestAnimationFrame(() => { next.style.opacity = '1'; }));
    await wait(320); cur.classList.remove('is-active'); next.classList.remove('anim'); next.style.cssText = '';
  } else {
    const dir = back ? -1 : 1;
    next.style.transition = 'none'; next.style.transform = `translateX(${dir * 100}%)`; next.classList.add('is-active');
    cur.classList.add('anim'); next.classList.add('anim');
    next.offsetWidth;
    next.style.transition = ''; next.style.transform = 'translateX(0)'; cur.style.transform = `translateX(${-dir * 100}%)`;
    await wait(360);
    cur.classList.remove('is-active', 'anim'); next.classList.remove('anim'); cur.style.cssText = ''; next.style.cssText = '';
  }
  $('#app').scrollTop = 0; next.scrollTop = 0; window.scrollTo(0, 0);
  if (!back) stack.push(name); else stack.pop();
  busy = false;
  onEnter(name);
}
const goBack = () => { if (stack.length > 1) go(stack[stack.length - 2], { back: true }); };
$$('[data-action="back"]').forEach(b => b.addEventListener('click', goBack));

/* ───────── ① intro → landing timeline (Figma 키프레임 그대로) ───────── */
const T = (el, props, ms, ease) => { el.style.transition = `opacity ${ms}ms ${ease}, transform ${ms}ms ${ease}`; Object.assign(el.style, props); };
async function playIntro() {
  const home = $('.home'), q = $$('.q-line'), moa = $('.home-moa'), bg = $('.home-bg'), hl = $('.home-headline'), sub = $('.home-sub');
  const SOFT = 'var(--ease-soft)', TEN = 'var(--ease-tension)', IO = 'var(--ease-inout)';
  if (reduce) { [bg, moa, hl, sub].forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); home.classList.add('ready'); return; }
  await wait(300);
  T(q[0], { opacity: 1, transform: 'translateY(0)' }, 600, SOFT); T(moa, { opacity: 1, transform: 'translateY(0)' }, 600, SOFT);
  await wait(650);
  T(q[1], { opacity: 1, transform: 'translateY(0)' }, 550, SOFT);
  await wait(600);
  T(q[2], { opacity: 1, transform: 'translateY(0)' }, 550, SOFT);
  await wait(1150);
  T(bg, { opacity: 1 }, 600, IO); q.forEach(l => T(l, { opacity: 0, transform: 'translateY(-24px)' }, 600, IO));
  await wait(650);
  T(hl, { opacity: 1, transform: 'translateY(0)' }, 700, TEN);
  await wait(780);
  T(sub, { opacity: 1, transform: 'translateY(0)' }, 650, TEN);
  home.classList.add('ready');
}
function showLandingInstant() {
  const home = $('.home');
  $$('.q-line').forEach(l => { l.style.transition = 'none'; l.style.opacity = 0; });
  [$('.home-bg'), $('.home-moa'), $('.home-headline'), $('.home-sub')].forEach(e => { e.style.transition = 'none'; e.style.opacity = 1; e.style.transform = 'none'; });
  home.classList.add('ready');
}
$('[data-action="start"]').addEventListener('click', () => go('who'));

/* ───────── ② 누구 ───────── */
$$('.option').forEach(o => o.addEventListener('click', async () => {
  if (busy) return;
  const t = o.dataset.type, changed = state.type !== t;
  state.type = t;
  $$('.option').forEach(x => x.classList.toggle('on', x === o));
  if (changed) resetDate();
  applyTypeCopy();
  await wait(180);
  go('date');
}));
function applyTypeCopy() {
  const C = TYPES[state.type];
  $('#dateHeading').innerHTML = C.dateQ;
  $('#yearHeading').innerHTML = C.yearQ;
  $('#yearUnit').textContent = C.unit;
  $('#yearMsg span').textContent = C.yearMsg;
  $('#year').placeholder = C.ph;
}

/* ───────── ③ 날짜 ───────── */
const monthSel = $('#month'), daySel = $('#day');
monthSel.innerHTML = '<option value="">월 선택</option>' + Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}월</option>`).join('');
function fillDays() {
  const m = +monthSel.value;
  const max = state.calendar === 'lunar' ? 30 : (m ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] : 31);
  const keep = +daySel.value;
  daySel.innerHTML = '<option value="">일 선택</option>' + Array.from({ length: max }, (_, i) => `<option value="${i + 1}">${i + 1}일</option>`).join('');
  daySel.value = keep && keep <= max ? String(keep) : '';
}
function paintBox(box, v) { box.classList.toggle('is-empty', !v); box.querySelector('.val').textContent = v || '-'; }
function syncDate() {
  state.month = +monthSel.value || null; state.day = +daySel.value || null;
  paintBox($('#monthBox'), state.month); paintBox($('#dayBox'), state.day);
  const ok = !!(state.month && state.day);
  $('#dateNext').disabled = !ok;
  const msg = $('#dateMsg');
  if (ok) {
    const d = nextOccurrence(state, TODAY);
    msg.querySelector('span').innerHTML = state.calendar === 'lunar'
      ? `음력 ${state.month}월 ${state.day}일은 이번에 양력 ${fmtMD(d)}이에요`
      : `다가오는 ${TYPES[state.type].name}은 ${d.getUTCFullYear() !== TODAY.getUTCFullYear() ? d.getUTCFullYear() + '년 ' : ''}${fmtMD(d)}이에요`;
    if (msg.hidden) { msg.hidden = false; }
  } else msg.hidden = true;
}
function setCal(c) {
  state.calendar = c;
  $$('[data-cal]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.cal === c)));
  fillDays(); syncDate();
}
function resetDate() { monthSel.value = ''; setCal('solar'); $('#year').value = ''; syncYear(true); }
$$('[data-cal]').forEach(b => b.addEventListener('click', () => setCal(b.dataset.cal)));
monthSel.addEventListener('change', () => { fillDays(); syncDate(); });
daySel.addEventListener('change', syncDate);
$('#dateNext').addEventListener('click', () => go('year'));
fillDays(); syncDate();

/* ───────── ④ 태어난 해 ───────── */
const yearIn = $('#year');
function syncYear(silent) {
  yearIn.value = yearIn.value.replace(/\D/g, '').slice(0, 4);
  const v = yearIn.value, y = +v, max = TODAY.getUTCFullYear();
  const valid = v.length === 4 && y >= 1920 && y <= max;
  state.year = valid ? y : null;
  $('#yearNext').disabled = !valid;
  const err = $('#yearErr'), box = $('#yearBox');
  const showErr = !silent && v.length === 4 && !valid;
  err.hidden = !showErr; box.classList.toggle('error', showErr);
  if (showErr) err.textContent = `1920년부터 ${max}년 사이로 입력해주세요`;
}
yearIn.addEventListener('input', () => syncYear(false));
yearIn.addEventListener('keydown', e => { if (e.key === 'Enter' && state.year) showResult(); });
$('#yearNext').addEventListener('click', showResult);
$('#yearSkip').addEventListener('click', () => { yearIn.value = ''; state.year = null; syncYear(true); showResult(); });

/* ───────── ⑤ 결과 ───────── */
function compute() {
  const target = nextOccurrence(state, TODAY);
  const after = nextOccurrence(state, addDays(target, 1));
  return { target, dday: daysBetween(TODAY, target), sp: specialYear(state.type, state.year, target.getUTCFullYear()), alert: alertPlan(target, TODAY, after) };
}
function showResult() {
  yearIn.blur();
  const r = state.r = compute(), C = TYPES[state.type];
  $('#rLabel').textContent = r.dday === 0 ? C.today : C.until;
  $('#rDday').textContent = r.dday === 0 ? 'D-DAY' : `D-${r.dday}`;
  $('#rDate').textContent = fmtFull(r.target) + (state.calendar === 'lunar' ? `\n음력 ${state.month}월 ${state.day}일` : '');
  const sp = $('#rSpecial');
  if (r.sp) {
    sp.hidden = false;
    $('#rSpecialTitle').innerHTML = r.sp.title.replace(r.sp.hi, `<span class="hi">${r.sp.hi}</span>`);
    $('#rSpecialSub').textContent = r.sp.sub;
  } else sp.hidden = true;
  $('#rTimeline').innerHTML = TIMELINE.map(t => {
    const d = addDays(r.target, -t.offset); const past = d < TODAY;
    return `<li class="${t.key ? 'key' : ''}${past ? ' past' : ''}"><span class="chip">D-${t.offset}</span><span class="what">${t.what}</span><span class="when">${fmtShort(d)}</span></li>`;
  }).join('');
  const label = r.alert.nextYear ? '내년 D-30에 알림 받기' : `D-${r.alert.offset}에 알림 받기`;
  $('#openSignup').textContent = label;
  $('#teaserCta').textContent = r.alert.nextYear ? '내년 알림 받고 오픈 소식도 받기' : `D-${r.alert.offset} 알림 받고 오픈 소식도 받기`;
  $('#sTitle').innerHTML = (r.alert.nextYear ? '내년 D-30에 모아가' : `D-${r.alert.offset}에 모아가`) + '<br />알려드릴게요';
  const ad = r.alert.date, yr = ad.getUTCFullYear() !== TODAY.getUTCFullYear() ? `${ad.getUTCFullYear()}년 ` : '';
  $('#sSub').innerHTML = `<b>${yr}${fmtMD(ad)}</b>에 문자로 보내드려요`;
  $('.result .scroll').scrollTop = 0;
  go('result', { mode: stack[stack.length - 1] === 'year' ? 'dissolve' : 'push' });
}
let teaserTimer;
function onEnter(name) {
  if (name === 'result' && !state.teaserShown) {
    clearTimeout(teaserTimer);
    teaserTimer = setTimeout(() => { if (isActive('result') && !openSheet) { state.teaserShown = true; sheet('teaser'); } }, 1600);
  }
  if (name === 'done') { const d = $('.done'); d.classList.remove('enter'); d.offsetWidth; d.classList.add('enter'); }
  if (name === 'year') setTimeout(() => yearIn.focus({ preventScroll: true }), 50);
}
const isActive = n => $(`[data-screen="${n}"]`).classList.contains('is-active');

/* sheets — Figma: 등장 0.5 ease(.2,1.08,.32,1) / 전환 0.45 ease-in-out / 닫기 0.35 */
let openSheet = null;
function sheet(name) {
  const dim = $('#dim');
  if (openSheet && openSheet !== name) { const prev = $('#' + openSheet); prev.classList.remove('on'); prev.setAttribute('aria-hidden', 'true'); }
  if (name) {
    const el = $('#' + name); el.classList.remove('off-fast'); el.classList.add('on'); el.setAttribute('aria-hidden', 'false'); dim.classList.add('on');
    if (name === 'signup') setTimeout(() => $('#phone').focus({ preventScroll: true }), 450);
  } else if (openSheet) {
    const el = $('#' + openSheet); el.classList.add('off-fast'); el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); dim.classList.remove('on');
  }
  openSheet = name;
}
$('#openSignup').addEventListener('click', () => { clearTimeout(teaserTimer); state.teaserShown = true; sheet('signup'); });
$('#teaserCta').addEventListener('click', () => { $('#agreeMkt').checked = true; sheet('signup'); syncSignup(); });
$('#teaserClose').addEventListener('click', () => sheet(null));
$('#dim').addEventListener('click', () => sheet(null));
// 시트 아래로 끌어서 닫기
$$('.sheet').forEach(el => {
  let y0 = null, dy = 0;
  el.addEventListener('touchstart', e => { if (e.target.closest('input,button,label')) return; y0 = e.touches[0].clientY; dy = 0; el.style.transition = 'none'; }, { passive: true });
  el.addEventListener('touchmove', e => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); el.style.transform = `translateY(${dy}px)`; }, { passive: true });
  el.addEventListener('touchend', () => { if (y0 === null) return; el.style.transition = ''; el.style.transform = ''; if (dy > 90) sheet(null); y0 = null; });
});

/* signup */
const phone = $('#phone');
const phoneDigits = () => phone.value.replace(/\D/g, '');
const phoneValid = () => /^01[016789]\d{7,8}$/.test(phoneDigits());
function syncSignup() { $('#submit').disabled = !(phoneValid() && $('#agreeReq').checked); }
phone.addEventListener('input', () => {
  const d = phoneDigits().slice(0, 11);
  phone.value = d.length < 4 ? d : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
  if (phoneValid()) { $('#phoneErr').hidden = true; $('#phoneBox').classList.remove('error'); }
  syncSignup();
});
phone.addEventListener('blur', () => { const bad = phoneDigits().length > 0 && !phoneValid(); $('#phoneErr').hidden = !bad; $('#phoneBox').classList.toggle('error', bad); });
$('#agreeReq').addEventListener('change', syncSignup);
$('#viewPolicy').addEventListener('click', e => { e.preventDefault(); $('#policy').hidden = false; });
$('#closePolicy').addEventListener('click', () => { $('#policy').hidden = true; });
$('#policy').addEventListener('click', e => { if (e.target.id === 'policy') $('#policy').hidden = true; });

$('#signup').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#submit'); if (btn.disabled) return;
  btn.disabled = true; btn.classList.add('loading');
  const r = state.r;
  const entry = { at: new Date().toISOString(), phone: phoneDigits(), type: state.type, calendar: state.calendar, month: state.month, day: state.day, year: state.year, target: iso(r.target), alert: iso(r.alert.date), marketing: $('#agreeMkt').checked };
  // DB 연동 전 — 시연용으로 이 기기에만 저장
  try { const list = JSON.parse(localStorage.getItem('mongttang:alarms') || '[]'); list.push(entry); localStorage.setItem('mongttang:alarms', JSON.stringify(list)); } catch {}
  console.info('[몽땅] 알림 신청 (DB 미연동, 로컬 저장)', entry);
  await wait(700);
  btn.classList.remove('loading');
  const ad = r.alert.date, yr = ad.getUTCFullYear() !== TODAY.getUTCFullYear() ? `${ad.getUTCFullYear()}년 ` : '';
  $('#dSub').textContent = `${yr}${fmtMD(ad)}, ${TYPES[state.type].name} D-${r.alert.offset}에\n문자로 알려드릴게요`;
  sheet(null);
  await wait(200);
  go('done', { mode: 'dissolve' });
});

/* ⑦ 완료 → 처음으로 */
$('[data-action="home"]').addEventListener('click', async () => {
  showLandingInstant();
  state.type = null; state.r = null; state.teaserShown = false;
  $$('.option').forEach(o => o.classList.remove('on'));
  resetDate();
  phone.value = ''; $('#agreeReq').checked = false; $('#agreeMkt').checked = false; syncSignup();
  await go('home', { mode: 'dissolve' });
  stack.length = 0; stack.push('home');
});

/* 모바일 키보드: 바텀 CTA를 키보드 위로 */
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fit = () => { const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); document.documentElement.style.setProperty('--kb', kb + 'px'); $$('.cta-bar, .sheet').forEach(el => { el.style.bottom = kb ? kb + 'px' : ''; }); };
  vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
}

/* ───────── 모아 위치·크기: 어떤 화면 높이에서도 같은 노출 비율 유지 ─────────
   Figma 390×844 기준 값에서 출발해, 콘텐츠 아래 남는 공간에 맞춰 크기를 조절하고
   캐릭터가 보이는 비율(visible)을 시안과 같게 맞춰요. */
const MOA = {
  home: { el: '.home-moa', src: 'party', designCharH: 487.6, visible: .827, after: () => { const s = $('.home-sub'); return s.offsetTop + s.offsetHeight; }, gap: -17, minGap: -17, cx: -4.5 },
  who: { el: '.who-moa', src: 'badge', designCharH: 264.3, visible: .797, after: () => { const o = $('.options'); return o.offsetTop + o.offsetHeight; }, gap: 166, minGap: 64, cx: 77.6, bubble: true },
  done: { el: '.done-moa', src: 'badge', designCharH: 404.5, visible: .845, after: () => { const b = $('.done .btn-hero'); return b.offsetTop + b.offsetHeight; }, gap: 40, minGap: 28, cx: -7.5 },
};
const IMG = { party: { top: .259, bot: .903, l: .163, r: .792, ratio: 1100 / 1375 }, badge: { top: .093, bot: .905, l: .09, r: .881, ratio: 900 / 1189 } };
function layoutMoa() {
  for (const [key, c] of Object.entries(MOA)) {
    const el = $(c.el), scr = el.closest('.screen'); const H = scr.clientHeight, W = scr.clientWidth;
    if (!H) continue;
    const im = IMG[c.src], contentBottom = c.after();
    const avail = H - contentBottom - c.gap;
    let charH = Math.min(Math.max(avail / c.visible, c.designCharH * .66), c.designCharH * 1.12);
    let charTop = Math.max(H - c.visible * charH, contentBottom + c.minGap);
    const imgH = charH / (im.bot - im.top), imgW = imgH * im.ratio, s = charH / c.designCharH;
    const charCx = W / 2 + c.cx * s;
    const left = charCx - imgW * (im.l + im.r) / 2;
    Object.assign(el.style, { width: imgW + 'px', left: left + 'px', top: (charTop - imgH * im.top) + 'px' });
    if (c.bubble) { const b = $('.bubble'); const bw = b.offsetWidth || 188; const bl = Math.max(16, Math.min(W - bw - 16, charCx - 223.6 * s)); Object.assign(b.style, { left: bl + 'px', top: (charTop - 26 * s) + 'px' }); }
  }
}
const relayout = () => requestAnimationFrame(layoutMoa);
addEventListener('resize', relayout); window.visualViewport?.addEventListener('resize', relayout);
document.fonts?.ready.then(relayout);
$$('.screen').forEach(s => new MutationObserver(relayout).observe(s, { attributes: true, attributeFilter: ['class'] }));
layoutMoa();

playIntro();
