import type { FeatureManifest } from '../types';
import { WeatherCard } from './WeatherCard';

// 미세먼지는 날씨 카드 안에 한 줄로 들어 있다 (DustCard.tsx 의 DustChip)
const manifest: FeatureManifest = {
  id: 'weather',
  cards: [{ id: 'weather', title: '오늘의 날씨', icon: 'ph-fill ph-sun-horizon', tint: '#fef3c7', color: '#d97706', Component: WeatherCard }],
};

export default manifest;
