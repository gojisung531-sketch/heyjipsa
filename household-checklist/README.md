# household-checklist

**가구 조건만 체크하면 집안일 목록이 자동으로 펼쳐지는 Cowork 스킬.**

빈 종이에 처음부터 적는 게 아니라, 너희 가구에 해당하는 항목 전체가 먼저 펼쳐지고 안 하는 것만 빼는 **opt-out(빼기) 방식**이야.

---

## 만든 이유

집안일 체크리스트를 만들자고 결심하면 보통 빈 노트나 노션 빈 페이지부터 마주하게 돼.
근데 막상 적으려니까:

- "어… 매일 뭐 했더라"
- "한 달에 한 번 해야 하는 거 또 뭐 있지"
- "다른 집은 뭐 챙기지"

이렇게 **떠올리는 것 자체가 일**이야. 결국 빠뜨리는 항목이 생기고, 그 빠뜨린 항목 때문에 한참 뒤에 후회함 (배수구 트랩, 공기청정기 필터 같은 거).

그래서 **반대로 가는 방식**을 만들었어:

> 가구 유형(1인/2인/맞벌이/아이/반려동물/식물)만 체크 → 그 유형이 보통 챙기는 항목 전체 자동 생성 → 나한테 해당 안 되는 거만 ×로 빼기

빈칸 채우기보다, 펼쳐진 거에서 빼는 게 **인지 부하가 훨씬 낮아**. "내 케이스에 뭘 추가할까"가 아니라 "이건 안 해도 되겠다"만 판단하면 되니까.

---

## 어떻게 동작하나

1. 가구 조건 입력 (체크박스 형태)
   - 인원: 1인 / 2인(동거·부부) / 가족(아이 있음)
   - 맞벌이 여부
   - 반려동물: 강아지 / 고양이 / 기타
   - 식물 여부
2. 해당 카테고리들이 자동 결합돼서 **전체 항목 리스트** 생성
3. 매일 / 주 1회 / 월 1회 / 계절별 주기로 자동 분류
4. 인터랙티브 HTML 출력 → 체크박스로 완료 체크, 진행률 바 표시
5. × 버튼으로 안 하는 항목 그 자리에서 제거

---

## 설치

이 스킬은 Cowork(또는 Claude Code) 플러그인 형태로 동작해.

```bash
git clone https://github.com/<your-id>/K-Skills.git
```

레포의 `household-checklist` 폴더를 Cowork 스킬 디렉토리에 두면 자동 인식됨. 직접 Python으로 돌리고 싶으면 아래 "직접 실행" 참고.

---

## 사용법 (Cowork에서)

스킬 활성화 후 그냥 자연스럽게 말하면 됨:

- "1인가구인데 집안일 체크리스트 만들어줘"
- "맞벌이 + 강아지 키우는 집 집안일 정리해줘"
- "주말에 뭐 해야 할지 좀 까먹는데, 가구 체크리스트 만들어줘"

Claude가 가구 조건 몇 개 묻고 나서 HTML 파일을 생성해줄 거야. 브라우저에서 열면 체크박스 + 진행률 바가 보임.

---

## 직접 실행

```bash
cd household-checklist/scripts

# 1인 가구 + 식물
python generate_checklist.py --size single --plant --output my_list.html

# 맞벌이 + 강아지
python generate_checklist.py --size couple --dual-income --pet dog --output my_list.html

# 가족 + 맞벌이 + 강아지 + 식물 (다 합치기)
python generate_checklist.py --size family --dual-income --child --pet dog --plant --output my_list.html
```

또는 JSON config 파일로:

```json
{
  "size": "couple",
  "dual_income": true,
  "pet": ["cat"],
  "plant": false,
  "excluded_ids": ["common_window", "monthly_fridge"]
}
```

```bash
python generate_checklist.py --config my_config.json --output my_list.html
```

`excluded_ids`에 빼고 싶은 항목 id를 적으면 처음부터 빠진 상태로 생성됨.

---

## 항목 커스터마이징

`scripts/templates.py` 파일 직접 수정하면 됨. 카테고리별로 매일/주1회/월1회/계절별 리스트가 dict로 정리돼 있어서 추가/삭제 쉬워.

```python
COMMON = {
    "daily": [
        {"id": "common_dishes", "name": "설거지", "category": "공통"},
        # 여기에 추가하면 됨
        {"id": "my_custom", "name": "내가 추가한 항목", "category": "공통"},
    ],
    ...
}
```

id는 영어 + 언더스코어로, 다른 항목과 안 겹치게.

---

## 한계

- **체크 상태 저장 안 됨**: localStorage 안 씀. 새로고침하면 다 풀림. 영속 저장 필요하면 코드 수정해야 함 (Cowork 아티팩트 호환성 위해 일부러 뺐음).
- **한국 가구 환경 기준**: 분리수거, 음식물 RFID, 한국식 가족 구조 위주. 해외 거주자면 일부 항목 안 맞을 수 있음.
- **완벽하지 않은 카테고리화**: 사람마다 가구 형태는 다양함. 템플릿이 너희 케이스랑 안 맞으면 templates.py 수정 권장.
- **외부 API 의존 없음**: 차단될 일은 없지만, 그만큼 실시간 정보(쓰레기 배출 요일 등)는 못 가져옴.

---

## 파일 구조

```
household-checklist/
├── SKILL.md                    # Cowork 스킬 정의
├── README.md                   # 이 파일
├── scripts/
│   ├── templates.py            # 가구 유형별 항목 템플릿
│   └── generate_checklist.py   # HTML 생성 메인 스크립트
└── examples/
    ├── sample_family.html      # 가족+맞벌이+강아지+식물 샘플
    └── sample_single.html      # 1인+식물 샘플
```

---

## 라이선스

MIT. 마음대로 가져다 써.

## 만든 사람

K-Skills Factory · 가은
