import { AppLogo } from '@/components/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Award, BookOpen, Calendar, Clock, ExternalLink, MapPin, Star, Target, TrendingUp, Users, ChevronDown, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

dayjs.extend(relativeTime);

const { width, height } = Dimensions.get('window');

interface DashboardStats {
  totalSetoran?: number;
  setoranPending?: number;
  setoranDiterima?: number;
  totalPoin?: number;
  labelCount?: number;
  totalSiswa?: number;
  recentActivity?: any[];
  hafalanProgress?: number;
  murojaahProgress?: number;
  attendanceStats?: {
    totalStudents: number;
    presentToday: number;
    absentToday: number;
    excusedToday: number;
  };
}

interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const banners = [
  {
    id: "1",
    title: "💝 Wakaf Al-Quran",
    subtitle: "Berbagi pahala dengan mewakafkan Al-Quran",
    image: "https://images.pexels.com/photos/8111357/pexels-photo-8111357.jpeg?auto=compress&cs=tinysrgb&w=800",
    link: "https://www.rumahamal.org/project/wakaf_alquran_di_bulan_turunya_alquran",
    gradient: ['#059669', '#10B981']
  },
  {
    id: "2",
    title: "📖 Donasi Pendidikan",
    subtitle: "Bantu anak yatim mendapatkan pendidikan",
    image: "https://images.pexels.com/photos/8613089/pexels-photo-8613089.jpeg?auto=compress&cs=tinysrgb&w=800",
    link: "https://lazismudiy.or.id/campaign/donasi-buku",
    gradient: ['#3B82F6', '#6366F1']
  },
  {
    id: "3",
    title: "🤲 Infaq Jumat",
    subtitle: "Sedekah terbaik di hari yang berkah",
    image: "https://images.pexels.com/photos/8111120/pexels-photo-8111120.jpeg?auto=compress&cs=tinysrgb&w=800",
    link: "https://www.amalsholeh.com/infaq-shodaqoh-jum-at-masjid-muhajirin/seru",
    gradient: ['#8B5CF6', '#A855F7']
  }
];

