import Router from 'express'
import rateLimit from 'express-rate-limit';
import {
  validateConvertOptions,
  validateFilename,
  validateProcessOptions,
  validateThumbnailOptions,
  validateWatermarkOptions,
} from '../middleware/validation';
import { asyncHandler } from '../utils/helpers';
import { convert, metadata, thumbnail, transform, watermark } from '../controllers/processController';

export const router = Router();

router.use(
  rateLimit({ windowMs: 60 * 1000, limit: 60, message: { error: 'Too many requests, try later' } })
);

router.get(
  '/metadata/:filename', 
  validateFilename, 
  asyncHandler(metadata)
);
router.post(
  '/convert/:filename',
  validateFilename,
  validateConvertOptions,
  asyncHandler(convert)
);
router.post(
  '/thumbnail/:filename',
  validateFilename,
  validateThumbnailOptions,
  asyncHandler(thumbnail)
);
router.post(
  '/watermark/:filename',
  validateFilename,
  validateWatermarkOptions,
  asyncHandler(watermark)
);
router.post(
  '/:filename', 
  validateFilename, 
  validateProcessOptions, 
  asyncHandler(transform)
);

