import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import POS from './pages/POS';
import Debts from './pages/Debts';
import Dashboard from './pages/Dashboard';
import Tables from './pages/Tables';
import MenuManager from './pages/MenuManager';
import Users from './pages/Users';
import Login from './pages/Login';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import Sales from './pages/Sales';
import Shift from './pages/Shift';
import Inventory from './pages/Inventory';

function Sidebar({ darkMode, setDarkMode, onLogout, user, isOpen, closeMenu }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-700';
  const isAdmin = user?.role === 'admin';

  return (
    <nav className={`w-64 bg-gray-900 flex flex-col p-4 transition-transform duration-300 z-50 h-full overflow-y-auto print:hidden fixed md:relative top-0 right-0 ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
      
      {/* زر إغلاق القائمة في شاشات الجوال */}
      <button onClick={closeMenu} className="md:hidden text-gray-400 hover:text-white absolute top-4 left-4 text-2xl">
        &times;
      </button>

      <div className="text-center mb-2 mt-4 md:mt-2">
        <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 overflow-hidden rounded-full border-2 border-[#D4AF37] shadow-lg flex items-center justify-center bg-black">
          <img src="/logo.png" alt="السلام كافي" className="w-full h-full object-contain p-1" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white">السلام كافي</h2>
      </div>
      
      <div className="text-center text-gray-400 text-sm mb-6 border-b border-gray-700 pb-4 flex flex-col items-center">
        <span className="font-bold text-white text-lg">{user?.name}</span>
        <span className={`mt-1 px-3 py-1 rounded-full text-xs font-bold ${isAdmin ? 'bg-purple-900 text-purple-300' : 'bg-green-900 text-green-300'}`}>
          {isAdmin ? 'مدير عام (Admin)' : 'كاشير (Cashier)'}
        </span>
      </div>

      <div className="flex flex-col gap-2 flex-1 mb-6">
        <Link to="/" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/')}`}>نقطة البيع (POS)</Link>
        <Link to="/customers" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/customers')}`}>إدارة الزبائن (Customers)</Link>
        <Link to="/debts" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/debts')}`}>إدارة الديون (Debts)</Link>
        
        {isAdmin && (
          <>
            <Link to="/dashboard" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/dashboard')}`}>لوحة التحكم (Dashboard)</Link>
            <Link to="/menu" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/menu')}`}>إدارة المنيو (Menu)</Link>
            <Link to="/inventory" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/inventory')}`}>إدارة المخزن (Inventory)</Link>
            <Link to="/users" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/users')}`}>إدارة المستخدمين (Users)</Link>
            <Link to="/tables" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/tables')}`}>إدارة الطاولات (Tables)</Link>
            <Link to="/expenses" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/expenses')}`}>المصروفات (Expenses)</Link>
            <Link to="/sales" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/sales')}`}>سجل المبيعات (Sales)</Link>
            <Link to="/shift" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/shift')}`}>الوردية والصندوق (Shift)</Link>
          </>
        )}
      </div>
      
      <div className="mt-auto flex flex-col gap-3 shrink-0">
        <button onClick={() => setDarkMode(!darkMode)} className="bg-gray-800 text-white p-3 rounded-lg font-bold hover:bg-gray-700 border border-gray-600">
          {darkMode ? '☀️ وضع نهاري' : '🌙 وضع ليلي'}
        </button>

        <button onClick={onLogout} className="bg-red-600 text-white p-3 rounded-lg font-bold hover:bg-red-700 transition">
          تسجيل خروج (Logout)
        </button>
        <div className="text-center text-xs text-gray-500 mt-2 border-t border-gray-700 pt-3 font-sans" dir="ltr">
          Developed by:<br />Mahmoud Mohammad Elhaj Ahmed
        </div>
      </div>
    </nav>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [user, setUser] = useState(null);
  
  // حالة فتح وإغلاق القائمة في الجوال
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={(userData) => setUser(userData)} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors relative" dir="rtl">
        
        {/* خلفية معتمة عند فتح القائمة في الجوال */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        <Sidebar 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
          onLogout={handleLogout} 
          user={user} 
          isOpen={isMobileMenuOpen}
          closeMenu={() => setIsMobileMenuOpen(false)}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden h-screen w-full relative">
          
          {/* شريط علوي يظهر فقط في الجوال */}
          <div className="md:hidden bg-gray-900 text-white p-3 flex justify-between items-center shrink-0 shadow-md z-30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-full border border-[#D4AF37] p-1 flex justify-center items-center">
                 <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-lg">السلام كافي</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-3xl focus:outline-none p-1">
              ☰
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <Routes>
              <Route path="/" element={<POS />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/tables" element={<Tables />} />
              <Route path="/debts" element={<Debts />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/menu" element={<MenuManager />} />
              <Route path="/users" element={<Users />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/shift" element={<Shift />} />
              <Route path="/inventory" element={<Inventory />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;