import Jimp from 'jimp';
import jsQR from 'jsqr';

export async function decodeQR(url) {
    try {
        // Load the image with Jimp
        const image = await Jimp.read(url);

        // Get the image data
        const imageData = {
            data: new Uint8ClampedArray(image.bitmap.data),
            width: image.bitmap.width,
            height: image.bitmap.height,
        };

        // Use jsQR to decode the QR code
        const decodedQR = jsQR(imageData.data, imageData.width, imageData.height);

        if (!decodedQR) {
            console.error('QR code not found in the image.');
        }

        console.log(decodedQR?.data);
        return decodedQR?.data;
    } catch (error) {
        console.error('Error decoding QR code:', error);
    }
    return null;
}

await decodeQR("https://media.istockphoto.com/id/1402119108/vector/qrcode-for-scan-product-scan-square-for-mobile-phone-bar-tag-scan-camera-phone-white-and.jpg?s=612x612&w=0&k=20&c=12FK5PVjT36EdwT4umNV1G_MdYM_cKlMio16zgxcKtk=");