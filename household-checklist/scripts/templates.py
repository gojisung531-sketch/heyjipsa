"""가구 유형별 집안일 템플릿.

각 항목 구조:
    {
        "id": str,           # 고유 id (excluded_ids로 빼기 가능)
        "name": str,         # 화면에 보일 이름
        "category": str,     # 표시용 카테고리 태그
    }

주기 키:
    daily / weekly / monthly / seasonal
"""

# ─────────────────────────────────────────────
# 공통 (모든 가구)
# ─────────────────────────────────────────────
COMMON = {
    "daily": [
        {"id": "common_dishes", "name": "설거지", "category": "공통"},
        {"id": "common_food_trash", "name": "음식물 쓰레기 비우기", "category": "공통"},
        {"id": "common_floor_wipe", "name": "주방 바닥 닦기 (물 튄 곳)", "category": "공통"},
        {"id": "common_bed", "name": "이불 정리", "category": "공통"},
    ],
    "weekly": [
        {"id": "common_vacuum", "name": "청소기 돌리기", "category": "공통"},
        {"id": "common_floor_mop", "name": "물걸레 청소", "category": "공통"},
        {"id": "common_bathroom", "name": "화장실 청소 (변기·세면대·바닥)", "category": "공통"},
        {"id": "common_laundry", "name": "빨래 (속옷·수건 포함)", "category": "공통"},
        {"id": "common_recycle", "name": "분리수거 배출", "category": "공통"},
        {"id": "common_general_trash", "name": "일반 쓰레기 배출", "category": "공통"},
        {"id": "common_kitchen_sink", "name": "싱크대·배수구 청소", "category": "공통"},
    ],
    "monthly": [
        {"id": "common_fridge", "name": "냉장고 정리 (유통기한 체크)", "category": "공통"},
        {"id": "common_vent", "name": "주방 환풍기·후드 청소", "category": "공통"},
        {"id": "common_filter", "name": "에어컨/공기청정기 필터 점검", "category": "공통"},
        {"id": "common_drain", "name": "배수구 트랩 청소", "category": "공통"},
        {"id": "common_window", "name": "창문·방충망 청소", "category": "공통"},
        {"id": "common_bedding", "name": "침구 빨래 (커버·베개)", "category": "공통"},
    ],
    "seasonal": [
        {"id": "common_clothes_swap", "name": "계절 옷 정리/교체", "category": "공통"},
        {"id": "common_blanket", "name": "이불·패드 교체", "category": "공통"},
        {"id": "common_aircon_clean", "name": "에어컨 분해 청소 (여름 전)", "category": "공통"},
        {"id": "common_heater", "name": "보일러·난방기 점검 (겨울 전)", "category": "공통"},
        {"id": "common_pest", "name": "방역·해충 점검", "category": "공통"},
    ],
}

# ─────────────────────────────────────────────
# 1인 가구 특화
# ─────────────────────────────────────────────
SINGLE = {
    "daily": [
        {"id": "single_meal_plan", "name": "끼니 챙기기 (외식·배달 균형)", "category": "1인"},
    ],
    "weekly": [
        {"id": "single_groceries", "name": "장보기 (1인분 단위)", "category": "1인"},
        {"id": "single_meal_prep", "name": "밀프렙 / 반찬 준비", "category": "1인"},
    ],
    "monthly": [
        {"id": "single_bills", "name": "공과금·관리비 확인", "category": "1인"},
    ],
    "seasonal": [],
}

# ─────────────────────────────────────────────
# 2인 가구 (동거·부부, 아이 없음)
# ─────────────────────────────────────────────
COUPLE = {
    "daily": [
        {"id": "couple_share", "name": "오늘 집안일 분담 확인", "category": "2인"},
    ],
    "weekly": [
        {"id": "couple_groceries", "name": "장보기 (2인분 단위)", "category": "2인"},
        {"id": "couple_date_plan", "name": "주말 일정 공유", "category": "2인"},
    ],
    "monthly": [
        {"id": "couple_bills", "name": "공과금·관리비·생활비 정산", "category": "2인"},
        {"id": "couple_budget", "name": "공동 가계부 확인", "category": "2인"},
    ],
    "seasonal": [],
}

