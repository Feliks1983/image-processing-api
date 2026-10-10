import { Request, Response } from 'express';
import {
  addWatermark,
  convertFormat,
  generateThumbnail,
  getMetadata,
  processImage,
} from '../services/imageService';
import { ApiError, asyncHandler, checkImageFormat } from '../utils/helpers';

const name = (req: Request) => String(req.params.filename);

export const transform = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await processImage(
      name(req),
      res.locals.options
    );
    res.status(201).json({
      message: 'Image processed',
      source: name(req),
      result: checkImageFormat(req, result),
    });
  } catch (error) {
    throw new ApiError(422, 'Image processing failed', (error as Error).message);
  }
});

export const convert = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result= await convertFormat(
      name(req),
      res.locals.options
    );
    res.status(201).json({
      message: 'Image converted',
      source: name(req),
      result: checkImageFormat(req, result),
    });
  } catch (error) {
    throw new ApiError(422, 'Image processing failed', (error as Error).message);
  }
});

export const thumbnail = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { size, format } = res.locals.options;
    const result = await generateThumbnail(name(req), size, format);
    res.status(201).json({
      message: 'Thumbnail created',
      source: name(req),
      result: checkImageFormat(req, result),
    });
  } catch (error) {
    throw new ApiError(422, 'Image processing failed', (error as Error).message);
  }
});

export const watermark = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await addWatermark(name(req), res.locals.options);
    res.status(201).json({
      message: 'Watermark added',
      source: name(req),
      result: checkImageFormat(req, result),
    });
  } catch (error) {
    throw new ApiError(422, 'Image processing failed', (error as Error).message);
  }
});

export const metadata = asyncHandler(async (req: Request, res: Response) => {
  try {
    res.status(201).json({ metadata: await getMetadata(name(req)) });
  } catch (error: any) {
    throw new ApiError(422, 'Image processing failed', (error as Error).message);
  }
});

