---
name: household-checklist
description: 가구 조건(1인/2인/맞벌이/아이/반려동물/식물 등)에 맞춰 집안일 체크리스트를 자동 생성하는 스킬. 매일/주1회/월1회/계절별 주기로 분류하고 진행률이 보이는 인터랙티브 HTML로 출력함. "집안일 정리", "체크리스트 만들어줘", "1인가구 할 일", "주말에 뭐 해야 하지", "household chores", "옵트아웃 체크리스트" 같은 표현이 나올 때, 또는 가구 형태별 살림 루틴을 정리하고 싶을 때 사용.
---

# Household Checklist

## What this skill does

가구 유형(1인/2인/맞벌이/아이/반려동물/식물 등)을 입력받아, 해당 유형에 맞는 전체 집안일 목록을 자동으로 펼친 다음 사용자가 "안 하는 것"만 빼는 opt-out 방식으로 인터랙티브 HTML 체크리스트를 생성한다. 매일/주1회/월1회/계절별 주기로 분류되고, 체크박스로 완료 표시 + 진행률 막대가 함께 나온다.

## When to use

- 사용자가 자기 가구 유형을 언급하며 집안일 정리/루틴/체크리스트를 요청할 때
- "1인가구인데 뭘 해야 하지", "맞벌이 부부 집안일 분담", "반려견 키우는데 빼먹는 거 없게" 같은 발화
- 주기별로 묶인 살림 체크리스트나 진행률 트래커를 원할 때
- 가구 형태에 따라 옵션이 너무 많아서 처음부터 다 적기 부담스러운 경우

## How to use

1. 사용자에게 가구 유형 묻기 (AskUserQuestion 권장):
   - 인원: 1인 / 2인(동거·부부) / 가족(아이 있음)
   - 라이프스타일: 맞벌이 여부
   - 케어 대상: 반려동물(개/고양이/기타), 식물
2. 응답으로 활성화할 템플릿 카테고리 결정 (`common`은 항상 포함)
3. `scripts/generate_checklist.py`에 옵션 dict를 넘겨 실행
   ```bash
   python scripts/generate_checklist.py --config config.json --output checklist.html
   ```
   또는 Python에서 직접 호출:
   ```python
   from scripts.generate_checklist import build_checklist
   html = build_checklist({
       "size": "single",          # single | couple | family
       "dual_income": False,
       "pet": ["dog"],            # [] | ["dog"] | ["cat"] | ["dog","cat"] | ["other"]
       "plant": True,
       "child": False
   })
   ```
4. 생성된 HTML을 사용자에게 보여주고, "이 중에 빼고 싶은 항목 있어?"라고 한 번 더 물어 opt-out 처리
5. 빠진 항목은 config에서 `excluded_ids`에 추가해 다시 생성

## Output format

단일 HTML 파일. 구조:

- 상단: 진행률 바 (오늘 할 일 기준 %, n/m 카운트)
- 탭/섹션: 매일 / 주 1회 / 월 1회 / 계절별
- 각 항목: `[ ] 항목명` 체크박스 + 카테고리 태그(공통/반려동물/식물/아이)
- 하단: "항목 빼기" 버튼 (체크 해제된 카테고리 숨김 토글)
- 데이터 저장: `localStorage` 사용 안 함(아티팩트 호환). 새로고침 시 초기화. 필요하면 사용자가 코드 직접 수정.

## Examples

**예시 1**
입력:
```json
{"size": "single", "dual_income": false, "pet": [], "plant": true, "child": false}
```
출력 요지:
- 매일: 설거지, 음식물 쓰레기, 식물 물주기 체크
- 주1회: 청소기, 화장실, 빨래, 분리수거
- 월1회: 냉장고 정리, 환풍기 청소
- 계절별: 옷 정리, 이불 빨래

**예시 2**
입력:
```json
{"size": "family", "dual_income": true, "pet": ["dog"], "plant": false, "child": true}
```
출력 요지:
- 매일: 아이 등하원, 도시락, 강아지 산책, 사료, 설거지
- 주1회: 빨래, 청소기, 화장실, 분리수거, 강아지 목욕
- 월1회: 학원비, 강아지 심장사상충 약, 냉장고 정리
- 계절별: 강아지 예방접종, 아이 옷 정리

**예시 3 (opt-out)**
입력:
```json
{"size": "couple", "dual_income": true, "pet": ["cat"], "plant": false,
 "excluded_ids": ["pet_walk", "monthly_fridge"]}
```
출력: 위 조건 전체 항목에서 산책/냉장고 정리만 빠진 체크리스트.

## Edge cases

- 빈 입력 (size 없음): `single`로 기본값 처리하고 사용자에게 알림
- pet에 알 수 없는 종 입력 시: `other` 카테고리로 매핑(병원/사료/배변 일반화 항목)
- 모든 카테고리 비활성화: 공통(common) 항목만 출력
- excluded_ids에 없는 id 들어오면 무시(에러 안 냄)
- 한 사용자가 여러 가구 유형 결합 (예: 1인 + 반려동물 + 식물): 정상 처리, 카테고리 누적

## Limitations

- 외부 API 의존 없음. 순수 로컬 실행.
- HTML 출력은 단일 파일이며 localStorage 미사용 → 새로고침 시 체크 상태 초기화. 영속 저장 필요하면 코드 수정 필요.
- 한국 가구 환경 기준 항목(분리수거 요일, 음식물쓰레기 RFID 등) 위주. 해외 거주자에겐 일부 항목이 안 맞을 수 있음.
- 항목 추가/수정은 `scripts/templates.py` 직접 편집.
