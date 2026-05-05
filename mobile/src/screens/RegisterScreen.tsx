import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { CosmicCard } from '../components/CosmicCard';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { resetToMain } from '../navigation/navigationRef';

export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { register, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthCity, setBirthCity] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function onSubmit(): Promise<void> {
    setErrorMsg('');
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        birthDate: birthDate.trim(),
        birthTime: birthTime.trim() || null,
        birthCity: birthCity.trim(),
        birthCountry: null,
        latitude: null,
        longitude: null,
        timezoneOffset: null,
      });
      resetToMain();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Registration failed');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>✦ Astralis</Text>
        <CosmicCard title="Create account">
          <Text style={styles.hint}>
            Birth date as YYYY-MM-DD. City must match the API city list (same as web).
          </Text>
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
          <Field label="Full name" value={fullName} onChangeText={setFullName} />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label="Password" value={password} onChangeText={setPassword} secure />
          <Field label="Birth date (YYYY-MM-DD)" value={birthDate} onChangeText={setBirthDate} />
          <Field
            label="Birth time (optional, HH:MM)"
            value={birthTime}
            onChangeText={setBirthTime}
          />
          <Field label="Birth city" value={birthCity} onChangeText={setBirthCity} />
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => void onSubmit()}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Create account'}</Text>
          </Pressable>
          <Pressable style={styles.link} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Pressable>
        </CosmicCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
}): React.JSX.Element {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 48 },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.gold,
    textAlign: 'center',
    marginVertical: 16,
  },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  label: { color: colors.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  button: {
    marginTop: 20,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.accent },
  error: { color: colors.danger, marginBottom: 8 },
});
