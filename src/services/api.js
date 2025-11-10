// src/services/analytics.js
import api from "./api.js";

export async function getDashboard() {
  const { data } = await api.get("/api/admin/dashboard");
  return data;
}
