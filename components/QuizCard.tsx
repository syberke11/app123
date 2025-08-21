import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Trophy, Clock, CircleCheck as CheckCircle } from 'lucide-react-native';

interface QuizCardProps {
  quiz: {
    id: string;
    question: string;
    difficulty: 'mudah' | 'sedang' | 'sulit';
    poin: number;
    category: string;
  };
  isAnswered: boolean;
  onPress: () => void;
}

export function QuizCard({ quiz, isAnswered, onPress }: QuizCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'mudah': return '#10B981';
      case 'sedang': return '#F59E0B';
      case 'sulit': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <Pressable 
      style={[styles.card, isAnswered && styles.cardAnswered]}
      onPress={onPress}
      disabled={isAnswered}
    >
      <View style={styles.header}>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(quiz.difficulty) }]}>
          <Text style={styles.difficultyText}>{quiz.difficulty}</Text>
        </View>
        <Text style={styles.poin}>+{quiz.poin} poin</Text>
      </View>
      
      <Text style={styles.question} numberOfLines={2}>
        {quiz.question}
      </Text>
      
      <View style={styles.footer}>
        <Text style={styles.category}>{quiz.category}</Text>
        {isAnswered && (
          <View style={styles.answeredBadge}>
            <CheckCircle size={12} color="#10B981" />
            <Text style={styles.answeredText}>Selesai</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardAnswered: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  poin: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  question: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    color: '#6B7280',
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  answeredText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
});