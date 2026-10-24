import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Users,
  Copy,
  Check,
  Share2,
  Gift,
  TrendingUp,
  Trophy,
  Crown,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Facebook,
} from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  getReferralStats,
  buildReferralLink,
  REFERRAL_BONUS_AMOUNT,
  generateUniqueReferralCode,
  publishReferralCode,
  getTopReferrers,
} from '../lib/referral';

type ReferralInfo = {
  referralCode: string;
  referralCount: number;
  referralBonusEarned: number;
};

type LeaderboardEntry = {
  uid: string;
  name: string;
  referralCount: number;
  referralBonusEarned: number;
};

// ইনস্ট্যান্ট পেজ ওপেনিংয়ের জন্য মেমোরি ক্যাশ
let referralCache: { referralInfo: ReferralInfo | null; leaderboard: LeaderboardEntry[]; uid: string } | null = null;

export default function Refer() {
  const navigate = useNavigate();
  const currentUid = auth.currentUser?.uid || '';
  
  const hasCache = referralCache && referralCache.uid === currentUid;

  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(hasCache ? referralCache!.referralInfo : null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(hasCache ? referralCache!.leaderboard : []);
  const [loading, setLoading] = useState(!hasCache);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        navigate('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        const userInfo = userDoc.exists() ? userDoc.data() : null;

        let refStats = await getReferralStats(uid);

        if (refStats && !refStats.referralCode) {
          try {
            const newCode = await generateUniqueReferralCode();
            await updateDoc(doc(db, 'users', uid), {
              referralCode: newCode,
              referralCount: 0,
              referralBonusEarned: 0,
            });

            const userName =
              (userInfo?.name as string) ||
              auth.currentUser?.email?.split('@')[0] ||
              'Reseller';
            await publishReferralCode(uid, userName, newCode);

            refStats = {
              referralCode: newCode,
              referralCount: 0,
              referralBonusEarned: 0,
            };
          } catch (err) {
            console.error('Failed to generate referral code:', err);
          }
        }

        const top = await getTopReferrers(10);

        setReferralInfo(refStats);
        setLeaderboard(top);

        // ক্যাশ আপডেট করে রাখা
        referralCache = {
          referralInfo: refStats,
          leaderboard: top,
          uid,
        };
      } catch (err) {
        console.error('Failed to load referral data:', err);
        if (!hasCache) {
          toast.error('রেফারেল ডেটা লোড করতে সমস্যা হয়েছে।');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [navigate, hasCache]);

  const handleCopyCode = async () => {
    if (!referralInfo?.referralCode) return;
    try {
      await navigator.clipboard.writeText(referralInfo.referralCode);
      setCodeCopied(true);
      toast.success('✓ Referral code কপি হয়েছে!');
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error('কপি করা যায়নি');
    }
  };

  const handleCopyLink = async () => {
    if (!referralInfo?.referralCode) return;
    try {
      const link = buildReferralLink(referralInfo.referralCode);
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success('✓ Referral link কপি হয়েছে!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('কপি করা যায়নি');
    }
  };

  const handleWhatsAppShare = () => {
    if (!referralInfo?.referralCode) return;
    const link = buildReferralLink(referralInfo.referralCode);
    const message = `🎁 Zeluxe Gallery-তে রিসেলার হয়ে নিজের ব্যবসা শুরু করুন!\n\nশূন্য ইনভেস্টমেন্টে, মাত্র Tk 99 এককালীন মেম্বারশিপ ফি।\n\nআমার রেফারেল লিংক:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleFacebookShare = () => {
    if (!referralInfo?.referralCode) return;
    const link = buildReferralLink(referralInfo.referralCode);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      '_blank'
    );
  };

  const handleNativeShare = async () => {
    if (!referralInfo?.referralCode) return;
    const link = buildReferralLink(referralInfo.referralCode);
    const shareText = `🎁 Zeluxe Gallery-তে রিসেলার হয়ে নিজের ব্যবসা শুরু করুন!\n\n${link}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Zeluxe Gallery Reseller',
          text: shareText,
          url: link,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading && !referralInfo) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-10 transform-gpu">
      {/* HEADER */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-zeluxe-black md:text-2xl">
          Refer & Earn
        </h1>
        <p className="mt-1 text-xs text-gray-500 md:text-sm">
          বন্ধুকে রিসেলার বানান — প্রতিটি সফল referral-এ Tk{' '}
          {REFERRAL_BONUS_AMOUNT} বোনাস পান
        </p>
      </div>

      {/* HERO CARD */}
      <div className="relative mb-5 overflow-hidden rounded-lg bg-zeluxe-black p-5 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-zeluxe-gold/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold shadow-sm">
              <Gift className="text-zeluxe-black" size={24} />
            </span>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">
                Referral Bonus
              </p>
              <p className="mt-1 text-2xl font-bold text-white font-number">
                Tk {REFERRAL_BONUS_AMOUNT}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                প্রতি সফল referral-এ
              </p>
            </div>
          </div>

          {/* Referral Code Display */}
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              আপনার Referral Code
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border-2 border-dashed border-zeluxe-gold/40 bg-white/5 px-4 py-3">
                <p className="font-mono text-base font-bold tracking-[0.2em] text-zeluxe-gold">
                  {referralInfo?.referralCode || 'ZEL----'}
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-md bg-zeluxe-gold text-zeluxe-black transition hover:brightness-110 active:scale-95"
              >
                {codeCopied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-1.5">
                <Users size={12} className="text-zeluxe-gold" />
                <p className="text-[10px] uppercase tracking-wider text-gray-400">
                  Referrals
                </p>
              </div>
              <p className="mt-1.5 text-2xl font-bold text-white font-number">
                {referralInfo?.referralCount || 0}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={12} className="text-zeluxe-gold" />
                <p className="text-[10px] uppercase tracking-wider text-gray-400">
                  Earned
                </p>
              </div>
              <p className="mt-1.5 text-2xl font-bold text-zeluxe-gold font-number">
                Tk {referralInfo?.referralBonusEarned.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 rounded-md bg-green-600 py-3 text-xs font-bold text-white transition hover:bg-green-700 active:scale-95"
            >
              <MessageCircle size={14} />
              WhatsApp
            </button>
            <button
              onClick={handleFacebookShare}
              className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 py-3 text-xs font-bold text-white transition hover:bg-blue-700 active:scale-95"
            >
              <Facebook size={14} />
              Facebook
            </button>
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-1.5 rounded-md bg-white py-3 text-xs font-bold text-zeluxe-black transition hover:bg-gray-100 active:scale-95"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>

          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-white/20 py-2.5 text-xs font-medium text-gray-300 transition hover:bg-white/5 active:scale-95"
          >
            {linkCopied ? (
              <>
                <Check size={13} className="text-green-400" />
                লিংক কপি হয়েছে
              </>
            ) : (
              <>
                <Copy size={13} />
                Referral লিংক কপি করুন
              </>
            )}
          </button>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="mb-5 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white shadow-sm">
        <div className="border-b border-zeluxe-lightgray px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-zeluxe-gold" />
            <h2 className="text-sm font-bold text-zeluxe-black">
              কীভাবে কাজ করে?
            </h2>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {[
            { num: '১', text: 'আপনার Referral link বন্ধুদের সাথে শেয়ার করুন' },
            { num: '২', text: 'বন্ধু আপনার লিংক দিয়ে রেজিস্ট্রেশন করবে' },
            { num: '৩', text: 'বন্ধু Tk 99 payment submit করবে' },
            { num: '৪', text: 'অ্যাডমিন approve করলে আপনি Tk 30 বোনাস পাবেন' },
          ].map(({ num, text }) => (
            <div key={num} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zeluxe-cream text-[11px] font-bold text-zeluxe-gold">
                {num}
              </span>
              <p className="pt-0.5 text-xs leading-relaxed text-gray-700">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* LEADERBOARD */}
      <div className="mb-5 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white shadow-sm">
        <div className="border-b border-zeluxe-lightgray bg-gradient-to-r from-zeluxe-gold/10 to-transparent px-4 py-3">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-zeluxe-gold" />
            <h2 className="text-sm font-bold text-zeluxe-black">
              Top Referrers
            </h2>
          </div>
          <p className="mt-0.5 text-[10px] text-gray-500">
            সবচেয়ে বেশি রিসেলার আনা রিসেলারদের তালিকা
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-6 text-center">
            <Trophy className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-xs text-gray-500">
              এখনো কেউ referral করেনি — আপনিই প্রথম হোন!
            </p>
          </div>
        ) : (
          <div>
            {leaderboard.map((entry, idx) => {
              const isCurrentUser = entry.uid === currentUid;
              const rankIcons = [
                <Crown key="1" size={14} className="text-yellow-500" />,
                <Crown key="2" size={14} className="text-gray-400" />,
                <Crown key="3" size={14} className="text-orange-600" />,
              ];
              const rankIcon = idx < 3 ? rankIcons[idx] : null;

              return (
                <div
                  key={entry.uid}
                  className={`flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3 last:border-0 ${
                    isCurrentUser ? 'bg-zeluxe-gold/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        idx === 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : idx === 1
                            ? 'bg-gray-100 text-gray-700'
                            : idx === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-zeluxe-cream text-gray-600'
                      }`}
                    >
                      {rankIcon || idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-zeluxe-black">
                        {entry.name}
                        {isCurrentUser && (
                          <span className="ml-1.5 rounded-full bg-zeluxe-gold px-1.5 py-0.5 text-[8px] font-bold text-zeluxe-black">
                            আপনি
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-500 font-number">
                        {entry.referralCount}টি referral
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-zeluxe-gold font-number">
                    Tk {entry.referralBonusEarned.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA — Browse Products */}
      <button
        onClick={() => navigate('/products')}
        className="flex w-full items-center justify-between rounded-lg border border-zeluxe-lightgray bg-white p-4 transition hover:border-zeluxe-gold shadow-sm"
      >
        <div className="text-left">
          <p className="text-sm font-bold text-zeluxe-black">
            প্রোডাক্ট দেখুন
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            আপনার নিজের অর্ডার শুরু করুন
          </p>
        </div>
        <ArrowRight size={18} className="text-zeluxe-gold" />
      </button>
    </div>
  );
}
