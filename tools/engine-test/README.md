# Engine test page

A page for comparing SquareBrowser's own Android WebView (the default) with the classic engine
(react-native-webview, Settings > Classic Web Engine). Open it on the phone in SquareBrowser.

1. On the computer, from the repository root: `npx serve tools/engine-test -l 8080`
2. With the phone on USB: `adb reverse tcp:8080 tcp:8080`
3. In SquareBrowser open `http://localhost:8080`
4. Note the results, switch Classic Web Engine in Settings, restart the app, open the page again.

`chrome://inspect` on the computer shows the page's console and network for either engine
(debug builds only).
