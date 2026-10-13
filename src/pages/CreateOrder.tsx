import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';
import { generateOrderId } from '../lib/orderId';

type Product = {
  id: string;
  name: string;
  suggestedPrice: number;
  resellerPrice: number;
};

const DISTRICTS = ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Barishal', 'Rangpur', 'Mymensingh', 'Other'];
const PAYMENT_METHODS = ['Cash on Delivery', 'bKash Advance', 'Full Advance'];
const inputClass =
  'w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetProductId = searchParams.get('productId');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Dhaka');

  const [productId, setProductId] = useState(presetProductId || '');
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState('70');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsQuery = query(collection(db, 'products'), where('active', '==', true));
        const snapshot = await getDocs(productsQuery);
        const fetchedProducts: Product[] = snapshot.docs.map((productDocument) => {
          const data = productDocument.data();
          return {
            id: productDocument.id,
            name: typeof data.name === 'string' ? data.name : 'Unnamed Product',
            suggestedPrice: typeof data.suggestedPrice === 'number' ? data.suggestedPrice : 0,
            resellerPrice: typeof data.resellerPrice === 'number' ? data.resellerPrice : 0,
          };
        });
        setProducts(fetchedProducts);

        if (presetProductId) {
          const preset = fetchedProducts.find((product) => product.id === presetProductId);
          if (preset) {
            setProductId(preset.id);
            setSellingPrice(String(preset.suggestedPrice));
          }
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, [presetProductId]);

  const handleProductChange = (value: string) => {
    setProductId(value);
    const product = products.find((item) => item.id === value);
    if (product) {
      setSellingPrice(String(product.suggestedPrice));
    }
  };

  const selectedProduct = products.find((p) => p.id === productId);
  const numQuantity = Number(quantity) || 0;
  const numSellingPrice = Number(sellingPrice) || 0;
  const numDiscount = Number(discount) || 0;
  const numDeliveryCharge = Number(deliveryCharge) || 0;

  const profit = selectedProduct
    ? (numSellingPrice - Number(selectedProduct.resellerPrice)) * numQuantity
    : 0;

  const itemTotal = numQuantity * numSellingPrice;
  const total = itemTotal + numDeliveryCharge - numDiscount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !address.trim() || !district || !productId || !sellingPrice || numSellingPrice <= 0) {
      alert('সব প্রয়োজনীয় তথ্য দিন।');
      return;
    }

    const selectedProductData = products.find((item) => item.id === productId);
    if (!selectedProductData) {
      alert('সঠিক প্রোডাক্ট সিলেক্ট করুন।');
      return;
    }

    setSubmitting(true);
    try {
      const orderId = await generateOrderId();
      await addDoc(collection(db, 'orders'), {
        orderId,
        resellerId: user.uid,
        resellerEmail: user.email,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        address: address.trim(),
        district,
        productId,
        productName: selectedProductData.name,
        quantity: numQuantity,
        sellingPrice: numSellingPrice,
        deliveryCharge: numDeliveryCharge,
        discount: numDiscount,
        total: Number(total),
        paymentMethod,
        note: note.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      alert('✓ অর্ডার সফলভাবে তৈরি হয়েছে!');
      navigate('/orders');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Error: ' + message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading products" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-zeluxe-black">Create Order</h1>
        <p className="mb-6 text-sm text-gray-600">Add a new order for your customer</p>

        <form onSubmit={handleSubmit}>
          <section className="mb-6 rounded-xl border border-zeluxe-lightgray bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">Customer Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zeluxe-black">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className={`mt-1 ${inputClass}`}
                  placeholder="Customer full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black">Customer Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  className={`mt-1 ${inputClass}`}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black">Delivery Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  rows={3}
                  className={`mt-1 ${inputClass} resize-none`}
                  placeholder="Full delivery address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black">District</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                >
                  {DISTRICTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-xl border border-zeluxe-lightgray bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">Order Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zeluxe-black">Product</label>
                <select
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    required
                    className={`mt-1 ${inputClass}`}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black">Selling Price (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    required
                    className={`mt-1 ${inputClass}`}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black">Delivery Charge (৳)</label>
                  <select
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(e.target.value)}
                    className={`mt-1 ${inputClass}`}
                  >
                    <option value="70">ঢাকার ভিতরে (৭০ টাকা)</option>
                    <option value="120">ঢাকার বাইরে (১২০ টাকা)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black">Discount (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className={`mt-1 ${inputClass}`}
                    placeholder="0"
                  />
                </div>
              </div>
              {selectedProduct && numSellingPrice > 0 && (
                <div className={`mt-3 flex items-center justify-between rounded-xl p-3 ${
                  profit >= 0
                    ? 'border border-green-200 bg-green-50'
                    : 'border border-red-200 bg-red-50'
                }`}>
                  <span className={`text-sm font-medium ${
                    profit >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {profit >= 0 ? 'আপনার লাভ:' : 'লস হচ্ছে:'}
                  </span>
                  <span className={`text-lg font-bold ${
                    profit >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    ৳{Math.abs(profit)}
                  </span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zeluxe-black">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black">Order Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className={`mt-1 ${inputClass} resize-none`}
                  placeholder="Optional note"
                />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-xl bg-zeluxe-fieldbg p-6">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-zeluxe-black">
                <span>Item Total</span>
                <span>৳{itemTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zeluxe-black">
                <span>Delivery Charge</span>
                <span>৳{numDeliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zeluxe-black">
                <span>Discount</span>
                <span>-৳{numDiscount.toLocaleString()}</span>
              </div>
              <div className="my-3 border-t border-zeluxe-lightgray" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">আপনার লাভ:</span>
                <span className={profit >= 0 ? 'font-bold text-green-600' : 'font-bold text-red-600'}>
                  ৳{profit}
                </span>
              </div>
              <div className="my-3 border-t border-zeluxe-lightgray" />
              <div className="flex justify-between text-lg font-bold text-zeluxe-black">
                <span>Total</span>
                <span>৳{total.toLocaleString()}</span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-zeluxe-black py-3 font-bold text-white transition hover:bg-[#2a2a2a] active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? 'Creating...' : 'CREATE ORDER'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
