import { describe, expect, it } from 'vitest';
import { extractVideoId, fmtVideoTime, needsTitle, recordVideo } from './model';

describe('영상 재생 이력', () => {
  it('여러 모양의 유튜브 주소에서 영상 번호를 꺼낸다', () => {
    expect(['https://youtu.be/abc123?t=3', 'https://www.youtube.com/watch?v=abc123&list=x', 'https://youtube.com/shorts/abc123',
      'https://www.youtube.com/embed/abc123', 'https://www.youtube.com/live/abc123#x', 'https://example.com/a'].map(extractVideoId))
      .toEqual(['abc123', 'abc123', 'abc123', 'abc123', 'abc123', '']);
  });
  it('다시 튼 영상은 맨 앞으로 오고 제목은 유지된다', () => {
    const now = new Date('2026-10-10T00:00:00.000Z');
    let list = recordVideo([], 'https://youtu.be/a', now);
    expect(needsTitle(list[0])).toBe(true);
    list[0].title = '아침 음악';
    list = recordVideo(list, 'https://youtu.be/b', now);
    list = recordVideo(list, 'https://www.youtube.com/watch?v=a', now);
    expect(list.map((v) => v.videoId)).toEqual(['a', 'b']);
    expect(list[0].title).toBe('아침 음악');
    expect(recordVideo(list, '유튜브 아님', now)).toBe(list);
  });
  it('이력은 50개까지만', () => {
    let list = Array.from({ length: 50 }, (_, i) => ({ url: `https://youtu.be/v${i}`, videoId: `v${i}`, title: 't', playedAt: '' }));
    list = recordVideo(list, 'https://youtu.be/new');
    expect(list).toHaveLength(50);
    expect(list[0].videoId).toBe('new');
  });
  it('재생 시각 표시: 오늘은 시각만, 다른 날은 날짜도', () => {
    const now = new Date(2026, 9, 10, 20, 0);
    expect(fmtVideoTime(new Date(2026, 9, 10, 9, 5).toISOString(), now)).toBe('오전 9시 05분');
    expect(fmtVideoTime(new Date(2026, 9, 8, 13, 30).toISOString(), now)).toBe('10.8 오후 1시 30분');
  });
});
