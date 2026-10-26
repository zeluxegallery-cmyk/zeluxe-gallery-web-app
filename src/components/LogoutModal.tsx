import { LogOut } from 'lucide-react';

type LogoutModalProps = {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export default function LogoutModal({
  isOpen,
  onConfirm,
  onCancel,
}: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* লাল হেডার সেকশন — সেন্টারেড এবং সঠিক প্যাডিং */}
        <div className="bg-red-600 px-6 py-6 text-center text-white">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <LogOut size={20} className="text-white" />
          </div>
          <h3 className="text-base font-bold leading-snug">
            আপনি কি নিশ্চিত যে আপনি লগআউট করতে চান?
          </h3>
        </div>

        {/* বাটনসমূহ */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95"
            >
              না, থাকব
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95"
            >
              <LogOut size={16} />
              হ্যাঁ, লগআউট
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            আবার লগইন করতে পারবেন যেকোনো সময়
          </p>
        </div>

      </div>
    </div>
  );
}
