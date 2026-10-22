import { toast } from 'sonner';

// ═══ একক ছবি ডাউনলোড করার ফাংশন ═══
export async function downloadSingleImage(url: string, fileName: string) {
  const toastId = toast.loading('ছবি ডাউনলোড হচ্ছে...');

  try {
    let downloadUrl = url;
    
    // ক্লাউডিনারিতে ফোর্স করে JPEG ফরম্যাটে আনা হচ্ছে
    if (url.includes('res.cloudinary.com')) {
      downloadUrl = url.replace('/upload/', '/upload/f_jpg,q_auto,w_1000/');
    }

    const response = await fetch(downloadUrl, { 
      method: 'GET',
      mode: 'cors', 
      credentials: 'omit' 
    });

    if (!response.ok) throw new Error('Fetch failed');

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const blob = await response.blob();
    const finalBlob = new Blob([blob], { type: contentType });

    const blobUrl = window.URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    window.URL.revokeObjectURL(blobUrl);
    toast.dismiss(toastId);
    toast.success('✓ ছবি ডাউনলোড হয়েছে!');
    
  } catch (err) {
    toast.dismiss(toastId);
    console.error('Download failed:', err);
    toast.error('ছবি ডাউনলোডে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    
    // যদি CORS এরর দেয়, তবে ব্রাউজারের ডিফল্ট উপায়ে ডাউনলোড হবে
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}