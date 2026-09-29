// ==========================================
// System: Alsalam Cafe POS
// Developer: Mahmoud M. A. Elhaj Ahmed
// ==========================================

import { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

function Tables() {
  const [tables, setTables] = useState([]);
  const [name, setName] = useState('');
  const [zone, setZone] = useState('family');
  const [editingId, setEditingId] = useState(null);

  const fetchTables = () => {
    axios.get('/tables').then(res => setTables(res.data)).catch(console.error);
  };

  useEffect(() => { fetchTables(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { name, zone };
    const req = editingId ? axios.put(`/tables/${editingId}`, data) : axios.post('/tables', data);
    
    req.then(() => {
      setName('');
      setZone('family');
      setEditingId(null);
      fetchTables();
    }).catch(console.error);
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setName(t.name);
    setZone(t.zone);
  };

  const handleDelete = (id) => {
    if(window.confirm('هل أنت متأكد من الحذف؟')) {
      axios.delete(`/tables/${id}`).then(fetchTables).catch(console.error);
    }
  };

  // دالة لطباعة رمز الـ QR للطاولة المحددة
  const printQRCode = (tableId, tableName) => {
    // استخدم نطاق موقعك الحقيقي هنا
    const menuUrl = `https://mistyrose-magpie-998093.hostingersite.com/menu?table=${tableId}`;
    
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>طباعة QR - طاولة ${tableName}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            .ticket { border: 2px dashed #000; padding: 20px; display: inline-block; }
            h2 { margin: 0 0 10px 0; }
            p { margin: 0 0 15px 0; font-size: 14px; color: #555; }
            .qr-container { display: flex; justify-content: center; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <h2>السلام كافي</h2>
            <p>امسح الرمز لطلب ضيافتك - طاولة (${tableName})</p>
            <div id="qr-target"></div>
          </div>
          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
      </html>
    `);
    
    // حقن كود الـ SVG داخل نافذة الطباعة
    const svgString = document.getElementById(`qr-hidden-${tableId}`).outerHTML;
    printWindow.document.getElementById('qr-target').innerHTML = svgString;
    printWindow.document.close();
  };

  return (
    // التعديل 1: إضافة h-full overflow-y-auto pb-20 للسكرول وتوحيد ألوان الخلفية
    <div className="p-4 bg-gray-50 dark:bg-gray-900 h-full overflow-y-auto pb-20" dir="rtl">
      {/* التعديل 2: توحيد لون العنوان */}
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">إدارة الطاولات (Tables Management)</h2>
      
      {/* التعديل 3: توحيد ألوان نموذج الإدخال */}
      <form onSubmit={handleSubmit} className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg flex gap-4 items-end shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-bold">اسم الطاولة (Table Name)</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="مثال: T1, F4..." />
        </div>
        <div className="flex-1">
          <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-bold">القسم (Zone)</label>
          <select value={zone} onChange={e => setZone(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none font-bold">
            <option value="family">العائلات (Family)</option>
            <option value="youth">الشباب (Youth)</option>
          </select>
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold shadow-md transition-colors">
          {editingId ? 'تحديث (Update)' : 'إضافة (Add)'}
        </button>
      </form>

      {/* التعديل 4: توحيد ألوان الجدول */}
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
        <table className="w-full text-center text-gray-800 dark:text-white">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="p-3 text-gray-600 dark:text-gray-300">ID</th>
              <th className="p-3 text-gray-600 dark:text-gray-300">اسم الطاولة (Table Name)</th>
              <th className="p-3 text-gray-600 dark:text-gray-300">القسم (Zone)</th>
              <th className="p-3 text-gray-600 dark:text-gray-300">رمز الطلب الذكي (QR)</th>
              <th className="p-3 text-gray-600 dark:text-gray-300">الإجراء (Action)</th>
            </tr>
          </thead>
          <tbody>
            {tables.map(t => (
              <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <td className="p-3 font-mono text-gray-500 dark:text-gray-400">#{t.id}</td>
                <td className="p-3 font-bold">{t.name}</td>
                <td className="p-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.zone === 'family' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'}`}>
                    {t.zone === 'family' ? 'عائلات' : 'شباب'}
                  </span>
                </td>
                <td className="p-3">
                  {/* إخفاء الرمز في الصفحة وعرضه فقط عند الطباعة */}
                  <div className="hidden">
                    <QRCodeSVG 
                      id={`qr-hidden-${t.id}`} 
                      value={`https://mistyrose-magpie-998093.hostingersite.com/menu?table=${t.id}`} 
                      size={150} 
                      level={"H"} 
                      includeMargin={true} 
                    />
                  </div>
                  <button onClick={() => printQRCode(t.id, t.name)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded font-bold text-sm transition-colors shadow-sm">
                    🖨️ طباعة QR
                  </button>
                </td>
                <td className="p-3">
                  <button onClick={() => handleEdit(t)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mx-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded font-bold transition-colors">تعديل</button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 mx-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-1 rounded font-bold transition-colors">حذف</button>
                </td>
              </tr>
            ))}
            {tables.length === 0 && (
               <tr>
                  <td colSpan="5" className="p-6 text-gray-500 font-bold">لا توجد طاولات مضافة حالياً.</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Tables;