import 'dotenv/config';
import crypto from 'crypto';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { ApiError } from '../utils/helpers';

export const cacheTtlSeconds = 86400;
export const cacheMaxEntries = 500;
export const redisTtlSecond = 86400;
export const redisMaxFileBytes = 5242880;
export const streamThresholdBytes = 0;
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
export const PROCESSED_DIR = path.resolve(process.env.PROCESSED_DIR || 'processed');
export const CACHE_DIR = path.resolve(process.env.CACHE_DIR || 'cache');
export const maxFileSize = 5242880;
export const MAX_FILE_SIZE = Number(maxFileSize) || 5 * 1024 * 1024;
export const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'txt'];
export const ALLOWED_MIMES: Record<string, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  pdf: ['application/pdf'],
  txt: ['text/plain'],
};

export const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const allowedMimes = ALLOWED_MIMES[ext];
  if (!allowedExtensions.includes(ext) || !allowedMimes) {
    return cb(new ApiError(400, `Invalid file extension: .${ext || '?'}`));
  }
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new ApiError(400, `MIME-type ${file.mimetype} does not match the extension .${ext}`));
  }
  cb(null, true);
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
});
