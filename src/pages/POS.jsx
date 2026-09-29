import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useCart } from '../hooks/useCart';
import { useLocation, useNavigate } from 'react-router-dom';

function POS({ globalOpenOrders, globalTables, globalCategories, globalCustomers, refreshData }) {
  const { cartItems, addToCart, updateQuantity, cartTotal, clearCart, removeFromCart, setCartItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState(null);
  
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState(null);
  
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(''); 
  const [reservationName, setReservationName] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);

  const [showNotesBalloon, setShowNotesBalloon] = useState(false);

  const finalTotal = cartTotal - (parseFloat(discount) || 0);
  
  const [receiptData, setReceiptData] = useState(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  const wakeLockRef = useRef(null);

  useEffect(() => {
    if (globalCategories.length > 0 && !activeCategory) {
      setActiveCategory(globalCategories[0].id);
    }
  }, [globalCategories, activeCategory]);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Screen Wake Lock is active');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Screen Wake Lock was released');
        });
      }
    } catch (err) {
      console.error(`${err.name}, ${err.message}`);
    }
  };

  useEffect(() => {
    requestWakeLock();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedTable) {
      const existingOrder = globalOpenOrders.find(o => String(o.table_id) === String(selectedTable));
      
      if (existingOrder) {
        setCurrentOrderId(existingOrder.id);
        setSelectedCustomer(existingOrder.customer_id || '');
        setPaymentMethod(existingOrder.payment_method || 'cash');
        setDiscount(existingOrder.discount > 0 ? existingOrder.discount : '');
        
        // إزالة ختم [QR] قبل عرضه للكاشير
        const cleanNotes = existingOrder.reservation_name ? existingOrder.reservation_name.replace('[QR]', '').trim() : '';
        setReservationName(cleanNotes);
        
        if (cleanNotes && cleanNotes.includes('ملاحظة:')) {
            setShowNotesBalloon(true);
        } else {
            setShowNotesBalloon(false);
        }
        
        const mappedItems = existingOrder.items.map(i => ({
          product_id: i.product_id,
          name: i.product_name, 
          price: parseFloat(i.unit_price),
          unit_price: parseFloat(i.unit_price),
          quantity: parseInt(i.quantity),
          subtotal: parseInt(i.quantity) * parseFloat(i.unit_price) 
        }));
        setCartItems(mappedItems);
      } else {
        setCurrentOrderId(null);
        clearCart();
        setDiscount('');
        setReservationName('');
        setShowNotesBalloon(false);
      }
    } else {
      setCurrentOrderId(null);
      clearCart();
      setDiscount('');
      setReservationName('');
      setShowNotesBalloon(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable, globalOpenOrders]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderIdToLoad = params.get('load_order');

    if (orderIdToLoad && globalOpenOrders.length > 0) {
      const orderToEdit = globalOpenOrders.find(o => String(o.id) === String(orderIdToLoad));
      
      if (orderToEdit) {
        if (orderToEdit.table_id) {
          setSelectedTable(String(orderToEdit.table_id));
        } else {
          setCurrentOrderId(orderToEdit.id);
          setSelectedCustomer(orderToEdit.customer_id || '');
          setPaymentMethod(orderToEdit.payment_method || 'cash');
          setDiscount(orderToEdit.discount > 0 ? orderToEdit.discount : '');
          
          const cleanNotes = orderToEdit.reservation_name ? orderToEdit.reservation_name.replace('[QR]', '').trim() : '';
          setReservationName(cleanNotes);
          
          if (cleanNotes && cleanNotes.includes('ملاحظة:')) {
              setShowNotesBalloon(true);
          } else {
              setShowNotesBalloon(false);
          }
          
          const mappedItems = orderToEdit.items.map(i => ({
            product_id: i.product_id,
            name: i.product_name, 
            price: parseFloat(i.unit_price),
            unit_price: parseFloat(i.unit_price),
            quantity: parseInt(i.quantity),
            subtotal: parseInt(i.quantity) * parseFloat(i.unit_price) 
          }));
          setCartItems(mappedItems);
        }
        
        setShowMobileCart(true);
        navigate('/', { replace: true });
      }
    }
  }, [location.search, globalOpenOrders, setCartItems, navigate]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          setReceiptImage(compressedBase64);
        };
      };
    }
  };

  const handleSaveOrder = () => {
    if (paymentMethod === 'bank' && !receiptImage) {
      return alert('يرجى إرفاق صورة إشعار الدفع البنكي أولاً لإتمام العملية.');
    }

    if(cartItems.length === 0) return alert('السلة فارغة');
    if(!selectedTable) return alert('يجب اختيار طاولة لحفظ الطلب عليها');

    const currentUser = JSON.parse(localStorage.getItem('user'));

    const orderData = {
      user_id: currentUser ? currentUser.id : null,
      order_id: currentOrderId,
      table_id: selectedTable,
      customer_id: selectedCustomer || null,
      payment_method: paymentMethod,
      discount: parseFloat(discount) || 0,
      status: 'open',
      reservation_name: reservationName || null,
      receipt_image: receiptImage,
      items: cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };

    axios.post('/orders', orderData)
      .then(() => {
        alert('تم حفظ الطلب على الطاولة بنجاح');
        clearCart();
        setSelectedTable('');
        setCurrentOrderId(null);
        setReceiptImage(null);
        setReservationName('');
        setShowNotesBalloon(false);
        refreshData(); 
      })
      .catch(err => alert(err.response?.data?.error || 'حدث خطأ أثناء الحفظ'));
  };

  const handleCheckout = (isReservation = false) => {
    if (paymentMethod === 'bank' && !receiptImage) {
      return alert('يرجى إرفاق صورة إشعار الدفع البنكي أولاً لإتمام العملية.');
    }
    
    if (paymentMethod === 'bank' && !selectedCustomer && !reservationName.trim() && !isReservation) {
        const confirmProceed = window.confirm('لم تقم بإدخال "اسم المُحوِّل" للدفعة البنكية. هل تريد المتابعة بدون اسم؟');
        if (!confirmProceed) return;
    }

    if(cartItems.length === 0) return alert('السلة فارغة (Cart is empty)');
    
    if (isReservation && !reservationName.trim()) {
      const confirmProceed = window.confirm('لم تقم بإدخال "اسم الحجز". هل تريد المتابعة بدون اسم؟');
      if (!confirmProceed) return;
    }
    
    if (paymentMethod === 'debt') {
      if (!selectedCustomer) {
        return alert('يجب تحديد زبون مسجل لتتمكن من تسجيل الطلب كدين.');
      }
      
      const customerData = globalCustomers.find(c => c.id === parseInt(selectedCustomer));
      if (customerData) {
        const projectedDebt = parseFloat(customerData.debt_balance) + finalTotal;
        const creditLimit = parseFloat(customerData.credit_limit);
        
        if (projectedDebt > creditLimit) {
          return alert(`عذراً! لا يمكن إتمام الطلب كدين.\nسقف الدين المسموح للزبون: ₪${creditLimit.toFixed(2)}\nالدين الحالي: ₪${parseFloat(customerData.debt_balance).toFixed(2)}\nالإجمالي سيصبح: ₪${projectedDebt.toFixed(2)} (تجاوز للحد المسموح!)`);
        }
      }
    }
    
    const currentUser = JSON.parse(localStorage.getItem('user'));

    const orderData = {
      user_id: currentUser ? currentUser.id : null,
      order_id: currentOrderId,
      table_id: selectedTable || null,
      customer_id: selectedCustomer || null,
      payment_method: paymentMethod,
      discount: parseFloat(discount) || 0,
      status: isReservation ? 'reservation' : 'closed',
      reservation_name: reservationName || null,
      receipt_image: receiptImage,
      items: cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };

    axios.post('/orders', orderData)
      .then(res => {
        const cashierName = currentUser?.name || 'غير معروف';
        const customerName = globalCustomers.find(c => c.id == selectedCustomer)?.name || 'زبون عابر';
        
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
          reservationName: reservationName
        });

        setTimeout(() => {
          window.print();
          
          clearCart();
          setSelectedTable('');
          setSelectedCustomer('');
          setCurrentOrderId(null);
          setPaymentMethod('cash');
          setDiscount(''); 
          setReservationName(''); 
          setReceiptImage(null);
          setShowNotesBalloon(false);
          setReceiptData(null);
          setShowMobileCart(false);
          refreshData(); 
        }, 500);
      })
      .catch(err => {
        alert(err.response?.data?.error || err.response?.data?.message || 'حدث خطأ أثناء الحفظ');
      });
  };

  const handleCancelOrder = () => {
    if (!currentOrderId) return;
    
    if (window.confirm('هل أنت متأكد من إلغاء هذا الطلب وحذفه نهائياً؟')) {
      axios.delete(`/orders/${currentOrderId}`)
        .then(() => {
          alert('تم إلغاء الطلب وتحرير الطاولة بنجاح.');
          clearCart();
          setSelectedTable('');
          setCurrentOrderId(null);
          setReceiptImage(null);
          setReservationName('');
          setShowNotesBalloon(false);
          refreshData(); 
        })
        .catch(err => {
          console.error(err);
          alert('حدث خطأ أثناء إلغاء الطلب.');
        });
    }
  };

  const currentProducts = globalCategories.find(c => c.id === activeCategory)?.products || [];

  return (
    <>
      <div className="flex flex-col lg:flex-row h-full overflow-hidden text-right font-sans print:hidden bg-gray-50 dark:bg-gray-900 transition-colors relative" dir="rtl">
        
        <div className="lg:hidden print:hidden flex justify-between items-center p-3 bg-white dark:bg-gray-800 shadow-sm z-20 border-b dark:border-gray-700 shrink-0">
          <span className="font-bold text-gray-800 dark:text-white text-lg">
            {showMobileCart ? 'تفاصيل السلة' : 'المنتجات'}
          </span>
          <button 
            onClick={() => setShowMobileCart(!showMobileCart)} 
            className={`px-4 py-2 rounded-lg font-bold text-white transition-colors shadow ${showMobileCart ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {showMobileCart ? 'العودة للمنتجات' : `عـرض الـسـلـة (${cartItems.length})`}
          </button>
        </div>

        <div className={`${showMobileCart ? 'hidden' : 'flex'} lg:flex w-full lg:w-8/12 flex-col p-2 lg:p-6 lg:border-l border-gray-200 dark:border-gray-700 flex-1 overflow-hidden`}>
          <h1 className="text-3xl font-bold mb-4 lg:mb-6 text-gray-800 dark:text-white hidden lg:block shrink-0">نقطة البيع</h1>
          
          <div className="flex flex-wrap items-center justify-start gap-2 lg:gap-3 mb-4 w-full py-1 px-1 shrink-0">
            {globalCategories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap select-none transition-all duration-300 text-sm lg:text-base ${
                  activeCategory === cat.id 
                    ? 'bg-blue-600 text-white shadow-md border-transparent' 
                    : 'bg-white text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto w-full pb-20 [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-5 p-1">
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

                 <div className="w-14 h-14 lg:w-20 lg:h-20 bg-blue-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2 lg:mb-4 shadow-inner">
                   <span className="text-3xl lg:text-5xl">{product.icon || '📦'}</span>
                 </div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-center text-sm lg:text-base leading-tight mb-1">{product.name}</h3>
                  <p className="text-green-600 dark:text-green-400 font-bold text-sm lg:text-base mt-auto">₪{product.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${showMobileCart ? 'flex' : 'hidden'} lg:flex w-full lg:w-4/12 bg-white dark:bg-gray-800 lg:shadow-xl flex-col flex-1 overflow-hidden border-r border-gray-200 dark:border-gray-700`}>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
            
            {showNotesBalloon && reservationName && (
              <div className="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-600 rounded-xl relative shadow-sm animate-fade-in">
                <button 
                  onClick={() => setShowNotesBalloon(false)} 
                  className="absolute top-2 left-2 text-yellow-700 dark:text-yellow-400 hover:text-red-500 font-bold"
                >
                  &times;
                </button>
                <div className="flex items-start gap-2">
                  <span className="text-xl">📝</span>
                  <div>
                    <span className="block font-bold text-yellow-800 dark:text-yellow-300 text-sm mb-1">ملاحظات الزبون:</span>
                    <span className="block text-yellow-900 dark:text-yellow-100 font-medium text-sm break-words">{reservationName.replace('ملاحظة: ', '')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-3 lg:mb-0">
               <h2 className="text-lg font-bold text-gray-800 dark:text-white lg:block">تفاصيل الطلب</h2>
               <button onClick={() => setShowMobileCart(false)} className="lg:hidden bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm">
                 رجوع للمنتجات 🔙
               </button>
            </div>
            
            <select 
              value={selectedTable} 
              onChange={(e) => setSelectedTable(e.target.value)} 
              className={`w-full p-2 mb-2 border rounded-lg focus:outline-none text-sm font-bold mt-2 ${currentOrderId ? 'bg-orange-50 border-orange-300 text-gray-900 dark:bg-orange-900/30 dark:text-white dark:border-orange-800' : 'bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600'}`}
            >
              <option value="" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white font-bold">
                طلب سفري (بدون طاولة)
              </option>
              {globalTables.map(t => {
                const isOccupied = globalOpenOrders.some(o => String(o.table_id) === String(t.id));
                return (
                  <option 
                    key={t.id} 
                    value={t.id} 
                    className={`bg-white dark:bg-gray-800 font-bold ${isOccupied ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}
                  >
                    طاولة {t.name} - {t.zone === 'family' ? 'عائلات' : 'شباب'} {isOccupied ? '(مشغولة)' : ''}
                  </option>
                );
              })}
            </select>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none text-sm font-bold text-gray-900">
              <option value="" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">زبون عابر (نقدي فقط)</option>
              {globalCustomers.map(c => <option key={c.id} value={c.id} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">{c.name} - سقف الدين: ₪{c.credit_limit}</option>)}
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
                      globalCategories.forEach(cat => {
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

          <div className="p-3 lg:p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex gap-1 lg:gap-2 mb-3">
              <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-1 lg:py-1.5 rounded-lg font-bold border transition-all text-xs lg:text-sm ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}>نقدي</button>
              <button onClick={() => setPaymentMethod('bank')} className={`flex-1 py-1 lg:py-1.5 rounded-lg font-bold border transition-all text-xs lg:text-sm ${paymentMethod === 'bank' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}>بنكي</button>
              <button onClick={() => setPaymentMethod('debt')} className={`flex-1 py-1 lg:py-1.5 rounded-lg font-bold border transition-all text-xs lg:text-sm ${paymentMethod === 'debt' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}>آجل</button>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-gray-700 dark:text-gray-300 text-xs lg:text-sm">المجموع:</span>
              <span className="text-gray-800 dark:text-gray-200 font-bold text-sm lg:text-base">₪{cartTotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-gray-700 dark:text-gray-300 text-xs lg:text-sm">الخصم (₪):</span>
              <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-16 lg:w-20 p-1 border rounded text-left dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:border-blue-500 text-xs lg:text-sm" min="0" placeholder="0.00" />
            </div>

            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-gray-700 dark:text-gray-300 text-xs lg:text-sm whitespace-nowrap ml-2">
                  {paymentMethod === 'bank' ? 'اسم المُحوِّل:' : 'اسم الحجز/الزبون:'}
              </span>
              <input type="text" value={reservationName} onChange={(e) => setReservationName(e.target.value)} className={`w-full p-1 border rounded text-right dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none text-xs lg:text-sm ${paymentMethod === 'bank' && !reservationName && !selectedCustomer ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400' : 'focus:border-orange-500'}`} placeholder={paymentMethod === 'bank' ? "مثال: حساب محمد العلي..." : "اسم الزبون..."} />
            </div>

            {paymentMethod === 'bank' && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg animate-fade-in">
                <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">إرفاق إشعار الدفع البنكي *</label>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-blue-600 text-white text-center py-2 rounded-lg text-xs lg:text-sm font-bold hover:bg-blue-700 transition-colors shadow-md">
                    اختر ملف 📁
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <label className="flex-1 cursor-pointer bg-emerald-600 text-white text-center py-2 rounded-lg text-xs lg:text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md">
                    التقط صورة 📷
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                {receiptImage && <div className="mt-2 text-center text-xs text-green-700 dark:text-green-400 font-bold">✓ تم التقاط/إرفاق الصورة بنجاح</div>}
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg lg:text-xl text-gray-800 dark:text-white mb-3 lg:mb-4 border-t dark:border-gray-700 pt-2">
              <span>الإجمالي:</span>
              <span className="text-blue-600 dark:text-blue-400">₪{(finalTotal > 0 ? finalTotal : 0).toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={() => handleCheckout(true)} className="bg-orange-600 text-white py-2 rounded-lg font-bold text-xs lg:text-sm hover:bg-orange-700 active:scale-95 transition-all shadow-md">تأكيد كحجز</button>
              <button onClick={handleSaveOrder} className={`py-2 rounded-lg font-bold text-xs lg:text-sm active:scale-95 transition-all shadow-md ${selectedTable ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`} disabled={!selectedTable}>
                {currentOrderId ? 'تحديث الطاولة' : 'حفظ للطاولة'}
              </button>
            </div>
            
            <button onClick={() => handleCheckout(false)} className="w-full bg-blue-600 text-white py-2 lg:py-3 rounded-lg font-bold text-sm lg:text-base hover:bg-blue-700 active:scale-95 transition-all shadow-md mb-2">
              {currentOrderId ? 'محاسبة وإغلاق الطاولة 🖨️' : 'تأكيد وطباعة الفاتورة 🖨️'}
            </button>

            {currentOrderId && (
              <button 
                onClick={handleCancelOrder} 
                className="w-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 py-2 rounded-lg font-bold text-xs lg:text-sm hover:bg-red-200 dark:hover:bg-red-900 transition-colors shadow-sm"
              >
                إلغاء الطلب المفتوح 🗑️
              </button>
            )}
          </div>
        </div>
      </div>

      {receiptData && (
        <div className="hidden print:flex print:fixed print:inset-0 print:bg-white print:z-[9999] print:justify-center print:items-start pt-4">
          <div className="font-sans text-black bg-white w-[80mm] p-4 shrink-0 mx-auto" dir="rtl">
            <div className="text-center mb-4">
              <div className="w-20 h-20 mx-auto mb-2 flex items-center justify-center grayscale contrast-125">
                <img src="/logo.png" alt="السلام كافي" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-2xl font-bold mt-1">السلام كافي</h2>
              <p className="text-sm text-gray-600 border-b border-dashed border-gray-400 pb-2 mb-3">غزة - فلسطين</p>

              {receiptData.isReservation && (
                <div className="my-3 p-2 border-2 border-black rounded-lg text-center">
                  <span className="block font-bold text-lg">تذكرة حجز (غير مدفوعة)</span>
                  <span className="block text-xl font-extrabold border-t border-black pt-1 mt-1">
                    باسم: {receiptData.reservationName ? receiptData.reservationName : (receiptData.customer !== 'زبون عابر' ? receiptData.customer : 'زبون عابر')}
                  </span>
                </div>
              )}

              <div className="text-xs text-right mt-2">
                <p><span className="font-bold">رقم الطلب:</span> #{receiptData.orderId}</p>
                <p><span className="font-bold">التاريخ:</span> {receiptData.date}</p>
              </div>
            </div>
            
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
            
            {!receiptData.isReservation && (
              <div className="text-xs border-t border-dashed border-gray-400 pt-2">
               <p><strong>طريقة الدفع:</strong> {receiptData.method === 'cash' ? 'نقدي' : receiptData.method === 'bank' ? 'بنكي (بطاقة)' : 'آجل (دين)'}</p>
                {(receiptData.customer !== 'زبون عابر' || receiptData.reservationName) && (
                  <p><strong>{receiptData.method === 'bank' ? 'المُحوِّل/الزبون:' : 'الزبون:'}</strong> {receiptData.reservationName || receiptData.customer}</p>
                )}
                <p><strong>الكاشير:</strong> {receiptData.cashier}</p>
              </div>
            )}
            <div className="text-center mt-6 text-sm font-bold">
              <p>{receiptData.isReservation ? 'يرجى التوجه للكاشير لتأكيد الدفع' : 'شكراً لزيارتكم!'}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default POS;