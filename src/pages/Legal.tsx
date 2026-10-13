import { useState } from 'react';
import { Link } from 'react-router-dom';

type Tab = 'terms' | 'privacy' | 'refund';

export default function Legal() {
  const [activeTab, setActiveTab] = useState<Tab>('terms');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'terms', label: 'শর্তাবলী' },
    { key: 'privacy', label: 'প্রাইভেসি পলিসি' },
    { key: 'refund', label: 'রিফান্ড পলিসি' },
  ];

  return (
    <div className="min-h-screen bg-white px-5 py-8 pb-24">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-4 inline-block text-sm text-zeluxe-gray hover:text-zeluxe-black">
          ← হোম
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-zeluxe-black">Zeluxe Gallery</h1>
        <p className="mb-6 text-sm text-gray-500">আইনি তথ্য ও নীতিমালা</p>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-zeluxe-lightgray">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-zeluxe-gold text-zeluxe-black'
                  : 'text-gray-500 hover:text-zeluxe-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm leading-relaxed text-gray-700">
          {activeTab === 'terms' && <TermsContent />}
          {activeTab === 'privacy' && <PrivacyContent />}
          {activeTab === 'refund' && <RefundContent />}
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          সর্বশেষ আপডেট: অক্টোবর ২০২৬
        </p>
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <h2 className="text-lg font-bold text-zeluxe-black">১. সদস্যপদ ও ফি</h2>
      <p>
        Zeluxe Gallery-তে রিসেলার হিসেবে যোগ দিতে এককালীন ৳৯৯ মেম্বারশিপ ফি প্রদান করতে হবে।
        এই ফি অফিসিয়াল পেমেন্ট নাম্বার <strong>01603-226151</strong> (বিকাশ/নগদ)-এ পাঠিয়ে ট্রানজেকশন আইডি
        ও সেন্ডার নম্বর সাবমিট করতে হবে। অ্যাডমিন যাচাই করে approve করলে অ্যাকাউন্ট সক্রিয় হবে।
      </p>

      <h2 className="text-lg font-bold text-zeluxe-black">২. রিসেলারের দায়িত্ব</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>সঠিক তথ্য দিয়ে অ্যাকাউন্ট খুলতে হবে</li>
        <li>কাস্টমারের তথ্য গোপন রাখতে হবে</li>
        <li>Zeluxe Gallery-র ব্র্যান্ড ক্ষুণ্ণ হয় এমন কিছু করা যাবে না</li>
        <li>ভুয়া অর্ডার তৈরি করা যাবে না</li>
        <li>নিজের লাভ নিজে নির্ধারণ করতে পারবে, তবে ন্যায্য রাখতে হবে</li>
      </ul>

      <h2 className="text-lg font-bold text-zeluxe-black">৩. অর্ডার ও ডেলিভারি</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>সব অর্ডার সিস্টেমে এন্ট্রি করতে হবে</li>
        <li>প্রোডাক্টের আসল দাম Admin কর্তৃক নির্ধারিত</li>
        <li>ডেলিভারি চার্জ: ঢাকার ভিতরে ৳৭০, ঢাকার বাইরে ৳১২০</li>
        <li>ডেলিভারি ২-৫ কার্যদিবসে সম্পন্ন হবে</li>
      </ul>

      <h2 className="text-lg font-bold text-zeluxe-black">৪. নিষিদ্ধ কার্যক্রম</h2>
      <p>নিম্নলিখিত কাজ করলে অ্যাকাউন্ট স্থগিত বা বাতিল করা হবে:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>ভুয়া অর্ডার বা ভুয়া কাস্টমার তথ্য দেওয়া</li>
        <li>Zeluxe Gallery-র প্রোডাক্ট অন্য ব্র্যান্ডের নামে বিক্রি করা</li>
        <li>অন্য রিসেলারের তথ্য চুরি করা</li>
        <li>পেমেন্টে প্রতারণা করা</li>
        <li>অশালীন ভাষা বা আচরণ করা</li>
      </ul>

      <h2 className="text-lg font-bold text-zeluxe-black">৫. অ্যাকাউন্ট স্থগিতকরণ</h2>
      <p>
        যেকোনো নিয়ম ভঙ্গ করলে Zeluxe Gallery কর্তৃপক্ষ পূর্ব নোটিশ ছাড়াই অ্যাকাউন্ট স্থগিত বা বাতিল
        করার অধিকার রাখে। এই ক্ষেত্রে মেম্বারশিপ ফি ফেরতযোগ্য নয়।
      </p>

      <h2 className="text-lg font-bold text-zeluxe-black">৬. মূল্য পরিবর্তন</h2>
      <p>
        Zeluxe Gallery যেকোনো সময় প্রোডাক্টের দাম, ডেলিভারি চার্জ বা অন্য যেকোনো ফি পরিবর্তন করার
        অধিকার রাখে। পরিবর্তন হলে সিস্টেমে জানানো হবে।
      </p>

      <h2 className="text-lg font-bold text-zeluxe-black">৭. যোগাযোগ</h2>
      <p>
        যেকোনো প্রশ্ন বা অভিযোগের জন্য যোগাযোগ করুন:{' '}
        <a href="mailto:zeluxegallery@gmail.com" className="font-medium text-zeluxe-gold">
          zeluxegallery@gmail.com
        </a>
      </p>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <h2 className="text-lg font-bold text-zeluxe-black">১. আমরা কী তথ্য সংগ্রহ করি</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>নাম, মোবাইল নম্বর, ইমেইল</li>
        <li>ব্যবসার তথ্য (ব্যবসার নাম, লোগো, Facebook, WhatsApp)</li>
        <li>প্রোফাইল ছবি (ঐচ্ছিক)</li>
        <li>অর্ডার ও কাস্টমার তথ্য (নাম, ফোন, ঠিকানা)</li>
        <li>পেমেন্ট ট্রানজেকশন তথ্য</li>
      </ul>

      <h2 className="text-lg font-bold text-zeluxe-black">২. তথ্য কীভাবে ব্যবহার করি</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>অ্যাকাউন্ট যাচাই ও পরিচালনার জন্য</li>
        <li>অর্ডার প্রসেস ও ডেলিভারি নিশ্চিত করার জন্য</li>
        <li>কাস্টমার সাপোর্ট প্রদানের জন্য</li>
        <li>মেম্বারশিপ verification-এর জন্য</li>
        <li>নোটিফিকেশন ও আপডেট পাঠানোর জন্য</li>
      </ul>

      <h2 className="text-lg font-bold text-zeluxe-black">৩. তথ্যের নিরাপত্তা</h2>
      <p>
        আপনার তথ্য Google Firebase ও Cloudinary-তে সুরক্ষিতভাবে সংরক্ষিত। Firestore Security Rules
        দ্বারা সুরক্ষিত, শুধু আপনি নিজে এবং অ্যাডমিন আপনার তথ্য দেখতে পারেন।
      </p>

      <h2 className="text-lg font-bold text-zeluxe-black">৪. তথ্য শেয়ার</h2>
      <p>
        আমরা আপনার তথ্য তৃতীয় পক্ষের কাছে বিক্রি বা শেয়ার করি না। শুধু নিম্নলিখিত ক্ষেত্রে শেয়ার হতে পারে:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>ডেলিভারি পার্টনারের সাথে (কাস্টমারের ঠিকানা)</li>
        <li>আইনি বাধ্যবাধকতা থাকলে</li>
      </ul>

      <h2 className="text-lg font-bold text-zeluxe-black">৫. কুকিজ</h2>
      <p>
        আমরা লগইন সেশন ঠিক রাখতে এবং আপনার অভিজ্ঞতা উন্নত করতে কুকিজ ব্যবহার করি। আপনি ব্রাউজার
        সেটিংস থেকে কুকিজ বন্ধ করতে পারেন, তবে কিছু ফিচার কাজ করবে না।
      </p>

      <h2 className="text-lg font-bold text-zeluxe-black">৬. আপনার অধিকার</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>নিজের তথ্য দেখা ও আপডেট করা</li>
        <li>অ্যাকাউন্ট ডিলিট করার অনুরোধ করা</li>
        <li>যেকোনো তথ্য সম্পর্কে জানতে চাওয়া</li>
      </ul>

      <h2 className="text-lg font-bold text-zeluxe-black">৭. যোগাযোগ</h2>
      <p>
        প্রাইভেসি সংক্রান্ত প্রশ্নের জন্য:{' '}
        <a href="mailto:zeluxegallery@gmail.com" className="font-medium text-zeluxe-gold">
          zeluxegallery@gmail.com
        </a>
      </p>
    </>
  );
}

