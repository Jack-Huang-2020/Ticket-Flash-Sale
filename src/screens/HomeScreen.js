import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  NativeModules,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadConfig } from '../utils/storage';

const { DamaiAccessibility } = NativeModules;

const HomeScreen = ({ navigation }) => {
  const [config, setConfig] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadConfig().then(setConfig);
    }, [])
  );

  const navigateToGrab = () => {
    if (!config?.keyword) {
      Alert.alert('提示', '请先配置抢票参数', [
        { text: '去配置', onPress: () => navigation.navigate('Config') },
        { text: '取消' },
      ]);
      return;
    }
    navigation.navigate('Grab', { config });
  };

  const openDamaiApp = () => {
    DamaiAccessibility.openDamaiApp();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>大麦抢票助手</Text>
        <Text style={styles.subtitle}>自动操作大麦APP抢票</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>抢票模式</Text>
        <Text style={styles.statusValue}>无障碍服务模式</Text>
        <Text style={styles.statusDetail}>
          通过无障碍服务自动操作大麦APP
        </Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>当前目标</Text>
        <Text style={styles.statusValue}>
          {config?.keyword || '未设置'}
        </Text>
        {config?.keyword ? (
          <Text style={styles.statusDetail}>
            {config.date ? `${config.date} | ` : ''}
            价格 {config.priceMin}-{config.priceMax} | 数量 {config.quantity}
          </Text>
        ) : null}
      </View>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Config')}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>抢票配置</Text>
          <Text style={styles.menuDesc}>设置关键词、日期、价位等</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.primaryItem]}
          onPress={navigateToGrab}>
          <Text style={styles.menuIcon}>🎫</Text>
          <Text style={[styles.menuText, styles.primaryText]}>开始抢票</Text>
          <Text style={[styles.menuDesc, styles.primaryDesc]}>
            自动操作大麦APP抢购
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={openDamaiApp}>
          <Text style={styles.menuIcon}>📱</Text>
          <Text style={styles.menuText}>打开大麦APP</Text>
          <Text style={styles.menuDesc}>手动浏览演出</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#e63946',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statusDetail: {
    fontSize: 13,
    color: '#888',
    marginTop: 5,
  },
  menu: {
    paddingHorizontal: 15,
  },
  menuItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  primaryItem: {
    backgroundColor: '#e63946',
  },
  menuIcon: {
    fontSize: 24,
  },
  menuText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  primaryText: {
    color: '#fff',
  },
  menuDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 5,
  },
  primaryDesc: {
    color: 'rgba(255,255,255,0.8)',
  },
});

export default HomeScreen;
