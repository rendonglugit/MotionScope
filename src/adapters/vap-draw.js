// VAP coordinate and blend layout follow Tencent VAP (MIT); no frame scheduler is started here.
export function createVapDraw(player) {
  const {gl, vapFrameParser: parser, program, video, options} = player;
  const {videoW, videoH, rgbFrame} = parser.config.info;
  const count = Object.keys(parser.srcData || {}).length;
  const positions = new Float32Array(count * 9);
  const location = count ? gl.getUniformLocation(program, 'image_pos') : null;
  const frames = new Map((parser.config.frame || []).map(frame => [frame.i, frame]));
  function coords(offset, x, y, width, height) {
    positions[offset] = x / videoW;
    positions[offset + 1] = (x + width) / videoW;
    positions[offset + 2] = (videoH - y - height) / videoH;
    positions[offset + 3] = (videoH - y) / videoH;
  }
  return mediaTime => {
    const index = Math.max(0, Math.min(parser.config.info.f - 1 || Infinity, Math.floor(mediaTime * options.fps + 1e-4)));
    positions.fill(0); // Frames without overlays must clear uniforms from the prior frame.
    let offset = 0;
    for (const item of frames.get(index)?.obj || []) {
      const texture = parser.textureMap[item.srcId];
      if (!texture || offset + 9 > positions.length) continue;
      positions[offset] = texture;
      const [x,y,w,h] = item.frame;
      coords(offset + 1, x + rgbFrame[0], y + rgbFrame[1], w, h);
      coords(offset + 5, ...item.mFrame);
      offset += 9;
    }
    if (location !== null) gl.uniform1fv(location, positions);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, player.videoTexture);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}
