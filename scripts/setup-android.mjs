// Applies the game's settings to a freshly generated android/ project. Safe to run more than once.
// Works the same on Windows and macOS.   Usage: npm run android:setup   (after `npx cap add android`)
//   camera permission (optional feature) · landscape · full screen · no cloud backup · version · upload-key signing · icon
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = (...p) => path.join(root, 'android', ...p);
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const appId = JSON.parse(readFileSync(path.join(root, 'capacitor.config.json'), 'utf8')).appId;

function edit(file, pairs) {
  let s = readFileSync(file, 'utf8');
  for (const [mark, from, to] of pairs) {
    if (s.includes(mark)) continue; // already applied
    if (!s.includes(from)) throw new Error(`${path.relative(root, file)}: expected text not found: ${from.slice(0, 50)}`);
    s = s.replace(from, to);
  }
  writeFileSync(file, s);
}

edit(A('app', 'src', 'main', 'AndroidManifest.xml'), [
  ['android:allowBackup="false"', 'android:allowBackup="true"', 'android:allowBackup="false"'],
  ['android:screenOrientation', 'android:launchMode="singleTask"', 'android:launchMode="singleTask"\n            android:screenOrientation="sensorLandscape"'],
  ['android.permission.CAMERA', '    <uses-permission android:name="android.permission.INTERNET" />',
    '    <!-- INTERNET is needed by the in-app web view even though the game loads everything from inside the app. -->\n    <uses-permission android:name="android.permission.INTERNET" />\n    <!-- Optional: only used when the player turns on camera hand signs. Video never leaves the device. -->\n    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n    <uses-feature android:name="android.hardware.camera.any" android:required="false" />'],
]);

const gradle = A('app', 'build.gradle');
edit(gradle, [
  ['signingConfigs', '    buildTypes {\n        release {', `    // The upload key. Its details live in android/keystore.properties, which you create yourself and which is
    // never committed. Without that file a release build is simply left unsigned.
    def keystoreFile = rootProject.file('keystore.properties')
    def keystoreProps = new Properties()
    if (keystoreFile.exists()) keystoreProps.load(new FileInputStream(keystoreFile))
    signingConfigs {
        release {
            if (keystoreFile.exists()) {
                storeFile rootProject.file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            if (keystoreFile.exists()) signingConfig signingConfigs.release`],
]);
// the version name always follows package.json; the version code is yours to raise for each upload
writeFileSync(gradle, readFileSync(gradle, 'utf8').replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`));

writeFileSync(A('app', 'src', 'main', 'java', ...appId.split('.'), 'MainActivity.java'), `package ${appId};

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    // Full screen: the status and navigation bars slide away, a swipe from the edge brings them back.
    private void hideBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`);

// icon: a vector drawing for modern Android (same shapes as store/graphics/icon.svg)
const res = A('app', 'src', 'main', 'res');
mkdirSync(path.join(res, 'drawable'), { recursive: true });
writeFileSync(path.join(res, 'drawable', 'ic_launcher_foreground.xml'), `<?xml version="1.0" encoding="utf-8"?>
<!-- Will of Fire: an ember inside a lantern ring. Same drawing as store/graphics/icon.svg. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#1d1630" android:pathData="M54,54m-40,0a40,40 0,1 0,80 0a40,40 0,1 0,-80 0"/>
    <path android:strokeColor="#f6ecd9" android:strokeWidth="2.4" android:pathData="M54,54m-27,0a27,27 0,1 0,54 0a27,27 0,1 0,-54 0"/>
    <path android:fillColor="#ff8a3c" android:pathData="M54,22.6l3.2,4.4 -3.2,4.4 -3.2,-4.4zM54,76.6l3.2,4.4 -3.2,4.4 -3.2,-4.4zM22.6,54l4.4,-3.2 4.4,3.2 -4.4,3.2zM76.6,54l4.4,-3.2 4.4,3.2 -4.4,3.2z"/>
    <path android:fillColor="#ff8a3c" android:pathData="M54,31C64,43 68,50 68,58C68,67 62,73 54,73C46,73 40,67 40,58C40,51 45,47 48,40C50,44 51,45 52,46C52,40 53,36 54,31Z"/>
    <path android:fillColor="#ffd27a" android:pathData="M54,50C59,56 61,60 61,64C61,69 58,72 54,72C50,72 47,69 47,64C47,60 50,56 54,50Z"/>
</vector>
`);
rmSync(path.join(res, 'drawable', 'ic_launcher_background.xml'), { force: true });
writeFileSync(path.join(res, 'values', 'ic_launcher_background.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0E0B16</color>\n</resources>\n');
for (const n of ['ic_launcher', 'ic_launcher_round']) writeFileSync(path.join(res, 'mipmap-anydpi-v26', n + '.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@drawable/ic_launcher_foreground"/>\n</adaptive-icon>\n');

writeFileSync(A('keystore.properties.example'), `# Copy this file to keystore.properties (same folder) and fill it in yourself. Never commit the real one.
# Create the key once in Android Studio: Build > Generate Signed App Bundle or APK > Create new...
storeFile=../will-of-fire-upload.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=upload
keyPassword=YOUR_KEY_PASSWORD
`);
console.log(`android/ is set up (${appId}, version ${pkg.version})`);
await import('./make-icons.mjs');
