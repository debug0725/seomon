# 瑞門 · 잔월의 결계 — Vercel 배포판

현재 게임을 Vercel에 올릴 수 있도록 만든 프로젝트입니다. 게임 화면과 로직은 기존 버전 그대로이며, public 폴더를 바로 배포하도록 구성했습니다. 외부 패키지 설치나 배포 빌드가 필요하지 않습니다.

이번 수정본은 ZIP 안에 한 겹 더 있던 프로젝트 폴더를 없앴습니다. 압축 안에 vercel.json, package.json, public 폴더가 바로 보입니다. 수정 전 ZIP의 dist 출력 설정은 사용하지 않습니다.

## 포함된 기능

- 이름·두상·가문 설정, 가문별 의뢰 메시지
- 서울 상공·폐신당·학교 탐색과 단서 수집
- 7×7 이동 전투, 부적·스킬 봉쇄·결계 보수·전투 튜토리얼
- 5초 동안 새로운 한글 10글자로 결계 세우기
- 플레이어 궁극기, 백귀야행·적월단공, 서문단의 일회 보호 연출
- 투명한 튜토리얼 창, 하단 타이핑 대사, 전투 배경음악과 작은 음악 버튼

혼자 플레이하는 현재 구성은 별도 데이터베이스나 로그인 서버 없이 실행됩니다. 폐기된 협동 레이드 주소는 410 응답을 반환합니다.

## Vercel에 올리기

1. ZIP을 빈 폴더에 풀고 **압축을 푼 파일과 폴더 전부**를 GitHub 저장소의 최상위에 올립니다. 저장소 첫 화면에서 vercel.json, package.json, public 폴더가 보여야 합니다. ZIP 파일 자체를 올리는 방식이 아닙니다.
2. Vercel에서 **Add New → Project**로 그 저장소를 가져옵니다.
3. Framework Preset은 **Other**를 선택하고 Root Directory는 **./ (저장소 최상위)**로 둡니다. 기존 저장소에서 다른 폴더 안에 파일을 올렸다면 vercel.json과 package.json이 있는 그 폴더가 Root Directory입니다. public 폴더 자체를 Root Directory로 선택하지 마세요.
4. Build Command는 **Override를 켜고 빈칸**, Output Directory는 **public**입니다. vercel.json에도 같은 값이 들어 있습니다. 수정 전 프로젝트를 재사용하는 경우 dist 설정을 지우고 public으로 바꿔 주세요.
5. 배포 공개 범위를 확인한 뒤 **Deploy**를 누릅니다.

이 파일을 준비하는 과정에서 Vercel 계정에 접속하거나 실제 사이트를 배포하지는 않았습니다. 기존 사이트에도 변경을 가하지 않았습니다.

## 로컬 확인

Node.js가 설치된 환경에서 프로젝트 폴더를 열고 실행합니다. npm install은 필요하지 않습니다.

```bash
npm run check
npm run build
```

check는 이미지·폰트·모듈 경로, JavaScript 문법, 첫 화면 배포 경로, 보안 헤더와 종료된 레이드 API를 확인합니다. build도 같은 확인만 하며, public 폴더를 그대로 배포할 수 있습니다. 원본 파일과 바이트까지 같은지 확인하려면 npm run check:original을 실행할 수 있습니다.

파일을 더블클릭하는 file:// 방식은 ES 모듈 게임을 실행하지 못합니다. 실제 플레이 확인은 Vercel의 HTTPS 주소에서 진행하세요.

## 404 NOT_FOUND가 뜬 경우

오류 문구만으로 원인을 확정할 수는 없습니다. 배포한 주소와 프로젝트 설정을 함께 확인해야 합니다.

1. GitHub 저장소의 최상위에 ZIP 파일만 올라가 있지 않은지 확인합니다. 실제 public/index.html과 게임 파일이 있어야 합니다.
2. Vercel에서 Framework Preset은 Other, Root Directory는 vercel.json이 있는 폴더, Build Command는 빈칸, Output Directory는 public인지 확인합니다.
3. 변경한 파일을 올리고 새로 배포합니다. 설정만 저장한 뒤 이전 배포 주소를 계속 보는 경우에는 변경이 적용되지 않습니다.
4. 최신 배포 상태가 Ready인지 확인하고 그 배포의 Visit 버튼으로 접속합니다. 주소 끝에 /public 또는 /dist를 붙이지 않습니다.

최신 배포의 /index.html도 404라면 첫 화면이 배포 출력에 없는지 또는 주소가 다른 배포를 가리키는지 확인해야 합니다. /index.html은 열리는데 /만 안 열리면 루트 경로 설정을 확인합니다. 이 수정본은 /를 /index.html로 연결합니다.

## 이전할 때 알아둘 점

- 이름·가문·두상은 브라우저 localStorage에 저장됩니다. 주소가 바뀌면 기존 사이트의 저장 정보가 자동으로 따라오지 않습니다. 새 주소에서 다시 설정할 수 있습니다.
- 전투 음악은 자동 재생을 시도합니다. iPhone·브라우저의 소리 자동 재생 제한은 호스팅을 바꿔도 적용되며, 막히면 작은 음악 버튼을 한 번 눌러 재생할 수 있습니다.
- 기존 사이트의 접근 권한 설정은 Vercel로 이전되지 않습니다. 비공개로 운영하려면 Vercel 프로젝트의 Deployment Protection 설정에서 배포 주소별 접근 범위를 확인하세요. 사용자별 로그인 시스템은 이 배포판에 추가되지 않았습니다.
- 보안 헤더와 입력 검증은 유지했습니다. 모든 취약점이 없다는 인증이나 실제 Vercel·iPhone에서의 재생 검증을 뜻하지는 않습니다.

## 구조와 수정

- public/index.html: 게임 화면
- public/game.css, public/novel.css: 디자인과 연출
- public/content.js: 조사·튜토리얼 문구
- public/engine.js: 전투·결계 규칙
- public/battle-music.js: 전투 음악
- api/raid.mjs: 종료된 협동 레이드 응답
- vercel.json: public 출력 설정, 첫 화면 연결, HTTP 보안 헤더

asset-manifest.json은 이번 내보내기 원본 파일의 무결성 확인용입니다. 게임 파일을 수정한 뒤에는 일반 check와 build를 사용하면 됩니다. check:original은 의도적으로 수정하지 않은 배포판을 확인할 때만 사용하세요.

기준 버전: 156a070776d49f49b2b1f5c89f99e0ddfa9f7494

Vercel 공식 문서: [프로젝트 설정](https://vercel.com/docs/project-configuration/vercel-json), [Node.js API 함수](https://vercel.com/docs/functions/runtimes/node-js), [접근 보호](https://vercel.com/docs/deployment-protection)
