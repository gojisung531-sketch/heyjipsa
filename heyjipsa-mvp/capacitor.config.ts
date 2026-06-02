import type { CapacitorConfig } from '@capacitor/cli';

// 네이티브 앱 설정 (Capacitor)
// appId는 스토어 등록 전 본인 도메인 기준으로 바꾸세요 (예: com.회사.heyjipsa).
const config: CapacitorConfig = {
  appId: 'com.heyjipsa.app',
  appName: '헤이집사',
  webDir: 'dist',
};

export default config;
