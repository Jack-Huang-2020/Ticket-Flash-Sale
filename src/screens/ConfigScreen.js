import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { loadConfig, saveConfig } from '../utils/storage';

const ConfigScreen = ({ navigation, route }) => {
  const [config, setConfig] = useState({
    keyword: '',
    date: '',
    priceMin: '',
    priceMax: '',
    quantity: '1',
    interval: '1.5',
    maxRetry: '60',
    buyerName: '',
    buyerId: '',
  });

  useEffect(() => {
    loadConfig().then((saved) => {
      setConfig({
        keyword: saved.keyword || '',
        date: saved.date || '',
        priceMin: saved.priceMin ? String(saved.priceMin) : '',
        priceMax: saved.priceMax && saved.priceMax < 99999 ? String(saved.priceMax) : '',
        quantity: String(saved.quantity || 1),
        interval: String(saved.interval || 1.5),
        maxRetry: String(saved.maxRetry || 60),
        buyerName: saved.buyerName || '',
        buyerId: saved.buyerId || '',
      });
    });
  }, []);

  const handleSave = async () => {
    if (!config.keyword.trim()) {
      Alert.alert('提示', '请输入搜索关键词');
      return;
    }

    const toSave = {
      keyword: config.keyword.trim(),
      date: config.date.trim(),
      priceMin: parseInt(config.priceMin) || 0,
      priceMax: parseInt(config.priceMax) || 99999,
      quantity: parseInt(config.quantity) || 1,
      interval: parseFloat(config.interval) || 1.5,
      maxRetry: parseInt(config.maxRetry) || 60,
      buyerName: config.buyerName.trim(),
      buyerId: config.buyerId.trim(),
    };

    const ok = await saveConfig(toSave);
    if (ok) {
      Alert.alert('成功', '配置已保存', [
        { text: '确定', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('错误', '保存失败');
    }
  };

  const updateField = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>搜索设置</Text>

        <Text style={styles.label}>关键词 *</Text>
        <TextInput
          style={styles.input}
          value={config.keyword}
          onChangeText={(v) => updateField('keyword', v)}
          placeholder="例如: 周杰伦 演唱会"
        />

        <Text style={styles.label}>日期</Text>
        <TextInput
          style={styles.input}
          value={config.date}
          onChangeText={(v) => updateField('date', v)}
          placeholder="例如: 2025-08-15 (可选)"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>票价设置</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>最低价</Text>
            <TextInput
              style={styles.input}
              value={config.priceMin}
              onChangeText={(v) => updateField('priceMin', v)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>最高价</Text>
            <TextInput
              style={styles.input}
              value={config.priceMax}
              onChangeText={(v) => updateField('priceMax', v)}
              placeholder="不限"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.label}>数量</Text>
        <TextInput
          style={styles.input}
          value={config.quantity}
          onChangeText={(v) => updateField('quantity', v)}
          placeholder="1"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>抢票设置</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>刷新间隔(秒)</Text>
            <TextInput
              style={styles.input}
              value={config.interval}
              onChangeText={(v) => updateField('interval', v)}
              placeholder="1.5"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>最大重试</Text>
            <TextInput
              style={styles.input}
              value={config.maxRetry}
              onChangeText={(v) => updateField('maxRetry', v)}
              placeholder="60"
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>购票人信息</Text>

        <Text style={styles.label}>姓名</Text>
        <TextInput
          style={styles.input}
          value={config.buyerName}
          onChangeText={(v) => updateField('buyerName', v)}
          placeholder="购票人姓名 (可选)"
        />

        <Text style={styles.label}>身份证号</Text>
        <TextInput
          style={styles.input}
          value={config.buyerId}
          onChangeText={(v) => updateField('buyerId', v)}
          placeholder="身份证号 (可选)"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>保存配置</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 0,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#e63946',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ConfigScreen;