export default function HomeScreen() {
  const [showPrayerDetails, setShowPrayerDetails] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats>({});
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [locationName, setLocationName] = useState('');
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; timeLeft: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= banners.length) nextIndex = 0;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex, banners.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (width * 0.85));
    setCurrentIndex(index);
  };

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
        
        const now = currentTime;
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

        // If all prayers passed, next is tomorrow's Fajr
        if (!nextPrayer) {
          const tomorrowFajr = dayjs(prayers.fajr, 'HH:mm').add(1, 'day');
          setNextPrayer({
            name: 'Subuh',
            time: prayers.fajr,
            timeLeft: tomorrowFajr.from(now, true),
          });
        }
      }
    } catch (error) {
      console.error('Error getting prayer times:', error);
    }
  };

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      switch (profile.role) {
        case 'siswa':
          await fetchSiswaStats();
          break;
        case 'guru':
          await fetchGuruStats();
          break;
        case 'ortu':
          await fetchOrtuStats();
          break;
        case 'admin':
          await fetchAdminStats();
          break;
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSiswaStats = async () => {
    const { data: pointsData } = await supabase
      .from('siswa_poin')
      .select('*')
      .eq('siswa_id', profile?.id)
      .single();

    const { data: setoranData } = await supabase
      .from('setoran')
      .select('*')
      .eq('siswa_id', profile?.id)
      .order('created_at', { ascending: false });

    const { data: labelsData } = await supabase
      .from('labels')
      .select('*')
      .eq('siswa_id', profile?.id);

    const totalSetoran = setoranData?.length || 0;
    const setoranDiterima = setoranData?.filter(s => s.status === 'diterima').length || 0;
    const setoranPending = setoranData?.filter(s => s.status === 'pending').length || 0;
    const hafalanProgress = setoranData?.filter(s => s.jenis === 'hafalan' && s.status === 'diterima').length || 0;
    const murojaahProgress = setoranData?.filter(s => s.jenis === 'murojaah' && s.status === 'diterima').length || 0;

    setStats({
      totalSetoran,
      setoranDiterima,
      setoranPending,
      totalPoin: pointsData?.total_poin || 0,
      labelCount: labelsData?.length || 0,
      recentActivity: setoranData?.slice(0, 3) || [],
      hafalanProgress,
      murojaahProgress,
    });
  };

  const fetchGuruStats = async () => {
    const { count: pendingCount } = await supabase
      .from('setoran')
      .select('*', { count: 'exact', head: true })
      .eq('organize_id', profile?.organize_id)
      .eq('status', 'pending');

    const { count: siswaCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organize_id', profile?.organize_id)
      .eq('role', 'siswa');

    const today = new Date().toISOString().split('T')[0];
    const { data: studentsData } = await supabase
      .from('users')
      .select('id')
      .eq('organize_id', profile?.organize_id)
      .eq('role', 'siswa');

    let presentToday = 0;
    let absentToday = 0;
    let excusedToday = 0;

    if (studentsData) {
      for (const student of studentsData) {
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', student.id)
          .eq('date', today)
          .single();

        if (attendanceData) {
          switch (attendanceData.status) {
            case 'hadir': presentToday++; break;
            case 'izin': excusedToday++; break;
            case 'tidak_hadir': absentToday++; break;
          }
        } else {
          absentToday++;
        }
      }
    }

    const { data: recentSetoran } = await supabase
      .from('setoran')
      .select(`
        *,
        siswa:siswa_id(name)
      `)
      .eq('organize_id', profile?.organize_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(3);

    setStats({
      setoranPending: pendingCount || 0,
      totalSiswa: siswaCount || 0,
      recentActivity: recentSetoran || [],
      attendanceStats: {
        totalStudents: siswaCount || 0,
        presentToday,
        absentToday,
        excusedToday,
      },
    });
  };

  const fetchOrtuStats = async () => {
    const { data: childrenData } = await supabase
      .from('users')
      .select('id, name')
      .eq('organize_id', profile?.organize_id)
      .eq('role', 'siswa');

    if (childrenData && childrenData.length > 0) {
      const childId = childrenData[0].id;
      
      const { data: setoranData } = await supabase
        .from('setoran')
        .select('*')
        .eq('siswa_id', childId);

      const { data: pointsData } = await supabase
        .from('siswa_poin')
        .select('*')
        .eq('siswa_id', childId)
        .single();

      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', childId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const presentCount = attendanceData?.filter(a => a.status === 'hadir').length || 0;
      const totalDays = attendanceData?.length || 0;

      setStats({
        totalSetoran: setoranData?.length || 0,
        setoranDiterima: setoranData?.filter(s => s.status === 'diterima').length || 0,
        setoranPending: setoranData?.filter(s => s.status === 'pending').length || 0,
        totalPoin: pointsData?.total_poin || 0,
        recentActivity: setoranData?.slice(0, 3) || [],
        attendanceStats: {
          totalStudents: 1,
          presentToday: presentCount,
          absentToday: totalDays - presentCount,
          excusedToday: 0,
        },
      });
    }
  };

  const fetchAdminStats = async () => {
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: organizesCount } = await supabase
      .from('organizes')
      .select('*', { count: 'exact', head: true });

    setStats({
      totalSiswa: usersCount || 0,
      totalSetoran: organizesCount || 0,
    });
  };

  useEffect(() => {
    fetchDashboardData();
    getPrayerTimes();
  }, [profile]);

  useEffect(() => {
    if (prayerTimes) {
      const now = currentTime;
      const prayerList = [
        { name: 'Subuh', time: prayerTimes.fajr },
        { name: 'Dzuhur', time: prayerTimes.dhuhr },
        { name: 'Ashar', time: prayerTimes.asr },
        { name: 'Maghrib', time: prayerTimes.maghrib },
        { name: 'Isya', time: prayerTimes.isha },
      ];

      for (let prayer of prayerList) {
        const prayerTime = dayjs(prayer.time, 'HH:mm');
        if (now.isBefore(prayerTime)) {
          setNextPrayer({
            name: prayer.name,
            time: prayer.time,
            timeLeft: prayerTime.from(now, true),
          });
          return;
        }
      }

      // If all prayers passed, next is tomorrow's Fajr
      const tomorrowFajr = dayjs(prayerTimes.fajr, 'HH:mm').add(1, 'day');
      setNextPrayer({
        name: 'Subuh',
        time: prayerTimes.fajr,
        timeLeft: tomorrowFajr.from(now, true),
      });
    }
  }, [currentTime, prayerTimes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    getPrayerTimes();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'siswa': return 'Santri';
      case 'guru': return 'Ustadz/Ustadzah';
      case 'ortu': return 'Wali Santri';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  const handleBannerPress = (link: string) => {
    Linking.openURL(link);
  };

  const handleLogoPress = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <View style={styles.container}>
      {/* Background with Gradient to White Transition */}
      <LinearGradient
        colors={['#10B981', '#FBBF24', 'rgba(255,255,255,0.8)', 'white']}
        style={styles.backgroundGradient}
        locations={[0, 0.4, 0.7, 1]}
      />

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View 
          entering={FadeInUp} 
          style={[styles.headerSection, { paddingTop: insets.top + 20 }]}
        >
          <Pressable onPress={handleLogoPress} style={styles.logoContainer}>
            <AppLogo size="medium" showText={false} animated={true} />
          </Pressable>
          
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{profile?.name}</Text>
            <Text style={styles.userRole}>{getRoleName(profile?.role || '')}</Text>
          </View>

          <Text style={styles.currentTime}>
            {currentTime.format('HH:mm')} WIB
          </Text>
        </Animated.View>

        {/* Blur Transition Effect */}
        <View style={styles.blurTransition}>
          <BlurView intensity={20} style={styles.blurView} />
        </View>

        {/* Main Content Area (White Background) */}
        <View style={styles.whiteContentArea}>
          {/* Enhanced Floating Prayer Times Card */}
          {prayerTimes && nextPrayer && (
            <Animated.View 
              entering={FadeInUp.delay(200)} 
              style={styles.floatingPrayerCard}
            >
              <LinearGradient
                colors={['#059669', '#10B981', '#34D399']}
                style={styles.prayerCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.prayerCardHeader}>
                  <View style={styles.prayerIconContainer}>
                    <Clock size={28} color="white" />
                  </View>
                  <View style={styles.locationBadge}>
                    <MapPin size={14} color="white" />
                    <Text style={styles.locationText}>{locationName}</Text>
                  </View>
                </View>

                <Text style={styles.nextPrayerLabel}>Sholat Berikutnya</Text>
                <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
                <Text style={styles.nextPrayerTime}>{nextPrayer.time} WIB</Text>
                
                {/* Enhanced Countdown */}
                <View style={styles.countdownContainer}>
                  <View style={styles.countdownItem}>
                    <Text style={styles.countdownNumber}>{timeLeft.hours.toString().padStart(2, '0')}</Text>
                    <Text style={styles.countdownLabel}>Jam</Text>
                  </View>
                  <Text style={styles.countdownSeparator}>:</Text>
                  <View style={styles.countdownItem}>
                    <Text style={styles.countdownNumber}>{timeLeft.minutes.toString().padStart(2, '0')}</Text>
                    <Text style={styles.countdownLabel}>Menit</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={() => setShowPrayerModal(true)}
                  style={styles.detailButton}
                >
                  <Text style={styles.detailButtonText}>Lihat Semua Jadwal</Text>
                  <ChevronDown size={16} color="white" />
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Unified Stats Section */}
           <Animated.View entering={FadeInUp.delay(200)} style={styles.statsContainer}>
          {profile?.role === 'siswa' && (
            <>
              <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
                <TrendingUp size={24} color="#3B82F6" />
                <Text style={styles.statNumber}>{stats.totalPoin || 0}</Text>
                <Text style={styles.statLabel}>Total Poin</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
                <BookOpen size={24} color="#10B981" />
                <Text style={styles.statNumber}>{stats.setoranDiterima || 0}</Text>
                <Text style={styles.statLabel}>Diterima</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                <Award size={24} color="#F59E0B" />
                <Text style={styles.statNumber}>{stats.labelCount || 0}</Text>
                <Text style={styles.statLabel}>Label Juz</Text>
              </View>
            </>
          )}

          {profile?.role === 'guru' && (
            <>
              <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
                <Clock size={24} color="#EF4444" />
                <Text style={styles.statNumber}>{stats.setoranPending || 0}</Text>
                <Text style={styles.statLabel}>Perlu Dinilai</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
                <Users size={24} color="#3B82F6" />
                <Text style={styles.statNumber}>{stats.totalSiswa || 0}</Text>
                <Text style={styles.statLabel}>Total Santri</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
                <Award size={24} color="#10B981" />
                <Text style={styles.statNumber}>1</Text>
                <Text style={styles.statLabel}>Kelas Aktif</Text>
              </View>
            </>
          )}

          {profile?.role === 'ortu' && (
            <>
              <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
                <TrendingUp size={24} color="#3B82F6" />
                <Text style={styles.statNumber}>{stats.totalPoin || 0}</Text>
                <Text style={styles.statLabel}>Poin Anak</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
                <BookOpen size={24} color="#10B981" />
                <Text style={styles.statNumber}>{stats.setoranDiterima || 0}</Text>
                <Text style={styles.statLabel}>Diterima</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                <Clock size={24} color="#F59E0B" />
                <Text style={styles.statNumber}>{stats.setoranPending || 0}</Text>
                <Text style={styles.statLabel}>Menunggu</Text>
              </View>
            </>
          )}
        </Animated.View>

        {/* Progress Cards for Students */}
        {profile?.role === 'siswa' && (
          <Animated.View entering={FadeInUp.delay(400)} style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Progress Pembelajaran</Text>
            <View style={styles.progressCards}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.progressCard}
              >
                <BookOpen size={24} color="white" />
                <Text style={styles.progressTitle}>Hafalan</Text>
                <Text style={styles.progressNumber}>{stats.hafalanProgress || 0}</Text>
                <Text style={styles.progressLabel}>Setoran Diterima</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.progressCard}
              >
                <Target size={24} color="white" />
                <Text style={styles.progressTitle}>Murojaah</Text>
                <Text style={styles.progressNumber}>{stats.murojaahProgress || 0}</Text>
                <Text style={styles.progressLabel}>Setoran Diterima</Text>
              </LinearGradient>
            </View>
          </Animated.View>
        )}

          {/* Recent Activity */}
          <Animated.View entering={FadeInUp.delay(500)} style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              <View style={styles.activityList}>
                {stats.recentActivity.map((activity, index) => (
                  <Animated.View 
                    key={activity.id || index} 
                    entering={SlideInRight.delay(index * 100)}
                    style={styles.activityCard}
                  >
                    <View style={styles.activityIcon}>
                      <BookOpen size={20} color="#10B981" />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>
                        {profile?.role === 'guru' ? 
                          `${activity.siswa?.name} - ${activity.jenis === 'hafalan' ? 'Hafalan' : 'Murojaah'} ${activity.surah}` :
                          `${activity.jenis === 'hafalan' ? 'Hafalan' : 'Murojaah'} ${activity.surah}`
                        }
                      </Text>
                      <Text style={styles.activityDate}>
                        {new Date(activity.tanggal || activity.created_at).toLocaleDateString('id-ID')}
                      </Text>
                    </View>
                    <View style={[
                      styles.activityStatus,
                      { backgroundColor: activity.status === 'diterima' ? '#DCFCE7' : 
                                       activity.status === 'pending' ? '#FEF3C7' : '#FEE2E2' }
                    ]}>
                      <Text style={[
                        styles.activityStatusText,
                        { color: activity.status === 'diterima' ? '#10B981' : 
                                 activity.status === 'pending' ? '#F59E0B' : '#EF4444' }
                      ]}>
                        {activity.status === 'pending' ? 'Menunggu' : 
                         activity.status === 'diterima' ? 'Diterima' : 'Ditolak'}
                      </Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyActivity}>
                <Calendar size={48} color="#94A3B8" />
                <Text style={styles.emptyActivityText}>Belum ada aktivitas</Text>
              </View>
            )}
          </Animated.View>

          {/* Program Kebaikan Section */}
          <Animated.View entering={FadeInUp.delay(400)} style={styles.bannerSection}>
            <Text style={styles.sectionTitle}>Program Kebaikan</Text>
            <FlatList
              ref={flatListRef}
              data={banners}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.85}
              decelerationRate="fast"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <Pressable 
                  onPress={() => handleBannerPress(item.link)} 
                  style={styles.bannerCard}
                >
                  <LinearGradient
                    colors={item.gradient}
                    style={styles.bannerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.bannerContent}>
                      <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle}>{item.title}</Text>
                        <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
                        <View style={styles.bannerButton}>
                          <Text style={styles.bannerButtonText}>Donasi Sekarang</Text>
                          <ExternalLink size={14} color="white" />
                        </View>
                      </View>
                      <View style={styles.bannerImageContainer}>
                        <Image source={{ uri: item.image }} style={styles.bannerImage} />
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              )}
            />

            <View style={styles.dotsContainer}>
              {banners.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    { 
                      backgroundColor: index === currentIndex ? '#10B981' : '#CBD5E1',
                      width: index === currentIndex ? 24 : 8
                    },
                  ]}
                />
              ))}
            </View>
          </Animated.View>

        
          {/* Today's Quote */}
          <Animated.View entering={FadeInUp.delay(600)} style={styles.quoteCard}>
            <LinearGradient
              colors={['#F59E0B', '#F97316']}
              style={styles.quoteGradient}
            >
              <Star size={24} color="white" />
              <Text style={styles.quoteText}>
                "Dan sungguhnya telah Kami mudahkan Al-Quran untuk pelajaran, 
                maka adakah orang yang mengambil pelajaran?"
              </Text>
              <Text style={styles.quoteSource}>- QS. Al-Qamar: 17</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Prayer Times Modal */}
      <Modal
        visible={showPrayerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrayerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Jadwal Sholat Hari Ini</Text>
            <Pressable onPress={() => setShowPrayerModal(false)} style={styles.modalCloseButton}>
              <X size={24} color="#6B7280" />
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.modalLocationHeader}>
              <MapPin size={20} color="#10B981" />
              <Text style={styles.modalLocationText}>{locationName}</Text>
              <Text style={styles.modalDate}>
                {currentTime.format('dddd, DD MMMM YYYY')}
              </Text>
            </View>

            <View style={styles.prayerTimesList}>
              {Object.entries({
                'Subuh': prayerTimes?.fajr,
                'Dzuhur': prayerTimes?.dhuhr,
                'Ashar': prayerTimes?.asr,
                'Maghrib': prayerTimes?.maghrib,
                'Isya': prayerTimes?.isha,
              }).map(([name, time]) => {
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
                      styles.prayerTimeName,
                      isNext && styles.prayerTimeNameActive
                    ]}>
                      {name}
                    </Text>
                    <Text style={[
                      styles.prayerTimeValue,
                      isNext && styles.prayerTimeValueActive
                    ]}>
                      {time} WIB
                    </Text>
                    {isNext && (
                      <View style={styles.nextIndicator}>
                        <Text style={styles.nextIndicatorText}>Berikutnya</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  logoContainer: {
    marginBottom: 8,
  },
  userInfo: {
    alignItems: 'center',
    gap: 4,
  },
  greeting: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  userRole: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    fontWeight: '500',
  },
  currentTime: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  blurTransition: {
    height: 600,
    marginTop: -500,
  },
  blurView: {
    flex: 1,
  },
  whiteContentArea: {
    backgroundColor: 'white',
    flex: 1,
    paddingTop: 40,
  },
  floatingPrayerCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    marginTop: -80,
    marginBottom: 40,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
    overflow: 'hidden',
  },
  prayerCardGradient: {
    padding: 32,
    alignItems: 'center',
  },
  prayerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  prayerIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  locationText: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
  },
  nextPrayerLabel: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    fontWeight: '600',
    marginBottom: 8,
  },
  nextPrayerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  nextPrayerTime: {
    fontSize: 20,
    color: 'white',
    fontWeight: '600',
    marginBottom: 20,
    opacity: 0.95,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  countdownItem: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'monospace',
  },
  countdownLabel: {
    fontSize: 12,
    color: 'white',
    opacity: 0.8,
    marginTop: 4,
    fontWeight: '500',
  },
  countdownSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    opacity: 0.7,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  detailButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalLocationHeader: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  modalLocationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
  },
  modalDate: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  prayerTimesList: {
    gap: 16,
  },
  prayerTimeItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  prayerTimeItemActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    shadowColor: '#10B981',
    shadowOpacity: 0.2,
  },
  prayerTimeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  prayerTimeNameActive: {
    color: '#10B981',
  },
  prayerTimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
    fontFamily: 'monospace',
  },
  prayerTimeValueActive: {
    color: '#10B981',
  },
  nextIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  unifiedStatsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
      flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,

    borderLeftWidth: 4,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
    minHeight: 120,
    justifyContent: 'center',
  },
   progressSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  progressCards: {
    flexDirection: 'row',
    gap: 12,
  },
  progressCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  progressNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  progressLabel: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.9,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  statLabel: {
    fontSize: 12,
    color: 'black',
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.9,
  },
  bannerSection: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  bannerCard: {
    width: width * 0.85,
    marginRight: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  bannerGradient: {
    padding: 20,
    minHeight: 160,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginBottom: 16,
    lineHeight: 20,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
    statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  bannerImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  activitySection: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
  },
  activityDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  activityStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activityStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyActivity: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyActivityText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  quoteCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    marginHorizontal: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  quoteGradient: {
    padding: 24,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 12,
    fontWeight: '500',
  },
  quoteSource: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    opacity: 0.9,
  },
});