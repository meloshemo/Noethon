package io.github.meloshemo.pengu;

import android.annotation.SuppressLint;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import android.app.Activity;

/**
 * The whole application: one activity, one WebView, one file.
 *
 * The game is a self-contained HTML document built by `tools/bundle.mjs` and
 * copied into the package as `assets/pengu.html`. There is no server, no
 * download and no network permission — what is installed is the whole game,
 * and it behaves the same in a tunnel as it does on wifi.
 *
 * Two decisions here are worth more than the rest of the file.
 *
 * **It is served over https, not file://.** A page loaded from `file://` has
 * an opaque origin, and an opaque origin has no `localStorage` — which in this
 * game means no save, no records, no collection, every launch. The asset
 * loader serves the same bytes over `https://appassets.androidplatform.net`,
 * which is a real origin with real storage, and nothing leaves the device to
 * make that true.
 *
 * **Back is a game action, not a history action.** There is no history to walk
 * here: it is one page. So the key is handed to the game — pause while
 * playing, menu while paused, title from any other screen — and only closes
 * the application when it is already at the title. That is what the button
 * does in every other game on the phone.
 */
public class MainActivity extends Activity {

  private WebView web;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // A platformer that locks the screen off mid-jump is a platformer nobody
    // finishes. The game runs in the foreground only, so this costs nothing.
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

    final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
        .build();

    web = new WebView(this);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    // The save lives here.
    settings.setDomStorageEnabled(true);
    // Sound is part of the game and the first touch is the gesture that starts
    // it, so the WebView does not need to hold the audio back as well.
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setSupportZoom(false);
    settings.setBuiltInZoomControls(false);
    settings.setDisplayZoomControls(false);
    // Nothing is fetched over a network, so there is nothing for the HTTP
    // cache to do and no reason to let it answer for the asset loader.
    settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
    settings.setTextZoom(100);

    web.setBackgroundColor(0xFF050D1C);
    web.setVerticalScrollBarEnabled(false);
    web.setHorizontalScrollBarEnabled(false);
    web.setOverScrollMode(View.OVER_SCROLL_NEVER);
    // A long press on a canvas game is a jump held down, not a text selection.
    web.setLongClickable(false);
    web.setHapticFeedbackEnabled(false);

    web.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return loader.shouldInterceptRequest(request.getUrl());
      }

      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        // There is nowhere else to go: every link the game has is internal.
        // Anything else would be an accident, and an accident that replaced
        // the game with a blank page.
        return true;
      }
    });

    setContentView(web);
    web.loadUrl("https://appassets.androidplatform.net/assets/pengu.html");
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) goFullscreen();
  }

  /**
   * Immersive, and re-applied on every focus change.
   *
   * The bars come back whenever the system feels like it — a notification
   * shade pull, a permission dialog, an incoming call — and a half-covered
   * playfield is a death in this game.
   */
  private void goFullscreen() {
    View decor = getWindow().getDecorView();
    decor.setSystemUiVisibility(
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
  }

  @Override
  protected void onPause() {
    super.onPause();
    // The game's own loop stops with the page, but audio does not: without
    // this a phone that rings keeps playing the ice under the call.
    if (web != null) web.onPause();
  }

  @Override
  protected void onResume() {
    super.onResume();
    if (web != null) web.onResume();
    goFullscreen();
  }

  @Override
  public void onBackPressed() {
    if (web == null) {
      super.onBackPressed();
      return;
    }
    // Asked of the game rather than assumed: the answer is "exit" only when
    // the game says there is nothing left to back out of.
    web.evaluateJavascript(
        "(function(){try{var g=window.__pengu;if(!g)return 'exit';"
            + "if(g.state==='playing'){g.togglePause();return 'handled';}"
            + "if(g.state==='paused'){g.quitToMenu();return 'handled';}"
            + "var s=g.ui&&g.ui.screen;"
            + "if(s&&s!=='title'){g.ui.showScreen('title');return 'handled';}"
            + "return 'exit';}catch(e){return 'exit';}})()",
        value -> {
          if (value == null || value.contains("exit")) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
              finishAndRemoveTask();
            } else {
              finish();
            }
          }
        });
  }

  @Override
  protected void onDestroy() {
    if (web != null) {
      web.destroy();
      web = null;
    }
    super.onDestroy();
  }
}
