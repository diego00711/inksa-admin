import React, { useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';

export function Notifications() {
  const { notifications, removeNotification } = useContext(NotificationContext);

  return (
    <div className="fixed top-6 right-6 z-50 space-y-3">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`bg-white shadow-lg rounded px-5 py-3 flex items-center border-l-4 ${
            notif.type === 'error'
              ? 'border-red-500'
              : notif.type === 'success'
              ? 'border-green-500'
              : 'border-blue-500'
          }`}
        >
          <div className="flex-1">{notif.message}</div>
          <button
            className="ml-4 text-gray-400 hover:text-gray-700"
            onClick={() => removeNotification(notif.id)}
            title="Fechar"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
