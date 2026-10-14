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
  Menu,
  X,
  Package,
  Wallet,
  ShieldCheck,
  Check,
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

const heroFeatures = [
  { icon: Package, title: 'স্টক লাগবে না', desc: 'আমরা ইনভেন্টরি ম্যানেজ করি' },
  { icon: Wallet, title: 'শূন্য ইনভেস্টমেন্ট', desc: 'মাত্র ৳৯৯ মেম্বারশিপ ফি' },
  { icon: Truck, title: 'ফুল ডেলিভারি', desc: 'কাস্টমারের ঠিকানায় পৌঁছাই' },
];

const steps = [
  { num: '১', title: 'রেজিস্ট্রেশন করুন', desc: 'মোবাইল/ইমেইল দিয়ে অ্যাকাউন্ট তৈরি করুন' },
  { num: '২', title: '৳৯৯ পেমেন্ট করুন', desc: '01603-226151 নাম্বারে বিকাশ/নগদে পাঠান' },
  { num: '৩', title: 'রিসেলিং শুরু করুন', desc: 'অ্যাডমিন অ্যাপ্রুভের পরেই শুরু' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

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
      {/* ═══════ TOP NAVBAR (Desktop only) ═══════ */}
      <nav className="sticky top-0 z-40 hidden border-b border-zeluxe-lightgray bg-white/95 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Zeluxe Gallery" className="h-12 object-contain" />
          </Link>

          <div className="flex items-center gap-8 text-sm font-medium text-zeluxe-black">
            <a href="#hero" className="transition hover:text-zeluxe-gold">হোম</a>
            <a href="#why" className="transition hover:text-zeluxe-gold">কেন আমরা</a>
            <a href="#how" className="transition hover:text-zeluxe-gold">কীভাবে</a>
            <a href="#categories" className="transition hover:text-zeluxe-gold">ক্যাটাগরি</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl border-2 border-zeluxe-black px-5 py-2 text-sm font-bold text-zeluxe-black transition hover:bg-zeluxe-black hover:text-white"
            >
              লগইন
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-zeluxe-gold px-5 py-2 text-sm font-bold text-zeluxe-black transition hover:brightness-110"
            >
              রেজিস্ট্রেশন
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════ MOBILE HEADER ═══════ */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-zeluxe-lightgray bg-white px-4 py-3 md:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 text-zeluxe-black transition hover:bg-zeluxe-fieldbg"
        >
          <Menu size={22} />
        </button>
        <img src={logo} alt="Zeluxe Gallery" className="h-12 object-contain" />
        <Link
          to="/login"
          className="rounded-lg bg-zeluxe-black px-3 py-2 text-xs font-bold text-white"
        >
          লগইন
        </Link>
      </div>

      {/* ═══════ MOBILE MENU DRAWER ═══════ */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white p-5 shadow-2xl md:hidden">
            <div className="mb-6 flex items-center justify-between">
              <img src={logo} alt="Zeluxe Gallery" className="h-14 object-contain" />
              <button
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-zeluxe-gray hover:bg-zeluxe-fieldbg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-1">
              <a
                href="#hero"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-zeluxe-black transition hover:bg-zeluxe-fieldbg"
              >
                হোম
              </a>
              <a
                href="#why"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-zeluxe-black transition hover:bg-zeluxe-fieldbg"
              >
                কেন আমরা
              </a>
              <a
                href="#how"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-zeluxe-black transition hover:bg-zeluxe-fieldbg"
              >
                কীভাবে
              </a>
              <a
                href="#categories"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-zeluxe-black transition hover:bg-zeluxe-fieldbg"
              >
                ক্যাটাগরি
              </a>
            </div>
            <div className="mt-6 space-y-2">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl border-2 border-zeluxe-black py-3 text-center text-sm font-bold text-zeluxe-black"
              >
                লগইন
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl bg-zeluxe-gold py-3 text-center text-sm font-bold text-zeluxe-black"
              >
                রেজিস্ট্রেশন
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ═══════ HERO SECTION ═══════ */}
      <section
        id="hero"
        className="relative overflow-hidden bg-gradient-to-br from-zeluxe-black via-gray-900 to-black px-5 py-14 text-white md:py-20"
      >
        {/* Decorative gold blur */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-zeluxe-gold/20 blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-zeluxe-gold/10 blur-3xl"></div>

        <div className="relative mx-auto max-w-6xl md:flex md:items-center md:gap-12">
          {/* Left content */}
          <div className="md:flex-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-zeluxe-gold/30 bg-zeluxe-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zeluxe-gold">
              <Sparkles size={12} />
              প্রিমিয়াম রিসেলিং প্লাটফর্ম
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
              Zeluxe Gallery-তে
              <br />
              <span className="text-zeluxe-gold">রিসেলার</span> হয়ে
              <br />
              ব্যবসা শুরু করুন
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-relaxed text-gray-300 md:text-base">
              মাত্র ৳৯৯ মেম্বারশিপ ফি দিয়ে প্রিমিয়াম ফ্যাশন প্রোডাক্ট বিক্রি করে
              নিজের আয় গড়ে তুলুন। স্টক, ডেলিভারি, কাস্টমার — সব কিছু আমরা সামলাই।
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 rounded-xl bg-zeluxe-gold px-7 py-3.5 text-sm font-bold text-zeluxe-black transition hover:brightness-110 active:scale-[0.98]"
              >
                <Sparkles size={16} />
                রেজিস্ট্রেশন করুন
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-white/20 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
              >
                লগইন
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-2xl font-bold text-zeluxe-gold md:text-3xl">৫০০০+</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                  প্রোডাক্ট
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-zeluxe-gold md:text-3xl">১০০০+</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                  রিসেলার
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-zeluxe-gold md:text-3xl">২৪/৭</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                  সাপোর্ট
                </p>
              </div>
            </div>
          </div>

          {/* Right floating feature cards (desktop only) */}
          <div className="hidden md:flex md:w-80 md:flex-col md:gap-4">
            {heroFeatures.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zeluxe-gold/20">
                  <Icon className="text-zeluxe-gold" size={22} />
                </span>
                <div>
                  <p className="font-bold text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ WHY ZELUXE ═══════ */}
      <section id="why" className="px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-zeluxe-gold">
              কেন আমরা
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zeluxe-black md:text-3xl">
              কেন Zeluxe Gallery?
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              হাজারো রিসেলার আমাদের উপর ভরসা রাখেন — কারণগুলো জানুন
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {whyCards.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-zeluxe-lightgray bg-white p-5 text-center transition hover:border-zeluxe-gold hover:shadow-md"
              >
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zeluxe-gold/10 transition group-hover:bg-zeluxe-gold">
                  <Icon
                    className="text-zeluxe-gold transition group-hover:text-white"
                    size={26}
                  />
                </span>
                <h3 className="mt-4 text-sm font-bold text-zeluxe-black">{title}</h3>
                <p className="mt-1 text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how" className="bg-zeluxe-fieldbg px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-zeluxe-gold">
              সহজ প্রক্রিয়া
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zeluxe-black md:text-3xl">
              কীভাবে শুরু করবেন?
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              মাত্র ৩টি ধাপে আপনি রিসেলিং শুরু করতে পারবেন
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {steps.map(({ num, title, desc }, idx) => (
              <div key={num} className="relative">
                <div className="rounded-2xl border border-zeluxe-lightgray bg-white p-6 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zeluxe-black text-lg font-bold text-zeluxe-gold">
                    {num}
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-zeluxe-black">{title}</h3>
                  <p className="mt-2 text-xs text-gray-500">{desc}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="absolute right-0 top-1/2 hidden h-0.5 w-6 -translate-y-1/2 translate-x-full bg-zeluxe-lightgray md:block"></div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-zeluxe-black px-8 py-3.5 text-sm font-bold text-white transition hover:bg-gray-800 active:scale-[0.98]"
            >
              এখনই শুরু করুন
              <Sparkles size={16} className="text-zeluxe-gold" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ CATEGORIES ═══════ */}
      <section id="categories" className="px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-zeluxe-gold">
              আমাদের কালেকশন
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zeluxe-black md:text-3xl">
              জনপ্রিয় ক্যাটাগরি
            </h2>
          </div>

          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-wrap md:justify-center md:px-0">
            {categories.length > 0
              ? categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => navigate('/register')}
                    className="flex min-w-[90px] flex-col items-center gap-2 md:min-w-[100px]"
                  >
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-zeluxe-lightgray bg-zeluxe-fieldbg transition hover:border-zeluxe-gold md:h-20 md:w-20">
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
                    className="flex min-w-[90px] flex-col items-center gap-2 md:min-w-[100px]"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-zeluxe-lightgray bg-zeluxe-fieldbg md:h-20 md:w-20">
                      <Icon className="text-zeluxe-gold" size={24} />
                    </div>
                    <span className="text-center text-xs font-medium text-zeluxe-black">
                      {title}
                    </span>
                  </button>
                ))}
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zeluxe-black via-gray-900 to-black px-5 py-16 text-center text-white">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-zeluxe-gold/20 blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-zeluxe-gold/10 blur-3xl"></div>

        <div className="relative mx-auto max-w-2xl">
          <span className="inline-block rounded-full border border-zeluxe-gold/30 bg-zeluxe-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zeluxe-gold">
            শুরু করার সময়
          </span>

          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            আজই <span className="text-zeluxe-gold">রিসেলার</span> হয়ে
            <br />
            নিজের ব্যবসা শুরু করুন
          </h2>

          <p className="mt-4 text-sm text-gray-300 md:text-base">
            মাত্র ৳৯৯ মেম্বারশিপ ফি — এককালীন। কোনো মাসিক চার্জ নেই।
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-zeluxe-gold px-8 py-4 text-sm font-bold text-zeluxe-black transition hover:brightness-110 active:scale-[0.98]"
            >
              <Check size={18} />
              রেজিস্ট্রেশন করুন
            </Link>
            <a
              href="https://wa.me/8801603226151"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-white/20 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/10"
            >
              সাপোর্টে যোগাযোগ
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <ShieldCheck size={14} className="text-zeluxe-gold" />
              নিরাপদ পেমেন্ট
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Check size={14} className="text-zeluxe-gold" />
              তাৎক্ষণিক সাপোর্ট
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Check size={14} className="text-zeluxe-gold" />
              ফ্রি রিসেলিং ট্রেনিং
            </span>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-zeluxe-lightgray bg-white px-5 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-between">
            <div className="text-center md:text-left">
              <img
                src={logo}
                alt="Zeluxe Gallery"
                className="mx-auto h-16 object-contain md:mx-0"
              />
              <p className="mt-2 text-xs text-gray-500">
                প্রিমিয়াম ফ্যাশন রিসেলিং প্লাটফর্ম
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                যোগাযোগ
              </p>
              <p className="mt-2 text-sm font-medium text-zeluxe-black">
                01603-226151
              </p>
              <a
                href="mailto:zeluxegallery@gmail.com"
                className="mt-1 block text-xs text-zeluxe-gold hover:underline"
              >
                zeluxegallery@gmail.com
              </a>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                লিংক
              </p>
              <div className="mt-2 flex flex-col gap-1 text-xs">
                <Link to="/register" className="text-gray-500 hover:text-zeluxe-gold">
                  রেজিস্ট্রেশন
                </Link>
                <Link to="/login" className="text-gray-500 hover:text-zeluxe-gold">
                  লগইন
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-zeluxe-lightgray pt-6 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Zeluxe Gallery. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
