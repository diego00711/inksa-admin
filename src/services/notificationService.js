// src/services/notificationService.js
// IMPORTANTE: Diego precisa preencher FIREBASE_CONFIG e FCM_VAPID_KEY
// para que as notificações push funcionem.

const FIREBASE_CONFIG = {
  // apiKey: "",
  // authDomain: "",
  // projectId: "",
  // storageBucket: "",
  // messagingSenderId: "",
  // appId: "",
};

const FCM_VAPID_KEY = "";

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
