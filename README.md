# CodeViz

GitHub 레포를 입력받아 코드 구조를 분석하고 3D로 시각화하는 소셜 플랫폼

## 주요 기능

- GitHub 레포 URL 입력 → 코드 구조 분석 → 3D 시각화
- Kakao OAuth 로그인
- 분석 결과를 게시글로 공유
- 좋아요, 댓글, 팔로우 등 소셜 기능
- 프로필 관리

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose                          │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│   web       │   worker    │     db      │      redis       │
│  (Next.js)  │  (Python)   │ (Postgres)  │                  │
│  Port 3000  │             │  Port 5432  │    Port 6379     │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       └─────────────┴─────────────┴───────────────┘
                           │
                      AWS S3 (External)
```

## 기술 스택

- **Frontend**: Next.js 14, React, Three.js, `@react-three/fiber`, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Prisma ORM
- **Worker**: Python (AST Analysis), Redis RQ
- **Database**: PostgreSQL, Redis
- **Infrastructure**: AWS S3 (Storage), Docker & Docker Compose
- **Authentication**: Kakao OAuth

## 👥 팀원

- **강승수**: [SEUNGSUKANG2001](https://github.com/SEUNGSUKANG2001)
- **고건영**: [koheon2](https://github.com/koheon2)

---

## 💻 로컬 개발 환경 설정

### 1. 사전 요구사항

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- AWS S3 버킷 (선택사항, mock 사용 가능)

### 2. 환경 변수 설정

```bash
# 루트 디렉토리에서
cp .env.example apps/web/.env
cp .env.example apps/worker/.env
```

각 `.env` 파일을 열어 실제 값으로 수정하세요.

### 3. Docker Compose로 전체 실행

```bash
# 빌드 및 실행
docker compose up --build

# 백그라운드 실행
docker compose up -d
```

### 4. 수동 실행 (개발용)

**Web 서버:**
```bash
cd apps/web
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

**Worker:**
```bash
cd apps/worker
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m src.worker
```

---

## 🔌 API 엔드포인트

### Auth
- `GET /api/v1/auth/kakao/start` - Kakao OAuth 시작
- `GET /api/v1/auth/kakao/callback` - OAuth 콜백
- `GET /api/v1/auth/me` - 현재 사용자 정보
- `POST /api/v1/auth/logout` - 로그아웃

### Projects
- `POST /api/v1/projects` - 프로젝트 생성 + 분석 Job 큐잉
- `GET /api/v1/projects?scope=mine` - 내 프로젝트 목록
- `GET /api/v1/projects/{id}` - 프로젝트 상세
- `PATCH /api/v1/projects/{id}` - 프로젝트 수정
- `DELETE /api/v1/projects/{id}` - 프로젝트 삭제

### Jobs
- `POST /api/v1/projects/{id}/jobs` - 재분석 Job 생성
- `GET /api/v1/projects/{id}/jobs/latest` - 최신 Job 상태
- `GET /api/v1/analysis-jobs/{id}/result-url` - 분석 결과 Presigned URL 발급

### Snapshots & Posts
- `POST /api/v1/projects/{id}/snapshots` - 스냅샷 생성
- `POST /api/v1/posts` - 게시글 생성
- `GET /api/v1/posts?scope=mine` - 내 게시글 목록
- `GET /api/v1/posts/{id}` - 게시글 상세
- `GET /api/v1/feed` - 공개 피드

### Social
- `GET /api/v1/posts/{id}/comments` - 댓글 목록
- `POST /api/v1/posts/{id}/comments` - 댓글 작성
- `DELETE /api/v1/comments/{id}` - 댓글 삭제
- `POST /api/v1/posts/{id}/like` - 좋아요 토글
- `POST /api/v1/users/{id}/follow` - 팔로우 토글

### Users
- `GET /api/v1/users/me` - 내 프로필
- `PATCH /api/v1/users/me` - 프로필 수정
- `GET /api/v1/users/{id}` - 사용자 프로필
- `GET /api/v1/users/{id}/posts` - 사용자 게시글

---

## ☁️ EC2 배포 가이드

### 1. Docker 설치 및 설정
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
# 재로그인 후 적용
```

### 2. 실행 가이드
```bash
git clone <your-repo>
cd codeviz
cp .env.example apps/web/.env
cp .env.example apps/worker/.env
# .env 수정 후
docker-compose up -d --build
```

### 3. Nginx 리버스 프록시 설정
`/etc/nginx/sites-available/codeviz`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

---

## 🛠 문제 해결 (Troubleshooting)

### Worker가 Job을 처리하지 않음
1. Redis 연결 확인: `docker-compose logs redis`
2. Worker 로그 확인: `docker-compose logs worker`
3. 큐 상태 확인: `redis-cli LLEN codeviz:jobs`

### S3 CORS 설정
브라우저에서 그래프 데이터를 가져오지 못하는 경우 S3 버킷에 아래 CORS 설정이 필요합니다.

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 🏗 프로젝트 구조

```text
codeviz/
├── apps/
│   ├── web/                    # Next.js 앱 (Frontend + Backend API)
│   │   ├── src/
│   │   │   ├── app/            # App Router pages & API routes
│   │   │   ├── components/     # React components
│   │   │   └── lib/            # Utilities (auth, prisma, s3, etc.)
│   │   ├── prisma/             # Database schema & migrations
│   │   └── Dockerfile
│   └── worker/                 # Python RQ Worker
│       ├── src/
│       │   ├── jobs/           # Job handlers
│       │   └── services/       # DB, S3, analyzer services
│       └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 📄 라이선스

MIT License
