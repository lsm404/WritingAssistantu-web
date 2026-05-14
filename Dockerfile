# 基础镜像
FROM node:24-alpine

# 设置工作目录
WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制所有代码并构建
COPY . .
RUN npm run build

# 暴露 3001 端口
EXPOSE 3001

# 启动 Next.js 正式服务
CMD ["npm", "run", "start", "--", "-p", "3001"]
