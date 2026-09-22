import { useState, useEffect } from 'react';
import axios from 'axios';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', credit_limit: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', phone: '', credit_limit: '' });

  const fetchCustomers = () => {
    axios.get('/customers-admin')
      .then(res => setCustomers(res.data))
      .catch(err => console.error("خطأ في جلب بيانات الزبائن:", err));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.credit_limit) {
      return alert('يرجى تعبئة كافة بيانات الزبون');
    }
    
    axios.post('/customers', newCustomer)
      .then(() => {
        setNewCustomer({ name: '', phone: '', credit_limit: '' });
        fetchCustomers();
      })
      .catch(err => alert('حدث خطأ أثناء الإضافة'));
  };

  const handleDeleteCustomer = (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الزبون؟')) return;
    
    axios.delete(`/customers/${id}`)
      .then(() => fetchCustomers())
      .catch(err => alert('لا يمكن حذف زبون لديه ديون أو طلبات سابقة'));
  };

  const handleEditClick = (customer) => {
    setEditingId(customer.id);
    setEditData({ name: customer.name, phone: customer.phone, credit_limit: customer.credit_limit });
  };

  const handleSaveEdit = (id) => {
    if (!editData.name || !editData.phone || !editData.credit_limit) return alert('البيانات غير مكتملة');
    
    axios.put(`/customers/${id}`, editData)
      .then(() => {
        setEditingId(null);
        fetchCustomers();
      })
      .catch(err => alert('حدث خطأ أثناء التعديل'));
  };

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">إدارة الزبائن (Customers)</h1>

      {/* قسم إضافة زبون جديد */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم الزبون</label>
            <input 
              type="text" 
              value={newCustomer.name} 
              onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} 
              className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الجوال</label>
            <input 
              type="text" 
              value={newCustomer.phone} 
              onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} 
              className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">سقف الدين (₪)</label>
            <input 
              type="number" 
              value={newCustomer.credit_limit} 
              onChange={(e) => setNewCustomer({...newCustomer, credit_limit: e.target.value})} 
              className="w-full border p-3 rounded-lg text-left dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              dir="ltr"
            />
          </div>
          <div className="md:col-span-1">
            <button 
              onClick={handleAddCustomer} 
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all shadow-md"
            >
              إضافة
            </button>
          </div>
        </div>
      </div>

      {/* جدول عرض الزبائن */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <table className="w-full text-right">
          <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الاسم</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الجوال</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">سقف الدين</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الإجراء</th>
            </tr>
          </thead>
          {/* تصحيح ألوان جسم الجدول هنا */}
          <tbody className="bg-white dark:bg-gray-800">
            {customers.map(customer => (
              <tr key={customer.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="p-4">
                  {editingId === customer.id ? (
                    <input 
                      type="text" 
                      value={editData.name} 
                      onChange={e => setEditData({...editData, name: e.target.value})} 
                      className="border rounded p-1 w-full dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none" 
                    />
                  ) : (
                    <span className="font-bold text-gray-800 dark:text-gray-100">{customer.name}</span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === customer.id ? (
                    <input 
                      type="text" 
                      value={editData.phone} 
                      onChange={e => setEditData({...editData, phone: e.target.value})} 
                      className="border rounded p-1 w-full dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none" 
                    />
                  ) : (
                    <span className="text-blue-500 dark:text-blue-400">{customer.phone}</span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === customer.id ? (
                    <input 
                      type="number" 
                      value={editData.credit_limit} 
                      onChange={e => setEditData({...editData, credit_limit: e.target.value})} 
                      className="border rounded p-1 w-24 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none text-left" 
                      dir="ltr" 
                    />
                  ) : (
                    <span className="font-bold text-green-600 dark:text-green-400">₪{customer.credit_limit}</span>
                  )}
                </td>
                <td className="p-4 flex gap-3">
                  {editingId === customer.id ? (
                    <>
                      <button onClick={() => handleSaveEdit(customer.id)} className="text-green-600 dark:text-green-400 font-bold hover:underline">حفظ</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500 dark:text-gray-400 font-bold hover:underline">إلغاء</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(customer)} className="text-blue-500 dark:text-blue-400 font-bold hover:underline">تعديل</button>
                      <button onClick={() => handleDeleteCustomer(customer.id)} className="text-red-500 dark:text-red-400 font-bold hover:underline">حذف</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">لا يوجد زبائن مسجلين</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Customers;