import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, ChevronDown, Lock, Mail, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, SlideInLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';

const { width, height } = Dimensions.get('window');

const roles = [
  { value: 'siswa', label: 'Siswa' },
  { value: 'guru', label: 'Guru' },
  { value: 'ortu', label: 'Orang Tua' },
];

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('siswa');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Mohon isi semua field');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password minimal 6 karakter');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, name, role);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Sukses', 'Akun berhasil dibuat!', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    }
    setLoading(false);
  };

  return (
    <LinearGradient
      colors={['#2563EB', '#FBBF24']} // Biru → Kuning
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.content, { paddingTop: insets.top + height * 0.02 }]}>
          <Animated.View entering={SlideInLeft.delay(100)}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.push('/(auth)/welcome')}
            >
              <ArrowLeft size={24} color="white" />
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
            <AppLogo size="medium" />
            <Text style={styles.title}>Buat Akun Baru</Text>
            <Text style={styles.subtitle}>
              Bergabung dengan komunitas pembelajaran Quran
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400)} style={styles.form}>
            <View style={styles.inputContainer}>
              <User size={20} color="#2563EB" />
              <TextInput
                style={styles.input}
                placeholder="Nama Lengkap"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#2563EB" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#2563EB" />
              <TextInput
                style={styles.input}
                placeholder="Password (min. 6 karakter)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.dropdownContainer}>
              <Pressable
                style={styles.dropdown}
                onPress={() => setShowRoleDropdown(!showRoleDropdown)}
              >
                <Text style={styles.dropdownText}>
                  {roles.find((r) => r.value === role)?.label || 'Pilih Role'}
                </Text>
                <ChevronDown size={20} color="#2563EB" />
              </Pressable>
              {showRoleDropdown && (
                <View style={styles.dropdownOptions}>
                  {roles.map((roleOption) => (
                    <Pressable
                      key={roleOption.value}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setRole(roleOption.value);
                        setShowRoleDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>
                        {roleOption.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Memproses...' : 'Daftar'}
              </Text>
            </Pressable>

            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.linkText}>
                Sudah punya akun?{' '}
                <Text style={styles.linkBold}>Masuk di sini</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: width * 0.06,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    alignItems: 'center',
    marginVertical: height * 0.04,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: width * 0.04,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: width * 0.06,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: width * 0.04,
    color: '#1F2937',
  },
  dropdownContainer: { position: 'relative' },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
  },
  dropdownText: {
    fontSize: width * 0.04,
    color: '#1F2937',
  },
  dropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1000,
  },
  dropdownOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: width * 0.04,
    color: '#1F2937',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: 'white',
    fontSize: width * 0.045,
    fontWeight: 'bold',
  },
  linkText: {
    textAlign: 'center',
    color: '#374151',
    fontSize: width * 0.035,
    marginTop: 8,
  },
  linkBold: { color: '#2563EB', fontWeight: 'bold' },
});
