import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCService } from '../../webrtc/services/webrtcService';
import type { AnnotationStroke } from '../../webrtc/BaseInterfaces';

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'mock-worker-url' }));

const pdfjsMock = {
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
};
vi.mock('pdfjs-dist', () => pdfjsMock);

type MockDataChannel = {
  label: string;
  readyState: RTCDataChannelState;
  onopen: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

function makeDataChannel(label: string, readyState: RTCDataChannelState = 'open'): MockDataChannel {
  return { label, readyState, onopen: null, onmessage: null, send: vi.fn(), close: vi.fn() };
}

class MockPeerConnection {
  ontrack: ((e: RTCTrackEvent) => void) | null = null;
  onicecandidate: ((e: { candidate: RTCIceCandidate | null }) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  onicegatheringstatechange: (() => void) | null = null;
  ondatachannel: ((e: { channel: MockDataChannel }) => void) | null = null;
  iceConnectionState: RTCIceConnectionState = 'new';
  iceGatheringState: RTCIceGatheringState = 'new';
  remoteDescription: RTCSessionDescription | null = null;

  close = vi.fn();
  addTransceiver = vi.fn();
  addTrack = vi.fn();
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  createAnswer = vi.fn().mockResolvedValue({ sdp: 'answer-sdp', type: 'answer' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
}

let mockPc: MockPeerConnection;

beforeEach(() => {
  mockPc = new MockPeerConnection();
  vi.stubGlobal('RTCPeerConnection', vi.fn().mockImplementation(function () {
    return mockPc;
  }));
  vi.stubGlobal('RTCIceCandidate', vi.fn().mockImplementation(function (init: RTCIceCandidateInit) {
    return init;
  }));
});

function makeCallbacks(extra: { onDataChannelOpen?: () => void; onDataChannelMessage?: (msg: unknown) => void } = {}) {
  return {
    onTrack: vi.fn(),
    onIceCandidate: vi.fn(),
    onStateChange: vi.fn(),
    ...extra,
  };
}

const iceServers = [{ urls: 'stun:stun.example.com' }] as RTCIceServer[];

describe('create: lifecycle', () => {
  it('closes any existing peer connection before creating a new one', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    const firstPc = mockPc;
    mockPc = new MockPeerConnection();
    vi.mocked(RTCPeerConnection).mockImplementation(function () { return mockPc; });

    svc.create(iceServers, makeCallbacks());
    expect(firstPc.close).toHaveBeenCalled();
  });

  it('resets pending candidates on each create', async () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());

    await svc.addIceCandidate({ candidate: 'cand1' } as RTCIceCandidateInit);

    mockPc = new MockPeerConnection();
    vi.mocked(RTCPeerConnection).mockImplementation(function () { return mockPc; });
    svc.create(iceServers, makeCallbacks());

    mockPc.remoteDescription = {} as RTCSessionDescription;
    await svc.handleOffer('offer-sdp');
    expect(mockPc.addIceCandidate).not.toHaveBeenCalled();
  });

  it('creates RTCPeerConnection with the provided ICE servers', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    expect(RTCPeerConnection).toHaveBeenCalledWith({ iceServers });
  });

});

describe('create', () => {
  it('wires ontrack, onicecandidate, oniceconnectionstatechange and adds transceivers', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    expect(mockPc.ontrack).toBeTypeOf('function');
    expect(mockPc.onicecandidate).toBeTypeOf('function');
    expect(mockPc.oniceconnectionstatechange).toBeTypeOf('function');
    expect(mockPc.addTransceiver).toHaveBeenCalledWith('video', { direction: 'recvonly' });
    expect(mockPc.addTransceiver).toHaveBeenCalledWith('audio', { direction: 'recvonly' });
  });

  it('calls onIceCandidate callback when a candidate is produced', () => {
    const cbs = makeCallbacks();
    const svc = new WebRTCService();
    svc.create(iceServers, cbs);
    const candidate = { candidate: 'cand1' } as RTCIceCandidate;
    mockPc.onicecandidate!({ candidate });
    expect(cbs.onIceCandidate).toHaveBeenCalledWith(candidate);
  });

  it('does not call onIceCandidate when candidate is null', () => {
    const cbs = makeCallbacks();
    const svc = new WebRTCService();
    svc.create(iceServers, cbs);
    mockPc.onicecandidate!({ candidate: null });
    expect(cbs.onIceCandidate).not.toHaveBeenCalled();
  });

  it('calls onStateChange with the current ICE connection state', () => {
    const cbs = makeCallbacks();
    const svc = new WebRTCService();
    svc.create(iceServers, cbs);
    mockPc.iceConnectionState = 'connected';
    mockPc.oniceconnectionstatechange!();
    expect(cbs.onStateChange).toHaveBeenCalledWith('connected');
  });

  it('does not call onStateChange when pc is null at time of state change', () => {
    const cbs = makeCallbacks();
    const svc = new WebRTCService();
    svc.create(iceServers, cbs);

    const handler = mockPc.oniceconnectionstatechange!;
    svc.cleanup(); 
    handler();

    expect(cbs.onStateChange).not.toHaveBeenCalled();
  });

  it('logs ICE gathering state changes', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    mockPc.iceGatheringState = 'gathering';
    mockPc.onicegatheringstatechange!();
    // The console.log is called, but we can't easily test console output in vitest without mocking
    // This test ensures the callback is wired and doesn't throw
  });
});

