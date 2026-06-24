import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and works for both Expo Go and native builds. Using a local entry (instead of
// expo's AppEntry.js) resolves `expo` and `./App` via normal module resolution,
// which is required in this npm workspace where `expo` is hoisted to the repo root.
registerRootComponent(App);
