"""
voice-to-todo 핵심 파서
한국어 자연어 → (카테고리, 항목, 우선순위, 기한) 추출
"""

import re
from dataclasses import dataclass, asdict
from typing import Optional


# 카테고리 키워드 사전
# "왜 이렇게 했는지": 형태소 분석기 안 쓰고 키워드 매칭만으로 80점은 나오게
CATEGORY_KEYWORDS = {
    "장보기": [
        "사야", "사와", "사올", "사다", "구매", "장보", "장 보", "마트",
        "주문", "택배", "배송", "쇼핑",
        "휴지", "우유", "계란", "쌀", "물", "과일", "야채", "고기",
        "샴푸", "치약", "세제", "비누",
    ],
    "집안일": [
        "청소", "빨래", "설거지", "정리", "버리", "버려", "분리수거",
        "쓰레기", "세탁", "다림질", "환기", "걸레",
        "화장실", "주방", "거실", "방 정리",
    ],
    "업무": [
        "보고서", "회의", "미팅", "제출", "발표", "프레젠테이션", "PT",
        "이메일", "메일", "답장", "회신", "전화",
        "마감", "제안서", "기획안", "보고", "결재",
        "프로젝트", "과제", "리포트", "레포트", "논문", "스터디",
        "수업", "강의", "출석", "공부",
    ],
    "경조사": [
        "생일", "생신", "결혼", "결혼식", "장례", "조의", "축의",
        "돌잔치", "돌", "환갑", "칠순", "기일",
        "선물", "축하", "조문", "부조",
        "엄마", "아빠", "할머니", "할아버지", "이모", "고모", "삼촌",
    ],
}

# 우선순위 키워드
HIGH_PRIORITY = ["급", "빨리", "당장", "오늘", "내일까지", "마감", "긴급", "ASAP", "asap"]
LOW_PRIORITY = ["언젠가", "여유", "천천히", "나중에", "시간 날 때"]

# 기한 패턴
WEEKDAYS = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일",
            "월욜", "화욜", "수욜", "목욜", "금욜", "토욜", "일욜"]
RELATIVE_DATES = ["오늘", "내일", "모레", "글피", "이번 주", "이번주", "다음 주", "다음주",
                  "이번 달", "이번달", "다음 달", "다음달", "주말"]
DATE_PATTERN = re.compile(r"(\d{1,2})월\s*(\d{1,2})일")


@dataclass
class Todo:
    category: str
    item: str
    priority: str  # 상/중/하
    deadline: Optional[str]
    raw: str

    def to_dict(self):
        return asdict(self)


def split_input(text: str) -> list[str]:
    """
    여러 할 일이 한 덩어리로 들어왔을 때 분리.
    줄바꿈, 마침표, 쉼표, '그리고/하고' 기준으로 자른다.
    """
    if not text or not text.strip():
        return []

    lines = text.split("\n")
    result = []
    splitter = re.compile(
        r"(?<=[다요함])[\.\,]\s*"          # 종결어미 + 구두점
        r"|\s*하고\s*[\,]\s*"               # "~하고," 자체를 분리자로 소비
        r"|\s*그리고나서\s+"
        r"|\s*그리고\s+"
        r"|\s*그래서\s+"
        r"|\s+하고\s+(?=[가-힣])"           # "~하고 ~" (뒤가 한글일 때만)
    )
    leading_conj = re.compile(r"^(그리고|그래서|그러고|또한|또|그리고나서)\s+")

    for line in lines:
        parts = splitter.split(line)
        for p in parts:
            if not p:
                continue
            p = p.strip(" ,.~-")
            p = leading_conj.sub("", p).strip()
            if p:
                result.append(p)
    return result


def detect_category(text: str) -> str:
    """키워드 매칭으로 카테고리 결정. 매칭 없으면 '기타'."""
    scores = {cat: 0 for cat in CATEGORY_KEYWORDS}
    for cat, kws in CATEGORY_KEYWORDS.items():
        for kw in kws:
            if kw in text:
                scores[cat] += 1
    best_cat = max(scores, key=scores.get)
    if scores[best_cat] == 0:
        return "기타"
    return best_cat


def detect_deadline(text: str) -> Optional[str]:
    """기한 표현 추출. 못 찾으면 None."""
    m = DATE_PATTERN.search(text)
    if m:
        return f"{m.group(1)}월 {m.group(2)}일"
    for w in WEEKDAYS:
        if w in text:
            return w.replace("욜", "요일")
    for d in RELATIVE_DATES:
        if d in text:
            return d
    return None


def detect_priority(text: str) -> str:
    """우선순위 추정. 기본 '중'."""
    for kw in HIGH_PRIORITY:
        if kw in text:
            return "상"
    for kw in LOW_PRIORITY:
        if kw in text:
            return "하"
    # "왜 이렇게 했는지": "금요일까지 제출" 같은 명시적 마감은 사용자 머릿속에서 이미 '상' 취급.
    if "까지" in text and detect_deadline(text):
        return "상"
    return "중"


def extract_item(text: str, category: str) -> str:
    """
    항목명 추출. 종결어미·조사·기한·우선순위 키워드를 떼어낸다.
    형태소 분석기 없이 핵심 명사구만 남기는 휴리스틱.
    """
    item = text

    # 기한 표현 제거
    item = DATE_PATTERN.sub("", item)
    for w in WEEKDAYS + RELATIVE_DATES + HIGH_PRIORITY + LOW_PRIORITY:
        item = item.replace(w, "")

    # "~까지", "~안에" 같은 시간 조사 제거
    item = re.sub(r"까지|안에|전에|이내", "", item)

    # 종결어미 정리 (긴 표현부터 먼저)
    endings = [
        "해야 한다", "해야한다", "해야 함", "해야함", "해야 돼", "해야돼",
        "해야 해", "해야해", "해야겠다", "해야지",
        "사와야 돼", "사와야돼", "사와야 함", "사와야함", "사와야 해", "사와야해",
        "사야 돼", "사야돼", "사야 함", "사야함", "사야 해", "사야해",
        "사와야", "사와", "사오", "사올", "사기",
        "준비해야", "예약해야", "보내야", "내야",
        "도 해야", "도 사야",
        "하기", "보내기",
    ]
    for e in endings:
        item = item.replace(e, "")

    # 잡 조사·기호 정리
    item = re.sub(r"[을를이가는도에서의]\s*$", "", item.strip())
    item = re.sub(r"\s+", " ", item).strip(" .,~-")

    if not item:
        item = text.strip()

    return item


def parse_todo(text: str) -> Todo:
    """한 문장 → Todo 객체."""
    text = text.strip()
    category = detect_category(text)
    priority = detect_priority(text)
    deadline = detect_deadline(text)
    item = extract_item(text, category)
    return Todo(
        category=category,
        item=item,
        priority=priority,
        deadline=deadline,
        raw=text,
    )


def parse_batch(text: str) -> list[Todo]:
    """여러 줄/문장 입력 → Todo 리스트."""
    sentences = split_input(text)
    return [parse_todo(s) for s in sentences if s]
# end
