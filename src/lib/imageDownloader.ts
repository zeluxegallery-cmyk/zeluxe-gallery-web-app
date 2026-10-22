// src/lib/imageDownloader.ts
import { toast } from 'sonner';

export async function saveImagesToGallery(imageUrls: string[], productName: string) {
  if (!imageUrls || imageUrls.length === 0) {
    toast.error('কোনো ছবি পাওয়া যায়নি');
    return;
  }

  const toastId = toast.loading('ছবি প্রস্তুত হচ্ছে...');

  try {
    const files: File[] = [];

    // ১. সব ছবি ফেচ করা এবং File অবজেক্টে কনভার্ট করা
    for (let i = 0; i < imageUrls.length; i++) {
      // ক্লাউডিনারিতে ফোর্স করে JPEG ফরম্যাটে আনা হচ্ছে (যাতে কালো না দেখায়)
      let url = imageUrls[i];
      if (url.includes('res.cloudinary.com')) {
        url = url.replace('/upload/', '/upload/f_jpg/');
      }

      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) continue;

      const blob = await response.blob();
      // ফাইলের নাম তৈরি
      const fileName = `${productName.replace(/[^a-zA-Z0-9]/g, '-')}-${i + 1}.jpg`;
      
      // ফাইল তৈরি (সঠিক টাইপ দিয়ে)
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      files.push(file);
    }

    toast.dismiss(toastId);

    if (files.length === 0) {
      toast.error('ছবিগুলো প্রসেস করা যায়নি।');
      return;
    }

    // ২. Web Share API চেক করা
    const canShareFiles = 
      typeof navigator.share === 'function' && 
      typeof navigator.canShare === 'function' && 
      navigator.canShare({ files });

    // ৩. শেয়ার করা অথবা ফলব্যাক করা
    if (canShareFiles) {
      try {
        await navigator.share({
          files: files,
          title: `${productName} - Images`,
        });
        toast.success('ছবি শেয়ার করা হয়েছে! গ্যালারিতে সেভ করুন।');
      } catch (err: any) {
        // ইউজার ক্যানসেল করলে বা এরর হলে
        if (err.name !== 'AbortError') {
          fallbackDownload(files);
        }
      }
    } else {
      // ৪. যদি Web Share API সাপোর্ট না করে (পুরনো ব্রাউজার), তবে ফলব্যাক ডাউনলোড
      fallbackDownload(files);
    }

  } catch (error) {
    toast.dismiss(toastId);
    console.error(error);
    toast.error('ছবি ডাউনলোডে সমস্যা হয়েছে।');
  }
}

// ═══ ফলব্যাক ডাউনলোড (যদি শেয়ার মেনু কাজ না করে) ═══
async function fallbackDownload(files: File[]) {
  toast.info('ছবি ডাউনলোড শুরু হচ্ছে... Chrome ব্লক করলে "Allow" দিন।');
  
  for (let i = 0; i < files.length; i++) {
    const url = URL.createObjectURL(files[i]);
    const a = document.createElement('a');
    a.href = url;
    a.download = files[i].name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // প্রতিটির মাঝে ১ সেকেন্ড বিরতি
    await new Promise((resolve) => setTimeout(resolve, 1000));
    URL.revokeObjectURL(url);
  }
}