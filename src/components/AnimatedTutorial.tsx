import { useState, useEffect } from 'react';
import { UserPlus, ShoppingBag, Truck, CheckCircle, ArrowRight, ArrowLeft, Play } from 'lucide-react';

const tutorialSteps = [
  {
    step: '০১',
    title: 'রেজিস্ট্রেশন ও মেম্বারশিপ',
    description: 'অ্যাপে অ্যাকাউন্ট খুলে মাত্র Tk 99 এককালীন মেম্বারশিপ ফি সাবমিট করুন। ২৪ ঘণ্টার মধ্যে অ্যাকাউন্ট একটিভ হয়ে যাবে।',
    icon: UserPlus,
    color: 'bg-blue-500/10 text-blue-600 border-blue-200',
  },
  {
    step: '০২',
    title: 'প্রোডাক্ট চয়ন ও শেয়ার',
    description: 'প্রোডাক্ট পেজ থেকে আকর্ষণীয় ছবি ও বিবরণ আপনার ফেসবুক পেজ বা গ্রুপে আপনার লাভসহ (Profit) শেয়ার করুন।',
    icon: ShoppingBag,
    color: 'bg-zeluxe-gold/10 text-zeluxe-gold border-zeluxe-gold/30',
  },
  {
    step: '০৩',
    title: 'অর্ডার প্লেস করুন',
    description: 'কাস্টমার কনফার্ম করলে অ্যাপের "নতুন অর্ডার" অপশনে গিয়ে কাস্টমারের তথ্য ও আপনার প্রফিট দিয়ে অর্ডার সাবমিট করুন।',
    icon: Truck,
    color: 'bg-purple-500/10 text-purple-600 border-purple-200',
  },
  {
    step: '০৪',
    title: 'লাভ তুলে নিন',
    description: 'বাকি ডেলিভারি ও কালেকশন আমরা করব। সফল ডেলিভারির পর আপনার প্রফিট ব্যালেন্সে যোগ হবে, যা বিকাশ/নগদে তুলবেন।',
    icon: CheckCircle,
    color: 'bg-green-500/10 text-green-600 border-green-200',
  },
];

export default function AnimatedTutorial() {
  const [activeStep, setActiveStep] = useState(0);

  // অটোমেটিক স্লাইড হওয়ার অ্যানিমেশন (প্রতি ৪ সেকেন্ড পর পর)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % tutorialSteps.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const current = tutorialSteps[activeStep];
  const IconComponent = current.icon;

  return (
    <section className="my-10 px-4">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zeluxe-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zeluxe-gold">
          <Play size={12} className="fill-current" /> লাইভ গাইড ও টিউটোরিয়াল
        </span>
        <h2 className="mt-2 text-xl font-bold text-zeluxe-black md:text-2xl">
          কীভাবে কাজ করে Zeluxe Gallery?
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          মাত্র ৪টি সহজ ধাপে শুরু করুন আপনার জিরো ইনভেস্টমেন্ট অনলাইন ব্যবসা।
        </p>

        {/* ভিডিও বা প্লেয়ার স্টাইলের অ্যানিমেটেড বক্স */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-zeluxe-lightgray bg-white shadow-xl shadow-zeluxe-gold/5 p-6 text-left relative">
          
          {/* প্রোগ্রেস বার */}
          <div className="flex gap-1.5 mb-6">
            {tutorialSteps.map((_, idx) => (
              <div 
                key={idx} 
                className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden cursor-pointer"
                onClick={() => setActiveStep(idx)}
              >
                <div 
                  className={`h-full bg-zeluxe-gold transition-all duration-500 ${
                    idx === activeStep ? 'w-full' : idx < activeStep ? 'w-full opacity-40' : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* অ্যানিমেটেড স্টেপ কন্টেন্ট */}
          <div className="flex flex-col sm:flex-row items-center gap-5 min-h-[160px] animate-fade-in">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${current.color} shadow-sm`}>
              <IconComponent size={32} />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-zeluxe-gold font-number">ধাপ {current.step}</span>
                <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                <span className="text-xs text-gray-400 font-number">০৪ এর মধ্যে {activeStep + 1}</span>
              </div>
              <h3 className="mt-1 text-lg font-bold text-zeluxe-black">
                {current.title}
              </h3>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                {current.description}
              </p>
            </div>
          </div>

          {/* নেভিগেশন বাটন */}
          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              onClick={() => setActiveStep((prev) => (prev === 0 ? tutorialSteps.length - 1 : prev - 1))}
              className="flex items-center gap-1 rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-100 active:scale-95"
            >
              <ArrowLeft size={14} /> আগেরটি
            </button>

            <span className="text-[11px] text-gray-400 font-medium">অটো প্লে হচ্ছে...</span>

            <button
              onClick={() => setActiveStep((prev) => (prev + 1) % tutorialSteps.length)}
              className="flex items-center gap-1 rounded-xl bg-zeluxe-black px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800 active:scale-95"
            >
              পরবর্তী <ArrowRight size={14} />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
