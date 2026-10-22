// src/lib/imageDownloader.ts
import { toast } from 'sonner';

export async function saveImagesToGallery(imageUrls: string[], productName: string) {
  if (!imageUrls || imageUrls.length === 0) {
    toast.error('কোনো ছবি পাওয়া যায়নি');
    return;
  }

  const safeName = productName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const toastId = toast.loading('ছবি প্রস্তুত হচ্ছে...');

  try {
    const files: File[] = [];
    
    // ═══ ১. ছবিগুলো ফেচ করে ফাইল তৈরি করা ═══
    for (let i = 0; i < imageUrls.length; i++) {
      let url = imageUrls[i];
      
      // Cloudinary-তে JPEG ফরম্যাটে কনভার্ট করা হচ্ছে
      if (url.includes('res.cloudinary.com')) {
        url = url.replace('/upload/', '/upload/f_jpg,q_auto,w_1000/');
      }

      try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) continue;
        
        const blob = await response.blob();
        const file = new File([blob], `${safeName}-${i + 1}.jpg`, { type: 'image/jpeg' });
        files.push(file);
      } catch (err) {
        console.warn('Fetch failed for:', url);
        // একটি ছবি ফেইল করলেও বাকিগুলো লোড হবে
      }
    }

    toast.dismiss(toastId);

    // ═══ ২. Web Share API চেক করা ═══
    const canShareFiles = 
      typeof navigator.share === 'function' && 
      typeof navigator.canShare === 'function' && 
      files.length > 0 &&
      navigator.canShare({ files });

    if (canShareFiles) {
      try {
        // শেয়ার মেনু ওপেন করা
        await navigator.share({ files });
        toast.success('ছবি শেয়ার করা হয়েছে! গ্যালারিতে সেভ করুন।');
      } catch (err: any) {
        // ইউজার ক্যানসেল করলে বা এরর হলে ফলব্যাক
        if (err.name !== 'AbortError') {
          console.warn('Share API failed, using fallback');
          fallbackDownload(imageUrls, safeName);
        }
      }
    } else {
      // ═══ ৩. যদি Web Share API কাজ না করে (পুরনো ব্রাউজার বা CORS ব্লক) ═══
      fallbackDownload(imageUrls, safeName);
    }

  } catch (error) {
    toast.dismiss(toastId);
    console.error(error);
    // একদম শেষ উপায়: সরাসরি ডাউনলোড
    fallbackDownload(imageUrls, safeName);
  }
}

// ═══ ফলব্যাক ডাউনলোড (যদি শেয়ার মেনু কাজ না করে) ═══
function fallbackDownload(imageUrls: string[], safeName: string) {
  toast.info('ছবি ডাউনলোড শুরু হচ্ছে... Chrome ব্লক করলে "Allow" দিন।');
  
  imageUrls.forEach((url, i) => {
    setTimeout(() => {
      // ব্রাউজারের ডিফল্ট ডাউনলোড ব্যবহার করা হচ্ছে (CORS লাগে না)
      const a = document.createElement('a');
      a.href = url; // অরিজিনাল লিংক ব্যবহার করা হচ্ছে
      a.download = `${safeName}-${i + 1}.jpg`;
      a.target = '_blank'; // নতুন ট্যাবে ওপেন করবে, যা ব্রাউজারকে ডাউনলোড করতে বাধ্য করে
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, i * 1000); // প্রতিটি ছবির মাঝে ১ সেকেন্ড বিরতি
  });
}