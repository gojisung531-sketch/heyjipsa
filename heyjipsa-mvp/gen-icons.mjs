// 업로드된 로고로 앱 아이콘/스플래시 + 랜딩용 깨끗한 카드 생성 (sharp)
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

mkdirSync('assets', { recursive: true });
const src = readFileSync('assets/icon-source.png'); // 업로드 원본(흰 배경 + 크림 라운드)

// 바깥 흰 테두리 자동 제거 → 크림이 꽉 차는 1024 정사각
const cropped = await sharp(src)
  .trim({ threshold: 12 })
  .resize(1024, 1024, { fit: 'fill' })
  .png()
  .toBuffer();

// 크림색 샘플(상단 중앙)
const px = await sharp(cropped).extract({ left: 500, top: 20, width: 8, height: 8 }).resize(1, 1).raw().toBuffer();
const cream = { r: px[0], g: px[1], b: px[2] };
console.log('cream:', cream);

// 런처 아이콘 (full-bleed, OS가 모서리 마스킹)
await sharp(cropped).toFile('assets/icon-only.png');
// Android 적응형 배경(크림 단색) / 전경(투명 위 70%)
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: cream } }).png().toFile('assets/icon-background.png');
const fg = await sharp(cropped).resize(720, 720).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fg, gravity: 'center' }]).png().toFile('assets/icon-foreground.png');

// 라운드 마스크 → 모서리 투명한 크림 카드 (스플래시용)
const mask = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" rx="196" ry="196" fill="#fff"/></svg>',
);
const card = await sharp(cropped).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();

// 랜딩용 로고: 크림+옅은 그림자까지 투명 처리(휘도 기반 알파) → 네이비 집사만
// alpha = 307.8 - 1.466*휘도  (네이비≈36→255, 휘도 210 이상(크림·그림자)→0)
const alpha = await sharp(cropped).toColourspace('b-w').linear(-1.466, 307.8).raw().toBuffer();
const keyed = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: { r: 12, g: 40, b: 80 } } })
  .joinChannel(alpha, { raw: { width: 1024, height: 1024, channels: 1 } })
  .png()
  .toBuffer();
writeFileSync('public/logo.png', keyed);

// 스플래시 (카드 가운데 배치)
const sp = await sharp(card).resize(1040, 1040).png().toBuffer();
await sharp({ create: { width: 2732, height: 2732, channels: 3, background: { r: 255, g: 244, b: 230 } } })
  .composite([{ input: sp, gravity: 'center' }]).png().toFile('assets/splash.png');
await sharp({ create: { width: 2732, height: 2732, channels: 3, background: { r: 31, g: 56, b: 100 } } })
  .composite([{ input: sp, gravity: 'center' }]).png().toFile('assets/splash-dark.png');

console.log('done: public/logo.png(card) + assets/{icon-only,icon-foreground,icon-background,splash,splash-dark}.png');
