import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";

import { supabase } from "./supabase";
import { slugifyFileName } from "./utils";

type UploadOptions = {
  bucket?: string;
  contentType?: string;
  fileName?: string;
};

async function uploadFileToSupabase(
  localUri: string,
  userId: string,
  messageId: string,
  options: UploadOptions = {}
): Promise<string | null> {
  try {
    const bucket = options.bucket ?? "chat-images";
    const isRemote =
      localUri.startsWith("http://") || localUri.startsWith("https://");

    if (!isRemote) {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        console.error("Lêer bestaan nie:", localUri);
        return null;
      }
    }

    const defaultFileName = `${userId}/${messageId}-${Date.now()}`;
    const fileName = options.fileName ?? defaultFileName;
    const contentType = options.contentType ?? "application/octet-stream";
    const fileBinary = await readFileAsBinary(localUri);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBinary, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("Kon nie lêer oplaai nie:", error);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Lêer oplaai fout:", error);
    return null;
  }
}

export async function uploadImageToSupabase(
  localUri: string,
  userId: string,
  messageId: string
): Promise<string | null> {
  const extension = inferExtensionFromUri(localUri) ?? "jpg";
  const fileName = `${userId}/${messageId}-${Date.now()}.${extension}`;

  return uploadFileToSupabase(localUri, userId, messageId, {
    bucket: "chat-images",
    contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
    fileName,
  });
}

export async function uploadDocumentToSupabase(
  localUri: string,
  userId: string,
  messageId: string,
  originalName?: string,
  mimeType?: string
): Promise<string | null> {
  const safeName = originalName
    ? slugifyFileName(originalName)
    : `document-${Date.now()}.txt`;
  const fileName = `${userId}/${messageId}-${safeName}`;

  return uploadFileToSupabase(localUri, userId, messageId, {
    bucket: "chat-documents",
    contentType: mimeType ?? "text/plain",
    fileName,
  });
}

function inferExtensionFromUri(uri: string): string | null {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) {
    return "png";
  }
  if (lower.endsWith(".webp")) {
    return "webp";
  }
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) {
    return "jpg";
  }
  return null;
}

async function readFileAsBinary(localUri: string): Promise<Uint8Array> {
  let uri = localUri;
  let tempDownload: string | null = null;

  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    const targetDirectory =
      FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!targetDirectory) {
      throw new Error("Geen tydelike vouer beskikbaar vir aflaai nie.");
    }

    const downloadPath = `${targetDirectory}upload-${Date.now()}`;
    const download = await FileSystem.downloadAsync(uri, downloadPath);
    uri = download.uri;
    tempDownload = download.uri;
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (tempDownload) {
    FileSystem.deleteAsync(tempDownload, { idempotent: true }).catch(() => {});
  }

  return Buffer.from(base64, "base64");
}
