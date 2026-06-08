# 헤이집사 — Google Play 출시 가이드 (무료 앱)

> 전체 순서: ① 개발자 계정 → ② GitHub 시크릿 + AAB 빌드 → ③ Play Console 앱 생성
> → ④ 스토어 등록정보 → ⑤ 앱 콘텐츠(개인정보·데이터안전·등급) → ⑥ 비공개 테스트(12명·14일)
> → ⑦ 정식 출시 신청

새 **개인** 개발자 계정은 구글 정책상 **테스터 12명 + 14일 비공개 테스트**를 거쳐야
프로덕션(정식 공개)을 신청할 수 있습니다.

---

## ① 개발자 계정 (1회 $25)
1. https://play.google.com/console 접속 → 구글 계정 로그인
2. **개인(Personal)** 선택 → **$25** 결제
3. 신분증으로 **본인 인증** (보통 48시간 내 승인)

---

## ② 서명된 AAB 만들기 (GitHub Actions)

### 2-1. 업로드 키스토어 보관 ⚠️ 매우 중요
- 채팅으로 받은 **`heyjipsa-upload.jks`** 파일을 **안전한 곳에 영구 보관**하세요.
  (구글 Play 앱 서명에 등록하면, 분실해도 업로드 키는 재설정 가능합니다.)
- **비밀번호**는 비밀번호 관리자에 저장하세요. (채팅에 표시된 값)

### 2-2. GitHub 시크릿 4개 등록
저장소 → **Settings → Secrets and variables → Actions → New repository secret** 에서:

| 이름 | 값 |
|---|---|
| `KEYSTORE_BASE64` | 받은 `KEYSTORE_BASE64.txt` 파일을 열어 **전체 내용 복사**해 붙여넣기 |
| `KEYSTORE_PASSWORD` | 채팅으로 받은 비밀번호 |
| `KEY_ALIAS` | `upload` |
| `KEY_PASSWORD` | 채팅으로 받은 비밀번호(키스토어와 동일) |

### 2-3. AAB 빌드 실행
- 저장소 **Actions 탭 → "Android Release (AAB)" → Run workflow** (브랜치: `claude/nice-goodall-qqV5R`)
- 끝나면 하단 **Artifacts → `heyjipsa-release-aab`** 다운로드 → 압축 안에 **`app-release.aab`**

---

## ③ Play Console에서 앱 생성
1. Play Console → **앱 만들기**
2. 앱 이름 **헤이집사**, 기본 언어 **한국어**, 앱/게임 = **앱**, 유료/무료 = **무료**
3. 선언(개발자 정책·미국 수출법) 체크 → 만들기

---

## ④ 스토어 등록정보 (왼쪽 메뉴: 매장 등록정보 → 기본 스토어 등록정보)
`store/STORE_LISTING.md` 의 텍스트를 그대로 붙여넣기:
- 제목 / 간단한 설명 / 자세한 설명
- **앱 아이콘**: `store/icon-512.png`
- **그래픽 이미지**: `store/feature-graphic.png`
- **휴대전화 스크린샷**: `store/shot-1~5.png` (2장 이상)
- 카테고리: **라이프스타일**, 연락처 이메일 입력

---

## ⑤ 앱 콘텐츠 (왼쪽 메뉴: 정책 → 앱 콘텐츠)
`store/STORE_LISTING.md` 하단의 "앱 콘텐츠 설문" 답안대로:
- **개인정보처리방침 URL** 입력 → 아래 2-옵션 중 하나로 호스팅
  - (간단) 저장소를 `master`에 병합 후, `store/privacy-policy.md`의 GitHub 주소 사용
    예: `https://github.com/gojisung531-sketch/heyjipsa/blob/master/heyjipsa-mvp/store/privacy-policy.md`
  - (깔끔) 저장소 **Settings → Pages** 활성화 후 `privacy-policy.html` 주소 사용
- 광고: **없음**
- 데이터 보안: **수집·공유 안 함** (권한 설명만 입력)
- 콘텐츠 등급 설문: 전부 '아니오' → **전체이용가**
- 타겟층: 아동 타깃 아님

---

## ⑥ 비공개 테스트 (테스트 → 비공개 테스트)
1. **새 트랙/버전 만들기** → 위 `app-release.aab` 업로드
2. **테스터 추가**: 이메일 12개 이상(본인·지인 Gmail). 그룹으로 등록
3. 출시 검토 → 시작. 테스터는 받은 링크로 설치
4. **14일 연속** 유지 (12명이 옵트인한 상태로)

> 이 기간이 새 개인계정의 정식 출시 전제 조건입니다.

---

## ⑦ 정식 출시 (프로덕션)
1. 14일 충족 후 **프로덕션 → 프로덕션 액세스 신청**(설문 답변)
2. 승인되면 **프로덕션 새 버전 만들기** → 같은 AAB(또는 새 빌드) 업로드 → 검토 제출
3. 구글 심사(보통 며칠) 통과 → **공개** 🎉

---

## 업데이트할 때 (참고)
- 코드 수정 후 다시 배포하려면 `android/app/build.gradle`의 **`versionCode`를 +1**
  (예: 1 → 2), 필요하면 `versionName`도 변경 → ②의 AAB 빌드 다시 실행.
- **반드시 같은 업로드 키스토어로 서명**되어야 합니다(그래서 보관이 중요).

## 보안 메모
- `*.jks`, `keystore.properties`, 비밀번호는 **절대 저장소에 커밋하지 마세요** (이미 .gitignore 처리됨).
- 키/비밀번호가 유출되면 Play 앱 서명에서 업로드 키를 재설정하세요.
