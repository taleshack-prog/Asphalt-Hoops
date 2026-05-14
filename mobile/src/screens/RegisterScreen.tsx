import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { apiFetch } from '../services/api';
import { useAuth } from '../services/AuthContext';

export default function RegisterScreen({ navigation, route }: any) {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(route?.params?.code ?? '');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'Senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          invite_code: inviteCode.trim() || undefined,
        }),
      });
      await signIn(token, user);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Erro ao cadastrar');
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
          <Text style={s.tagline}>Crie sua conta</Text>
        </View>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Nome completo *"
            placeholderTextColor="#555"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={s.input}
            placeholder="Email *"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={s.input}
            placeholder="Senha (mín. 6 caracteres) *"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={[s.input, s.inviteInput]}
            placeholder="Código de convite (opcional)"
            placeholderTextColor="#555"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            maxLength={10}
          />

          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Criar Conta</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.loginBtn} onPress={() => navigation.goBack()}>
            <Text style={s.loginText}>Já tem conta? <Text style={s.loginLink}>Entrar</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 60, marginBottom: 8 },
  appName: { color: '#F97316', fontSize: 28, fontWeight: 'bold' },
  tagline: { color: '#666', fontSize: 14, marginTop: 4 },
  form: { gap: 12 },
  input: {
    backgroundColor: '#1c1c1e', color: '#fff', borderRadius: 12,
    padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#333',
  },
  inviteInput: { borderColor: '#F97316', borderWidth: 1.5 },
  btn: {
    backgroundColor: '#F97316', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loginBtn: { alignItems: 'center', marginTop: 16 },
  loginText: { color: '#666', fontSize: 14 },
  loginLink: { color: '#F97316', fontWeight: 'bold' },
});
