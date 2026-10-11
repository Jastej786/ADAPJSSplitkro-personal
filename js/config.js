// App-wide settings.
//
// SHARED MODE: paste your Firebase web config here (see README.md, step 2).
// While `firebase` is null the app runs in LOCAL MODE: data lives only in this browser.
export const config = {
  appName: "SplitBroo",
  defaultCurrency: "INR",
  currencies: ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED"],
  firebase: {
    apiKey: "AIzaSyDUb3IS7p9G5TwitPsV3jBM2LXBLSbF9HQ",
    authDomain: "splitbroo.firebaseapp.com",
    projectId: "splitbroo",
    storageBucket: "splitbroo.firebasestorage.app",
    messagingSenderId: "132029336106",
    appId: "1:132029336106:web:07ab5213bf525aa7471153",
  },
};
