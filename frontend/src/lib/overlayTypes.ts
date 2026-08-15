export interface OverlayCanvasSize {
  width: number;
  height: number;
}

export interface OverlayGuides {
  horizontal: number[];
  vertical: number[];
}

export type OverlayItemType = "widget" | "alert" | "text" | "image" | "video" | "embed" | "icon" | "shape" | "group" | "placeholder";

export interface TextProps {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: string;
  colorMode?: "solid" | "gradient";
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  shadow?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  stroke?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  letterSpacing?: number;
  lineHeight?: number;
  [key: string]: unknown;
}

export interface OverlayItem {
  id: string;
  type: OverlayItemType;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  hidden?: boolean;
  locked?: boolean;
  name?: string;
  collapsed?: boolean;
  widgetId?: string;
  props?: Record<string, unknown>;
}

export const DEFAULT_OVERLAY_CANVAS: OverlayCanvasSize = { width: 1920, height: 1080 };
export const MIN_OVERLAY_ITEM_SIZE = 8;
