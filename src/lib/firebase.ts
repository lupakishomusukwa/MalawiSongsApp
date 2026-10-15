

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";

// Firebase's React Native runtime provides this export,
// although some SDK type definitions don't expose it.
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAzVz26WusWMtG9vv0m2ZzOHVbUvXNCc5s",
  authDomain: "malawisongsapp.firebaseapp.com",
  projectId: "malawisongsapp",
  storageBucket: "malawisongsapp.firebasestorage.app",
  messagingSenderId: "976054825625",
  appId: "1:976054825625:web:c0d34aa28efd41edf5fe08",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Reuse the existing Auth instance if it was already initialized.
  auth = getAuth(app);
}

export { app, auth };

