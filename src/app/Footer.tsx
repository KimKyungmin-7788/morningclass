// 하단 진행률. 3단계에서 각 기능의 완료 여부와 연결한다.
export function Footer() {
  return (
    <footer>
      <div className="progress-wrap"><div className="progress-bar" style={{ width: '0%' }} /></div>
      <div className="status">아침 준비 0/7</div>
    </footer>
  );
}
