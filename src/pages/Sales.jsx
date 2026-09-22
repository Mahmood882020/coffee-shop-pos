import { useState, useEffect } from 'react';
import axios from 'axios';

function Sales() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMonths, setExpandedMonths] = useState({});

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

  // تم إضافة الفلترة لتشمل طريقة الدفع هنا
  const filteredOrders = orders.filter(o => {
    const query = searchQuery.toLowerCase();
    return (
      o.id.toString().includes(query) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
      (o.items_summary && o.items_summary.toLowerCase().includes(query)) ||
      (o.date && o.date.toLowerCase().includes(query)) ||
      (o.table_name && o.table_name.toLowerCase().includes(query)) ||
      (o.payment_method && o.payment_method.toLowerCase().includes(query))
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
        {/* تحديث النص الإرشادي ليعكس إمكانية البحث بطريقة الدفع */}
        <input 
          type="text" 
          placeholder="ابحث برقم الفاتورة، الزبون، الصنف، التاريخ، أو طريقة الدفع..." 
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
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300">التاريخ</th>
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
                            <td className="p-4 text-gray-600 dark:text-gray-400" dir="ltr">{order.date}</td>
                            <td className="p-4">
                              <span className="block font-bold text-gray-800 dark:text-gray-200">{order.customer_name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{order.table_name}</span>
                            </td>
                            <td className="p-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                              {order.items_summary}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                order.payment_method === 'نقدي' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                                order.payment_method === 'دين' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                              }`}>
                                {order.payment_method}
                              </span>
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
    </div>
  );
}

export default Sales;