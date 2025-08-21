import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Users, Award, PenTool } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { AppLogo } from '@/components/AppLogo';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Background Gradient: Biru ke Kuning */}
      <LinearGradient
        colors={['#2563EB', '#FBBF24']} // biru → kuning
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        {/* Logo & Subtitle */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.header}>
          <AppLogo size="large" animated={true} />
          <Text style={styles.subtitle}>
            Platform Pembelajaran Quran Digital untuk Hafalan dan Murojaah
          </Text>
        </Animated.View>

        {/* Fitur */}
        <View style={styles.features}>
          <Animated.View entering={SlideInLeft.delay(500)} style={styles.feature}>
            <PenTool size={20} color="white" />
            <Text style={styles.featureText}>Setoran Hafalan & Murojaah</Text>
          </Animated.View>
          <Animated.View entering={SlideInRight.delay(600)} style={styles.feature}>
            <Award size={20} color="white" />
            <Text style={styles.featureText}>Penilaian & Label Pencapaian</Text>
          </Animated.View>
          <Animated.View entering={SlideInLeft.delay(700)} style={styles.feature}>
            <Users size={20} color="white" />
            <Text style={styles.featureText}>Monitoring Orang Tua</Text>
          </Animated.View>
          <Animated.View entering={SlideInRight.delay(800)} style={styles.feature}>
            <BookOpen size={20} color="white" />
            <Text style={styles.featureText}>Baca Quran Digital</Text>
          </Animated.View>
        </View>

        {/* Tombol Aksi */}
        <Animated.View entering={FadeInDown.delay(900)} style={styles.buttons}>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.primaryButtonText}>Masuk</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.secondaryButtonText}>Daftar</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { ...StyleSheet.absoluteFillObject },
  content: {
    flex: 1,
    paddingHorizontal: Math.max(20, width * 0.05),
    justifyContent: 'space-between',
  },
  header: { alignItems: 'center', marginBottom: 24 },
  subtitle: {
    fontSize: width < 360 ? 14 : 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: width < 360 ? 20 : 24,
    paddingHorizontal: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  features: { gap: 12, flexGrow: 1, justifyContent: 'center' },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 14,
    borderRadius: 14,
  },
  featureText: {
    color: 'white',
    fontSize: width < 360 ? 14 : 16,
    fontWeight: '600',
    flex: 1,
  },
  buttons: { gap: 12, marginTop: 24 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: { backgroundColor: 'white' },
  primaryButtonText: {
    color: '#2563EB', // biru utama
    fontSize: width < 360 ? 16 : 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'white',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: width < 360 ? 16 : 18,
    fontWeight: 'bold',
  },
});
