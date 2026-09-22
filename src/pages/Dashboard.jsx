import { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [stats, setStats] = useState({
    total_sales: 0,
    total_expenses: 0,
    net_profit: 0,
    trackable_profit: 0,
    total_debts: 0,
    total_credits: 0, // تمت إضافة حالة أرصدة الزبائن
    customers_count: 0,
    recent_orders: []
  });
  
  const [range, setRange] = useState('today');

  const fetchStats = () => {
    axios.get(`/dashboard?range=${range}`)
      .then(res => {
        if (res.data) setStats(res.data);
      })
      .catch(err => console.error("خطأ في جلب الإحصائيات:", err));
  };

  useEffect(() => {
    fetchStats();
  }, [range]);

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">لوحة التحكم (Dashboard)</h1>
        
        <select 
          value={range} 
          onChange={(e) => setRange(e.target.value)}
          className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-white font-bold focus:outline-none shadow-sm transition-colors"
        >
          <option value="today">اليوم (Today)</option>
          <option value="week">هذا الأسبوع (This Week)</option>
          <option value="month">هذا الشهر (This Month)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">إجمالي المبيعات</p>
          <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">₪{Number(stats?.total_sales || 0).toFixed(2)}</h2>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">المصروفات</p>
          <h2 className="text-3xl font-bold text-red-500 dark:text-red-400">₪{Number(stats?.total_expenses || 0).toFixed(2)}</h2>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">الربح العام (قبل جرد البضائع)</p>
          <h2 className={`text-3xl font-bold ${(stats?.net_profit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>
            ₪{Number(stats?.net_profit || 0).toFixed(2)}
          </h2>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800 transition-colors">
          <p className="text-purple-700 dark:text-purple-400 font-bold mb-2">أرباح البضائع الجاهزة (صافي)</p>
          <h2 className="text-3xl font-bold text-purple-800 dark:text-purple-300">₪{Number(stats?.trackable_profit || 0).toFixed(2)}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">ملخص الديون والزبائن</h3>
          <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-3">
            <span className="text-gray-600 dark:text-gray-400 font-bold">إجمالي ديون السوق (لكم):</span>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">₪{Number(stats?.total_debts || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-3">
            <span className="text-gray-600 dark:text-gray-400 font-bold">أرصدة الزبائن (لهم):</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">₪{Number(stats?.total_credits || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-gray-600 dark:text-gray-400 font-bold">عدد الزبائن المسجلين:</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.customers_count || 0}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">أحدث الطلبات (Recent Orders)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-sm border-b dark:border-gray-700">
                  <th className="pb-2">رقم الطلب</th>
                  <th className="pb-2">الزبون</th>
                  <th className="pb-2">القيمة</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recent_orders || []).map(order => (
                  <tr key={order.id} className="border-b dark:border-gray-700 last:border-0">
                    <td className="py-3 font-bold text-gray-700 dark:text-gray-200">#{order.id}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{order.customer ? order.customer.name : 'زبون عابر'}</td>
                    <td className="py-3 font-bold text-gray-800 dark:text-gray-100">₪{order.total_amount}</td>
                  </tr>
                ))}
                {(stats?.recent_orders || []).length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-4 text-center text-gray-500">لا توجد طلبات حديثة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;