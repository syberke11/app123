import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Lock, Mail } from 'lucide-react-native';
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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Mohon isi semua field');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      Alert.alert('Error', error);
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Background gradient biru → kuning */}
      <LinearGradient
        colors={['#2563EB', '#FBBF24']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.content, { paddingTop: insets.top + 20 }]}
      >
        {/* Tombol back */}
        <Animated.View entering={SlideInLeft.delay(100)}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/(auth)/welcome')}
          >
            <ArrowLeft size={24} color="white" />
          </Pressable>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
          <AppLogo size="medium" />
          <Text style={styles.title}>Masuk ke Akun</Text>
          <Text style={styles.subtitle}>Silakan masuk untuk melanjutkan</Text>
        </Animated.View>

        {/* Form Login */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.form}>
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
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.linkText}>
              Belum punya akun? <Text style={styles.linkBold}>Daftar di sini</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: height },
  gradient: { ...StyleSheet.absoluteFillObject },
  content: {
    flex: 1,
    paddingHorizontal: Math.max(20, width * 0.05),
    paddingBottom: Math.max(20, height * 0.03),
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.05,
    marginBottom: height * 0.03,
  },
  title: {
    fontSize: Math.min(30, width * 0.08),
    fontWeight: 'bold',
    color: 'white',
    marginTop: 14,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: Math.min(15, width * 0.04),
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: Math.max(20, width * 0.06),
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: Math.max(14, width * 0.04),
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: Math.min(15, width * 0.04),
    color: '#1F2937',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: Math.max(14, width * 0.04),
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 52,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: 'white',
    fontSize: Math.min(17, width * 0.045),
    fontWeight: 'bold',
  },
  linkText: {
    textAlign: 'center',
    color: '#374151',
    fontSize: Math.min(13, width * 0.035),
    marginTop: 8,
    fontWeight: '500',
  },
  linkBold: { color: '#2563EB', fontWeight: 'bold' },
});
