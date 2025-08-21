import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TextInput, Dimensions, Pressable } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, Award, Crown, BookOpen, Star, Search, TrendingUp, ListFilter as Filter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const podiumWidth = width * 0.28;
const podiumGap = width * 0.01;

interface LeaderboardEntry {
  id: string;
  name: string;
  total_poin: number;
  poin_hafalan: number;
  poin_quiz: number;
  rank: number;
}

export default function LeaderboardScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'hafalan' | 'quiz'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async () => {
    if (!profile?.organize_id) return;

    try {
      // Get all students in the same organize with their points
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, name')
        .eq('organize_id', profile.organize_id)
        .eq('role', 'siswa');

      if (studentsError || !studentsData) {
        console.error('Error fetching students:', studentsError);
        return;
      }

      // Get points for each student
      const leaderboardData = await Promise.all(
        studentsData.map(async (student) => {
          const { data: pointsData } = await supabase
            .from('siswa_poin')
            .select('*')
            .eq('siswa_id', student.id)
            .single();

          return {
            id: student.id,
            name: student.name,
            total_poin: pointsData?.total_poin || 0,
            poin_hafalan: pointsData?.poin_hafalan || 0,
            poin_quiz: pointsData?.poin_quiz || 0,
            rank: 0, // Will be set after sorting
          };
        })
      );

      // Sort by total points and assign ranks
      const sortedData = leaderboardData
        .sort((a, b) => b.total_poin - a.total_poin)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      setLeaderboard(sortedData);
      setFilteredLeaderboard(sortedData);

      // Find current user's rank
      const userEntry = sortedData.find(entry => entry.id === profile.id);
      setMyRank(userEntry || null);
    } catch (error) {
      console.error('Error in fetchLeaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredLeaderboard(leaderboard);
    } else {
      const filtered = leaderboard.filter(entry =>
        entry.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredLeaderboard(filtered);
    }
  };

  const applyFilter = () => {
    let filtered = leaderboard;
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(entry =>
        entry.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort based on filter type
    if (filterType === 'hafalan') {
      filtered = filtered.sort((a, b) => b.poin_hafalan - a.poin_hafalan);
    } else if (filterType === 'quiz') {
      filtered = filtered.sort((a, b) => b.poin_quiz - a.poin_quiz);
    }

    setFilteredLeaderboard(filtered);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [profile]);

  useEffect(() => {
    applyFilter();
  }, [searchQuery, filterType, leaderboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return Crown;
      case 2: return Trophy;
      case 3: return Medal;
      default: return Star;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return '#10B981';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInUp} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <LinearGradient
          colors={['#F59E0B', '#EF4444']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerIcon}>
            <Trophy size={32} color="white" />
          </View>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSubtitle}>Kompetisi pembelajaran Quran</Text>
        </LinearGradient>
      </Animated.View>

      {/* Search and Filter */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama siswa..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
        </View>
        
        <View style={styles.filterContainer}>
          <Filter size={16} color="#6B7280" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'Semua' },
              { key: 'hafalan', label: 'Hafalan' },
              { key: 'quiz', label: 'Quiz' },
            ].map((filter) => (
              <Pressable
                key={filter.key}
                style={[
                  styles.filterButton,
                  filterType === filter.key && styles.filterButtonActive
                ]}
                onPress={() => setFilterType(filter.key as any)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterType === filter.key && styles.filterButtonTextActive
                ]}>
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Animated.View>
    

      {/* My Rank Card */}
      {myRank && (
        <Animated.View entering={FadeInUp.delay(200)} style={styles.myRankCard}>
          <Text style={styles.myRankTitle}>Peringkat Saya</Text>
          <View style={styles.myRankContent}>
            <LinearGradient
              colors={[getRankColor(myRank.rank), getRankColor(myRank.rank) + 'CC']}
              style={styles.rankBadge}
            >
              <Text style={styles.rankNumber}>#{myRank.rank}</Text>
            </LinearGradient>
            <View style={styles.myRankInfo}>
              <Text style={styles.myRankName}>{myRank.name}</Text>
              <Text style={styles.myRankPoints}>{myRank.total_poin} poin</Text>
              <View style={styles.pointsBreakdownMy}>
                <Text style={styles.pointsDetailMy}>
                  Hafalan: {myRank.poin_hafalan} • Quiz: {myRank.poin_quiz}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Top 3 Podium */}
      {filteredLeaderboard.length >= 3 && searchQuery === '' && (
        <Animated.View entering={FadeInUp.delay(300)} style={styles.podiumContainer}>
          <Text style={styles.sectionTitle}>Top 3 Siswa Terbaik</Text>
          <View style={styles.podium}>
            {/* 2nd Place */}
            {filteredLeaderboard[1] && (
              <Animated.View entering={FadeInDown.delay(400)} style={[styles.podiumPlace, styles.secondPlace]}>
                <LinearGradient
                  colors={['#C0C0C0', '#A0A0A0']}
                  style={styles.podiumIcon}
                >
                  <Trophy size={24} color="white" />
                </LinearGradient>
                <Text style={styles.podiumName}>{filteredLeaderboard[1].name}</Text>
                <Text style={styles.podiumPoints}>{filteredLeaderboard[1].total_poin} poin</Text>
                <Text style={styles.podiumRank}>#2</Text>
              </Animated.View>
            )}

            {/* 1st Place */}
            {filteredLeaderboard[0] && (
              <Animated.View entering={FadeInDown.delay(500)} style={[styles.podiumPlace, styles.firstPlace]}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.podiumIcon}
                >
                  <Crown size={28} color="white" />
                </LinearGradient>
                <Text style={styles.podiumName}>{filteredLeaderboard[0].name}</Text>
                <Text style={styles.podiumPoints}>{filteredLeaderboard[0].total_poin} poin</Text>
                <Text style={styles.podiumRank}>#1</Text>
              </Animated.View>
            )}

            {/* 3rd Place */}
            {filteredLeaderboard[2] && (
              <Animated.View entering={FadeInDown.delay(600)} style={[styles.podiumPlace, styles.thirdPlace]}>
                <LinearGradient
                  colors={['#CD7F32', '#B8860B']}
                  style={styles.podiumIcon}
                >
                  <Medal size={24} color="white" />
                </LinearGradient>
                <Text style={styles.podiumName}>{filteredLeaderboard[2].name}</Text>
                <Text style={styles.podiumPoints}>{filteredLeaderboard[2].total_poin} poin</Text>
                <Text style={styles.podiumRank}>#3</Text>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Full Leaderboard */}
      <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>
          {searchQuery ? `Hasil Pencarian (${filteredLeaderboard.length})` : 'Semua Peringkat'}
        </Text>
        <View style={styles.leaderboardList}>
          {filteredLeaderboard.map((entry) => {
            const RankIcon = getRankIcon(entry.rank);
            const isCurrentUser = entry.id === profile?.id;
            
            return (
              <Animated.View 
                key={entry.id} 
                entering={SlideInRight.delay(entry.rank * 50)}
                style={[styles.leaderboardCard, isCurrentUser && styles.currentUserCard]}
              >
                <View style={styles.rankContainer}>
                  <LinearGradient
                    colors={[getRankColor(entry.rank), getRankColor(entry.rank) + 'CC']}
                    style={styles.rankIconContainer}
                  >
                    <RankIcon size={16} color="white" />
                  </LinearGradient>
                  <Text style={styles.rankText}>#{entry.rank}</Text>
                </View>

                <View style={styles.userInfo}>
                  <Text style={[styles.userName, isCurrentUser && styles.currentUserName]}>
                    {entry.name}
                    {isCurrentUser && ' (Saya)'}
                  </Text>
                  <View style={styles.pointsBreakdown}>
                    <Text style={styles.totalPoints}>{entry.total_poin} poin</Text>
                    <Text style={styles.pointsDetail}>
                      Hafalan: {entry.poin_hafalan} • Quiz: {entry.poin_quiz}
                    </Text>
                  </View>
                </View>

                <View style={styles.achievementBadges}>
                  {entry.rank <= 3 && (
                    <LinearGradient
                      colors={[getRankColor(entry.rank) + '20', getRankColor(entry.rank) + '10']}
                      style={styles.achievementBadge}
                    >
                      <Text style={[styles.achievementText, { color: getRankColor(entry.rank) }]}>
                        {entry.rank === 1 ? 'Juara 1' : entry.rank === 2 ? 'Juara 2' : 'Juara 3'}
                      </Text>
                    </LinearGradient>
                  )}
                  <View style={styles.trendingIndicator}>
                    <TrendingUp size={12} color="#10B981" />
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      {/* Achievement Categories */}
      <Animated.View entering={FadeInUp.delay(500)} style={styles.section}>
        <Text style={styles.sectionTitle}>Kategori Pencapaian</Text>
        
        <View style={styles.categoryCards}>
          <Animated.View entering={SlideInRight.delay(600)} style={styles.categoryCard}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.categoryGradient}
            >
            <BookOpen size={24} color="#10B981" />
            </LinearGradient>
            <Text style={styles.categoryTitle}>Top Hafalan</Text>
            <Text style={styles.categoryLeader}>
              {leaderboard.sort((a, b) => b.poin_hafalan - a.poin_hafalan)[0]?.name || '-'}
            </Text>
            <Text style={styles.categoryPoints}>
              {leaderboard.sort((a, b) => b.poin_hafalan - a.poin_hafalan)[0]?.poin_hafalan || 0} poin
            </Text>
          </Animated.View>

          <Animated.View entering={SlideInRight.delay(700)} style={styles.categoryCard}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.categoryGradient}
            >
            <Trophy size={24} color="#3B82F6" />
            </LinearGradient>
            <Text style={styles.categoryTitle}>Top Quiz</Text>
            <Text style={styles.categoryLeader}>
              {leaderboard.sort((a, b) => b.poin_quiz - a.poin_quiz)[0]?.name || '-'}
            </Text>
            <Text style={styles.categoryPoints}>
              {leaderboard.sort((a, b) => b.poin_quiz - a.poin_quiz)[0]?.poin_quiz || 0} poin
            </Text>
          </Animated.View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  headerGradient: {
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    fontWeight: '500',
  },
  searchFilterContainer: {
    padding: 20,
    gap: 16,
    marginTop: 20,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: '#1F2937',
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  filterButton: {
    backgroundColor: 'white',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  filterButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.4,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  myRankCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  myRankTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  myRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  rankBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  rankNumber: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  myRankInfo: {
    flex: 1,
  },
  myRankName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  myRankPoints: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  pointsBreakdownMy: {
    marginTop: 6,
  },
  pointsDetailMy: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
 podiumContainer: {
    backgroundColor: 'white',
    margin: 20,
    paddingVertical: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: podiumGap,
    marginTop: 20,
  },
  podiumPlace: {
    alignItems: 'center',
  },
   firstPlace: {
    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    width: podiumWidth,
    height: podiumWidth * 1.6,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'flex-end',
    paddingBottom: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  
  },
  secondPlace: {
    background: 'linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)',
    width: podiumWidth,
    height: podiumWidth * 1.4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'flex-end',
    paddingBottom: 16,
    shadowColor: '#C0C0C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  thirdPlace: {
    background: 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)',
    width: podiumWidth,
    height: podiumWidth * 1.3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'flex-end',
    paddingBottom: 16,
    shadowColor: '#CD7F32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  podiumIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  podiumName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  podiumPoints: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  podiumRank: {
    fontSize: 11,
    color: 'white',
    fontWeight: 'bold',
    opacity: 0.9,
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
    leaderboardList: {
    gap: 16,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
   currentUserCard: {
    borderWidth: 3,
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    shadowColor: '#10B981',
    shadowOpacity: 0.2,
  },
  rankContainer: {
    alignItems: 'center',
    gap: 6,
  },
  rankIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
   rankText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6B7280',
  },
    userInfo: {
    flex: 1,
    marginLeft: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  currentUserName: {
    color: '#10B981',
  },
  pointsBreakdown: {
    marginTop: 6,
  },
  totalPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  pointsDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  achievementBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  achievementBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  achievementText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  trendingIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCards: {
    flexDirection: 'row',
    gap: 16,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  categoryGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937', 
    marginBottom: 12,
  },
  categoryLeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 6,
  },
  categoryPoints: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: 'bold',
  },
});