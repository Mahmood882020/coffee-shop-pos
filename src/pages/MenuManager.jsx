import { useState, useEffect } from 'react';
import axios from 'axios';

function MenuManager() {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  
  const [newProduct, setNewProduct] = useState({ category_id: '', name: '', price: '', stock: 0, is_trackable: false, cost_price: '' });
  
  const [editingProdId, setEditingProdId] = useState(null);
  const [editProdData, setEditProdData] = useState({ name: '', price: '', stock: 0, is_trackable: false, cost_price: '' });

  const [expandedCats, setExpandedCats] = useState({});

  const fetchMenu = () => {
    axios.get('/categories')
      .then(res => {
        setCategories(res.data);
        if (res.data.length > 0 && !newProduct.category_id) {
          setNewProduct(prev => ({ ...prev, category_id: res.data[0].id }));
        }
        
        const initialExpanded = {};
        res.data.forEach(cat => {
          initialExpanded[cat.id] = true;
        });
        setExpandedCats(prev => Object.keys(prev).length === 0 ? initialExpanded : prev);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchMenu(); }, []);

  const toggleCategory = (id) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    axios.post('/categories', { name: newCatName })
      .then(() => { setNewCatName(''); fetchMenu(); })
      .catch(() => alert('خطأ في الإضافة (Error adding)'));
  };

  const handleDeleteCategory = (id) => {
    if (!window.confirm('حذف هذا التصنيف؟ (Delete this category?)')) return;
    axios.delete(`/categories/${id}`)
      .then(() => fetchMenu())
      .catch(() => alert('لا يمكن حذف تصنيف يحتوي على منتجات (Cannot delete category containing products)'));
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return alert('أدخل بيانات المنتج الأساسية (Enter basic product data)');
    axios.post('/products', newProduct)
      .then(() => { 
        setNewProduct({ ...newProduct, name: '', price: '', stock: 0, is_trackable: false, cost_price: '' }); 
        fetchMenu(); 
        setExpandedCats(prev => ({ ...prev, [newProduct.category_id]: true }));
      })
      .catch(() => alert('خطأ في الإضافة (Error adding)'));
  };

  const handleEditProdClick = (prod) => {
    setEditingProdId(prod.id);
    setEditProdData({ 
      name: prod.name, 
      price: prod.price, 
      stock: prod.stock || 0, 
      is_trackable: prod.is_trackable || false,
      cost_price: prod.cost_price || 0
    });
  };

  const handleSaveProd = (id) => {
    if (!editProdData.name || !editProdData.price) return alert('أدخل البيانات بشكل صحيح (Enter data correctly)');
    axios.put(`/products/${id}`, editProdData)
      .then(() => { setEditingProdId(null); fetchMenu(); })
      .catch(() => alert('خطأ في التعديل (Error editing)'));
  };

  const handleDeleteProduct = (id) => {
    if (!window.confirm('حذف هذا المنتج؟ (Delete this product?)')) return;
    axios.delete(`/products/${id}`)
      .then(() => fetchMenu())
      .catch(() => alert('خطأ في الحذف (Error deleting)'));
  };

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">إدارة المنيو (Menu Management)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex gap-2 transition-colors">
            <input 
              type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              placeholder="اسم التصنيف الجديد (New category name)"
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 flex-1 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button onClick={handleAddCategory} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">إضافة (Add)</button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
            <table className="w-full text-right">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-200">التصنيف (Category)</th>
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-200 w-24">إجراء (Action)</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {categories.map(cat => (
                  <tr key={cat.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-100">{cat.name}</td>
                    <td className="p-4">
                      <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 font-bold hover:text-red-700 dark:hover:text-red-400">حذف (Delete)</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col gap-3 transition-colors">
            <select 
              value={newProduct.category_id} onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">اختر التصنيف... (Select category...)</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            
            <div className="flex gap-2">
              <input 
                type="text" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                placeholder="اسم المنتج (Product Name)" className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 flex-1 transition-colors"
              />
              <input 
                type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                placeholder="البيع ₪" className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-2 w-24 transition-colors text-left" dir="ltr"
              />
            </div>

            <div className="flex gap-2 items-center border border-gray-200 dark:border-gray-700 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 transition-colors flex-wrap">
              <input 
                type="checkbox" 
                id="trackNew" 
                checked={newProduct.is_trackable} 
                onChange={(e) => setNewProduct({...newProduct, is_trackable: e.target.checked, cost_price: e.target.checked ? newProduct.cost_price : ''})}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="trackNew" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap">تتبع مخزون (Track stock)</label>
              
              {newProduct.is_trackable && (
                <>
                  <input 
                    type="number" 
                    value={newProduct.cost_price} 
                    onChange={(e) => setNewProduct({...newProduct, cost_price: e.target.value})}
                    placeholder="التكلفة ₪" 
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-20 dark:bg-gray-700 dark:text-white transition-colors text-left"
                    dir="ltr"
                  />
                  <input 
                    type="number" 
                    value={newProduct.stock} 
                    onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})}
                    placeholder="الكمية (Qty)" 
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-20 mr-auto dark:bg-gray-700 dark:text-white transition-colors text-left"
                    dir="ltr"
                  />
                </>
              )}
              <button onClick={handleAddProduct} className={`bg-green-600 text-white px-6 py-1.5 rounded-lg font-bold hover:bg-green-700 transition-colors ${!newProduct.is_trackable ? 'mr-auto' : ''}`}>إضافة (Add)</button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
                
                {/* تم تصحيح الفئات اللونية هنا لتتناسب مع الوضع الليلي بشكل صحيح */}
                <button 
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-gray-800 dark:text-gray-100">{cat.name}</span>
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold">
                      {cat.products.length}
                    </span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 font-bold">
                    {expandedCats[cat.id] ? '▼' : '◀'}
                  </span>
                </button>

                {expandedCats[cat.id] && (
                  <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-700">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-600">
                        <tr>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300">المنتج (Product)</th>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300 w-16">البيع</th>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300 w-28">المخزون/التكلفة</th>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300 w-32">إجراء (Action)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800">
                        {cat.products.map(prod => (
                          <tr key={prod.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors last:border-0">
                            <td className="p-3">
                              {editingProdId === prod.id ? (
                                <input type="text" value={editProdData.name} onChange={(e) => setEditProdData({...editProdData, name: e.target.value})} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full dark:bg-gray-700 dark:text-white focus:outline-none" />
                              ) : (
                                <span className="font-bold text-gray-800 dark:text-gray-100">{prod.name}</span>
                              )}
                            </td>
                            <td className="p-3 font-bold text-green-600 dark:text-green-400">
                              {editingProdId === prod.id ? (
                                <input type="number" value={editProdData.price} onChange={(e) => setEditProdData({...editProdData, price: e.target.value})} className="border border-gray-300 dark:border-gray-600 rounded px-1 py-1 w-full dark:bg-gray-700 dark:text-white focus:outline-none text-left" dir="ltr" />
                              ) : (
                                 prod.price
                              )}
                            </td>
                            <td className="p-3">
                              {editingProdId === prod.id ? (
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                    <input type="checkbox" checked={editProdData.is_trackable} onChange={(e) => setEditProdData({...editProdData, is_trackable: e.target.checked})} /> تتبع (Track)
                                  </label>
                                  <div className="flex gap-1">
                                    <input type="number" placeholder="تكلفة" value={editProdData.cost_price} disabled={!editProdData.is_trackable} onChange={(e) => setEditProdData({...editProdData, cost_price: e.target.value})} className="border border-gray-300 dark:border-gray-600 rounded px-1 py-1 w-full dark:bg-gray-700 dark:text-white text-xs text-left" dir="ltr" title="سعر التكلفة" />
                                    <input type="number" placeholder="كمية" value={editProdData.stock} disabled={!editProdData.is_trackable} onChange={(e) => setEditProdData({...editProdData, stock: e.target.value})} className="border border-gray-300 dark:border-gray-600 rounded px-1 py-1 w-full dark:bg-gray-700 dark:text-white text-xs text-left" dir="ltr" title="الكمية" />
                                  </div>
                                </div>
                              ) : (
                                prod.is_trackable ? (
                                  <div className="flex flex-col">
                                    <span className={`text-xs font-bold px-2 py-0.5 mb-1 text-center rounded-full ${prod.stock > 5 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                                      الكمية: {prod.stock}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center">تكلفة: ₪{prod.cost_price || 0}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                )
                              )}
                            </td>
                            <td className="p-3 flex gap-2 flex-wrap">
                              {editingProdId === prod.id ? (
                                <>
                                  <button onClick={() => handleSaveProd(prod.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">حفظ</button>
                                  <button onClick={() => setEditingProdId(null)} className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600">إلغاء</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleEditProdClick(prod)} className="text-blue-500 dark:text-blue-400 font-bold hover:underline text-sm">تعديل</button>
                                  <button onClick={() => handleDeleteProduct(prod.id)} className="text-red-500 dark:text-red-400 font-bold hover:underline text-sm">حذف</button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                        {cat.products.length === 0 && (
                          <tr>
                            <td colSpan="4" className="p-6 text-center text-gray-500 dark:text-gray-400">لا يوجد منتجات في هذا التصنيف</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MenuManager;