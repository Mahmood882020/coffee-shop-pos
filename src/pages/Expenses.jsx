import { useState, useEffect } from 'react';
import axios from 'axios';

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ 
    description: '', 
    amount: '', 
    expense_date: new Date().toISOString().split('T')[0] 
  });

  const fetchExpenses = () => {
    axios.get('/expenses')
      .then(res => setExpenses(res.data))
      .catch(err => console.error("خطأ في جلب المصروفات:", err));
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.expense_date) {
      return alert('يرجى تعبئة كافة الحقول');
    }
    axios.post('/expenses', newExpense)
      .then(() => {
        setNewExpense({ description: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });
        fetchExpenses();
      })
      .catch(err => alert('حدث خطأ أثناء الإضافة'));
  };

  const handleDeleteExpense = (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    axios.delete(`/expenses/${id}`)
      .then(() => fetchExpenses())
      .catch(err => alert('حدث خطأ أثناء الحذف'));
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">إدارة المصروفات (Expenses)</h1>
        <div className="bg-red-700 text-white px-6 py-3 rounded-lg font-bold text-xl shadow-md dark:bg-red-900/80 dark:border dark:border-red-700">
          إجمالي المصروفات: ₪{totalExpenses.toFixed(2)}
        </div>
      </div>

      {/* قسم الإضافة */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">التاريخ (Date)</label>
            <input
              type="date"
              value={newExpense.expense_date}
              onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
              className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">المبلغ (₪)</label>
            <input
              type="number"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
              className="w-full border p-3 rounded-lg text-left dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              dir="ltr"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">وصف المصروف (Description)</label>
            <input
              type="text"
              value={newExpense.description}
              onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
              className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="مثال: شراء بن، فاتورة كهرباء..."
            />
          </div>
          <div className="md:col-span-1">
            <button
              onClick={handleAddExpense}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all shadow-md"
            >
              تسجيل مصروف
            </button>
          </div>
        </div>
      </div>

      {/* جدول العرض */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <table className="w-full text-right">
          <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">التاريخ</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">البيان / الوصف</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">المبلغ</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200 text-center">الإجراء</th>
            </tr>
          </thead>
          {/* تصحيح ألوان الخلفية لجسم الجدول والصفوف هنا */}
          <tbody className="bg-white dark:bg-gray-800">
            {expenses.map(expense => (
              <tr key={expense.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="p-4 text-gray-600 dark:text-gray-400" dir="ltr">{expense.expense_date}</td>
                <td className="p-4 font-bold text-gray-800 dark:text-gray-100">{expense.description}</td>
                <td className="p-4 font-bold text-red-600 dark:text-red-400">₪{expense.amount}</td>
                <td className="p-4 text-center">
                  <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-500 dark:text-red-400 font-bold hover:underline">حذف</button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">لا توجد مصروفات مسجلة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Expenses;