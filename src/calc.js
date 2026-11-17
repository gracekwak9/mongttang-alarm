import KoreanLunarCalendar from 'korean-lunar-calendar';

const DAY = 86400000;
export const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

/** 한국 시간 기준 오늘 0시 (UTC Date로 표현) */
export function todayKST(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600000);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()));
}
const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** 음력 → 양력. 그해에 없는 날(30일 등)은 그 달 마지막 날로 */
export function lunarToSolar(y, m, d) {
  const cal = new KoreanLunarCalendar();
  for (let dd = d; dd >= Math.min(d, 28); dd--) {
    if (cal.setLunarDate(y, m, dd, false)) {
      const s = cal.getSolarCalendar();
      return utc(s.year, s.month, s.day);
    }
  }
  return null;
}

/** 오늘 이후(오늘 포함) 가장 가까운 기념일 양력 날짜 */
export function nextOccurrence({ calendar, month, day }, from) {
  const ty = from.getUTCFullYear();
  const list = [];
  for (const y of [ty - 1, ty, ty + 1, ty + 2]) {
    const dt = calendar === 'lunar' ? lunarToSolar(y, month, day) : utc(y, month, Math.min(day, lastDay(y, month)));
    if (dt && dt >= from) list.push(dt);
  }
  list.sort((a, b) => a - b);
  return list[0];
}

export const daysBetween = (a, b) => Math.round((b - a) / DAY);
export const addDays = (d, n) => new Date(d.getTime() + n * DAY);
export const fmtFull = d => `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${WEEK[d.getUTCDay()]}요일`;
export const fmtShort = d => `${d.getUTCMonth() + 1}.${d.getUTCDate()} (${WEEK[d.getUTCDay()]})`;
export const fmtMD = d => `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WEEK[d.getUTCDay()]})`;
export const iso = d => d.toISOString().slice(0, 10);

const BIRTH = {
  61: ['환갑', '예순한 번째 생신'], 70: ['칠순', '일흔 번째 생신'], 77: ['희수', '일흔일곱 번째 생신'],
  80: ['팔순', '여든 번째 생신'], 88: ['미수', '여든여덟 번째 생신'], 90: ['구순', '아흔 번째 생신'],
};
const WED = { 10: '석혼식', 20: '자기혼식', 25: '은혼식', 30: '진주혼식', 35: '산호혼식', 40: '루비혼식', 45: '사파이어혼식', 50: '금혼식' };

/**
 * 특별한 해 문구. { title, hi(강조할 부분), sub } 또는 null
 * 생신은 세는나이(환갑·칠순 관례) 기준
 */
export function specialYear(type, baseYear, targetYear) {
  if (!baseYear) return null;
  if (type === 'wedding') {
    const n = targetYear - baseYear;
    if (n <= 0) return null;
    if (WED[n]) return { title: `이번이 결혼 ${n}주년이에요`, hi: `${n}주년`, sub: `${WED[n]}, 평소보다 특별하게 준비해요` };
    const next = Object.keys(WED).map(Number).find(k => k > n && k - n <= 5);
    if (next) return { title: `이번이 결혼 ${n}주년이에요`, hi: `${n}주년`, sub: `${next - n}년 뒤엔 ${next}주년 ${WED[next]}이에요` };
    return { title: `이번이 결혼 ${n}주년이에요`, hi: `${n}주년`, sub: '숫자를 레터링 케이크에 넣어보세요' };
  }
  const age = targetYear - baseYear + 1;
  if (age < 2 || age > 120) return null;
  if (BIRTH[age]) return { title: `이번 생신은 ${BIRTH[age][0]}이에요`, hi: BIRTH[age][0], sub: `${BIRTH[age][1]}, 평소보다 일찍 준비해요` };
  const next = Object.keys(BIRTH).map(Number).find(k => k > age && k - age <= 5);
  if (next) return { title: `${BIRTH[next][0]}까지 ${next - age}년 남았어요`, hi: `${next - age}년`, sub: `${targetYear + next - age}년 생신이 ${BIRTH[next][0]}이에요` };
  return null;
}

/** 알림 일정: D-30. 한 달도 안 남았으면(soon) 대안 제시: 8일 이상 남았으면 D-7, 다음 해 D-30 */
export function alertPlan(target, today, nextTarget) {
  const dday = daysBetween(today, target);
  if (dday > 30) return { offset: 30, date: addDays(target, -30), nextYear: false, soon: false };
  const next = { offset: 30, date: addDays(nextTarget, -30), nextYear: true };
  const d7 = dday > 7 ? { offset: 7, date: addDays(target, -7), nextYear: false } : null;
  return { ...next, soon: true, d7, next };
}

export const TIMELINE = [
  { offset: 30, what: '인기 식당 예약 마감', key: true },
  { offset: 14, what: '레터링 케이크 주문' },
  { offset: 3, what: '손편지·꽃 준비' },
];
