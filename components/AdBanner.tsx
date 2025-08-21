import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Linking } from 'react-native';
import { Heart, ExternalLink, Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface AdBannerProps {
  type?: 'wakaf' | 'donation' | 'support';
  style?: any;
}

export function AdBanner({ type = 'wakaf', style }: AdBannerProps) {
  const handlePress = () => {
    // Open donation/wakaf link
    Linking.openURL('https://kitabisa.com/campaign/wakafquran');
  };

  const getAdContent = () => {
    switch (type) {
      case 'wakaf':
        return {
          title: '💝 Wakaf Al-Quran',
          subtitle: 'Berbagi pahala dengan mewakafkan Al-Quran',
          description: 'Setiap huruf yang dibaca akan mengalir pahalanya untuk Anda',
          buttonText: 'Wakaf Sekarang',
          colors: ['#059669', '#10B981'],
          icon: Heart,
        };
      case 'donation':
        return {
          title: '🤲 Donasi Pendidikan',
          subtitle: 'Dukung pendidikan Quran untuk semua',
          description: 'Bantu kami mengembangkan platform pembelajaran',
          buttonText: 'Donasi',
          colors: ['#3B82F6', '#6366F1'],
          icon: Gift,
        };
      default:
        return {
          title: '❤️ Dukung Aplikasi',
          subtitle: 'Bantu kami terus berkembang',
          description: 'Aplikasi gratis, dukungan Anda sangat berarti',
          buttonText: 'Dukung',
          colors: ['#8B5CF6', '#A855F7'],
          icon: Heart,
        };
    }
  };

  const content = getAdContent();
  const IconComponent = content.icon;

  return (
    <Animated.View entering={FadeInUp} style={[styles.container, style]}>
 <LinearGradient
  colors={content.colors as [string, string, ...string[]]}
  style={styles.gradient}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconComponent size={24} color="white" />
          </View>
          
          <View style={styles.textContent}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
            <Text style={styles.description}>{content.description}</Text>
          </View>

          <Pressable style={styles.button} onPress={handlePress}>
            <Text style={styles.buttonText}>{content.buttonText}</Text>
            <ExternalLink size={14} color="white" />
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  gradient: {
    padding: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: 'white',
    opacity: 0.8,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});