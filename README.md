# PromptLab  
**프롬프트를 자산처럼 버전관리하고, 팀과 함께 운영(PromptOps)하는 플랫폼**

PromptLab은 "AI가 멍청한 게 아니라, 질문이 멍청한 것"이라는 문제 인식에서 시작했습니다.  
프롬프트를 **작성·공유·버전관리·추천·실행**까지 한 번에 해결하는 올인원 PromptOps 플랫폼입니다.

## 👥 Team Members

| Name | Role | Responsibilities |
|------|------|------------------|
| 정진형 | PM / Fullstack | 기획 · 디자인 · FE(Zustand/Router/Playground/Team/PromptRepo) · BE(RAG Tips)구현 |
| 김회광 | Frontend |  |
| 박세인 | Backend |  |
| 유민아 | Backend |  |


<img width="624" height="880" alt="스크린샷 2025-11-25 오전 2 01 24" src="https://github.com/user-attachments/assets/b5719b66-3f22-4644-88ad-fa8fdb1dd95f" />

---

# 1. 문제 인식 (Problem)

AI는 이미 업무의 중심에 자리 잡았습니다.  
하지만 **“AI가 똑똑하지 않다”**고 느끼는 이유는 대부분 **질문(프롬프트)의 질** 때문입니다.

- 같은 모델이라도 **질문 순서/조건/문맥**에 따라 답변 품질은 천차만별  
- 좋은 프롬프트를 알아도 **어디에 저장해야 할지**, **어떻게 공유할지** 애매함  
- 팀은 각자 따로 ‘꿀 프롬프트’를 사용 → 지식이 자산화되지 않음  
- 결과적으로 **AI 잘 쓰는 사람 vs 못 쓰는 사람**의 격차(AI Divide)가 점점 커짐

AI 도구의 성능이 아니라, **프롬프트 활용 역량의 문제**입니다.  
PromptLab은 이 격차를 줄이는 플랫폼입니다.

---

# 2. 솔루션 (Solution)

PromptLab은 **프롬프트를 잘 쓰게 만드는 운영 체계(PromptOps)** 를 제공합니다.

- 프롬프트를 **저장·관리·버전별로 기록**
- 팀과 **공유·협업**
- 프롬프트 자동 개선 (**RAG 기반 Prompt Tips**)
- 직무별 **추천 프롬프트 제공**
- Playground에서 실행/히스토리/저장까지

단순 노트가 아니라, **프롬프트의 GitHub**를 지향합니다.

---

# 3. 핵심 기능 (Key Features)

### 1) 프롬프트 저장소 (Repository)
- 최신/인기/태그/카테고리 필터

### 2) 버전 관리 (Versioning)
- 프롬프트 생성 시 `v1` 자동 생성  
- 이후 버전 추가·수정·삭제  
- 버전별 모델 세팅 가능  
  - temperature, max tokens, LLM Models

### 3) Playground
- 모델 선택 (ChatGPT / Gemini)
- 히스토리 저장·로드 
- “결과 → 프롬프트로 저장”
- **Prompt Tips** 버튼 (RAG 기반 개선 제안)

### 4) RAG 기반 Prompt Tips
- Markdown 가이드(OpenAI, Google 등 공식 가이드라인) → DB 적재  
- 입력 프롬프트 임베딩  
- DB에서 유사 가이드 검색  
- 선택된 가이드를 컨텍스트로 Gemini 호출  
- bullet 개선안 + “수정 프롬프트” 제공

### 5) Workspace / Team
- 팀 생성·수정·삭제  
- 초대·역할 변경  
- 워크스페이스별 프롬프트 권한 관리  
- 팀만의 공유 프롬프트 공간
---

# 4. 기술 구조 (Tech Architecture)

<img width="2901" height="1344" alt="KakaoTalk_Photo_2025-11-20-12-52-53" src="https://github.com/user-attachments/assets/3a688bbf-64db-4c29-8db1-96264a203035" />

## 🔹 Frontend (React / TypeScript)
- Vite 기반 React 앱
- 전역 관리: Zustand(useAppStore)
- Axios 인터셉터에 자동 인증 토큰 부착
- Playground / Tips / Workspace UI 등

## 🔹 Backend (Node.js / Express)
- REST API 전체 관리 (Auth / Workspace / Prompt / Tips / Comments / Alerts)
- `/api/v1/rag/*` 경로에 RAG 모듈 탑재
- 보호 미들웨어(protect)로 인증된 사용자만 접근

## 🔹 Database (MySQL)
- 사용자 / 워크스페이스 / 프롬프트 / 버전 / 히스토리  
- `rag_guidelines` 테이블에 가이드 문서 + 임베딩(JSON) 저장  
- `rag.loader.js`로 Markdown을 자동 적재

