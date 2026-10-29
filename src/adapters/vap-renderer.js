// Tencent VAP's MIT-licensed GL setup is reused; its 60 Hz modulo loop is disabled.
import WebglRenderVap from 'video-animation-player/src/webgl-render-vap.ts';

export class InspectionVap extends WebglRenderVap {
  requestAnimFunc() { return () => 0; }
  onplaying() {} // The adapter's decoded-video-frame driver is the sole render owner.
}

export {createVapDraw} from './vap-draw.js';
