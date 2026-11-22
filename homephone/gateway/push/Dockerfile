FROM node:22-alpine
WORKDIR /app
COPY server.js ./
# مجلد البيانات يجب أن يكون قابلاً للكتابة من المستخدم غير الجذر
RUN mkdir -p /data && chown node:node /data
USER node
CMD ["node", "server.js"]
