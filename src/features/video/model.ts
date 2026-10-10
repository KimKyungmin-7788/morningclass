import type { VideoItem } from '@/core/data/types';

// 영상 재생 이력 계산 (화면과 무관)

export const MAX_VIDEOS = 50;

export const extractVideoId = (url: string | undefined): string =>
  (url ?? '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([^&\n?#]+)/)?.[1] ?? '';

/** 방금 튼 영상을 이력 맨 앞에 둔다 (같은 영상은 하나만, 이미 아는 제목은 유지) */
export function recordVideo(list: VideoItem[], url: string, now = new Date()): VideoItem[] {
  const id = extractVideoId(url);
  if (!id) return list;
  const existing = list.find((v) => v.videoId === id);
  return [{ url, videoId: id, title: existing?.title || url, playedAt: now.toISOString() }, ...list.filter((v) => v.videoId !== id)].slice(0, MAX_VIDEOS);
}

export const needsTitle = (v: VideoItem | undefined) => !v || !v.title || v.title === v.url;

export function fmtVideoTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const h = d.getHours();
  const t = `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시 ${String(d.getMinutes()).padStart(2, '0')}분`;
  return d.toDateString() === now.toDateString() ? t : `${d.getMonth() + 1}.${d.getDate()} ${t}`;
}
