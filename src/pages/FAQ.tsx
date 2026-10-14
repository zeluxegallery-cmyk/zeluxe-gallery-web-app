import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle, MessageCircle, Mail } from 'lucide-react';
import logo from '../assets/zeluxe-logo.png';

type FAQItem = {
  question: string;
  answer: string;
};

type FAQCategory = {
  title: string;
  items: FAQItem[];
};

const faqData: FAQCategory[] = [
  {
    title: 'মেম্বারশিপ সম্পর্কিত',
    items: [
      {
        question: 'মেম্বারশিপ ফি কত?',
        answer:
          'Zeluxe Gallery-এর রিসেলার মেম্বারশিপ ফি মাত্র ৳৯৯ (এককালীন)। এটাই একবার পেমেন্ট, কোনো মাসিক বা বাৎসরিক চার্জ নেই।',
      },
      {
        question: 'কীভাবে পেমেন্ট করব?',
        answer:
          'বিকাশ বা নগদে 01603-226151 নাম্বারে ৳৯৯ পাঠিয়ে ট্রানজেকশন আইডি ও সেন্ডার নাম্বার অ্যাপে সাবমিট করবেন। অ্যাডমিন যাচাই করে ২৪ ঘণ্টার মধ্যে approve করবেন।',
      },
      {
        question: 'মেম্বারশিপ ফি কি ফেরতযোগ্য?',
        answer:
          'একবার approve হয়ে গেলে ৳৯৯ ফেরতযোগ্য নয়। তবে অ্যাডমিন কোনো কারণে অ্যাকাউন্ট approve করতে অস্বীকার করলে সম্পূর্ণ ফি ফেরত দেওয়া হবে।',
      },
      {
        question: 'Approve হতে কত সময় লাগবে?',
        answer:
          'সাধারণত ২৪ ঘণ্টার মধ্যে। তবে বাংলাদেশ সময় রাত ১০টার পরে সাবমিট করলে পরদিন সকালে approve হতে পারে।',
      },
      {
        question: 'একজন কতটি অ্যাকাউন্ট খুলতে পারবে?',
        answer:
          'একটি মোবাইল নাম্বার বা ইমেইল দিয়ে শুধুমাত্র একটি অ্যাকাউন্ট খোলা যাবে। একাধিক অ্যাকাউন্ট থাকলে সেটি নিয়ম ভঙ্গ হিসেবে গণ্য হবে।',
      },
    ],
  },
  {
    title: 'প্রোডাক্ট ও অর্ডার',
    items: [
      {
        question: 'আমাদের স্টক রাখতে হবে?',
        answer:
          'না, আপনাকে কোনো স্টক বা ইনভেন্টরি রাখতে হবে না। আমরা স্টক ম্যানেজ করি। আপনি শুধু কাস্টমারের অর্ডার নিবেন ও অ্যাপে এন্ট্রি করবেন।',
      },
      {
        question: 'প্রোডাক্টের দাম কীভাবে নির্ধারণ করব?',
        answer:
          'প্রতিটি প্রোডাক্টে Zeluxe-র "Reseller Price" এবং "Suggested Price" দেওয়া থাকবে। আপনি Suggested Price বা তার আশেপাশে বিক্রি করলে সর্বোচ্চ লাভ পাবেন।',
      },
      {
        question: 'অর্ডার দিলে কতদিনে ডেলিভারি হবে?',
        answer:
          'ঢাকার ভিতরে ১-২ দিন, ঢাকার বাইরে ২-৪ দিন। সাধারণত ৩-৫ কার্যদিবসে ডেলিভারি সম্পন্ন হয়।',
      },
      {
        question: 'কাস্টমার রিটার্ন করলে কী হবে?',
        answer:
          'প্রোডাক্টে সমস্যা থাকলে বা ভুল প্রোডাক্ট গেলে কাস্টমার ২৪ ঘণ্টার মধ্যে জানাতে পারবে। সেক্ষেত্রে রিটার্ন গ্রহণ করা হবে। রিটার্ন হলে উক্ত অর্ডারে profit হবে না।',
      },
      {
        question: 'Failed Delivery হলে কী হবে?',
        answer:
          'কাস্টমার প্রোডাক্ট নিতে অস্বীকার করলে বা ভুল ঠিকানা দিলে, প্রোডাক্ট ফেরত আসবে। সেক্ষেত্রে ডেলিভারি চার্জ আপনার দায়িত্বে পরিশোধযোগ্য হবে।',
      },
    ],
  },
  {
    title: 'আর্নিং ও উইথড্র',
    items: [
      {
        question: 'কত profit হবে?',
        answer:
          'প্রতিটি প্রোডাক্টে Reseller Price এবং Suggested Price-এর মধ্যে পার্থক্যই আপনার profit। সাধারণত প্রতি প্রোডাক্টে ২০-৫০% পর্যন্ত profit হতে পারে।',
      },
      {
        question: 'টাকা তুলতে কী লাগবে?',
        answer:
          'Minimum ৳৫০০ ব্যালেন্স থাকলে আপনি Withdraw request করতে পারবেন। আপনার বিকাশ/নগদ নাম্বার দিলে আমরা ২৪-৪৮ ঘণ্টার মধ্যে পাঠিয়ে দেব।',
      },
      {
        question: 'Withdraw করতে কত সময় লাগবে?',
        answer:
          'Withdraw request approve হওয়ার পর ২৪-৪৮ ঘণ্টার মধ্যে টাকা আপনার বিকাশ/নগদে পৌঁছে যাবে।',
      },
      {
        question: 'কোন অর্ডারের profit কখন পাওয়া যাবে?',
        answer:
          'শুধু "Delivered" স্ট্যাটাসের অর্ডারের profit আপনার available balance-এ যোগ হবে। Pending, Shipped অর্ডারের profit তখনো পাওয়া যাবে না।',
      },
    ],
  },
  {
    title: 'টেকনিক্যাল ও সাপোর্ট',
    items: [
      {
        question: 'পাসওয়ার্ড ভুলে গেলে কী করব?',
        answer:
          'Login পেজে "পাসওয়ার্ড ভুলে গেছেন?" লিংকে ক্লিক করে আপনার ইমেইল দিন। Firebase থেকে reset লিংক ইমেইলে আসবে।',
      },
      {
        question: 'কোনো সমস্যা হলে কার সাথে যোগাযোগ করব?',
        answer:
          'যেকোনো সমস্যায় আমাদের সাপোর্টে যোগাযোগ করুন — Email: zeluxegallery@gmail.com অথবা WhatsApp: 01603-226151',
      },
      {
        question: 'অ্যাপটি ফোনে install করা যাবে?',
        answer:
          'হ্যাঁ! Chrome ব্রাউজারে Live URL খুলে "Add to Home Screen" ক্লিক করলেই অ্যাপ হিসেবে install হবে। এরপর হোম স্ক্রিন থেকে সহজে খোলা যাবে।',
      },
      {
        question: 'একই সাথে কয়জন লগইন করতে পারবে?',
        answer:
          'একটি অ্যাকাউন্টে একবারে একজন লগইন করতে পারবে। অন্য কোথাও লগইন করলে আগের সেশন logout হয়ে যাবে।',
      },
    ],
  },
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* ═══ TOP HEADER ═══ */}
      <header className="border-b border-zeluxe-lightgray bg-white px-4 py-3 md:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Zeluxe Gallery" className="h-10 object-contain md:h-12" />
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-zeluxe-gold px-4 py-2 text-xs font-bold text-zeluxe-black transition hover:brightness-110 md:px-5 md:py-2.5 md:text-sm"
          >
            রেজিস্ট্রেশন
          </Link>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zeluxe-black via-gray-900 to-black px-5 py-12 text-center text-white md:py-16">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-zeluxe-gold/20 blur-3xl"></div>
        <div className="relative mx-auto max-w-3xl">
          <span className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zeluxe-gold/20">
            <HelpCircle className="text-zeluxe-gold" size={32} />
          </span>
          <h1 className="text-3xl font-bold md:text-4xl">
            সাধারণ <span className="text-zeluxe-gold">প্রশ্নোত্তর</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-gray-300 md:text-base">
            Zeluxe Gallery রিসেলিং সম্পর্কে আপনার সব প্রশ্নের উত্তর এখানে খুঁজুন।
            উত্তর না পেলে সাপোর্টে যোগাযোগ করুন।
          </p>
        </div>
      </section>

      {/* ═══ FAQ CATEGORIES ═══ */}
      <section className="mx-auto max-w-3xl px-5 py-10">
        {faqData.map((category, catIdx) => (
          <div key={catIdx} className="mb-8">
            {/* Category heading */}
            <div className="mb-4 flex items-center gap-3">
              <span className="h-6 w-1 rounded-full bg-zeluxe-gold"></span>
              <h2 className="text-lg font-bold text-zeluxe-black md:text-xl">
                {category.title}
              </h2>
            </div>

            {/* FAQ Items */}
            <div className="space-y-2">
              {category.items.map((item, itemIdx) => {
                const key = `${catIdx}-${itemIdx}`;
                const isOpen = openItems[key] || false;

                return (
                  <div
                    key={itemIdx}
                    className={`overflow-hidden rounded-xl border transition ${
                      isOpen
                        ? 'border-zeluxe-gold bg-white shadow-sm'
                        : 'border-zeluxe-lightgray bg-white'
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(key)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-zeluxe-fieldbg"
                    >
                      <span
                        className={`text-sm font-bold md:text-base ${
                          isOpen ? 'text-zeluxe-gold' : 'text-zeluxe-black'
                        }`}
                      >
                        {item.question}
                      </span>
                      <ChevronDown
                        className={`shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-zeluxe-gold' : 'text-gray-400'
                        }`}
                        size={20}
                      />
                    </button>

                    {isOpen && (
                      <div className="border-t border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-4">
                        <p className="text-sm leading-relaxed text-gray-700">
                          {item.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ═══ STILL HAVE QUESTIONS ═══ */}
      <section className="mx-auto max-w-3xl px-5 pb-10">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zeluxe-black via-gray-900 to-black p-8 text-center text-white">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-zeluxe-gold/20 blur-3xl"></div>
          <div className="relative">
            <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-zeluxe-gold/20">
              <MessageCircle className="text-zeluxe-gold" size={26} />
            </span>
            <h2 className="text-xl font-bold md:text-2xl">আরো প্রশ্ন আছে?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-300">
              আমাদের সাপোর্ট টিম ২৪/৭ আপনার সেবায় নিয়োজিত। যেকোনো সময় যোগাযোগ করুন।
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="https://wa.me/8801603226151"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-700 active:scale-[0.98]"
              >
                <MessageCircle size={16} />
                WhatsApp-এ যোগাযোগ
              </a>
              <a
                href="mailto:zeluxegallery@gmail.com"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Mail size={16} />
                ইমেইল পাঠান
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BACK TO HOME ═══ */}
      <div className="text-center">
        <Link
          to="/"
          className="text-sm font-medium text-zeluxe-gold hover:underline"
        >
          ← হোম পেজে ফিরে যান
        </Link>
      </div>
    </div>
  );
}
