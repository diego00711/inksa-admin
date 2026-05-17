import React, { createContext, useState, useCallback, useRef } from 'react';

export const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Use a ref so `notify` can always call the latest `removeNotification`
  // without being re-created and causing stale-closure issues.
  const removeRef = useRef(removeNotification);
  removeRef.current = removeNotification;

  const notify = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeRef.current(id), duration);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, notify, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}
