import { useState, useMemo } from 'react';

export const useCart = () => {
    // حالة عناصر السلة (Cart Items State)
    const [cartItems, setCartItems] = useState([]);

    // دالة إضافة منتج للسلة (Add product to cart function)
    const addToCart = (product) => {
        setCartItems(prevItems => {
            // التحقق مما إذا كان المنتج موجوداً مسبقاً (Check if product already exists)
            const existingItem = prevItems.find(item => item.product_id === product.id);
            
            if (existingItem) {
                // إذا كان موجوداً، قم بزيادة الكمية وتحديث المجموع الفرعي (If exists, increase quantity and update subtotal)
                return prevItems.map(item =>
                    item.product_id === product.id
                        ? { 
                            ...item, 
                            quantity: item.quantity + 1, 
                            subtotal: (item.quantity + 1) * item.unit_price 
                          }
                        : item
                );
            }
            
            // إذا كان جديداً، أضفه كعنصر جديد (If new, add as a new item)
            return [...prevItems, {
                product_id: product.id,
                name: product.name,
                unit_price: parseFloat(product.price),
                quantity: 1,
                subtotal: parseFloat(product.price)
            }];
        });
    };

    // دالة تحديث الكمية (Update quantity function)
    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return; // منع الكميات السالبة أو الصفر (Prevent negative or zero quantities)
        
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.product_id === productId
                    ? { 
                        ...item, 
                        quantity: newQuantity, 
                        subtotal: newQuantity * item.unit_price 
                      }
                    : item
            )
        );
    };

    // دالة حذف منتج من السلة (Remove product from cart function)
    const removeFromCart = (productId) => {
        setCartItems(prevItems => prevItems.filter(item => item.product_id !== productId));
    };

    // دالة تفريغ السلة (Clear cart function)
    const clearCart = () => {
        setCartItems([]);
    };

    // حساب إجمالي السلة ديناميكياً (Dynamically calculate cart total)
    const cartTotal = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.subtotal, 0);
    }, [cartItems]);

    // إرجاع الدوال والبيانات لاستخدامها في الواجهة (Return functions and data for UI usage)
    return {
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal
    };
};