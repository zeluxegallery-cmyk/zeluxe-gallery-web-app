import { LogOut, X } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function LogoutModal({ isOpen, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top red gradient band */}
        <div className="relative bg-gradient-to-br from-red-500 to-red-600 px-6 py-8 text-center">
          <button
            onClick={onCancel}
            className="absolute right-3 top-3 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <LogOut className="text-white" size={28} />
          </div>

          <h2 className="mt-4 text-xl font-bold text-white">
            লগআউট করবেন?
          </h2>
          <p className="mt-2 text-sm text-red-50">
            আপনি কি নিশ্চিত যে আপনি লগআউট করতে চান?
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 p-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border-2 border-zeluxe-lightgray bg-white py-3 text-sm font-bold text-zeluxe-black transition hover:bg-zeluxe-fieldbg active:scale-[0.97]"
          >
            না, থাকব
          </button>
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 active:scale-[0.97]"
          >
            <LogOut size={16} />
            হ্যাঁ, লগআউট
          </button>
        </div>

        <p className="pb-4 text-center text-xs text-gray-400">
          আবার লগইন করতে পারবেন যেকোনো সময়
        </p>
      </div>
    </div>
  );
}
