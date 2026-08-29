package `fun`.upup.musicfree.safUtil

import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.storage.StorageManager
import android.provider.DocumentsContract
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * 存储工具模块：获取所有存储卷路径（内部存储 + USB + SD卡），以及删除文档。
 * 不依赖 DocumentsUI，适用于车机等没有系统文件选择器的设备。
 */
class SafUtilModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "SafUtil"

    private val executor: ExecutorService = Executors.newSingleThreadExecutor()

    /**
     * 获取所有可用存储卷的文件系统路径（内部存储 + USB OTG + SD 卡）。
     * 返回 ["/storage/emulated/0", "/storage/usb1", ...]
     */
    @ReactMethod
    fun getAllStoragePaths(promise: Promise) {
        try {
            val paths = mutableListOf<String>()

            // 1. 主存储（内部存储）
            try {
                val primary = Environment.getExternalStorageDirectory().absolutePath
                if (!paths.contains(primary)) {
                    paths.add(primary)
                }
            } catch (e: Exception) {
                Log.w(TAG, "get primary storage failed", e)
            }

            // 2. 通过 StorageManager 获取所有存储卷（API 24+），反射调用 getDirectory()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try {
                    val storageManager =
                        reactContext.getSystemService(Context.STORAGE_SERVICE) as StorageManager
                    val volumes = storageManager.storageVolumes
                    for (volume in volumes) {
                        try {
                            val getDirectoryMethod =
                                volume.javaClass.getMethod("getDirectory")
                            val dir = getDirectoryMethod.invoke(volume) as? File
                            if (dir != null && dir.canRead() && !paths.contains(dir.absolutePath)) {
                                paths.add(dir.absolutePath)
                            }
                        } catch (e: Exception) {
                            // 反射失败，忽略该卷
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "get storage volumes failed", e)
                }
            }

            // 3. 兜底：扫描 /storage 目录下的可读子目录
            try {
                val storageDir = File("/storage")
                if (storageDir.exists() && storageDir.isDirectory) {
                    storageDir.listFiles()?.forEach { dir ->
                        val name = dir.name
                        // 排除 emulated（父目录）和 self（符号链接）
                        if (dir.isDirectory && dir.canRead() &&
                            name != "emulated" && name != "self" &&
                            !paths.contains(dir.absolutePath)
                        ) {
                            paths.add(dir.absolutePath)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "scan /storage failed", e)
            }

            // 4. 兜底：扫描 /mnt 目录下常见的 USB 挂载点
            try {
                val mntDir = File("/mnt")
                if (mntDir.exists() && mntDir.isDirectory) {
                    mntDir.listFiles()?.forEach { dir ->
                        val name = dir.name.lowercase()
                        if (dir.isDirectory && dir.canRead() &&
                            (name.contains("usb") || name.contains("udisk") ||
                                name.contains("usb_storage") || name.contains("usbdisk")) &&
                            !paths.contains(dir.absolutePath)
                        ) {
                            paths.add(dir.absolutePath)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "scan /mnt failed", e)
            }

            val result = Arguments.createArray()
            paths.forEach { result.pushString(it) }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_PATHS_FAILED", e.message ?: "获取存储路径失败")
        }
    }

    /** 删除文档（用户显式勾选"删除原文件"时使用），成功返回 true */
    @ReactMethod
    fun deleteDocument(uriString: String, promise: Promise) {
        executor.execute {
            try {
                val uri = Uri.parse(uriString)
                val deleted = DocumentsContract.deleteDocument(
                    reactContext.contentResolver, uri,
                )
                promise.resolve(deleted)
            } catch (e: Exception) {
                promise.reject("DELETE_FAILED", e.message ?: "删除失败")
            }
        }
    }

    companion object {
        private const val TAG = "SafUtilModule"
    }
}
