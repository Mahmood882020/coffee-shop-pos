import { useState, useEffect } from 'react';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react'; 

function MenuManagement() {
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [newProduct, setNewProduct] = useState({ category_id: '', name: '', icon: '☕', price: '', stock: 0, is_trackable: false, cost_price: '' });
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductData, setEditProductData] = useState({ name: '', icon: '', price: '', stock: 0, is_trackable: false, cost_price: '' });
  const [expandedCats, setExpandedCats] = useState({});

  const [showEmojiPickerNew, setShowEmojiPickerNew] = useState(false);
  const [showEmojiPickerEdit, setShowEmojiPickerEdit] = useState(false);

  const fetchCategories = () => {
    axios.get('/categories')
      .then(res => {
        setCategories(res.data);
        if (res.data.length > 0 && !newProduct.category_id) {
          setNewProduct(prev => ({ ...prev, category_id: res.data[0].id }));
        }
        let initialExpanded = {};
        res.data.forEach(cat => { initialExpanded[cat.id] = true; });
        setExpandedCats(prev => Object.keys(prev).length === 0 ? initialExpanded : prev);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleCategory = id => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCategory = () => {
    if (categoryName.trim()) {
      axios.post('/categories', { name: categoryName })
        .then(() => {
          setCategoryName('');
          fetchCategories();
        })
        .catch(() => alert('خطأ في الإضافة'));
    }
  };

  const handleDeleteCategory = id => {
    if (window.confirm('حذف هذا التصنيف؟')) {
      axios.delete(`/categories/${id}`)
        .then(() => fetchCategories())
        .catch(() => alert('لا يمكن حذف تصنيف يحتوي على منتجات'));
    }
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return alert('أدخل بيانات المنتج الأساسية');
    
    const payload = {
        ...newProduct,
        price: parseFloat(newProduct.price) || 0,
        cost_price: parseFloat(newProduct.cost_price) || 0,
        stock: parseFloat(newProduct.stock) || 0
    };

    axios.post('/products', payload)
      .then(() => {
        setNewProduct({ category_id: newProduct.category_id, name: '', icon: '☕', price: '', stock: 0, is_trackable: false, cost_price: '' });
        fetchCategories();
        setExpandedCats(prev => ({ ...prev, [newProduct.category_id]: true }));
      })
      .catch(err => {
          alert(err.response?.data?.message || err.response?.data?.error || 'خطأ في الإضافة');
      });
  };

  const startEditing = product => {
    setEditingProductId(product.id);
    setEditProductData({ 
      name: product.name, 
      icon: product.icon || '📦', 
      price: product.price || 0, 
      stock: product.stock || 0, 
      is_trackable: product.is_trackable || false, 
      cost_price: product.cost_price || 0 
    });
  };

  const handleEditProduct = id => {
    if (!editProductData.name || !editProductData.price) return alert('أدخل البيانات بشكل صحيح');
    
    const payload = {
        ...editProductData,
        price: parseFloat(editProductData.price) || 0,
        cost_price: parseFloat(editProductData.cost_price) || 0,
        stock: parseFloat(editProductData.stock) || 0
    };

    axios.put(`/products/${id}`, payload)
      .then(() => {
        setEditingProductId(null);
        fetchCategories();
      })
      .catch(err => {
          alert(err.response?.data?.message || err.response?.data?.error || 'خطأ في التعديل');
      });
  };

  const handleDeleteProduct = id => {
    if (window.confirm('حذف هذا المنتج؟')) {
      axios.delete(`/products/${id}`)
        .then(() => fetchCategories())
        .catch(() => alert('خطأ في الحذف'));
    }
  };

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">إدارة المنيو (Menu Management)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex gap-2 transition-colors">
            <input 
              type="text" 
              value={categoryName} 
              onChange={e => setCategoryName(e.target.value)} 
              placeholder="اسم التصنيف الجديد" 
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 flex-1 focus:outline-none focus:border-blue-500 transition-colors" 
            />
            <button onClick={handleAddCategory} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">إضافة</button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
            <table className="w-full text-right">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-200">التصنيف</th>
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-200 w-24">إجراء</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {categories.map(cat => (
                  <tr key={cat.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-100">{cat.name}</td>
                    <td className="p-4">
                      <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 font-bold hover:text-red-700 dark:hover:text-red-400">حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col gap-3 transition-colors relative">
            <select 
              value={newProduct.category_id} 
              onChange={e => setNewProduct({...newProduct, category_id: e.target.value})} 
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">اختر التصنيف...</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowEmojiPickerNew(!showEmojiPickerNew)}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-2 w-16 text-center text-2xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shrink-0"
                title="اختر أيقونة"
              >
                {newProduct.icon}
              </button>

              {showEmojiPickerNew && (
                <div className="absolute z-50 top-[120px] right-6 shadow-2xl rounded-xl">
                  <div className="fixed inset-0" onClick={() => setShowEmojiPickerNew(false)}></div>
                  <div className="relative">
                    <EmojiPicker 
                      onEmojiClick={(emojiObject) => {
                        setNewProduct({...newProduct, icon: emojiObject.emoji});
                        setShowEmojiPickerNew(false);
                      }}
                      theme="auto"
                      searchDisabled={true}
                      width={300}
                      height={400}
                    />
                  </div>
                </div>
              )}

              <input 
                type="text" 
                value={newProduct.name} 
                onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                placeholder="اسم المنتج" 
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 flex-1 transition-colors min-w-0" 
              />
              <input 
                type="number" 
                value={newProduct.price} 
                onChange={e => setNewProduct({...newProduct, price: e.target.value})} 
                placeholder="البيع ₪" 
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-2 w-24 transition-colors text-left shrink-0" dir="ltr" 
              />
            </div>

            <div className="flex gap-2 items-center border border-gray-200 dark:border-gray-700 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 transition-colors flex-wrap">
              <input 
                type="checkbox" 
                id="trackNew" 
                checked={newProduct.is_trackable} 
                onChange={e => setNewProduct({...newProduct, is_trackable: e.target.checked, cost_price: e.target.checked ? newProduct.cost_price : ''})} 
                className="w-4 h-4 cursor-pointer" 
              />
              <label htmlFor="trackNew" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap">تتبع مخزون</label>
              
              {newProduct.is_trackable && (
                <>
                  <input 
                    type="number" 
                    value={newProduct.cost_price} 
                    onChange={e => setNewProduct({...newProduct, cost_price: e.target.value})} 
                    placeholder="التكلفة ₪" 
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-20 dark:bg-gray-700 dark:text-white transition-colors text-left" dir="ltr" 
                  />
                  <input 
                    type="number" 
                    value={newProduct.stock} 
                    onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})} 
                    placeholder="الكمية" 
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-20 mr-auto dark:bg-gray-700 dark:text-white transition-colors text-left" dir="ltr" 
                  />
                </>
              )}
              <button onClick={handleAddProduct} className={`bg-green-600 text-white px-6 py-1.5 rounded-lg font-bold hover:bg-green-700 transition-colors ${newProduct.is_trackable ? '' : 'mr-auto'}`}>إضافة</button>
            </div>
          </div>

          <div className="flex flex-col gap-4 relative">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
                <button onClick={() => toggleCategory(cat.id)} className="w-full flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-gray-800 dark:text-gray-100">{cat.name}</span>
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold">{cat.products.length}</span>
                  </div>
                  <span className="text-gray-500 font-bold">{expandedCats[cat.id] ? '▼' : '◀'}</span>
                </button>
                
                {expandedCats[cat.id] && (
                  <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-700">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-600">
                        <tr>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300">المنتج</th>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300 w-16 text-center">البيع</th>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300 w-28 text-center">المخزون/التكلفة</th>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300 w-32 text-center">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800">
                        {cat.products.map(prod => (
                          <tr key={prod.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors last:border-0 relative">
                            
                            <td className="p-3 flex items-center gap-2">
                              {editingProductId === prod.id ? (
                                <>
                                  <button 
                                    onClick={() => setShowEmojiPickerEdit(!showEmojiPickerEdit)}
                                    className="border border-gray-300 dark:border-gray-600 rounded px-1 py-1 w-10 text-xl dark:bg-gray-700 dark:text-white shrink-0"
                                  >
                                    {editProductData.icon}
                                  </button>
                                  
                                  {showEmojiPickerEdit && (
                                    <div className="absolute z-50 top-10 right-0 shadow-2xl rounded-xl">
                                      <div className="fixed inset-0" onClick={() => setShowEmojiPickerEdit(false)}></div>
                                      <div className="relative">
                                        <EmojiPicker 
                                          onEmojiClick={(emojiObject) => {
                                            setEditProductData({...editProductData, icon: emojiObject.emoji});
                                            setShowEmojiPickerEdit(false);
                                          }}
                                          theme="auto"
                                          searchDisabled={true}
                                          width={280}
                                          height={350}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  <input 
                                    type="text" 
                                    value={editProductData.name} 
                                    onChange={e => setEditProductData({...editProductData, name: e.target.value})} 
                                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full dark:bg-gray-700 dark:text-white focus:outline-none min-w-0" 
                                  />
                                </>
                              ) : (
                                <>
                                  <span className="text-xl shrink-0">{prod.icon || '📦'}</span>
                                  <span className="font-bold text-gray-800 dark:text-gray-100 break-words">{prod.name}</span>
                                </>
                              )}
                            </td>

                            <td className="p-3 font-bold text-green-600 dark:text-green-400 text-center">
                              {editingProductId === prod.id ? (
                                <input 
                                  type="number" 
                                  value={editProductData.price} 
                                  onChange={e => setEditProductData({...editProductData, price: e.target.value})} 
                                  className="border border-gray-300 dark:border-gray-600 rounded px-1 py-1 w-full dark:bg-gray-700 dark:text-white focus:outline-none text-left min-w-0" dir="ltr" 
                                />
                              ) : `₪${prod.price}`}
                            </td>

                            <td className="p-3 text-center">
                              {editingProductId === prod.id ? (
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs flex items-center justify-center gap-1 text-gray-600 dark:text-gray-300">
                                    <input type="checkbox" checked={editProductData.is_trackable} onChange={e => setEditProductData({...editProductData, is_trackable: e.target.checked})} />
                                    تتبع
                                  </label>
                                  <div className="flex gap-1 justify-center">
                                    <input type="number" placeholder="تكلفة" value={editProductData.cost_price} disabled={!editProductData.is_trackable} onChange={e => setEditProductData({...editProductData, cost_price: e.target.value})} className="border border-gray-300 dark:border-gray-600 rounded px-1 py-1 w-full dark:bg-gray-700 dark:text-white text-xs text-left min-w-0" dir="ltr" title="سعر التكلفة" />
                                    <input type="number" placeholder="كمية" value={editProductData.stock} disabled={!editProductData.is_trackable} onChange={e => setEditProductData({...editProductData, stock: e.target.value})} className="border border-gray-300 dark:border-gray-600 rounded px-1 py-1 w-full dark:bg-gray-700 dark:text-white text-xs text-left min-w-0" dir="ltr" title="الكمية" />
                                  </div>
                                </div>
                              ) : prod.is_trackable ? (
                                <div className="flex flex-col">
                                  <span className={`text-xs font-bold px-2 py-0.5 mb-1 text-center rounded-full ${prod.stock > 5 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>الكمية: {prod.stock}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">تكلفة: ₪{prod.cost_price || 0}</span>
                                </div>
                              ) : <span className="text-xs text-gray-400 dark:text-gray-500">-</span>}
                            </td>

                            <td className="p-3 flex gap-2 flex-wrap justify-center">
                              {editingProductId === prod.id ? (
                                <>
                                  <button onClick={() => handleEditProduct(prod.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">حفظ</button>
                                  <button onClick={() => setEditingProductId(null)} className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600">إلغاء</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditing(prod)} className="text-blue-500 dark:text-blue-400 font-bold hover:underline text-sm">تعديل</button>
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

export default MenuManagement;