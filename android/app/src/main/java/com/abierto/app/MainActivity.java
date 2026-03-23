package com.abierto.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsIntent;

/**
 * MainActivity for Abierto TWA
 *
 * This is the entry point for the Trusted Web Activity that wraps the Abierto web app.
 * It opens the web app in a Custom Tab (full-screen browser experience).
 */
public class MainActivity extends AppCompatActivity {

    private static final String APP_URL = "https://abiertovqs.com";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Check if we're being launched from a deep link
        Intent intent = getIntent();
        Uri data = intent.getData();

        if (data != null && data.getScheme().equals("https")) {
            // Open the specific deep link
            openInCustomTab(data.toString());
        } else {
            // Open the main app URL
            openInCustomTab(APP_URL);
        }

        // Finish this activity so the user can only see the Custom Tab
        finish();
    }

    /**
     * Opens a URL in a Custom Tab (full-screen browser window)
     */
    private void openInCustomTab(String url) {
        CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();

        // Customize the toolbar color (optional)
        builder.setToolbarColor(getResources().getColor(android.R.color.white));

        CustomTabsIntent customTabsIntent = builder.build();
        customTabsIntent.launchUrl(MainActivity.this, Uri.parse(url));
    }
}
