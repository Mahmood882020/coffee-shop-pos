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

  // --- دالة الطباعة المخصصة لتقرير الديون (الديون العامة) ---
  const printDebtsReport = () => {
    const tableRows = filteredCustomers.map(c => {
      const balance = parseFloat(c.debt_balance);
      let balanceText = '';
      let balanceColor = '';
      
      if (balance > 0) {
        balanceText = `عليه ₪${balance.toFixed(2)}`;
        balanceColor = '#dc2626'; // أحمر
      } else if (balance < 0) {
        balanceText = `له ₪${Math.abs(balance).toFixed(2)}`;
        balanceColor = '#16a34a'; // أخضر
      } else {
        balanceText = 'مصفّر: ₪0.00';
        balanceColor = '#6b7280'; // رمادي
      }

      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${c.name}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;" dir="ltr">${c.phone || '-'}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${balanceColor};" dir="ltr">
            ${balanceText}
          </td>
        </tr>
      `;
    }).join('');

    const printContent = `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: white; color: black;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px;">السلام كافي</h1>
          <h2 style="margin: 8px 0 0 0; font-size: 20px; color: #444;">تقرير ذمم الزبائن (الديون)</h2>
          <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
            <span>تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}</span>
            <span style="font-weight: bold; color: #dc2626; font-size: 16px;">إجمالي ديون السوق: ₪${totalDebts.toFixed(2)}</span>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;" border="1">
          <thead style="background-color: #f3f4f6;">
            <tr>
              <th style="padding: 12px; border: 1px solid #000; text-align: right; width: 40%;">الزبون</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: right; width: 30%;">رقم الهاتف</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: center; width: 30%;">الرصيد (₪)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="3" style="padding: 20px; text-align: center;">لا يوجد زبائن مطابقين للبحث</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>طباعة تقرير الديون</title></head><body style="margin:0; padding:0; background-color: white;">');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // --- دالة الطباعة المخصصة لكشف حساب زبون معين ---
  const printStatementReport = () => {
    const tableRows = transactions.map(t => {
      const amountText = `${t.is_payment ? '-' : '+'} ₪${t.amount}`;
      const amountColor = t.is_payment ? '#16a34a' : '#dc2626';

      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;" dir="ltr">${t.date}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${t.type}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${t.notes}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${amountColor};" dir="ltr">
            ${amountText}
          </td>
        </tr>
      `;
    }).join('');

    const balanceValue = parseFloat(selectedCustomer?.debt_balance || 0);
    let balanceText = '';
    if (balanceValue > 0) {
      balanceText = `عليه ₪${balanceValue.toFixed(2)}`;
    } else if (balanceValue < 0) {
      balanceText = `له ₪${Math.abs(balanceValue).toFixed(2)}`;
    } else {
      balanceText = 'مصفّر';
    }

    const printContent = `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: white; color: black;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px;">السلام كافي</h1>
          <h2 style="margin: 8px 0 0 0; font-size: 20px; color: #444;">كشف حساب زبون</h2>
          <p style="margin: 10px 0; font-size: 18px; font-weight: bold;">الاسم: ${selectedCustomer?.name}</p>
          <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
            <span>تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}</span>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;" border="1">
          <thead style="background-color: #f3f4f6;">
            <tr>
              <th style="padding: 12px; border: 1px solid #000; text-align: right;">التاريخ</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: right;">البيان</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: right;">التفاصيل</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: center;">المبلغ (₪)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="4" style="padding: 20px; text-align: center;">لا توجد حركات مسجلة لهذا الزبون.</td></tr>'}
          </tbody>
        </table>
        <div style="margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; font-size: 18px; font-weight: bold;">
          الرصيد النهائي: ${balanceText}
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>طباعة كشف حساب</title></head><body style="margin:0; padding:0; background-color: white;">');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="p-3 lg:p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      
      <div className="print:hidden">
        <div className="flex justify-between items-center mb-6 lg:mb-8 flex-wrap gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">إدارة الديون والأرصدة</h1>
          
          <div className="flex items-center gap-2 lg:gap-3 flex-wrap w-full lg:w-auto">
            <button onClick={downloadSystemBackup} className="flex-1 lg:flex-none bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 lg:px-4 rounded-lg transition-colors shadow-md text-sm lg:text-base text-center">
              نسخة احتياطية 💾
            </button>
            <button onClick={exportDebtsToExcel} className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 lg:px-4 rounded-lg transition-colors shadow-md text-sm lg:text-base text-center">
              تصدير Excel 📊
            </button>
            <button onClick={printDebtsReport} className="flex-1 lg:flex-none bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 text-white font-bold py-2 px-3 lg:px-4 rounded-lg transition-colors shadow-md text-sm lg:text-base text-center">
              طباعة PDF 🖨️
            </button>
            <button onClick={() => setNewDebtModal({ ...newDebtModal, isOpen: true })} className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md text-sm lg:text-base text-center mt-2 lg:mt-0">
              + إضافة زبون ودين
            </button>
          </div>
        </div>

        <div className="mb-6 w-full flex flex-col lg:flex-row gap-4 items-center">
          <input 
            type="text" 
            placeholder="بحث عن زبون..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full lg:w-1/3 border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
          />
          <label className="flex items-center justify-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 w-full lg:w-auto text-sm lg:text-base">
            <input 
              type="checkbox" 
              checked={showZeroBalances}
              onChange={(e) => setShowZeroBalances(e.target.checked)}
              className="w-5 h-5 rounded cursor-pointer accent-blue-600 shrink-0"
            />
            عرض الحسابات المصفّرة (0.00₪)
          </label>
          <div className="lg:mr-auto bg-red-100 text-red-700 px-6 py-3 rounded-lg font-bold text-lg lg:text-xl dark:bg-red-900/50 dark:text-red-400 w-full lg:w-auto text-center">
            إجمالي ديون السوق: ₪{totalDebts.toFixed(2)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="w-full overflow-x-auto pb-2">
            <table className="w-full text-right min-w-max">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="p-3 lg:p-4 font-bold text-gray-700 dark:text-gray-200">الزبون</th>
                  <th className="p-3 lg:p-4 font-bold text-gray-700 dark:text-gray-200">رقم الهاتف</th>
                  <th className="p-3 lg:p-4 font-bold text-gray-700 dark:text-gray-200">حالة الرصيد</th>
                  <th className="p-3 lg:p-4 font-bold text-gray-700 dark:text-gray-200 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {filteredCustomers.map(customer => {
                  const balance = parseFloat(customer.debt_balance);
                  return (
                    <tr key={customer.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="p-3 lg:p-4 font-bold text-gray-800 dark:text-gray-100">{customer.name}</td>
                      <td className="p-3 lg:p-4 text-gray-600 dark:text-gray-300">{customer.phone || '-'}</td>
                      <td className="p-3 lg:p-4 font-bold text-lg lg:text-xl">
                        {balance > 0 ? (
                          <span className="text-red-600 dark:text-red-400">عليه: ₪{balance.toFixed(2)}</span>
                        ) : balance < 0 ? (
                          <span className="text-green-600 dark:text-green-400">له: ₪{Math.abs(balance).toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-500">مصفّر: ₪0.00</span>
                        )}
                      </td>
                      <td className="p-3 lg:p-4 align-middle">
                        <div className="flex flex-col sm:flex-row justify-center gap-2">
                          <button onClick={() => handleAddDebt(customer.id, customer.name)} className="bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-200 dark:bg-red-900/60 transition-colors shadow-sm w-full sm:w-auto text-xs lg:text-sm">
                            تسجيل دين
                          </button>
                          <button onClick={() => handlePayment(customer.id, customer.name)} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg font-bold hover:bg-green-200 dark:bg-green-900/60 transition-colors shadow-sm w-full sm:w-auto text-xs lg:text-sm">
                            تسديد دفعة
                          </button>
                          <button onClick={() => openStatement(customer)} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg font-bold hover:bg-blue-200 dark:bg-blue-900/60 transition-colors shadow-sm w-full sm:w-auto text-xs lg:text-sm">
                            كشف حساب
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500 font-bold text-lg dark:text-gray-400">
                      لا يوجد زبائن مطابقين للبحث.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showStatementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 lg:p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-xl">
              <h2 className="text-lg lg:text-2xl font-bold text-gray-800 dark:text-white">كشف حساب: {selectedCustomer?.name}</h2>
              <div className="flex gap-2 items-center">
                <button onClick={exportStatementToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs lg:text-sm">Excel</button>
                <button onClick={printStatementReport} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 px-3 rounded-lg text-xs lg:text-sm">PDF</button>
                <button onClick={() => setShowStatementModal(false)} className="text-gray-500 hover:text-red-500 text-2xl lg:text-3xl font-bold leading-none mr-2">&times;</button>
              </div>
            </div>
            
            <div className="p-4 lg:p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-max">
                  <thead>
                    <tr className="border-b-2 dark:border-gray-700">
                      <th className="pb-3 px-2 text-gray-600 dark:text-gray-300 font-bold">التاريخ</th>
                      <th className="pb-3 px-2 text-gray-600 dark:text-gray-300 font-bold">البيان</th>
                      <th className="pb-3 px-2 text-gray-600 dark:text-gray-300 font-bold">التفاصيل</th>
                      <th className="pb-3 px-2 text-gray-600 dark:text-gray-300 font-bold">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="py-3 px-2 text-xs lg:text-sm text-gray-600 dark:text-gray-400" dir="ltr">{t.date}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${t.is_payment ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs lg:text-sm text-gray-700 dark:text-gray-300">{t.notes}</td>
                        <td className={`py-3 px-2 font-bold text-sm lg:text-base ${t.is_payment ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {t.is_payment ? '-' : '+'}₪{t.amount}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-6 text-center text-gray-500 font-bold text-sm lg:text-lg dark:text-gray-400">
                          لا توجد حركات مسجلة لهذا الزبون.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {newDebtModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-white mb-6">إنشاء زبون وتسجيل دينه</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم الزبون *</label>
                <input type="text" value={newDebtModal.name} onChange={e => setNewDebtModal({...newDebtModal, name: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف (اختياري)</label>
                <input type="text" value={newDebtModal.phone} onChange={e => setNewDebtModal({...newDebtModal, phone: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">مبلغ الدين (اختياري)</label>
                <input type="number" step="0.01" value={newDebtModal.amount} onChange={e => setNewDebtModal({...newDebtModal, amount: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setNewDebtModal({ isOpen: false, name: '', phone: '', amount: '', notes: '' })} className="px-6 py-2.5 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">إلغاء</button>
              <button onClick={handleCreateCustomerWithDebt} className="px-6 py-2.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md">تأكيد وحفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Debts;