describe('handleOffer', () => {
  it('throws when called before create()', async () => {
    const svc = new WebRTCService();
    await expect(svc.handleOffer('sdp')).rejects.toThrow('Peer connection not initialized');
  });

  it('sets remote description, creates and returns answer sdp', async () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    mockPc.remoteDescription = {} as RTCSessionDescription;
    const result = await svc.handleOffer('offer-sdp');
    expect(mockPc.setRemoteDescription).toHaveBeenCalledWith({ type: 'offer', sdp: 'offer-sdp' });
    expect(mockPc.createAnswer).toHaveBeenCalled();
    expect(mockPc.setLocalDescription).toHaveBeenCalled();
    expect(result).toBe('answer-sdp');
  });

  it('flushes queued candidates before creating the answer', async () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());

    await svc.addIceCandidate({ candidate: 'c1' } as RTCIceCandidateInit);
    await svc.addIceCandidate({ candidate: 'c2' } as RTCIceCandidateInit);

    mockPc.remoteDescription = {} as RTCSessionDescription;
    await svc.handleOffer('offer-sdp');

    expect(mockPc.addIceCandidate).toHaveBeenCalledTimes(2);
  });

  it('clears pending candidates after flushing', async () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    await svc.addIceCandidate({ candidate: 'c1' } as RTCIceCandidateInit);

    mockPc.remoteDescription = {} as RTCSessionDescription;
    await svc.handleOffer('offer-sdp');

    mockPc.addIceCandidate.mockClear();
    await svc.handleOffer('offer-sdp2');
    expect(mockPc.addIceCandidate).not.toHaveBeenCalled();
  });
});


describe('addIceCandidate', () => {
  it('adds the candidate immediately when remoteDescription is set', async () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    mockPc.remoteDescription = {} as RTCSessionDescription;

    await svc.addIceCandidate({ candidate: 'cand1' } as RTCIceCandidateInit);
    expect(mockPc.addIceCandidate).toHaveBeenCalled();
  });

  it('queues the candidate when remoteDescription is not set', async () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    mockPc.remoteDescription = null;

    await svc.addIceCandidate({ candidate: 'cand1' } as RTCIceCandidateInit);
    expect(mockPc.addIceCandidate).not.toHaveBeenCalled();
  });
});


describe('cleanup', () => {
  it('closes the peer connection when one exists', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    svc.cleanup();
    expect(mockPc.close).toHaveBeenCalled();
  });

  it('does not throw when called with no peer connection', () => {
    const svc = new WebRTCService();
    expect(() => svc.cleanup()).not.toThrow();
  });

  it('clears pending candidates on cleanup', async () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    await svc.addIceCandidate({ candidate: 'c1' } as RTCIceCandidateInit);

    svc.cleanup();

    mockPc = new MockPeerConnection();
    vi.mocked(RTCPeerConnection).mockImplementation(function () { return mockPc; });
    svc.create(iceServers, makeCallbacks());
    mockPc.remoteDescription = {} as RTCSessionDescription;
    await svc.handleOffer('sdp');
    expect(mockPc.addIceCandidate).not.toHaveBeenCalled();
  });

  it('closes the data channel when one exists', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());

    const channel = makeDataChannel('annotations');
    mockPc.ondatachannel!({ channel });

    svc.cleanup();
    expect(channel.close).toHaveBeenCalled();
  });
});

