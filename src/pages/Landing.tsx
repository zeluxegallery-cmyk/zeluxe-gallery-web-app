import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown, Gem, Headphones, Palette, ShoppingBag, Shirt, Sparkles,
  Tag, TrendingUp, Truck, FolderTree, Menu, X, Package, Wallet,
  ShieldCheck, Check, BarChart3, GraduationCap, CreditCard,
  Star, ArrowRight, Zap, Users,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// ═══ Horizontal Logo (Cloudinary) ═══
const LOGO_URL =
  'https://res.cloudinary.com/q1zrv81l/image/upload/e_trim,h_100,c_fit/v1792001963/file_00000000537882099a4733703efdbdd1.png';

const staticCategories = [
  { title: 'শাড়ি', icon: Sparkles },
  { title: 'পুরুষদের', icon: Shirt },
  { title: 'মহিলাদের', icon: Crown },
  { title: 'এক্সেসরিজ', icon: Gem },
  { title: 'কসমেটিক্স', icon: Palette },
  { title: 'ব্যাগ', icon: ShoppingBag },
];

const services = [
  { icon: Package, title: 'স্টক লাগবে না', desc: 'আমরা inventory ম্যানেজ করি' },
  { icon: Wallet, title: 'শূন্য ইনভেস্টমেন্ট', desc: 'স্টক কেনার ঝামেলা নেই' },
  { icon: ShoppingBag, title: 'সহজ অর্ডার', desc: 'মোবাইল থেকেই সব করুন' },
  { icon: Truck, title: 'ফুল ডেলিভারি', desc: 'কাস্টমারের দরজায় পৌঁছাই' },
  { icon: CreditCard, title: 'সহজ Withdraw', desc: 'bKash/Nagad-এ টাকা তুলুন' },
  { icon: BarChart3, title: 'রিয়েল-টাইম রিপোর্ট', desc: 'Profit ও Sales দেখুন' },
  { icon: Headphones, title: '২৪/৭ সাপোর্ট', desc: 'WhatsApp-এ যেকোনো সময়' },
  { icon: GraduationCap, title: 'ফ্রি গাইড', desc: 'রিসেলিং শেখার সহজ টিপস' },
];

const whyCards = [
  { icon: Tag, title: 'প্রিমিয়াম প্রোডাক্ট', desc: 'হাতে বাছাই করা ফ্যাশন প্রোডাক্ট — প্রতিটি অর্ডারে ২০-৫০% পর্যন্ত profit।' },
  { icon: TrendingUp, title: 'প্রতিটি অর্ডারে লাভ', desc: 'Reseller Price এবং Suggested Price-এর ব্যবধানই আপনার লাভ।' },
  { icon: Truck, title: 'আমরাই ডেলিভারি দিই', desc: 'কাস্টমারের ঠিকানায় আমরা পৌঁছে দিই। শুধু অর্ডার নিন।' },
  { icon: Headphones, title: '২৪/৭ সাপোর্ট', desc: 'WhatsApp-এ যেকোনো সমস্যায় সাথে সাথে সাহায্য পাবেন।' },
];

const steps = [
  { num: '01', title: 'রেজিস্ট্রেশন করুন', desc: 'মোবাইল বা ইমেইল দিয়ে অ্যাকাউন্ট তৈরি করুন', time: '২ মিনিট' },
  { num: '02', title: '৳99 পাঠান', desc: '01603-226151 নাম্বারে বিকাশ বা নগদে', time: '৫ মিনিট' },
  { num: '03', title: 'রিসেলিং শুরু করুন', desc: 'Admin approve হলেই প্রোডাক্ট দেখতে পাবেন', time: '২৪ ঘণ্টায়' },
];

