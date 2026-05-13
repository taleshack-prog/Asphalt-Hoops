import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = 'https://asphalt-hoops-production.up.railway.app/api'; // troque pelo IP do backend em produção

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await AsyncStorage.getItem('token');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro na requisição');
  return data;
}