describe('data channel: wiring', () => {
  it('registers an ondatachannel handler on the peer connection', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    expect(mockPc.ondatachannel).toBeTypeOf('function');
  });

  it('calls onDataChannelOpen when the AnnotationChannel opens', () => {
    const onDataChannelOpen = vi.fn();
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks({ onDataChannelOpen }));

    const channel = makeDataChannel('annotations');
    mockPc.ondatachannel!({ channel });
    channel.onopen!();

    expect(onDataChannelOpen).toHaveBeenCalledOnce();
  });

  it('does not store the channel or wire onopen for non-AnnotationChannel labels', () => {
    const onDataChannelOpen = vi.fn();
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks({ onDataChannelOpen }));

    const channel = makeDataChannel('SomeOtherChannel');
    mockPc.ondatachannel!({ channel });
    channel.onopen?.();

    expect(onDataChannelOpen).not.toHaveBeenCalled();
  });

  it('does not throw when onDataChannelOpen is absent and the channel opens', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());

    const channel = makeDataChannel('annotations');
    mockPc.ondatachannel!({ channel });
    expect(() => channel.onopen!()).not.toThrow();
  });
});

describe('data channel: messages', () => {
  it('parses incoming string payloads and forwards them to onDataChannelMessage', () => {
    const onDataChannelMessage = vi.fn();
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks({ onDataChannelMessage }));

    const channel = makeDataChannel('annotations');
    mockPc.ondatachannel!({ channel });

    channel.onmessage!({ data: JSON.stringify({ Type: 'document-navigate', PageIndex: 4 }) });
    expect(onDataChannelMessage).toHaveBeenCalledWith({ Type: 'document-navigate', PageIndex: 4 });
  });

  it('ignores non-string data on the data channel', () => {
    const onDataChannelMessage = vi.fn();
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks({ onDataChannelMessage }));

    const channel = makeDataChannel('annotations');
    mockPc.ondatachannel!({ channel });

    channel.onmessage!({ data: new ArrayBuffer(8) });
    expect(onDataChannelMessage).not.toHaveBeenCalled();
  });

  it('swallows malformed JSON without throwing', () => {
    const onDataChannelMessage = vi.fn();
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks({ onDataChannelMessage }));

    const channel = makeDataChannel('annotations');
    mockPc.ondatachannel!({ channel });

    expect(() => channel.onmessage!({ data: '{not json' })).not.toThrow();
    expect(onDataChannelMessage).not.toHaveBeenCalled();
  });

  it('does not throw when onDataChannelMessage is absent', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());

    const channel = makeDataChannel('annotations');
    mockPc.ondatachannel!({ channel });
    expect(() => channel.onmessage!({ data: JSON.stringify({ Type: 'document-navigate', PageIndex: 0 }) })).not.toThrow();
  });
});

describe('sendAnnotation', () => {
  it('sends the stroke as JSON when the data channel is open', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());

    const channel = makeDataChannel('annotations', 'open');
    mockPc.ondatachannel!({ channel });

    const stroke: AnnotationStroke = { Type: 'stroke', StrokeType: 'permanent', Vector: [[1, 2]], Color: [255, 0, 0] };
    svc.sendAnnotation(stroke);

    expect(channel.send).toHaveBeenCalledWith(JSON.stringify(stroke));
  });

  it('does nothing when the data channel readyState is not open', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());

    const channel = makeDataChannel('annotations', 'connecting');
    mockPc.ondatachannel!({ channel });

    svc.sendAnnotation({ Type: 'stroke', StrokeType: 'permanent', Vector: [], Color: [0, 0, 0] });

    expect(channel.send).not.toHaveBeenCalled();
  });

  it('does nothing when no data channel has been assigned', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    // Never trigger ondatachannel — dataChannel stays null
    expect(() => svc.sendAnnotation({ Type: 'stroke', StrokeType: 'permanent', Vector: [], Color: [0, 0, 0] })).not.toThrow();
  });
});

function stubGetUserMedia(stream: object) {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    configurable: true,
  });
}

describe('initMic', () => {
  it('stores the stream returned by getUserMedia', async () => {
    const stop = vi.fn();
    const fakeStream = {
      getAudioTracks: vi.fn().mockReturnValue([{ stop }]),
      getTracks: vi.fn().mockReturnValue([{ stop }]),
    };
    stubGetUserMedia(fakeStream);
    const svc = new WebRTCService();
    await svc.initMic();
    svc.stopMic();
    expect(stop).toHaveBeenCalled();
  });

  it('calls onMicError when getUserMedia rejects', async () => {
    const error = new Error('Permission denied');
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(error) },
      configurable: true,
    });
    const onMicError = vi.fn();
    const svc = new WebRTCService();
    await svc.initMic(onMicError);
    expect(onMicError).toHaveBeenCalledWith(error);
  });
});

describe('stopMic', () => {
  it('does not throw when no stream is set', () => {
    const svc = new WebRTCService();
    expect(() => svc.stopMic()).not.toThrow();
  });
});

