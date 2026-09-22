import { useState, useEffect } from 'react';
import axios from 'axios';

function Shift() {
  const [shiftData, setShiftData] = useState(null);
  const [startingCash, setStartingCash] = useState('');
  const [actualCash, setActualCash] = useState('');

  const fetchCurrentShift = () => {
    axios.get('/shifts/current')
      .then(res => setShiftData(res.data))
      .catch(err => console.error("خطأ في جلب بيانات الوردية", err));
  };

  useEffect(() => { fetchCurrentShift(); }, []);

  const handleOpenShift = () => {
    if (startingCash === '') return alert('يرجى إدخال مبلغ العهدة النقدية');
    axios.post('/shifts/open', { starting_cash: startingCash })
      .then(() => { fetchCurrentShift(); setStartingCash(''); })
      .catch(err => alert(err.response?.data?.message || 'خطأ في فتح الوردية'));
  };

  const handleCloseShift = () => {
    if (actualCash === '') return alert('يرجى إدخال الكاش الفعلي الموجود في الدرج');
    const expected = shiftData.expected_cash;
    const difference = parseFloat(actualCash) - expected;
    
    let confirmMsg = `الكاش المتوقع: ₪${expected}\nالكاش الفعلي: ₪${actualCash}\n`;
    confirmMsg += difference === 0 ? "الصندوق مطابق تماماً." : (difference > 0 ? `يوجد زيادة بقيمة: ₪${difference}` : `يوجد عجز بقيمة: ₪${Math.abs(difference)}`);
    confirmMsg += "\n\nهل أنت متأكد من إغلاق الوردية؟";

    if (!window.confirm(confirmMsg)) return;

    axios.post('/shifts/close', { actual_cash: actualCash })
      .then(() => { fetchCurrentShift(); setActualCash(''); alert('تم إغلاق الوردية بنجاح!'); })
      .catch(err => alert('خطأ في إغلاق الوردية'));
  };

  return (
    <div className="p-8 font-sans h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">إدارة الوردية والصندوق</h1>

      {!shiftData ? (
        <div className="text-center text-gray-500">جاري التحميل...</div>
      ) : !shiftData.has_open_shift ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 max-w-md mx-auto text-center mt-10">
          <div className="text-6xl mb-4">🔓</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">فتح وردية جديدة</h2>
          <div className="mb-6 text-right">
            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">الكاش المبدئي في الدرج (العهدة) ₪:</label>
            <input 
              type="number" 
              value={startingCash} 
              onChange={e => setStartingCash(e.target.value)} 
              className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 text-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 text-center"
              min="0"
            />
          </div>
          <button onClick={handleOpenShift} className="w-full bg-blue-600 text-white font-bold text-xl py-3 rounded-lg hover:bg-blue-700 transition-all shadow-md">
            بدء الدوام (فتح الوردية)
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 flex justify-between items-center">
            <div>
              <p className="text-gray-500 dark:text-gray-400 font-bold mb-1">وقت فتح الوردية</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white" dir="ltr">{new Date(shiftData.shift.opened_at).toLocaleString('ar-EG')}</p>
            </div>
            <div className="px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full font-bold animate-pulse">
              الوردية نشطة الآن
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* تم تصحيح لون خلفية بطاقة الكاش المبدئي هنا */}
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
              <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">الكاش المبدئي</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">₪{parseFloat(shiftData.shift.starting_cash).toFixed(2)}</p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/40 p-6 rounded-xl border border-blue-100 dark:border-blue-800 text-center shadow-sm">
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">مبيعات نقدية جديدة</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">+ ₪{shiftData.current_cash_sales.toFixed(2)}</p>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/40 p-6 rounded-xl border border-red-100 dark:border-red-800 text-center shadow-sm">
              <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">المصروفات النقدية</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">- ₪{shiftData.current_expenses.toFixed(2)}</p>
            </div>
            
            <div className="bg-green-100 dark:bg-green-900/80 p-6 rounded-xl border border-green-300 dark:border-green-700 text-center shadow-inner">
              <p className="text-sm font-bold text-green-800 dark:text-green-300 mb-2">الكاش المتوقع بالدرج</p>
              <p className="text-3xl font-bold text-green-900 dark:text-white">₪{shiftData.expected_cash.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mt-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 border-b pb-4 dark:border-gray-700">تقفيل الصندوق</h2>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">قم بعد النقود في الدرج وأدخل الكاش الفعلي ₪:</label>
                <input 
                  type="number" 
                  value={actualCash} 
                  onChange={e => setActualCash(e.target.value)} 
                  className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 text-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:border-red-500 font-bold"
                  min="0"
                />
              </div>
              <button onClick={handleCloseShift} className="bg-red-600 text-white font-bold text-xl px-8 py-3 rounded-lg hover:bg-red-700 transition-all shadow-md h-[56px]">
                إغلاق الوردية
              </button>
            </div>
            {actualCash !== '' && (
              <div className={`mt-4 p-4 rounded-lg font-bold text-center ${parseFloat(actualCash) === shiftData.expected_cash ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'}`}>
                {parseFloat(actualCash) === shiftData.expected_cash ? 'ممتاز، الصندوق مطابق للتوقعات.' : `الفرق (العجز/الزيادة): ₪${(parseFloat(actualCash) - shiftData.expected_cash).toFixed(2)}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Shift;