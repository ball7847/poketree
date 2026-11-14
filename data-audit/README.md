# 포켓몬 원작 데이터 검증 구조 (2026-11-14)

## 범위
이 단계는 **검증 기록 구조만** 추가한다. 종족값·폼·특성·진화·전투 로직과 저장 파일을 수정하지 않는다.
기존 `game/data/national-catalog.js`는 고정 PokeAPI 스냅샷이다. 스냅샷 일치는 원작 작품별 검증을 뜻하지 않는다.
게임 실행용 `game/data/provenance.js`의 기존 키는 보존하며 감사 파일 위치만 명시한다.

## 저장 위치
- `data-audit/verification-schema.json`: 종족/폼/필드별 출처 기록 계약.
- `data-audit/verification-records.json`: 희소(sparse) 개별 검증 기록. 빈 배열은 **전부 미검증**임을 의미한다.
- `data-audit/verification-report.json`: 명령 실행 후 생성되는 집계 결과. 자동 산출물이며 검수 증거가 아니다.
- `scripts/audit-pokemon-data.cjs`: 저장소 로컬 데이터를 읽어 구조·기록 일관성을 검사하는 Node 스크립트.
- `tests/provenance.test.cjs`: 검증 상태/폼 분리/출처 제약 회귀 테스트.

## 필드 경로
공통(폼=null): `name`, `dex`, `genderRate`, `growth`, `baseExp`, `evolvesFrom`, `evolutionChain`.
각 폼: `types`, `base.hp`, `base.attack`, `base.defense`, `base.spAttack`, `base.spDefense`, `base.speed`, `abilities`, `baseExp`.
실제 진화 조건의 상세 경로와 원본 폼(능력치 변형과 별도)의 종류별 검증은 후속 검수 때 스키마 버전 갱신 후 추가한다. 기록에 없는 필드는 검증 완료로 추론하지 않는다.

## 증거 입력
레코드 필수값: `species`, `field`, `status`, `checked`, `source`, `version`, `reference`.
폼 필드는 `form`에 실제 카탈로그 폼 ID를 지정한다. 공통 필드는 생략 또는 `null`.
값을 확인하지 않았으면 레코드를 추가하지 않거나 `unverified/checked:false`로 둔다.
검증 사실을 기록할 때는 출처 URL과 작품(`champions`, 9..1), 근거를 요구한다.
상태: `unverified`, `verified`, `mismatch`, `unavailable`, `not_applicable`.
불일치는 **기존 스냅샷과 근거의 차이**이며 오류 확정이 아니다.
`verified`인 레코드도 상위 작품이 없음을 증명하지는 못하므로 낮은 버전으로 자동 대체하지 않는다.
작품 우선순위: `champions > 9 > 8 > ... > 1`. 출처 자체가 실제 작품 자료인지 사람 검토가 필요하다.

## 실행
```sh
node scripts/audit-pokemon-data.cjs
node scripts/audit-pokemon-data.cjs --write
node --test tests/*.test.cjs
```
결과 `errors`가 0이어야 구조 검증을 통과한다. `unverified`는 결함 숫자가 아니라 향후 검수 규모다.
보고서의 `totalFields`는 현재 **종족 공통 + 등록된 능력치 폼** 검증 대상 수이지 원본 폼 항목 1,579개를 모두 독립 검증했다는 뜻이 아니다.
이 단계는 웹게임에 네트워크 호출이나 데이터를 추가하지 않으며 `poketree-save-v1`을 유지한다.
