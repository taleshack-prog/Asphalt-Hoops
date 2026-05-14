import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { apiFetch } from '../services/api';
import { useAuth } from '../services/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha email e senha');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      await signIn(token, user);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <View style={s.logoContainer}>
          <Text style={s.logo}>🏀</Text>
          <Text style={s.appName}>Asphalt Hoops</Text>
          <Text style={s.tagline}>Basquete de rua em Porto Alegre</Text>
        </View>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={s.input}
            placeholder="Senha"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Entrar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.registerBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={s.registerText}>Não tem conta? <Text style={s.registerLink}>Cadastre-se</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 72, marginBottom: 8 },
  appName: { color: '#F97316', fontSize: 32, fontWeight: 'bold', letterSpacing: 1 },
  tagline: { color: '#666', fontSize: 14, marginTop: 4 },
  form: { gap: 12 },
  input: {
    backgroundColor: '#1c1c1e', color: '#fff', borderRadius: 12,
    padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#333',
  },
  btn: {
    backgroundColor: '#F97316', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  registerBtn: { alignItems: 'center', marginTop: 16 },
  registerText: { color: '#666', fontSize: 14 },
  registerLink: { color: '#F97316', fontWeight: 'bold' },
});
