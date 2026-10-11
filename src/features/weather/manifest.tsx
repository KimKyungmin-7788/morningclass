import type { FeatureManifest } from '../types';
import { WeatherCard } from './WeatherCard';

// 미세먼지는 날씨 카드 안에 한 줄로 들어 있다 (DustCard.tsx 의 DustChip)
const manifest: FeatureManifest = {
  id: 'weather',
  cards: [{ id: 'weather', Component: WeatherCard }],
};

export default manifest;