# ─────────────────────────────────────────────
# 맞벌이 가구 (시간 부족 → 자동화·외주 항목 추가)
# ─────────────────────────────────────────────
DUAL_INCOME = {
    "daily": [
        {"id": "dual_meal_plan", "name": "저녁 메뉴 결정 (밀키트/배달/요리)", "category": "맞벌이"},
    ],
    "weekly": [
        {"id": "dual_meal_prep", "name": "주말 밀프렙", "category": "맞벌이"},
        {"id": "dual_cleaning_service", "name": "청소 서비스/세탁 외주 점검", "category": "맞벌이"},
    ],
    "monthly": [
        {"id": "dual_subscription", "name": "구독 서비스 정리 (식자재·세탁 등)", "category": "맞벌이"},
    ],
    "seasonal": [],
}

# ─────────────────────────────────────────────
# 가족 (아이 있음)
# ─────────────────────────────────────────────
CHILD = {
    "daily": [
        {"id": "child_school", "name": "아이 등하원 / 등하교", "category": "아이"},
        {"id": "child_lunchbox", "name": "도시락 / 간식 준비", "category": "아이"},
        {"id": "child_homework", "name": "숙제·알림장 확인", "category": "아이"},
        {"id": "child_bath", "name": "아이 목욕·양치 챙기기", "category": "아이"},
    ],
    "weekly": [
        {"id": "child_laundry", "name": "아이 옷·체육복 빨래", "category": "아이"},
        {"id": "child_school_bag", "name": "가방·신발주머니 정리", "category": "아이"},
        {"id": "child_activity", "name": "주말 활동 계획 (놀이/외출)", "category": "아이"},
    ],
    "monthly": [
        {"id": "child_tuition", "name": "학원비·돌봄비 납부", "category": "아이"},
        {"id": "child_school_fee", "name": "학교 준비물·행사비", "category": "아이"},
        {"id": "child_height", "name": "키·몸무게 기록", "category": "아이"},
    ],
    "seasonal": [
        {"id": "child_clothes", "name": "아이 옷 사이즈 점검·교체", "category": "아이"},
        {"id": "child_vaccine", "name": "예방접종·건강검진", "category": "아이"},
        {"id": "child_school_supplies", "name": "새 학기 준비물", "category": "아이"},
    ],
}

# ─────────────────────────────────────────────
# 반려동물 - 강아지
# ─────────────────────────────────────────────
PET_DOG = {
    "daily": [
        {"id": "pet_dog_food", "name": "강아지 사료·물 챙기기", "category": "반려견"},
        {"id": "pet_dog_walk", "name": "산책 (최소 1회)", "category": "반려견"},
        {"id": "pet_dog_potty", "name": "배변 패드 교체·치우기", "category": "반려견"},
        {"id": "pet_dog_brush", "name": "빗질 (단모종은 격일)", "category": "반려견"},
    ],
    "weekly": [
        {"id": "pet_dog_bath", "name": "목욕 (또는 발 닦기 매일)", "category": "반려견"},
        {"id": "pet_dog_ear", "name": "귀·눈 청소", "category": "반려견"},
        {"id": "pet_dog_toy", "name": "장난감·식기 세척", "category": "반려견"},
    ],
    "monthly": [
        {"id": "pet_dog_heartworm", "name": "심장사상충 예방약", "category": "반려견"},
        {"id": "pet_dog_flea", "name": "외부 기생충 약", "category": "반려견"},
        {"id": "pet_dog_nail", "name": "발톱 깎기", "category": "반려견"},
    ],
    "seasonal": [
        {"id": "pet_dog_vaccine", "name": "예방접종 (연간 종합백신)", "category": "반려견"},
        {"id": "pet_dog_checkup", "name": "건강검진", "category": "반려견"},
        {"id": "pet_dog_groom", "name": "미용", "category": "반려견"},
    ],
}

