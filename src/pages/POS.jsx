import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../hooks/useCart';

function POS() {
  const { cartItems, addToCart, updateQuantity, cartTotal, clearCart, removeFromCart } = useCart();
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(''); 
  
  // حالة جديدة لاسم الحجز
  const [reservationName, setReservationName] = useState('');

  const finalTotal = cartTotal - (parseFloat(discount) || 0);
  
  const [receiptData, setReceiptData] = useState(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  const fetchPOSData = () => {
    axios.get('/pos-data')
      .then(res => {
        setCategories(res.data.categories);
        setTables(res.data.tables);
        setCustomers(res.data.customers);
        if(res.data.categories.length > 0 && !activeCategory) {
          setActiveCategory(res.data.categories[0].id);
        }
      })
      .catch(err => console.error("حدث خطأ في جلب البيانات:", err));
  };

  useEffect(() => {
    fetchPOSData();
  }, []);
  
  const handleCheckout = (isReservation = false) => {
    if(cartItems.length === 0) return alert('السلة فارغة (Cart is empty)');
    
    if (isReservation && !reservationName.trim()) {
      const confirmProceed = window.confirm('لم تقم بإدخال "اسم الحجز". هل تريد المتابعة بدون اسم؟');
      if (!confirmProceed) return;
    }
    
    if (paymentMethod === 'debt') {
      if (!selectedCustomer) {
        return alert('يجب تحديد زبون مسجل لتتمكن من تسجيل الطلب كدين.');
      }
      
      const customerData = customers.find(c => c.id === parseInt(selectedCustomer));
      if (customerData) {
        const projectedDebt = parseFloat(customerData.debt_balance) + finalTotal;
        const creditLimit = parseFloat(customerData.credit_limit);
        
        if (projectedDebt > creditLimit) {
          return alert(`عذراً! لا يمكن إتمام الطلب كدين.\nسقف الدين المسموح للزبون: ₪${creditLimit.toFixed(2)}\nالدين الحالي: ₪${parseFloat(customerData.debt_balance).toFixed(2)}\nالإجمالي سيصبح: ₪${projectedDebt.toFixed(2)} (تجاوز للحد المسموح!)`);
        }
      }
    }
    
    const orderData = {
      table_id: selectedTable || null,
      customer_id: selectedCustomer || null,
      payment_method: paymentMethod,
      discount: parseFloat(discount) || 0,
      status: isReservation ? 'reservation' : 'closed',
      items: cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };

    axios.post('/orders', orderData)
      .then(res => {
        const cashierName = JSON.parse(localStorage.getItem('user'))?.name || 'غير معروف';
        const customerName = customers.find(c => c.id == selectedCustomer)?.name || 'زبون عابر';
        
        setReceiptData({
          orderId: res.data.order_id || Math.floor(Math.random() * 10000),
          items: [...cartItems],
          subTotal: cartTotal,
          discount: parseFloat(discount) || 0,
          total: finalTotal,
          method: paymentMethod,
          date: new Date().toLocaleString('ar-EG'),
          cashier: cashierName,
          customer: customerName,
          isReservation: isReservation,
          reservationName: reservationName // تمرير اسم الحجز لبيانات الطباعة
        });

        setTimeout(() => {
          window.print();
          
          clearCart();
          setSelectedTable('');
          setSelectedCustomer('');
          setPaymentMethod('cash');
          setDiscount(''); 
          setReservationName(''); // تفريغ حقل الاسم بعد إتمام الطلب
          setReceiptData(null);
          setShowMobileCart(false);
          fetchPOSData(); 
        }, 500);
      })
      .catch(err => {
        alert(err.response?.data?.error || err.response?.data?.message || 'حدث خطأ أثناء الحفظ');
      });
  };

  const currentProducts = categories.find(c => c.id === activeCategory)?.products || [];

  return (
    <>
      <div className="flex flex-col lg:flex-row h-full text-right font-sans print:hidden bg-gray-50 dark:bg-gray-900 transition-colors relative" dir="rtl">
        
        {/* تمت إضافة print:hidden هنا لمنع ظهور شريط الجوال في الطباعة */}
        <div className="lg:hidden print:hidden flex justify-between items-center p-3 bg-white dark:bg-gray-800 shadow-sm z-20 border-b dark:border-gray-700 shrink-0">
          <span className="font-bold text-gray-800 dark:text-white text-lg">
            {showMobileCart ? 'تفاصيل السلة والدفع' : 'المنتجات'}
          </span>
          <button 
            onClick={() => setShowMobileCart(!showMobileCart)} 
            className={`px-4 py-2 rounded-lg font-bold text-white transition-colors shadow ${showMobileCart ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {showMobileCart ? 'العودة للمنتجات' : `عـرض الـسـلـة (${cartItems.length})`}
          </button>
        </div>

        <div className={`${showMobileCart ? 'hidden' : 'flex'} lg:flex w-full lg:w-8/12 flex-col p-3 lg:p-6 lg:border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden`}>
          <h1 className="text-3xl font-bold mb-4 lg:mb-6 text-gray-800 dark:text-white hidden lg:block">نقطة البيع</h1>
          
          <div className="flex flex-wrap items-center justify-start gap-2 lg:gap-3 mb-4 lg:mb-6 w-full py-1 lg:py-2 px-1">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 lg:px-6 lg:py-3 rounded-lg lg:rounded-xl font-bold whitespace-nowrap select-none transition-all duration-300 text-sm lg:text-base ${
                  activeCategory === cat.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 lg:scale-105 border-transparent' 
                    : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-5 overflow-y-auto pb-24 pl-1 lg:pl-2 [&::-webkit-scrollbar]:hidden">
            {currentProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => {
                  const cartItem = cartItems.find(i => i.product_id === product.id);
                  const currentQty = cartItem ? cartItem.quantity : 0;
                  
                  if (product.is_trackable && currentQty + 1 > product.stock) {
                    return alert(`الكمية غير متوفرة! المتبقي في المخزن من (${product.name}) هو ${product.stock} فقط.`);
                  }
                  addToCart(product);
                }} 
                className={`p-3 lg:p-5 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-all flex flex-col items-center relative dark:bg-gray-800 dark:border-gray-700 ${
                  product.is_trackable && product.stock <= 0 
                    ? 'bg-red-50 border-red-200 opacity-60 grayscale dark:bg-red-900' 
                    : 'bg-white border-gray-100 hover:border-blue-300 select-none'
                }`}
              >
                {product.is_trackable && (
                  <span className={`absolute top-2 right-2 text-[10px] lg:text-xs font-bold px-2 py-0.5 lg:py-1 rounded-full ${
                    product.stock > 5 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 animate-pulse'
                  }`}>
                    {product.stock}
                  </span>
                )}

                <div className="w-14 h-14 lg:w-20 lg:h-20 bg-blue-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2 lg:mb-4 text-blue-300 text-xs lg:text-base">
                  صورة
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-center text-sm lg:text-base leading-tight mb-1">{product.name}</h3>
                <p className="text-green-600 dark:text-green-400 font-bold text-sm lg:text-base mt-auto">₪{product.price}</p>
                
                {product.is_trackable && product.stock <= 0 && (
                  <p className="text-red-500 font-bold text-[10px] lg:text-xs mt-1 bg-white dark:bg-gray-800 px-1 rounded">
                    نفدت
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={`${showMobileCart ? 'flex' : 'hidden'} lg:flex w-full lg:w-4/12 bg-white dark:bg-gray-800 lg:shadow-xl flex-col z-10 h-full border-r border-gray-200 dark:border-gray-700`}>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-3 hidden lg:block">تفاصيل الطلب</h2>
            <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)} className="w-full p-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none text-sm">
              <option value="">طلب سفري (بدون طاولة)</option>
              {tables.map(t => <option key={t.id} value={t.id}>طاولة {t.name} - {t.zone === 'family' ? 'عائلات' : 'شباب'}</option>)}
            </select>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none text-sm">
              <option value="">زبون عابر (نقدي فقط)</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} - سقف الدين: ₪{c.credit_limit}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-3 lg:p-4 [&::-webkit-scrollbar]:hidden">
            {cartItems.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-500 mt-6 text-sm lg:text-base">السلة فارغة</div>
            ) : (
              cartItems.map(item => (
                <div key={item.product_id} className="flex justify-between items-center mb-2 lg:mb-3 p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 dark:text-gray-100 text-xs lg:text-sm">{item.name}</p>
                    <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 mt-1">₪{item.unit_price}</p>
                  </div>
                  <div className="flex items-center gap-1 lg:gap-2 bg-gray-50 dark:bg-gray-800 px-1 py-1 rounded-md border border-gray-200 dark:border-gray-600">
                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="text-red-500 font-bold px-2 hover:bg-red-100 dark:hover:bg-red-900 rounded select-none">-</button>
                    <span className="font-bold w-4 text-center dark:text-white text-xs lg:text-sm select-none">{item.quantity}</span>
                    
                    <button onClick={() => {
                      let prodStock = 0;
                      let trackable = false;
                      categories.forEach(cat => {
                        const p = cat.products.find(x => x.id === item.product_id);
                        if(p) { prodStock = p.stock; trackable = p.is_trackable; }
                      });

                      if (trackable && item.quantity + 1 > prodStock) {
                        return alert(`الكمية غير متوفرة! المتبقي هو ${prodStock}`);
                      }
                      updateQuantity(item.product_id, item.quantity + 1);
                    }} className="text-green-500 font-bold px-2 hover:bg-green-100 dark:hover:bg-green-900 rounded select-none">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)} className="ml-1 lg:ml-2 text-red-400 hover:text-red-600 text-lg">&times;</button>
                </div>
              ))
            )}
          </div>

          <div className="p-3 lg:p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shrink-0 pb-6 lg:pb-4">
            <div className="flex gap-1 lg:gap-2 mb-3">
              <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-1 lg:py-1.5 rounded-lg font-bold border transition-all text-xs lg:text-sm ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}>
                نقدي
              </button>
              <button onClick={() => setPaymentMethod('bank')} className={`flex-1 py-1 lg:py-1.5 rounded-lg font-bold border transition-all text-xs lg:text-sm ${paymentMethod === 'bank' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}>
                بنكي
              </button>
              <button onClick={() => setPaymentMethod('debt')} className={`flex-1 py-1 lg:py-1.5 rounded-lg font-bold border transition-all text-xs lg:text-sm ${paymentMethod === 'debt' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}>
                آجل
              </button>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-gray-700 dark:text-gray-300 text-xs lg:text-sm">المجموع:</span>
              <span className="text-gray-800 dark:text-gray-200 font-bold text-sm lg:text-base">₪{cartTotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-gray-700 dark:text-gray-300 text-xs lg:text-sm">الخصم (₪):</span>
              <input 
                type="number" 
                value={discount} 
                onChange={(e) => setDiscount(e.target.value)} 
                className="w-16 lg:w-20 p-1 border rounded text-left dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:border-blue-500 text-xs lg:text-sm" 
                min="0"
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-gray-700 dark:text-gray-300 text-xs lg:text-sm">اسم الحجز:</span>
              <input 
                type="text" 
                value={reservationName} 
                onChange={(e) => setReservationName(e.target.value)} 
                className="w-32 lg:w-40 p-1 border rounded text-right dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:border-orange-500 text-xs lg:text-sm" 
                placeholder="اسم الزبون..."
              />
            </div>
            
            <div className="flex justify-between font-bold text-lg lg:text-xl text-gray-800 dark:text-white mb-3 lg:mb-4 border-t dark:border-gray-700 pt-2">
              <span>الإجمالي:</span>
              <span className="text-blue-600 dark:text-blue-400">₪{(finalTotal > 0 ? finalTotal : 0).toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleCheckout(false)} className="flex-1 bg-blue-600 text-white py-2 lg:py-3 rounded-lg font-bold text-sm lg:text-base hover:bg-blue-700 active:scale-95 transition-all shadow-md">
                تأكيد الفاتورة
              </button>
              <button onClick={() => handleCheckout(true)} className="flex-1 bg-orange-600 text-white py-2 lg:py-3 rounded-lg font-bold text-sm lg:text-base hover:bg-orange-700 active:scale-95 transition-all shadow-md">
                تأكيد كحجز (الشرقي)
              </button>
            </div>
          </div>
        </div>
      </div>

      {receiptData && (
        <div className="hidden print:block font-sans text-black bg-white w-[80mm] p-4 mx-auto" dir="rtl">
          <div className="text-center mb-4">
            
            {/* الشعار واسم المحل */}
            <div className="w-20 h-20 mx-auto mb-2 flex items-center justify-center grayscale contrast-125">
              <img src="/logo.png" alt="السلام كافي" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-bold mt-1">السلام كافي</h2>
            <p className="text-sm text-gray-600 border-b border-dashed border-gray-400 pb-2 mb-3">غزة - فلسطين</p>

            {/* معلومات الحجز في مربع واضح */}
            {receiptData.isReservation && (
              <div className="my-3 p-2 border-2 border-black rounded-lg text-center">
                <span className="block font-bold text-lg">تذكرة حجز (تحت الطلب)</span>
                {receiptData.reservationName && (
                  <span className="block text-xl font-extrabold border-t border-black pt-1 mt-1">
                    باسم: {receiptData.reservationName}
                  </span>
                )}
              </div>
            )}

            {/* بيانات الطلب */}
            <div className="text-xs text-right mt-2">
              <p><span className="font-bold">رقم الطلب:</span> #{receiptData.orderId}</p>
              <p><span className="font-bold">التاريخ:</span> {receiptData.date}</p>
            </div>
          </div>
          
          {/* جدول الأصناف */}
          <table className="w-full mb-4 text-sm">
            <thead className="border-b-2 border-dashed border-black">
              <tr>
                <th className="text-right py-1">الصنف</th>
                <th className="text-center py-1">الكمية</th>
                <th className="text-left py-1">السعر</th>
              </tr>
            </thead>
            <tbody>
              {receiptData.items.map((item, index) => (
                <tr key={index} className="border-b border-dashed border-gray-300">
                  <td className="text-right py-1 font-bold">{item.name}</td>
                  <td className="text-center py-1">{item.quantity}</td>
                  <td className="text-left py-1">₪{(item.unit_price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* المجاميع */}
          <div className="border-t-2 border-dashed border-black pt-2 mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>المجموع:</span>
              <span>₪{receiptData.subTotal.toFixed(2)}</span>
            </div>
            {receiptData.discount > 0 && (
              <div className="flex justify-between text-sm mb-1 text-gray-700">
                <span>الخصم:</span>
                <span>-₪{receiptData.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl mt-1 border-t border-dashed border-gray-400 pt-1">
              <span>الإجمالي:</span>
              <span>₪{receiptData.total.toFixed(2)}</span>
            </div>
          </div>
          
          {/* معلومات الدفع والكاشير */}
          <div className="text-xs border-t border-dashed border-gray-400 pt-2">
           <p><strong>طريقة الدفع:</strong> {receiptData.method === 'cash' ? 'نقدي' : receiptData.method === 'bank' ? 'بنكي (بطاقة)' : 'آجل (دين)'}</p>
            {receiptData.customer !== 'زبون عابر' && (
              <p><strong>الزبون:</strong> {receiptData.customer}</p>
            )}
            <p><strong>الكاشير:</strong> {receiptData.cashier}</p>
          </div>
          
          <div className="text-center mt-6 text-sm font-bold">
            <p>{receiptData.isReservation ? 'يرجى إبراز التذكرة عند الاستلام' : 'شكراً لزيارتكم!'}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default POS;