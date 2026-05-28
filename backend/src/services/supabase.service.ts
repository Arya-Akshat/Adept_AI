import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config/env';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';
import { INTERNAL_SERVER_ERROR } from '../constants/http';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Uploads a file buffer to Supabase Storage.
 * @param bucketName The name of the Supabase bucket (e.g., 'adept-files')
 * @param fileName The name to save the file as
 * @param fileBuffer The raw file buffer
 * @param contentType The MIME type of the file
 * @returns The public URL of the uploaded file
 */
export const uploadFileToSupabase = async (
  bucketName: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      logger.error({ error }, `Failed to upload ${fileName} to Supabase`);
      throw new AppError(INTERNAL_SERVER_ERROR, `Supabase upload failed: ${error.message}`, "SUPABASE_ERROR");
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    logger.error({ err }, "Error in uploadFileToSupabase");
    if (err instanceof AppError) throw err;
    throw new AppError(INTERNAL_SERVER_ERROR, `Supabase error: ${err.message}`, "SUPABASE_ERROR");
  }
};

/**
 * Deletes a file from Supabase Storage.
 * @param bucketName The name of the Supabase bucket
 * @param fileName The name of the file to delete
 */
export const deleteFileFromSupabase = async (
  bucketName: string,
  fileName: string
): Promise<void> => {
  try {
    const { error } = await supabase.storage.from(bucketName).remove([fileName]);
    if (error) {
      logger.error({ error }, `Failed to delete ${fileName} from Supabase`);
    } else {
      logger.info(`Successfully deleted ${fileName} from Supabase`);
    }
  } catch (err) {
    logger.error({ err }, "Error in deleteFileFromSupabase");
  }
};
