
import { withRepeat } from 'react-native-reanimated';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoScale = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);
  const backgroundOpacity = useSharedValue(0);
  const circleScale = useSharedValue(0);

  useEffect(() => {
    const startAnimation = () => {
      // Background fade in
      backgroundOpacity.value = withTiming(1, { duration: 500 });
      
      // Circle animation
      circleScale.value = withDelay(
        200,
        withTiming(1, { 
          duration: 800,
          easing: Easing.out(Easing.back(1.2))
        })
      );

      // Logo animation
      logoScale.value = withDelay(
        400,
        withSequence(
          withTiming(1.2, { 
            duration: 600,
            easing: Easing.out(Easing.back(1.5))
          }),
          withTiming(1, { duration: 200 })
        )
      );

      logoRotation.value = withDelay(
        400,
        withTiming(360, { 
          duration: 800,
          easing: Easing.out(Easing.cubic)
        })
      );

      // Title animation
      titleOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
      titleTranslateY.value = withDelay(800, withTiming(0, { duration: 600 }));

      // Subtitle animation
      subtitleOpacity.value = withDelay(1000, withTiming(1, { duration: 600 }));
      subtitleTranslateY.value = withDelay(1000, withTiming(0, { duration: 600 }));

      // Complete animation after delay
      setTimeout(() => {
        runOnJS(onAnimationComplete)();
      }, 2500);
    };

    startAnimation();
  }, []);

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` }
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.background, backgroundAnimatedStyle]}>
        <LinearGradient
          colors={['#10B981', '#3B82F6', '#8B5CF6']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <View style={styles.content}>
        {/* Animated Circle Background */}
        <Animated.View style={[styles.circle, circleAnimatedStyle]} />
        
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <BookOpen size={64} color="white" strokeWidth={2.5} />
        </Animated.View>

        {/* Title */}
        <Animated.View style={titleAnimatedStyle}>
          <Text style={styles.title}>IQRO</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={subtitleAnimatedStyle}>
          <Text style={styles.subtitle}>Platform Pembelajaran Quran Digital</Text>
        </Animated.View>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((index) => (
              <LoadingDot key={index} delay={index * 200} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const dotScale = useSharedValue(0.5);

  useEffect(() => {
    dotScale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.5, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, [delay]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  return <Animated.View style={[styles.dot, dotAnimatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  circle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 48,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
});