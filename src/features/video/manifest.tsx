import { VideoTour } from './VideoTour';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CardFrame } from '@/core/ui/CardFrame';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { useCurrentClass, useData } from '@/core/data/store';
import { useKv } from '@/core/data/kv';
import type { VideoItem } from '@/core/data/types';
import type { CardProps, FeatureManifest } from '../types';
import { MAX_VIDEOS, extractVideoId, fmtVideoTime, needsTitle, recordVideo } from './model';

// 영상 재생: 떠 있는 재생 창 + 재생 이력. 쿠키를 남기지 않는 주소(youtube-nocookie)로 재생한다.

/** 학급에 기본 영상을 정하지 않았을 때 (기존 앱과 같은 값) */
const DEFAULT_VIDEO = { url: 'https://www.youtube.com/watch?v=VAoR8bL04qA&list=RDVAoR8bL04qA&start_radio=1', title: '아침 음악' };

async function fetchTitle(url: string): Promise<string> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    return r.ok ? String((await r.json()).title ?? '') : '';
  } catch {
    return '';
  }
}

function VideoWindow({ start, onClose }: { start: string; onClose: () => void }) {
  const [list, setList, loaded] = useKv<VideoItem[]>('videos', []);
  const cls = useCurrentClass()!;
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'player' | 'list'>('player');
  // 창을 열 때는 미리보기만(자동 재생 안 함). 주소를 넣거나 목록에서 고르면 재생한다.
  const [current, setCurrent] = useState({ url: start, autoplay: false });
  const [input, setInput] = useState(current.url);
  const id = extractVideoId(current.url);

  const play = (url: string) => {
    const vid = extractVideoId(url);
    if (!vid) { toast('유튜브 링크를 확인해 주세요', 'error'); return; }
    if (!loaded) return;
    setList((items) => recordVideo(items, url));
    setCurrent({ url, autoplay: true });
    setInput(url);
    setTitle('');
    setView('player');
    playSound('select');
    if (needsTitle(list.find((v) => v.videoId === vid))) {
      void fetchTitle(url).then((title) => { if (title) setList((items) => items.map((v) => (v.videoId === vid && needsTitle(v) ? { ...v, title } : v))); });
    }
  };

  const saveVideo = async () => {
    if (!loaded || saving) return;
    const url = input.trim();
    const videoId = extractVideoId(url);
    if (!videoId) { toast('유튜브 링크를 확인해 주세요', 'error'); return; }
    const videoTitle = title.trim() || list.find((v) => v.videoId === videoId)?.title || url;
    setSaving(true);
    try {
      setList((items) => recordVideo(items, url).map((v) => v.videoId === videoId ? { ...v, title: videoTitle } : v));
      const latest = useData.getState().classes.find((c) => c.id === cls.id);
      if (latest) await useData.getState().saveClass({ ...latest, options: { ...latest.options, video: { url, title: videoTitle } } });
      setCurrent({ url, autoplay: false });
      toast('영상을 저장하고 카드의 기본 영상으로 지정했어요', 'success');
    } catch { toast('기본 영상을 저장하지 못했어요. 다시 시도해 주세요', 'error'); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div className="video-window" role="dialog" aria-label="영상 재생">
      <VideoTour />
      <div className="vw-header">
        <div className="vw-title">▶️ 영상 재생</div>
        <button className="vw-btn" title="저장한 영상" aria-label="저장한 영상" onClick={() => setView('list')}>
          <i className="ph-bold ph-list-bullets" /><span className="vw-badge">{list.length}</span>
        </button>
        <button className="vw-btn close" title="닫기" aria-label="닫기" onClick={onClose}>✕</button>
      </div>
      <div className="vw-body">
        <form className="vw-search" onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`, '_blank', 'noopener,noreferrer');
        }}>
          <input aria-label="유튜브 검색어" name="search_query" placeholder="어떤 영상을 찾으세요?" value={query} onChange={(e) => setQuery(e.target.value)} required />
          <button type="submit">유튜브 검색 ↗</button>
        </form>
        <p className="vw-search-hint">새 창에서 영상을 찾고, 공유 링크를 아래에 붙여 넣으세요. 저장한 영상은 다음에도 사용할 수 있어요.</p>
        {view === 'list' ? (
          <>
            <div className="vw-list-head">
              <button className="vw-btn" title="뒤로" aria-label="뒤로" onClick={() => setView('player')}>←</button>
              <span className="vw-list-count"><b>{list.length}</b>/{MAX_VIDEOS}</span>
              <button className="vw-clear-all" onClick={() => { if (confirm('영상 목록을 전체 삭제할까요?')) setList([]); }}>전체 삭제</button>
            </div>
            <div className="vw-list">
              {list.length ? list.map((v) => (
                <div key={v.videoId} className="vw-item">
                  <button className="vi-play" onClick={() => play(v.url)}>
                  <span className="vi-title">{v.title || v.url}</span>
                  <span className="vi-time">{fmtVideoTime(v.playedAt)}</span></button>
                  <button className="vi-del" title="삭제" aria-label="삭제"
                    onClick={(e) => { e.stopPropagation(); setList((items) => items.filter((x) => x.videoId !== v.videoId)); }}>✕</button>
                </div>
              )) : <div className="vw-empty-list">아직 저장한 영상이 없어요 📭</div>}
            </div>
          </>
        ) : (
          <>
            <input aria-label="유튜브 영상 링크" disabled={!loaded} className="vw-url" placeholder="유튜브 영상 링크를 붙여넣으면 자동으로 재생돼요" autoComplete="off" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); play(input.trim()); } }}
              onPaste={(e) => { const text = e.clipboardData.getData('text').trim(); if (extractVideoId(text)) { e.preventDefault(); play(text); } }}
              onBlur={() => { const v = input.trim(); if (v && v !== current.url && extractVideoId(v)) play(v); }} />
            <div className="vw-save-row">
              <input aria-label="저장할 영상 제목" placeholder="영상 제목 (선택)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <button disabled={!loaded || saving || !extractVideoId(input.trim())} onClick={() => void saveVideo()}>저장 · 기본 영상 지정</button>
            </div>
            <div className="vw-player">
              {id
                ? <iframe key={`${id}-${current.autoplay}`} title="영상" src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=${current.autoplay ? 1 : 0}`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
                : <div className="vw-empty">📺<div>유튜브 영상 링크를 입력하면<br />자동으로 영상 화면이 나타나요</div></div>}
            </div>
            <div className="vw-note">
              영상은 유튜브 콘텐츠로 광고가 포함될 수 있어요.
              {id && <> · <a className="vw-open-yt" href={`https://youtu.be/${id}`} target="_blank" rel="noopener noreferrer">유튜브에서 열기 ↗</a></>}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function VideoCard({ size }: CardProps) {
  const cls = useCurrentClass();
  const [open, setOpen] = useState(false);
  const video = cls?.options.video?.url ? cls.options.video : DEFAULT_VIDEO;
  const id = extractVideoId(video.url);
  return (
    <>
      <CardFrame id="book" label="영상 재생" state="filled" style={{ padding: 10 }}
        onOpen={() => { ensureAudio(); playSound('select'); setOpen(true); }}>
        <div className="book-shortcut">
          {id
            ? <div className="book-mini" style={{ backgroundImage: `url('https://img.youtube.com/vi/${id}/${size === 'tiny' ? 'default' : 'hqdefault'}.jpg')` }} />
            : <div className="book-mini"><i className="ph-fill ph-play-circle" /></div>}
          <div className="book-info">
            <div className="book-label"><i className="ph-fill ph-play-circle" /> 영상 재생</div>
            <div className="book-title-mini">{video.title || '영상 열기'}</div>
          </div>
          <div className="book-arrow"><i className="ph-fill ph-play" /></div>
        </div>
      </CardFrame>
      {open && cls && <VideoWindow key={cls.id} start={video.url} onClose={() => setOpen(false)} />}
    </>
  );
}

const manifest: FeatureManifest = { id: 'video', cards: [{ id: 'book', title: '영상 재생', icon: 'ph-fill ph-play-circle', tint: '#fee2e2', color: '#dc2626', Component: VideoCard }] };
export default manifest;
