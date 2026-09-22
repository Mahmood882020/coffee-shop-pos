import { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    axios.post('/login', { phone, password })
      .then(res => {
        // حفظ بيانات الدخول محلياً (Save auth data locally)
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLogin(res.data.user);
      })
      .catch(err => {
        setError('رقم الجوال أو كلمة المرور غير صحيحة (Invalid phone or password)');
      });
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 transition-colors" dir="rtl">
      <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          
          {/* حاوية الشعار المعتمدة مع الحدود الذهبية والخلفية السوداء */}
          <div className="w-32 h-32 mx-auto mb-6 overflow-hidden rounded-full border-2 border-[#D4AF37] shadow-xl flex items-center justify-center bg-black">
            <img src="/logo.png" alt="السلام كافي" className="w-full h-full object-contain p-2" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">السلام كافي</h1>
          <p className="text-gray-500 dark:text-gray-400">تسجيل الدخول للنظام (Login)</p>
        </div>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center font-bold">{error}</div>}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الجوال (Phone Number)</label>
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-left" 
              dir="ltr"
              required 
            />
          </div>
          
          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">كلمة المرور (Password)</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-left" 
              dir="ltr"
              required 
            />
          </div>
          
          <button type="submit" className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition mt-2 text-lg">
            دخول (Enter)
          </button>
        </form>
        
        {/* اسم المطور */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8 font-sans" dir="ltr">
          Developed by: Mahmoud Mohammad Elhaj Ahmed
        </p>
      </div>
    </div>
  );
}

export default Login;