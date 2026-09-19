const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const KEY_PATH = path.join(__dirname, '../config/google-service-account.json');
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1DiD3ZbtL9LGF6VDm8QvYmVzChVjvRUFF';

let driveClient = null;

const getDriveClient = () => {
    if (driveClient) return driveClient;
    try {
        if (!fs.existsSync(KEY_PATH)) {
            console.warn('⚠️ Google Service Account JSON not found at:', KEY_PATH);
            return null;
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: KEY_PATH,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        driveClient = google.drive({ version: 'v3', auth });
        console.log('✅ Google Drive Service Account authenticated successfully');
        return driveClient;
    } catch (err) {
        console.error('❌ Error authenticating Google Drive Service Account:', err.message);
        return null;
    }
};

/**
 * Upload file to Google Drive folder
 * @param {string} filePath Local file path or Readable Stream
 * @param {string} fileName Target file name on Google Drive
 * @param {string} mimeType File MIME type
 */
const uploadFileToDrive = async (filePath, fileName, mimeType) => {
    const drive = getDriveClient();
    if (!drive) throw new Error('Google Drive service is not configured');

    const fileMetadata = {
        name: fileName,
        parents: [FOLDER_ID],
    };

    const media = {
        mimeType: mimeType,
        body: typeof filePath === 'string' ? fs.createReadStream(filePath) : filePath,
    };

    const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink',
    });

    // Make file readable publicly via link
    try {
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
    } catch (permErr) {
        console.warn('Warning: Could not set public permission on Drive file:', permErr.message);
    }

    return response.data;
};

module.exports = {
    getDriveClient,
    uploadFileToDrive,
    FOLDER_ID,
};
