package com.abierto.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.content.ContextCompat;
import com.google.android.play.core.integrity.IntegrityManager;
import com.google.android.play.core.integrity.IntegrityManagerFactory;
import com.google.android.play.core.integrity.IntegrityTokenRequest;
import com.google.android.play.core.integrity.IntegrityTokenResponse;
import java.nio.charset.StandardCharsets;

public class MainActivity extends AppCompatActivity {

    private static final String APP_URL = "https://www.abiertovqs.com";
    private static final String TAG = "Abierto";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        Uri data = intent.getData();
        String targetUrl = (data != null && "https".equals(data.getScheme()))
                ? data.toString()
                : APP_URL;

        requestIntegrityAndLaunch(targetUrl);
    }

    private void requestIntegrityAndLaunch(String targetUrl) {
        IntegrityManager integrityManager = IntegrityManagerFactory.create(getApplicationContext());

        // Nonce: base64-encoded package + timestamp (≥16 bytes, ≤500 bytes)
        String raw = getPackageName() + ":" + System.currentTimeMillis();
        String nonce = Base64.encodeToString(
                raw.getBytes(StandardCharsets.UTF_8),
                Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING
        );

        integrityManager
                .requestIntegrityToken(IntegrityTokenRequest.builder().setNonce(nonce).build())
                .addOnSuccessListener(response -> {
                    String url = appendQueryParam(targetUrl, "pi_token", response.token());
                    launchAndFinish(url);
                })
                .addOnFailureListener(e -> {
                    Log.w(TAG, "Play Integrity unavailable, launching without token: " + e.getMessage());
                    launchAndFinish(targetUrl);
                });
    }

    private String appendQueryParam(String url, String key, String value) {
        try {
            return Uri.parse(url).buildUpon()
                    .appendQueryParameter(key, value)
                    .build()
                    .toString();
        } catch (Exception e) {
            return url;
        }
    }

    private void launchAndFinish(String url) {
        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                .setToolbarColor(ContextCompat.getColor(this, android.R.color.white))
                .build();
        customTabsIntent.launchUrl(this, Uri.parse(url));
        finish();
    }
}
