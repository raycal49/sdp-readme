import type { IceServerConfig, PeerCallbacks, AnnotationMessage } from '../BaseInterfaces.ts';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const DOC_CHUNK_SIZE = 16 * 1024;
const DOC_CHUNK_DELAY_MS = 5;
const DOC_BUFFER_HIGH_WATER = 1 * 1024 * 1024;
const DOC_BUFFER_POLL_MS = 20;
const DOC_PAGE_SCALE = 1.5;
const DOC_PAGE_QUALITY = 0.82;

let pdfjsModule: typeof import('pdfjs-dist') | null = null;
async function loadPdfjs() {
  if (pdfjsModule) return pdfjsModule;
  const mod = await import('pdfjs-dist');
  mod.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  pdfjsModule = mod;
  return mod;
}

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private dataChannel: RTCDataChannel | null = null;
  private documentsChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;

  async initMic(onMicError?: (err: Error) => void): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      onMicError?.(err as Error);
    }
  }

  stopMic(): void {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
  }

  create(iceServers: IceServerConfig[], callbacks: PeerCallbacks): void {
    this.cleanup();
    this.pendingCandidates = [];
    console.log('Creating RTCPeerConnection with ICE servers:', JSON.stringify(iceServers));

    this.pc = new RTCPeerConnection({ iceServers });
    this.documentsChannel = this.pc.createDataChannel('documents');
    this.documentsChannel.onopen = () => callbacks.onDocumentsChannelOpen?.();
    this.pc.ontrack = callbacks.onTrack;
    this.pc.onicecandidate = (e) => { if (e.candidate) callbacks.onIceCandidate(e.candidate); };
    this.pc.oniceconnectionstatechange = () => { if (this.pc) callbacks.onStateChange(this.pc.iceConnectionState); };
    this.pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', this.pc?.iceGatheringState);
    };

    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        this.pc.addTrack(track, this.localStream);
      }
    } else {
      this.pc.addTransceiver('audio', { direction: 'recvonly' });
    }
    this.pc.addTransceiver('video', { direction: 'recvonly' });

    this.pc.ondatachannel = (event) => {
      if (event.channel.label === 'annotations') {
        this.dataChannel = event.channel;
        this.dataChannel.onopen = () => callbacks.onDataChannelOpen?.();
        this.dataChannel.onmessage = (e) => {
          if (typeof e.data !== 'string') return;
          try {
            callbacks.onDataChannelMessage?.(JSON.parse(e.data));
          } catch {
            // malformed payload — ignore
          }
        };
      }
    };
    
  }

  async handleOffer(sdp: string): Promise<string> {
    if (!this.pc) throw new Error('Peer connection not initialized');

    await this.pc.setRemoteDescription({ type: 'offer', sdp });

    for (const c of this.pendingCandidates) {
      await this.pc.addIceCandidate(new RTCIceCandidate(c));
    }
    this.pendingCandidates = [];

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer.sdp!;
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.pc?.remoteDescription) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      this.pendingCandidates.push(candidate);
    }
  }

  sendAnnotation(stroke: AnnotationMessage): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(stroke));
    }
  }

  isDataChannelOpen(): boolean {
    return this.dataChannel?.readyState === 'open';
  }
  isDocumentsChannelOpen(): boolean {
  return this.documentsChannel?.readyState === 'open';
}

  async sendDocument(file: File): Promise<void> {
    console.log('sendDocument called, channel state:', this.documentsChannel?.readyState);
    if (this.documentsChannel?.readyState !== 'open') return;

    const pdfjs = await loadPdfjs();
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const totalPages = pdf.numPages;

    if (!this.send({ type: 'document-start', documentName: file.name, totalPages: totalPages })) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    for (let i = 0; i < totalPages; i++) {
      const page = await pdf.getPage(i + 1);
      const viewport = page.getViewport({ scale: DOC_PAGE_SCALE });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const base64 = canvas.toDataURL('image/jpeg', DOC_PAGE_QUALITY).split(',')[1];
      const totalChunks = Math.ceil(base64.length / DOC_CHUNK_SIZE);

      for (let c = 0; c < totalChunks; c++) {
        const sent = this.send({
          type: 'document-page',
          pageIndex: i,
          totalPages: totalPages,
          width: viewport.width,
          height: viewport.height,
          chunkIndex: c,
          totalChunks: totalChunks,
          data: base64.slice(c * DOC_CHUNK_SIZE, (c + 1) * DOC_CHUNK_SIZE),
        });
        if (!sent) return;
        await this.waitForBuffer();
        await new Promise(r => setTimeout(r, DOC_CHUNK_DELAY_MS));
      }

      page.cleanup();
    }
    this.sendDocumentClose();
  }

  sendDocumentClose(): void {
    this.send({ type: 'document-close' });
  }

  private send(payload: object): boolean {
    if (this.documentsChannel?.readyState !== 'open') return false;
    this.documentsChannel.send(JSON.stringify(payload));
    return true;
  }

  private async waitForBuffer(): Promise<void> {
    while (this.documentsChannel && this.documentsChannel.bufferedAmount > DOC_BUFFER_HIGH_WATER) {
      await new Promise(r => setTimeout(r, DOC_BUFFER_POLL_MS));
    }
  }

  cleanup(): void {
    this.pc?.close();
    this.pc = null;
    this.pendingCandidates = [];
    this.dataChannel?.close();
    this.dataChannel = null;
    this.documentsChannel?.close();
    this.documentsChannel = null;
    //voice channel not stopped here to allow 
    // use for multiple calls in one session
  }
}
