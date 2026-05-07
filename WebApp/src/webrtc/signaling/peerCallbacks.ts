import type { PeerCallbacksOptions } from '../ExtendedInterfaces';

export function makePeerCallbacks(options: PeerCallbacksOptions) {
  const { room, addLog, setStatus, attachStream, signaling, onFailed, onDataChannelOpen, onDocumentsChannelOpen, onDataChannelMessage, intentionalEndRef } = options;
  return {
    onTrack: (trackEvent: RTCTrackEvent) => {
      addLog(`Track: ${trackEvent.track.kind}`);
      attachStream(trackEvent);
      setStatus('streaming');
    },
    onIceCandidate: (candidate: RTCIceCandidate) => {
      addLog(`→ ice-candidate (${candidate.candidate.split(' ')[7] ?? '?'} / ${candidate.candidate.split(' ')[2] ?? '?'})`);
      signaling?.sendToGroup(room, {
        type: 'ice-candidate',
        room,
        candidate: {
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        },
      });
    },onMicError: (err: Error) => {
      addLog(`Mic error: ${err.message}`);
    },
    onStateChange: (() => {
      let disconnetedTimer: ReturnType<typeof setTimeout> | null = null;
      
      return (iceConnectionState: RTCIceConnectionState) => {
        addLog(`ICE: ${iceConnectionState}`);
        if (iceConnectionState === 'connected' || iceConnectionState == 'completed'){
          if(disconnetedTimer !== null) {
            clearTimeout(disconnetedTimer);
            disconnetedTimer = null;
          }
        }
        if (iceConnectionState === 'failed' && !intentionalEndRef?.current) {
          onFailed();
          setStatus('error');
        } else if (iceConnectionState === 'disconnected' && !intentionalEndRef?.current) {
          disconnetedTimer = setTimeout(() => {
            onFailed();
            setStatus('error');
          }, 5000);
        }
      };
    })(),
    onDataChannelOpen,
    onDocumentsChannelOpen,
    onDataChannelMessage,
  };
}
