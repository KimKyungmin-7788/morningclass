// @ts-nocheck
// 학습지(A4) HTML 을 만드는 코드 — 기존 app.html 의 해당 부분을 그대로 옮긴 것.
// 인쇄물의 모양이 글자 하나까지 같아야 해서 손대지 않았다. 형식 검사를 받지 않으므로(ts-nocheck),
// 고칠 일이 생기면 그 부분부터 형식을 붙여 가며 고친다. 화면(창·버튼)은 Worksheets.tsx 가 맡는다.
//
// 쓰는 쪽에서 채워 주는 값(this): selectedDate, record({weather}), schoolLevel(), wsOpt(), wxFeel(), wxTheme()
import { FEEL, WEATHER, wxFeel, wxTheme } from '@/features/weather/model';

const TRAY_IMG = '/img/tray.webp';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const sheetBuilders = {
  wxFeel, wxTheme,
  // ── 📝 급식 학습지 (A4): 식판+따라쓰기 / 붙임자료 / 동그라미 / 크게 따라쓰기 — 인쇄·PDF ──
  WS_PARTS: [
    ['tray',  '🍽️ 식판 + 따라쓰기'],
    ['cut',   '✂️ 붙임자료 (오려 붙이기)'],
    ['trace', '✏️ 오늘의 메뉴 따라쓰기 (크게)']
  ],
  // ── 🥗 영양 학습지: 식품구성자전거(보건복지부·한국영양학회) + NEIS 급식 영양 정보 ──
  NUT_PARTS: [
    ['bike',   '🚲 식품구성자전거 붙이기'],
    ['even',   '🔍 오늘 메뉴 자세히 알아봐요'],
    ['signal', '🚦 오늘의 영양 신호등'],
    ['energy', '🥧 오늘 식판의 에너지'],
    ['ncut',   '✂️ 붙임 자료']
  ],
  // 식품구성자전거 뒷바퀴 6칸 — 칸 크기는 권장 섭취 비율을 단순화한 것(곡류·채소가 크고 기름·설탕이 가장 작음)
  NUT_GROUPS: [
    {k:'grain', name:'곡류',     sub:'밥·빵·국수',  emo:'🍚', frac:.28, fill:'#FDF0D5', ex:'밥, 잡곡밥, 빵, 국수, 떡, 감자, 고구마'},
    {k:'veg',   name:'채소',     sub:'나물·김치',   emo:'🥕', frac:.24, fill:'#E4F3D8', ex:'김치, 나물, 버섯, 무, 오이, 시금치, 미역'},
    {k:'meat',  name:'고기·생선', sub:'달걀·콩',     emo:'🐟', frac:.20, fill:'#FBE3DC', ex:'소·돼지·닭고기, 생선, 달걀, 두부, 콩, 만두'},
    {k:'fruit', name:'과일',     sub:'',           emo:'🍎', frac:.12, fill:'#FCE4EC', ex:'귤, 사과, 배, 포도, 바나나, 딸기, 수박'},
    {k:'milk',  name:'우유',     sub:'요구르트·치즈', emo:'🥛', frac:.11, fill:'#DDEBFA', ex:'우유, 요구르트, 치즈, 요플레'},
    {k:'fat',   name:'기름·설탕', sub:'',           emo:'🧈', frac:.05, fill:'#ECEAE4', ex:'식용유, 버터, 마요네즈, 설탕, 꿀'}
  ],
  // 학교급식 영양관리기준(학교급식법 시행규칙 별표 3, 2021.1.29 개정) 한 끼 기준 — 남녀 권장섭취량 평균(단백질은 기준량 평균)
  NUTRI_STD: {
    e1:{label:'초등 1~3학년', kcal:535, prot:11.7, vitC:16.7, ca:234},
    e2:{label:'초등 4~6학년', kcal:635, prot:15.9, vitC:23.4, ca:267},
    m: {label:'중학생',       kcal:755, prot:19.2, vitC:30.0, ca:317},
    h: {label:'고등학생',     kcal:785, prot:20.1, vitC:33.4, ca:284}
  },
  // src: 이 영양소가 많이 든 음식을 메뉴 이름으로 찾는 말 (NEIS는 메뉴별 영양 정보를 주지 않아 이름으로 추정)
  NUT_KEYS: [
    {k:'ca',   name:'칼슘',   emo:'🦴', desc:'뼈와 이를 튼튼하게 해요', color:'#3B82F6', unit:'mg',
      src:/우유|요구르트|요거트|요플레|치즈|멸치|두부|두유|뱅어|잔새우|뼈째/},
    {k:'prot', name:'단백질', emo:'💪', desc:'근육과 몸을 만들어요',   color:'#F97316', unit:'g',
      src:/고기|돼지|쇠고기|소고기|닭|오리|제육|불고기|갈비|햄|소시지|베이컨|너겟|까스|가스$|생선|고등어|삼치|꽁치|연어|참치|명태|동태|코다리|조기|갈치|가자미|임연수|오징어|낙지|주꾸미|쭈꾸미|새우|어묵|달걀|계란|메추리알|두부|콩|만두|미트|스테이크|장조림|탕수|치킨|너비아니|함박|떡갈비/},
    {k:'vitC', name:'비타민C', emo:'🍊', desc:'감기를 이겨내요',       color:'#22C55E', unit:'mg',
      src:/귤|오렌지|딸기|키위|레몬|자몽|파인애플|망고|토마토|파프리카|피망|브로콜리|양배추|감자|고구마|시금치|풋고추|김치|겉절이|깍두기|한라봉|천혜향|레드향|유자|사과|배$|수박|참외|멜론/}
  ],
  // 메뉴 이름 → 식품구성자전거 식품군 {main, also[]} (정답지용 자동 분류 — 선생님 확인 전제)
  //  · 우리말 음식 이름은 뒤쪽 재료가 중심("베이컨감자채볶음" → 감자)이라, 가장 뒤에 나온 재료의 무리를 정답으로
  //  · 볶음·튀김(기름), 야채·채소 같은 말은 '함께 인정'에만 씀
  FOOD_RULES: {
    grain: /밥|죽|누룽지|국수|냉면|우동|라면|짜장|짬뽕|스파게티|파스타|마카로니|빵|토스트|샌드위치|버거|피자|떡(?!갈비)|감자|고구마|옥수수|묵|시리얼|만두|수제비|또띠아|와플|핫케이크|팬케이크|머핀|베이글|찐빵|호떡|쌀|면|라이스|당면|잡채|김말이|파전|부침개|전병/g,
    meat:  /고기|돼지|쇠고기|소고기|한우|닭|치킨|오리|제육|불고기|갈비|햄(?!버거)|소시지|소세지|베이컨|너겟|돈가스|돈까스|돈육|등심|안심|목살|삼겹|생선|고등어|삼치|꽁치|연어|참치|명태|동태|코다리|황태|북어|조기|갈치|가자미|임연수|멸치(?!액젓|육수)|오징어|낙지|주꾸미|쭈꾸미|새우(?!젓)|게살|꽃게|조개|바지락|홍합|어묵|맛살|달걀|계란|메추리알|두부|유부|콩(?!나물)|청국장|만두|미트|스테이크|장조림|너비아니|함박|떡갈비|동그랑땡|완자|수육|편육|육개장|보쌈|해물/g,
    fruit: /과일샐러드|과일사라다|귤|오렌지|사과|배(?![가-힣])|포도|바나나|수박|딸기|키위|레몬|자몽|파인애플|망고|복숭아|자두|참외|멜론|체리|블루베리|방울토마토|과일|홍시|곶감|한라봉|천혜향|레드향|유자|석류|주스|쥬스|과일샐러드|과일사라다/g,
    milk:  /우유|요구르트|요거트|요플레|치즈|아이스크림|밀크|라떼/g,
    veg:   /김치|깍두기|총각|겉절이|나물|샐러드|버섯|미역|다시마|^김(?!치|밥|말이)|김구이|김가루|김자반|김무침|파래|톳|잡채|카레|비빔|파전|대파|쪽파|시금치|오이|배추|무채|무국|무생채|무조림|열무|단무지|무말랭이|브로콜리|당근|호박|가지|콩나물|숙주|고사리|도라지|파프리카|피망|양파|상추|쌈|깻잎|부추|연근|우엉|피클|장아찌|토마토|고추|청경채|쑥갓|미나리|냉이|달래|아욱|근대|얼갈이/g,
    fat:   /마요|버터|과자|케이크|쿠키|초코|사탕|젤리|음료|탄산|사이다|콜라|시럽|도넛|츄러스|꿀|잼|푸딩|크림/g
  },
  FOOD_WEAK: {fat:/볶음|튀김|까스|가스|전$|부침|강정|맛탕|탕수|볶이|프라이/, veg:/야채|채소/},
  foodGroupsOf(name) {
    const n = String(name).replace(/\s/g,''), order = ['grain','meat','fruit','milk','veg','fat'];
    const last = {};
    for (const g of order) for (const m of n.matchAll(this.FOOD_RULES[g])) last[g] = Math.max(last[g] ?? -1, m.index + m[0].length);
    const hit = order.filter(g=>last[g] != null);
    const main = hit.sort((a,b)=> last[b]-last[a] || order.indexOf(a)-order.indexOf(b))[0] || null;
    const also = order.filter(g=> g!==main && (last[g] != null || this.FOOD_WEAK[g]?.test(n)));
    return {main: main || (also.length ? also.shift() : null), also};
  },
  defaultNutriStd() { const lv = this.schoolLevel(); return lv==='high' ? 'h' : lv==='middle' ? 'm' : 'e2'; },
  // 따라쓰기용 이름: 괄호 안 설명(자율 등)·기호를 빼고 최대 10자
  wsTraceName(n) { return String(n).replace(/\(.*?\)|\[.*?\]|<.*?>/g,'').replace(/https?:\S+/g,'').replace(/[^\p{L}\p{N} ]/gu,'').trim().slice(0,10) || String(n).slice(0,10); },
  // 식판 칸 배정: 밥 → 큰 네모 칸, 국·찌개 → 둥근 칸, 나머지 → 반찬 칸
  wsKind(n) { return /밥|죽/.test(n) && !/밥버거|주먹밥/.test(n) ? 'rice' : /국|탕|찌개|스프|수프|전골/.test(n) && !/국수/.test(n) ? 'soup' : 'side'; },
  // 영양 학습지 쪽들 — 그림(SVG)은 PDF 저장(html2canvas)에서도 그대로 나오도록 도형으로 그림
  nutriPages(items, imgs, nsel, nd, H) {
    const {head, pic, E, cells} = H, pages = [];
    const std = this.NUTRI_STD[this.defaultNutriStd()];               // 학급의 학교급(초·중·고)에 맞는 기준
    const n = nd?.today;
    const noData = msg=>`<div class="nodata">📡 ${msg}<br><small>설정에서 학교를 등록하고, 급식을 불러온 날에 만들어 주세요</small></div>`;
    const T = Math.PI*2;
    const f1 = v=> (Math.round(v*10)/10).toString();

    // 1) 식품구성자전거 붙이기 — 작은 뒷바퀴(6칸) + 바깥쪽에 같은 색의 흐린 띠(붙이는 자리) + 물 앞바퀴
    if (nsel.bike) {
      const cx=100, cy=100, R=42, RO=96, pt=(a,r)=>[cx+r*Math.sin(a*T), cy-r*Math.cos(a*T)];
      const f2 = v=>v.toFixed(2);
      let a=0, band='', secs='', labels='';
      for (const g of this.NUT_GROUPS) {
        const a0=a, a1=a+g.frac, big = g.frac>.5?1:0; a=a1;
        const [x0,y0]=pt(a0,R), [x1,y1]=pt(a1,R), [o0x,o0y]=pt(a0,RO), [o1x,o1y]=pt(a1,RO);
        // 바깥 띠: 안쪽 바퀴와 같은 각도의 고리 조각을 흐리게 칠하고 점선 테두리 → "여기에 붙이면 돼요"
        band += `<path d="M${f2(o0x)},${f2(o0y)} A${RO},${RO} 0 ${big} 1 ${f2(o1x)},${f2(o1y)} L${f2(x1)},${f2(y1)} A${R},${R} 0 ${big} 0 ${f2(x0)},${f2(y0)} Z" fill="${g.fill}" fill-opacity=".55" stroke="#9aa3b0" stroke-width=".5" stroke-dasharray="2 1.6"/>`;
        secs += `<path d="M${cx},${cy} L${f2(x0)},${f2(y0)} A${R},${R} 0 ${big} 1 ${f2(x1)},${f2(y1)} Z" fill="${g.fill}" stroke="#374151" stroke-width=".7"/>`;
        const small = g.frac < .08, [lx,ly] = pt((a0+a1)/2, small ? R+7 : R*.62);
        labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-family="Noto Sans KR" fill="#111">
          <tspan x="${lx.toFixed(1)}" font-size="${small?3.6:5}" font-weight="900">${g.emo} ${E(g.name)}</tspan>
          ${g.sub && !small ? `<tspan x="${lx.toFixed(1)}" dy="5" font-size="3.4" font-weight="700" fill="#6b7280">${E(g.sub)}</tspan>` : ''}</text>`;
      }
      pages.push(`<section class="page">${head('🚲 식품구성자전거 붙이기', '붙임 자료의 음식을 오려서, 바퀴 바깥의 같은 색 흐린 칸에 붙여요.')}
        <svg class="bike" viewBox="0 0 250 200" xmlns="http://www.w3.org/2000/svg">
          <polyline points="${cx},${cy} 208,44 226,162" fill="none" stroke="#64748b" stroke-width="2.6" stroke-linejoin="round"/>
          <line x1="199" y1="41" x2="217" y2="37" stroke="#374151" stroke-width="3.2" stroke-linecap="round"/>
          ${band}${secs}<circle cx="${cx}" cy="${cy}" r="5" fill="#fff" stroke="#374151" stroke-width=".8"/>${labels}
          <circle cx="226" cy="162" r="21" fill="#DBEAFE" stroke="#374151" stroke-width=".9"/>
          <text x="226" y="161" text-anchor="middle" font-family="Noto Sans KR" font-size="6" font-weight="900" fill="#1e3a8a">💧 물</text>
          <text x="226" y="168" text-anchor="middle" font-family="Noto Sans KR" font-size="3.4" font-weight="700" fill="#1e40af">충분히 마셔요</text>
        </svg>
        <div class="foot">※ 칸이 클수록 자주, 많이 먹어요. 여러 칸에 들어가는 음식(예: 비빔밥)은 이유를 말하면 어느 칸이든 좋아요.
          식품구성자전거(보건복지부·한국영양학회)를 단순화한 그림이에요.</div>
        <div class="chk bfoot"><div class="chk-t">✅ 붙인 음식에 ✓ 해요</div>
          <div class="chk-g">${items.map(x=>`<span><i></i>${E(x)}</span>`).join('')}</div></div>
      </section>`);
    }
    // 2) 오늘 메뉴 자세히 알아봐요 — 위쪽 보기(6가지 식품군과 예시 음식)를 보고, 메뉴마다 어느 식품군인지 ○
    if (nsel.even) {
      const bogi = `<div class="bogi"><div class="bogi-t">📖 보기 — 식품구성자전거 6가지 식품군</div>
        <div class="bogi-g">${this.NUT_GROUPS.map(g=>`<div class="bg" style="background:${g.fill}"><b>${g.emo} ${E(g.name)}</b><span>${E(g.ex)}</span></div>`).join('')}</div></div>`;
      const row = (x,i)=>`<div class="mrow"><span class="mno">${i+1}</span><div class="mpic">${pic(x)}</div><div class="mname">${E(x)}</div>
        <div class="mgrp">${this.NUT_GROUPS.map(g=>`<span>${g.emo}<small>${E(g.name)}</small></span>`).join('')}</div></div>`;
      const per = Math.ceil(items.length / Math.ceil(items.length/9));   // 한 장에 9개까지, 넘치면 장마다 고르게
      for (let p=0; p<items.length; p+=per) {
        pages.push(`<section class="page">${head('🔍 오늘 메뉴 자세히 알아봐요', `보기를 보고, 메뉴마다 어느 식품군인지 ○ 해요. 여러 개여도 좋아요.${items.length>per?` (${p/per+1}/${Math.ceil(items.length/per)})`:''}`)}
          ${bogi}${items.slice(p, p+per).map((x,i)=>row(x, p+i)).join('')}
        </section>`);
      }
    }
    // 3) 오늘의 영양 신호등 — 기준(한 끼) 대비 구슬 5개(4개 = 기준만큼), 표정은 학생이 고름
    if (nsel.signal) {
      pages.push(`<section class="page">${head('🚦 오늘의 영양 신호등','오늘 점심에 들어 있는 만큼 구슬이 색칠돼 있어요. 알맞은 표정에 ○ 해요.')}
        ${!n ? noData('오늘 급식의 영양 정보를 불러오지 못했어요') : this.NUT_KEYS.map(k=>{
          const v = n[k.k], ratio = v != null ? v / std[k.k] : 0, on = Math.max(0, Math.min(5, Math.round(ratio*4)));
          const foods = items.filter(x=>k.src.test(x)).slice(0,3);   // 이 영양소가 많이 든 오늘 메뉴 (이름으로 추정)
          return `<div class="srow"><div class="shd"><span>${k.emo} ${k.name}</span><small>${v!=null?`${f1(v)}${k.unit} · 기준의 ${Math.round(ratio*100)}%`:'정보 없음'}</small></div>
            <div class="sdesc">${k.desc}</div>
            <div class="sbody"><div class="marbles">${Array.from({length:5},(_,i)=>`<span class="mb ${i<on?'on':''}" style="--c:${k.color}"></span>`).join('')}</div>
              <div class="faces"><div><span class="f">😊</span>넉넉해요</div><div><span class="f">🙂</span>조금 모자라요</div><div><span class="f">😟</span>부족해요</div></div></div>
            <div class="sfood"><span class="sft">이 음식에 많이 들어 있어요</span>${foods.length
              ? foods.map(x=>`<span class="sf">${pic(x)}<b>${E(x)}</b></span>`).join('')
              : '<span class="sfn">오늘 메뉴에서 찾아보세요</span>'}</div></div>`; }).join('')}
        ${n ? `<div class="src">오늘 점심 ${n.kcal?Math.round(n.kcal)+'kcal · ':''}구슬 4개 = 한 끼 기준만큼 (${E(std.label)}, 학교급식 영양관리기준 · 학교급식법 시행규칙 별표 3) · 음식은 메뉴 이름으로 고른 예시예요</div>` : ''}
      </section>`);
    }
    // 4) 오늘 식판의 에너지 — 탄수화물·단백질·지방을 에너지(1g당 4·4·9kcal)로 바꾼 원그래프
    if (nsel.energy) {
      let body = noData('오늘 급식의 영양 정보를 불러오지 못했어요');
      if (n && n.carb != null && n.prot != null && n.fat != null) {
        // 영양소마다 오늘 메뉴 중 해당 식품군이 든 음식을 함께 보여줌 (식품군 자동 분류 사용)
        const grp = items.map(x=>{ const r=this.foodGroupsOf(x); return {x, all:[r.main, ...r.also]}; });
        const menusOf = ks => grp.filter(g=>g.all.some(k=>ks.includes(k))).map(g=>g.x);
        const parts = [
          {name:'탄수화물', kcal:n.carb*4, color:'#F59E0B', desc:'힘을 내요',             menus:menusOf(['grain'])},
          {name:'단백질',   kcal:n.prot*4, color:'#F97316', desc:'몸을 만들어요',         menus:menusOf(['meat','milk'])},
          {name:'지방',     kcal:n.fat*9,  color:'#A8A29E', desc:'힘을 내요, 조금만',     menus:menusOf(['fat'])}];
        const tot = parts.reduce((s,p)=>s+p.kcal,0) || 1;
        let a=0; const c=55, r=50, pt=(t,rr)=>[c+rr*Math.sin(t*T), c-rr*Math.cos(t*T)];
        // 조각마다 영양소 이름을 점선체로 따라 쓰는 칸을 얹음 (작은 조각은 원 바깥에)
        let labs = '';
        const sl = parts.map(p=>{ const fr=p.kcal/tot, a0=a, a1=a+fr; a=a1; p.pct=Math.round(fr*100);
          const [x0,y0]=pt(a0,r), [x1,y1]=pt(a1,r), [lx,ly]=pt((a0+a1)/2, fr<.1 ? r*1.3 : r*.6);
          labs += `<div class="plab" style="left:${(lx/110*100).toFixed(1)}%;top:${(ly/110*100).toFixed(1)}%">${cells(p.name, p.name.length, 11.7, 'dot')}<b>${p.pct}%</b></div>`;
          return `<path d="M${c},${c} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${fr>.5?1:0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" fill="${p.color}" stroke="#fff" stroke-width="1"/>`; }).join('');
        body = `<div class="piebox"><svg class="pie" viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg">${sl}</svg>${labs}</div>
          <div class="leg">${parts.map(p=>`<div><i style="background:${p.color}"></i><span class="lgn">${p.name} ${p.pct}%</span><span class="lgd"><small>${p.desc}</small>
            <em>🍽️ ${p.menus.length ? p.menus.slice(0,4).map(E).join(' · ') + (p.menus.length>4?' 등':'') : (p.name==='지방' ? '볶음·튀김에 쓰는 기름' : '오늘 메뉴에서 찾아보세요')}</em></span></div>`).join('')}</div>
          <div class="q2">✏️ 가장 큰 에너지에 ○ 해요</div>
          <div class="choices">${parts.map(p=>`<div class="ch"><span class="chc" style="background:${p.color}"></span><b>${p.name}</b><span class="cho"></span></div>`).join('')}</div>
          <div class="src">탄수화물 ${f1(n.carb)}g · 단백질 ${f1(n.prot)}g · 지방 ${f1(n.fat)}g을 에너지로 바꿔 계산 (1g당 4·4·9kcal)${n.kcal?` · 오늘 점심 ${Math.round(n.kcal)}kcal`:''}</div>`;
      }
      pages.push(`<section class="page">${head('🥧 오늘 식판의 에너지','원그래프의 점선 글자를 따라 쓰고, 가장 큰 에너지에 ○ 해요.')}${body}</section>`);
    }
    // 5) 붙임 자료 — 오늘 메뉴 그림 카드 (자전거 칸에 붙이기 좋은 같은 크기)
    if (nsel.ncut) {
      // 아래쪽에 오늘 급식 기준 정답지(선생님용) — 한 쪽 안에 들어가게 메뉴가 많으면 두 줄로
      const G = Object.fromEntries(this.NUT_GROUPS.map(g=>[g.k, g]));
      const gname = k=> G[k] ? `${G[k].emo} ${E(G[k].name)}` : '';
      const key = items.map((x,i)=>{ const r = this.foodGroupsOf(x);
        return `<div class="ak"><span class="akn">${i+1}</span><b class="akx">${E(x)}</b><span class="akm">${r.main ? gname(r.main) : '직접 확인'}</span>${r.also.length ? `<span class="aka">+ ${r.also.map(gname).join(', ')}</span>` : ''}</div>`; }).join('');
      pages.push(`<section class="page">${head('✂️ 붙임 자료','점선을 따라 오려서 식품구성자전거의 알맞은 칸에 붙여요.')}
        <div class="cuts">${items.map(x=>`<div class="cut ncut">${pic(x)}<span class="cname">${E(x)}</span></div>`).join('')}</div>
      </section>`);
      // 선생님용 정답지 (따로 한 장) — 식품군 정답 + 가장 큰 에너지
      let energyAns = '';
      if (n && n.carb != null && n.prot != null && n.fat != null) {
        const en = [['탄수화물', n.carb*4], ['단백질', n.prot*4], ['지방', n.fat*9]], tot = en.reduce((s,e)=>s+e[1],0) || 1;
        const top = en.slice().sort((x,y)=>y[1]-x[1])[0];
        energyAns = `<div class="akey-sec">🥧 오늘 식판의 에너지 — 가장 큰 에너지: <b>${top[0]}</b> <small>(${en.map(e=>`${e[0]} ${Math.round(e[1]/tot*100)}%`).join(' · ')})</small></div>`;
      }
      pages.push(`<section class="page teacher">${head('🔑 정답지 (선생님용)','오늘 급식 기준 · 메뉴 이름으로 자동 분류한 예시예요. 수업 전에 한 번 확인해 주세요.')}
        <div class="akey-sec">🚲 식품구성자전거 · 🔍 오늘 메뉴 자세히 알아봐요 — 메뉴별 식품군 <small><b>+</b>는 함께 인정할 답</small></div>
        <div class="akey-g">${key}</div>
        ${energyAns}
      </section>`);
    }
    return pages;
  },
  buildWorksheetHTML(items, imgs, sel, mode, ndata) {
    const d = this.selectedDate, dn = ['일','월','화','수','목','금','토'][d.getDay()];
    const dateStr = `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${dn}요일`;
    const E = s=>esc(s);
    const pic = (n)=> imgs[n] ? `<img src="${E(imgs[n])}" alt="">` : `<div class="noimg">그림</div>`;
    const head = (title, sub)=>`<div class="hd"><div><h1>${title}</h1><div class="sub">${dateStr} · ${sub}</div></div><div class="nm">이름 <span></span></div></div>`;
    const cells = (text, len, size, mode)=>`<div class="cells" style="--c:${size.toFixed(1)}mm">${Array.from({length:len},(_,i)=>{
      const ch = mode==='blank' ? '' : (text[i]||''); return `<span class="cell ${mode}">${ch===' '?'':E(ch)}</span>`; }).join('')}</div>`;
    const pages = [];
    const S = this.wsOpt().size, dotMode = this.wsOpt().dot ? 'dot' : 'blank';   // 쓰기 칸 크기(mm) · 흐린 글씨를 끄면 그 줄은 빈칸
    if (mode === 'nutri') pages.push(...this.nutriPages(items, imgs, sel, ndata, {head, pic, E, cells}));
    else {

    // 1) 식판 + 따라쓰기: A4 위쪽 절반에 식판, 아래에 메뉴마다 검정 글자 → 점선 글자 → 빈칸.
    //    칸은 고른 크기로 유지하고, 1쪽에 다 안 들어가면 다음 쪽으로 이어서 씀
    if (sel.tray) {
      const tn = items.map(n=>this.wsTraceName(n));
      const size = Math.min(S, 167/Math.max(...tn.map(t=>t.length), 1));   // 가장 긴 이름도 한 줄(176mm)에 들어가게
      const blkH = 3*size + 7;                                       // 세 줄 + 줄 간격 + 블록 간격
      // 짧은 이름은 한 줄에 2개(반 칸 86mm), 긴 이름은 한 줄 전체 — 순서대로 줄을 채워 쪽을 나눔
      const wide = tn.map(t=>t.length*size + 9 > 86);
      const rows = [];
      tn.forEach((t,i)=>{ const last=rows[rows.length-1];
        if (!wide[i] && last && last.length===1 && !wide[last[0]]) last.push(i); else rows.push([i]); });
      const firstRows = Math.max(1, Math.floor(116/blkH)), moreRows = Math.max(1, Math.floor(238/blkH));
      const blk = i=>`<div class="tblk" style="height:${blkH.toFixed(1)}mm${wide[i]?';grid-column:span 2':''}"><span class="tno">${i+1}</span>
          <div class="trows">${cells(tn[i],tn[i].length,size,'bold')}${cells(tn[i],tn[i].length,size,dotMode)}${cells('',tn[i].length,size,'blank')}</div></div>`;
      const grid = rs=>`<div class="tgrid" style="grid-template-columns:1fr 1fr">${rs.map(r=>r.map(blk).join('') + (r.length===1&&!wide[r[0]]?'<div></div>':'')).join('')}</div>`;
      pages.push(`<section class="page">${head('오늘의 급식 식판','메뉴 그림을 식판에 붙이고, 메뉴 이름을 따라 써요.')}
        <div class="tray"><img src="${TRAY_IMG}" alt="식판"></div>
        <h2>✏️ 오늘의 메뉴 따라쓰기</h2>
        ${grid(rows.slice(0, firstRows))}
      </section>`);
      for (let r=firstRows; r<rows.length; r+=moreRows) {
        pages.push(`<section class="page">${head('✏️ 오늘의 메뉴 따라쓰기 (이어서)', dotMode==='dot' ? '글자를 보고 점선을 따라 쓴 뒤, 빈칸에 메뉴 이름을 써 보세요.' : '글자를 보고 빈칸에 메뉴 이름을 써 보세요.')}
          ${grid(rows.slice(r, r+moreRows))}
        </section>`);
      }
    }
    // 2) 붙임자료: 1쪽 식판(실제 인쇄 크기 기준) 칸에 들어가게 — 밥·국은 같은 크기, 반찬은 작은 칸에 맞춤
    if (sel.cut) {
      pages.push(`<section class="page">${head('✂️ 붙임자료','점선을 따라 오려서 식판의 알맞은 칸에 붙여요.')}
        <div class="cuts">${items.map(n=>`<div class="cut ${this.wsKind(n)}">${pic(n)}<span class="cname">${E(n)}</span></div>`).join('')}</div>
        <div class="foot">※ 밥은 큰 네모 칸, 국은 둥근 칸, 반찬은 작은 칸에 붙여요. 인쇄할 때 배율을 <b>100%(실제 크기)</b>로 해야 식판 칸에 꼭 맞아요.</div>
      </section>`);
    }
    // 3) 크게 따라쓰기: 검정 글자 → 점선 글자 → 빈칸
    if (sel.trace && S > 13) {
      // 큰 칸: 줄여 넣지 않고, 한 줄에 안 들어가는 이름은 두 줄로 나눠 씀 → 블록 높이를 재서 쪽을 나눔
      const perLine = Math.floor(124/S);                              // 그림 옆 쓰기 줄 너비 약 124mm
      const split = t=>{
        if (t.length <= perLine) return [t];
        const mid = t.length/2;
        const sp = [...t].map((ch,i)=>ch===' '?i:-1).filter(i=>i>0 && i<=perLine && t.length-i-1<=perLine).sort((a,b)=>Math.abs(a-mid)-Math.abs(b-mid))[0];
        if (sp != null) return [t.slice(0,sp), t.slice(sp+1)];
        const h = Math.ceil(mid); return [t.slice(0,h).trim(), t.slice(h).trim()];
      };
      const blocks = items.map((n,i)=>{ const parts = split(this.wsTraceName(n)), lines = parts.length*3;
        return {n, i, parts, h: Math.max(lines*S + (lines-1)*2.5, 48) + 8.7}; });
      const pgs = [[]]; let used = 0;
      blocks.forEach(b=>{ if (pgs[pgs.length-1].length && used + b.h > 246) { pgs.push([]); used = 0; } pgs[pgs.length-1].push(b); used += b.h + 5; });
      pgs.forEach((chunk, pi)=>{
        pages.push(`<section class="page">${head('✏️ 오늘의 메뉴 따라쓰기', `${dotMode==='dot'?'글자를 보고 점선을 따라 쓴 뒤, 빈칸에 메뉴 이름을 써 보세요.':'글자를 보고 빈칸에 메뉴 이름을 써 보세요.'}${pgs.length>1?` (${pi+1}/${pgs.length})`:''}`)}
          ${chunk.map(b=>`<div class="blk"><div class="bimg"><span class="bno">${b.i+1}</span>${pic(b.n)}<div class="bname">${E(b.n)}</div></div>
              <div class="brows">${['bold',dotMode,'blank'].map(m=>b.parts.map(pt=>cells(pt,pt.length,S,m)).join('')).join('')}</div></div>`).join('')}
        </section>`);
      });
    } else if (sel.trace) {
      const per = items.length<=4 ? 4 : 5, total = Math.ceil(items.length/per), cmp = per===5;   // 5개 이상이면 한 쪽에 5개(조금 작게)
      for (let p=0; p<items.length; p+=per) {
        const chunk = items.slice(p, p+per);
        pages.push(`<section class="page">${head('✏️ 오늘의 메뉴 따라쓰기', `${dotMode==='dot' ? '글자를 보고 점선을 따라 쓴 뒤, 빈칸에 메뉴 이름을 써 보세요.' : '글자를 보고 빈칸에 메뉴 이름을 써 보세요.'}${total>1?` (${p/per+1}/${total})`:''}`)}
          ${chunk.map((n,i)=>{ const t=this.wsTraceName(n); const size=Math.max(8, Math.min(cmp?11:13, 128/Math.max(t.length,1)));
            return `<div class="blk${cmp?' c':''}"><div class="bimg"><span class="bno">${p+i+1}</span>${pic(n)}<div class="bname">${E(n)}</div></div>
              <div class="brows">${cells(t,t.length,size,'bold')}${cells(t,t.length,size,dotMode)}${cells('',t.length,size,'blank')}</div></div>`; }).join('')}
        </section>`);
      }
    }
    }   // 기본 학습지 끝
    if (!pages.length) pages.push(`<section class="page"><div class="empty">위에서 만들 학습지를 하나 이상 골라 주세요</div></section>`);
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700;900&family=Noto+Serif+KR:wght@700&display=swap" rel="stylesheet">
<style>
/* 엘점선체: 저장소의 파일명이 자모 분리(NFD)형이라 인코딩된 주소를 써야 받아짐 */
@font-face{font-family:'LDotted';src:url('https://cdn.jsdelivr.net/gh/Project-Noonnu/2608211548@font-209/font-209/%E1%84%8B%E1%85%A6%E1%86%AF%E1%84%8C%E1%85%A5%E1%86%B7%E1%84%89%E1%85%A5%E1%86%AB%E1%84%8E%E1%85%A6.woff2') format('woff2');font-weight:400;font-display:block}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans KR',sans-serif;background:#d9dee7;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;background:#fff;margin:6mm auto;padding:12mm 14mm;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.15)}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;break-after:page}.page:last-child{break-after:auto}}
.hd{display:flex;align-items:flex-end;justify-content:space-between;gap:6mm;border-bottom:.7mm solid #111;padding-bottom:2.5mm;margin-bottom:5mm}
.hd h1{font-size:20pt;font-weight:900;line-height:1.2}
.hd .sub{font-size:9.5pt;color:#555;margin-top:1mm;font-weight:500}
.hd .nm{font-size:12pt;font-weight:700;white-space:nowrap}
.hd .nm span{display:inline-block;width:32mm;border-bottom:.3mm solid #111;margin-left:2mm}
h2{font-size:13pt;font-weight:900;margin:3mm 0 3mm}
.tray{height:118mm;display:flex;align-items:center;justify-content:center;flex:none}
.tray img{width:156mm;height:auto}
.tgrid{display:grid;column-gap:6mm}
.tblk{display:flex;gap:2.5mm;align-items:flex-start}
.tblk .tno{margin-top:1mm}
.trows{display:flex;flex-direction:column;gap:1mm}
.tno{width:6mm;height:6mm;border-radius:50%;background:#333;color:#fff;font-size:8pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.cells{display:flex;flex:none}
.cell{width:var(--c);height:var(--c);border:.25mm solid #555;margin-left:-.25mm;position:relative;display:flex;align-items:center;justify-content:center;font-family:'Noto Serif KR',serif;font-weight:700;font-size:calc(var(--c) * .72);line-height:1}
.cell::before{content:'';position:absolute;left:50%;top:0;bottom:0;border-left:.2mm dashed #c9ced6}
.cell::after{content:'';position:absolute;top:50%;left:0;right:0;border-top:.2mm dashed #c9ced6}
.cell.bold{color:#111}
.cell.dot{font-family:'LDotted',sans-serif;font-weight:400;color:#000;font-size:calc(var(--c) * .82)}
.cuts{display:flex;flex-wrap:wrap;gap:7mm 6mm;align-content:flex-start;flex:1;padding-top:2mm}
.cut{border:.4mm dashed #444;padding:1.5mm;display:flex;flex-direction:column;align-items:center;gap:1mm;position:relative}
.cut::before{content:'✂';position:absolute;top:-3.4mm;left:2mm;font-size:9pt;background:#fff;line-height:1;padding:0 .5mm}
.cut img,.cut .noimg{flex:1;width:100%;min-height:0;object-fit:cover}
.cut.side{width:23mm;height:30mm}
.cut.rice{width:46mm;height:46mm;border-radius:4mm}
.cut.soup{width:46mm;height:46mm;border-radius:50%;padding:3.5mm 3.5mm 2mm}
.cut.soup img,.cut.soup .noimg{border-radius:50%;aspect-ratio:1;flex:none;width:33mm}
.cut.soup::before{left:50%;top:-2.6mm}
.cname{font-size:8pt;font-weight:700;text-align:center;line-height:1.1;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:none}
.noimg{background:#f3f4f6;color:#9ca3af;display:flex;align-items:center;justify-content:center;font-size:9pt;font-weight:700;border:.3mm dashed #cbd5e1}
.foot{font-size:9.5pt;color:#555;margin-top:4mm}
.blk{display:flex;gap:5mm;border:.35mm solid #9aa3b0;border-radius:3mm;padding:4mm;margin-bottom:5mm;align-items:center}
.bimg{width:38mm;flex:none;display:flex;flex-direction:column;align-items:center;gap:1.5mm;position:relative}
.bimg img,.bimg .noimg{width:38mm;height:38mm;object-fit:cover;border-radius:2.5mm}
.bno{position:absolute;top:-2mm;left:-2mm;width:6.5mm;height:6.5mm;border-radius:50%;background:#374151;color:#fff;font-size:9pt;font-weight:700;display:flex;align-items:center;justify-content:center;z-index:1}
.bname{font-size:9.5pt;font-weight:700;text-align:center;line-height:1.2;word-break:keep-all}
.brows{display:flex;flex-direction:column;gap:2.5mm;border-left:.3mm solid #e5e7eb;padding-left:5mm}
.blk.c{padding:3mm 4mm;margin-bottom:3.5mm}
.blk.c .bimg{width:31mm}
.blk.c .bimg img,.blk.c .bimg .noimg{width:31mm;height:31mm}
.blk.c .brows{gap:2mm}
.empty{margin:auto;font-size:14pt;color:#888;font-weight:700}
/* ── 영양 학습지 ── */
.bike{width:100%;height:auto;display:block;margin:0 0 2mm}
.bogi{border:.5mm solid #374151;border-radius:3mm;padding:3mm 4mm;margin-bottom:4mm;flex:none}
.bogi-t{font-size:12pt;font-weight:900;margin-bottom:2mm}
.bogi-g{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm}
.bg{border-radius:2mm;padding:2mm 3mm;display:flex;flex-direction:column;gap:.5mm}
.bg b{font-size:11.5pt;font-weight:900}
.bg span{font-size:8.5pt;color:#374151;font-weight:500;line-height:1.35}
.mrow{display:flex;align-items:center;gap:3mm;border:.35mm solid #9aa3b0;border-radius:3mm;padding:1.8mm 3mm;margin-bottom:2.2mm;flex:none}
.mno{width:6.5mm;height:6.5mm;border-radius:50%;background:#374151;color:#fff;font-size:9pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.mpic{width:22mm;height:17mm;flex:none;border-radius:2mm;overflow:hidden}
.mpic img,.mpic .noimg{width:100%;height:100%;object-fit:cover}
.mname{width:34mm;flex:none;font-size:11.5pt;font-weight:900;line-height:1.25;word-break:keep-all}
.mgrp{display:flex;gap:1.6mm;margin-left:auto}
.mgrp span{width:15mm;height:15mm;border:.4mm solid #9aa3b0;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12pt;line-height:1.1}
.mgrp small{font-size:5.6pt;font-weight:700;color:#374151;white-space:nowrap}
.sfood{display:flex;align-items:center;gap:2.5mm;margin-top:3mm;padding-top:2.5mm;border-top:.3mm dashed #cbd5e1;flex-wrap:nowrap;overflow:hidden}
.sft{font-size:9pt;font-weight:700;color:#4b5563;flex:none;width:17mm;line-height:1.25}
.sf{display:flex;align-items:center;gap:1.8mm;border:.3mm solid #d1d5db;border-radius:2mm;padding:1mm 2mm 1mm 1mm;min-width:0}
.sf b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sf img,.sf .noimg{width:14mm;height:11mm;object-fit:cover;border-radius:1.5mm;font-size:6pt}
.sf b{font-size:10.5pt;font-weight:900}
.sfn{font-size:10pt;color:#9ca3af;font-weight:700}
.piebox{position:relative;width:118mm;margin:4mm auto 6mm}
.piebox .pie{width:100%;margin:0}
.plab{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:1mm;background:#fff;border-radius:2mm;padding:1.5mm;box-shadow:0 0 0 .3mm #9aa3b0}
.plab b{font-size:10pt;font-weight:900;color:#374151}
.srow{border:.35mm solid #9aa3b0;border-radius:3mm;padding:4mm 5mm;margin-bottom:4mm}
.shd{display:flex;justify-content:space-between;align-items:baseline;font-size:17pt;font-weight:900}
.shd small{font-size:10pt;color:#6b7280;font-weight:500}
.sdesc{font-size:11.5pt;color:#4b5563;margin:1mm 0 3mm;font-weight:500}
.sbody{display:flex;align-items:center;gap:6mm}
.marbles{display:flex;gap:2.5mm}
.mb{width:12mm;height:12mm;border-radius:50%;border:.6mm solid var(--c)}
.mb.on{background:var(--c)}
.faces{margin-left:auto;display:flex;gap:4mm;text-align:center;font-size:8.5pt;color:#374151;font-weight:700}
.faces div{display:flex;flex-direction:column;align-items:center;gap:1.2mm}
.faces .f{font-size:19pt;width:15mm;height:15mm;border:.35mm dashed #9ca3af;border-radius:50%;display:flex;align-items:center;justify-content:center}
.pie{width:105mm;display:block;margin:4mm auto 6mm}
.leg{display:flex;flex-direction:column;gap:3.5mm;margin:0 auto 7mm;width:fit-content}
.leg div{display:flex;align-items:flex-start;gap:3mm;font-size:14pt;font-weight:900}
.leg i{width:7mm;height:7mm;border-radius:1.5mm;display:inline-block;flex:none;margin-top:.8mm}
.leg .lgn{width:36mm;flex:none}
.leg .lgd{display:flex;flex-direction:column;gap:.8mm}
.leg small{font-weight:500;color:#4b5563;font-size:11pt}
.leg em{font-style:normal;font-weight:700;color:#111;font-size:11pt;line-height:1.35;max-width:115mm}
.q2{text-align:center;font-size:14pt;font-weight:900;margin-bottom:4mm}
.choices{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
.ch{border:.5mm solid #374151;border-radius:4mm;padding:4mm 3mm;display:flex;flex-direction:column;align-items:center;gap:3mm}
.chc{width:100%;height:7mm;border-radius:2mm}
.ch b{font-size:17pt;font-weight:900}
.cho{width:20mm;height:20mm;border:.5mm dashed #9aa3b0;border-radius:50%}
.src{font-size:8.5pt;color:#6b7280;margin-top:auto;padding-top:3mm;line-height:1.5}
.cut.ncut{width:30mm;height:36mm}
.akey-sec{font-size:13pt;font-weight:900;margin:3mm 0 3mm;display:flex;align-items:baseline;gap:3mm;flex-wrap:wrap}
.akey-sec small{font-size:9.5pt;color:#6b7280;font-weight:500}
.akey-g{display:grid;grid-template-columns:1fr;gap:1.5mm;margin-bottom:6mm}
.ak{display:flex;align-items:center;gap:3mm;font-size:12pt;border-bottom:.25mm solid #e5e7eb;padding:1.8mm 0}
.akn{width:6mm;height:6mm;border-radius:50%;background:#374151;color:#fff;font-size:8.5pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.akx{font-weight:900;width:58mm;flex:none}
.akm{font-weight:900;color:#111}
.aka{color:#6b7280;font-weight:500;font-size:10.5pt}
.teacher .hd{border-bottom-color:#b45309}
.bfoot{margin-top:auto}
.chk{border:.35mm solid #9aa3b0;border-radius:3mm;padding:4mm 5mm}
.chk-t{font-size:13pt;font-weight:900;margin-bottom:3mm}
.chk-g{display:grid;grid-template-columns:repeat(2,1fr);gap:3mm 6mm}
.chk-g span{display:flex;align-items:center;gap:2.5mm;font-size:12.5pt;font-weight:700}
.chk-g i{width:6.5mm;height:6.5mm;border:.45mm solid #333;border-radius:1mm;flex:none}
.nodata{margin:auto;text-align:center;font-size:14pt;color:#6b7280;font-weight:700;line-height:1.7}
.nodata small{font-size:10pt;font-weight:500}
</style></head><body>${pages.join('')}</body></html>`;
  },
  WSW_PARTS: [
    ['weather', '🌤️ 날씨 알아보기'], ['temp', '🌡️ 기온 알아보기'], ['clothes', '👕 알맞은 옷 고르기'],
    ['predict', '🔮 내 예상과 정답'], ['key', '✅ 정답지 (교사용)']
  ],
  // 옷·물건 보기: fit(기온, 날씨종류) → 오늘 날씨에 알맞으면 true
  WSW_CLOTHES: [
    {e:'🧤', n:'장갑',    fit:(t,k)=> t<=8 || k==='snow'},
    {e:'🧣', n:'목도리',  fit:(t,k)=> t<=8 || k==='snow'},
    {e:'🧥', n:'겉옷',    fit:(t)=> t<=16},
    {e:'👔', n:'긴팔 옷', fit:(t)=> t>=9 && t<=24},   // 👚는 반팔로 보여서 소매 긴 셔츠(👔)로
    {e:'👕', n:'반팔 옷', fit:(t)=> t>=25},
    {e:'🩳', n:'반바지',  fit:(t)=> t>=28},
    {e:'☂️', n:'우산',    fit:(t,k)=> k==='rain' || k==='storm'},
    {e:'🥾', n:'장화',    fit:(t,k)=> k==='rain'},
    {e:'🧢', n:'모자',    fit:(t,k)=> (k==='sunny' || k==='partly') && t>=20}
  ],
  // 오늘 날씨 정답 (GPS로 확인한 값). 기온 숫자가 없으면 체감 단계의 대표 온도로 옷 정답을 구함
  wswAnswer() {
    const w = this.record.weather; if (!w) return null;
    const f = this.wxFeel(w), rep = {cold:5, cool:13, good:20, warm:26, hot:30};
    return {w, t:this.wxTheme(w), f, hasNum:w.temp!=null, temp: w.temp!=null ? w.temp : (f ? rep[f.k] : null)};
  },
  // 온도계 그림 (-10~40°C). 관 안쪽에 눈금선을 넣어 색칠하면서 읽을 수 있게 함. temp를 주면 그 높이까지 빨갛게 (정답지용)
  wswThermo(temp) {
    const y = v=> 150 - (v+10)*2.7;
    let ticks = '';
    for (let v=-10; v<=40; v+=5) {
      const long = v%10===0, yy = y(v).toFixed(1);
      ticks += `<line x1="25" x2="${long?45:36}" y1="${yy}" y2="${yy}" stroke="#555" stroke-width="${long?1.1:.8}"/>`
             + (long ? `<text x="50" y="${(+yy+3).toFixed(1)}" font-size="10" font-weight="700" fill="#111">${v}</text>` : '');
    }
    const on = temp!=null, tt = on ? Math.max(-10, Math.min(40, temp)) : 0;
    return `<svg viewBox="0 0 80 180" xmlns="http://www.w3.org/2000/svg">
      <rect x="24" y="10" width="22" height="150" rx="11" fill="#fff" stroke="#111" stroke-width="1.5"/>
      <circle cx="35" cy="163" r="15" fill="${on?'#ef4444':'#fff'}" stroke="#111" stroke-width="1.5"/>
      ${on ? `<rect x="30" y="${y(tt).toFixed(1)}" width="10" height="${(162-y(tt)).toFixed(1)}" fill="#ef4444"/>` : ''}
      ${ticks}<text x="52" y="10" font-size="9" font-weight="700" fill="#111">°C</text></svg>`;
  },
  buildWeatherSheetHTML(o) {
    const d = this.selectedDate, dn = ['일','월','화','수','목','금','토'];
    const dateStr = `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${dn[d.getDay()]}요일`;
    const E = s=>esc(s), a = this.wswAnswer(), lvl = o.lvl;
    const lvlName = {easy:'따라쓰기', mid:'스스로 쓰기'}[lvl] || '';
    const NO = ['①','②','③','④'];
    const eyo = s=>{ const c = s.charCodeAt(s.length-1) - 0xAC00; return (c>=0 && c%28!==0) ? '이에요' : '예요'; };
    const head = (title, sub)=>`<div class="hd"><div><h1>${title}</h1><div class="sub">${dateStr}${sub?` · ${sub}`:''}</div></div><div class="nm">이름 <span></span></div></div>`;
    // 글쓰기 칸: 따라쓰기=점선 글자 위에 덧쓰기, 스스로 쓰기=글자 수만큼 빈칸 (정답을 모르면 ph칸)
    const cells = (text, ph, size)=>{
      const t = [...(text||'')], known = t.length>0, n = known ? t.length : (ph||6), dot = known && lvl==='easy';
      return `<span class="cells"${size?` style="--c:${size}mm"`:''}>${Array.from({length:n},(_,i)=>`<span class="cell${dot?' dot':''}">${dot ? E(t[i]===' '?'':t[i]) : ''}</span>`).join('')}</span>`;
    };
    const blocks = [];
    const add = (k, h, fn)=>{ if (o.sec[k]) blocks.push({h, fn}); };

    add('weather', 102, no=>`<h2>${no} 오늘의 날씨는 어때요? 알맞은 그림에 ○ 해요</h2>
      <div class="wgrid">${WEATHER.map(w=>`<div class="wc"><div class="we">${w.emoji}</div><div class="wl">${E(w.label)}</div></div>`).join('')}</div>
      <div class="wline">오늘 날씨는 ${cells(a?.w.label,4,18)} <span>${a ? eyo(a.w.label) : '이에요'}.</span></div>`);

    // 한 문제 안의 활동을 가·나·다·라 상자로 나눠 구분
    add('temp', 120, no=>`<h2>${no} 오늘의 기온 알아보기</h2>
      <div class="trow">
        <div class="step thermo"><div class="st"><span class="sb">가</span>온도계 색칠</div>${this.wswThermo(null)}<div class="tip">오늘 기온까지 빨갛게</div></div>
        <div class="tright">
          <div class="step"><div class="st"><span class="sb">나</span>오늘 기온을 써요</div>
            <div class="tl1">오늘 기온은 ${cells(a?.hasNum ? String(Math.round(a.temp)) : '',2)}<span>°C 예요.</span></div></div>
          <div class="step"><div class="st"><span class="sb">다</span>알맞은 말에 ○ 해요</div>
            <div class="faces">${FEEL.map(f=>`<div class="fc"><div class="fe">${f.emoji}</div><div class="fl">${E(f.label)}</div><div class="fr">${f.rng}</div></div>`).join('')}</div></div>
          <div class="step"><div class="st"><span class="sb">라</span>기온 표현을 써요</div>
            <div class="tl1">오늘은 ${cells(a?.f?.label,6)}</div></div>
        </div></div>`);

    add('clothes', 82, no=>`<h2>${no} 오늘 날씨에 알맞은 옷과 물건에 ○ 해요</h2>
      <div class="cgrid">${this.WSW_CLOTHES.map(c=>`<div class="cc"><span class="ce">${c.e}</span><span class="cn">${E(c.n)}</span></div>`).join('')}</div>`);

    add('predict', 62, no=>`<h2>${no} 내 예상과 GPS 정답을 비교해요 <small>같으면 ○, 다르면 ✕ 를 골라요</small></h2>
      <div class="pt">
        <div class="h"></div><div class="h">내 예상</div><div class="h">정답</div><div class="h">같아요?</div>
        <div class="h r">🌤️ 날씨</div><div class="r"></div><div class="r"></div><div class="r ox"><span>○</span><span>✕</span></div>
        <div class="h r">🌡️ 기온</div><div class="r"></div><div class="r"></div><div class="r ox"><span>○</span><span>✕</span></div>
      </div>`);

    // 쪽 나누기: 한 쪽에 들어가는 만큼 차례로 담음 (머리글 뺀 본문 높이 약 245mm)
    const pages = []; let cur = [], left = 245, n = 0;
    const flush = ()=>{ if (cur.length) { pages.push(`<section class="page">${head('🌤️ 날씨 활동지', lvlName)}${cur.join('')}</section>`); cur = []; left = 245; } };
    blocks.forEach(b=>{
      if (b.h > left) flush();
      cur.push(`<div class="blk" style="height:${b.h}mm">${b.fn(NO[n++])}</div>`); left -= b.h;
    });
    flush();

    if (o.sec.key) {
      if (!a) pages.push(`<section class="page teacher">${head('✅ 날씨 활동지 정답지 (교사용)','')}<div class="nodata">오늘 날씨를 먼저 정해 주세요<br><small>날씨 칸에서 GPS로 정답을 확인하면 정답이 채워져요</small></div></section>`);
      else {
        const g = a.w.guess, fits = this.WSW_CLOTHES.filter(c=>c.fit(a.temp ?? 20, a.t.k));
        const gw = g ? WEATHER.find(w=>w.label===g.label) : null, gf = g?.feel ? FEEL.find(f=>f.k===g.feel) : null;
        pages.push(`<section class="page teacher">${head('✅ 날씨 활동지 정답지 (교사용)','')}
          <div class="kwrap"><div class="thermo-k">${this.wswThermo(a.hasNum ? a.temp : null)}</div>
            <div class="kcol">
              <div class="kr">🌤️ 날씨 <b>${a.w.emoji} ${E(a.w.label)}</b></div>
              <div class="kr">🌡️ 기온 <b>${a.hasNum ? `${Math.round(a.temp)}°C` : '—'}</b>${a.f ? `<b>${a.f.emoji} ${E(a.f.label)}</b>` : ''}</div>
              <div class="kr">👕 알맞은 옷·물건 <b class="kfit">${fits.length ? fits.map(c=>`${c.e} ${E(c.n)}`).join(' &nbsp; ') : '해당 없음'}</b></div>
              ${g ? `<div class="kr">🔮 학생 예상 <b>${gw?`${gw.emoji} ${E(gw.label)}`:''} ${g.wOk?'○':'✕'}</b>${gf?`<b>${gf.emoji} ${E(gf.label)} ${g.fOk===false?'✕':'○'}</b>`:''}</div>` : ''}
            </div></div>
          <div class="src">${a.hasNum ? '기온은 GPS(Open-Meteo)로 확인한 현재 값이에요. ' : '기온 숫자가 없어 체감 단계로 옷 정답을 정했어요. '}온도계는 ${a.hasNum?'오늘 기온까지 빨갛게 칠해 보였어요':'학생이 색칠해요'}.<br>옷·물건 정답은 기온(8° 이하 겉옷·장갑, 25° 이상 반팔, 28° 이상 반바지 등)과 날씨(비·눈)로 정한 예시예요.</div>
        </section>`);
      }
    }
    if (!pages.length) pages.push(`<section class="page"><div class="empty">위에서 만들 활동지를 하나 이상 골라 주세요</div></section>`);
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700;900&family=Noto+Serif+KR:wght@700&display=swap" rel="stylesheet">
<style>
@font-face{font-family:'LDotted';src:url('https://cdn.jsdelivr.net/gh/Project-Noonnu/2608211548@font-209/font-209/%E1%84%8B%E1%85%A6%E1%86%AF%E1%84%8C%E1%85%A5%E1%86%B7%E1%84%89%E1%85%A5%E1%86%AB%E1%84%8E%E1%85%A6.woff2') format('woff2');font-weight:400;font-display:block}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans KR',sans-serif;background:#d9dee7;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;background:#fff;margin:6mm auto;padding:12mm 14mm;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.15)}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;break-after:page}.page:last-child{break-after:auto}}
.hd{display:flex;align-items:flex-end;justify-content:space-between;gap:6mm;border-bottom:.7mm solid #111;padding-bottom:2.5mm;margin-bottom:5mm;flex:none}
.hd h1{font-size:20pt;font-weight:900;line-height:1.2}
.hd .sub{font-size:9.5pt;color:#555;margin-top:1mm;font-weight:500}
.hd .nm{font-size:12pt;font-weight:700;white-space:nowrap}
.hd .nm span{display:inline-block;width:32mm;border-bottom:.3mm solid #111;margin-left:2mm}
.blk{display:flex;flex-direction:column;overflow:hidden;flex:none}
h2{font-size:13pt;font-weight:900;margin:0 0 3mm;flex:none}
h2 small{font-size:9.5pt;color:#6b7280;font-weight:500;margin-left:2mm}
.cells{--c:14mm;display:inline-flex;vertical-align:middle;flex:none}
.cell{width:var(--c);height:var(--c);border:.3mm solid #444;margin-left:-.3mm;position:relative;display:flex;align-items:center;justify-content:center;font-family:'Noto Serif KR',serif;font-weight:700;font-size:calc(var(--c) * .78);line-height:1;background:#fff}
.cell::before{content:'';position:absolute;left:50%;top:0;bottom:0;border-left:.2mm dashed #c9ced6}
.cell::after{content:'';position:absolute;top:50%;left:0;right:0;border-top:.2mm dashed #c9ced6}
.cell.dot{font-family:'LDotted',sans-serif;font-weight:400;color:#000;font-size:calc(var(--c) * .84)}
.wgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.wc{border:.4mm solid #9aa3b0;border-radius:3mm;height:30mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm}
.we{font-size:16mm;line-height:1}.wl{font-size:12pt;font-weight:900}
.wline{margin-top:5mm;font-size:17pt;font-weight:700;display:flex;align-items:center;justify-content:center;gap:3mm;flex-wrap:wrap}
.trow{display:flex;gap:4mm;flex:1;min-height:0}
.step{border:.4mm solid #9aa3b0;border-radius:3mm;padding:2.5mm 4mm 3mm;display:flex;flex-direction:column;gap:2mm}
.st{display:flex;align-items:center;gap:2mm;font-size:11.5pt;font-weight:900;flex:none}
.sb{width:6.5mm;height:6.5mm;border-radius:50%;background:#374151;color:#fff;font-size:9pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.step.thermo{width:48mm;flex:none;align-items:center}
.step.thermo .st{align-self:flex-start}
.step.thermo svg{width:36mm;height:auto;display:block}
.tip{font-size:9pt;color:#6b7280;font-weight:500}
.tright{flex:1;display:flex;flex-direction:column;gap:3mm;min-width:0}
.tright .step{flex:1;justify-content:center}
.tl1{font-size:15pt;font-weight:700;display:flex;align-items:center;gap:2mm;flex-wrap:wrap}
.faces{display:grid;grid-template-columns:repeat(5,1fr);gap:2mm}
.fc{border:.4mm solid #9aa3b0;border-radius:3mm;height:24mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm}
.fe{font-size:9mm;line-height:1}.fl{font-size:8pt;font-weight:900;text-align:center;line-height:1.2}.fr{font-size:7pt;color:#555;font-weight:500}
.cgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.cc{border:.4mm solid #9aa3b0;border-radius:3mm;height:19mm;display:flex;align-items:center;gap:3mm;padding:0 4mm}
.ce{font-size:10mm;line-height:1}.cn{font-size:13pt;font-weight:900}
.pt{display:grid;grid-template-columns:28mm 1fr 1fr 40mm;border-top:.4mm solid #374151;border-left:.4mm solid #374151}
.pt>div{border-right:.4mm solid #374151;border-bottom:.4mm solid #374151;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12pt;font-weight:700;padding:1mm;line-height:1.3}
.pt .h{background:#f3f4f6;font-weight:900;height:9mm}
.pt .r{height:20mm}
.pt .ox{gap:8mm;font-size:26pt;font-weight:900}
.pt .ox span{width:14mm;height:14mm;border:.4mm solid #9aa3b0;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1}
.teacher .hd{border-bottom-color:#b45309}
.kwrap{display:flex;gap:8mm;align-items:flex-start}
.thermo-k{width:36mm;flex:none}.thermo-k svg{width:36mm;height:auto;display:block}
.kcol{flex:1;display:flex;flex-direction:column;gap:4mm}
.kr{display:flex;align-items:center;flex-wrap:wrap;gap:3mm 5mm;border:.35mm solid #9aa3b0;border-radius:3mm;padding:4mm 5mm;font-size:13pt;font-weight:700}
.kr b{font-size:20pt;font-weight:900}.kr b.kfit{font-size:15pt;line-height:1.7}
.src{font-size:8.5pt;color:#6b7280;margin-top:auto;padding-top:3mm;line-height:1.6}
.empty{margin:auto;font-size:14pt;color:#888;font-weight:700}
.nodata{margin:auto;text-align:center;font-size:14pt;color:#6b7280;font-weight:700;line-height:1.7}
.nodata small{font-size:10pt;font-weight:500}
</style></head><body>${pages.join('')}</body></html>`;
  }
};
