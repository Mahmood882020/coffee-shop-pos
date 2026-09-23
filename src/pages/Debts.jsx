import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

function Debts() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [newDebtModal, setNewDebtModal] = useState({
    isOpen: false, name: '', phone: '', amount: '', notes: ''
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
    const notes = window.prompt('أدخل بياناً أو ملاحظة لهذا الدين:', 'دين سابق') || 'دين يدوي';

    axios.post(`/customers/${id}/add-debt`, { amount, notes })
      .then(res => {
        alert(res.data.message);
        fetchCustomers();
      })
      .catch(err => alert(err.response?.data?.error || 'حدث خطأ أثناء تسجيل الدين'));
  };

  const handleCreateCustomerWithDebt = async () => {
    if (!newDebtModal.name.trim()) return alert('يرجى إدخال اسم الزبون');
    try {
      const custRes = await axios.post('/customers', { name: newDebtModal.name, phone: newDebtModal.phone });
      const newCustomerId = custRes.data.customer?.id || custRes.data.id;
      if (newCustomerId && newDebtModal.amount && parseFloat(newDebtModal.amount) > 0) {
        await axios.post(`/customers/${newCustomerId}/add-debt`, {
          amount: parseFloat(newDebtModal.amount),
          notes: newDebtModal.notes || 'رصيد افتتاحي'
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

  // --- دوال التصدير والنسخ الاحتياطي ---

  const exportDebtsToExcel = () => {
    const data = filteredCustomers.map(c => ({
      'الزبون': c.name,
      'رقم الهاتف': c.phone || 'غير مدرج',
      'حالة الرصيد': parseFloat(c.debt_balance) > 0 ? 'عليه دين' : parseFloat(c.debt_balance) < 0 ? 'له رصيد' : 'مصفّر',
      'المبلغ (₪)': Math.abs(parseFloat(c.debt_balance))
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الديون");
    XLSX.writeFile(wb, "Debts_Report.xlsx");
  };

  const exportStatementToExcel = () => {
    const data = transactions.map(t => ({
      'التاريخ': t.date,
      'البيان': t.type,
      'التفاصيل': t.notes,
      'المبلغ (₪)': t.amount,
      'الحركة': t.is_payment ? 'تسديد (خصم)' : 'دين (إضافة)'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `كشف حساب - ${selectedCustomer?.name}`);
    XLSX.writeFile(wb, `Statement_${selectedCustomer?.name}.xlsx`);
  };

  const downloadSystemBackup = async () => {
    try {
      const response = await axios.get('/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `System_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('حدث خطأ أثناء تحميل النسخة الاحتياطية. تأكد من توافر الصلاحيات واتصال الخادم.');
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
      
      {/* واجهة الشاشة الرئيسية (تختفي عند الطباعة) */}
      <div className="print:hidden">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">إدارة الديون والأرصدة (Debts)</h1>
          
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={downloadSystemBackup} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md">
              نسخة احتياطية 💾
            </button>
            <button onClick={exportDebtsToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md">
              تصدير Excel 📊
            </button>
            <button onClick={() => window.print()} className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md">
              طباعة PDF 🖨️
            </button>
            <button onClick={() => setNewDebtModal({ ...newDebtModal, isOpen: true })} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md">
              + إضافة زبون ودين
            </button>
          </div>
        </div>

        <div className="mb-6 w-full flex flex-col md:flex-row gap-4 items-center">
          <input 
            type="text" 
            placeholder="بحث عن زبون..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-1/3 border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <input 
              type="checkbox" 
              checked={showZeroBalances}
              onChange={(e) => setShowZeroBalances(e.target.checked)}
              className="w-5 h-5 rounded cursor-pointer accent-blue-600"
            />
            عرض الحسابات المصفّرة (0.00₪)
          </label>
          <div className="mr-auto bg-red-100 text-red-700 px-6 py-3 rounded-lg font-bold text-xl dark:bg-red-900/50 dark:text-red-400">
            إجمالي ديون السوق: ₪{totalDebts.toFixed(2)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                  <tr key={customer.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-100">{customer.name}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{customer.phone}</td>
                    <td className="p-4 font-bold text-xl">
                      {balance > 0 ? (
                        <span className="text-red-600 dark:text-red-400">عليه: ₪{balance.toFixed(2)}</span>
                      ) : balance < 0 ? (
                        <span className="text-green-600 dark:text-green-400">له: ₪{Math.abs(balance).toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-500">مصفّر: ₪0.00</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleAddDebt(customer.id, customer.name)} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-200 dark:bg-red-900/60 ml-2">تسجيل دين</button>
                      <button onClick={() => handlePayment(customer.id, customer.name)} className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold hover:bg-green-200 dark:bg-green-900/60 ml-2">تسديد دفعة</button>
                      <button onClick={() => openStatement(customer)} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 dark:bg-blue-900/60">كشف حساب</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* نموذج طباعة سجل الديون العام (يظهر فقط عند الطباعة إذا لم تكن نافذة الكشف مفتوحة) */}
      {!showStatementModal && (
        <div className="hidden print:block font-sans text-black bg-white p-4" dir="rtl">
          <div className="text-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold">السلام كافي</h2>
            <h3 className="text-xl font-bold mt-3">تقرير ذمم الزبائن (الديون)</h3>
            <p className="text-xs text-gray-500 mt-1">تاريخ الاستخراج: {new Date().toLocaleString('ar-EG')}</p>
          </div>
          <table className="w-full text-right text-sm border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-right">الزبون</th>
                <th className="border border-gray-400 p-2 text-right">رقم الهاتف</th>
                <th className="border border-gray-400 p-2 text-center">الرصيد (₪)</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => (
                <tr key={c.id}>
                  <td className="border border-gray-400 p-2 font-bold">{c.name}</td>
                  <td className="border border-gray-400 p-2">{c.phone || '-'}</td>
                  <td className="border border-gray-400 p-2 text-center font-bold" dir="ltr">
                    {parseFloat(c.debt_balance) > 0 ? `عليه ${parseFloat(c.debt_balance).toFixed(2)}` : parseFloat(c.debt_balance) < 0 ? `له ${Math.abs(parseFloat(c.debt_balance)).toFixed(2)}` : '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-left font-bold">إجمالي ديون السوق: ₪{totalDebts.toFixed(2)}</div>
        </div>
      )}

      {/* نافذة كشف الحساب */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-xl">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">كشف حساب: {selectedCustomer?.name}</h2>
              <div className="flex gap-2">
                <button onClick={exportStatementToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded-lg text-sm">Excel</button>
                <button onClick={() => window.print()} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 px-3 rounded-lg text-sm">PDF</button>
                <button onClick={() => setShowStatementModal(false)} className="text-gray-500 hover:text-red-500 text-3xl font-bold leading-none mr-4">&times;</button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b-2 dark:border-gray-700">
                    <th className="pb-3 text-gray-600 dark:text-gray-300 font-bold">التاريخ</th>
                    <th className="pb-3 text-gray-600 dark:text-gray-300 font-bold">البيان</th>
                    <th className="pb-3 text-gray-600 dark:text-gray-300 font-bold">التفاصيل</th>
                    <th className="pb-3 text-gray-600 dark:text-gray-300 font-bold">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-400" dir="ltr">{t.date}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${t.is_payment ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-700 dark:text-gray-300">{t.notes}</td>
                      <td className={`py-3 font-bold ${t.is_payment ? 'text-green-600' : 'text-red-600'}`}>
                        {t.is_payment ? '-' : '+'}₪{t.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* نموذج طباعة كشف الحساب (يظهر فقط عند الطباعة إذا كانت نافذة الكشف مفتوحة) */}
      {showStatementModal && (
        <div className="hidden print:block font-sans text-black bg-white p-4" dir="rtl">
          <div className="text-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold">السلام كافي</h2>
            <h3 className="text-xl font-bold mt-3">كشف حساب زبون</h3>
            <p className="text-sm font-bold mt-2">الاسم: {selectedCustomer?.name}</p>
            <p className="text-xs text-gray-500 mt-1">تاريخ الاستخراج: {new Date().toLocaleString('ar-EG')}</p>
          </div>
          <table className="w-full text-right text-sm border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-right">التاريخ</th>
                <th className="border border-gray-400 p-2 text-right">البيان</th>
                <th className="border border-gray-400 p-2 text-right">التفاصيل</th>
                <th className="border border-gray-400 p-2 text-center">المبلغ (₪)</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td className="border border-gray-400 p-2" dir="ltr">{t.date}</td>
                  <td className="border border-gray-400 p-2">{t.type}</td>
                  <td className="border border-gray-400 p-2">{t.notes}</td>
                  <td className="border border-gray-400 p-2 text-center font-bold" dir="ltr">
                    {t.is_payment ? '-' : '+'} {t.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 font-bold border-t border-gray-400 pt-2">
            الرصيد النهائي: {parseFloat(selectedCustomer?.debt_balance) > 0 ? `عليه ₪${parseFloat(selectedCustomer?.debt_balance).toFixed(2)}` : `مصفّر`}
          </div>
        </div>
      )}

      {/* نافذة إضافة زبون ودين جديد */}
      {newDebtModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إنشاء زبون وتسجيل دينه</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم الزبون *</label>
                <input type="text" value={newDebtModal.name} onChange={e => setNewDebtModal({...newDebtModal, name: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:text-white" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف (اختياري)</label>
                <input type="text" value={newDebtModal.phone} onChange={e => setNewDebtModal({...newDebtModal, phone: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:text-white text-left" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">مبلغ الدين (اختياري)</label>
                <input type="number" step="0.01" value={newDebtModal.amount} onChange={e => setNewDebtModal({...newDebtModal, amount: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:text-white text-left" dir="ltr" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setNewDebtModal({ isOpen: false, name: '', phone: '', amount: '', notes: '' })} className="px-6 py-2.5 rounded-lg font-bold bg-gray-200 text-gray-700">إلغاء</button>
              <button onClick={handleCreateCustomerWithDebt} className="px-6 py-2.5 rounded-lg font-bold bg-blue-600 text-white">تأكيد وحفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Debts;