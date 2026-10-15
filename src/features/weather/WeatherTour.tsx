import { useTour, type TourStep } from '@/core/ui/Tour';

// 날씨 고르기 창을 처음 열었을 때 한 번 보여 주는 안내.
// 기온 → 날씨 → 미세먼지 → GPS, 마지막에는 정답 확인 화면을 예시로 잠깐 띄워 활동지를 짚어 준다.

export function WeatherTour({ showSample, backToPick }: { showSample: () => void; backToPick: () => void }) {
  const steps: TourStep[] = [
    { target: '.wxp-sec.temp', title: '기온', text: <>오늘 기온은 어때요? <b>하나</b> 골라요.</> },
    { target: '.wxp-sec .choice-grid', title: '날씨', text: <>창밖을 보고 오늘 날씨를 <b>하나</b> 골라요.</> },
    { target: '.wxp-sec.dust', title: '미세먼지', text: <>미세먼지도 골라 보세요. 모르면 비워 둬도 GPS로 확인할 때 함께 불러와요.</> },
    { target: '.auto-fetch-btn', title: 'GPS 정답 확인', text: <>‘GPS로 정답 확인하기’를 누르면 지금 이곳의 진짜 날씨와 맞춰 봐요. 위치를 물으면 ‘허용’을 눌러요.</>, onEnter: backToPick },
    { target: '.hdr-icon-btn[aria-label="날씨 활동지 만들기"]', title: '날씨 활동지 (선택)', text: <>정답을 확인하면 이 화면이 나와요. ‘날씨 활동지’로 오늘 날씨를 활동지로 만들 수 있어요. 필요할 때만 써요.</>, onEnter: showSample },
  ];
  useTour('weather', steps, () => true, backToPick);
  return null;
}
