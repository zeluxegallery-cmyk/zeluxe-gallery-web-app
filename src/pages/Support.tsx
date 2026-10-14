import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MessageCircle,
  Mail,
  HelpCircle,
  ChevronRight,
  X,
  Phone,
  ExternalLink,
} from 'lucide-react';
import Layout from '../components/Layout';

type FAQ = {
  id: string;
  question: string;
  answer: string;
  keywords: string;
  category: string;
};

const FAQ_DATA: FAQ[] = [
  {
    id: 'faq-1',
    question: 'কীভাবে অর্ডার তৈরি করব?',
    answer:
      'Products মেনুতে যান → যেকোনো প্রোডাক্টে ক্লিক করুন → "Order Now" বাটনে ক্লিক করুন → কাস্টমারের নাম, ফোন, ঠিকানা দিয়ে সাবমিট করুন। অর্ডার অটোমেটিক তৈরি হয়ে যাবে এবং My Orders-এ দেখতে পাবেন।',
    keywords: 'order অর্ডার তৈরি করব কিভাবে new create customer',
    category: 'অর্ডার',
  },
  {
    id: 'faq-2',
    question: 'টাকা কখন পাব?',
    answer:
      'ডেলিভারি সম্পন্ন হওয়ার পর (Delivered status) profit আপনার Available Balance-এ যোগ হবে। সর্বনিম্ন Tk ৫০০ হলে "টাকা তুলুন" থেকে Withdraw request দিতে পারবেন। Approve হলে ২৪-৪৮ ঘণ্টার মধ্যে বিকাশ/নগদে পৌঁছে যাবে।',
    keywords: 'টাকা পাব payment withdraw balance payout kobe',
    category: 'Withdraw',
  },
  {
    id: 'faq-3',
    question: 'পাসওয়ার্ড ভুলে গেছি, কী করব?',
    answer:
      'Login page-এ "পাসওয়ার্ড ভুলে গেছেন?" লিংকে ক্লিক করুন। আপনার ইমেইল দিন → Firebase থেকে reset লিংক ইমেইলে আসবে → সেখান থেকে নতুন পাসওয়ার্ড সেট করুন।',
    keywords: 'password পাসওয়ার্ড ভুলে গেছি reset forgot login',
    category: 'অ্যাকাউন্ট',
  },
  {
    id: 'faq-4',
    question: 'Order cancel করব কীভাবে?',
    answer:
      'Order "Pending" অবস্থায় থাকলে আপনি নিজে cancel করতে পারবেন। তবে Confirmed বা Shipped হলে Admin-এর সাথে যোগাযোগ করতে হবে। My Orders → নির্দিষ্ট অর্ডারে ক্লিক করে "Cancel" বাটন দেখুন।',
    keywords: 'cancel বাতিল অর্ডার বাতিল delete',
    category: 'অর্ডার',
  },
  {
    id: 'faq-5',
    question: 'ডেলিভারি কতদিনে হবে?',
    answer:
      'ঢাকার ভিতরে ১-২ কার্যদিবস এবং ঢাকার বাইরে ২-৪ কার্যদিবস। সাধারণত ৩-৫ দিনের মধ্যে ডেলিভারি সম্পন্ন হয়। কাস্টমার না পেলে বা ফোন না ধরলে ডেলিভারি ১-২ দিন বিলম্ব হতে পারে।',
    keywords: 'delivery ডেলিভারি কতদিন কবে সময় সময়সীমা',
    category: 'ডেলিভারি',
  },
  {
    id: 'faq-6',
    question: 'মেম্বারশিপ ফি ফেরত পাব?',
    answer:
      'একবার Approve হয়ে গেলে ৳৯৯ ফেরতযোগ্য নয়। তবে Admin কোনো কারণে অ্যাকাউন্ট Approve করতে অস্বীকার করলে সম্পূর্ণ ফি ফেরত দেওয়া হবে।',
    keywords: 'membership ফি মেম্বারশিপ ৳৯৯ refund ফেরত',
    category: 'মেম্বারশিপ',
  },
  {
    id: 'faq-7',
    question: 'প্রোডাক্টের দাম কীভাবে নির্ধারণ করব?',
    answer:
      'প্রতিটি প্রোডাক্টে দুটি দাম দেখবেন — Reseller Price (আপনার কেনার দাম) এবং Suggested Price (কাস্টমারকে বিক্রির পরামর্শমূল্য)। Suggested Price-এ বিক্রি করলে সর্বোচ্চ profit পাবেন। নিজের ইচ্ছামতো দাম ঠিক করতে পারবেন।',
    keywords: 'price দাম কত লাভ profit কতটুকু margin',
    category: 'প্রোডাক্ট',
  },
  {
    id: 'faq-8',
    question: 'প্রোডাক্টের ছবি কীভাবে কাস্টমারকে পাঠাব?',
    answer:
      'Products page-এ যেকোনো প্রোডাক্টে দুটি বাটন আছে — "ছবি" (সব ছবি একসাথে ডাউনলোড) এবং "কপি" (নাম + description + দাম কপি)। ডাউনলোড করা ছবি এবং কপি করা তথ্য WhatsApp বা Facebook-এ কাস্টমারকে পাঠাতে পারবেন।',
    keywords: 'ছবি download ডাউনলোড copy কপি share শেয়ার',
    category: 'প্রোডাক্ট',
  },
  {
    id: 'faq-9',
    question: 'কাস্টমার প্রোডাক্ট না নিলে কী হবে?',
    answer:
      'কাস্টমার প্রোডাক্ট না নিলে বা ভুল ঠিকানা দিলে ডেলিভারি ফেরত আসবে। সেক্ষেত্রে উক্ত অর্ডারের profit হবে না এবং ডেলিভারি চার্জ আপনার দায়িত্বে কেটে নেওয়া হতে পারে।',
    keywords: 'return রিটার্ন ফেরত না নিলে failed delivery',
    category: 'ডেলিভারি',
  },
  {
    id: 'faq-10',
    question: 'কতগুলো অর্ডার একসাথে করতে পারব?',
    answer:
      'কোনো লিমিট নেই — যত খুশি অর্ডার করতে পারবেন। তবে প্রতি অর্ডারে সঠিক কাস্টমার তথ্য দেওয়া জরুরি। ভুয়া অর্ডার তৈরি করলে অ্যাকাউন্ট suspend হতে পারে।',
    keywords: 'limit কতটুকু একসাথে কতগুলো maximum',
    category: 'অর্ডার',
  },
];

