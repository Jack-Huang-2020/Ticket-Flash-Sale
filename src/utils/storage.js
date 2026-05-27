import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFIG_KEY = '@dania_config';

const DEFAULT_CONFIG = {
  keyword: '',
  date: '',
  priceMin: 0,
  priceMax: 99999,
  quantity: 1,
  interval: 1.5,
  maxRetry: 60,
  buyerName: '',
  buyerId: '',
};

export const loadConfig = async () => {
  try {
    const json = await AsyncStorage.getItem(CONFIG_KEY);
    return json ? { ...DEFAULT_CONFIG, ...JSON.parse(json) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const saveConfig = async (config) => {
  try {
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
};
