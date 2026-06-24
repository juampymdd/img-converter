/** Every format the app understands, on either side of a conversion. */
export type ImageFormat =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'jxl'
  | 'gif'
  | 'bmp'
  | 'tiff'
  | 'ico'
  | 'heic'
  | 'svg';

/** Which engine actually performs a decode/encode step. */
export type Engine =
  | 'jsquash'
  | 'resvg'
  | 'libheif'
  | 'utif'
  | 'gifenc'
  | 'imagetracer'
  | 'canvas'
  | 'native-bitmap';

/** Per-file lifecycle state. Transitions are animated in the UI. */
export type FileStatus = 'queued' | 'reading' | 'converting' | 'done' | 'error' | 'canceled';

/** Crop rectangle in pixels of the ORIGINAL (decoded) image. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConvertOptions {
  /** 0–100. Meaning depends on target codec. */
  quality: number;
  /** Lossless mode where the target supports it (png/webp/avif/jxl). */
  lossless: boolean;
  /** Optional longest-edge resize in px; undefined = keep original size. */
  maxEdge?: number;
  /** Optional crop applied right after decode (original-image pixels). */
  crop?: CropRect;
  /** Optional exact output size in px. Overrides maxEdge when both are set. */
  outputWidth?: number;
  outputHeight?: number;
}

/** Stages emitted by the worker during a single conversion. */
export type ConvertStage = 'decode' | 'process' | 'encode';

/** main -> worker */
export interface WorkerRequest {
  id: string;
  buffer: ArrayBuffer;
  sourceFormat: ImageFormat;
  targetFormat: ImageFormat;
  options: ConvertOptions;
}

/** worker -> main */
export type WorkerResponse =
  | { id: string; type: 'progress'; stage: ConvertStage; progress: number }
  | { id: string; type: 'done'; buffer: ArrayBuffer; mime: string; width: number; height: number; engine: Engine }
  | { id: string; type: 'error'; message: string };

export interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  /** Thumbnail of the applied crop region, shown instead of previewUrl. */
  croppedPreviewUrl?: string;
  sourceFormat: ImageFormat;
  targetFormat: ImageFormat;
  options: ConvertOptions;
  status: FileStatus;
  /** True while the background-removal model is running. */
  bgProcessing?: boolean;
  /** 0–100 progress of the background-removal step (download + inference). */
  bgProgress?: number;
  /** True once the background has been removed (source replaced with a PNG). */
  bgRemoved?: boolean;
  /** 0–100, real FileReader progress. */
  readProgress: number;
  /** 0–100, real worker stage progress. */
  convertProgress: number;
  stage?: ConvertStage;
  error?: string;
  result?: {
    blob: Blob;
    url: string;
    size: number;
    width: number;
    height: number;
    engine: Engine;
  };
}
