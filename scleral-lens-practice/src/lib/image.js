export function compressImage(file, maxDim = 640, quality = 0.75) {
  return new Promise((resolve, reject) => {
    // A raw phone camera photo (often 10+ MB, 4000x3000+ px) would otherwise
    // sit in memory twice before being resized: once as a base64 string via
    // FileReader, and again as a decoded bitmap. An object URL skips the
    // base64 copy, which is what was crashing low-RAM phones with an
    // out-of-memory error before the image ever got downscaled.
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}
