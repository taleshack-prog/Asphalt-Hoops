import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { apiFetch } from '../services/api';
import { useAuth } from '../services/AuthContext';

export default function RegisterScreen({ navigation, route }: any) {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Pré-preenche código de convite se vier via deep link
  const [inviteCode, setInviteCode] = useState(route?.params?.code ?? '');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, invite_code: inviteCode }),
      });
      await signIn(token, user);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={s.logo}>🏀 Asphalt Hoops</Text>
      <Text style={s.subtitle}>Crie sua conta</Text>

      <TextInput style={s.input} placeholder="Nome" placeholderTextColor="#666" value={name} onChangeText={setName} />
      <TextInput
        style={s.input} placeholder="Email" placeholderTextColor="#666"
        value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
      />
      <TextInput
        style={s.input} placeholder="Senha" placeholderTextColor="#666"
        value={password} onChangeText={setPassword} secureTextEntry
      />
      <TextInput
        style={s.input} placeholder="Código de convite (opcional)" placeholderTextColor="#666"
        value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters"
      />

      <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Cadastrar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={s.link}>Já tem conta? Entrar</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#F97316', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#aaa', textAlign: 'center', marginBottom: 32, fontSize: 16 },
  input: {
    backgroundColor: '#1c1c1e', color: '#fff', borderRadius: 10,
    padding: 14, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#333',
  },
  btn: {
    backgroundColor: '#F97316', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#F97316', textAlign: 'center', marginTop: 20, fontSize: 14 },
});
