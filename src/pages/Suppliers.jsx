import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [currentSupplier, setCurrentSupplier] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [amountData, setAmountData] = useState({ amount: '', notes: '' });

  const fetchSuppliers = () => {
    axios.get('/suppliers')
      .then(res => setSuppliers(res.data))
      .catch(err => console.error("Error fetching suppliers:", err));
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const apiCall = currentSupplier 
      ? axios.put(`/suppliers/${currentSupplier.id}`, formData)
      : axios.post('/suppliers', formData);

    apiCall.then(() => {
      fetchSuppliers();
      closeAllModals();
    }).catch(err => alert(err.response?.data?.message || "حدث خطأ"));
  };

  const handleDebtSubmit = (e) => {
    e.preventDefault();
    if (!amountData.amount || amountData.amount <= 0) return alert('أدخل مبلغاً صحيحاً');
    
    axios.post(`/suppliers/${currentSupplier.id}/add-debt`, amountData)
      .then(() => {
        fetchSuppliers();
        closeAllModals();
        alert('تم إضافة الدين (فاتورة المشتريات) بنجاح');
      }).catch(err => alert(err.response?.data?.message || "حدث خطأ"));
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    if (!amountData.amount || amountData.amount <= 0) return alert('أدخل مبلغاً صحيحاً');
    
    axios.post(`/suppliers/${currentSupplier.id}/pay`, amountData)
      .then(() => {
        fetchSuppliers();
        closeAllModals();
        alert('تم تسجيل الدفعة للمورد بنجاح');
      }).catch(err => alert(err.response?.data?.message || "حدث خطأ"));
  };

  const openHistory = (supplier) => {
    setCurrentSupplier(supplier);
    axios.get(`/suppliers/${supplier.id}/transactions`)
      .then(res => {
        setTransactions(res.data);
        setIsHistoryModalOpen(true);
      }).catch(err => alert("حدث خطأ في جلب كشف الحساب"));
  };

  const deleteSupplier = (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
    axios.delete(`/suppliers/${id}`)
      .then(() => {
        alert('تم الحذف بنجاح');
        fetchSuppliers();
      }).catch(err => alert(err.response?.data?.message || "حدث خطأ أثناء الحذف"));
  };

  const exportSuppliersToExcel = () => {
    const dataToExport = suppliers.map(sup => ({
      'رقم المورد': sup.id,
      'الاسم': sup.name,
      'الجوال': sup.phone || 'غير متوفر',
      'الدين المستحق (شيكل)': parseFloat(sup.total_debt).toFixed(2),
      'تاريخ الإضافة': new Date(sup.created_at).toLocaleDateString('ar-EG')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ديون الموردين");
    
    XLSX.writeFile(workbook, `ديون_الموردين_والتجار_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const printAllSuppliers = () => {
    const printContent = `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: white; color: black;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">السلام كافي</h1>
          <h2 style="margin: 5px 0 0 0; font-size: 18px;">كشف إجمالي ديون الموردين والتجار</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">التاريخ: ${new Date().toLocaleString('ar-EG')}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: right;" border="1">
          <thead style="background-color: #f3f4f6;">
            <tr>
              <th style="padding: 10px; border: 1px solid #000;">الرقم</th>
              <th style="padding: 10px; border: 1px solid #000;">اسم التاجر</th>
              <th style="padding: 10px; border: 1px solid #000;">رقم الجوال</th>
              <th style="padding: 10px; border: 1px solid #000; text-align: left;">إجمالي الدين</th>
            </tr>
          </thead>
          <tbody>
            ${suppliers.map(sup => `
              <tr>
                <td style="padding: 10px; border: 1px solid #000;">#${sup.id}</td>
                <td style="padding: 10px; border: 1px solid #000; font-weight: bold;">${sup.name}</td>
                <td style="padding: 10px; border: 1px solid #000;" dir="ltr">${sup.phone || '-'}</td>
                <td style="padding: 10px; border: 1px solid #000; text-align: left; font-weight: bold; color: #dc2626;">₪${parseFloat(sup.total_debt).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px; border: 1px solid #000; font-weight: bold; text-align: left;">الإجمالي الكلي للديون:</td>
              <td style="padding: 10px; border: 1px solid #000; font-weight: bold; text-align: left; color: #dc2626;">₪${totalMarketDebts.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>طباعة ديون الموردين</title></head><body style="background-color: white;">');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // الدالة الجديدة المخصصة لطباعة كشف حساب مورد محدد على ورقة A4
  const printSupplierHistory = () => {
    const printContent = `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: white; color: black;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px;">السلام كافي</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px;">كشف حساب مورد / تاجر</h2>
          <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 16px; font-weight: bold; border-top: 1px solid #ccc; padding-top: 10px;">
            <span>التاجر: ${currentSupplier.name}</span>
            <span>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</span>
            <span>إجمالي الدين المستحق: ₪${parseFloat(currentSupplier.total_debt).toFixed(2)}</span>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 14px;" border="1">
          <thead style="background-color: #e5e7eb;">
            <tr>
              <th style="padding: 12px; border: 1px solid #000;">التاريخ</th>
              <th style="padding: 12px; border: 1px solid #000;">الحركة</th>
              <th style="padding: 12px; border: 1px solid #000;">البيان</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: left;">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td style="padding: 12px; border: 1px solid #000; font-family: monospace;">${t.date}</td>
                <td style="padding: 12px; border: 1px solid #000; font-weight: bold; color: ${t.is_payment ? '#15803d' : '#b91c1c'};">${t.type}</td>
                <td style="padding: 12px; border: 1px solid #000; font-weight: bold;">${t.notes}</td>
                <td style="padding: 12px; border: 1px solid #000; text-align: left; font-weight: bold; color: ${t.is_payment ? '#15803d' : '#b91c1c'};">${t.is_payment ? '-' : '+'} ₪${t.amount}</td>
              </tr>
            `).join('')}
            ${transactions.length === 0 ? `<tr><td colspan="4" style="padding: 20px; text-align: center; font-weight: bold; border: 1px solid #000;">لا توجد حركات مالية مسجلة</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>كشف حساب - '+ currentSupplier.name +'</title></head><body style="margin:0; padding:0; background-color: white;">');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const closeAllModals = () => {
    setIsAddModalOpen(false);
    setIsDebtModalOpen(false);
    setIsPayModalOpen(false);
    setIsHistoryModalOpen(false);
    setCurrentSupplier(null);
    setFormData({ name: '', phone: '' });
    setAmountData({ amount: '', notes: '' });
  };

  const totalMarketDebts = suppliers.reduce((sum, sup) => sum + parseFloat(sup.total_debt), 0);

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">إدارة الموردين والتجار</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold">
            إجمالي الديون المستحقة علينا للسوق: <span className="text-red-500 text-xl">₪{totalMarketDebts.toFixed(2)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={printAllSuppliers} 
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
          >
            طباعة الكل 🖨️
          </button>
          <button 
            onClick={exportSuppliersToExcel} 
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
          >
            تصدير إكسيل 📊
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition-colors"
          >
            + إضافة مورد جديد
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right text-gray-700 dark:text-gray-300 min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-4 font-bold text-gray-800 dark:text-gray-200">الرقم</th>
                <th className="p-4 font-bold text-gray-800 dark:text-gray-200">اسم المورد / التاجر</th>
                <th className="p-4 font-bold text-gray-800 dark:text-gray-200">الجوال</th>
                <th className="p-4 font-bold text-gray-800 dark:text-gray-200">إجمالي الدين (له)</th>
                <th className="p-4 font-bold text-gray-800 dark:text-gray-200 text-center sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 shadow-[1px_0_5px_rgba(0,0,0,0.1)]">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(sup => (
                <tr key={sup.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="p-4 font-mono font-bold text-gray-500">#{sup.id}</td>
                  <td className="p-4 font-bold">{sup.name}</td>
                  <td className="p-4 font-mono text-sm" dir="ltr">{sup.phone || '-'}</td>
                  <td className="p-4 font-bold text-red-600 dark:text-red-400">₪{parseFloat(sup.total_debt).toFixed(2)}</td>
                  <td className="p-4 text-center sticky left-0 bg-white dark:bg-gray-800 z-10 shadow-[1px_0_5px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setCurrentSupplier(sup); setIsDebtModalOpen(true); }} className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded font-bold text-sm">
                        + شراء (إضافة دين)
                      </button>
                      <button onClick={() => { setCurrentSupplier(sup); setIsPayModalOpen(true); }} className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded font-bold text-sm">
                        تنزيل دفعة 💸
                      </button>
                      <button onClick={() => openHistory(sup)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded font-bold text-sm">
                        كشف حساب 📜
                      </button>
                      <button onClick={() => { setCurrentSupplier(sup); setFormData({name: sup.name, phone: sup.phone}); setIsAddModalOpen(true); }} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded font-bold text-sm dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                        تعديل ✏️
                      </button>
                      <button onClick={() => deleteSupplier(sup.id)} className="text-red-500 hover:text-red-700 px-2 font-bold text-xl">
                        &times;
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500 font-bold text-lg">لا يوجد موردين مسجلين حالياً</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة إضافة/تعديل مورد */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              {currentSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
            </h2>
            <form onSubmit={handleAddSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم التاجر / المورد *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الجوال</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500" dir="ltr" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeAllModals} className="px-5 py-2.5 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700">حفظ المورد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة دين (شراء بضاعة) */}
      {isDebtModalOpen && currentSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border-t-4 border-red-500">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">إضافة فاتورة مشتريات (دين)</h2>
            <p className="text-gray-500 mb-6 font-bold">المورد: {currentSupplier.name}</p>
            <form onSubmit={handleDebtSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">قيمة الفاتورة المضافة (₪) *</label>
                <input type="number" step="0.01" required value={amountData.amount} onChange={e => setAmountData({...amountData, amount: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-red-500" dir="ltr" autoFocus />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">البيان / ملاحظات التفاصيل</label>
                <input type="text" placeholder="مثال: فاتورة بن وأكواب ورقية" value={amountData.notes} onChange={e => setAmountData({...amountData, notes: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-red-500" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeAllModals} className="px-5 py-2.5 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg font-bold bg-red-600 text-white hover:bg-red-700">تأكيد الدين</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تسديد دفعة للمورد */}
      {isPayModalOpen && currentSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border-t-4 border-green-500">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">تسديد دفعة للمورد</h2>
            <p className="text-gray-500 mb-6 font-bold">المورد: {currentSupplier.name} | الدين الحالي: ₪{currentSupplier.total_debt}</p>
            <form onSubmit={handlePaySubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">المبلغ المسدد (₪) *</label>
                <input type="number" step="0.01" required value={amountData.amount} onChange={e => setAmountData({...amountData, amount: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-green-500" dir="ltr" autoFocus />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم السند / ملاحظات</label>
                <input type="text" placeholder="مثال: دفعة نقدية أو تحويل بنكي" value={amountData.notes} onChange={e => setAmountData({...amountData, notes: e.target.value})} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-green-500" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeAllModals} className="px-5 py-2.5 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700">تأكيد الدفع</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة معاينة كشف الحساب داخل الموقع */}
      {isHistoryModalOpen && currentSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">كشف حساب المورد</h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold mt-1">التاجر: {currentSupplier.name} | الدين المتبقي له: <span className="text-red-500">₪{currentSupplier.total_debt}</span></p>
              </div>
              <button onClick={closeAllModals} className="text-gray-500 hover:text-red-500 text-3xl font-bold leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-200 dark:bg-gray-700 sticky top-0 shadow-sm">
                  <tr>
                    <th className="p-3 font-bold text-gray-700 dark:text-gray-200">التاريخ</th>
                    <th className="p-3 font-bold text-gray-700 dark:text-gray-200">الحركة</th>
                    <th className="p-3 font-bold text-gray-700 dark:text-gray-200">البيان</th>
                    <th className="p-3 font-bold text-gray-700 dark:text-gray-200 text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {transactions.map(t => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="p-3 font-mono text-gray-600 dark:text-gray-400">{t.date}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.is_payment ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{t.notes}</td>
                      <td className={`p-3 font-bold text-left ${t.is_payment ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {t.is_payment ? '-' : '+'} ₪{t.amount}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan="4" className="p-6 text-center text-gray-500 font-bold">لا توجد حركات مالية مسجلة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0 bg-white dark:bg-gray-800 rounded-b-xl">
              <button onClick={printSupplierHistory} className="px-5 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 ml-3 shadow-md">طباعة الكشف (A4) 🖨️</button>
              <button onClick={closeAllModals} className="px-5 py-2 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Suppliers;