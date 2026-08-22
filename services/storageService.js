import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseConfig';

/**
 * Uploads a file from a local URI to Firebase Storage.
 * @param {string} uri Local URI of the file.
 * @param {string} folderPath Destination folder in Storage.
 * @returns {Promise<string>} Download URL of the uploaded file.
 */
const getFileExtension = (uri = '') => {
    const cleanUri = uri.split('?')[0];
    const extension = cleanUri.split('.').pop();
    return extension && extension.length <= 5 ? extension.toLowerCase() : 'jpg';
};

const getContentType = (uri = '', fallback = 'image/jpeg') => {
    const extension = getFileExtension(uri);

    if (extension === 'png') return 'image/png';
    if (extension === 'webp') return 'image/webp';
    if (extension === 'heic') return 'image/heic';
    if (extension === 'heif') return 'image/heif';
    if (extension === 'pdf') return 'application/pdf';

    return fallback;
};

export const uploadFileToStorage = async (uri, folderPath, options = {}) => {
    if (!uri) return null;

    try {
        // Prepare the file name
        const filename = uri.split('/').pop();
        const timestamp = new Date().getTime();
        const uniqueName = `${timestamp}-${filename}`;
        const fileRef = ref(storage, `${folderPath}/${uniqueName}`);
        const contentType = options.contentType || getContentType(uri);

        // Convert URI to Blob
        const response = await fetch(uri);
        if (response.status && !response.ok) {
            throw new Error(`Falha ao ler arquivo local: HTTP ${response.status}`);
        }

        const blob = await response.blob();

        // Upload
        const uploadResult = await uploadBytes(fileRef, blob, {
            contentType,
            customMetadata: options.customMetadata || undefined,
        });
        
        // Get Download URL
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        return downloadURL;
    } catch (error) {
        console.error("Error uploading file to storage:", error);
        throw error;
    }
};

export const uploadProfileImageToStorage = async (uri, userId, flavorId = 'paraipaba') => {
    const extension = getFileExtension(uri);
    const path = `${flavorId}/perfil/${userId}/avatar/profile-${Date.now()}.${extension}`;
    const fileRef = ref(storage, path);
    const contentType = getContentType(uri, 'image/jpeg');

    try {
        const response = await fetch(uri);
        if (response.status && !response.ok) {
            throw new Error(`Falha ao preparar imagem local: HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const uploadResult = await uploadBytes(fileRef, blob, {
            contentType,
            customMetadata: {
                userId,
                flavorId,
                kind: 'profile-avatar',
            },
        });

        const downloadURL = await getDownloadURL(uploadResult.ref);

        return {
            url: downloadURL,
            path,
        };
    } catch (error) {
        console.error('Error uploading profile image to storage:', error);
        throw error;
    }
};
