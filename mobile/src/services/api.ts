import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = 'https://asphalt-hoops-production.up.railway.app/api';

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  const token = await AsyncStorage.getItem('token');

  const fetchOnce = () => fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchOnce();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro na requisição');
      return data;
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 1s, 2s, 3s
      }
    }
  }
  throw lastError;
}
