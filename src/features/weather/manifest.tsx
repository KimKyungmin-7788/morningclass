import type { FeatureManifest } from '../types';
import { WeatherCard } from './WeatherCard';
import { DustCard } from './DustCard';

const manifest: FeatureManifest = {
  id: 'weather',
  cards: [
    { id: 'weather', col: 0, order: 1, Component: WeatherCard },
    { id: 'dust', col: 0, order: 2, Component: DustCard },
  ],
};

export default manifest;