function RefundContent() {
  return (
    <>
      <h2 className="text-lg font-bold text-zeluxe-black">১. মেম্বারশিপ ফি (৳৯৯)</h2>
      <p>
        <strong>একবার পেমেন্ট হয়ে গেলে ৳৯৯ মেম্বারশিপ ফি ফেরতযোগ্য নয়।</strong> কারণ:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>এটি এককালীন ফি</li>
        <li>অ্যাকাউন্ট approve হওয়ার পর সিস্টেমে অ্যাক্সেস দেওয়া হয়</li>
        <li>অ্যাডমিন verification-এ সময় ব্যয় হয়</li>
      </ul>
      <p className="text-xs text-gray-500">
        তবে অ্যাডমিন যদি কোনো কারণে অ্যাকাউন্ট approve করতে অস্বীকার করে, তাহলে ৳৯৯ ফেরত দেওয়া হবে।
      </p>

      <h2 className="text-lg font-bold text-zeluxe-black">২. অর্ডার রিটার্ন</h2>
      <p>কাস্টমার রিটার্ন করলে নিম্নলিখিত শর্তে গ্রহণ করা হবে:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>প্রোডাক্ট ড্যামেজ বা ভুল প্রোডাক্ট হলে</li>
        <li>ডেলিভারির ২৪ ঘণ্টার মধ্যে জানাতে হবে</li>
        <li>প্রোডাক্ট অব্যবহৃত ও অরিজিনাল প্যাকেজিং-এ থাকতে হবে</li>
      </ul>

      <h2 className="text-lg font-bold text-zeluxe-black">৩. কী ফেরত দেওয়া হবে না</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>ব্যবহৃত বা ধোয়া প্রোডাক্ট</li>
        <li>কাস্টমাইজড বা অর্ডারকৃত প্রোডাক্ট</li>
        <li>অন্তর্বাস, কসমেটিক্স (স্বাস্থ্যবিধি)</li>
        <li>২৪ ঘণ্টা পরে জানালে</li>
      </ul>

      <h2 className="text-lg font-bold text-zeluxe-black">৪. রিফান্ড প্রসেস</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>রিটার্ন অনুমোদিত হলে ৩-৫ কার্যদিবসের মধ্যে প্রসেস হবে</li>
        <li>টাকা ফেরত দেওয়া হবে রিসেলারের bKash/Nagad নাম্বারে</li>
        <li>ডেলিভারি চার্জ ফেরতযোগ্য নয়</li>
      </ul>

      <h2 className="text-lg font-bold text-zeluxe-black">৫. Failed Delivery</h2>
      <p>
        কাস্টমার প্রোডাক্ট নিতে অস্বীকার করলে বা ভুল ঠিকানা দিলে, প্রোডাক্ট ফেরত আসবে।
        এই ক্ষেত্রে ডেলিভারি চার্জ কাস্টমারের থেকে নেওয়া হবে, যদি আপনি আগে না নিয়ে থাকেন।
      </p>

      <h2 className="text-lg font-bold text-zeluxe-black">৬. যোগাযোগ</h2>
      <p>
        রিফান্ড সংক্রান্ত প্রশ্নের জন্য:{' '}
        <a href="mailto:zeluxegallery@gmail.com" className="font-medium text-zeluxe-gold">
          zeluxegallery@gmail.com
        </a>
      </p>
    </>
  );
}
