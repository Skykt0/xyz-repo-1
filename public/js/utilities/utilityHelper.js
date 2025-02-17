define([], function () {
  function base64ToFile(base64String, fileName) {
    let arr = base64String.split(',');
    let mime = arr[0].match(/:(.*?);/)[1];
    let byteString = atob(arr[1]);
  
    let arrayBuffer = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      arrayBuffer[i] = byteString.charCodeAt(i);
    }
  
    let file = new File([arrayBuffer], fileName, { type: mime });
  
    return file;
  };
  
  function convertToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  return {
    base64ToFile: base64ToFile,
    convertToBase64: convertToBase64
  };
});
