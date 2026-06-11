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

/** Akzeptiert eine nackte Ordner-ID oder einen kompletten Drive-Link und liefert die ID. */
export function extractDriveFolderId(input: string): string {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/\/folders\/([A-Za-z0-9_-]+)/);
  if (fromUrl) return fromUrl[1];
  return trimmed.split(/[?#]/)[0];
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  imageMediaMetadata?: {
    width: number;
    height: number;
  };
}

export async function listImagesInFolder(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: "files(id, name, mimeType, imageMediaMetadata, thumbnailLink)",
    orderBy: "name",
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (response.data.files || []) as DriveFile[];
}

export async function getDriveThumbnailLink(fileId: string): Promise<string | null> {
  const drive = getDriveClient();
  const response = await drive.files.get({
    fileId,
    fields: "thumbnailLink",
    supportsAllDrives: true,
  });
  return response.data.thumbnailLink ?? null;
}

export async function getDriveImageBuffer(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();

  const response = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
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
    supportsAllDrives: true,
  });

  return response.data.id!;
}
