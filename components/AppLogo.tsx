import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BookOpen, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  animated?: boolean;
}

export function AppLogo({ size = 'medium', showText = true, animated = false }: AppLogoProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (animated) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000 }),
        -1,
        false
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value }
    ],
  }));

  const getSizes = () => {
    switch (size) {
      case 'small':
        return { container: 40, icon: 20, text: 16 };
      case 'large':
        return { container: 120, icon: 48, text: 32 };
      default:
        return { container: 80, icon: 32, text: 24 };
    }
  };

  const sizes = getSizes();

  return (
    <View style={styles.container}>
      <Animated.View style={animated ? animatedStyle : undefined}>
        <LinearGradient
          colors={['#0EA5E9', '#3B82F6', '#6366F1']}
          style={[styles.logoContainer, { 
            width: sizes.container, 
            height: sizes.container,
            borderRadius: sizes.container / 2 
          }]}
        >
          <BookOpen size={sizes.icon} color="white" strokeWidth={2.5} />
          <View style={styles.starContainer}>
            <Star size={sizes.icon * 0.3} color="white" fill="white" />
          </View>
        </LinearGradient>
      </Animated.View>
      
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.logoText, { fontSize: sizes.text }]}>IQRO</Text>
          {size !== 'small' && (
            <Text style={styles.tagline}>Platform Pembelajaran Quran</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  starContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontWeight: 'bold',
    color: '#0F172A',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
});