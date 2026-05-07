// UseAnnotationExport.tsx
import { useCallback } from 'react';
import { annotationLogger } from './AnnotationLogger';
import type { LogEntry } from './AnnotationLogger';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function downloadJSON(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function postAnnotations(payload: unknown): Promise<void> {
  const res = await fetch(`${API_URL}/api/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function useAnnotationExport() {
  const exportLogs = useCallback(() => {
    downloadJSON(annotationLogger.exportToJSON(), `call-logs-${Date.now()}.json`);
  }, []);

  const exportCategoryLogs = useCallback((category: LogEntry['category']) => {
    downloadJSON(annotationLogger.exportByCategoryToJSON(category), `call-logs-${category}-${Date.now()}.json`);
  }, []);

  const exportAnnotations = useCallback((webAppUserId?: string | number, questUserId?: string | number) => {
    downloadJSON(annotationLogger.exportAnnotationsToJSON(webAppUserId, questUserId), `annotations-${Date.now()}.json`);
  }, []);

  const saveAnnotations = useCallback(async (
    callId?: string | null,
    webAppUserId?: string | number,
    questUserId?: string | number,
  ) => {
    const payload = JSON.parse(annotationLogger.exportAnnotationsToJSON(webAppUserId, questUserId));
    if (callId && !payload.callId) payload.callId = callId;
    await postAnnotations(payload);
  }, []);

  return { exportLogs, exportCategoryLogs, exportAnnotations, saveAnnotations };
}