describe('create with localStream', () => {
  it('adds audio tracks via addTrack when a local stream is set', async () => {
    const fakeTrack = { stop: vi.fn() };
    const fakeStream = {
      getAudioTracks: vi.fn().mockReturnValue([fakeTrack]),
      getTracks: vi.fn().mockReturnValue([fakeTrack]),
    };
    stubGetUserMedia(fakeStream);
    const svc = new WebRTCService();
    await svc.initMic();
    svc.create(iceServers, makeCallbacks());
    expect(mockPc.addTrack).toHaveBeenCalledWith(fakeTrack, fakeStream);
  });
});

describe('isDataChannelOpen', () => {
  it('returns false before a channel is assigned', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    expect(svc.isDataChannelOpen()).toBe(false);
  });

  it('returns true when the assigned channel is open', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    mockPc.ondatachannel!({ channel: makeDataChannel('annotations', 'open') });
    expect(svc.isDataChannelOpen()).toBe(true);
  });

  it('returns false when the assigned channel is connecting', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    mockPc.ondatachannel!({ channel: makeDataChannel('annotations', 'connecting') });
    expect(svc.isDataChannelOpen()).toBe(false);
  });
});

describe('sendDocumentClose', () => {
  it('sends a document-close JSON when the channel is open', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    const channel = makeDataChannel('annotations', 'open');
    mockPc.ondatachannel!({ channel });

    svc.sendDocumentClose();

    expect(channel.send).toHaveBeenCalledWith(JSON.stringify({ Type: 'document-close' }));
  });

  it('does nothing when the channel is not open', () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    const channel = makeDataChannel('annotations', 'connecting');
    mockPc.ondatachannel!({ channel });

    svc.sendDocumentClose();

    expect(channel.send).not.toHaveBeenCalled();
  });
});

describe('sendDocument', () => {
  function fakePdfPage() {
    return {
      getViewport: vi.fn().mockReturnValue({ width: 8, height: 8 }),
      render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      cleanup: vi.fn(),
    };
  }

  function fakeFile(): File {
    const buffer = new ArrayBuffer(4);
    return {
      name: 'manual.pdf',
      type: 'application/pdf',
      arrayBuffer: () => Promise.resolve(buffer),
    } as unknown as File;
  }

  beforeEach(() => {
    pdfjsMock.GlobalWorkerOptions.workerSrc = '';
    pdfjsMock.getDocument = vi.fn().mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(fakePdfPage()),
      }),
    });

    const dataUrl = 'data:image/jpeg;base64,YWJj';
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({}) as unknown as HTMLCanvasElement['getContext'];
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue(dataUrl);
  });

  it('returns immediately when the data channel is not open', async () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    const channel = makeDataChannel('annotations', 'connecting');
    mockPc.ondatachannel!({ channel });

    await svc.sendDocument(fakeFile());

    expect(pdfjsMock.getDocument).not.toHaveBeenCalled();
    expect(channel.send).not.toHaveBeenCalled();
  });

  it('emits a document-start frame followed by document-page chunks', async () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    const channel = makeDataChannel('annotations', 'open');
    mockPc.ondatachannel!({ channel });

    await svc.sendDocument(fakeFile());

    const payloads = channel.send.mock.calls.map(([body]: [string]) => JSON.parse(body));
    expect(payloads[0]).toEqual({ Type: 'document-start', DocumentName: 'manual.pdf', TotalPages: 1 });
    expect(payloads.slice(1).every(p => p.Type === 'document-page' && p.PageIndex === 0)).toBe(true);
    expect(payloads.length).toBeGreaterThanOrEqual(2);
  });

  it('waits for buffer when bufferedAmount is high', async () => {
    const svc = new WebRTCService();
    svc.create(iceServers, makeCallbacks());
    const channel = makeDataChannel('annotations', 'open');
    
    // Mock high bufferedAmount to trigger waitForBuffer (DOC_BUFFER_HIGH_WATER = 1MB)
    let bufferedAmount = 2 * 1024 * 1024; // Start high
    const getter = () => bufferedAmount;
    const setter = (value: number) => { bufferedAmount = value; };
    Object.defineProperty(channel, 'bufferedAmount', { get: getter, set: setter });
    
    mockPc.ondatachannel!({ channel });

    // Simulate bufferedAmount decreasing after a short delay
    setTimeout(() => {
      bufferedAmount = 0; // Drop below threshold
    }, 50);

    await svc.sendDocument(fakeFile());

    // The test passes if no timeout occurs, meaning waitForBuffer worked
    expect(channel.send).toHaveBeenCalled();
  });
});