// Cloudinary integration service
export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export class CloudinaryService {
  private static cloudName = 'dkzklcr1a'; // Replace with your Cloudinary cloud name
  private static uploadPreset = 'video_upload'; // Replace with your upload preset

  static async uploadFile(fileUri: string): Promise<CloudinaryUploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'audio/mp3',
        name: `setoran_${Date.now()}.mp3`,
      } as any);
      formData.append('upload_preset', this.uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        return {
          secure_url: data.secure_url,
          public_id: data.public_id,
        };
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  static async deleteFile(publicId: string): Promise<boolean> {
    try {
      // This would require server-side implementation for security
      // For now, we'll just return true
      return true;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }
}