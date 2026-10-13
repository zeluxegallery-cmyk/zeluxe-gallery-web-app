import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Crown,
  Gem,
  Headphones,
  Palette,
  ShoppingBag,
  Shirt,
  Sparkles,
  Tag,
  TrendingUp,
  Truck,
  FolderTree,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import logo from '../assets/zeluxe-logo.png';

const staticCategories = [
  { title: 'শাড়ি', icon: Sparkles },
  { title: 'পুরুষদের', icon: Shirt },
  { title: 'মহিলাদের', icon: Crown },
  { title: 'এক্সেসরিজ', icon: Gem },
  { title: 'কসমেটিক্স', icon: Palette },
  { title: 'ব্যাগ', icon: ShoppingBag },
];

const whyCards = [
  { icon: Tag, title: 'প্রিমিয়াম কোয়ালিটি', desc: 'হাই কোয়ালিটি ফ্যাশন প্রোডাক্ট' },
  { icon: TrendingUp, title: 'ভালো মুনাফা', desc: 'প্রতিটি অর্ডারে বেস্ট প্রফিট' },
  { icon: Truck, title: 'সহজ ডেলিভারি', desc: 'কাস্টমারের ঠিকানায় পৌঁছে দিন' },
  { icon: Headphones, title: '২৪/৭ সাপোর্ট', desc: 'যেকোনো সমস্যায় সাথে আছি' },
];

const steps = [
  { num: '১', title: 'রেজিস্ট্রেশন করুন', desc: 'মোবাইল/ইমেইল দিয়ে অ্যাকাউন্ট তৈরি করুন' },
  { num: '২', title: '৳৯৯ পেমেন্ট করুন', desc: '01603-226151 নাম্বারে বিকাশ/নগদে পাঠান' },
  { num: '৩', title: 'রিসেলিং শুরু করুন', desc: 'অ্যাডমিন অ্যাপ্রুভের পরেই শুরু' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCategories(list);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* SECTION A — HERO */}
      <section className="bg-gradient-to-b from-zeluxe-gold/20 to-white px-5 py-12 text-center">
        <img src={logo} alt="Zeluxe Gallery" className="mx-auto mb-6 h-24" />
        <span className="mb-4 inline-block rounded-full bg-zeluxe-gold px-3 py-1 text-xs text-white">
          প্রিমিয়াম রিসেলিং প্লাটফর্ম
        </span>
        <h1 className="text-3xl font-bold leading-tight text-zeluxe-black">
          Zeluxe Gallery-তে<br />
          রিসেলার হয়ে<br />
          ব্যবসা শুরু করুন
        </h1>
        <p className="mt-4 text-sm text-gray-600">
          মাত্র ৳৯৯ মেম্বারশিপ ফি দিয়ে প্রিমিয়াম ফ্যাশন প্রোডাক্ট বিক্রি করে নিজের আয় গড়ে তুলুন
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/register"
            className="flex-1 rounded-xl bg-zeluxe-black px-5 py-3 text-center font-bold text-white transition hover:bg-[#2a2a2a] active:scale-[0.98]"
          >
            রেজিস্ট্রেশন করুন
          </Link>
          <Link
            to="/login"
            className="flex-1 rounded-xl border-2 border-zeluxe-black px-5 py-3 text-center font-bold text-zeluxe-black transition hover:bg-zeluxe-fieldbg active:scale-[0.98]"
          >
            লগইন
          </Link>
        </div>
      </section>

      {/* SECTION B — STATS ROW */}
      <section className="bg-zeluxe-black py-6 text-white">
        <div className="grid grid-cols-3 text-center">
          <div>
            <p className="text-2xl font-bold text-zeluxe-gold">৫০০০+</p>
            <p className="text-xs text-gray-300">প্রোডাক্ট</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-zeluxe-gold">১০০০+</p>
            <p className="text-xs text-gray-300">রিসেলার</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-zeluxe-gold">২৪/৭</p>
            <p className="text-xs text-gray-300">সাপোর্ট</p>
          </div>
        </div>
      </section>

      {/* SECTION C — WHY ZELUXE */}
      <section className="px-5 py-10">
        <h2 className="mb-6 text-center text-xl font-bold text-zeluxe-black">কেন Zeluxe Gallery?</h2>
        <div className="grid grid-cols-2 gap-3">
          {whyCards.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-zeluxe-lightgray bg-white p-4 text-center"
            >
              <Icon className="mx-auto text-zeluxe-gold" size={28} />
              <h3 className="mt-3 text-sm font-bold text-zeluxe-black">{title}</h3>
              <p className="mt-1 text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION D — HOW IT WORKS */}
      <section className="bg-zeluxe-fieldbg px-5 py-10">
        <h2 className="mb-6 text-center text-xl font-bold text-zeluxe-black">কীভাবে শুরু করবেন?</h2>
        <div className="mx-auto max-w-md space-y-4">
          {steps.map(({ num, title, desc }) => (
            <div key={num} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold text-sm font-bold text-white">
                {num}
              </span>
              <div>
                <h3 className="text-sm font-bold text-zeluxe-black">{title}</h3>
                <p className="mt-1 text-xs text-gray-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION E — SHOP CATEGORIES */}
      <section className="px-5 py-10">
        <h2 className="mb-4 text-xl font-bold text-zeluxe-black">জনপ্রিয় ক্যাটাগরি</h2>
        <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
          {categories.length > 0
            ? categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate('/register')}
                  className="flex min-w-[90px] flex-col items-center gap-2"
                >
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-zeluxe-lightgray bg-zeluxe-fieldbg">
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FolderTree size={24} className="text-zeluxe-gold" />
                    )}
                  </div>
                  <span className="text-center text-xs font-medium text-zeluxe-black">
                    {cat.name}
                  </span>
                </button>
              ))
            : staticCategories.map(({ title, icon: Icon }) => (
                <button
                  key={title}
                  onClick={() => navigate('/register')}
                  className="flex min-w-[90px] flex-col items-center gap-2"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-zeluxe-lightgray bg-zeluxe-fieldbg">
                    <Icon className="text-zeluxe-gold" size={24} />
                  </div>
                  <span className="text-center text-xs font-medium text-zeluxe-black">
                    {title}
                  </span>
                </button>
              ))}
        </div>
      </section>

      {/* SECTION F — FINAL CTA */}
      <section className="bg-zeluxe-black px-5 py-12 text-center text-white">
        <h2 className="text-2xl font-bold tracking-widest text-zeluxe-gold">ZELUXE GALLERY</h2>
        <p className="mt-2 text-sm text-gray-300">আজই রিসেলার হয়ে নিজের ব্যবসা শুরু করুন</p>
        <Link
          to="/register"
          className="mt-6 inline-block rounded-xl bg-zeluxe-gold px-8 py-3 font-bold text-zeluxe-black transition hover:brightness-110 active:scale-[0.98]"
        >
          রেজিস্ট্রেশন করুন
        </Link>
      </section>
    </div>
  );
}
