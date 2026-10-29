import { requireOptionalNativeModule } from 'expo-modules-core';
export interface SharedPassage { text?: string; title?: string; imageUri?: string }
export interface OcrResult { text: string; blocks: { text: string; left: number; top: number; right: number; bottom: number }[] }
interface PassageNative {
  getPendingShare(): Promise<SharedPassage | null>;
  recognizeText(uri: string): Promise<OcrResult>;
  addListener(event: 'onShare', listener: (share: SharedPassage) => void): { remove(): void };
}
export const nativeCapture = requireOptionalNativeModule<PassageNative>('PassageNative');
