import { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [stats, setStats] = useState({
    total_sales: 0,
    total_expenses: 0,
    net_profit: 0,
    trackable_profit: 0,
    total_debts: 0,
    total_credits: 0,
    customers_count: 0,
    recent_orders: []
  });
  const [range, setRange] = useState('today');
  const [errorMsg, setErrorMsg] = useState(null); // حالة جديدة لالتقاط الأخطاء

  useEffect(() => {
    setErrorMsg(null);
    axios.get(`/dashboard-stats?range=${range}`)
      .then(res => setStats(res.data))
      .catch(err => {
        console.error("Error fetching stats:", err);
        // استخراج رسالة الخطأ وعرضها للمستخدم
        const errorDetails = err.response 
          ? `رمز الخطأ: ${err.response.status} - ${JSON.stringify(err.response.data)}` 
          : err.message;
        setErrorMsg(errorDetails);
      });
  }, [range]);

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">لوحة التحكم (Dashboard)</h1>
        <select 
          value={range} 
          onChange={e => setRange(e.target.value)} 
          className="border p-2 rounded-lg bg-gray-800 text-white font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="today">اليوم (Today)</option>
          <option value="week">هذا الأسبوع (This Week)</option>
          <option value="month">هذا الشهر (This Month)</option>
        </select>
      </div>

      {/* مربع كشف الأخطاء سيظهر هنا إذا فشل جلب البيانات */}
      {errorMsg && (
        <div className="bg-red-100 border-r-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-sm">
          <p className="font-bold mb-1">فشل الاتصال بالواجهة الخلفية (Backend):</p>
          <p className="text-sm font-mono text-left" dir="ltr">{errorMsg}</p>
          <p className="text-sm mt-2 font-bold text-red-800">
            * إذا كان الخطأ 404: يرجى التأكد من إضافة السطر <code className="bg-red-200 px-1 rounded">Route::get('/dashboard-stats', [App\Http\Controllers\Api\POSController::class, 'getDashboardStats']);</code> داخل ملف routes/api.php في الباك إند ورفعه.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-900/40 p-6 rounded-xl border border-blue-800 text-center shadow-sm">
          <p className="text-blue-200 font-bold mb-2">إجمالي المبيعات</p>
          <h2 className="text-3xl font-bold text-blue-400">₪{stats.total_sales}</h2>
        </div>
        <div className="bg-red-900/40 p-6 rounded-xl border border-red-800 text-center shadow-sm">
          <p className="text-red-200 font-bold mb-2">المصروفات</p>
          <h2 className="text-3xl font-bold text-red-400">₪{stats.total_expenses}</h2>
        </div>
        <div className="bg-green-900/40 p-6 rounded-xl border border-green-800 text-center shadow-sm">
          <p className="text-green-200 font-bold mb-2">الربح العام (قبل جرد البضائع)</p>
          <h2 className="text-3xl font-bold text-green-400">₪{stats.net_profit}</h2>
        </div>
        <div className="bg-purple-900/40 p-6 rounded-xl border border-purple-800 text-center shadow-sm">
          <p className="text-purple-200 font-bold mb-2">أرباح البضائع الجاهزة (صافي)</p>
          <h2 className="text-3xl font-bold text-purple-400">₪{stats.trackable_profit}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-2">ملخص الديون والزبائن</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-gray-300 font-bold">
              <span>إجمالي ديون السوق (لكم):</span>
              <span className="text-red-400 text-xl">₪{stats.total_debts}</span>
            </div>
            <div className="flex justify-between items-center text-gray-300 font-bold">
              <span>أرصدة الزبائن (لهم):</span>
              <span className="text-green-400 text-xl">₪{stats.total_credits}</span>
            </div>
            <div className="flex justify-between items-center text-gray-300 font-bold pt-4 border-t border-gray-700">
              <span>عدد الزبائن المسجلين:</span>
              <span className="text-blue-400 text-xl">{stats.customers_count}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-2">أحدث الطلبات (Recent Orders)</h2>
          <table className="w-full text-right text-gray-300">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="pb-2">رقم الطلب</th>
                <th className="pb-2">الزبون</th>
                <th className="pb-2">القيمة</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_orders.map(order => (
                <tr key={order.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="py-3 font-mono">#{order.id}</td>
                  <td className="py-3 font-bold">{order.customer ? order.customer.name : 'زبون عابر'}</td>
                  <td className="py-3 font-bold text-green-400">₪{order.total_amount}</td>
                </tr>
              ))}
              {stats.recent_orders.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-6 text-center text-gray-500 font-bold">لا توجد طلبات حديثة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;