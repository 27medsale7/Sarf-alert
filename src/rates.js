// مصدر الأسعار. لو حبيت تغيره لمصدر تاني (مثلاً أسرع تحديثاً) عدّل الملف ده بس.
import { toEgpRates } from './logic';
import { KEYS, load, save } from './storage';

const URL = 'https://open.er-api.com/v6/latest/USD';

export async function getRates() {
  const cache = await load(KEYS.cache, null);
  // المصدر المجاني بيتحدث مرة في اليوم، فمفيش داعي نطلبه قبل ميعاد التحديث الجاي
  if (cache && Date.now() < cache.nextUpdate) return cache;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.result !== 'success') throw new Error('رد غير متوقع من مصدر الأسعار');
    const fresh = {
      rates: toEgpRates(data.rates),
      updatedAt: data.time_last_update_unix * 1000,
      // لو ميعاد التحديث عدى والبيانات لسه قديمة، استنى ساعة قبل المحاولة التانية
      nextUpdate: Math.max(data.time_next_update_unix * 1000, Date.now() + 60 * 60 * 1000),
    };
    await save(KEYS.cache, fresh);
    return fresh;
  } catch (error) {
    // من غير نت: اعرض آخر سعر محفوظ ووضح إنه قديم
    if (cache) return { ...cache, stale: true };
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
