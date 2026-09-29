import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

function Inventory() {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCats, setExpandedCats] = useState({});
  
  // نافذة الشراء من الموردين (تزيد المستودع الرئيسي فقط)
  const [stockModal, setStockModal] = useState({ isOpen: false, product: null, qty: '', expiryDate: '' });
  
  // نافذة التحويل الداخلي (من الرئيسي إلى الكافي)
  const [transferModal, setTransferModal] = useState({ isOpen: false, product: null, qty: '' });

  // نافذة تعديل الأسعار
  const [priceModal, setPriceModal] = useState({ isOpen: false, product: null, price: '', costPrice: '' });

  const [globalModal, setGlobalModal] = useState({
    isOpen: false,
    isNewProduct: false,
    categoryId: '',
    productId: '',
    productName: '',
    qty: '',
    unitType: 'piece',
    costPrice: '',
    sellPrice: '',
    expiryDate: ''
  });

  const unitLabels = {
    'piece': 'قطعة / كوب',
    'kg': 'كيلوجرام',
    'gram': 'جرام',
    'liter': 'لتر'
  };

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

  // دالة الشراء السريع لمنتج موجود (تصب في المستودع الرئيسي)
  const submitStockUpdate = () => {
    const { product, qty, expiryDate } = stockModal;
    const addedQty = parseFloat(qty);
    
    if (isNaN(addedQty) || addedQty <= 0) return alert('أدخل كمية صحيحة');

    const newMainStock = parseFloat(product.main_stock || 0) + addedQty;
    const updatedData = {
      name: product.name,
      price: product.price,
      cost_price: product.cost_price,
      stock: product.stock, 
      main_stock: newMainStock, 
      unit_type: product.unit_type || 'piece',
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

  // دالة التحويل (من الرئيسي للكافي)
  const submitTransfer = () => {
    const { product, qty } = transferModal;
    const transferQty = parseFloat(qty);
    
    if (isNaN(transferQty) || transferQty <= 0) return alert('أدخل كمية صحيحة أكبر من صفر');

    const currentUser = JSON.parse(localStorage.getItem('user'));
    
    axios.post(`/products/${product.id}/transfer`, {
      quantity: transferQty,
      user_id: currentUser ? currentUser.id : null
    })
    .then(res => {
      alert(res.data.message || 'تم تحويل البضاعة بنجاح');
      fetchInventory();
      setTransferModal({ isOpen: false, product: null, qty: '' });
    })
    .catch(err => {
      alert(err.response?.data?.error || err.response?.data?.message || 'حدث خطأ أثناء التحويل');
    });
  };

  // دالة تعديل الأسعار مباشرة من المخزن
  const submitPriceUpdate = () => {
    const { product, price, costPrice } = priceModal;
    const newPrice = parseFloat(price);
    const newCost = parseFloat(costPrice);

    if (isNaN(newPrice) || newPrice < 0) return alert('سعر البيع غير صحيح');
    if (isNaN(newCost) || newCost < 0) return alert('سعر التكلفة غير صحيح');

    const updatedData = {
      name: product.name, 
      price: newPrice,
      cost_price: newCost,
      stock: product.stock,
      main_stock: product.main_stock,
      unit_type: product.unit_type || 'piece',
      is_trackable: product.is_trackable,
      expiry_date: product.expiry_date
    };

    axios.put(`/products/${product.id}`, updatedData)
      .then(() => {
        alert('تم تحديث الأسعار بنجاح');
        fetchInventory();
        setPriceModal({ isOpen: false, product: null, price: '', costPrice: '' });
      })
      .catch(err => {
        alert(err.response?.data?.error || err.response?.data?.message || 'حدث خطأ أثناء تحديث الأسعار');
      });
  };

  // الإدخال المتقدم (من زر + إدخال مخزون)
  const submitGlobalStock = () => {
    const { isNewProduct, categoryId, productId, productName, qty, unitType, costPrice, sellPrice, expiryDate } = globalModal;
    
    const addedQty = parseFloat(qty);
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
        stock: 0, 
        main_stock: addedQty, 
        unit_type: unitType,
        is_trackable: true,
        expiry_date: expiryDate || null
      };

      axios.post('/products', newProductData)
        .then(() => {
          fetchInventory();
          closeGlobalModal();
          alert('تمت إضافة الصنف للمستودع الرئيسي بنجاح');
        })
        .catch(() => alert('حدث خطأ أثناء إضافة الصنف الجديد'));

    } else {
      if (!productId) return alert('يرجى اختيار صنف موجود أو تحديد "صنف جديد"');
      
      const existingProduct = categories.flatMap(c => c.products).find(p => p.id == productId);
      const newMainStock = parseFloat(existingProduct.main_stock || 0) + addedQty;

      const updatedData = {
        name: existingProduct.name,
        price: parseFloat(sellPrice) || existingProduct.price,
        cost_price: parseFloat(costPrice) || existingProduct.cost_price,
        stock: existingProduct.stock, 
        main_stock: newMainStock, 
        unit_type: unitType, 
        is_trackable: true,
        expiry_date: expiryDate || existingProduct.expiry_date
      };

      axios.put(`/products/${productId}`, updatedData)
        .then(() => {
          fetchInventory();
          closeGlobalModal();
          alert('تم إدخال المخزون للرئيسي بنجاح');
        })
        .catch(() => alert('حدث خطأ أثناء تحديث المخزون'));
    }
  };

  const closeGlobalModal = () => {
    setGlobalModal({ isOpen: false, isNewProduct: false, categoryId: '', productId: '', productName: '', qty: '', unitType: 'piece', costPrice: '', sellPrice: '', expiryDate: '' });
  };

  const handleProductSelection = (prodId) => {
    const prod = categories.flatMap(c => c.products).find(p => p.id == prodId);
    if (prod) {
      setGlobalModal(prev => ({
        ...prev,
        productId: prodId,
        unitType: prod.unit_type || 'piece',
        costPrice: prod.cost_price || '',
        sellPrice: prod.price || '',
        expiryDate: prod.expiry_date || ''
      }));
    } else {
      setGlobalModal(prev => ({ ...prev, productId: '', unitType: 'piece' }));
    }
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
          'المستودع الرئيسي': `${p.main_stock || 0} ${unitLabels[p.unit_type || 'piece']}`,
          'مخزون الكافي': `${p.stock || 0} ${unitLabels[p.unit_type || 'piece']}`,
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

  const totalCostValue = inventoryProducts.reduce((sum, p) => sum + ((p.cost_price || 0) * (parseFloat(p.stock || 0) + parseFloat(p.main_stock || 0))), 0);
  const totalSellValue = inventoryProducts.reduce((sum, p) => sum + ((p.price || 0) * (parseFloat(p.stock || 0) + parseFloat(p.main_stock || 0))), 0);
  const expectedProfit = totalSellValue - totalCostValue;

  const printInventory = () => {
    const tableRows = categories.flatMap(cat => 
      cat.products.filter(p => p.is_trackable).map(p => `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${cat.name}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${p.name}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">₪${p.cost_price || 0}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #16a34a; font-weight: bold;">₪${p.price}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #7e22ce;">
            ${parseFloat(p.main_stock || 0).toFixed(2).replace(/\.00$/, '')}
          </td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; ${parseFloat(p.stock) <= 5 ? 'color: #dc2626;' : 'color: #2563eb;'}">
            ${parseFloat(p.stock || 0).toFixed(2).replace(/\.00$/, '')}
          </td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;" dir="ltr">${p.expiry_date || '-'}</td>
        </tr>
      `)
    ).join('');

    const printContent = `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: white; color: black;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px;">السلام كافي</h1>
          <h2 style="margin: 8px 0 0 0; font-size: 20px; color: #444;">تقرير جرد المخزن (Inventory Report)</h2>
          <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
            <span>تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}</span>
            <span>إجمالي التكلفة: <strong style="color: #dc2626;">₪${totalCostValue.toFixed(2)}</strong></span>
            <span>القيمة البيعية المتوقعة: <strong style="color: #16a34a;">₪${totalSellValue.toFixed(2)}</strong></span>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;" border="1">
          <thead style="background-color: #f3f4f6;">
            <tr>
              <th style="padding: 12px; border: 1px solid #000; text-align: right;">التصنيف</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: right;">المنتج</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: center;">التكلفة للوحدة</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: center;">سعر البيع</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: center; color: #7e22ce;">الرئيسي</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: center; color: #2563eb;">الكافي</th>
              <th style="padding: 12px; border: 1px solid #000; text-align: center;">الصلاحية</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="7" style="padding: 20px; text-align: center;">لا توجد منتجات مسجلة في المخزن</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>طباعة جرد المخزن</title></head><body style="margin:0; padding:0; background-color: white;">');
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
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">إدارة المستودع وجرد الكافي</h1>
        <div className="flex gap-3">
          <button onClick={() => setGlobalModal({ ...globalModal, isOpen: true })} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg transition-colors shadow-md">
            + إدخال للمستودع
          </button>
          <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md">
             تصدير Excel 📊
          </button>
          <button onClick={printInventory} className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md">
            طباعة جرد PDF 🖨️
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">إجمالي التكلفة (للمستودع والكافي معاً)</p>
          <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">₪{totalCostValue.toFixed(2)}</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">القيمة البيعية المتوقعة (إجمالي)</p>
          <h2 className="text-3xl font-bold text-green-600 dark:text-green-400">₪{totalSellValue.toFixed(2)}</h2>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800">
          <p className="text-purple-700 dark:text-purple-400 font-bold mb-2">الأرباح المتوقعة من البضاعة</p>
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
                        <th className="p-3 font-bold text-purple-700 dark:text-purple-400 text-center bg-purple-50 dark:bg-purple-900/20">المستودع الرئيسي</th>
                        <th className="p-3 font-bold text-blue-700 dark:text-blue-400 text-center bg-blue-50 dark:bg-blue-900/20">الكافي (POS)</th>
                        <th className="p-3 font-bold text-gray-600 dark:text-gray-300 text-center">الوحدة</th>
                        <th className="p-3 font-bold text-gray-600 dark:text-gray-300 text-center">إجراءات المخزن</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800">
                      {catTrackableProducts.map(prod => (
                        <tr key={prod.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-3 font-bold text-gray-800 dark:text-gray-100">{prod.name}</td>
                          <td className="p-3 text-center text-gray-600 dark:text-gray-400 font-bold">₪{prod.cost_price || 0}</td>
                          <td className="p-3 text-center text-green-600 dark:text-green-400 font-bold">₪{prod.price}</td>
                          
                          {/* المستودع الرئيسي */}
                          <td className="p-3 text-center bg-purple-50/50 dark:bg-purple-900/10">
                            <span className={`px-3 py-1 rounded-full font-bold text-sm ${parseFloat(prod.main_stock) > 5 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 animate-pulse'}`}>
                              {parseFloat(prod.main_stock || 0).toFixed(2).replace(/\.00$/, '')}
                            </span>
                          </td>

                          {/* الكافي (الفرعي) */}
                          <td className="p-3 text-center bg-blue-50/50 dark:bg-blue-900/10">
                            <span className={`px-3 py-1 rounded-full font-bold text-sm ${parseFloat(prod.stock) > 5 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 animate-pulse'}`}>
                              {parseFloat(prod.stock || 0).toFixed(2).replace(/\.00$/, '')}
                            </span>
                          </td>

                          <td className="p-3 text-center text-gray-600 dark:text-gray-300 font-bold">
                            {unitLabels[prod.unit_type || 'piece']}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-wrap justify-center gap-2">
                              <button 
                                onClick={() => setStockModal({ isOpen: true, product: prod, qty: '', expiryDate: prod.expiry_date || '' })} 
                                className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 text-xs shadow-sm"
                              >
                                + شراء للرئيسي
                              </button>
                              <button 
                                onClick={() => setTransferModal({ isOpen: true, product: prod, qty: '' })} 
                                className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-900 text-xs shadow-sm border border-purple-200 dark:border-purple-800"
                              >
                                ↔️ تحويل للكافي
                              </button>
                              <button 
                                onClick={() => setPriceModal({ isOpen: true, product: prod, price: prod.price, costPrice: prod.cost_price || 0 })} 
                                className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900 text-xs shadow-sm border border-amber-200 dark:border-amber-800"
                              >
                                ✏️ تعديل السعر
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* نافذة الشراء للمستودع الرئيسي */}
      {stockModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">إدخال للمستودع: {stockModal.product?.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">هذه الكمية ستضاف إلى المستودع الرئيسي فقط.</p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                الكمية المضافة ({unitLabels[stockModal.product?.unit_type || 'piece']})
              </label>
              <input 
                type="number" 
                step="0.01"
                value={stockModal.qty}
                onChange={e => setStockModal({...stockModal, qty: e.target.value})}
                className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:border-blue-500" dir="ltr" autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStockModal({isOpen: false, product: null, qty: '', expiryDate: ''})} className="px-5 py-2 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">إلغاء</button>
              <button onClick={submitStockUpdate} className="px-5 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700">تأكيد الإدخال للرئيسي</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة التحويل الداخلي (من الرئيسي للكافي) */}
      {transferModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-purple-300 dark:border-purple-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">↔️</span>
              <h2 className="text-2xl font-bold text-purple-800 dark:text-purple-300">تحويل للكافي: {transferModal.product?.name}</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              المتوفر في المستودع الرئيسي حالياً: 
              <strong className="text-purple-700 dark:text-purple-400 mr-2 text-lg">
                {parseFloat(transferModal.product?.main_stock || 0).toFixed(2).replace(/\.00$/, '')} {unitLabels[transferModal.product?.unit_type || 'piece']}
              </strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                الكمية المراد نقلها للكافي (لتصبح متاحة للبيع)
              </label>
              <input 
                type="number" 
                step="0.01"
                value={transferModal.qty}
                onChange={e => setTransferModal({...transferModal, qty: e.target.value})}
                className="w-full border-2 border-purple-300 p-3 rounded-lg dark:bg-gray-700 dark:border-purple-600 dark:text-white text-left focus:outline-none focus:border-purple-500" dir="ltr" autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setTransferModal({isOpen: false, product: null, qty: ''})} className="px-5 py-2 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">إلغاء</button>
              <button onClick={submitTransfer} className="px-5 py-2 rounded-lg font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-lg">تأكيد النقل</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل الأسعار */}
      {priceModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-amber-300 dark:border-amber-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">✏️</span>
              <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-300">تعديل أسعار: {priceModal.product?.name}</h2>
            </div>
            <div className="mb-4 mt-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">سعر التكلفة (₪)</label>
              <input 
                type="number" 
                step="0.01"
                value={priceModal.costPrice}
                onChange={e => setPriceModal({...priceModal, costPrice: e.target.value})}
                className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:border-amber-500" dir="ltr"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">سعر البيع (₪)</label>
              <input 
                type="number" 
                step="0.01"
                value={priceModal.price}
                onChange={e => setPriceModal({...priceModal, price: e.target.value})}
                className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:border-amber-500" dir="ltr"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPriceModal({isOpen: false, product: null, price: '', costPrice: ''})} className="px-5 py-2 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">إلغاء</button>
              <button onClick={submitPriceUpdate} className="px-5 py-2 rounded-lg font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-lg">حفظ الأسعار</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الإدخال المتقدمة */}
      {globalModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-xl">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">إدخال بضاعة للمستودع الرئيسي</h2>
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
                      {categories.find(c => c.id == globalModal.categoryId)?.products.map(prod => (
                        <option key={prod.id} value={prod.id}>{prod.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    الكمية المضافة للرئيسي *
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={globalModal.qty}
                    onChange={e => setGlobalModal({...globalModal, qty: e.target.value})}
                    className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:border-blue-500" dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">وحدة القياس</label>
                  <select 
                    value={globalModal.unitType}
                    onChange={e => setGlobalModal({...globalModal, unitType: e.target.value})}
                    className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="piece">قطعة / كوب</option>
                    <option value="kg">كيلوجرام</option>
                    <option value="gram">جرام</option>
                    <option value="liter">لتر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">سعر التكلفة للوحدة (₪)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={globalModal.costPrice}
                    onChange={e => setGlobalModal({...globalModal, costPrice: e.target.value})}
                    className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:border-blue-500" dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">سعر البيع للوحدة (₪)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={globalModal.sellPrice}
                    onChange={e => setGlobalModal({...globalModal, sellPrice: e.target.value})}
                    className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left focus:outline-none focus:border-blue-500" dir="ltr"
                  />
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl flex justify-end gap-3">
              <button onClick={closeGlobalModal} className="px-6 py-2.5 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">إلغاء</button>
              <button onClick={submitGlobalStock} className="px-6 py-2.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md">تأكيد وحفظ للرئيسي</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Inventory;