const testimonials = [
  {
    name: 'রাহুল হাসান', location: 'ঢাকা', role: '৩ মাসের রিসেলার', rating: 5,
    text: 'প্রথম মাসেই Tk 8,000 আয় করেছি। সাপোর্ট টিম সত্যিই দুর্দান্ত — যেকোনো সময় WhatsApp-এ message দিলেই সমাধান পাই।',
  },
  {
    name: 'সাবরিনা আক্তার', location: 'চট্টগ্রাম', role: '২ মাসের রিসেলার', rating: 5,
    text: 'স্টক রাখার টেনশন নেই, ডেলিভারির ঝামেলা নেই। শুধু অর্ডার নিই, বাকিটা Zeluxe করে দেয়। Students দের জন্য perfect।',
  },
  {
    name: 'মাহমুদুল ইসলাম', location: 'সিলেট', role: '৪ মাসের রিসেলার', rating: 5,
    text: 'আগে অন্য প্লাটফর্মে কাজ করেছি, কিন্তু Zeluxe-এর সাপোর্ট এবং কমিশন সিস্টেম সবচেয়ে ভালো। প্রতি সপ্তাহে টাকা তুলতে পারি।',
  },
];

export default function Landing() {
  const [categories, setCategories] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCategories(list.slice(0, 10));
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  return (
    <div className="min-h-screen bg-zeluxe-cream pb-20">
      {/* ═══════ NAVBAR (Desktop) ═══════ */}
      <nav className="sticky top-0 z-40 hidden border-b border-zeluxe-lightgray bg-white/95 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2.5">
          <Link to="/" className="flex items-center">
            <img
              src={LOGO_URL}
              alt="Zeluxe Gallery"
              className="h-9 w-auto object-contain md:h-10"
            />
          </Link>

          <div className="flex items-center gap-8 text-sm font-medium text-zeluxe-black">
            <a href="#hero" className="transition hover:text-zeluxe-gold">হোম</a>
            <a href="#services" className="transition hover:text-zeluxe-gold">সার্ভিস</a>
            <a href="#why" className="transition hover:text-zeluxe-gold">কেন আমরা</a>
            <a href="#testimonials" className="transition hover:text-zeluxe-gold">রিভিউ</a>
            <Link to="/faq" className="transition hover:text-zeluxe-gold">FAQ</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-md px-5 py-2 text-sm font-bold text-zeluxe-black transition hover:bg-zeluxe-cream"
            >
              লগইন
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-zeluxe-black px-5 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              রেজিস্ট্রেশন
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════ MOBILE HEADER ═══════ */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-zeluxe-lightgray bg-white px-4 py-2.5 md:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-md p-2 text-zeluxe-black transition hover:bg-zeluxe-cream"
          aria-label="Menu"
        >
          <Menu size={22} />
        </button>
        <img
          src={LOGO_URL}
          alt="Zeluxe Gallery"
          className="h-8 w-auto object-contain"
        />
        <Link to="/login" className="rounded-md bg-zeluxe-black px-3 py-1.5 text-xs font-bold text-white">
          লগইন
        </Link>
      </div>

      {/* ═══════ MOBILE MENU ═══════ */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white p-5 shadow-2xl md:hidden">
            <div className="mb-6 flex items-center justify-between">
              <img
                src={LOGO_URL}
                alt="Zeluxe Gallery"
                className="h-9 w-auto object-contain"
              />
              <button onClick={() => setMenuOpen(false)} className="rounded-md p-2 text-gray-500 hover:bg-zeluxe-cream">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-1">
              <a href="#hero" onClick={() => setMenuOpen(false)} className="block rounded-md px-4 py-3 text-sm font-medium text-zeluxe-black transition hover:bg-zeluxe-cream">হোম</a>
              <a href="#services" onClick={() => setMenuOpen(false)} className="block rounded-md px-4 py-3 text-sm font-medium text-zeluxe-black transition hover:bg-zeluxe-cream">সার্ভিস</a>
              <a href="#why" onClick={() => setMenuOpen(false)} className="block rounded-md px-4 py-3 text-sm font-medium text-zeluxe-black transition hover:bg-zeluxe-cream">কেন আমরা</a>
              <a href="#testimonials" onClick={() => setMenuOpen(false)} className="block rounded-md px-4 py-3 text-sm font-medium text-zeluxe-black transition hover:bg-zeluxe-cream">রিভিউ</a>
              <Link to="/faq" onClick={() => setMenuOpen(false)} className="block rounded-md px-4 py-3 text-sm font-medium text-zeluxe-black transition hover:bg-zeluxe-cream">FAQ</Link>
            </div>
            <div className="mt-6 space-y-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-md border-2 border-zeluxe-black py-3 text-center text-sm font-bold text-zeluxe-black">লগইন</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="block rounded-md bg-zeluxe-gold py-3 text-center text-sm font-bold text-zeluxe-black">রেজিস্ট্রেশন</Link>
            </div>
          </div>
        </>
      )}

      {/* ═══════ HERO ═══════ */}
      <section id="hero" className="relative overflow-hidden bg-zeluxe-black px-5 py-14 text-white md:py-20">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-zeluxe-gold/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-zeluxe-gold/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl md:flex md:items-center md:gap-12">
          <div className="md:flex-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-zeluxe-gold/30 bg-zeluxe-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">
              <Zap size={11} />
              Bangladesh's #1 Reseller Platform
            </span>

            <h1 className="mt-5 text-[34px] font-bold leading-[1.15] tracking-tight md:text-5xl md:leading-[1.1]">
              শূন্য ইনভেস্টমেন্টে
              <br />
              নিজের অনলাইন ব্যবসা
              <br />
              <span className="text-zeluxe-gold">শুরু করুন আজই</span>
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-gray-300">
              মাত্র <strong className="text-white">৳99 এককালীন</strong> মেম্বারশিপ ফি।
              স্টক নেই, ডেলিভারি টেনশন নেই — শুধু অর্ডার নিন,
              বাকিটা <span className="font-medium text-zeluxe-gold">আমরা</span> করি।
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="group flex items-center justify-center gap-2 rounded-md bg-zeluxe-gold px-7 py-4 text-sm font-bold text-zeluxe-black transition hover:brightness-110"
              >
                <Zap size={16} className="transition group-hover:scale-110" />
                আজই শুরু করুন — ৳99
              </Link>
              <a
                href="#services"
                className="flex items-center justify-center gap-2 rounded-md border border-white/20 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/5"
              >
                আরো জানুন
                <ArrowRight size={14} />
              </a>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-2.5 border-t border-white/10 pt-6 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Check size={14} className="text-zeluxe-gold" />
                নো মান্থলি ফি
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Check size={14} className="text-zeluxe-gold" />
                সারা দেশে ডেলিভারি
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Check size={14} className="text-zeluxe-gold" />
                ২৪/৭ WhatsApp সাপোর্ট
              </div>
            </div>
          </div>

          <div className="mt-8 md:mt-0 md:w-72 md:shrink-0">
            <div className="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                </span>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-300">
                  Live Now
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">মেম্বারশিপ ফি</p>
                  <p className="mt-0.5 text-2xl font-bold text-zeluxe-gold">Tk 99</p>
                  <p className="text-[11px] text-gray-500">এককালীন · ফেরতযোগ্য নয়</p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">কমিশন</p>
                  <p className="mt-0.5 text-2xl font-bold text-white">২০-৫০%</p>
                  <p className="text-[11px] text-gray-500">প্রতি অর্ডারে profit</p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">Approve Time</p>
                  <p className="mt-0.5 text-2xl font-bold text-white">২৪ ঘণ্টা</p>
                  <p className="text-[11px] text-gray-500">সর্বোচ্চ অপেক্ষা</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ SERVICES GRID ═══════ */}
      <section id="services" className="px-5 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">Why Choose Us</p>
            <h2 className="mt-3 text-2xl font-bold text-zeluxe-black md:text-3xl">
              যা যা পাবেন <span className="text-zeluxe-gold">Zeluxe</span>-এ
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
              রিসেলারদের সব প্রয়োজন এক প্লাটফর্মে
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {services.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group rounded-lg border border-zeluxe-lightgray bg-white p-4 transition hover:border-zeluxe-gold md:p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-zeluxe-cream transition group-hover:bg-zeluxe-gold">
                  <Icon className="text-zeluxe-gold transition group-hover:text-white" size={20} />
                </span>
                <h3 className="mt-3 text-sm font-bold text-zeluxe-black">{title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ WHY ZELUXE ═══════ */}
      <section id="why" className="bg-white px-5 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">Our Promise</p>
              <h2 className="mt-3 text-2xl font-bold leading-tight text-zeluxe-black md:text-3xl">
                কেন <span className="text-zeluxe-gold">৫০০+</span> রিসেলার
                <br />
                আমাদের উপর ভরসা রাখেন
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                আমরা শুধু প্রোডাক্ট দিই না — পুরো রিসেলিং সিস্টেম সহজ করে দিই।
                যাতে আপনি শুধু কাস্টমার নিয়ে ভাবতে পারেন।
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold">
                    <Check size={12} className="text-zeluxe-black" />
                  </span>
                  <p className="text-sm text-gray-700">
                    <strong className="text-zeluxe-black">No stock needed</strong> — আমরা inventory ম্যানেজ করি
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold">
                    <Check size={12} className="text-zeluxe-black" />
                  </span>
                  <p className="text-sm text-gray-700">
                    <strong className="text-zeluxe-black">Full delivery support</strong> — কাস্টমারের দরজায় পৌঁছাই
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold">
                    <Check size={12} className="text-zeluxe-black" />
                  </span>
                  <p className="text-sm text-gray-700">
                    <strong className="text-zeluxe-black">Weekly withdraw</strong> — সপ্তাহে ২ বার টাকা তোলা যায়
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {whyCards.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-lg border border-zeluxe-lightgray bg-zeluxe-cream p-4 md:p-5">
                  <Icon className="text-zeluxe-gold" size={22} />
                  <h3 className="mt-3 text-sm font-bold text-zeluxe-black">{title}</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how" className="px-5 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">How It Works</p>
            <h2 className="mt-3 text-2xl font-bold text-zeluxe-black md:text-3xl">মাত্র ৩ ধাপে শুরু</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">১০ মিনিটেই রিসেলার অ্যাকাউন্ট তৈরি</p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3 md:gap-4">
            {steps.map(({ num, title, desc, time }, idx) => (
              <div key={num} className="relative">
                <div className="rounded-lg border border-zeluxe-lightgray bg-white p-6 text-left transition hover:border-zeluxe-gold">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-zeluxe-gold/30">{num}</span>
                    <span className="rounded-full border border-zeluxe-lightgray bg-zeluxe-cream px-2 py-0.5 text-[10px] font-bold text-gray-600">
                      {time}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-zeluxe-black">{title}</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">{desc}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="absolute right-0 top-1/2 hidden h-0.5 w-6 -translate-y-1/2 translate-x-full bg-zeluxe-lightgray md:block" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-md bg-zeluxe-black px-8 py-4 text-sm font-bold text-white transition hover:bg-gray-800">
              <Zap size={16} className="text-zeluxe-gold" />
              এখনই শুরু করুন
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ CATEGORIES ═══════ */}
      <section id="categories" className="bg-white px-5 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">Our Collection</p>
            <h2 className="mt-3 text-2xl font-bold text-zeluxe-black md:text-3xl">জনপ্রিয় ক্যাটাগরি</h2>
          </div>

          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-wrap md:justify-center md:px-0">
            {categories.length > 0
              ? categories.map((cat) => (
                  <Link key={cat.id} to="/register" className="flex min-w-[80px] flex-col items-center gap-2 md:min-w-[100px]">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-zeluxe-lightgray bg-white transition hover:border-zeluxe-gold md:h-20 md:w-20">
                      {cat.imageUrl ? (
                        <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover" />
                      ) : (
                        <FolderTree size={22} className="text-zeluxe-gold" />
                      )}
                    </div>
                    <span className="text-center text-[11px] font-medium text-zeluxe-black">{cat.name}</span>
                  </Link>
                ))
              : staticCategories.map(({ title, icon: Icon }) => (
                  <Link key={title} to="/register" className="flex min-w-[80px] flex-col items-center gap-2 md:min-w-[100px]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zeluxe-lightgray bg-white md:h-20 md:w-20">
                      <Icon className="text-zeluxe-gold" size={22} />
                    </div>
                    <span className="text-center text-[11px] font-medium text-zeluxe-black">{title}</span>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section id="testimonials" className="px-5 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">Testimonials</p>
            <h2 className="mt-3 text-2xl font-bold text-zeluxe-black md:text-3xl">
              রিসেলাররা <span className="text-zeluxe-gold">কী বলছেন</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">হাজারো রিসেলারের অভিজ্ঞতা পড়ুন</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t, idx) => (
              <div key={idx} className="rounded-lg border border-zeluxe-lightgray bg-white p-5">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} className="fill-zeluxe-gold text-zeluxe-gold" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-gray-700">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3 border-t border-zeluxe-lightgray pt-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zeluxe-cream text-sm font-bold text-zeluxe-gold">
                    {t.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-zeluxe-black">{t.name}</p>
                    <p className="text-[11px] text-gray-500">{t.location} · {t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">* রিসেলারদের পরিচয় গোপন রাখা হয়েছে</p>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="relative overflow-hidden bg-zeluxe-black px-5 py-16 text-center text-white md:py-20">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-zeluxe-gold/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-zeluxe-gold/10 blur-3xl" />

        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            Live · এই সপ্তাহে ২৩ জন যোগ দিয়েছেন
          </span>

          <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            আজই <span className="text-zeluxe-gold">রিসেলার</span> হয়ে
            <br />
            নিজের ব্যবসা শুরু করুন
          </h2>

          <p className="mx-auto mt-4 max-w-md text-sm text-gray-300">
            মাত্র <strong className="text-white">৳99</strong> এককালীন মেম্বারশিপ ফি।
            কোনো মাসিক বা বাৎসরিক চার্জ নেই।
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="group inline-flex items-center gap-2 rounded-md bg-zeluxe-gold px-8 py-4 text-sm font-bold text-zeluxe-black transition hover:brightness-110">
              <Zap size={16} className="transition group-hover:scale-110" />
              এখনই রেজিস্ট্রেশন
            </Link>
            <a href="https://wa.me/8801603226151" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-white/20 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/5">
              <Headphones size={16} />
              সাপোর্টে যোগাযোগ
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-zeluxe-gold" />
              Secure Payment
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-zeluxe-gold" />
              No Hidden Fees
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-zeluxe-gold" />
              500+ Resellers
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
                src={LOGO_URL}
                alt="Zeluxe Gallery"
                className="mx-auto h-10 w-auto object-contain md:mx-0"
              />
              <p className="mt-2 text-xs text-gray-500">প্রিমিয়াম ফ্যাশন রিসেলিং প্লাটফর্ম</p>
            </div>

            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">যোগাযোগ</p>
              <p className="mt-2 text-sm font-medium text-zeluxe-black">01603-226151</p>
              <a href="mailto:zeluxegallery@gmail.com" className="mt-1 block text-xs text-zeluxe-gold hover:underline">
                zeluxegallery@gmail.com
              </a>
            </div>

            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">লিংক</p>
              <div className="mt-2 flex flex-col gap-1 text-xs">
                <Link to="/register" className="text-gray-500 hover:text-zeluxe-gold">রেজিস্ট্রেশন</Link>
                <Link to="/login" className="text-gray-500 hover:text-zeluxe-gold">লগইন</Link>
                <Link to="/faq" className="text-gray-500 hover:text-zeluxe-gold">FAQ</Link>
                <Link to="/legal" className="text-gray-500 hover:text-zeluxe-gold">Legal</Link>
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