import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Clock, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Location from 'expo-location';
import dayjs from 'dayjs';

const { width } = Dimensions.get('window');

interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export function PrayerTimesCard() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [locationName, setLocationName] = useState('');
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; timeLeft: string } | null>(null);

  const getPrayerTimes = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const city = address.city || address.region || 'Lokasi Anda';
      setLocationName(city);

      const response = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`
      );
      const data = await response.json();

      if (data.data) {
        const prayers = {
          fajr: data.data.timings.Fajr,
          dhuhr: data.data.timings.Dhuhr,
          asr: data.data.timings.Asr,
          maghrib: data.data.timings.Maghrib,
          isha: data.data.timings.Isha,
        };
        setPrayerTimes(prayers);
        
        const now = dayjs();
        const prayerList = [
          { name: 'Subuh', time: prayers.fajr },
          { name: 'Dzuhur', time: prayers.dhuhr },
          { name: 'Ashar', time: prayers.asr },
          { name: 'Maghrib', time: prayers.maghrib },
          { name: 'Isya', time: prayers.isha },
        ];

        for (let prayer of prayerList) {
          const prayerTime = dayjs(prayer.time, 'HH:mm');
          if (now.isBefore(prayerTime)) {
            setNextPrayer({
              name: prayer.name,
              time: prayer.time,
              timeLeft: prayerTime.from(now, true),
            });
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error getting prayer times:', error);
    }
  };

  useEffect(() => {
    getPrayerTimes();
  }, []);

  if (!prayerTimes) return null;

  return (
    <Animated.View entering={FadeInUp.delay(150)} style={styles.prayerCard}>
      <LinearGradient
        colors={['#059669', '#10B981', '#34D399']}
        style={styles.prayerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.prayerHeader}>
          <View style={styles.prayerTitleContainer}>
            <View style={styles.prayerIconContainer}>
              <Clock size={20} color="white" />
            </View>
            <Text style={styles.prayerTitle}>Jadwal Sholat</Text>
          </View>
          <View style={styles.locationContainer}>
            <MapPin size={16} color="white" />
            <Text style={styles.locationText}>{locationName}</Text>
          </View>
        </View>
        
        {nextPrayer && (
          <View style={styles.nextPrayerBanner}>
            <Text style={styles.nextPrayerLabel}>Sholat Berikutnya:</Text>
            <Text style={styles.nextPrayerName}>{nextPrayer.name} - {nextPrayer.time}</Text>
          </View>
        )}

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.prayerTimesScroll}
        >
          {Object.entries({
            'Subuh': prayerTimes?.fajr,
            'Dzuhur': prayerTimes?.dhuhr,
            'Ashar': prayerTimes?.asr,
            'Maghrib': prayerTimes?.maghrib,
            'Isya': prayerTimes?.isha,
          }).map(([name, time], index) => {
            const isNext = nextPrayer?.name === name;
            return (
              <View 
                key={name} 
                style={[
                  styles.prayerTimeItem,
                  isNext && styles.prayerTimeItemActive
                ]}
              >
                <Text style={[
                  styles.prayerName,
                  isNext && styles.prayerNameActive
                ]}>
                  {name}
                </Text>
                <Text style={[
                  styles.prayerTime,
                  isNext && styles.prayerTimeActive
                ]}>
                  {time}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  prayerCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  prayerGradient: {
    padding: 24,
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  prayerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prayerIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  nextPrayerBanner: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  nextPrayerLabel: {
    fontSize: 12,
    color: 'white',
    opacity: 0.8,
    marginBottom: 6,
    fontWeight: '500',
  },
  nextPrayerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  prayerTimesScroll: {
    marginHorizontal: -8,
  },
  prayerTimeItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  prayerTimeItemActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    borderColor: 'white',
    transform: [{ scale: 1.05 }],
  },
  prayerName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    opacity: 0.8,
    marginBottom: 6,
  },
  prayerNameActive: {
    opacity: 1,
    fontWeight: 'bold',
  },
  prayerTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  prayerTimeActive: {
    fontSize: 16,
  },
});