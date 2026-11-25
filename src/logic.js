// منطق صافي (من غير أي مكتبات) عشان يبقى سهل تختبره

export const CURRENCIES = [
  { code: 'USD', name: 'الدولار الأمريكي', flag: '🇺🇸' },
  { code: 'SAR', name: 'الريال السعودي', flag: '🇸🇦' },
  { code: 'EUR', name: 'اليورو', flag: '🇪🇺' },
];

// الـ API بيرجع الأسعار مقابل الدولار، فبنحسب: 1 عملة = كام جنيه
export function toEgpRates(apiRates) {
  const out = {};
  for (const { code } of CURRENCIES) {
    const egp = apiRates?.EGP;
    const unit = apiRates?.[code];
    if (!(egp > 0) || !(unit > 0)) throw new Error(`سعر ${code} غير متاح`);
    out[code] = egp / unit;
  }
  return out;
}

// بيحول "٥٢٫٥" أو "52,5" لرقم. الفاضي = null (مفيش حد) ، الغلط = NaN
export function parseLimit(text) {
  const clean = String(text ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,،]/g, '.')
    .trim();
  if (clean === '') return null;
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(clean)) return NaN;
  const n = Number(clean);
  return n > 0 ? n : NaN;
}

export function validateLimits(high, low) {
  if (Number.isNaN(high) || Number.isNaN(low)) return 'اكتب أرقام صحيحة أكبر من صفر';
  if (high !== null && low !== null && low >= high) return 'الحد الأدنى لازم يكون أقل من الحد الأعلى';
  return null;
}

export function zoneOf(rate, limit) {
  if (limit?.high != null && rate >= limit.high) return 'high';
  if (limit?.low != null && rate <= limit.low) return 'low';
  return 'normal';
}

// بيبعت تنبيه بس لما السعر "يدخل" منطقة جديدة، عشان ميزعجكش بنفس التنبيه كل مرة
export function evaluateAlerts(rates, limits, previousZones) {
  const zones = {};
  const alerts = [];
  for (const { code, name } of CURRENCIES) {
    const rate = rates[code];
    const zone = zoneOf(rate, limits[code]);
    zones[code] = zone;
    if (zone === 'normal' || zone === previousZones[code]) continue;
    const up = zone === 'high';
    const limit = up ? limits[code].high : limits[code].low;
    alerts.push({
      code,
      title: `${up ? '📈' : '📉'} ${name} ${up ? 'وصل للحد الأعلى' : 'وصل للحد الأدنى'}`,
      body: `السعر دلوقتي ${rate.toFixed(2)} جنيه (الحد اللي حددته ${limit})`,
    });
  }
  return { zones, alerts };
}
