export { mergeIncomingCalls } from '../signaling/callHelpers';
import { useCallback } from 'react';
import type { UseWebRTCCallbacksDependencies, DisconnectHookDependencies } from '../ExtendedInterfaces';
import {
  useAddLog, useAttachStream, useHandleMessage,
  useConnect, useAcceptCall, useDeclineCall, useDisconnect,
} from './webrtcHooks';

export function useWebRTCCallbacks(dependencies: UseWebRTCCallbacksDependencies) {
  const {
    setStatus, setIncomingCalls, setLogs, videoRef,
    signalingRef, webrtcRef, iceServersRef, activeRoomRef, userIdRef, setDataChannelReady, setDocumentCurrentPage, intentionalEndRef
  } = dependencies;

  const addLog = useAddLog(setLogs);
  const attachStream = useAttachStream(videoRef);
  const handleMessage = useHandleMessage({ addLog, setStatus, setIncomingCalls, activeRoomRef, webrtcRef, signalingRef, intentionalEndRef });

  const onDataChannelOpen = useCallback(() => {
    addLog('DataChannel open');
    setDataChannelReady(true);
  }, [addLog, setDataChannelReady]);

  const onDataChannelMessage = useCallback((msg: unknown) => {
    if (typeof msg !== 'object' || msg === null) return;
    const m = msg as { Type?: unknown; PageIndex?: unknown };
    if (m.Type === 'document-navigate' && typeof m.PageIndex === 'number') {
      setDocumentCurrentPage(m.PageIndex);
      addLog(`Doc nav: page ${m.PageIndex + 1}`);
    }
  }, [addLog, setDocumentCurrentPage]);

  const connect = useConnect({ addLog, setStatus, setIncomingCalls, handleMessage, userIdRef, signalingRef, iceServersRef, activeRoomRef, webrtcRef, intentionalEndRef });
  const acceptCall = useAcceptCall({ addLog, setStatus, attachStream, signalingRef, webrtcRef, iceServersRef, activeRoomRef, onDataChannelOpen, onDataChannelMessage, intentionalEndRef });
  const declineCall = useDeclineCall(addLog, setIncomingCalls, signalingRef);
  const disconnect = useDisconnect({ addLog, setStatus, setIncomingCalls, signalingRef, webrtcRef, activeRoomRef, setDataChannelReady });
  const leaveCall = useLeaveCall({ addLog, setStatus, setIncomingCalls, signalingRef, webrtcRef, activeRoomRef, setDataChannelReady });

  return { connect, acceptCall, declineCall, disconnect, leaveCall };
}

export function useLeaveCall(deps: DisconnectHookDependencies) {
  const { addLog, setStatus, setIncomingCalls, signalingRef, webrtcRef, activeRoomRef, setDataChannelReady } = deps;
  return useCallback(() => {
    const room = activeRoomRef.current;
    if (room) signalingRef.current?.sendToGroup(room, { type: 'call-ended', room });
    activeRoomRef.current = null;
    webrtcRef.current.cleanup();
    setDataChannelReady(false); 
    setIncomingCalls([]);
    setStatus('waiting');
    addLog('Left call');
  }, [activeRoomRef, webrtcRef, signalingRef, setStatus, setIncomingCalls, addLog, setDataChannelReady]);
}