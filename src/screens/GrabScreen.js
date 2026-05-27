import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  NativeModules,
  DeviceEventEmitter,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const { DamaiAccessibility } = NativeModules;

const MODE_AUTO_SEARCH = 'auto_search';      // 自动搜索+自动抢购
const MODE_MANUAL_SEARCH = 'manual_search';  // 手动找演出+自动抢购
const MODE_BUY_ONLY = 'buy_only';            // 只抢购功能

const MODE_INFO = {
  [MODE_AUTO_SEARCH]: {
    label: '自动搜索 + 自动抢购',
    desc: 'App自动打开大麦→搜索关键词→找到演出→自动抢购',
    icon: '🤖',
  },
  [MODE_MANUAL_SEARCH]: {
    label: '手动找演出 + 自动抢购',
    desc: '你手动在大麦里找到演出页面，然后点"开始抢票"，App自动抢购',
    icon: '🎯',
  },
  [MODE_BUY_ONLY]: {
    label: '只抢购功能',
    desc: '在演出页面点"开始抢票"，App自动点击购买→选座→提交订单',
    icon: '⚡',
  },
};

const GrabScreen = ({ navigation, route }) => {
  const { config } = route.params || {};
  const [serviceEnabled, setServiceEnabled] = useState(false);
  const [serviceRunning, setServiceRunning] = useState(false);
  const [damaiInstalled, setDamaiInstalled] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [status, setStatus] = useState('选择抢票模式');
  const [grabCount, setGrabCount] = useState(0);
  const [logs, setLogs] = useState([]);

  useFocusEffect(
    useCallback(() => {
      checkServiceStatus();
      setupEventListeners();
      return () => {
        DeviceEventEmitter.removeAllListeners('DamaiServiceEvent');
      };
    }, [])
  );

  const checkServiceStatus = async () => {
    try {
      const enabled = await DamaiAccessibility.isServiceEnabled();
      setServiceEnabled(enabled);
      const installed = await DamaiAccessibility.isDamaiInstalled();
      setDamaiInstalled(installed);
      const serviceStatus = await DamaiAccessibility.getServiceStatus();
      setServiceRunning(serviceStatus.isRunning);

      if (!enabled) setStatus('请先开启无障碍服务');
      else if (!installed) setStatus('请先安装大麦APP');
      else if (!serviceStatus.isRunning) setStatus('无障碍服务未连接');
      else if (!selectedMode) setStatus('请选择抢票模式');
      else setStatus('就绪，点击开始抢票');
    } catch (e) {
      setStatus('检查状态失败: ' + e.message);
    }
  };

  const setupEventListeners = () => {
    DeviceEventEmitter.addListener('DamaiServiceEvent', (event) => {
      switch (event.type) {
        case 'serviceConnected':
          setServiceRunning(true);
          setServiceEnabled(true);
          addLog('无障碍服务已连接');
          break;
        case 'grabStarted':
          setIsGrabbing(true);
          addLog('抢票已启动');
          break;
        case 'grabStopped':
          setIsGrabbing(false);
          setStatus('已停止');
          addLog('抢票已停止');
          break;
        case 'status':
          setStatus(event.status || event.data);
          setGrabCount(event.count || 0);
          break;
        case 'log':
          addLog(event.data || event.status);
          break;
        case 'buyButtonClicked':
          setStatus('已点击购买按钮!');
          addLog('购买按钮已点击');
          break;
        case 'orderSubmitted':
          setStatus('订单已提交! 请手动完成支付');
          addLog('订单已提交');
          Alert.alert('成功', '订单已提交！请手动完成支付');
          break;
        case 'maxRetryReached':
          setStatus('达到最大重试次数');
          addLog('已达最大重试次数');
          setIsGrabbing(false);
          break;
        case 'error':
          setStatus('错误: ' + event.data);
          addLog('错误: ' + event.data);
          break;
      }
    });
  };

  const addLog = (msg) => {
    setLogs((prev) => [...prev.slice(-40), `${new Date().toLocaleTimeString()} ${msg}`]);
  };

  const handleOpenSettings = () => {
    DamaiAccessibility.openAccessibilitySettings();
  };

  const handleStartGrab = () => {
    if (!serviceEnabled) {
      Alert.alert('需要开启无障碍服务', '操作步骤：\n1. 点击"去设置"\n2. 找到"Dania抢票"\n3. 开启开关\n4. 返回App', [
        { text: '去设置', onPress: handleOpenSettings },
        { text: '取消' },
      ]);
      return;
    }
    if (!damaiInstalled) {
      Alert.alert('提示', '请先安装大麦APP');
      return;
    }
    if (!serviceRunning) {
      Alert.alert('服务未连接', '请关闭App后重新打开，或在设置里关闭再重新开启无障碍服务', [
        { text: '去设置', onPress: handleOpenSettings },
        { text: '知道了' },
      ]);
      return;
    }
    if (!selectedMode) {
      Alert.alert('提示', '请先选择抢票模式');
      return;
    }

    const modeConfig = {
      mode: selectedMode,
      keyword: config?.keyword || '',
      interval: config?.interval || 1.5,
      maxRetry: config?.maxRetry || 60,
    };

    addLog(`启动抢票 - 模式: ${MODE_INFO[selectedMode].label}`);
    setStatus('正在启动...');
    DamaiAccessibility.startGrab(modeConfig);
  };

  const handleStopGrab = () => {
    DamaiAccessibility.stopGrab();
  };

  const renderModeSelector = () => (
    <View style={styles.modeCard}>
      <Text style={styles.cardTitle}>选择抢票模式</Text>
      {Object.entries(MODE_INFO).map(([key, info]) => (
        <TouchableOpacity
          key={key}
          style={[styles.modeOption, selectedMode === key && styles.modeOptionActive]}
          onPress={() => {
            setSelectedMode(key);
            if (serviceEnabled && serviceRunning && damaiInstalled) {
              setStatus('就绪，点击开始抢票');
            }
            addLog(`选择模式: ${info.label}`);
          }}>
          <Text style={styles.modeIcon}>{info.icon}</Text>
          <View style={styles.modeTextWrap}>
            <Text style={[styles.modeLabel, selectedMode === key && styles.modeLabelActive]}>
              {info.label}
            </Text>
            <Text style={styles.modeDesc}>{info.desc}</Text>
          </View>
          {selectedMode === key && <Text style={styles.modeCheck}>✓</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatusCard = () => (
    <View style={styles.statusCard}>
      <Text style={styles.cardTitle}>状态</Text>
      <View style={styles.statusRow}>
        <View style={[styles.dot, serviceEnabled && serviceRunning ? styles.dotGreen : styles.dotRed]} />
        <Text style={styles.statusLabel}>无障碍服务</Text>
        <Text style={[styles.statusValue, serviceEnabled && serviceRunning ? styles.textGreen : styles.textRed]}>
          {serviceEnabled ? (serviceRunning ? '已连接' : '已开启未连接') : '未开启'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.dot, damaiInstalled ? styles.dotGreen : styles.dotRed]} />
        <Text style={styles.statusLabel}>大麦APP</Text>
        <Text style={[styles.statusValue, damaiInstalled ? styles.textGreen : styles.textRed]}>
          {damaiInstalled ? '已安装' : '未安装'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.dot, isGrabbing ? styles.dotGreen : styles.dotRed]} />
        <Text style={styles.statusLabel}>当前状态</Text>
        <Text style={styles.statusValue}>{status}</Text>
      </View>
      {grabCount > 0 && (
        <Text style={styles.countText}>已尝试 {grabCount} 次</Text>
      )}
      <TouchableOpacity onPress={checkServiceStatus} style={styles.refreshBtn}>
        <Text style={styles.refreshBtnText}>刷新状态</Text>
      </TouchableOpacity>
    </View>
  );

  const renderControls = () => {
    if (!serviceEnabled) {
      return (
        <TouchableOpacity style={styles.settingsBtn} onPress={handleOpenSettings}>
          <Text style={styles.btnText}>开启无障碍服务</Text>
        </TouchableOpacity>
      );
    }
    if (isGrabbing) {
      return (
        <TouchableOpacity style={styles.stopBtn} onPress={handleStopGrab}>
          <Text style={styles.btnText}>停止抢票</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.startBtn, (!serviceRunning || !damaiInstalled || !selectedMode) && styles.disabledBtn]}
        onPress={handleStartGrab}>
        <Text style={styles.btnText}>开始抢票</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>自动抢票</Text>
        <Text style={styles.subtitle}>大麦APP v9.0.22 | iQOO Z9</Text>
      </View>

      <ScrollView style={styles.content}>
        {renderStatusCard()}
        {renderModeSelector()}

        {!serviceEnabled && (
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>首次使用请开启无障碍服务</Text>
            <Text style={styles.helpStep}>1. 点击下方"开启无障碍服务"</Text>
            <Text style={styles.helpStep}>2. 在设置中找到"Dania抢票"</Text>
            <Text style={styles.helpStep}>3. 开启开关并确认权限</Text>
            <Text style={styles.helpStep}>4. 返回本App</Text>
          </View>
        )}

        <View style={styles.configCard}>
          <Text style={styles.cardTitle}>当前配置</Text>
          <Text style={styles.configItem}>关键词: {config?.keyword || '未设置'}</Text>
          <Text style={styles.configItem}>刷新间隔: {config?.interval || 1.5}秒</Text>
          <Text style={styles.configItem}>最大重试: {config?.maxRetry || 60}次</Text>
        </View>

        <View style={styles.controls}>
          {renderControls()}
        </View>

        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>运行日志</Text>
          {logs.length === 0 && <Text style={styles.logText}>暂无日志</Text>}
          {logs.map((log, i) => (
            <Text key={i} style={styles.logText}>{log}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#e63946', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  content: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 10 },

  // Status
  statusCard: { backgroundColor: '#fff', margin: 15, marginBottom: 10, padding: 15, borderRadius: 10, elevation: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotRed: { backgroundColor: '#F44336' },
  statusLabel: { fontSize: 13, color: '#666', flex: 1 },
  statusValue: { fontSize: 13, fontWeight: 'bold' },
  textGreen: { color: '#4CAF50' },
  textRed: { color: '#F44336' },
  countText: { fontSize: 12, color: '#888', marginTop: 8, textAlign: 'center' },
  refreshBtn: { marginTop: 10, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 5, alignItems: 'center' },
  refreshBtnText: { fontSize: 12, color: '#666' },

  // Mode selector
  modeCard: { backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 10, elevation: 2 },
  modeOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: '#eee' },
  modeOptionActive: { borderColor: '#e63946', backgroundColor: '#FFF5F5' },
  modeIcon: { fontSize: 24, marginRight: 12 },
  modeTextWrap: { flex: 1 },
  modeLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  modeLabelActive: { color: '#e63946' },
  modeDesc: { fontSize: 11, color: '#888', marginTop: 3 },
  modeCheck: { fontSize: 18, color: '#e63946', fontWeight: 'bold' },

  // Help
  helpCard: { backgroundColor: '#FFF3E0', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  helpTitle: { fontSize: 14, fontWeight: 'bold', color: '#E65100', marginBottom: 8 },
  helpStep: { fontSize: 13, color: '#BF360C', marginBottom: 3, lineHeight: 20 },

  // Config
  configCard: { backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 10, elevation: 2 },
  configItem: { fontSize: 13, color: '#666', marginBottom: 3 },

  // Controls
  controls: { paddingHorizontal: 15, marginBottom: 15 },
  settingsBtn: { backgroundColor: '#FF9800', padding: 15, borderRadius: 10, alignItems: 'center' },
  startBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  stopBtn: { backgroundColor: '#F44336', padding: 15, borderRadius: 10, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#9E9E9E' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Logs
  logContainer: { backgroundColor: '#1a1a1a', marginHorizontal: 15, marginBottom: 20, padding: 10, borderRadius: 10, maxHeight: 200 },
  logTitle: { fontSize: 12, color: '#666', marginBottom: 8 },
  logText: { fontSize: 11, color: '#4CAF50', fontFamily: 'monospace', marginBottom: 2 },
});

export default GrabScreen;
