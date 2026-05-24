// src/services/notificationService.js
// IMPORTANTE: Diego precisa preencher FIREBASE_CONFIG e FCM_VAPID_KEY
// para que as notificações push funcionem.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA_DLxPwOxbhCSeQFs21GaK2sU51gaxJQ0",
  authDomain: "inksa-delivery.firebaseapp.com",
  projectId: "inksa-delivery",
  storageBucket: "inksa-delivery.firebasestorage.app",
  messagingSenderId: "2366391589",
  appId: "1:2366391589:web:7011af9ee2d7a3b355c6cc",
  measurementId: "G-5E4ND4JN1H"
};

const FCM_VAPID_KEY = "BOUov-X15lwK9B-Hd7er7rhnPZCzYxunkqEeeTo71A8gOxuCCQIEh_MQWNEOu7rxmIT4iaN9zim4FKurj2dwPAPc";

/**
 * Solicita permissão de notificação ao navegador e retorna o token FCM.
 * Retorna null de forma silenciosa em qualquer falha (sem quebrar a aplicação).
 */
export async function requestNotificationPermission() {
  try {
    if (!('Notification' in window)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Se a config do Firebase não foi preenchida, encerra sem erro
    if (!FIREBASE_CONFIG.apiKey) return null;

    const { initializeApp } = await import(
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'
    );
    const { getMessaging, getToken } = await import(
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js'
    );

    const app = initializeApp(FIREBASE_CONFIG);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
    return token || null;
  } catch (e) {
    console.warn('[notificationService] Falha ao obter token FCM:', e);
    return null;
  }
}
