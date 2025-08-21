import { 
  BookOpen, Home, Trophy, User, Plus, ListChecks, HousePlus, Monitor, CloudUpload, Building2, Shield 
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Import screen components
import IndexScreen from './index';
import HafalanScreen from './hafalan';
import InputSetoranScreen from './input-setoran';
import LeaderboardScreen from './leaderboard';
import ProfileScreen from './profile';
import absensi from './absensi';
import admin from './admin';
import joinorganize from './join-organize';
import monitoring from './monitoring';
import organize from './organize';
import penilaian from './penilaian';
import quiz from './quiz';
import quran from './quran';

const { width } = Dimensions.get('window'); 
const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  const { user, profile, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const role = profile?.role;

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/welcome');
    }
  }, [loading, user]);

  if (loading || !user || !profile) return null;

  // Fungsi untuk menentukan tab berdasarkan role
  const getTabsForRole = () => {
    const commonTabs = [
      { name: 'Home', component: IndexScreen, icon: Home, isCenter: false },
      { name: 'Leaderboard', component: LeaderboardScreen, icon: Trophy, isCenter: false },
      { name: 'Absensi', component: absensi, icon: User, isCenter: false },
    ];

    switch (role) {
      case 'siswa':
        return [
          ...commonTabs,
          { name: 'Input Setoran', component: InputSetoranScreen, icon: Plus, isCenter: true },
               { name: 'Hafalan', component: HafalanScreen, icon: BookOpen, isCenter: false },
          { name: 'Gabung Kelas', component: joinorganize, icon: HousePlus, isCenter: false },
            { name: 'Profile', component: ProfileScreen, icon: User, isCenter: false },
        ];
      case 'ortu':
        return [
          ...commonTabs,
          { name: 'Monitoring', component: monitoring, icon: Monitor, isCenter: false },
          { name: 'Gabung Kelas', component: joinorganize, icon: HousePlus, isCenter: false },
            { name: 'Profile', component: ProfileScreen, icon: User, isCenter: false },
        ];
      case 'guru':
        return [
          ...commonTabs,
          { name: 'Penilaian', component: penilaian, icon: CloudUpload, isCenter: true },
          { name: 'Monitoring', component: monitoring, icon: Monitor, isCenter: false },
          { name: 'Organize', component: organize, icon: Building2, isCenter: false },
            { name: 'Profile', component: ProfileScreen, icon: User, isCenter: false },
        ];
      case 'admin':
        return [
          ...commonTabs,
          { name: 'Admin', component: admin, icon: Shield, isCenter: true },
            { name: 'Profile', component: ProfileScreen, icon: User, isCenter: false },
        ];
      default:
        return commonTabs;
    }
  };

  const tabs = getTabsForRole();

  // Render icon tab, tab special (floating center) pakai gradient
  const renderTabIcon = (
    IconComponent: any,
    focused: boolean,
    color: string,
    size: number,
    isCenter = false
  ) => {
    if (isCenter) {
      return (
        <View style={{
          width: 64, height: 64, borderRadius: 32, marginTop: -20,
          shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
        }}>
          <LinearGradient
            colors={focused ? ['#10B981', '#059669'] : ['#E5E7EB', '#D1D5DB']}
            style={{
              flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
              borderWidth: 4, borderColor: 'white',
            }}
          >
            <IconComponent size={28} color="white" />
          </LinearGradient>
        </View>
      );
    }

    return <IconComponent size={size} color={color} />;
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 12,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 85 + insets.bottom : 85,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 20,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 11,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      {tabs.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarIcon: ({ size, color, focused }) =>
              renderTabIcon(tab.icon, focused, color, size, tab.isCenter),
            tabBarLabel: tab.isCenter ? '' : tab.name,
            title: tab.name,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
