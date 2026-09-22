import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

function Inventory() {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCats, setExpandedCats] = useState({});
  
  // حالة نافذة إدخال البضاعة من داخل الجدول (للصفوف)
  const [stockModal, setStockModal] = useState({ isOpen: false, product: null, qty: '', expiryDate: '' });

  // حالة النافذة الشاملة الجديدة لإدخال المخزون (منتج جديد أو حالي)
  const [globalModal, setGlobalModal] = useState({
    isOpen: false,
    isNewProduct: false,
    categoryId: '',
    productId: '',
    productName: '',
    qty: '',
    costPrice: '',
    sellPrice: '',
    expiryDate: ''
  });

  const fetchInventory = () => {
    axios.get('/categories')
      .then(res => {
        setCategories(res.data);
        const initialExpanded = {};
        res.data.forEach(cat => { initialExpanded[cat.id] = true; });
        setExpandedCats(prev => Object.keys(prev).length === 0 ? initialExpanded : prev);
      })
      .catch(err => console.error("Error fetching inventory:", err));
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const toggleCategory = (id) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const checkExpiryStatus = (dateStr) => {
    if (!dateStr) return { status: 'safe', text: 'غير محدد' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dateStr);
    
    if (expDate < today) return { status: 'expired', text: 'منتهي الصلاحية' };
    
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) return { status: 'warning', text: `ينتهي خلال ${diffDays} يوم` };
    return { status: 'safe', text: dateStr };
  };

  // دالة تحديث الكمية من الجدول مباشرة
  const submitStockUpdate = () => {
    const { product, qty, expiryDate } = stockModal;
    const addedQty = parseInt(qty);
    
    if (isNaN(addedQty) || addedQty <= 0) return alert('أدخل كمية صحيحة');

    const newStock = (product.stock || 0) + addedQty;
    const updatedData = {
      name: product.name,
      price: product.price,
      cost_price: product.cost_price,
      stock: newStock,
      is_trackable: product.is_trackable,
      expiry_date: expiryDate || product.expiry_date
    };

    axios.put(`/products/${product.id}`, updatedData)
      .then(() => {
        fetchInventory();
        setStockModal({ isOpen: false, product: null, qty: '', expiryDate: '' });
      })
      .catch(() => alert('حدث خطأ أثناء تحديث المخزون'));
  };

  // دالة التعامل مع النافذة الشاملة (إضافة منتج جديد أو تزويد حالي)
  const submitGlobalStock = () => {
    const { isNewProduct, categoryId, productId, productName, qty, costPrice, sellPrice, expiryDate } = globalModal;
    
    const addedQty = parseInt(qty);
    if (!categoryId) return alert('يرجى اختيار التصنيف');
    if (isNaN(addedQty) || addedQty <= 0) return alert('يرجى إدخال كمية صحيحة أكبر من صفر');
    if (parseFloat(costPrice) < 0 || parseFloat(sellPrice) < 0) return alert('الأسعار غير صالحة');

    if (isNewProduct) {
      if (!productName.trim()) return alert('يرجى إدخال اسم الصنف الجديد');
      
      const newProductData = {
        category_id: categoryId,
        name: productName,
        price: parseFloat(sellPrice) || 0,
        cost_price: parseFloat(costPrice) || 0,
        stock: addedQty,
        is_trackable: true,
        expiry_date: expiryDate || null
      };

      axios.post('/products', newProductData)
        .then(() => {
          fetchInventory();
          closeGlobalModal();
          alert('تمت إضافة الصنف والمخزون بنجاح');
        })
        .catch(() => alert('حدث خطأ أثناء إضافة الصنف الجديد'));

    } else {
      if (!productId) return alert('يرجى اختيار صنف موجود أو تحديد "صنف جديد"');
      
      const existingProduct = categories.flatMap(c => c.products).find(p => p.id === parseInt(productId));
      const newStock = (existingProduct.stock || 0) + addedQty;

      const updatedData = {
        name: existingProduct.name,
        price: parseFloat(sellPrice) || existingProduct.price,
        cost_price: parseFloat(costPrice) || existingProduct.cost_price,
        stock: newStock,
        is_trackable: true,
        expiry_date: expiryDate || existingProduct.expiry_date
      };

      axios.put(`/products/${productId}`, updatedData)
        .then(() => {
          fetchInventory();
          closeGlobalModal();
          alert('تم تحديث مخزون الصنف بنجاح');
        })
        .catch(() => alert('حدث خطأ أثناء تحديث المخزون'));
    }
  };

  const closeGlobalModal = () => {
    setGlobalModal({ isOpen: false, isNewProduct: false, categoryId: '', productId: '', productName: '', qty: '', costPrice: '', sellPrice: '', expiryDate: '' });
  };

  // تعبئة البيانات تلقائياً عند اختيار صنف موجود في النافذة الشاملة
  const handleProductSelection = (prodId) => {
    const prod = categories.flatMap(c => c.products).find(p => p.id === parseInt(prodId));
    if (prod) {
      setGlobalModal(prev => ({
        ...prev,
        productId: prodId,
        costPrice: prod.cost_price || '',
        sellPrice: prod.price || '',
        expiryDate: prod.expiry_date || ''
      }));
    } else {
      setGlobalModal(prev => ({ ...prev, productId: '' }));
    }
  };

  // حساب الربح المتوقع للنافذة الشاملة
  const calculateModalExpectedProfit = () => {
    const c = parseFloat(globalModal.costPrice) || 0;
    const s = parseFloat(globalModal.sellPrice) || 0;
    const q = parseInt(globalModal.qty) || 0;
    return ((s - c) * q).toFixed(2);
  };

  const exportToExcel = () => {
    const data = [];
    categories.forEach(cat => {
      cat.products.filter(p => p.is_trackable).forEach(p => {
        data.push({
          'التصنيف': cat.name,
          'المنتج': p.name,
          'التكلفة (₪)': p.cost_price || 0,
          'البيع (₪)': p.price,
          'المتبقي': p.stock,
          'تاريخ الصلاحية': p.expiry_date || 'غير محدد'
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "جرد المخزن");
    XLSX.writeFile(wb, "Inventory_Report.xlsx");
  };

  const inventoryProducts = categories.flatMap(cat => 
    cat.products.filter(prod => prod.is_trackable)
  );

  const totalCostValue = inventoryProducts.reduce((sum, p) => sum + ((p.cost_price || 0) * (p.stock || 0)), 0);
  const totalSellValue = inventoryProducts.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
  const expectedProfit = totalSellValue - totalCostValue;

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">إدارة المخزن وجرد البضائع</h1>
        <div className="flex gap-3">
          {/* الزر الجديد لإدخال المخزون الشامل */}
          <button onClick={() => setGlobalModal({ ...globalModal, isOpen: true })} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg transition-colors shadow-md">
            + إدخال مخزون
          </button>
          <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md">
             تصدير Excel 📊
          </button>
          <button onClick={() => window.print()} className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md">
            طباعة جرد PDF 🖨️
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">إجمالي التكلفة (رأس المال)</p>
          <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">₪{totalCostValue.toFixed(2)}</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">القيمة البيعية المتوقعة</p>
          <h2 className="text-3xl font-bold text-green-600 dark:text-green-400">₪{totalSellValue.toFixed(2)}</h2>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800">
          <p className="text-purple-700 dark:text-purple-400 font-bold mb-2">الأرباح المتوقعة</p>
          <h2 className="text-3xl font-bold text-purple-800 dark:text-purple-300">₪{expectedProfit.toFixed(2)}</h2>
        </div>
      </div>

      <div className="mb-6 w-full md:w-1/3 print:hidden">
        <input 
          type="text" 
          placeholder="بحث عن منتج..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-4 print:hidden">
        {categories.map(cat => {
          const catTrackableProducts = cat.products.filter(p => p.is_trackable && p.name.includes(searchTerm));
          if (catTrackableProducts.length === 0) return null;

          return (
            <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button 
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-gray-800 dark:text-gray-100">{cat.name}</span>
                  <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold">
                    {catTrackableProducts.length}
                  </span>
                </div>
                <span className="text-gray-500 font-bold">{expandedCats[cat.id] ? '▼' : '◀'}</span>
              </button>

              {expandedCats[cat.id] && (
                <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-700">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-600">
                      <tr>
                        <th className="p-3 font-bold text-gray-600 dark:text-gray-300">المنتج</th>
                        <th className="p-3 font-bold text-gray-600 dark:text-gray-300 text-center">التكلفة</th>
                        <th className="p-3 font-bold text-gray-600 dark:text-gray-300 text-center">البيع</th>
                        <th className="p-3 font-bold text-gray-600 dark:text-gray-300 text-center">المتبقي</th>
                        <th className="p-3 font-bold text-gray-600 dark:text-gray-300 text-center">تاريخ الصلاحية</th>
                        <th className="p-3 font-bold text-gray-600 dark:text-gray-300 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800">
                      {catTrackableProducts.map(prod => {
                        const expiry = checkExpiryStatus(prod.expiry_date);
                        return (
                          <tr key={prod.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="p-3 font-bold text-gray-800 dark:text-gray-100">{prod.name}</td>
                            <td className="p-3 text-center text-gray-600 dark:text-gray-400 font-bold">₪{prod.cost_price || 0}</td>
                            <td className="p-3 text-center text-green-600 dark:text-green-400 font-bold">₪{prod.price}</td>
                            <td className="p-3 text-center">
                              <span className={`px-3 py-1 rounded-full font-bold text-sm ${prod.stock > 5 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 animate-pulse'}`}>
                                {prod.stock}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                expiry.status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/40' : 
                                expiry.status === 'warning' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 animate-pulse' : 
                                'text-gray-500'
                              }`}>
                                {expiry.text}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => setStockModal({ isOpen: true, product: prod, qty: '', expiryDate: prod.expiry_date || '' })} 
                                className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900"
                              >
                                + تزويد
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* جدول الطباعة (يظهر فقط عند تصدير PDF أو أمر الطباعة) */}
      <div className="hidden print:block font-sans text-black bg-white p-4" dir="rtl">
        <div className="text-center mb-6 border-b pb-4">
          <div className="w-24 h-24 mx-auto mb-2 flex items-center justify-center grayscale contrast-125">
            <img src="/logo.png" alt="السلام كافي" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold">السلام كافي</h2>
          <p className="text-sm text-gray-600">غزة - فلسطين</p>
          <h3 className="text-xl font-bold mt-3">تقرير جرد المخزن</h3>
          <p className="text-xs text-gray-500 mt-1">تاريخ الاستخراج: {new Date().toLocaleString('ar-EG')}</p>
        </div>

        <table className="w-full text-right text-sm border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2 text-right">التصنيف</th>
              <th className="border border-gray-400 p-2 text-right">المنتج</th>
              <th className="border border-gray-400 p-2 text-center">التكلفة</th>
              <th className="border border-gray-400 p-2 text-center">البيع</th>
              <th className="border border-gray-400 p-2 text-center">المتبقي</th>
              <th className="border border-gray-400 p-2 text-center">الصلاحية</th>
            </tr>
          </thead>
          <tbody>
            {categories.flatMap(cat => 
              cat.products.filter(p => p.is_trackable).map(prod => (
                <tr key={prod.id}>
                  <td className="border border-gray-400 p-2">{cat.name}</td>
                  <td className="border border-gray-400 p-2 font-bold">{prod.name}</td>
                  <td className="border border-gray-400 p-2 text-center">₪{prod.cost_price || 0}</td>
                  <td className="border border-gray-400 p-2 text-center">₪{prod.price}</td>
                  <td className="border border-gray-400 p-2 text-center font-bold">{prod.stock}</td>
                  <td className="border border-gray-400 p-2 text-center">{prod.expiry_date || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-6 flex justify-between text-xs text-gray-600 border-t pt-3">
          <span>المسؤول: {JSON.parse(localStorage.getItem('user'))?.name || 'المدير العام'}</span>
          <span>السلام كافي - نظام إدارة المبيعات والمخزون</span>
        </div>
      </div>

      {/* نافذة التزويد السريع من الجدول */}
      {stockModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">إدخال بضاعة: {stockModal.product?.name}</h2>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الكمية المضافة (بالقطعة)</label>
              <input 
                type="number" 
                value={stockModal.qty}
                onChange={e => setStockModal({...stockModal, qty: e.target.value})}
                className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left" dir="ltr" autoFocus
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">تاريخ انتهاء الصلاحية للدفعة (اختياري)</label>
              <input 
                type="date" 
                value={stockModal.expiryDate}
                onChange={e => setStockModal({...stockModal, expiryDate: e.target.value})}
                className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStockModal({isOpen: false, product: null, qty: '', expiryDate: ''})} className="px-5 py-2 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">إلغاء</button>
              <button onClick={submitStockUpdate} className="px-5 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700">تأكيد الإدخال</button>
            </div>
          </div>
        </div>
      )}

      {/* النافذة الشاملة لإدخال المخزون الجديد أو المتوفر */}
      {globalModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-xl">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">إدخال بضاعة للمخزن</h2>
              <button onClick={closeGlobalModal} className="text-gray-500 hover:text-red-500 text-3xl font-bold leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                <button 
                  onClick={() => setGlobalModal({...globalModal, isNewProduct: false, productId: '', productName: ''})} 
                  className={`flex-1 py-2 font-bold rounded-lg transition-colors ${!globalModal.isNewProduct ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  صنف موجود
                </button>
                <button 
                  onClick={() => setGlobalModal({...globalModal, isNewProduct: true, productId: '', productName: ''})} 
                  className={`flex-1 py-2 font-bold rounded-lg transition-colors ${globalModal.isNewProduct ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  صنف جديد
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">التصنيف *</label>
                  <select 
                    value={globalModal.categoryId} 
                    onChange={e => setGlobalModal({...globalModal, categoryId: e.target.value, productId: ''})}
                    className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">اختر التصنيف...</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم الصنف *</label>
                  {globalModal.isNewProduct ? (
                    <input 
                      type="text" 
                      placeholder="أدخل اسم الصنف الجديد"
                      value={globalModal.productName}
                      onChange={e => setGlobalModal({...globalModal, productName: e.target.value})}
                      className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <select 
                      value={globalModal.productId} 
                      onChange={e => handleProductSelection(e.target.value)}
                      disabled={!globalModal.categoryId}
                      className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">اختر الصنف من القائمة...</option>
                      {categories.find(c => c.id === parseInt(globalModal.categoryId))?.products.filter(p => p.is_trackable).map(prod => (
                        <option key={prod.id} value={prod.id}>{prod.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الكمية المضافة (قطعة) *</label>
                  <input 
                    type="number" 
                    value={globalModal.qty}
                    onChange={e => setGlobalModal({...globalModal, qty: e.target.value})}
                    className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:border-blue-500" dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">تاريخ انتهاء الصلاحية</label>
                  <input 
                    type="date" 
                    value={globalModal.expiryDate}
                    onChange={e => setGlobalModal({...globalModal, expiryDate: e.target.value})}
                    className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">سعر التكلفة للقطعة (₪)</label>
                  <input 
                    type="number" 
                    value={globalModal.costPrice}
                    onChange={e => setGlobalModal({...globalModal, costPrice: e.target.value})}
                    className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:border-blue-500" dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">سعر البيع للقطعة (₪)</label>
                  <input 
                    type="number" 
                    value={globalModal.sellPrice}
                    onChange={e => setGlobalModal({...globalModal, sellPrice: e.target.value})}
                    className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:border-blue-500" dir="ltr"
                  />
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800 flex justify-between items-center mt-6">
                <span className="font-bold text-purple-800 dark:text-purple-300">الربح المتوقع للكمية المدخلة:</span>
                <span className="text-2xl font-bold text-purple-700 dark:text-purple-400" dir="ltr">
                  ₪{calculateModalExpectedProfit()}
                </span>
              </div>

            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl flex justify-end gap-3">
              <button onClick={closeGlobalModal} className="px-6 py-2.5 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">إلغاء</button>
              <button onClick={submitGlobalStock} className="px-6 py-2.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md">تأكيد وحفظ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Inventory;