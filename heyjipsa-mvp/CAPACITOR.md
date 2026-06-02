# 헤이집사 — 네이티브 앱(Capacitor) 빌드 & 출시 가이드

현재 React 웹앱(`heyjipsa-mvp`)을 **코드 수정 거의 없이** iOS/안드로이드 네이티브 앱으로
감싸서 앱스토어·플레이스토어에 올리기 위한 안내입니다. (Capacitor 8 기준)

웹앱은 HashRouter + localStorage 기반이라 Capacitor 웹뷰에서 그대로 동작합니다.
OCR(tesseract.js)도 웹뷰에서 동작하며, 모델은 인터넷에서 받아옵니다(첫 사용 시).

> 네이티브 프로젝트 폴더(`android/`, `ios/`)는 저장소에 커밋하지 않고(.gitignore)
> 각자 머신에서 아래 명령으로 생성합니다.

---

## 0. 공통 준비물
- Node.js 20.19+/22.12+ (이미 설치돼 있으면 OK)
- 이 폴더에서 한 번: `npm install`

## 1. 플랫폼 추가 (최초 1회)

```bash
cd heyjipsa-mvp
npm run build            # 웹 빌드(dist) 생성
npx cap add android      # android/ 생성  (Windows/맥/리눅스 모두 가능)
npx cap add ios          # ios/ 생성      (맥에서만)
```

이후 웹 코드를 바꿀 때마다 동기화:
```bash
npm run cap:sync         # = build + cap sync (android/ios 둘 다 반영)
```

---

## 2. 안드로이드 (Windows에서도 가능)

준비물: **Android Studio** 설치 (Android SDK 포함).

```bash
npm run cap:android      # 빌드 + 동기화 + Android Studio 열기
# (또는 수동: npx cap open android)
```

Android Studio에서:
1. 상단 기기 선택(에뮬레이터 또는 USB 연결한 폰) → ▶ Run 으로 실제 구동 확인.
2. 출시용 빌드: **Build ▸ Generate Signed Bundle/APK ▸ Android App Bundle(.aab)** → 키스토어 생성/서명.
3. **Google Play Console**(등록비 1회 $25)에서 앱 만들고 .aab 업로드 → 심사 제출.

폰에서 바로 테스트만: USB 디버깅 켜고 Run 하면 설치됩니다(스토어 없이).

---

## 3. iOS (Mac 필수)

준비물: **Mac + Xcode**, CocoaPods(`sudo gem install cocoapods`),
**Apple Developer Program**(연 $99).

```bash
npm run cap:ios          # 빌드 + 동기화 + Xcode 열기
# (또는 수동: npx cap open ios)
```

Xcode에서:
1. Signing & Capabilities ▸ Team 선택(Apple Developer 계정).
2. 실기기/시뮬레이터 선택 → ▶ Run 으로 구동 확인.
3. 출시: **Product ▸ Archive** → Organizer에서 **Distribute App** → App Store Connect 업로드.
4. **App Store Connect**에서 앱 정보·스크린샷 등록 → TestFlight(베타) 또는 심사 제출.

---

## 4. 앱 식별자·이름 바꾸기
`capacitor.config.ts`:
- `appId`: 스토어 고유 ID. 본인 도메인 역순 권장(예: `com.회사명.heyjipsa`).
  **플랫폼 추가 전에** 정하는 게 가장 깔끔합니다(이미 추가했다면 폴더 지우고 재생성).
- `appName`: 폰 홈에 표시될 이름(기본 `헤이집사`).

## 5. 아이콘 & 스플래시
```bash
npm i -D @capacitor/assets
# 1024x1024 아이콘을 resources/icon.png, 2732x2732 스플래시를 resources/splash.png 로 두고
npx capacitor-assets generate
```

## 6. (선택) OCR 정확도 업그레이드
지금은 웹뷰에서 tesseract.js로 동작합니다(인터넷 필요, 종이 영수증 정확도는 보통).
네이티브에서 **기기 내장 ML Kit 텍스트 인식**으로 바꾸면 한국어 정확도가 크게 좋아지고
오프라인도 됩니다. 커뮤니티 플러그인(`@capacitor-mlkit/text-recognition` 등)으로 교체 가능 —
필요하면 `src/utils/ocr.ts`만 네이티브 분기로 바꾸면 UI는 그대로입니다.

## 7. 카메라 UX(선택)
현재는 `<input type="file" capture>`로 촬영/갤러리를 엽니다(웹뷰에서 동작).
더 매끄러운 네이티브 카메라가 필요하면 `@capacitor/camera` 플러그인으로 교체할 수 있습니다.

---

### 업데이트 루틴 요약
웹 코드 수정 → `npm run cap:sync` → Android Studio/Xcode에서 Run 또는 Archive.
