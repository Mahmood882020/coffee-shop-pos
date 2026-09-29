import { useState, useEffect } from 'react';
import axios from 'axios';

function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [printModal, setPrintModal] = useState({ isOpen: false, order: null });

  const fetchReservations = () => {
    axios.get('/dashboard-stats?range=month') 
      .then(res => {
        if(res.data && res.data.recent_orders) {
           const pending = res.data.recent_orders.filter(order => order.status === 'reservation');
           setReservations(pending);
        }
      })
      .catch(err => console.error("Error fetching reservations:", err));
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const confirmPayment = (id) => {
    if(!window.confirm('هل أنت متأكد من استلام المبلغ وتأكيد الدفع؟')) return;
    
    axios.put(`/orders/${id}/status`, { status: 'closed', payment_method: 'cash' })
      .then(() => {
        alert('تم تأكيد الدفع وتحويل الحجز إلى فاتورة مبيعات بنجاح');
        fetchReservations();
      })
      .catch(() => alert('حدث خطأ أثناء تأكيد الدفع'));
  };

  const deleteReservation = (id) => {
    if(!window.confirm('هل أنت متأكد من إلغاء هذا الحجز؟ (سيتم إرجاع البضاعة للمخزن)')) return;
    
    axios.delete(`/orders/${id}`)
      .then(() => {
        alert('تم إلغاء الحجز وحذفه نهائياً');
        fetchReservations();
      })
      .catch(() => alert('حدث خطأ أثناء الحذف'));
  };

  const openPrintModal = (order) => {
    // جلب تفاصيل الأصناف قبل فتح نافذة الطباعة لأن الواجهة تحتاجها
    axios.get('/orders')
      .then(res => {
        const fullOrderDetails = res.data.find(o => o.id === order.id);
        if(fullOrderDetails) {
          setPrintModal({ isOpen: true, order: fullOrderDetails });
        } else {
          // Fallback إذا لم يتم العثور عليه في المسار الأول
          setPrintModal({ isOpen: true, order });
        }
      })
      .catch(() => {
        setPrintModal({ isOpen: true, order });
      });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">إدارة الحجوزات المعلقة ⏳</h1>
        <button onClick={fetchReservations} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors">
          تحديث القائمة 🔄
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:hidden">
        <div className="overflow-x-auto w-full">
          {/* إزالة الحد الأدنى للعرض للسماح بالالتفاف في الشاشات الصغيرة */}
          <table className="w-full text-right text-gray-700 dark:text-gray-300 whitespace-nowrap md:whitespace-normal">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-4 font-bold text-gray-800 dark:text-gray-200">رقم الحجز</th>
                <th className="p-4 font-bold text-gray-800 dark:text-gray-200">الزبون</th>
                <th className="p-4 font-bold text-gray-800 dark:text-gray-200">التاريخ</th>
                <th className="p-4 font-bold text-gray-800 dark:text-gray-200">الإجمالي</th>
                {/* تم إزالة الفئات اللاصقة (sticky left-0) التي كانت تسبب التداخل */}
                <th className="p-4 font-bold text-gray-800 dark:text-gray-200 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(order => (
                <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">#{order.id}</td>
                  <td className="p-4 font-bold">
                    {order.reservation_name 
                      ? order.reservation_name 
                      : (order.customer ? order.customer.name : 'زبون عابر')}
                  </td>
                  <td className="p-4 font-mono text-sm" dir="ltr">{new Date(order.created_at).toLocaleString('ar-EG')}</td>
                  <td className="p-4 font-bold text-green-600 dark:text-green-400">₪{parseFloat(order.total_amount).toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => confirmPayment(order.id)} className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded font-bold text-sm transition-colors">
                        تأكيد الدفع ✔️
                      </button>
                      <button onClick={() => openPrintModal(order)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded font-bold text-sm transition-colors">
                        طباعة 🖨️
                      </button>
                      <button onClick={() => deleteReservation(order.id)} className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded font-bold text-sm transition-colors">
                        إلغاء 🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500 font-bold text-lg">لا توجد حجوزات معلقة حالياً</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {printModal.isOpen && printModal.order && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 print:fixed print:inset-0 print:bg-white print:z-[9999] print:flex print:justify-center print:items-start print:pt-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md print:shadow-none print:w-[80mm] print:p-4 print:m-0 print:rounded-none shrink-0 mx-auto">
            <div className="flex justify-between items-center mb-4 print:hidden">
              <h2 className="text-xl font-bold text-gray-800">معاينة تذكرة الحجز</h2>
              <button onClick={() => setPrintModal({isOpen: false, order: null})} className="text-gray-500 hover:text-red-500 text-2xl font-bold">&times;</button>
            </div>
            
            <div className="receipt-container bg-white text-black p-4 border border-dashed border-gray-300 print:border-none print:p-0">
               <div className="text-center mb-4">
                  <div className="w-20 h-20 mx-auto mb-2 flex items-center justify-center grayscale contrast-125 print:w-16 print:h-16">
                    <img src="/logo.png" alt="السلام كافي" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="font-bold text-xl mb-1">السلام كافي</h3>
                  <p className="text-xs text-gray-600">غزة - فلسطين</p>
               </div>

               <div className="border-t-2 border-b-2 border-black py-2 mb-4 text-center">
                  <p className="font-bold text-lg">تذكرة حجز (غير مدفوعة)</p>
                  <p className="font-bold text-xl mt-1">
                    باسم: {printModal.order.reservation_name 
                      ? printModal.order.reservation_name 
                      : (printModal.order.customer_name ? printModal.order.customer_name : 'زبون عابر')}
                  </p>
               </div>

               <div className="flex justify-between text-sm mb-2 font-bold font-mono" dir="ltr">
                  <span>#{printModal.order.id}</span>
                  <span>{printModal.order.date || new Date(printModal.order.created_at).toLocaleString('ar-EG')}</span>
               </div>

               <div className="border-t border-dashed border-gray-400 my-2"></div>
               
               {printModal.order.items_summary && (
                 <div className="text-sm font-bold text-right mb-4 leading-relaxed">
                   <p className="text-gray-600 mb-1 border-b border-gray-300 pb-1">الأصناف:</p>
                   {printModal.order.items_summary}
                 </div>
               )}
               
               <div className="flex justify-between font-bold text-xl mt-4 border-t-2 border-black pt-2">
                  <span>الإجمالي:</span>
                  <span>₪{parseFloat(printModal.order.total_amount || printModal.order.total).toFixed(2)}</span>
               </div>
               
               <div className="text-center mt-6 text-sm font-bold border-t border-dashed border-gray-400 pt-2">
                  <p>يرجى التوجه للكاشير لتأكيد الدفع</p>
               </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 print:hidden">
              <button onClick={() => setPrintModal({isOpen: false, order: null})} className="px-5 py-2 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300">إغلاق</button>
              <button onClick={handlePrint} className="px-5 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md">طباعة الفاتورة 🖨️</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reservations;