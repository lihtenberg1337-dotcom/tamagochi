/* Воркер OneSignal в корне проекта: доступен по /tamagochi/OneSignalSDKWorker.js
   и регистрируется со scope /tamagochi/ (браузер не разрешает scope выше папки файла).
   Сама логика пушей — в OneSignalSDK.sw.js с CDN. */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
