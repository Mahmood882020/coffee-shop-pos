// ==========================================
// System: Alsalam Cafe POS - Smart Dining
// Developer: Mahmoud M. A. Elhaj Ahmed
// ==========================================

import { useState, useEffect } from 'react';
import axios from 'axios';

const CAFE_PUBLIC_IP = "185.100.200.50"; 
const CAFE_LATITUDE = 31.4229167; 
const CAFE_LONGITUDE = 34.3670000;
const MAX_DISTANCE_METERS = 70; 

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
};

function CustomerMenu() {
  const [status, setStatus] = useState('checking'); 
  const [errorMsg, setErrorMsg] = useState('');
  
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]); 
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const tableId = urlParams.get('table');

  useEffect(() => {
    verifyLocationAndNetwork();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'allowed') {
      fetchMenuData();
    }
  }, [status]);

  const verifyLocationAndNetwork = async () => {
    // وضع المطور لكي تتمكن من التجربة
    setStatus('allowed');
  };

  const fetchMenuData = async () => {
    try {
      const res = await axios.get('/pos-data');
      setCategories(res.data.categories || []);
      setTables(res.data.tables || []); 
      if (res.data.categories?.length > 0) {
        setActiveCategory(res.data.categories[0].id);
      }
    } catch (error) {
      console.error("خطأ في جلب المنيو:", error);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: product.id, name: product.name, price: parseFloat(product.price), quantity: 1, icon: product.icon }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    
    try {
      const orderData = {
        table_id: tableId,
        status: 'open',
        payment_method: 'cash',
        discount: 0,
        // الإضافة السحرية: ختم الطلب بـ [QR] للتمييز المطلق
        reservation_name: orderNotes ? `[QR] ملاحظة: ${orderNotes}` : '[QR]', 
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price
        }))
      };

      await axios.post('/orders', orderData);
      
      setCart([]);
      setShowCart(false);
      setOrderNotes('');
      setOrderSuccess(true);
    } catch (error) {
      alert('حدث خطأ أثناء إرسال الطلب، يرجى نداء النادل.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tableId) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-gray-50 p-6" dir="rtl">
        <div className="bg-[#E67E22] text-white p-6 rounded-xl text-center shadow-lg w-full">
          <h2 className="text-xl font-bold">مسار غير صالح</h2>
          <p className="mt-2 text-orange-100">يرجى مسح رمز الطاولة بشكل صحيح.</p>
        </div>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[#FFF8F0]" dir="rtl">
        <div className="text-center">
          <div className="w-24 h-24 bg-black rounded-full p-2 mx-auto mb-6 shadow-xl border-4 border-[#F39C12]">
            <img src="/logo.png" alt="السلام كافي" className="w-full h-full object-contain" />
          </div>
          <p className="font-bold text-xl mb-4 text-[#D35400]">جاري تجهيز المنيو...</p>
          <div className="w-10 h-10 border-4 border-[#E67E22] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[#FFF8F0] p-6" dir="rtl">
        <div className="bg-white border-2 border-[#E67E22] text-[#D35400] p-8 rounded-2xl text-center shadow-xl max-w-md w-full">
          <div className="w-20 h-20 bg-black rounded-full p-2 mx-auto mb-6 border-2 border-[#F39C12]">
            <img src="/logo.png" alt="السلام كافي" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold mb-3">طلب غير مصرح</h2>
          <p className="text-base font-medium leading-relaxed text-gray-700">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[#FFF8F0] p-6" dir="rtl">
        <div className="bg-white border-t-4 border-[#E67E22] p-8 rounded-2xl text-center shadow-xl max-w-md w-full">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl shadow-inner">
            👨‍🍳
          </div>
          <h2 className="text-3xl font-bold text-[#D35400] mb-2">تم الإرسال!</h2>
          <p className="text-gray-600 font-medium mb-8">طلبك الآن قيد التحضير، سيتم تقديمه لك قريباً.</p>
          <button 
            onClick={() => setOrderSuccess(false)}
            className="w-full bg-[#E67E22] hover:bg-[#D35400] text-white py-4 rounded-xl font-bold text-lg shadow-md transition-colors"
          >
            طلب المزيد
          </button>
        </div>
      </div>
    );
  }

  const currentProducts = categories.find(c => c.id === activeCategory)?.products || [];
  
  const tableObj = tables.find(t => String(t.id) === String(tableId));
  const displayTableName = tableObj ? tableObj.name : tableId;

  return (
    <div className="bg-[#FAFAFA] min-h-[100dvh] pb-28 font-sans" dir="rtl">
      
      <div className="bg-gradient-to-r from-[#E67E22] to-[#F39C12] text-white p-4 sticky top-0 z-10 shadow-md flex items-center justify-between rounded-b-3xl">
        <div className="w-14 h-14 bg-black rounded-full p-1 border-2 border-white shadow-lg overflow-hidden">
          <img src="/logo.png" alt="السلام كافي" className="w-full h-full object-contain" />
        </div>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-black drop-shadow-sm">السلام كافي</h1>
          <p className="text-xs font-medium opacity-90 mt-1 bg-black/20 inline-block px-3 py-1 rounded-full">طاولة ({displayTableName})</p>
        </div>
        <div className="w-14"></div> 
      </div>

      <div className="overflow-x-auto whitespace-nowrap p-4 [&::-webkit-scrollbar]:hidden flex gap-3 sticky top-[88px] bg-white/90 backdrop-blur-md z-10 border-b border-gray-100 shadow-sm">
        {categories.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => setActiveCategory(cat.id)}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
              activeCategory === cat.id 
                ? 'bg-[#D35400] text-white border-none scale-105' 
                : 'bg-orange-50 text-[#D35400] border border-orange-200 hover:bg-orange-100'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="p-4 grid grid-cols-2 gap-4 mt-2">
        {currentProducts.map(product => (
          <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden transition-transform hover:-translate-y-1">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-3 border border-orange-100">
              <span className="text-4xl drop-shadow-sm">{product.icon || '☕'}</span>
            </div>
            <h3 className="font-bold text-gray-800 text-sm mb-1 leading-tight">{product.name}</h3>
            <p className="text-[#E67E22] font-black text-base mb-4">₪{product.price}</p>
            
            <button 
              onClick={() => addToCart(product)}
              className="mt-auto w-full bg-orange-100 hover:bg-[#E67E22] hover:text-white text-[#D35400] py-2.5 rounded-xl font-bold text-xs transition-colors active:scale-95"
            >
              + أضف للطلب
            </button>
          </div>
        ))}
      </div>

      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-20 animate-fade-in-up">
          <button 
            onClick={() => setShowCart(true)}
            className="w-full bg-[#F39C12] text-white p-4 rounded-2xl font-bold text-lg shadow-[0_10px_40px_rgba(243,156,18,0.4)] flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white text-[#D35400] w-9 h-9 rounded-full flex items-center justify-center text-base shadow-sm">
                {cart.reduce((a,b)=>a+b.quantity,0)}
              </span>
              <span>عرض الطلب</span>
            </div>
            <span className="text-xl">₪{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end backdrop-blur-sm">
          <div className="bg-white rounded-t-[2rem] h-[88vh] flex flex-col overflow-hidden animate-slide-up shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[#E67E22] to-[#F39C12] text-white rounded-t-[2rem]">
              <h2 className="text-xl font-bold">سلة الطلبات</h2>
              <button onClick={() => setShowCart(false)} className="text-3xl hover:text-orange-200 transition-colors">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {cart.map(item => (
                <div key={item.product_id} className="flex justify-between items-center mb-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-base">{item.name}</h3>
                    <p className="text-sm font-bold text-[#E67E22] mt-1">₪{item.price}</p>
                  </div>
                  <div className="flex items-center gap-4 bg-orange-50 p-1.5 rounded-xl border border-orange-100">
                    <button onClick={() => updateQuantity(item.product_id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-600 font-bold text-xl shadow-sm hover:bg-gray-100">-</button>
                    <span className="font-bold w-4 text-center text-gray-800">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, 1)} className="w-8 h-8 flex items-center justify-center bg-[#E67E22] text-white rounded-lg font-bold text-xl shadow-sm hover:bg-[#D35400]">+</button>
                  </div>
                </div>
              ))}

              <div className="mt-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات إضافية (اختياري):</label>
                <textarea 
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="مثال: القهوة سكر خفيف، أو العصير بدون ثلج..."
                  className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-[#E67E22] focus:border-transparent outline-none bg-white shadow-sm"
                  rows="3"
                ></textarea>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between text-xl font-black text-gray-800 mb-5">
                <span>الإجمالي:</span>
                <span className="text-[#D35400]">₪{cartTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={submitOrder}
                disabled={isSubmitting}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex justify-center items-center gap-3 transition-colors ${
                  isSubmitting ? 'bg-gray-400 text-gray-100 cursor-not-allowed' : 'bg-[#E67E22] text-white hover:bg-[#D35400]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري الإرسال...
                  </>
                ) : (
                  'تأكيد وإرسال الطلب 🛎️'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerMenu;