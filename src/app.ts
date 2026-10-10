import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import { CACHE_DIR, MAX_FILE_SIZE, PROCESSED_DIR, UPLOAD_DIR } from './config/multer';
import { router as uploadRoutes } from './routes/upload';
import { router as processRoutes} from './routes/process';
import { getProcessedImage } from './utils/helpers';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));
app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message === 'Request aborted') return;})
for (const dir of [UPLOAD_DIR, PROCESSED_DIR, CACHE_DIR]) fs.mkdirSync(dir, { recursive: true });
app.get('/uploads', express.static('uploads'));
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use('/processed', express.static(PROCESSED_DIR, { dotfiles: 'deny', index: false }));
app.use('/api/upload', uploadRoutes);
app.use('/api/process', processRoutes);

app.get('/images/:filename', async (req, res) => {
  try {
    const width = Number(req.query.width ?? 400);
    const height = Number(req.query.height ?? 400);
    const image = await getProcessedImage(req.params.filename, { width, height, quality: 80 });

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(image);
  } catch (error) {
    console.error('Image processing error:', error);
    res
      .status(400)
      .send({
        error: 'Failed to process the image.',
        details: error instanceof Error ? error.message : String(error),
      });
  }
});

app.use((req, res, next) => {
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Powered-By', 'My-Secure-API');
  next();
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      limitFileSize: `The file is too large (maximum ${MAX_FILE_SIZE} byte)`,
      limitFileCount: 'Too many files',
      limitUnexpectedFile: 'Unexpected file field',
    };
    return res.status(400).json({ error: messages[err.code] || err.message });
  }
  if (err.message?.startsWith('Unacceptable') || err.message?.includes('MIME-type')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`The server has started: http://localhost:${PORT}`));
