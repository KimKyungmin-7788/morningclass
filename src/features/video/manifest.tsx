import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CardFrame } from '@/core/ui/CardFrame';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { useCurrentClass } from '@/core/data/store';
import { useKv } from '@/core/data/kv';
import type { VideoItem } from '@/core/data/types';
import type { FeatureManifest } from '../types';
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
  const [list, setList] = useKv<VideoItem[]>('videos', []);
  const [view, setView] = useState<'player' | 'list'>('player');
  // 창을 열 때는 미리보기만(자동 재생 안 함). 주소를 넣거나 목록에서 고르면 재생한다.
  const [current, setCurrent] = useState({ url: list[0]?.url || start, autoplay: false });
  const [input, setInput] = useState(current.url);
  const id = extractVideoId(current.url);

  const play = (url: string) => {
    const vid = extractVideoId(url);
    if (!vid) { toast('유튜브 링크를 확인해 주세요', 'error'); return; }
    const next = recordVideo(list, url);
    setList(next);
    setCurrent({ url, autoplay: true });
    setInput(url);
    setView('player');
    playSound('select');
    if (needsTitle(list.find((v) => v.videoId === vid))) {
      void fetchTitle(url).then((title) => { if (title) setList(next.map((v) => (v.videoId === vid ? { ...v, title } : v))); });
    }
  };

  return createPortal(
    <div className="video-window" role="dialog" aria-label="영상 재생">
      <div className="vw-header">
        <div className="vw-title">▶️ 영상 재생</div>
        <button className="vw-btn" title="영상 목록" aria-label="영상 목록" onClick={() => setView('list')}>
          <i className="ph-bold ph-list-bullets" /><span className="vw-badge">{list.length}</span>
        </button>
        <button className="vw-btn close" title="닫기" aria-label="닫기" onClick={onClose}>✕</button>
      </div>
      <div className="vw-body">
        {view === 'list' ? (
          <>
            <div className="vw-list-head">
              <button className="vw-btn" title="뒤로" aria-label="뒤로" onClick={() => setView('player')}>←</button>
              <span className="vw-list-count"><b>{list.length}</b>/{MAX_VIDEOS}</span>
              <button className="vw-clear-all" onClick={() => { if (confirm('영상 목록을 전체 삭제할까요?')) setList([]); }}>전체 삭제</button>
            </div>
            <div className="vw-list">
              {list.length ? list.map((v) => (
                <div key={v.videoId} className="vw-item" onClick={() => play(v.url)}>
                  <span className="vi-title">{v.title || v.url}</span>
                  <span className="vi-time">{fmtVideoTime(v.playedAt)}</span>
                  <button className="vi-del" title="삭제" aria-label="삭제"
                    onClick={(e) => { e.stopPropagation(); setList(list.filter((x) => x.videoId !== v.videoId)); }}>✕</button>
                </div>
              )) : <div className="vw-empty-list">아직 재생한 영상이 없어요 📭</div>}
            </div>
          </>
        ) : (
          <>
            <input className="vw-url" placeholder="유튜브 영상 링크를 붙여넣으면 자동으로 재생돼요" autoComplete="off" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); play(input.trim()); } }}
              onPaste={(e) => { const text = e.clipboardData.getData('text').trim(); if (extractVideoId(text)) { e.preventDefault(); play(text); } }}
              onBlur={() => { const v = input.trim(); if (v && v !== current.url && extractVideoId(v)) play(v); }} />
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

function VideoCard() {
  const cls = useCurrentClass();
  const [open, setOpen] = useState(false);
  const video = cls?.options.video?.url ? cls.options.video : DEFAULT_VIDEO;
  const id = extractVideoId(video.url);
  return (
    <>
      <CardFrame id="book" label="영상 재생" state="filled" style={{ flex: '0 0 90px', minHeight: 90, padding: 10 }}
        onOpen={() => { ensureAudio(); playSound('select'); setOpen(true); }}>
        <div className="book-shortcut">
          {id
            ? <div className="book-mini" style={{ backgroundImage: `url('https://img.youtube.com/vi/${id}/default.jpg')` }} />
            : <div className="book-mini"><i className="ph-fill ph-play-circle" /></div>}
          <div className="book-info">
            <div className="book-label"><i className="ph-fill ph-play-circle" /> 영상 재생</div>
            <div className="book-title-mini">{video.title || '영상 열기'}</div>
          </div>
          <div className="book-arrow"><i className="ph-fill ph-play" /></div>
        </div>
      </CardFrame>
      {open && <VideoWindow start={video.url} onClose={() => setOpen(false)} />}
    </>
  );
}

const manifest: FeatureManifest = { id: 'video', cards: [{ id: 'book', col: 3, order: 4, Component: VideoCard }] };
export default manifest;