const POPULAR_IDS = ['faq-1', 'faq-2', 'faq-3', 'faq-5', 'faq-8'];

export default function Support() {
  const [query, setQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const popularFaqs = useMemo(
    () => FAQ_DATA.filter((f) => POPULAR_IDS.includes(f.id)),
    []
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return FAQ_DATA.filter((faq) => {
      const haystack = `${faq.question} ${faq.answer} ${faq.keywords} ${faq.category}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const noResults = hasQuery && searchResults.length === 0;

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-zeluxe-black md:text-2xl">
            সাপোর্ট
          </h1>
          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            যেকোনো সমস্যায় সাহায্য নিন — ২৪/৭ আপনার পাশে আছি
          </p>
        </div>

        {/* Hero Card */}
        <div className="relative mb-5 overflow-hidden rounded-lg bg-zeluxe-black p-6 text-white">
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-zeluxe-gold">
              <HelpCircle size={12} />
              AI Support Bot
            </span>
            <h2 className="mt-3 text-lg font-bold md:text-xl">
              কেমন সাহায্য লাগবে?
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              নিচে আপনার প্রশ্ন টাইপ করুন — সাথে সাথে উত্তর পাবেন
            </p>

            {/* Search */}
            <div className="relative mt-4">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="যেমন: টাকা কখন পাব?"
                className="w-full rounded-md border border-white/20 bg-white/10 py-3 pl-10 pr-10 text-sm text-white placeholder:text-gray-400 focus:border-zeluxe-gold focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Results */}
        {hasQuery && (
          <div className="mb-5">
            {searchResults.length > 0 ? (
              <>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                  {searchResults.length}টি উত্তর পাওয়া গেছে
                </p>
                <div className="space-y-2">
                  {searchResults.map((faq) => (
                    <FaqCard
                      key={faq.id}
                      faq={faq}
                      isOpen={openFaqId === faq.id}
                      onToggle={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5 text-center">
                <p className="text-sm font-bold text-yellow-900">
                  "{query}" — এর কোনো উত্তর পাওয়া যায়নি
                </p>
                <p className="mt-1 text-xs text-yellow-700">
                  আমাদের সাপোর্ট টিমের সাথে সরাসরি কথা বলুন
                </p>
                <a
                  href={`https://wa.me/8801603226151?text=${encodeURIComponent(
                    `আসসালামু আলাইকুম। আমার প্রশ্ন: ${query}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-green-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-green-700"
                >
                  <MessageCircle size={14} />
                  WhatsApp-এ জিজ্ঞাসা করুন
                </a>
              </div>
            )}
          </div>
        )}

        {/* Popular Questions */}
        {!hasQuery && (
          <div className="mb-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              জনপ্রিয় প্রশ্ন
            </p>
            <div className="space-y-2">
              {popularFaqs.map((faq) => (
                <FaqCard
                  key={faq.id}
                  faq={faq}
                  isOpen={openFaqId === faq.id}
                  onToggle={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
                />
              ))}
            </div>

            <Link
              to="/faq"
              className="mt-4 flex items-center justify-center gap-1 text-xs font-medium text-zeluxe-gold hover:underline"
            >
              সব প্রশ্নোত্তর দেখুন
              <ChevronRight size={12} />
            </Link>
          </div>
        )}

        {/* Contact Options */}
        <div className="mt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
            সরাসরি যোগাযোগ
          </p>

          <div className="space-y-2">
            {/* WhatsApp */}
            <a
              href="https://wa.me/8801603226151"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg border border-zeluxe-lightgray bg-white p-4 transition hover:border-green-500"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50">
                  <MessageCircle className="text-green-600" size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-zeluxe-black">WhatsApp</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    01603-226151 · সবচেয়ে দ্রুত
                  </p>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-400" />
            </a>

            {/* Email */}
            <a
              href="mailto:zeluxegallery@gmail.com?subject=Support%20Request"
              className="flex items-center justify-between rounded-lg border border-zeluxe-lightgray bg-white p-4 transition hover:border-zeluxe-gold"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zeluxe-cream">
                  <Mail className="text-zeluxe-gold" size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-zeluxe-black">Email</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    zeluxegallery@gmail.com
                  </p>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-400" />
            </a>

            {/* Phone */}
            <a
              href="tel:+8801603226151"
              className="flex items-center justify-between rounded-lg border border-zeluxe-lightgray bg-white p-4 transition hover:border-zeluxe-gold"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zeluxe-cream">
                  <Phone className="text-zeluxe-gold" size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-zeluxe-black">সরাসরি কল</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    সকাল ৯টা - রাত ৯টা
                  </p>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-400" />
            </a>
          </div>
        </div>

        {/* Info note */}
        <div className="mt-6 rounded-lg border border-zeluxe-lightgray bg-zeluxe-cream p-4">
          <p className="text-center text-[11px] text-gray-500">
            সাপোর্ট টিম সাধারণত ২-৪ ঘণ্টার মধ্যে রিপ্লাই দেয়। জরুরি হলে WhatsApp-এ message দিন।
          </p>
        </div>
      </div>
    </Layout>
  );
}

/* ═══ FAQ CARD ═══ */
function FaqCard({
  faq,
  isOpen,
  onToggle,
}: {
  faq: FAQ;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border transition ${
        isOpen ? 'border-zeluxe-gold' : 'border-zeluxe-lightgray'
      } bg-white`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-zeluxe-cream"
      >
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zeluxe-gold">
            {faq.category}
          </p>
          <p
            className={`mt-1 text-sm font-bold ${
              isOpen ? 'text-zeluxe-gold' : 'text-zeluxe-black'
            }`}
          >
            {faq.question}
          </p>
        </div>
        <ChevronRight
          size={18}
          className={`shrink-0 transition-transform ${
            isOpen ? 'rotate-90 text-zeluxe-gold' : 'text-gray-400'
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-zeluxe-lightgray bg-zeluxe-cream px-4 py-4">
          <p className="text-sm leading-relaxed text-gray-700">{faq.answer}</p>

          <div className="mt-3 border-t border-zeluxe-lightgray pt-3">
            <p className="text-[11px] text-gray-500">
              আরো সাহায্য লাগলে:
            </p>
            <a
              href={`https://wa.me/8801603226151?text=${encodeURIComponent(
                `প্রশ্ন: ${faq.question}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-green-600 hover:underline"
            >
              <MessageCircle size={12} />
              WhatsApp-এ কথা বলুন
            </a>
          </div>
        </div>
      )}
    </div>
  );
}