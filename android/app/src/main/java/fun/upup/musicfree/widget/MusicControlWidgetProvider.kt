package `fun`.upup.musicfree.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.view.KeyEvent
import android.widget.RemoteViews
import `fun`.upup.musicfree.R

/**
 * 自定义音乐控制小组件
 */
class MusicControlWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_PLAY_PAUSE = "fun.upup.musicfree.PLAY_PAUSE"
        const val ACTION_NEXT = "fun.upup.musicfree.NEXT"
        const val ACTION_PREV = "fun.upup.musicfree.PREV"
        const val ACTION_OPEN_MUSIC = "fun.upup.musicfree.OPEN_MUSIC"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_PLAY_PAUSE -> {
                // 发送系统媒体按键：播放/暂停
                sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
                updateAllWidgets(context)
            }
            ACTION_NEXT -> {
                // 发送系统媒体按键：下一首
                sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_NEXT)
                updateAllWidgets(context)
            }
            ACTION_PREV -> {
                // 发送系统媒体按键：上一首
                sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_PREVIOUS)
                updateAllWidgets(context)
            }
            ACTION_OPEN_MUSIC -> {
                // 打开音乐播放器
                openMusicPlayer(context)
            }
        }
    }

    /**
     * 发送系统媒体按键
     */
    private fun sendMediaKey(context: Context, keyCode: Int) {
        val audioManager =
            context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val keyEventDown = KeyEvent(KeyEvent.ACTION_DOWN, keyCode)
        val keyEventUp = KeyEvent(KeyEvent.ACTION_UP, keyCode)
        audioManager.dispatchMediaKeyEvent(keyEventDown)
        audioManager.dispatchMediaKeyEvent(keyEventUp)
    }

    /**
     * 打开音乐播放器（本 App）
     */
    private fun openMusicPlayer(context: Context) {
        try {
            val intent = context.packageManager
                .getLaunchIntentForPackage(context.packageName)
                ?: Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_APP_MUSIC)
                }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * 更新所有小组件
     */
    private fun updateAllWidgets(context: Context) {
        val intent =
            Intent(context, MusicControlWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
        context.sendBroadcast(intent)
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_music_control)

        // 播放/暂停按钮
        val playPauseIntent =
            Intent(context, MusicControlWidgetProvider::class.java).apply {
                action = ACTION_PLAY_PAUSE
            }
        val playPausePendingIntent = PendingIntent.getBroadcast(
            context, 0, playPauseIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.btn_play_pause, playPausePendingIntent)

        // 下一首按钮
        val nextIntent =
            Intent(context, MusicControlWidgetProvider::class.java).apply {
                action = ACTION_NEXT
            }
        val nextPendingIntent = PendingIntent.getBroadcast(
            context, 0, nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.btn_next, nextPendingIntent)

        // 上一首按钮
        val prevIntent =
            Intent(context, MusicControlWidgetProvider::class.java).apply {
                action = ACTION_PREV
            }
        val prevPendingIntent = PendingIntent.getBroadcast(
            context, 0, prevIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.btn_prev, prevPendingIntent)

        // 点击打开音乐播放器
        val openIntent =
            Intent(context, MusicControlWidgetProvider::class.java).apply {
                action = ACTION_OPEN_MUSIC
            }
        val openPendingIntent = PendingIntent.getBroadcast(
            context, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.widget_root, openPendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
