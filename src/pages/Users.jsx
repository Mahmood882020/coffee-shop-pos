import { useState, useEffect } from 'react';
import axios from 'axios';

function Users() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', phone: '', password: '', role: 'cashier' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', phone: '', password: '', role: 'cashier' });

  const fetchUsers = () => {
    axios.get('/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error("خطأ في جلب بيانات المستخدمين:", err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = () => {
    if (!newUser.name || !newUser.phone || !newUser.password || !newUser.role) {
      return alert('يرجى تعبئة كافة الحقول (Please fill all fields)');
    }
    axios.post('/users', newUser)
      .then(() => {
        setNewUser({ name: '', phone: '', password: '', role: 'cashier' });
        fetchUsers();
      })
      .catch(err => alert('حدث خطأ أثناء الإضافة (Error during addition)'));
  };

  const handleDeleteUser = (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟ (Are you sure you want to delete this user?)')) return;
    axios.delete(`/users/${id}`)
      .then(() => fetchUsers())
      .catch(err => alert('حدث خطأ أثناء الحذف (Error during deletion)'));
  };

  const handleEditClick = (user) => {
    setEditingId(user.id);
    setEditData({ name: user.name, phone: user.phone, password: '', role: user.role });
  };

  const handleSaveEdit = (id) => {
    if (!editData.name || !editData.phone || !editData.role) return alert('البيانات غير مكتملة (Incomplete data)');
    axios.put(`/users/${id}`, editData)
      .then(() => {
        setEditingId(null);
        fetchUsers();
      })
      .catch(err => alert('حدث خطأ أثناء التعديل (Error during edit)'));
  };

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">إدارة المستخدمين (Users)</h1>

      {/* قسم الإضافة */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الاسم (Name)</label>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الجوال (Phone)</label>
            <input
              type="text"
              value={newUser.phone}
              onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
              className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">المرور (Password)</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الصلاحية (Role)</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="cashier">كاشير (Cashier)</option>
              <option value="admin">مدير (Admin)</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <button
              onClick={handleAddUser}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all shadow-md"
            >
              إضافة (Add)
            </button>
          </div>
        </div>
      </div>

      {/* جدول العرض */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <table className="w-full text-center">
          <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الاسم (Name)</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الجوال (Phone)</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الصلاحية (Role)</th>
              <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الإجراء (Action)</th>
            </tr>
          </thead>
          {/* تم تصحيح الفئات الخاصة بجسم الجدول هنا */}
          <tbody className="bg-white dark:bg-gray-800">
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="p-4">
                  {editingId === user.id ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={e => setEditData({...editData, name: e.target.value})}
                      className="border rounded p-1 w-full max-w-[150px] mx-auto dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none"
                    />
                  ) : (
                    <span className="font-bold text-gray-800 dark:text-gray-100">{user.name}</span>
                  )}
                </td>
                <td className="p-4 text-blue-500 dark:text-blue-400">
  {editingId === user.id ? (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={editData.phone}
        onChange={e => setEditData({...editData, phone: e.target.value})}
        className="border rounded p-1 w-full max-w-[150px] mx-auto dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none text-center"
        placeholder="رقم الجوال"
        title="رقم الجوال"
      />
      <input
        type="password"
        value={editData.password}
        onChange={e => setEditData({...editData, password: e.target.value})}
        className="border rounded p-1 w-full max-w-[150px] mx-auto text-black dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none text-center"
        placeholder="مرور جديدة (اختياري)"
        title="اكتب كلمة المرور الجديدة هنا"
      />
    </div>
  ) : (
     user.phone
  )}
</td>
                <td className="p-4">
                  {editingId === user.id ? (
                    <select
                      value={editData.role}
                      onChange={e => setEditData({...editData, role: e.target.value})}
                      className="border rounded p-1 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none"
                    >
                      <option value="admin">مدير</option>
                      <option value="cashier">كاشير</option>
                    </select>
                  ) : (
                    <span className={`px-4 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300' : 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300'}`}>
                      {user.role === 'admin' ? 'مدير (Admin)' : 'كاشير (Cashier)'}
                    </span>
                  )}
                </td>
                <td className="p-4 flex justify-center gap-3">
                  {editingId === user.id ? (
                    <>
                      <button onClick={() => handleSaveEdit(user.id)} className="text-green-600 dark:text-green-400 font-bold hover:underline">حفظ</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500 dark:text-gray-400 font-bold hover:underline">إلغاء</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(user)} className="text-blue-500 dark:text-blue-400 font-bold hover:underline">تعديل</button>
                      <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 dark:text-red-400 font-bold hover:underline">حذف</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">لا يوجد مستخدمين (No users found)</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Users;