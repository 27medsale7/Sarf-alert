import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = { limits: 'limits', zones: 'zones', cache: 'ratesCache' };

export async function load(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}
