// ==========================================
// System: Alsalam Cafe POS
// Developer: Mahmoud M. A. Elhaj Ahmed
// ==========================================

import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
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
import Reservations from './pages/Reservations';
import Suppliers from './pages/Suppliers';
import CustomerMenu from './pages/CustomerMenu';

function NotificationBell({ customerOrders, tables, isDesktop, readOrderIds, onMarkAllAsRead, onOrderClick }) {
  const [isOpen, setIsOpen] = useState(false);

  const unreadOrders = customerOrders.filter(o => !readOrderIds.includes(o.id));
  const unreadCount = unreadOrders.length;

  const getTableName = (tableId) => {
    if (!tableId) return 'سفري';
    const t = tables.find(t => String(t.id) === String(tableId));
    return t ? t.name : tableId;
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[90]" 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
      
      <div className="relative z-[100]">
        <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 focus:outline-none">
          <span className="text-2xl hover:animate-ping block">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-gray-900 animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden text-right ${
            isDesktop 
              ? 'fixed top-[140px] right-[265px] w-80' 
              : 'fixed top-[65px] left-4 w-[90vw] max-w-[320px]'
          }`} dir="rtl">
            <div className="bg-red-600 text-white p-3 font-bold text-sm flex justify-between items-center">
              <span>طلبات الزبائن (المنيو)</span>
              {unreadCount > 0 && (
                <button 
                  onClick={() => {
                    onMarkAllAsRead();
                    setIsOpen(false);
                  }}
                  className="bg-white text-red-600 px-2 py-1 rounded-md text-xs font-bold hover:bg-gray-100 transition shadow-sm active:scale-95"
                >
                  تعيين الكل كمقروء ✓
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {customerOrders.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm font-bold">لا توجد طلبات زبائن خارجية حالياً</div>
              ) : (
                customerOrders.map(order => {
                  const isUnread = !readOrderIds.includes(order.id);
                  // إخفاء الختم عن الكاشير
                  const displayNotes = order.reservation_name ? order.reservation_name.replace('[QR]', '').trim() : '';

                  return (
                    <Link 
                      key={order.id} 
                      to={`/?load_order=${order.id}`} 
                      onClick={() => {
                        onOrderClick(order.id);
                        setIsOpen(false);
                      }}
                      className={`block p-3 border-b border-gray-100 dark:border-gray-700 transition-colors ${
                        isUnread 
                          ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40' 
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 opacity-80'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
                          {isUnread && <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm"></span>}
                          طاولة ({getTableName(order.table_id)})
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-bold text-sm">
                          ₪{order.total_amount}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 line-clamp-1 pr-4">
                        {displayNotes || 'بدون ملاحظات إضافية'}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold pr-4">
                        {order.items?.length || 0} أصناف - اضغط للتفاصيل
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Sidebar({ darkMode, setDarkMode, onLogout, user, isOpen, closeMenu, customerOrders, tables, readOrderIds, onMarkAllAsRead, onOrderClick }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-700';
  const isAdmin = user?.role === 'admin';

  return (
    <nav className={`w-64 bg-gray-900 flex flex-col p-4 transition-transform duration-300 z-50 h-full overflow-y-auto print:hidden fixed md:relative top-0 right-0 ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
      
      <button onClick={closeMenu} className="md:hidden text-gray-400 hover:text-white absolute top-4 left-4 text-2xl">
        &times;
      </button>

      <div className="text-center mb-2 mt-4 md:mt-2">
        <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 overflow-hidden rounded-full border-2 border-[#D4AF37] shadow-lg flex items-center justify-center bg-black">
          <img src="/logo.png" alt="السلام كافي" className="w-full h-full object-contain p-1" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white">السلام كافي</h2>
      </div>
      
      <div className="text-center text-gray-400 text-sm mb-6 border-b border-gray-700 pb-4 flex flex-col items-center relative">
        <span className="font-bold text-white text-lg">{user?.name}</span>
        <span className={`mt-1 px-3 py-1 rounded-full text-xs font-bold ${isAdmin ? 'bg-purple-900 text-purple-300' : 'bg-green-900 text-green-300'}`}>
          {isAdmin ? 'مدير عام (Admin)' : 'كاشير (Cashier)'}
        </span>
        
        <div className="hidden md:block absolute top-0 left-2">
          <NotificationBell 
            customerOrders={customerOrders} 
            tables={tables} 
            isDesktop={true} 
            readOrderIds={readOrderIds}
            onMarkAllAsRead={onMarkAllAsRead}
            onOrderClick={onOrderClick}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 mb-6">
        <Link to="/" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/')}`}>
          نقطة البيع (POS)
        </Link>
        <Link to="/reservations" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/reservations')}`}>الحجوزات (Reservations) ⏳</Link>
        <Link to="/customers" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/customers')}`}>إدارة الزبائن (Customers)</Link>
        <Link to="/debts" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/debts')}`}>إدارة الديون (Debts)</Link>
        
        {isAdmin && (
          <>
            <Link to="/dashboard" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/dashboard')}`}>لوحة التحكم (Dashboard)</Link>
            <Link to="/manage-menu" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/manage-menu')}`}>إدارة المنيو (Menu)</Link>
            <Link to="/suppliers" onClick={closeMenu} className={`p-3 rounded-lg font-bold transition-colors ${isActive('/suppliers')}`}>الموردين والتجار (Suppliers)</Link>
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
          Developed by:<br />Mahmoud M. A. Elhaj Ahmed
        </div>
      </div>
    </nav>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [openOrders, setOpenOrders] = useState([]); 
  const [tables, setTables] = useState([]); 
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  const [readOrderIds, setReadOrderIds] = useState(() => {
    const saved = localStorage.getItem('readOrderIds');
    return saved ? JSON.parse(saved) : [];
  });

  const prevCustomerOrdersIds = useRef([]);
  const isFirstLoad = useRef(true);
  const audioRef = useRef(typeof Audio !== "undefined" ? new Audio('/bell.mp3') : null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('readOrderIds', JSON.stringify(readOrderIds));
  }, [readOrderIds]);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [darkMode]);

  const fetchGlobalData = async () => {
    if (!user) return;
    try {
      const res = await axios.get('/pos-data');
      if (res.data) {
        setTables(res.data.tables || []); 
        setCategories(res.data.categories || []);
        setCustomers(res.data.customers || []);
        
        if (res.data.open_orders) {
          const allOrders = res.data.open_orders;
          setOpenOrders(allOrders);
          
          // --- التعديل السحري: الاعتماد على وجود ختم [QR] للتمييز بغض النظر عن الـ user_id ---
          const customerOrders = allOrders.filter(o => o.reservation_name && o.reservation_name.includes('[QR]'));
          const currentCustomerIds = customerOrders.map(o => o.id);
          
          if (!isFirstLoad.current) {
            const hasNewOrder = currentCustomerIds.some(id => !prevCustomerOrdersIds.current.includes(id));
            
            if (hasNewOrder) {
              if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(e => console.log("تحذير الصوت:", e));
              }
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("السلام كافي - طلب زبون جديد! 🛎️", {
                  body: "يوجد طلب جديد من المنيو الذكي.",
                  icon: "/logo.png" 
                });
              }
            }
          } else {
            isFirstLoad.current = false;
          }

          prevCustomerOrdersIds.current = currentCustomerIds;
          setReadOrderIds(prev => prev.filter(id => currentCustomerIds.includes(id)));
        }
      }
    } catch (err) {
      console.error("Error fetching global data:", err);
    }
  };

  useEffect(() => {
    fetchGlobalData(); 
    const interval = setInterval(fetchGlobalData, 10000); 
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleMarkAllAsRead = () => {
    const customerOrders = openOrders.filter(o => o.reservation_name && o.reservation_name.includes('[QR]'));
    const allCustomerIds = customerOrders.map(o => o.id);
    setReadOrderIds(allCustomerIds);
  };

  const handleOrderClick = (orderId) => {
    setReadOrderIds(prev => {
      if (!prev.includes(orderId)) {
        return [...prev, orderId];
      }
      return prev;
    });
  };

  const customerOrders = openOrders.filter(o => o.reservation_name && o.reservation_name.includes('[QR]'));

  return (
    <Router>
      <Routes>
        <Route path="/menu" element={<CustomerMenu />} />

        <Route path="/*" element={
          !user ? (
            <Login onLogin={(userData) => setUser(userData)} />
          ) : (
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors relative" dir="rtl">
              
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
                customerOrders={customerOrders} 
                tables={tables} 
                readOrderIds={readOrderIds}
                onMarkAllAsRead={handleMarkAllAsRead}
                onOrderClick={handleOrderClick}
              />
              
              <div className="flex-1 flex flex-col overflow-hidden h-screen w-full relative">
                
                <div className="md:hidden bg-gray-900 text-white p-3 flex justify-between items-center shrink-0 shadow-md z-30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-full border border-[#D4AF37] p-1 flex justify-center items-center">
                       <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-lg">السلام كافي</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <NotificationBell 
                      customerOrders={customerOrders} 
                      tables={tables} 
                      isDesktop={false} 
                      readOrderIds={readOrderIds}
                      onMarkAllAsRead={handleMarkAllAsRead}
                      onOrderClick={handleOrderClick}
                    />
                    
                    <button onClick={() => setIsMobileMenuOpen(true)} className="text-3xl focus:outline-none p-1">
                      ☰
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                  <Routes>
                    <Route path="/" element={<POS 
                      globalOpenOrders={openOrders} 
                      globalTables={tables} 
                      globalCategories={categories}
                      globalCustomers={customers}
                      refreshData={fetchGlobalData}
                    />} />
                    <Route path="/reservations" element={<Reservations />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/tables" element={<Tables />} />
                    <Route path="/debts" element={<Debts />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/manage-menu" element={<MenuManager />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/shift" element={<Shift />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/suppliers" element={<Suppliers />} />
                  </Routes>
                </div>
              </div>
            </div>
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;