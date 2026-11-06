/**
 * OrganizaGrana — Otimizador de Imagens para Vision
 * Redimensiona e comprime imagens client-side antes de enviar para a OpenAI.
 * Reduz arquivos de 10MB+ para ~250KB, evitando timeouts de rede e erros de payload.
 */

export const optimizeImageForVision = (imageInput, maxDimension = 1400, quality = 0.82) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();

      const processImage = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          reject(new Error('Não foi possível ler as dimensões da imagem.'));
          return;
        }

        // Calcula novas dimensões proporcionais
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Falha ao processar canvas de imagem.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType: 'image/jpeg' });
      };

      img.onload = processImage;
      img.onerror = () => {
        reject(new Error('Não foi possível carregar a foto para análise.'));
      };

      if (typeof imageInput === 'string') {
        img.src = imageInput.startsWith('data:')
          ? imageInput
          : `data:image/jpeg;base64,${imageInput}`;
      } else if (imageInput instanceof Blob || (typeof File !== 'undefined' && imageInput instanceof File)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
        };
        reader.onerror = () => {
          reject(new Error('Falha ao ler o arquivo de foto no dispositivo.'));
        };
        reader.readAsDataURL(imageInput);
      } else if (imageInput?.file) {
        optimizeImageForVision(imageInput.file, maxDimension, quality).then(resolve).catch(reject);
      } else {
        reject(new Error('Formato de imagem não reconhecido.'));
      }
    } catch (err) {
      reject(err);
    }
  });
};
