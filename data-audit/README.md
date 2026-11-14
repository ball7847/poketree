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
원본 폼 항목: `form="cosmetic:<원본 폼 id>"`, `field="cosmetic.identifier"` 등의 필드를 사용한다.
진화 상세 원본 행: `form="evolution:<진화 행 id>"`, `field="evolution.trigger"`, `field="evolution.minimum_level"` 등 해당 원본 행에 존재하는 필드별로 구분한다.
기록에 없는 필드는 검증 완료로 추론하지 않는다.

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
보고서의 `totalFields`에는 **종족 공통 + 능력치 폼 1,351개 + 원본 폼 1,579개 + 진화 원본 행 676개**의 필드가 포함된다. 원본 폼과 능력치 폼은 별개의 식별자 공간이다.
이 단계는 웹게임에 네트워크 호출이나 데이터를 추가하지 않으며 `poketree-save-v1`을 유지한다.

## 2026-11-14 전체 자동 대조 결과 (프로토타입 검수)

`full-scan-report.json`은 전국도감 1,025종과 능력치 폼 1,351개를 전수 순회하고 외부 출처와 매칭 가능한 필드만 비교한 결과다. **38,534개 전부에 대한 최신 작품 검증 완료 보고서가 아니다.**

- Showdown 고정 커밋 `7e743761`: 1,292폼 × 8개(종족값 6+타입+특성) = 10,336개 비교. 59폼 매핑 미확정; 특수 폼 특성 관련 24개 불일치 후보. 메테노의 서로 다른 폼 수치 비교는 보류.
- 2026년 4월 챔피언스 자료 커밋 `cb874a30`: 안전한 폼 대응 256개 × 8개 = 2,048회 비교 시도. 개굴닌자 특성 `S` 슬롯을 제외한 2,047개 필드 일치·출처 개별 기록.
- 2026년 9월 챔피언스 M-C 자료: 신규 6폼 × 7개 = 42개 종족값/타입 비교, 모두 일치.
- 종족 공통 성비/진화 전 참조 1,025종 × 2개 = 2,050개 Showdown 비교. 14개 출처 모델 차이는 필드별로 별도 기록.
- **총 외부 출처 비교 시도 14,476회**. 서로 중복되는 필드가 있으므로 유일 필드 수나 100% 검수 진행률로 사용하지 않는다.
- 검증 개별 레코드는 총 **2,053건**(4월 자료 2,047 + 기존 메가입치트 6). 출처 검수 수와 현행 챔피언스 M-C 최신성은 구분한다.

개별 기록은 `verification-records.json`과 `records/champions-apr26-*.json` 12개 파일로 분할하였다. 파일을 개별로만 읽어 합계가 줄지 않도록 `scripts/audit-pokemon-data.cjs`가 자동 통합한다.

실행 명령:
```sh
node scripts/audit-pokemon-data.cjs --write
node scripts/compare-pokemon-references.cjs --write
node --test tests/*.test.cjs
```

두 번째 명령은 네트워크가 필요하며 고정된 외부 저장소 커밋을 내려받는다. 그 출처는 외부 커뮤니티 데이터이므로 정확성 검수에는 활용하되 2026년 11월 챔피언스 공식 최종 기준이라고 단정하지 않는다. 모든 비교 과정은 원본 `game/data/national-catalog.js` 및 플레이어 저장 데이터에 대한 쓰기 작업을 수행하지 않는다.
