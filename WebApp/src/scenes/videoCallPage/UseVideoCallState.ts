import { useState, useEffect, useCallback } from 'react';
import { useWebRTC } from '../../webrtc/hooks/useWebRTC.ts';
import { useAnnotationLogger } from './UseAnnotationLogger.tsx';
import { useAnnotationExport } from './UseAnnotationExport.tsx';
import { strokeToAnnotation, makeClearAnnotations } from './Annotation/AnnotationLogic.ts';
import type { StrokeType, AnnotationMessage } from './Annotation/AnnotationLogic.ts';
import type { Stroke } from './Annotation/AnnotationCanvas.tsx';
import { annotationLogger } from './AnnotationLogger.ts';

function useAnnotationHandlers(params: {
  strokeColor: string;
  strokeType: StrokeType;
  logAnnotationSent: (data: { type: string; color: string; pointCount: number; strokeType?: string }) => void;
  logAnnotationCleared: () => void;
  sendAnnotation: (annotation: AnnotationMessage) => void;
}) {
  const { strokeColor, strokeType, logAnnotationSent, logAnnotationCleared, sendAnnotation } = params;

  const handleStroke = useCallback((stroke: Stroke) => {
    const annotation = strokeToAnnotation({ ...stroke, color: strokeColor }, strokeType);
    logAnnotationSent({ type: strokeType, color: strokeColor, pointCount: stroke.points.length, strokeType });
    sendAnnotation(annotation);
  }, [strokeColor, strokeType, logAnnotationSent, sendAnnotation]);

  const handleClearAnnotations = useCallback(() => {
    logAnnotationCleared();
    sendAnnotation(makeClearAnnotations());
  }, [logAnnotationCleared, sendAnnotation]);

  return { handleStroke, handleClearAnnotations };
}

function useDocumentHandlers(params: {
  sendDocument: (file: File) => Promise<void>;
  sendDocumentClose: () => void;
  logSystem: (message: string, data?: Record<string, unknown>) => void;
}) {
  const { sendDocument, sendDocumentClose, logSystem } = params;
  const [documentSending, setDocumentSending] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);

  const handleSendDocument = useCallback(async (file: File) => {
    if (file.type && file.type !== 'application/pdf') {
      logSystem(`Document rejected (not a PDF): ${file.name}`);
      return;
    }
    setDocumentSending(true);
    logSystem(`Sending document: ${file.name}`);
    try {
      await sendDocument(file);
      setDocumentOpen(true);
      logSystem(`Document sent: ${file.name}`);
    } catch (err) {
      logSystem(`Document send failed: ${(err as Error).message}`);
    } finally {
      setDocumentSending(false);
    }
  }, [sendDocument, logSystem]);

  const handleCloseDocument = useCallback(() => {
    sendDocumentClose();
    setDocumentOpen(false);
    logSystem('Document closed');
  }, [sendDocumentClose, logSystem]);

  const resetDocument = useCallback(() => {
    setDocumentOpen(false);
    setDocumentSending(false);
  }, []);

  return { documentSending, documentOpen, handleSendDocument, handleCloseDocument, resetDocument };
}

export function useVideoCallState() {
  const {status, incomingCalls, logs: webrtcLogs, videoRef, connect, acceptCall, declineCall, disconnect, leaveCall, sendAnnotation, sendDocument, sendDocumentClose, dataChannelReady, documentsChannelReady, documentCurrentPage, setDocumentCurrentPage, clearLogs: clearWebRTCLogs, } = useWebRTC();

  const {logs: annotationLogs, logAnnotationSent, logAnnotationCleared, logConnection, logSystem, startNewCall, endCall,} = useAnnotationLogger();
  const { saveAnnotations } = useAnnotationExport();

  const [annotationOn, setAnnotationOn]   = useState(false);
  const [strokeType, setStrokeType]       = useState<StrokeType>('fading');
  const [strokeColor, setStrokeColor]     = useState('#FF0000');

  const isStreaming    = status === 'streaming';
  const drawingEnabled = isStreaming && annotationOn;

  const { documentSending, documentOpen, handleSendDocument, handleCloseDocument, resetDocument } =
    useDocumentHandlers({ sendDocument, sendDocumentClose, logSystem });

  useEffect(() => {
    if (status === 'connecting') {
      startNewCall(`call-${Date.now()}`);
      clearWebRTCLogs();
    } else if (status === 'call-ended') {
      const callId = annotationLogger.getCurrentCallId();
      saveAnnotations(callId).catch(err => console.error('saveAnnotations failed:', err));
      endCall();
      leaveCall();
      resetDocument();
      setDocumentCurrentPage(null);
    } else if (status === 'disconnected') {
      endCall();
      resetDocument();
      setDocumentCurrentPage(null);
    }
  }, [status, startNewCall, endCall, clearWebRTCLogs, saveAnnotations, leaveCall, resetDocument, setDocumentCurrentPage]);

  useEffect(() => {
    logConnection(`Status: ${status}`);
  }, [status, logConnection]);

  const handleToggleDrawing = useCallback(() => {
    setAnnotationOn((prev) => {
      const next = !prev;
      logSystem(`Drawing ${next ? 'enabled' : 'disabled'}`);
      return next;
    });
  }, [logSystem]);

  const handleToggleStrokeType = useCallback(() => {
    setStrokeType((prev) => {
      const next = prev === 'fading' ? 'permanent' : 'fading';
      logSystem(`Stroke type: ${next}`);
      return next;
    });
  }, [logSystem]);

  const { handleStroke, handleClearAnnotations } = useAnnotationHandlers({strokeColor, strokeType,logAnnotationSent,logAnnotationCleared, sendAnnotation, });

  const combinedLogs = [...annotationLogs, ...webrtcLogs];
  const handleEndCall = useCallback(async () => {
    try {
      await saveAnnotations(null);
    } catch (err) {
      console.error('saveAnnotations failed:', err);
    } finally {
      leaveCall();
    }
  }, [saveAnnotations, leaveCall]);

  return {
    status,
    incomingCalls: status === 'waiting' ? incomingCalls : [],
    logs: combinedLogs,
    videoRef,
    connect,
    acceptCall,
    declineCall,
    disconnect,
    leaveCall: handleEndCall,
    drawingEnabled,
    videoVisible: isStreaming,
    strokeType,
    strokeColor,
    handleToggleDrawing,
    handleToggleStrokeType,
    handleClearAnnotations,
    handleStroke,
    handleColorChange: setStrokeColor,
    documentEnabled: isStreaming && dataChannelReady,
    documentSending,
    documentOpen,
    documentCurrentPage,
    handleSendDocument,
    handleCloseDocument,
  };
}
