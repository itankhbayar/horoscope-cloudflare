import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';

/** Node test runtime lacks Workers' `crypto.subtle.timingSafeEqual`; polyfill for vitest only. */
const subtle = crypto.subtle as SubtleCrypto & {
  timingSafeEqual?: (a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView) => boolean;
};

if (typeof subtle.timingSafeEqual !== 'function') {
  subtle.timingSafeEqual = (a, b) => {
    const toBuffer = (input: ArrayBuffer | ArrayBufferView): Buffer => {
      if (input instanceof ArrayBuffer) return Buffer.from(input);
      return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    };
    const aBuf = toBuffer(a);
    const bBuf = toBuffer(b);
    if (aBuf.length !== bBuf.length) return false;
    return nodeTimingSafeEqual(aBuf, bBuf);
  };
}
