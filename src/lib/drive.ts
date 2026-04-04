import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient() {
  const keyJson = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!, "base64").toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials: keyJson,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  imageMediaMetadata?: {
    width: number;
    height: number;
  };
}

export async function listDriveImages(): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: "files(id, name, mimeType, imageMediaMetadata)",
    orderBy: "name",
    pageSize: 100,
  });

  return (response.data.files || []) as DriveFile[];
}

export async function getDriveImageBuffer(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();

  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

export async function uploadFileToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

  const stream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id",
  });

  return response.data.id!;
}
