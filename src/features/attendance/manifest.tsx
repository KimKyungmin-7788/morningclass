import type { FeatureManifest } from '../types';
import { AttendanceCard } from './AttendanceCard';

const manifest: FeatureManifest = { id: 'attendance', cards: [{ id: 'attendance', col: 0, order: 3, Component: AttendanceCard }] };
export default manifest;
