import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as Location from 'expo-location';
import { Clock, MapPin } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
const { width } = Dimensions.get('window');
dayjs.extend(relativeTime); 
interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export default function PrayerTimesScreen() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [locationName, setLocationName] = useState('Lokasi Anda');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Dayjs>(dayjs());

  // Ambil lokasi & jadwal sholat
  const getLocationAndPrayerTimes = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin lokasi ditolak', 'Tidak bisa mengambil jadwal sholat tanpa akses lokasi.');
        setLoading(false);
        return;
      }

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
        setPrayerTimes({
          fajr: data.data.timings.Fajr,
          dhuhr: data.data.timings.Dhuhr,
          asr: data.data.timings.Asr,
          maghrib: data.data.timings.Maghrib,
          isha: data.data.timings.Isha,
        });
      }
    } catch (error) {
      console.error('Error getting location or prayer times:', error);
      Alert.alert('Error', 'Gagal mengambil data lokasi atau jadwal sholat.');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi cari sholat berikutnya
  const getNextPrayer = () => {
    if (!prayerTimes) return null;

    const now = currentTime;
    const prayers = [
      { name: 'Subuh', time: prayerTimes.fajr },
      { name: 'Dzuhur', time: prayerTimes.dhuhr },
      { name: 'Ashar', time: prayerTimes.asr },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isya', time: prayerTimes.isha },
    ];

    for (let prayer of prayers) {
      const prayerTime = dayjs(prayer.time, 'HH:mm');
      if (now.isBefore(prayerTime)) {
        return {
          name: prayer.name,
          time: prayer.time,
          timeLeft: prayerTime.from(now, true), // tampilkan sisa waktu
        };
      }
    }

    // Jika sudah lewat semua, berarti Subuh besok
    const tomorrowFajr = dayjs(prayerTimes.fajr, 'HH:mm').add(1, 'day');
    return {
      name: 'Subuh',
      time: prayerTimes.fajr,
      timeLeft: tomorrowFajr.from(now, true),
    };
  };

  useEffect(() => {
    getLocationAndPrayerTimes();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const nextPrayer = getNextPrayer();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading jadwal sholat...</Text>
      </View>
    );
  }

  if (!prayerTimes) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Gagal memuat jadwal sholat</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInUp} style={styles.header}>
        <Text style={styles.headerTitle}>Jadwal Sholat Hari Ini</Text>
        <Text style={styles.currentTime}>
          {currentTime.format('HH:mm')} WIB
        </Text>
      </Animated.View>

      {/* Next Prayer Card */}
      {nextPrayer && (
        <Animated.View entering={FadeInUp.delay(100)} style={styles.prayerCard}>
          <View style={styles.prayerHeader}>
            <Clock size={20} color="#10B981" />
            <Text style={styles.prayerTitle}>Sholat Berikutnya</Text>
          </View>
          <View style={styles.prayerInfo}>
            <Text style={styles.prayerName}>{nextPrayer.name}</Text>
            <Text style={styles.prayerTime}>{nextPrayer.time}</Text>
          </View>

        </Animated.View>
      )}

      {/* Prayer Times List */}
      <ScrollView style={styles.prayerTimesContainer}>
        <View style={styles.prayerTimesHeader}>
          <MapPin size={20} color="#10B981" />
          <Text style={styles.prayerTimesTitle}>{locationName}</Text>
        </View>

        {Object.entries({
          'Subuh': prayerTimes.fajr,
          'Dzuhur': prayerTimes.dhuhr,
          'Ashar': prayerTimes.asr,
          'Maghrib': prayerTimes.maghrib,
          'Isya': prayerTimes.isha,
        }).map(([name, time], index) => {
          const isNext = nextPrayer?.name === name;
          return (
            <Animated.View 
              key={name} 
              entering={FadeInDown.delay(index * 100)}
              style={[
                styles.prayerTimeCard,
                isNext && styles.prayerTimeCardNext
              ]}
            >
              <Text style={[
                styles.prayerTimeName,
                isNext && styles.prayerTimeNameNext
              ]}>
                {name} {isNext ? ' (Next)' : ''}
              </Text>
              <Text style={[
                styles.prayerTimeValue,
                isNext && styles.prayerTimeValueNext
              ]}>
                {time}
              </Text>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC',
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#10B981',
  },
  currentTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  prayerCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 16,
  },
  prayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  prayerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  prayerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  prayerTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  prayerCountdown: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  prayerTimesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  prayerTimesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  prayerTimesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  prayerTimeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prayerTimeCardNext: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
  },
  prayerTimeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  prayerTimeNameNext: {
    color: 'white',
  },
  prayerTimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  prayerTimeValueNext: {
    color: 'white',
  },
});
