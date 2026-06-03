// 헤이집사 로고/아이콘 벡터 생성 (resvg). 결과 확인 후 아이콘 세트까지 확장.
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync } from 'node:fs';

const NAVY = '#1F3864';
const CREAM = '#F4ECD6';

// 4각 반짝이
const spark = (cx, cy, R) => {
  const r = R * 0.16;
  return `M ${cx} ${cy - R} L ${cx + r} ${cy - r} L ${cx + R} ${cy} L ${cx + r} ${cy + r} L ${cx} ${cy + R} L ${cx - r} ${cy + r} L ${cx - R} ${cy} L ${cx - r} ${cy - r} Z`;
};

// 집사 캐릭터 (1024 좌표계, 대략 x[320..724], y[200..620])
const butler = () => `
  <!-- 얼굴(크림) -->
  <ellipse cx="512" cy="306" rx="74" ry="84" fill="${CREAM}"/>
  <!-- 머리(네이비) -->
  <path d="M440 308 C434 244 470 206 512 206 C554 206 590 244 584 308 C576 304 570 300 562 298 C548 282 530 276 510 278 C496 279 486 285 480 294 C472 289 456 294 446 304 C444 305 442 306 440 308 Z" fill="${NAVY}"/>
  <!-- 눈 -->
  <circle cx="490" cy="308" r="8" fill="${NAVY}"/>
  <circle cx="534" cy="308" r="8" fill="${NAVY}"/>
  <!-- 미소 -->
  <path d="M498 334 Q512 350 526 334" fill="none" stroke="${NAVY}" stroke-width="6" stroke-linecap="round"/>
  <!-- 목(크림) -->
  <rect x="498" y="382" width="28" height="38" fill="${CREAM}"/>
  <!-- 정장 재킷(네이비, 라펠 V) -->
  <path d="M490 414 C474 448 436 456 414 470 C388 487 376 520 376 562 L380 620 L644 620 L648 562 C648 520 636 487 610 470 C588 456 550 448 534 414 C524 432 500 432 490 414 Z" fill="${NAVY}"/>
  <!-- 셔츠 V넥(크림) -->
  <path d="M494 416 L512 548 L530 416 Z" fill="${CREAM}"/>
  <rect x="505" y="536" width="14" height="84" fill="${CREAM}"/>
  <circle cx="512" cy="474" r="4.5" fill="${NAVY}"/>
  <circle cx="512" cy="504" r="4.5" fill="${NAVY}"/>
  <!-- 나비넥타이 -->
  <path d="M512 421 L480 408 L480 436 Z" fill="${NAVY}"/>
  <path d="M512 421 L544 408 L544 436 Z" fill="${NAVY}"/>
  <rect x="503" y="414" width="18" height="15" rx="3" fill="${NAVY}"/>
  <!-- 왼팔(네이비) + 수건 -->
  <path d="M424 502 C392 496 366 508 358 538 C352 560 362 580 380 582 C400 578 416 550 418 524 Z" fill="${NAVY}"/>
  <rect x="332" y="546" width="58" height="150" rx="14" fill="${CREAM}" stroke="${NAVY}" stroke-width="5"/>
  <line x1="361" y1="558" x2="361" y2="684" stroke="${NAVY}" stroke-width="4" stroke-linecap="round"/>
  <!-- 오른팔(네이비) 들어올림 -->
  <path d="M600 502 C636 494 700 492 736 502 C752 507 756 522 748 534 C720 540 680 538 648 534 C624 530 606 518 600 502 Z" fill="${NAVY}"/>
  <!-- 쟁반 -->
  <ellipse cx="784" cy="498" rx="80" ry="13" fill="${NAVY}"/>
  <!-- 집(네이비) on 쟁반 -->
  <path d="M784 414 L832 460 L736 460 Z" fill="${NAVY}"/>
  <rect x="746" y="458" width="76" height="32" fill="${NAVY}"/>
  <!-- 창문(크림 + 네이비 격자) -->
  <rect x="768" y="464" width="32" height="22" fill="${CREAM}"/>
  <line x1="784" y1="464" x2="784" y2="486" stroke="${NAVY}" stroke-width="3"/>
  <line x1="768" y1="475" x2="800" y2="475" stroke="${NAVY}" stroke-width="3"/>
  <!-- 반짝이 -->
  <path d="${spark(856, 372, 27)}" fill="${NAVY}"/>
  <path d="${spark(830, 408, 15)}" fill="${NAVY}"/>
`;

function render(svg, size) {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: {
      fontFiles: ['/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'],
      defaultFontFamily: 'Liberation Sans',
      loadSystemFonts: false,
    },
  })
    .render()
    .asPng();
}

// 풀 로고 내용 (크림 라운드 + 집사 + 워드마크)
const logoContent = `
  <rect x="40" y="40" width="944" height="944" rx="190" fill="${CREAM}"/>
  ${butler()}
  <text x="512" y="812" text-anchor="middle" font-family="Liberation Sans" font-weight="bold" font-size="118" fill="${NAVY}">HeyJipsa</text>`;

const svgDoc = (vb, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}">${inner}</svg>`;

// 집사 bbox 중심 ≈ (602,453). 아이콘은 워드마크 없이 집사만 키워 중앙배치.
const butlerCentered = (scale) =>
  `<g transform="translate(512 512) scale(${scale}) translate(-602 -453)">${butler()}</g>`;

mkdirSync('public', { recursive: true });
mkdirSync('assets', { recursive: true });

// 랜딩/공유용 풀 로고
writeFileSync('public/logo.png', render(svgDoc(1024, logoContent), 1024));

// 앱 아이콘 (full-bleed 크림 + 집사)
writeFileSync(
  'assets/icon-only.png',
  render(svgDoc(1024, `<rect width="1024" height="1024" fill="${CREAM}"/>${butlerCentered(1.5)}`), 1024),
);
// Android 적응형 전경(투명) / 배경(크림)
writeFileSync('assets/icon-foreground.png', render(svgDoc(1024, butlerCentered(1.3)), 1024));
writeFileSync('assets/icon-background.png', render(svgDoc(1024, `<rect width="1024" height="1024" fill="${CREAM}"/>`), 1024));

// 스플래시 (가운데 라운드 로고)
const splash = (bg) =>
  svgDoc(2732, `<rect width="2732" height="2732" fill="${bg}"/><g transform="translate(986 986) scale(0.742)">${logoContent}</g>`);
writeFileSync('assets/splash.png', render(splash('#FFF4E6'), 2732));
writeFileSync('assets/splash-dark.png', render(splash(NAVY), 2732));

console.log('written: public/logo.png + assets/{icon-only,icon-foreground,icon-background,splash,splash-dark}.png');
