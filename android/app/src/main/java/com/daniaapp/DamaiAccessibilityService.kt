package com.daniaapp

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

class DamaiAccessibilityService : AccessibilityService() {

    companion object {
        const val TAG = "DamaiService"
        const val DAMAI_PACKAGE = "cn.damai"
        var instance: DamaiAccessibilityService? = null
        var isRunning = false
        var eventEmitter: RCTDeviceEventEmitter? = null
        var config: WritableMap? = null
        var isGrabbing = false
        var grabCount = 0
    }

    private val handler = Handler(Looper.getMainLooper())
    private var currentStep = 0
    private var isProcessing = false
    private var keyword = ""
    private var retryCount = 0
    private var maxRetry = 60
    private var interval = 1500L

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        isRunning = true
        Log.d(TAG, "Service connected")
        emitEvent("serviceConnected", null)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || !isGrabbing) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg != DAMAI_PACKAGE) return

        // 防止并发处理
        if (isProcessing) return

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED,
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                handler.postDelayed({ processStep() }, 400)
            }
        }
    }

    override fun onInterrupt() {
        isRunning = false
        instance = null
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        instance = null
        isGrabbing = false
        handler.removeCallbacksAndMessages(null)
    }

    fun startGrab(configMap: WritableMap) {
        config = configMap
        keyword = configMap.getString("keyword") ?: ""
        maxRetry = configMap.getInt("maxRetry") ?: 60
        val intervalDouble = configMap.getDouble("interval") ?: 1.5
        interval = (intervalDouble * 1000).toLong()

        isGrabbing = true
        grabCount = 0
        retryCount = 0
        currentStep = 1
        isProcessing = false

        Log.d(TAG, "startGrab keyword=$keyword interval=${interval}ms maxRetry=$maxRetry")
        emitEvent("grabStarted", null)
        emitStatus("步骤1: 打开大麦APP...")
        openDamaiApp()
        handler.postDelayed({ processStep() }, 2500)
    }

    fun stopGrab() {
        isGrabbing = false
        isProcessing = false
        currentStep = 0
        handler.removeCallbacksAndMessages(null)
        Log.d(TAG, "Grab stopped")
        emitEvent("grabStopped", null)
    }

    // ==================== 状态机 ====================

    private fun processStep() {
        if (!isGrabbing || isProcessing) return
        isProcessing = true

        val root = rootInActiveWindow
        if (root == null) {
            isProcessing = false
            retryOrSkip("获取界面失败")
            return
        }

        try {
            when (currentStep) {
                1 -> step1_searchInput(root)
                2 -> step2_selectShow(root)
                3 -> step3_setViewer(root)
                4 -> step4_clickReserve(root)
                5 -> step5_selectTicket(root)
                6 -> step6_submitOrder(root)
            }
        } catch (e: Exception) {
            Log.e(TAG, "processStep error: ${e.message}")
            isProcessing = false
            retryOrSkip("处理异常: ${e.message}")
        }
    }

    // 步骤1: 在搜索框输入关键词
    private fun step1_searchInput(root: AccessibilityNodeInfo) {
        emitStatus("步骤1: 输入搜索关键词...")

        // 查找搜索框 EditText
        val editNode = findEditText(root)
        if (editNode != null) {
            editNode.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
            editNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)

            // 清空再输入
            val clearArgs = android.os.Bundle().apply {
                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, "")
            }
            editNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, clearArgs)

            val args = android.os.Bundle().apply {
                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, keyword)
            }
            editNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)

            Log.d(TAG, "Step1: 输入关键词=$keyword")
            emitStatus("已输入关键词: $keyword")

            // 输入完后进入步骤2
            handler.postDelayed({
                isProcessing = false
                currentStep = 2
                emitStatus("步骤2: 等待搜索结果...")
                processStep()
            }, 1500)
            return
        }

        // 没找到搜索框，尝试点击搜索入口
        val clicked = clickSearchBar(root)
        if (clicked) {
            // 点击了搜索入口，等搜索框出现
            handler.postDelayed({
                isProcessing = false
                processStep()
            }, 1000)
            return
        }

        isProcessing = false
        retryOrSkip("步骤1: 未找到搜索框")
    }

    // 步骤2: 在搜索结果中选择演出
    private fun step2_selectShow(root: AccessibilityNodeInfo) {
        emitStatus("步骤2: 查找演出...")

        // 查找可点击的演出列表项
        // 大麦搜索结果中每个演出项通常是一个卡片
        val clicked = clickFirstShowItem(root)
        if (clicked) {
            Log.d(TAG, "Step2: 点击了演出")
            emitStatus("已进入演出详情")
            // 等待页面加载后进入步骤3
            handler.postDelayed({
                isProcessing = false
                currentStep = 3
                emitStatus("步骤3: 设置观演人...")
                processStep()
            }, 2000)
            return
        }

        isProcessing = false
        retryOrSkip("步骤2: 未找到演出")
    }

    // 步骤3: 点击"去设置"设置观演人
    private fun step3_setViewer(root: AccessibilityNodeInfo) {
        emitStatus("步骤3: 查找'去设置'...")

        // 查找"去设置"按钮
        val nodes = root.findAccessibilityNodeInfosByText("去设置")
        if (nodes != null && nodes.isNotEmpty()) {
            for (node in nodes) {
                if (node.isClickable) {
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    Log.d(TAG, "Step3: 点击去设置")
                    emitStatus("已点击'去设置'")
                    // 等待设置页面加载
                    handler.postDelayed({
                        isProcessing = false
                        currentStep = 31  // 子步骤: 在设置页选择观演人并返回
                        processStep()
                    }, 1500)
                    return
                }
                val parent = node.parent
                if (parent != null && parent.isClickable) {
                    parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    Log.d(TAG, "Step3: 点击去设置(parent)")
                    emitStatus("已点击'去设置'")
                    handler.postDelayed({
                        isProcessing = false
                        currentStep = 31
                        processStep()
                    }, 1500)
                    return
                }
            }
        }

        // 没找到"去设置"，可能已设置或页面不同，跳到步骤4
        Log.d(TAG, "Step3: 未找到'去设置'，跳过")
        emitStatus("未找到'去设置'，直接继续...")
        handler.postDelayed({
            isProcessing = false
            currentStep = 4
            emitStatus("步骤4: 点击立即预定...")
            processStep()
        }, 1000)
    }

    // 步骤3.1: 设置观演人页面
    private fun step3_setViewerPage(root: AccessibilityNodeInfo) {
        emitStatus("设置观演人中...")

        // 尝试选择观演人（全选或第一个）
        val selectTexts = listOf("全选", "确定", "完成")
        for (text in selectTexts) {
            val nodes = root.findAccessibilityNodeInfosByText(text)
            if (nodes != null && nodes.isNotEmpty()) {
                for (node in nodes) {
                    if (node.isClickable && node.isEnabled) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        Log.d(TAG, "Step3.1: 点击 $text")
                        emitStatus("已点击: $text")
                        break
                    }
                }
            }
        }

        // 返回上一页
        handler.postDelayed({
            if (!isGrabbing) return@postDelayed
            emitStatus("返回演出页...")
            performGlobalAction(GLOBAL_ACTION_BACK)
            handler.postDelayed({
                isProcessing = false
                currentStep = 4
                emitStatus("步骤4: 点击立即预定...")
                processStep()
            }, 1500)
        }, 1000)
    }

    // 步骤4: 点击"立即预定"按钮
    private fun step4_clickReserve(root: AccessibilityNodeInfo) {
        emitStatus("步骤4: 查找'立即预定'...")

        // 优先找"立即预定"
        val primaryTexts = listOf("立即预定", "立即购买", "立即抢购")
        for (text in primaryTexts) {
            val nodes = root.findAccessibilityNodeInfosByText(text)
            if (nodes != null && nodes.isNotEmpty()) {
                for (node in nodes) {
                    if (node.isClickable && node.isEnabled) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        Log.d(TAG, "Step4: 点击 $text")
                        emitStatus("已点击: $text")
                        handler.postDelayed({
                            isProcessing = false
                            currentStep = 5
                            emitStatus("步骤5: 选择场次和票档...")
                            processStep()
                        }, 1500)
                        return
                    }
                    val parent = node.parent
                    if (parent != null && parent.isClickable && parent.isEnabled) {
                        parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        Log.d(TAG, "Step4: 点击 $text(parent)")
                        emitStatus("已点击: $text")
                        handler.postDelayed({
                            isProcessing = false
                            currentStep = 5
                            emitStatus("步骤5: 选择场次和票档...")
                            processStep()
                        }, 1500)
                        return
                    }
                }
            }
        }

        isProcessing = false
        retryOrSkip("步骤4: 未找到'立即预定'")
    }

    // 步骤5: 选择场次和票档
    private fun step5_selectTicket(root: AccessibilityNodeInfo) {
        emitStatus("步骤5: 选择场次票档...")

        // 尝试选择场次（日期标签）
        val dateTexts = listOf("日", "月", "星期", "周")
        // 选择票档
        val priceTexts = listOf("¥", "元", "档")

        // 尝试点击第一个可用的场次选项
        var dateClicked = false
        val allNodes = mutableListOf<AccessibilityNodeInfo>()
        collectAllNodes(root, allNodes)

        for (node in allNodes) {
            val text = node.text?.toString() ?: continue
            if (node.isClickable && node.isEnabled) {
                // 选择第一个看起来像日期的选项
                for (prefix in dateTexts) {
                    if (text.contains(prefix)) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        Log.d(TAG, "Step5: 选择场次 $text")
                        emitStatus("已选择场次: $text")
                        dateClicked = true
                        break
                    }
                }
                if (dateClicked) break
            }
        }

        // 选择票档
        handler.postDelayed({
            if (!isGrabbing) return@postDelayed
            val root2 = rootInActiveWindow ?: return@postDelayed
            val allNodes2 = mutableListOf<AccessibilityNodeInfo>()
            collectAllNodes(root2, allNodes2)

            var tierClicked = false
            for (node in allNodes2) {
                val text = node.text?.toString() ?: continue
                if (node.isClickable && node.isEnabled) {
                    for (prefix in priceTexts) {
                        if (text.contains(prefix)) {
                            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            Log.d(TAG, "Step5: 选择票档 $text")
                            emitStatus("已选择票档: $text")
                            tierClicked = true
                            break
                        }
                    }
                    if (tierClicked) break
                }
            }

            // 点击确定
            handler.postDelayed({
                if (!isGrabbing) return@postDelayed
                val root3 = rootInActiveWindow ?: return@postDelayed
                val confirmTexts = listOf("确定", "确认", "完成")
                for (text in confirmTexts) {
                    val nodes = root3.findAccessibilityNodeInfosByText(text)
                    if (nodes != null && nodes.isNotEmpty()) {
                        for (node in nodes) {
                            if (node.isClickable && node.isEnabled) {
                                node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                                Log.d(TAG, "Step5: 点击 $text")
                                emitStatus("已点击: $text")
                                break
                            }
                        }
                        break
                    }
                }

                // 进入步骤6
                handler.postDelayed({
                    isProcessing = false
                    currentStep = 6
                    emitStatus("步骤6: 提交订单...")
                    processStep()
                }, 1500)
            }, 800)
        }, 800)
    }

    // 步骤6: 提交订单
    private fun step6_submitOrder(root: AccessibilityNodeInfo) {
        emitStatus("步骤6: 提交订单...")
        grabCount++

        val submitTexts = listOf("立即提交", "提交订单", "确认支付", "立即支付")
        for (text in submitTexts) {
            val nodes = root.findAccessibilityNodeInfosByText(text)
            if (nodes != null && nodes.isNotEmpty()) {
                for (node in nodes) {
                    if (node.isClickable && node.isEnabled) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        Log.d(TAG, "Step6: 点击 $text #$grabCount")
                        emitStatus("已提交! #$grabCount")
                        emitEvent("orderSubmitted", null)
                        isProcessing = false
                        return
                    }
                    val parent = node.parent
                    if (parent != null && parent.isClickable && parent.isEnabled) {
                        parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        Log.d(TAG, "Step6: 点击 $text(parent) #$grabCount")
                        emitStatus("已提交! #$grabCount")
                        emitEvent("orderSubmitted", null)
                        isProcessing = false
                        return
                    }
                }
            }
        }

        // 没找到提交按钮，可能还没到那一步
        isProcessing = false
        retryOrSkip("步骤6: 未找到提交按钮")
    }

    // ==================== 工具方法 ====================

    private fun findEditText(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        if (node.className?.toString()?.contains("EditText") == true) {
            return node
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val result = findEditText(child)
            if (result != null) return result
        }
        return null
    }

    private fun clickSearchBar(root: AccessibilityNodeInfo): Boolean {
        // 尝试各种搜索入口
        val searchTexts = listOf("搜索", "搜你想看的", "search")
        for (text in searchTexts) {
            val nodes = root.findAccessibilityNodeInfosByText(text)
            if (nodes != null && nodes.isNotEmpty()) {
                for (node in nodes) {
                    if (node.className?.toString()?.contains("EditText") == true) continue
                    if (node.isClickable) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        return true
                    }
                    val parent = node.parent
                    if (parent != null && parent.isClickable) {
                        parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        return true
                    }
                }
            }
        }

        // 尝试通过 ID 查找
        val ids = listOf("cn.damai:id/search_view", "cn.damai:id/search_bar")
        for (id in ids) {
            val nodes = root.findAccessibilityNodeInfosByViewId(id)
            if (nodes != null && nodes.isNotEmpty()) {
                val node = nodes[0]
                if (node.isClickable) {
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                } else {
                    node.parent?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                }
                return true
            }
        }
        return false
    }

    private fun clickFirstShowItem(root: AccessibilityNodeInfo): Boolean {
        // 先尝试通过常见的演出列表ID
        val itemIds = listOf("cn.damai:id/item_root", "cn.damai:id/ll_item")
        for (id in itemIds) {
            val nodes = root.findAccessibilityNodeInfosByViewId(id)
            if (nodes != null && nodes.isNotEmpty()) {
                val node = nodes[0]
                if (node.isClickable) {
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                } else {
                    node.parent?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                }
                return true
            }
        }

        // 找搜索结果中的演出名称（通常是较大的 TextView）
        val allNodes = mutableListOf<AccessibilityNodeInfo>()
        collectAllNodes(root, allNodes)
        for (node in allNodes) {
            val text = node.text?.toString() ?: continue
            val bounds = android.graphics.Rect()
            node.getBoundsInScreen(bounds)
            // 排除顶部导航栏区域
            if (bounds.top < 100 || bounds.bottom < 100) continue
            // 演出名通常有一定长度
            if (text.length > 4 && !text.contains("搜索") && !text.contains("返回")
                && node.className?.toString()?.contains("TextView") == true) {
                // 点击它或它的父容器
                if (node.isClickable) {
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                } else {
                    val parent = node.parent
                    if (parent != null && parent.isClickable) {
                        parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    } else {
                        val gp = parent?.parent
                        if (gp != null && gp.isClickable) {
                            gp.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        } else {
                            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        }
                    }
                }
                Log.d(TAG, "Step2: 点击演出项: $text")
                return true
            }
        }

        return false
    }

    private fun collectAllNodes(node: AccessibilityNodeInfo, list: MutableList<AccessibilityNodeInfo>) {
        list.add(node)
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectAllNodes(child, list)
        }
    }

    private fun retryOrSkip(msg: String) {
        if (!isGrabbing) return
        retryCount++
        if (retryCount >= maxRetry) {
            emitEvent("maxRetryReached", null)
            stopGrab()
            return
        }
        Log.d(TAG, "Retry #$retryCount: $msg")
        emitStatus("$msg - 重试中 #$retryCount")
        handler.postDelayed({
            if (isGrabbing) processStep()
        }, interval)
    }

    private fun openDamaiApp() {
        try {
            val intent = packageManager.getLaunchIntentForPackage(DAMAI_PACKAGE)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(intent)
            } else {
                emitEvent("error", "请先安装大麦APP")
            }
        } catch (e: Exception) {
            Log.e(TAG, "openDamaiApp error: ${e.message}")
        }
    }

    private fun emitEvent(type: String, data: Any?) {
        try {
            val params = Arguments.createMap()
            params.putString("type", type)
            if (data is String) params.putString("data", data)
            if (data is WritableMap) params.putMap("data", data)
            eventEmitter?.emit("DamaiServiceEvent", params)
        } catch (e: Exception) {
            Log.e(TAG, "emitEvent error: ${e.message}")
        }
    }

    private fun emitStatus(status: String) {
        try {
            val params = Arguments.createMap()
            params.putString("type", "status")
            params.putString("status", status)
            params.putInt("count", grabCount)
            eventEmitter?.emit("DamaiServiceEvent", params)
        } catch (e: Exception) {
            Log.e(TAG, "emitStatus error: ${e.message}")
        }
    }
}
