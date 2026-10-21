const CLOUD_NAME = 'q1zrv81l';
const UPLOAD_PRESET = 'zeluxe_unsigned';

export async function uploadImageToCloudinary(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('শুধু image file আপলোড করুন');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('ছবির সাইজ ৫MB এর কম হতে হবে');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'zeluxe-gallery');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!response.ok) {
    throw new Error('ছবি আপলোড ব্যর্থ হয়েছে');
  }

  const data = await response.json();
  
  // ═══ অটোমেটিক অপটিমাইজেশন লজিক ═══
  const originalUrl = data.secure_url as string;
  
  // লিংকের ভেতরে অটোমেটিক 'q_auto,f_auto,w_800' যোগ হয়ে যাবে
  const optimizedUrl = originalUrl.replace('/upload/', '/upload/q_auto,f_auto,w_800/');
  
  return optimizedUrl; 
}