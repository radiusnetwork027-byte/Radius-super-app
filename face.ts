import { loadScript } from "./geo";

const WEIGHTS = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

type Pt = { x: number; y: number };
type FaceApi = {
  nets: {
    tinyFaceDetector: { loadFromUri: (u: string) => Promise<void> };
    faceLandmark68Net: { loadFromUri: (u: string) => Promise<void> };
    faceRecognitionNet: { loadFromUri: (u: string) => Promise<void> };
  };
  TinyFaceDetectorOptions: new (o?: { inputSize?: number; scoreThreshold?: number }) => unknown;
  detectSingleFace: (input: HTMLVideoElement, opt: unknown) => {
    withFaceLandmarks: () => {
      withFaceDescriptor: () => Promise<{
        descriptor: Float32Array;
        landmarks: { positions: Pt[] };
      } | undefined>;
    };
  };
};

let loading: Promise<FaceApi> | null = null;

export function getFaceApi() {
  if (!loading) {
    loading = (async () => {
      await loadScript("https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js");
      const faceapi = (window as unknown as { faceapi: FaceApi }).faceapi;
      if (!faceapi) throw new Error("Face engine failed to load");
      await faceapi.nets.tinyFaceDetector.loadFromUri(WEIGHTS);
      await faceapi.nets.faceLandmark68Net.loadFromUri(WEIGHTS);
      await faceapi.nets.faceRecognitionNet.loadFromUri(WEIGHTS);
      return faceapi;
    })();
  }
  return loading;
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function ear(pts: Pt[], start: number) {
  const eye = pts.slice(start, start + 6);
  if (eye.length < 6) return 1;
  return (dist(eye[1]!, eye[5]!) + dist(eye[2]!, eye[4]!)) / (2 * Math.max(0.001, dist(eye[0]!, eye[3]!)));
}

export async function readDescriptor(video: HTMLVideoElement) {
  const faceapi = await getFaceApi();
  const opt = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
  const det = await faceapi.detectSingleFace(video, opt).withFaceLandmarks().withFaceDescriptor();
  if (!det) return null;
  return Array.from(det.descriptor);
}

export async function runLiveness(
  video: HTMLVideoElement,
  onStep: (step: string) => void,
  signal: { cancelled: boolean },
) {
  const faceapi = await getFaceApi();
  const opt = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
  let blinked = false;
  let smiled = false;
  let turned = false;
  let lowEar = false;
  const started = Date.now();
  while (!signal.cancelled && Date.now() - started < 25000) {
    const det = await faceapi.detectSingleFace(video, opt).withFaceLandmarks().withFaceDescriptor();
    if (!det) {
      onStep("Look at the camera");
      await wait(180);
      continue;
    }
    const pts = det.landmarks.positions;
    const e = (ear(pts, 36) + ear(pts, 42)) / 2;
    if (e < 0.22) lowEar = true;
    if (lowEar && e > 0.28) blinked = true;
    const mouthW = dist(pts[48]!, pts[54]!);
    const jaw = dist(pts[2]!, pts[14]!) || 1;
    if (mouthW / jaw > 0.42) smiled = true;
    const mid = ((pts[36]?.x || 0) + (pts[45]?.x || 0)) / 2;
    const nose = pts[30]?.x || mid;
    if (Math.abs(nose - mid) > jaw * 0.12) turned = true;
    if (!blinked) onStep("Blink once");
    else if (!smiled) onStep("Smile");
    else if (!turned) onStep("Turn your head slightly");
    else {
      onStep("Face verified");
      return Array.from(det.descriptor);
    }
    await wait(160);
  }
  if (signal.cancelled) return null;
  throw new Error("Liveness timed out. Try again in good light.");
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
