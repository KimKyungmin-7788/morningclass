import type { FeatureManifest } from '../types';
import { AttendanceCard } from './AttendanceCard';

const manifest: FeatureManifest = { id: 'attendance', cards: [{ id: 'attendance', Component: AttendanceCard }] };
export default manifest;
