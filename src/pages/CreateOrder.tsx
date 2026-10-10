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

type Product = {
  id: string;
  name: string;
  suggestedPrice: number;
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
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(60);
  const [discount, setDiscount] = useState(0);
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
          };
        });
        setProducts(fetchedProducts);

        if (presetProductId) {
          const preset = fetchedProducts.find((product) => product.id === presetProductId);
          if (preset) {
            setProductId(preset.id);
            setSellingPrice(preset.suggestedPrice);
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
      setSellingPrice(product.suggestedPrice);
    }
  };

  const itemTotal = quantity * sellingPrice;
  const total = itemTotal + deliveryCharge - discount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !address.trim() || !district || !productId || !sellingPrice) {
      alert('Please fill in all required fields.');
      return;
    }

    const selectedProduct = products.find((item) => item.id === productId);
    if (!selectedProduct) {
      alert('Please select a valid product.');
      return;
    }

    setSubmitting(true);
    try {
      const orderId = `ZEL-${Date.now().toString().slice(-6)}`;
      await addDoc(collection(db, 'orders'), {
        orderId,
        resellerId: user.uid,
        resellerEmail: user.email,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        address: address.trim(),
        district,
        productId,
        productName: selectedProduct.name,
        quantity: Number(quantity),
        sellingPrice: Number(sellingPrice),
        deliveryCharge: Number(deliveryCharge),
        discount: Number(discount),
        total: Number(total),
        paymentMethod,
        note: note.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      alert('Order created successfully!');
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
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    required
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black">Selling Price (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    required
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black">Delivery Charge (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black">Discount (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
              </div>
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
                <span>৳{deliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zeluxe-black">
                <span>Discount</span>
                <span>-৳{discount.toLocaleString()}</span>
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
