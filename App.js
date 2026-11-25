import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AppState, I18nManager, KeyboardAvoidingView, Linking, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { startBackgroundCheck } from './src/background';
import { checkRates, saveLimit } from './src/check';
import { CURRENCIES, parseLimit, validateLimits } from './src/logic';
import { requestPermission, sendNotification } from './src/notify';
import { KEYS, load } from './src/storage';

// الواجهة عربي (يمين لشمال) سواء لغة الموبايل عربي أو لأ
const ROW = I18nManager.isRTL ? 'row' : 'row-reverse';
const RIGHT = I18nManager.isRTL ? 'left' : 'right';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState(null);
  const [allowed, setAllowed] = useState(true);
  const [background, setBackground] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await checkRates());
      setError('');
    } catch {
      setError('مقدرتش أجيب الأسعار. اتأكد من النت واسحب لتحت للتحديث.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLimits(await load(KEYS.limits, {}));
      setAllowed(await requestPermission().catch(() => false));
      setBackground(await startBackgroundCheck().catch(() => false));
      await refresh();
    })();
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      setAllowed(await requestPermission().catch(() => false));
      refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const onSaveLimit = async (code, limit) => {
    setLimits(await saveLimit(code, limit));
    await refresh();
  };

  const test = async () => {
    if (!(await requestPermission())) return Alert.alert('الإشعارات مقفولة', 'افتحها من إعدادات الموبايل.');
    await sendNotification('تجربة ✅', 'الإشعارات شغالة');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          >
            <Text style={styles.title}>منبّه الصرف</Text>
            <Text style={styles.muted}>
              {data
                ? `آخر تحديث للسعر: ${new Date(data.updatedAt).toLocaleString('ar-EG')}${data.stale ? ' (محفوظ، مفيش اتصال)' : ''}`
                : 'جاري التحميل...'}
            </Text>

            {!!error && <Text style={styles.warning}>{error}</Text>}
            {!allowed && (
              <Pressable onPress={() => Linking.openSettings()}>
                <Text style={styles.warning}>الإشعارات مقفولة. اضغط هنا وافتحها من الإعدادات.</Text>
              </Pressable>
            )}
            {!background && <Text style={styles.warning}>الفحص في الخلفية مش متاح على الجهاز ده.</Text>}

            {limits && CURRENCIES.map((c) => (
              <CurrencyCard
                key={c.code}
                currency={c}
                rate={data?.rates[c.code]}
                limit={limits[c.code]}
                onSave={onSaveLimit}
              />
            ))}

            <Pressable style={styles.secondary} onPress={test}>
              <Text style={styles.secondaryText}>ابعت إشعار تجريبي</Text>
            </Pressable>
            <Text style={styles.link} onPress={() => Linking.openURL('https://www.exchangerate-api.com')}>
              Rates By Exchange Rate API
            </Text>
            <Text style={styles.muted}>سعر استرشادي، وممكن يختلف عن سعر البيع والشراء في البنك.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function CurrencyCard({ currency, rate, limit, onSave }) {
  const [high, setHigh] = useState(limit?.high?.toString() ?? '');
  const [low, setLow] = useState(limit?.low?.toString() ?? '');

  const submit = async () => {
    const h = parseLimit(high);
    const l = parseLimit(low);
    const problem = validateLimits(h, l);
    if (problem) return Alert.alert('راجع الأرقام', problem);
    await onSave(currency.code, { high: h, low: l });
    Alert.alert('تم الحفظ', h === null && l === null ? 'التنبيه متوقف للعملة دي.' : 'هنبعتلك إشعار لما السعر يوصل للحد.');
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{currency.flag} {currency.name}</Text>
        <Text style={styles.rate}>{rate ? `${rate.toFixed(2)} ج.م` : '—'}</Text>
      </View>
      <View style={styles.row}>
        <Field label="نبهني لو وصل أو زاد عن" value={high} onChange={setHigh} />
        <Field label="نبهني لو وصل أو قل عن" value={low} onChange={setLow} />
      </View>
      <Pressable style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>حفظ</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, value, onChange }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="بدون حد"
        placeholderTextColor="#9aa5a0"
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f5f3' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#10241c', textAlign: RIGHT },
  muted: { color: '#5d6b65', fontSize: 13, textAlign: 'center' },
  warning: { backgroundColor: '#fff3cd', color: '#664d03', padding: 12, borderRadius: 10, textAlign: RIGHT },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12 },
  row: { flexDirection: ROW, justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  name: { fontSize: 17, fontWeight: '600', color: '#10241c' },
  rate: { fontSize: 22, fontWeight: '700', color: '#0f6b4b' },
  label: { fontSize: 12, color: '#5d6b65', marginBottom: 4, textAlign: RIGHT },
  input: {
    borderWidth: 1, borderColor: '#d5ddd9', borderRadius: 10, padding: 10,
    fontSize: 16, color: '#10241c', textAlign: 'center',
  },
  button: { backgroundColor: '#0f6b4b', borderRadius: 10, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { borderWidth: 1, borderColor: '#0f6b4b', borderRadius: 10, padding: 12, alignItems: 'center' },
  secondaryText: { color: '#0f6b4b', fontWeight: '600' },
  link: { color: '#0f6b4b', textDecorationLine: 'underline', textAlign: 'center' },
});
