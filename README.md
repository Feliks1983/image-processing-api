Настройка
1. Инициализация проекта
mkdir image-processing-api
cd image-processing-api
npm init -y
npm install express multer sharp cors helmet morgan axios form-data
npm install -D typescript @types/express @types/multer @types/cors @types/morgan nodemon ts-node @types/node
npm install express-rate-limit
npm install ioredis

Сам Redis тоже должен быть запущен, через Docker:
Загрузить и установить Docker
Проверить в терминале docker --version
Если Docker установлен и запущен, выполни: docker run -d --name redis-cache -p 6379:6379 redis:7-alpine
Если контейнер уже существует, запусти его вместо создания нового:
docker start redis-cache
Проверить подключение можно командой: docker exec -it redis-cache redis-cli ping
Ожидаемый ответ: PONG

curl http://localhost:3000/health

curl -X POST -F "file=@/path/to/file.jpg" http://localhost:3000/api/upload/single
key'file' type'File'

curl -X POST -F "files=@file1.jpg" -F "files=@file2.pdf" http://localhost:3000/api/upload/multiple
key'files' type'File'

curl http://localhost:3000/api/upload/file/filename.jpg

curl http://localhost:3000/api/upload/files

curl -X DELETE http://localhost:3000/api/upload/file/filename.jpg

curl -X POST -H "Content-Type: application/json"
curl http://localhost:3000/api/upload/responsive
upload + generate thumbnail/small/medium/large/xlarge (webp)
key'image' type'File'

curl -X POST -H "Content-Type: application/json"
http://localhost:3000/api/process/:filename

curl -X POST -H "Content-Type: application/json" -d '{ "text", "position", "opacity", "fontSize" }' http://localhost:3000/api/process/watermark/:filname

curl -X POST -H "Content-Type: application/json"
http://localhost:3000/api/process/convert/:filename`
{ "format", "quality" }

curl -X POST -H "Content-Type: application/json"
http://localhost:3000/api/process/thumbnail/:filname
{ "size", "format" }

curl http://localhost:3000/api/process/metadata/:filname

curl http://localhost:3000/processed/:file

curl http://localhost:3000/api/process/images/car.jpg?width=300&height=200

Команда `npm run test:api` создает файл `test-image.jpg` (если он отсутствует), а затем выполняет проверку эндпоинтов, отвечающих за загрузку, обработку, конвертацию, создание миниатюр, наложение водяных знаков, работу с метаданными и адаптивные изображения. Чтобы посмотреть пример фронтенда, откройте файл `index.html` в браузере.

### Transform options (`POST /api/process/:filename`)
`width`, `height` (1-5000), `fit` (cover, contain, fill, inside, outside), `withoutEnlargement`, `format` (jpeg, png, webp, avif), `quality` (1-100), `sharpen`, `blur` (0.3-100), `grayscale`, `rotate` (-360..360), `flip`, `flop`.
Unknown options are rejected. Quality has no effect for PNG.

### Watermark options
`text` (1-50 chars), `position` (northwest ... southeast, default `southeast`), `opacity` (0.1 or 1, default 0.6), `fontSize` (8-200, default 32; auto-shrunk to fit the image), optional `format`, `quality`.

