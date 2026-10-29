package app.passage.nativecapture

import android.content.Intent
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class PassageNativeModule : Module() {
  private var pendingShare: Map<String, String>? = null

  override fun definition() = ModuleDefinition {
    Name("PassageNative")
    Events("onShare")

    OnNewIntent { intent ->
      pendingShare = readShare(intent)
      pendingShare?.let { sendEvent("onShare", it) }
    }

    AsyncFunction("getPendingShare") {
      val result = pendingShare ?: appContext.currentActivity?.intent?.let { readShare(it) }
      pendingShare = null
      result
    }

    AsyncFunction("recognizeText") { uriString: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("NO_CONTEXT", "Android context unavailable", null)
      } else {
        try {
          val uri = Uri.parse(uriString)
          require(uri.scheme == "file" || uri.scheme == "content") { "Only local images are supported" }
          val image = InputImage.fromFilePath(context, uri)
          val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
          recognizer.process(image)
            .addOnSuccessListener { result ->
              val blocks = result.textBlocks.map { block ->
                val box = block.boundingBox
                mapOf("text" to block.text, "left" to (box?.left ?: 0), "top" to (box?.top ?: 0), "right" to (box?.right ?: 0), "bottom" to (box?.bottom ?: 0))
              }
              promise.resolve(mapOf("text" to result.text, "blocks" to blocks))
              recognizer.close()
            }
            .addOnFailureListener { error ->
              promise.reject("OCR_FAILED", error.message ?: "Text recognition failed", error)
              recognizer.close()
            }
        } catch (error: Exception) {
          promise.reject("IMAGE_FAILED", error.message ?: "Could not open image", error)
        }
      }
    }
  }

  @Suppress("DEPRECATION")
  private fun readShare(intent: Intent): Map<String, String>? {
    if (intent.action != Intent.ACTION_SEND) return null
    // Mark the Intent consumed so foreground transitions cannot replay a capture.
    intent.action = Intent.ACTION_MAIN
    val result = mutableMapOf<String, String>()
    intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()?.take(100000)?.let { result["text"] = it }
    intent.getStringExtra(Intent.EXTRA_SUBJECT)?.take(1000)?.let { result["title"] = it }
    if (intent.type?.startsWith("image/") == true) {
      val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
      val context = appContext.reactContext
      if (uri != null && context != null) {
        try {
          val folder = File(context.cacheDir, "shared-pages").apply { mkdirs() }
          // Images stay in app-private cache, never uploaded or backed up.
          folder.listFiles()?.filter { System.currentTimeMillis() - it.lastModified() > 86400000L }?.forEach { it.delete() }
          val output = File.createTempFile("page-", ".image", folder)
          context.contentResolver.openInputStream(uri)?.use { input ->
            output.outputStream().use { target ->
              val buffer = ByteArray(8192)
              var bytes = 0L
              while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                bytes += count
                require(bytes <= 30L * 1024 * 1024) { "Shared image exceeds 30 MB" }
                target.write(buffer, 0, count)
              }
            }
          }
          if (output.length() > 0) result["imageUri"] = Uri.fromFile(output).toString()
        } catch (_: Exception) {
          result["text"] = "Could not read shared image. Choose it again from Photos."
        }
      }
    }
    return result.takeIf { it.isNotEmpty() }
  }
}
