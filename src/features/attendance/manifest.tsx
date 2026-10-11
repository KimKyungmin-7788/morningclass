import type { FeatureManifest } from '../types';
import { AttendanceCard } from './AttendanceCard';

const manifest: FeatureManifest = { id: 'attendance', cards: [{ id: 'attendance', title: '오늘의 출석', icon: 'ph-fill ph-users-three', tint: '#ffedd5', color: '#ea580c', Component: AttendanceCard }] };
export default manifest;
