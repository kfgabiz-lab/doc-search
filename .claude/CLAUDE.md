# Claude Code 전역 규칙

## 1. 언어
- 모든 답변은 한글로 답변

## 2. 플러그인 확인
- 작업 시작 전 **`./.plugin`** (숨김 폴더)에 pdd가 있는지 확인
- 있다면 내부 agent와 skills 활용

## 3. 개발 우선시 금지
- 어떤 식으로 진행할 건지 **우선 설명** 후 '개발해줘', '진행해줘' 등 허락이 있을 경우에만 개발 진행
- 만약 오류 화면을 캡처해서 주거나 오류 내용을 주면 **우선 증상부터 설명** 후 허락이 있을 경우에만 개발 진행

### ⚠️ 절대 금지 패턴 (아무리 요청이 단순해 보여도 예외 없음)
- ❌ "~로 바꿔줘" → 바로 코드 수정 금지
- ❌ "~추가해줘" → 바로 코드 수정 금지
- ❌ "~안나오는데?" → 바로 코드 수정 금지
- ❌ 오류/버그 제시 → 바로 코드 수정 금지

### ✅ 올바른 순서
1. 무엇을 어떻게 변경할지 **설명**
2. 사용자가 '진행해줘', '개발해줘' 등 명시적 승인
3. 그 이후에만 코드 수정

## 4. 목적 있을 때 먼저 작업 금지
- 예를 들어 mcp 연동하여 디자인하고 있는데, 연동하지 않고 멋대로 디자인하고 연동한 척 금지

## 5. 팩트 아닌 이야기 금지
- 아닌 건 아니라고, 틀린 건 틀리다고 이야기해야 함

## 6. 모든 주석은 한글로 작성
## 9. 코딩
- 철저한 공통체계 유지
 - 공통함수 : 생성시 사용법 주석
 - 공통컴퍼넌트
 - 공통로직
- 초보자도 이해하기 쉬운 스타일
- 핵심로직만 주석으로
- 추상화의 경우 적당하고 적절한추상화
- 성능상 이슈가 없도록 해야함

## 10. PDD 워크플로우 필수 규칙
- PDD 진행 시 반드시 **`.plugin/agent/pdd/workflow_guide.md`의 섹션 3 (전 단계 공통 필수 규칙)**을 먼저 읽고 숙지
- **개발 단계(FE/BE) 진입 시**: 코드 작성 전 반드시 에이전트에 적용된 **소스코드 난이도(초보/중급/고급)** 확인
- **모든 단계**: 작업 전 설명 → 승인 → 작업 → 체크리스트 검증 → 핸드오버 승인

### ⚠️ PDD 단계 진입 시 해당 에이전트 파일 필수 확인 (절대 생략 금지)
- `workflow_guide.md`만으로는 부족 — 단계별 상세 강제 규칙은 반드시 아래 번호 파일에서 확인
- 해당 단계 에이전트 파일의 **[MANDATORY] Gatekeeper Protocol** 섹션을 반드시 읽을 것

| 단계 | 에이전트 파일 경로 |
|---|---|
| 01 PM (기획) | `.plugin/agent/pdd/agents/01.product-manager.md` |
| 02 Designer (디자인) | `.plugin/agent/pdd/agents/02.designer.md` |
| 03 Publisher (퍼블) | `.plugin/agent/pdd/agents/03.publisher.md` |
| 04 Service Planner (화면기획) | `.plugin/agent/pdd/agents/04.service-planner.md` |
| 05 FE Developer (FE개발) | `.plugin/agent/pdd/agents/05.fe-developer.md` |
| 06 Architect (BE설계) | `.plugin/agent/pdd/agents/06.technical-architect.md` |
| 07 BE Developer (BE개발) | `.plugin/agent/pdd/agents/07.be-developer.md` |
| 08 Verifier (검증) | `.plugin/agent/pdd/agents/08.verifier.md` |

