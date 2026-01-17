# CodeViz

GitHub 레포를 입력받아 코드 구조를 분석하고 3D로 시각화하는 소셜 플랫폼 백엔드

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

- **Web Backend**: Next.js 14 (App Router), TypeScript, Prisma
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **Worker**: Python 3.11, RQ (Redis Queue)
- **Storage**: AWS S3
- **Auth**: Kakao OAuth + Session Cookies

## 로컬 개발 환경 설정

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

### 3. 데이터베이스 및 Redis 시작

```bash
docker-compose up -d db redis
```

### 4. Web 서버 실행

```bash
cd apps/web
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 5. Worker 실행 (별도 터미널)

```bash
cd apps/worker
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m src.worker
```

## Docker Compose로 전체 실행

```bash
# 빌드 및 실행
docker-compose up --build

# 백그라운드 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f web
docker-compose logs -f worker

# 종료
docker-compose down
```

## API 엔드포인트

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

### Uploads
- `POST /api/v1/uploads` - Presigned URL 발급

## EC2 배포 가이드

### 1. EC2 인스턴스 준비

- Ubuntu 22.04 LTS 권장
- t3.medium 이상 (2 vCPU, 4GB RAM)
- 보안 그룹: 22 (SSH), 80/443 (HTTP/HTTPS), 3000 (앱) 포트 열기

### 2. Docker 설치

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
# 재로그인 필요
```

### 3. 코드 배포

```bash
git clone <your-repo> /home/ubuntu/codeviz
cd /home/ubuntu/codeviz
```

### 4. 환경 변수 설정

```bash
cp .env.example apps/web/.env
cp .env.example apps/worker/.env
# nano 또는 vim으로 각 .env 파일 수정
```

### 5. 실행

```bash
docker-compose up -d --build
```

### 6. Nginx 리버스 프록시 (선택사항)

```bash
sudo apt install nginx
```

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
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/codeviz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 데이터베이스 마이그레이션

개발 환경:
```bash
cd apps/web
npx prisma migrate dev
```

프로덕션 환경:
```bash
cd apps/web
npx prisma migrate deploy
```

## 문제 해결

### Worker가 Job을 처리하지 않음
1. Redis 연결 확인: `docker-compose logs redis`
2. Worker 로그 확인: `docker-compose logs worker`
3. 큐 상태 확인: `redis-cli LLEN codeviz:jobs`

### 데이터베이스 연결 오류
1. PostgreSQL 상태 확인: `docker-compose logs db`
2. DATABASE_URL 환경 변수 확인

### S3 업로드 실패
1. AWS 자격 증명 확인
2. S3 버킷 권한 확인 (PutObject, GetObject)

## 라이선스

MIT
