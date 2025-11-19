# RAG 모듈 개요

Retrieval-Augmented Generation 기능과 관련된 코드를 한 곳에 모아 둔 모듈입니다.

## 주요 파일
- `rag.service.js`: 가이드라인 저장/임베딩/검색, Gemini 호출 등 핵심 비즈니스 로직.
- `rag.repository.js`: `rag_guidelines` 테이블을 다루는 DB 쿼리.
- `rag.controller.js`: Express 핸들러.
- `rag.router.js`: `/rag` 라우터(기존 `protect` 미들웨어로 보호).
- `rag.loader.js`: `src/rag/guidelines/` 폴더의 문서를 DB에 일괄 적재하는 헬퍼 스크립트.
- `gemini.js`: `@google/generative-ai` 래퍼(임베딩 + 제안 생성).

## 가이드라인 데이터
개발 단계에서는 `backend/src/rag/guidelines/` 폴더에 Markdown/텍스트 파일을
넣고 `node src/modules/rag/rag.loader.js`를 실행하면 `rag_guidelines` 테이블에
자동으로 적재됩니다. 운영 환경에서는 관리자 API나 마이그레이션을 사용하는
편이 좋습니다.

추천 테이블 스키마:

```sql
CREATE TABLE rag_guidelines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  embedding JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Gemini 설정
- `backend/.env`에 `GEMINI_API_KEY`를 추가합니다.
- 옵션: `GEMINI_MODEL`(기본값 `gemini-1.5-pro`), `GEMINI_EMBED_MODEL`(기본값 `text-embedding-004`).

## API 엔드포인트

모든 라우트는 인증을 요구하며 `/api/v1/rag` 아래에 있습니다.

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/guidelines` | 저장된 가이드라인 메타데이터 목록 조회 |
| POST | `/guidelines` | `{ title, content }`로 가이드라인 생성(서버가 자동 임베딩) |
| PATCH | `/guidelines/:id` | 제목/내용 수정(내용 변경 시 재임베딩) |
| POST | `/guidelines/retrieve` | `{ prompt, limit }`로 유사 가이드라인 조회 |
| POST | `/tips` | `{ prompt, limit?, temperature?, topP?, maxOutputTokens? }` → Gemini가 생성한 제안과 사용된 가이드라인 반환 |
