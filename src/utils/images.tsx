//there is probably no reason to use this as most of this is better done server side
const getCanvasDataUrl = (rgbArray: number[][][]) => {
  performance.mark("canvas-create-start");

  const height = rgbArray.length;
  const width = rgbArray[0].length;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;
  let imageData = ctx?.createImageData(width, height);
  let data = imageData?.data;
  performance.mark("canvas-create-end");
  performance.measure(
    "canvas-create-time",
    "canvas-create-start",
    "canvas-create-end",
  );

  performance.mark("array-to-image-start");

  if (data) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = (y * width + x) * 4;
        const rgb = rgbArray[y][x];
        data[pos] = rgb[0]; // Red
        data[pos + 1] = rgb[1]; // Green
        data[pos + 2] = rgb[2]; // Blue
        data[pos + 3] = 255; // Alpha (opacity)
      }
    }
  }
  performance.mark("array-to-image-end");
  performance.measure(
    "array-to-image-time",
    "array-to-image-start",
    "array-to-image-end",
  );

  if (ctx && imageData) {
    performance.mark("image-put-start");

    ctx.putImageData(imageData, 0, 0);
    performance.mark("image-put-end");
    performance.measure("image-put-time", "image-put-start", "image-put-end");

    performance.mark("canvas-to-data-url-start");
    const url = canvas.toDataURL();
    performance.mark("canvas-to-data-url-end");
    performance.measure(
      "canvas-to-data-url-time",
      "canvas-to-data-url-start",
      "canvas-to-data-url-end",
    );
    return {
      imageUrl: url,
      height,
      width,
      isExpanded: false,
    };
  }

  return {
    imageUrl: "",
    height: 0,
    width: 0,
    isExpanded: false,
  };
};