# ─────────────────────────────────────────────
# 반려동물 - 고양이
# ─────────────────────────────────────────────
PET_CAT = {
    "daily": [
        {"id": "pet_cat_food", "name": "고양이 사료·물 챙기기", "category": "반려묘"},
        {"id": "pet_cat_litter", "name": "화장실 모래 치우기", "category": "반려묘"},
        {"id": "pet_cat_play", "name": "놀이 시간 (낚시대 등)", "category": "반려묘"},
    ],
    "weekly": [
        {"id": "pet_cat_brush", "name": "빗질 (장모종은 매일)", "category": "반려묘"},
        {"id": "pet_cat_litter_full", "name": "모래 전부 갈고 화장실 세척", "category": "반려묘"},
        {"id": "pet_cat_bowl", "name": "식기 세척", "category": "반려묘"},
    ],
    "monthly": [
        {"id": "pet_cat_nail", "name": "발톱 깎기", "category": "반려묘"},
        {"id": "pet_cat_flea", "name": "외부 기생충 약 (실내묘도 권장)", "category": "반려묘"},
        {"id": "pet_cat_weight", "name": "몸무게 체크", "category": "반려묘"},
    ],
    "seasonal": [
        {"id": "pet_cat_vaccine", "name": "예방접종", "category": "반려묘"},
        {"id": "pet_cat_checkup", "name": "건강검진", "category": "반려묘"},
        {"id": "pet_cat_dental", "name": "치아 점검", "category": "반려묘"},
    ],
}

# ─────────────────────────────────────────────
# 반려동물 - 기타 (햄스터·새·물고기·파충류 등 일반화)
# ─────────────────────────────────────────────
PET_OTHER = {
    "daily": [
        {"id": "pet_other_food", "name": "사료·먹이 챙기기", "category": "반려동물"},
        {"id": "pet_other_water", "name": "물 갈아주기", "category": "반려동물"},
    ],
    "weekly": [
        {"id": "pet_other_clean", "name": "케이지·어항 청소", "category": "반려동물"},
        {"id": "pet_other_check", "name": "건강 상태 관찰 (식욕·활동량)", "category": "반려동물"},
    ],
    "monthly": [
        {"id": "pet_other_full_clean", "name": "전체 세척 (바닥재 교체 등)", "category": "반려동물"},
    ],
    "seasonal": [
        {"id": "pet_other_vet", "name": "수의사 점검 (해당 시)", "category": "반려동물"},
        {"id": "pet_other_temp", "name": "온도·습도 환경 점검", "category": "반려동물"},
    ],
}

# ─────────────────────────────────────────────
# 식물
# ─────────────────────────────────────────────
PLANT = {
    "daily": [
        {"id": "plant_check", "name": "잎 상태 확인 (시들음·벌레)", "category": "식물"},
    ],
    "weekly": [
        {"id": "plant_water", "name": "물 주기 (종류별 주기 다름)", "category": "식물"},
        {"id": "plant_rotate", "name": "화분 위치·방향 돌리기", "category": "식물"},
    ],
    "monthly": [
        {"id": "plant_fertilizer", "name": "비료 / 영양제", "category": "식물"},
        {"id": "plant_dust", "name": "잎 먼지 닦기", "category": "식물"},
    ],
    "seasonal": [
        {"id": "plant_repot", "name": "분갈이 (봄·가을)", "category": "식물"},
        {"id": "plant_prune", "name": "가지치기", "category": "식물"},
        {"id": "plant_pest", "name": "해충 방제 (응애·깍지벌레 등)", "category": "식물"},
    ],
}


# 카테고리 매핑
CATEGORY_TEMPLATES = {
    "common": COMMON,
    "single": SINGLE,
    "couple": COUPLE,
    "dual_income": DUAL_INCOME,
    "child": CHILD,
    "pet_dog": PET_DOG,
    "pet_cat": PET_CAT,
    "pet_other": PET_OTHER,
    "plant": PLANT,
}

PERIODS = ["daily", "weekly", "monthly", "seasonal"]
PERIOD_LABELS = {
    "daily": "매일",
    "weekly": "주 1회",
    "monthly": "월 1회",
    "seasonal": "계절별",
}
