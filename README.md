# Dania抢票 (Ticket Flash Sale)

基于 React Native + Android 无障碍服务的大麦APP自动抢票工具。通过 Accessibility Service 控制手机上的大麦APP，实现自动搜索演出、自动选座、自动提交订单。

## 项目架构

```
DaniaApp/
├── App.tsx                          # 入口文件，导航配置
├── src/
│   └── screens/
│       ├── HomeScreen.js            # 首页：状态概览、快捷操作
│       ├── ConfigScreen.js          # 配置页：关键词、场次、票档等参数
│       └── GrabScreen.js            # 抢票页：模式选择、启动/停止、日志
├── android/
│   └── app/src/main/
│       ├── AndroidManifest.xml      # 权限声明、Service注册
│       ├── java/com/daniaapp/
│       │   ├── MainActivity.kt              # React Native 主 Activity
│       │   ├── MainApplication.kt           # 注册 Native Module
│       │   ├── DamaiAccessibilityService.kt # 核心：无障碍服务（状态机逻辑）
│       │   ├── DamaiAccessibilityModule.kt  # React Native ↔ Native 桥接
│       │   └── DamaiAccessibilityPackage.kt # Package 注册
│       └── res/xml/
│           └── accessibility_service_config.xml  # 无障碍服务配置
```

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React Native | 0.76.9 |
| 导航 | @react-navigation/native-stack | 6.x |
| 本地存储 | @react-native-async-storage | 2.1.2 |
| 原生桥接 | React Native Native Modules (Kotlin) | - |
| 自动化引擎 | Android Accessibility Service | - |
| 目标APP | 大麦 (cn.damai) | v9.0.22.1 |
| 测试设备 | iQOO Z9 | Android |

## 核心原理

### 无障碍服务 (Accessibility Service)

Android 无障碍服务允许应用监听和操作其他应用的 UI 元素。本项目利用这一机制：

1. **监听界面变化** — 通过 `AccessibilityEvent` 感知大麦APP的页面切换
2. **查找UI元素** — 通过 `AccessibilityNodeInfo` 定位按钮、输入框等
3. **执行操作** — 通过 `performAction()` 模拟点击、输入等操作

### 状态机流程

抢票流程采用状态机设计，每步完成才进入下一步：

```
步骤1: 打开大麦 → 在搜索框输入关键词
    ↓
步骤2: 在搜索结果中点击目标演出
    ↓
步骤3: 点击"去设置" → 设置观演人 → 返回
    ↓
步骤4: 点击"立即预定"按钮
    ↓
步骤5: 选择场次 → 选择票档 → 点击确定
    ↓
步骤6: 点击"立即提交"完成抢票
```

### 三种抢票模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| 自动搜索+自动抢购 | 全自动：搜索关键词 → 找演出 → 抢购 | 热门演出开售前挂机 |
| 手动找演出+自动抢购 | 你找演出页面，App自动抢购 | 已知道演出在哪 |
| 只抢购 | 在演出页只负责点击购买和提交 | 演出页面已打开 |

## 开发流程

### 1. 环境搭建

```bash
# 安装依赖
npm install

# 启动 Metro 开发服务器
npx react-native start

# 连接手机（USB调试模式）
adb reverse tcp:8081 tcp:8081

# 安装调试版
npx react-native run-android
```

### 2. 构建 Release APK

```bash
cd android
./gradlew assembleRelease

# APK 输出路径
# android/app/build/outputs/apk/release/app-release.apk

# 安装到手机
adb install -r app/build/outputs/apk/release/app-release.apk
```

### 3. 使用流程

1. 安装 APK 到手机
2. 打开 Dania抢票 App
3. 首次使用需开启无障碍服务：
   - 点击"开启无障碍服务"
   - 在系统设置中找到"Dania抢票"
   - 开启开关并确认权限
4. 进入配置页设置：关键词、刷新间隔、最大重试次数
5. 进入抢票页选择模式
6. 点击"开始抢票"

## 关键文件说明

### DamaiAccessibilityService.kt

核心抢票逻辑，采用状态机设计：

- `startGrab(config)` — 启动抢票，初始化步骤
- `processStep()` — 状态机主循环，根据 `currentStep` 执行对应步骤
- `step1_searchInput()` — 查找搜索框并输入关键词
- `step2_selectShow()` — 在搜索结果中找到演出并点击
- `step3_setViewer()` — 点击"去设置"配置观演人
- `step4_clickReserve()` — 点击"立即预定"
- `step5_selectTicket()` — 选择场次和票档
- `step6_submitOrder()` — 提交订单

关键设计：
- `isProcessing` 标志防止多个无障碍事件并发触发
- `currentStep` 控制流程进度，不会跳步
- 每步有独立的元素查找和点击逻辑

### DamaiAccessibilityModule.kt

React Native 与 Android 原生的桥接层：

- `startGrab(config)` — 接收JS传来的配置，启动服务
- `stopGrab()` — 停止抢票
- `isServiceEnabled()` — 检查无障碍服务是否开启
- `isDamaiInstalled()` — 检测大麦APP是否安装
- `openDamaiApp()` — 打开大麦APP
- `getServiceStatus()` — 获取服务运行状态

### GrabScreen.js

抢票控制界面：

- 模式选择器（三种模式）
- 实时状态显示（无障碍服务、大麦APP、当前状态）
- 操作日志
- 启动/停止按钮

### ConfigScreen.js

参数配置界面，使用 AsyncStorage 持久化：

- 搜索关键词
- 刷新间隔（秒）
- 最大重试次数
- 观演人信息

## 踩坑记录

### Android 11+ 包可见性

Android 11 起，应用默认无法查询其他应用。解决方案：
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
<queries>
    <package android:name="cn.damai" />
</queries>
```

### React Native 0.76 Fabric 兼容性

- `react-native-screens` 需用 3.x（4.x 要求 RN >= 0.82）
- `@react-native-async-storage` 需用 2.x（3.x 要求 Kotlin 2.1.0）

### ReadableMap 类型转换

React Native 的 `ReadableMap` 不能直接转为 `WritableMap`：
```kotlin
// 错误
val writableMap = config as WritableMap

// 正确
val writableMap = Arguments.createMap()
writableMap.merge(config)
```

### 无障碍服务检测

需检查多种格式的服务名：
```kotlin
enabledServices.contains("com.daniaapp.DamaiAccessibilityService") ||
enabledServices.contains("com.daniaapp/com.daniaapp.DamaiAccessibilityService") ||
enabledServices.contains("DamaiAccessibilityService")
```

## 权限说明

| 权限 | 用途 |
|------|------|
| `INTERNET` | 网络访问 |
| `SYSTEM_ALERT_WINDOW` | 悬浮窗（调试用） |
| `QUERY_ALL_PACKAGES` | 检测大麦APP安装状态 |
| `BIND_ACCESSIBILITY_SERVICE` | 无障碍服务绑定 |

## License

MIT
