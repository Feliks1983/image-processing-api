import sharp from 'sharp';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'path';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 5) {
      console.error('Redis unavailable after 5 attempts');
      return null;
    }

    return Math.min(times * 500, 3000);
  },
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', err => {
  console.error('Error Redis:', err.message);
});
const IMAGE_DIR = path.resolve('src/images');
const CACHE_TTL = 3600;

type ImageOptions = {
  width: number;
  height: number;
  quality?: number;
};

export async function getProcessedImage(filename: string, options: ImageOptions): Promise<Buffer> {
  if (!/^[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/i.test(filename)) {
    throw new Error('Invalid image name');
  }

  const { width, height, quality = 80 } = options;

  if (
    !Number.isInteger(width) ||
    width < 1 ||
    width > 2000 ||
    !Number.isInteger(height) ||
    height < 1 ||
    height > 2000 ||
    !Number.isInteger(quality) ||
    quality < 1 ||
    quality > 100
  ) {
    throw new Error('Invalid processing parameters');
  }

  const filePath = path.join(IMAGE_DIR, filename);
  const cacheKey =
    'processed:v1:' +
    createHash('sha256').update(JSON.stringify({ filename, width, height, quality })).digest('hex');

  const cached = await redis.getBuffer(cacheKey);

  if (cached !== null) {
    console.log('CACHE HIT:', filename);
    return cached;
  }

  console.log('CACHE MISS:', filename);

  const original = await readFile(filePath);
  const processed = await sharp(original, {
    limitInputPixels: 40000000,
  })
    .rotate()
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();
  await redis.setex(cacheKey, CACHE_TTL, processed);
  return processed;
}

export async function getCachedImage(key: string): Promise<Buffer | null> {
  const cached = await redis.getBuffer(key);
  return cached;
}

export async function setCachedImage(key: string, buffer: Buffer, ttl: number = 3600) {
  await redis.setex(key, ttl, buffer);
}

export async function processImageStream(inputPath: string, outputPath: string) {
  const readStream = fs.createReadStream(inputPath);
  const transformer = sharp().resize(800);
  const writeStream = fs.createWriteStream(outputPath);

  await pipeline(readStream, transformer, writeStream);
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const newId = () => crypto.randomUUID();
export const extFor = (format: string) => (format === 'jpeg' ? 'jpg' : format);

sharp.cache({ memory: 100 });
sharp.concurrency(require('os').cpus().length);

export const publicUrl = (req: Request, filename: string) =>
  `${req.protocol}://${req.get('host')}/processed/${filename}`;

export function checkImageFormat(
  req: Request,
  filePath: {
    filename: string;
    width: number;
    height: number;
    bytes: number;
    format: string;
  }
) {
    return {
      filename: filePath.filename,
      format: filePath.format,
      width: filePath.width,
      height: filePath.height,
      bytes: filePath.bytes,
      url: publicUrl(req, filePath.filename),
    };
}
