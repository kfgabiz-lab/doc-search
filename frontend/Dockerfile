# Next.js 프론트엔드 Docker 이미지

FROM node:20-alpine

WORKDIR /app

# 의존성 먼저 복사 (캐시 활용)
COPY package.json ./
RUN npm install

# 소스 복사
COPY . .

# 빌드
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
