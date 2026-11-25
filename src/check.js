import { evaluateAlerts } from './logic';
import { getRates } from './rates';
import { hasPermission, sendNotification } from './notify';
import { KEYS, load, save } from './storage';

// كل العمليات اللي بتعدل حالة التنبيهات بتتنفذ ورا بعض، عشان الإشعار ميتكررش
let queue = Promise.resolve();
function inOrder(job) {
  const result = queue.then(job);
  queue = result.catch(() => {});
  return result;
}

async function run() {
  const data = await getRates();
  // من غير إذن إشعارات مبنسجلش إن التنبيه اتبعت، عشان يتبعت بعد ما تسمح
  if (await hasPermission()) {
    const limits = await load(KEYS.limits, {});
    const previous = await load(KEYS.zones, {});
    const { zones, alerts } = evaluateAlerts(data.rates, limits, previous);
    for (const a of alerts) await sendNotification(a.title, a.body);
    await save(KEYS.zones, zones);
  }
  return data;
}

export function checkRates() {
  return inOrder(run);
}

export function saveLimit(code, limit) {
  return inOrder(async () => {
    const next = { ...(await load(KEYS.limits, {})), [code]: limit };
    await save(KEYS.limits, next);
    // الحد اتغير، فنصفّر حالة العملة دي عشان تتفحص من جديد
    const zones = await load(KEYS.zones, {});
    delete zones[code];
    await save(KEYS.zones, zones);
    return next;
  });
}
