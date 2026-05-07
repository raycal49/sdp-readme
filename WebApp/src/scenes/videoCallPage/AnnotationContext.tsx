import { createContext, useContext, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { StrokeType } from './Annotation/AnnotationLogic.ts';

export type AnnotationTool = 'pen' | 'arrow' | 'rect' | 'circle' | 'eraser';

interface AnnotationState {
  enabled: boolean;
  tool: AnnotationTool;
  color: string;
  brushSize: number;
  opacity: number;
  strokeType: StrokeType;
  toggleEnabled: () => void;
  setTool: (t: AnnotationTool) => void;
  setColor: (c: string) => void;
  setBrushSize: (s: number) => void;
  setOpacity: (o: number) => void;
  toggleStrokeType: () => void;
  undo: () => void;
  clear: () => void;
  undoRef: React.MutableRefObject<() => void>;
  clearRef: React.MutableRefObject<() => void>;
}

const AnnotationContext = createContext<AnnotationState | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAnnotation(): AnnotationState {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error('useAnnotation must be used within AnnotationProvider');
  return ctx;
}

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [tool, setTool] = useState<AnnotationTool>('pen');
  const [color, setColor] = useState('#00d4ff');
  const [brushSize, setBrushSize] = useState(4);
  const [opacity, setOpacity] = useState(100);
  const [strokeType, setStrokeType] = useState<StrokeType>('fading');

  const undoRef = useRef<() => void>(() => {});
  const clearRef = useRef<() => void>(() => {});

  const toggleEnabled = useCallback(() => setEnabled(prev => !prev), []);
  const toggleStrokeType = useCallback(() => setStrokeType(prev => prev === 'fading' ? 'permanent' : 'fading'), []);
  const undo = useCallback(() => undoRef.current(), []);
  const clear = useCallback(() => clearRef.current(), []);

  return (
    <AnnotationContext.Provider value={{
      enabled, tool, color, brushSize, opacity, strokeType,
      toggleEnabled, setTool, setColor, setBrushSize, setOpacity, toggleStrokeType,
      undo, clear, undoRef, clearRef,
    }}>
      {children}
    </AnnotationContext.Provider>
  );
}
