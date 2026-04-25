package com.abierto.app;

import android.app.Activity;
import android.os.Bundle;

/**
 * AssetLinksActivity - Placeholder for TWA asset link verification.
 *
 * The Play Store uses Digital Asset Links to verify that your app is authorized
 * to handle links for a specific domain. This activity serves as a handler for
 * the /.well-known/assetlinks.json endpoint.
 *
 * The actual assetlinks.json file should be hosted at:
 * https://abierto.com/.well-known/assetlinks.json
 */
public class AssetLinksActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // This activity doesn't display anything—it just handles the intent.
        // The Play Store will verify the assetlinks.json file on your server.
        finish();
    }
}
