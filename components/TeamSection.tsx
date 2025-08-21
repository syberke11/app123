import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Users, Code, Palette } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export function TeamSection() {
  const teamMembers = [
    {
      name: 'Qiageng Berke Jaisyurrohman',
      role: 'Lead Developer & Backend Engineer',
      avatar: 'A',
      color: '#3B82F6',
      icon: Code,
    },
    {
      name: 'Akra Mujjaman Raton',
      role: 'Frontend Developer & UI/UX Designer ',
      avatar: 'Q',
      color: '#8B5CF6',
      icon: Palette ,
    }
  ];

  return (
    <Animated.View entering={FadeInUp} style={styles.container}>
      <View style={styles.header}>
        <Users size={24} color="#64748B" />
        <Text style={styles.title}>Tim Pengembang</Text>
      </View>
      
      <Text style={styles.subtitle}>
        Dikembangkan dengan ❤️ oleh tim yang berdedikasi untuk pendidikan Quran
      </Text>

      <View style={styles.teamGrid}>
        {teamMembers.map((member, index) => (
          <Animated.View 
            key={member.name}
            entering={FadeInUp.delay((index + 1) * 200)}
            style={styles.memberCard}
          >
            <LinearGradient
              colors={[member.color, member.color + 'CC']}
              style={styles.memberAvatar}
            >
              <Text style={styles.memberInitial}>{member.avatar}</Text>
            </LinearGradient>
            
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
            </View>
            
            <View style={styles.memberIcon}>
              <member.icon size={20} color={member.color} />
            </View>
          </Animated.View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Terima kasih telah menggunakan IQRO untuk pembelajaran Quran Anda
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  teamGrid: {
    gap: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  memberIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});