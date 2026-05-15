import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseConfig';

/**
 * Uploads a file from a local URI to Firebase Storage.
 * @param {string} uri Local URI of the file.
 * @param {string} folderPath Destination folder in Storage.
 * @returns {Promise<string>} Download URL of the uploaded file.
 */
export const uploadFileToStorage = async (uri, folderPath) => {
    if (!uri) return null;

    try {
        // Prepare the file name
        const filename = uri.split('/').pop();
        const timestamp = new Date().getTime();
        const uniqueName = `${timestamp}-${filename}`;
        const fileRef = ref(storage, `${folderPath}/${uniqueName}`);

        // Convert URI to Blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Upload
        const uploadResult = await uploadBytes(fileRef, blob);
        
        // Get Download URL
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        return downloadURL;
    } catch (error) {
        console.error("Error uploading file to storage:", error);
        throw error;
    }
};
