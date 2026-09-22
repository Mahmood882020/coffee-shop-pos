import { useState, useEffect } from 'react';
import axios from 'axios';

function Tables() {
  const [tables, setTables] = useState([]);
  const [newTable, setNewTable] = useState({ name: '', zone: 'family' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', zone: 'family' });

  const fetchTables = () => {
    axios.get('/tables')
      .then(res => setTables(res.data))
      .catch(err => console.error("خطأ في جلب بيانات الطاولات:", err));
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleAddTable = () => {
    if (!newTable.name) return alert('يرجى إدخال اسم الطاولة');
    axios.post('/tables', newTable)
      .then(() => {
        setNewTable({ name: '', zone: 'family' });
        fetchTables();
      })
      .catch(err => alert('حدث خطأ أثناء الإضافة'));
  };

  const handleDeleteTable = (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الطاولة؟')) return;
    axios.delete(`/tables/${id}`)
      .then(() => fetchTables())
      .catch(err => alert('حدث خطأ أثناء الحذف'));
  };

  const handleEditClick = (table) => {
    setEditingId(table.id);
    setEditData({ name: table.name, zone: table.zone });
  };

  const handleSaveEdit = (id) => {
    if (!editData.name) return alert('اسم الطاولة مطلوب');
    axios.put(`/tables/${id}`, editData)
      .then(() => {
        setEditingId(null);
        fetchTables();
      })
      .catch(err => alert('حدث خطأ أثناء التعديل'));
  };

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">إدارة الطاولات (Tables Management)</h1>

      {/* قسم إضافة طاولة */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم الطاولة (Table Name)</label>
            <input
              type="text"
              value={newTable.name}
              onChange={(e) => setNewTable({...newTable, name: e.target.value})}
              className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="مثال: T1, F4..."
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">القسم (Zone)</label>
            <select
              value={newTable.zone}
              onChange={(e) => setNewTable({...newTable, zone: e.target.value})}
              className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="family">العائلات (Family)</option>
              <option value="youth">الشباب (Youth)</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <button
              onClick={handleAddTable}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all shadow-md"
            >
              إضافة (Add)
            </button>
          </div>
        </div>
      </div>

      {/* جدول عرض الطاولات */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <table className="w-full text-center">
          <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">ID</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">اسم الطاولة (Table Name)</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">القسم (Zone)</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الإجراء (Action)</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {tables.map((table, index) => (
              <tr key={table.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="p-4 font-bold text-gray-600 dark:text-gray-400">#{index + 1}</td>
                <td className="p-4">
                  {editingId === table.id ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={e => setEditData({...editData, name: e.target.value})}
                      className="border rounded p-1 w-full max-w-[150px] mx-auto dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none"
                    />
                  ) : (
                    <span className="font-bold text-gray-800 dark:text-gray-100">{table.name}</span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === table.id ? (
                    <select
                      value={editData.zone}
                      onChange={e => setEditData({...editData, zone: e.target.value})}
                      className="border rounded p-1 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none"
                    >
                      <option value="family">عائلات</option>
                      <option value="youth">شباب</option>
                    </select>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${table.zone === 'family' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                      {table.zone === 'family' ? 'عائلات' : 'الشباب'}
                    </span>
                  )}
                </td>
                <td className="p-4 flex justify-center gap-3">
                  {editingId === table.id ? (
                    <>
                      <button onClick={() => handleSaveEdit(table.id)} className="bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300 px-3 py-1 rounded font-bold transition-colors">حفظ</button>
                      <button onClick={() => setEditingId(null)} className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-3 py-1 rounded font-bold transition-colors">إلغاء</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(table)} className="bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 px-4 py-1.5 rounded-lg font-bold transition-colors">تعديل (Edit)</button>
                      <button onClick={() => handleDeleteTable(table.id)} className="bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-4 py-1.5 rounded-lg font-bold transition-colors">حذف (Delete)</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {tables.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500 dark:text-gray-400">لا توجد طاولات مسجلة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Tables;