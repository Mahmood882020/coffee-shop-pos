import { useState, useEffect } from 'react';
import axios from 'axios';

function Debts() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // حالة النافذة الجديدة لإضافة زبون ودين في خطوة واحدة
  const [newDebtModal, setNewDebtModal] = useState({
    isOpen: false,
    name: '',
    phone: '',
    amount: '',
    notes: ''
  });

  const fetchCustomers = () => {
    axios.get('/customers-admin')
      .then(res => setCustomers(res.data))
      .catch(err => console.error("Error fetching customers:", err));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handlePayment = (id, name) => {
    const amount = window.prompt(`أدخل المبلغ المراد تسديده من دين الزبون: ${name}`);
    if (!amount || isNaN(amount) || amount <= 0) return;

    axios.post(`/customers/${id}/pay`, { amount })
      .then(res => {
        alert(res.data.message);
        fetchCustomers();
      })
      .catch(err => alert('حدث خطأ أثناء تسجيل الدفعة'));
  };

  const handleAddDebt = (id, name) => {
    const amountStr = window.prompt(`أدخل مبلغ الدين السابق/الجديد للزبون: ${name}\nسيتم إضافة هذا المبلغ إلى رصيد ديونه فوراً.`);
    if (!amountStr || isNaN(amountStr) || amountStr <= 0) return;
    
    const amount = parseFloat(amountStr);
    const notes = window.prompt('أدخل بياناً أو ملاحظة لهذا الدين (مثال: دين قديم من الدفتر):', 'دين سابق (Previous Debt)') || 'دين يدوي';

    axios.post(`/customers/${id}/add-debt`, { amount, notes })
      .then(res => {
        alert(res.data.message);
        fetchCustomers();
      })
      .catch(err => {
        const errorMsg = err.response?.data?.error || err.response?.data?.message || 'حدث خطأ أثناء تسجيل الدين';
        alert(errorMsg);
      });
  };

  // دالة إنشاء زبون وإضافة دينه مباشرة
  const handleCreateCustomerWithDebt = async () => {
    if (!newDebtModal.name.trim()) return alert('يرجى إدخال اسم الزبون');

    try {
      // 1. إنشاء الزبون
      const custRes = await axios.post('/customers', {
        name: newDebtModal.name,
        phone: newDebtModal.phone
      });

      // استخراج الـ ID الخاص بالزبون الجديد
      const newCustomerId = custRes.data.customer?.id || custRes.data.id;

      // 2. إذا كان هناك مبلغ دين، نقوم بتسجيله فوراً للزبون الجديد
      if (newCustomerId && newDebtModal.amount && parseFloat(newDebtModal.amount) > 0) {
        await axios.post(`/customers/${newCustomerId}/add-debt`, {
          amount: parseFloat(newDebtModal.amount),
          notes: newDebtModal.notes || 'رصيد افتتاحي من الدفتر القديم'
        });
      }

      alert('تم إضافة الزبون وتحديث رصيده بنجاح');
      fetchCustomers();
      setNewDebtModal({ isOpen: false, name: '', phone: '', amount: '', notes: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء العملية');
    }
  };

  const openStatement = async (customer) => {
    setSelectedCustomer(customer);
    try {
      const res = await axios.get(`/customers/${customer.id}/transactions`);
      setTransactions(res.data);
      setShowStatementModal(true);
    } catch (err) {
      alert('خطأ في جلب تفاصيل الحساب');
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.includes(searchTerm) || (c.phone && c.phone.includes(searchTerm));
    const balance = parseFloat(c.debt_balance);
    const matchesBalance = showZeroBalances ? true : balance !== 0;
    return matchesSearch && matchesBalance;
  });
  
  const totalDebts = customers.reduce((sum, c) => parseFloat(c.debt_balance) > 0 ? sum + parseFloat(c.debt_balance) : sum, 0);

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">إدارة الديون والأرصدة (Debts)</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <button 
            onClick={() => setNewDebtModal({ ...newDebtModal, isOpen: true })} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
          >
            + إضافة زبون ودين
          </button>
          <div className="bg-red-100 text-red-700 px-6 py-3 rounded-lg font-bold text-xl dark:bg-red-900/50 dark:text-red-400 dark:border dark:border-red-800">
            إجمالي ديون السوق: ₪{totalDebts.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mb-6 w-full flex flex-col md:flex-row gap-4 items-center">
        <input 
          type="text" 
          placeholder="بحث عن زبون..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/3 border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
        <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 font-bold select-none bg-white dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-750">
          <input 
            type="checkbox" 
            checked={showZeroBalances}
            onChange={(e) => setShowZeroBalances(e.target.checked)}
            className="w-5 h-5 rounded cursor-pointer accent-blue-600"
          />
          عرض الحسابات المصفّرة (0.00₪)
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <table className="w-full text-right">
          <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الزبون</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">رقم الهاتف</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">حالة الرصيد</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {filteredCustomers.map(customer => {
              const balance = parseFloat(customer.debt_balance);
              return (
                <tr key={customer.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="p-4 font-bold text-gray-800 dark:text-gray-100">{customer.name}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">{customer.phone}</td>
                  <td className="p-4 font-bold text-xl">
                    {balance > 0 ? (
                      <span className="text-red-600 dark:text-red-400">عليه: ₪{balance.toFixed(2)}</span>
                    ) : balance < 0 ? (
                      <span className="text-green-600 dark:text-green-400">له: ₪{Math.abs(balance).toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-500">مصفّر: ₪0.00</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleAddDebt(customer.id, customer.name)} 
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-200 dark:bg-red-900/60 dark:text-red-300 dark:hover:bg-red-900 ml-2 transition-colors border border-transparent dark:border-red-800"
                    >
                      تسجيل دين
                    </button>
                    <button 
                      onClick={() => handlePayment(customer.id, customer.name)} 
                      className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold hover:bg-green-200 dark:bg-green-900/60 dark:text-green-300 dark:hover:bg-green-900 ml-2 transition-colors border border-transparent dark:border-green-800"
                    >
                      تسديد دفعة
                    </button>
                    <button 
                      onClick={() => openStatement(customer)} 
                      className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 dark:bg-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors border border-transparent dark:border-blue-800"
                    >
                      كشف حساب
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">لا توجد ديون أو أرصدة مطابقة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* نافذة إضافة زبون ودين جديد */}
      {newDebtModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 border-b pb-4 dark:border-gray-700">
              إنشاء زبون وتسجيل دينه
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم الزبون *</label>
                <input 
                  type="text" 
                  value={newDebtModal.name}
                  onChange={e => setNewDebtModal({...newDebtModal, name: e.target.value})}
                  className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="محمد أحمد"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف (اختياري)</label>
                <input 
                  type="text" 
                  value={newDebtModal.phone}
                  onChange={e => setNewDebtModal({...newDebtModal, phone: e.target.value})}
                  className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                  dir="ltr"
                  placeholder="0590000000"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">مبلغ الدين القديم (اختياري)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newDebtModal.amount}
                  onChange={e => setNewDebtModal({...newDebtModal, amount: e.target.value})}
                  className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                  dir="ltr"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ملاحظات / تفاصيل (اختياري)</label>
                <input 
                  type="text" 
                  value={newDebtModal.notes}
                  onChange={e => setNewDebtModal({...newDebtModal, notes: e.target.value})}
                  className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="رصيد من الدفتر القديم"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t dark:border-gray-700">
              <button 
                onClick={() => setNewDebtModal({ isOpen: false, name: '', phone: '', amount: '', notes: '' })} 
                className="px-6 py-2.5 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                إلغاء
              </button>
              <button 
                onClick={handleCreateCustomerWithDebt} 
                className="px-6 py-2.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md"
              >
                تأكيد وحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة كشف الحساب */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-xl">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                كشف حساب: {selectedCustomer?.name}
              </h2>
              <button onClick={() => setShowStatementModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-3xl font-bold leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="pb-3 text-gray-600 dark:text-gray-300 font-bold">التاريخ</th>
                    <th className="pb-3 text-gray-600 dark:text-gray-300 font-bold">البيان</th>
                    <th className="pb-3 text-gray-600 dark:text-gray-300 font-bold">التفاصيل</th>
                    <th className="pb-3 text-gray-600 dark:text-gray-300 font-bold">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-400" dir="ltr">{t.date}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${t.is_payment ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800' : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-700 dark:text-gray-300">{t.notes}</td>
                      <td className={`py-3 font-bold ${t.is_payment ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {t.is_payment ? '-' : '+'}₪{t.amount}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-6 text-gray-500 dark:text-gray-400">لا توجد حركات مسجلة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl flex justify-between items-center">
              <span className="font-bold text-gray-700 dark:text-gray-300">الرصيد النهائي:</span>
              <span className={`text-2xl font-bold ${parseFloat(selectedCustomer?.debt_balance) > 0 ? 'text-red-600 dark:text-red-400' : parseFloat(selectedCustomer?.debt_balance) < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                {parseFloat(selectedCustomer?.debt_balance) > 0 
                  ? `عليه: ₪${parseFloat(selectedCustomer?.debt_balance).toFixed(2)}` 
                  : parseFloat(selectedCustomer?.debt_balance) < 0 
                  ? `له: ₪${Math.abs(parseFloat(selectedCustomer?.debt_balance)).toFixed(2)}`
                  : `مصفّر: ₪0.00`
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Debts;