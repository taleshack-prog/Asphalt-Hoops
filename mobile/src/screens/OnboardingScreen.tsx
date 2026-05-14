import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, Share,
} from 'react-native';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '🏀',
    title: 'Bem-vindo ao\nAsphalt Hoops',
    subtitle: 'O app de basquete de rua\nde Porto Alegre',
    description: 'Encontre quadras, marque jogos,\nconverse com jogadores e\ncresça a comunidade!',
    color: '#F97316',
  },
  {
    icon: '🗺️',
    title: 'Encontre Quadras',
    subtitle: 'Mapa com quadras públicas de POA',
    description: '• Veja todas as quadras no mapa\n• Clique numa quadra para ver jogos\n• Adicione novas quadras que você conhece\n• Busque por nome de rua ou praça',
    color: '#3B82F6',
  },
  {
    icon: '📅',
    title: 'Marque Jogos',
    subtitle: 'Organize partidas na sua quadra',
    description: '• Clique na quadra → "Marcar Jogo"\n• Escolha modalidade: 1x1, 2x2, 3x3 ou 5x5\n• Defina o dia e horário\n• Outros jogadores confirmam presença',
    color: '#10B981',
  },
  {
    icon: '💬',
    title: 'Chat & Grupos',
    subtitle: 'Comunique-se com os jogadores',
    description: '• Chat da partida: combine detalhes\n• Chat Geral: fale com todos de POA\n• Crie grupos: seu time, sua galera\n• Convide jogadores para seus grupos',
    color: '#8B5CF6',
  },
  {
    icon: '📤',
    title: 'Convide Amigos',
    subtitle: 'Seu link único de convite',
    description: '• Cada jogador tem um código único\n• Compartilhe seu link pelo WhatsApp\n• Amigos se cadastram com seu código\n• Acompanhe quem você trouxe para o jogo!',
    color: '#F59E0B',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function goToSlide(index: number) {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentSlide(index);
  }

  function handleNext() {
    if (currentSlide < SLIDES.length - 1) {
      goToSlide(currentSlide + 1);
    } else {
      navigation.replace('Login');
    }
  }

  function handleSkip() {
    navigation.replace('Login');
  }

  const slide = SLIDES[currentSlide];

  return (
    <View style={s.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={s.slider}
      >
        {SLIDES.map((slide, index) => (
          <View key={index} style={[s.slide, { width }]}>
            <View style={[s.iconContainer, { backgroundColor: slide.color + '20', borderColor: slide.color }]}>
              <Text style={s.slideIcon}>{slide.icon}</Text>
            </View>
            <Text style={[s.slideTitle, { color: slide.color }]}>{slide.title}</Text>
            <Text style={s.slideSubtitle}>{slide.subtitle}</Text>
            <View style={s.descriptionBox}>
              <Text style={s.slideDescription}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
            <View style={[s.dot, currentSlide === i && { backgroundColor: slide.color, width: 24 }]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Buttons */}
      <View style={s.buttons}>
        {currentSlide < SLIDES.length - 1 ? (
          <>
            <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
              <Text style={s.skipBtnText}>Pular</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.nextBtn, { backgroundColor: slide.color }]} onPress={handleNext}>
              <Text style={s.nextBtnText}>Próximo →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[s.startBtn, { backgroundColor: slide.color }]} onPress={handleNext}>
            <Text style={s.startBtnText}>🏀 Começar a Jogar!</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  slider: { flex: 1 },
  slide: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingTop: 60,
  },
  iconContainer: {
    width: 140, height: 140, borderRadius: 70,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32, borderWidth: 2,
  },
  slideIcon: { fontSize: 72 },
  slideTitle: {
    fontSize: 28, fontWeight: 'bold', textAlign: 'center',
    marginBottom: 8, lineHeight: 36,
  },
  slideSubtitle: {
    color: '#aaa', fontSize: 15, textAlign: 'center',
    marginBottom: 24, lineHeight: 22,
  },
  descriptionBox: {
    backgroundColor: '#1c1c1e', borderRadius: 16, padding: 20,
    width: '100%', borderWidth: 1, borderColor: '#2c2c2e',
  },
  slideDescription: {
    color: '#ddd', fontSize: 15, lineHeight: 26, textAlign: 'left',
  },
  dots: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingVertical: 20,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#333', transition: 'all 0.3s',
  },
  buttons: {
    flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 40, gap: 12,
  },
  skipBtn: {
    flex: 1, backgroundColor: '#1c1c1e', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333',
  },
  skipBtnText: { color: '#888', fontWeight: 'bold', fontSize: 15 },
  nextBtn: {
    flex: 2, borderRadius: 14, padding: 16, alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  startBtn: {
    flex: 1, borderRadius: 14, padding: 18, alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
