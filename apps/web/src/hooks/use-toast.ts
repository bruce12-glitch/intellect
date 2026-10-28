'use client';

import { useToast as useToastPrimitives } from './toast';

export function useToast() {
  return useToastPrimitives();
}