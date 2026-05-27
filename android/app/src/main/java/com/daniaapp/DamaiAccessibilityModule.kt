package com.daniaapp

import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class DamaiAccessibilityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "DamaiModule"
    }

    override fun getName(): String = "DamaiAccessibility"

    // 检查无障碍服务是否已启用
    @ReactMethod
    fun isServiceEnabled(promise: Promise) {
        val enabled = isAccessibilityServiceEnabled()
        promise.resolve(enabled)
    }

    // 打开无障碍设置页面
    @ReactMethod
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        currentActivity?.startActivity(intent)
    }

    // 检查大麦 APP 是否已安装
    @ReactMethod
    fun isDamaiInstalled(promise: Promise) {
        try {
            val packageManager = reactApplicationContext.packageManager
            // 方法1: 使用 getLaunchIntentForPackage
            val intent = packageManager.getLaunchIntentForPackage("cn.damai")
            if (intent != null) {
                promise.resolve(true)
                return
            }
            // 方法2: 使用 getPackageInfo
            try {
                packageManager.getPackageInfo("cn.damai", 0)
                promise.resolve(true)
                return
            } catch (e: Exception) {
                // 继续尝试其他方法
            }
            // 方法3: 查询所有已安装包
            val packages = packageManager.getInstalledPackages(0)
            for (pkg in packages) {
                if (pkg.packageName == "cn.damai") {
                    promise.resolve(true)
                    return
                }
            }
            promise.resolve(false)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    // 调试方法：获取检测信息
    @ReactMethod
    fun getDebugInfo(promise: Promise) {
        try {
            val info = Arguments.createMap()
            val packageManager = reactApplicationContext.packageManager

            // 检查 getLaunchIntentForPackage
            val intent = packageManager.getLaunchIntentForPackage("cn.damai")
            info.putBoolean("launchIntent", intent != null)

            // 检查 getPackageInfo
            try {
                packageManager.getPackageInfo("cn.damai", 0)
                info.putBoolean("packageInfo", true)
            } catch (e: Exception) {
                info.putBoolean("packageInfo", false)
                info.putString("packageInfoError", e.message)
            }

            // 列出所有包含 "damai" 的包
            val damaiPackages = Arguments.createArray()
            val packages = packageManager.getInstalledPackages(0)
            for (pkg in packages) {
                if (pkg.packageName.contains("damai", ignoreCase = true)) {
                    damaiPackages.pushString(pkg.packageName)
                }
            }
            info.putArray("damaiPackages", damaiPackages)
            info.putInt("totalPackages", packages.size)

            // 检查权限
            val permissions = Arguments.createArray()
            val pkgInfo = packageManager.getPackageInfo(reactApplicationContext.packageName, android.content.pm.PackageManager.GET_PERMISSIONS)
            pkgInfo.requestedPermissions?.forEach { perm ->
                permissions.pushString(perm)
            }
            info.putArray("permissions", permissions)

            promise.resolve(info)
        } catch (e: Exception) {
            val error = Arguments.createMap()
            error.putString("error", e.message)
            promise.resolve(error)
        }
    }

    // 开始抢票
    @ReactMethod
    fun startGrab(config: ReadableMap) {
        Log.d(TAG, "startGrab called")
        val service = DamaiAccessibilityService.instance
        if (service != null) {
            // 设置事件监听
            DamaiAccessibilityService.eventEmitter = reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            // 将 ReadableMap 转换为 WritableMap
            val writableConfig = Arguments.createMap()
            writableConfig.merge(config)
            service.startGrab(writableConfig)
        } else {
            Log.w(TAG, "Service not running")
        }
    }

    // 停止抢票
    @ReactMethod
    fun stopGrab() {
        Log.d(TAG, "stopGrab called")
        DamaiAccessibilityService.instance?.stopGrab()
    }

    // 获取服务状态
    @ReactMethod
    fun getServiceStatus(promise: Promise) {
        val status = Arguments.createMap()
        status.putBoolean("isRunning", DamaiAccessibilityService.isRunning)
        status.putBoolean("isGrabbing", DamaiAccessibilityService.isGrabbing)
        status.putInt("grabCount", DamaiAccessibilityService.grabCount)
        promise.resolve(status)
    }

    // 打开大麦 APP
    @ReactMethod
    fun openDamaiApp() {
        try {
            val packageManager = reactApplicationContext.packageManager
            val intent = packageManager.getLaunchIntentForPackage("cn.damai")
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "openDamaiApp error: ${e.message}")
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val packageName = reactApplicationContext.packageName
        val serviceShortName = "DamaiAccessibilityService"
        val serviceFullName = "$packageName.$serviceShortName"
        val serviceSlashName = "$packageName/$serviceFullName"

        try {
            val enabledServices = Settings.Secure.getString(
                reactApplicationContext.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false

            // 检查多种格式
            return enabledServices.contains(serviceFullName) ||
                   enabledServices.contains(serviceSlashName) ||
                   enabledServices.contains(serviceShortName)
        } catch (e: Exception) {
            return false
        }
    }
}
