# SUTRA / LAB — 16개 수트라 탐색실

사용자가 선택한 학습 방식은 **16개 규칙 자유 탐색**이다. 강제 순서·제한 시간 없이 각 규칙의 숫자를 바꾸고, 계산을 단계별로 열어 보며, 도식과 적용 조건을 확인한다. 앞선 블로그 카드16장과 검증된 예제를 바탕으로 만든다.

호스트 선택: 의존성 없는 HTML·CSS·ES modules, 한국어, 밝은 종이색/코발트/라임 포인트의 대담한 수학 실험실. 원전의 고대 기원을 단정하지 않으며9·13·16심화,11교육용확장,15검산한계를 구분한다. 현재 요청에는 배포가 없으므로 로컬 미리보기와 전달 ZIP만 만든다. chatgpt.site/Sites 등록·저장·배포 금지.

고려한 방식: 순차학습·퀴즈는 체계적이나 원하는 규칙에 바로 가기 어렵고, 시간제 게임은 숙고를 방해한다. 사용자 선택인 자유 탐색은 홈16개 선택/필터/즉시체험으로 구현한다. 부가적으로 풀이단계를 여는 기능,예제초기화,방문한규칙기록,학습카드보기 제공.

## 화면

- `#/`: 큰 계산 시각물과16규칙 전체목록, 카테고리·검색·둘러본규칙수.
- `#/sutra/01`부터`#/sutra/16`: 숫자조작,실시간도식·결과,펼치는계산단계,적용범위,원전링크,카드이미지 보기.
- `#/about`: 체계의 배경·번역과적용범위·출처. 별도 강제완료/경쟁순위 없음.
- 알 수 없는 hash는 실제앱내404화면, 실제없는자산/API는서버404.

## 웹앱6원칙

책임별 JS·CSS레이어·Screen/Service클래스·비동기JSONloading/error/retry/취소경합·hash단일진입라우팅·열린탭배포갱신보호. HTML로드build와신선한version.json의동일성을비교한다. 새버전/롤백감지후다음깨끗한이동에서query를바꿔full-document이동,dirty/save중이면입력보존.해시변경만으로full-document라고주장하지않는다.내용해시자산과기존자산보존빌드.로컬서버no-cacheHTML/no-storeversion/data와정적404.

## 모듈 계약

`data/sutras.json`은배열16개. 레코드: `{id:'01',name,title,summary,category:'기초'|'응용'|'심화',tags:[],tip,condition,defaults:{...},controls:[{key,label,type:'range'|'number'|'select',min,max,step,options:[{value,label}]}],visual,sourceUrl,cardPath:'cards/card-01.webp'}`.

`src/js/domain/math.js` export `evaluateSutra(id, values={})`: 유효하면 `{valid:true,equation,answer,steps:[{title,math,detail?}],diagram:{kind,...},insight?,warning?}`. 잘못된영역은 `{valid:false,error}`; 문자열eval금지. 각입력은유한수/정수/범위를검증한다. 실제허용값/기본값은catalog와일치한다.

도식종류: `concat`(left,right,n),`complement`(digits,upper,result),`cross`(a,b,ones,tens,hundreds,carry),`balance`(rows:[string]),`square`(p,total),`growth`(x,h),`symmetric`(x,gap),`remainders`(denominator,multiplier,digits,remainders,products),`progression`(delta,labels:[4]),`check`(left,right,match),`rectangle`(width,height,rate). 이름이같으면필드추가허용. 렌더러는escape후SVG/HTML을반환한다.

`src/js/ui/diagrams.js` export `renderDiagram(diagram)` ->HTML문자열. UI는model필드를추정하지않고지원하지않는kind는텍스트fallback.

`src/js/services/VersionService.js`: constructor `{loadedBuild,versionURL,fetcher}`, async `check()` -> `{changed,build?,error?}`; async `beforeNavigate(target,{isDirty,isSaving,commit,notify,replace=false})` -> `'blocked'|'document'|'spa'`. 비동기 확인 뒤 dirty·saving 상태를 다시 읽는다. 백그라운드 검사는 새로고침하지 않는다. 전체 문서 이동에는 `_build`와 고유한 `_nav` query를 사용한다. 잘못된 버전 응답에도 현재 앱을 사용할 수 있다. 기본 fetch는 전역 객체에 바인딩한다.

`src/js/services/ProgressService.js`: constructor(storage), `load()`, async `save(id,values)`, `visited` Set, `values` object, `saving` boolean, `error` string|null. 손상된 저장값·비공개 브라우저의 저장 예외를 처리한다. 현재 편집값과 명시적으로 저장한 값을 구분한다.

`src/js/services/CourseService.js`: constructor({url,fetcher}), async `load({signal}={})` -> 배열16. HTTP·스키마 오류를 처리하고 AbortSignal을 지킨다. 기본 fetch는 전역 객체에 바인딩한다.

Root owns app/screens/build/server/testsintegration/README. Mathagent ownsdomainmath+catalog+mathtests. Designagent ownsCSS+index.template.html+diagrams only. Runtimeagent owns3services+servicetests only. Agents do notgitcommit/sharedvaultedit.

## 検証

수식은 독립적인 정수·유리수 계산으로 검증한다. 16종 실제 조작, 320/390/768/1440 폭, 직접 링크·새로고침·Back/Forward·404, 로딩·오류·경합, 저장 실패, 열린 A→B·롤백, 확인 중 입력·저장 진행 상태를 실제 브라우저에서 검증한다. 배포처 CDN과 네이티브 BFCache 복원은 미검증으로 구분한다. 독립 에이전트가 최종 코드·수학·산출물을 재검증한다.
