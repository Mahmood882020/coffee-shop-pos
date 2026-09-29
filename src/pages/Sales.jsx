import { useState, useEffect } from 'react';
import axios from 'axios';

function Sales() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMonths, setExpandedMonths] = useState({});
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentReceiptImage, setCurrentReceiptImage] = useState(null);

  const fetchOrders = () => {
    axios.get('/orders')
      .then(res => {
        setOrders(res.data);
        
        const uniqueMonths = [...new Set(res.data.map(o => o.date.substring(0, 7)))].sort().reverse();
        
        const initialExpanded = {};
        uniqueMonths.forEach((month, index) => {
          initialExpanded[month] = index === 0; 
        });
        
        setExpandedMonths(prev => Object.keys(prev).length === 0 ? initialExpanded : prev);
      })
      .catch(err => console.error("Error fetching orders:", err));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleMonth = (month) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  // تم التعديل هنا: إضافة cashier_name لعملية البحث
  const filteredOrders = orders.filter(o => {
    const query = searchQuery.toLowerCase();
    return (
      o.id.toString().includes(query) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
      (o.items_summary && o.items_summary.toLowerCase().includes(query)) ||
      (o.date && o.date.toLowerCase().includes(query)) ||
      (o.table_name && o.table_name.toLowerCase().includes(query)) ||
      (o.payment_method && o.payment_method.toLowerCase().includes(query)) ||
      (o.cashier_name && o.cashier_name.toLowerCase().includes(query))
    );
  });

  const groupedOrders = {};
  filteredOrders.forEach(o => {
    const monthYear = o.date.substring(0, 7);
    if (!groupedOrders[monthYear]) {
      groupedOrders[monthYear] = [];
    }
    groupedOrders[monthYear].push(o);
  });

  const sortedMonths = Object.keys(groupedOrders).sort().reverse();

  const formatMonthName = (yyyyMM) => {
    const [year, month] = yyyyMM.split('-');
    const dateObj = new Date(year, parseInt(month) - 1);
    return dateObj.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">سجل المبيعات (Sales History)</h1>
      </div>

      <div className="mb-8 w-full md:w-1/2 relative">
        <input 
          type="text" 
          placeholder="ابحث برقم الفاتورة، الزبون، الكاشير، التاريخ، أو الدفع..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 p-4 pr-12 rounded-xl dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
        />
        <svg className="w-6 h-6 text-gray-400 absolute right-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>

      <div className="flex flex-col gap-5">
        {sortedMonths.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
            لا توجد فواتير مطابقة للبحث.
          </div>
        ) : (
          sortedMonths.map(monthKey => {
            const monthOrders = groupedOrders[monthKey];
            const monthTotal = monthOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
            
            return (
              <div key={monthKey} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
                
                <button 
                  onClick={() => toggleMonth(monthKey)}
                  className="w-full flex justify-between items-center p-5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-xl text-gray-800 dark:text-gray-100">
                      {formatMonthName(monthKey)}
                    </span>
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                      {monthOrders.length} فواتير
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-bold text-lg text-green-600 dark:text-green-400">
                      ₪{monthTotal.toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 font-bold text-xl">
                      {expandedMonths[monthKey] ? '▼' : '◀'}
                    </span>
                  </div>
                </button>

                {expandedMonths[monthKey] && (
                  <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-700">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-600">
                        <tr>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300">رقم الطلب</th>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300">التاريخ / الكاشير</th>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300">الزبون / الطاولة</th>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300 w-1/3">التفاصيل</th>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300 text-center">طريقة الدفع</th>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300 text-center">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800">
                        {monthOrders.map(order => (
                          <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors last:border-0">
                            <td className="p-4 font-bold text-gray-800 dark:text-gray-100">#{order.id}</td>
                            
                            {/* التعديل هنا: إظهار اسم الكاشير أسفل التاريخ */}
                            <td className="p-4 text-gray-600 dark:text-gray-400">
                              <div dir="ltr" className="text-right">{order.date}</div>
                              <div className="mt-1.5 text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded w-fit border border-purple-100 dark:border-purple-800">
                                👤 {order.cashier_name}
                              </div>
                            </td>

                            <td className="p-4">
                              <span className="block font-bold text-gray-800 dark:text-gray-200">{order.customer_name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{order.table_name}</span>
                            </td>
                            <td className="p-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                              <span>{order.items_summary}</span>
                              {parseFloat(order.discount) > 0 && (
                                <span className="block mt-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded w-fit border border-red-100 dark:border-red-800">
                                  خصم ممنوح: ₪{parseFloat(order.discount).toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {order.payment_method === 'بنكي' ? (
                                <button 
                                  onClick={() => {
                                    if(order.receipt_image) {
                                      setCurrentReceiptImage(order.receipt_image);
                                      setIsImageModalOpen(true);
                                    } else {
                                      alert('لا توجد صورة إشعار مرفقة مع هذا الطلب');
                                    }
                                  }}
                                  className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 cursor-pointer shadow-sm transition-all"
                                >
                                  بنكي 📎
                                </button>
                              ) : (
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${order.payment_method === 'نقدي' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                  {order.payment_method}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center font-bold text-gray-800 dark:text-white text-base">
                              ₪{order.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isImageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setIsImageModalOpen(false)}>
          <div className="relative max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">إشعار الدفع البنكي</h2>
              <button onClick={() => setIsImageModalOpen(false)} className="text-gray-500 hover:text-red-500 text-3xl font-bold leading-none">&times;</button>
            </div>
            <div className="w-full flex justify-center bg-gray-100 dark:bg-gray-900 rounded-lg p-2 max-h-[70vh] overflow-auto">
              <img src={currentReceiptImage} alt="إشعار الدفع" className="max-w-full h-auto object-contain rounded" />
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setIsImageModalOpen(false)} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;