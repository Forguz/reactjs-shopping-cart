import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);
const localStorageCartKey = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(localStorageCartKey)

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartProduct = cart.find(product => product.id === productId);
      console.log(cartProduct)
      if(cartProduct) {
        updateProductAmount({productId, amount: 1});
      } else {
        const { data: stock } = await api.get<Stock[]>('/stock')
        const { data: products } = await api.get<Omit<Product, 'amount'>[]>('/products');
        const addedProduct = products.find(product => product.id === productId);

        if(addedProduct) {
          const addedProductHasStock = stock.find(productStock => productStock.id === productId)?.amount
          if(addedProductHasStock && addedProductHasStock !== 0) {
            const newCartProduct = {...addedProduct, amount: 1};
            setCart([...cart, newCartProduct]);
            localStorage.setItem(localStorageCartKey, JSON.stringify([...cart, newCartProduct]));
          } else {
            toast.error('Produto fora de estoque.')
          }
        } else {
          toast.error('Produto inexistente.')
        }
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const filteredCart = cart.filter(product => product.id !== productId);
      
      setCart(filteredCart);
      localStorage.setItem(localStorageCartKey, JSON.stringify(filteredCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get<Stock[]>('/stock');
      const productToUpdate = cart.find(product => product.id === productId);
      const productStock = stock.find(productStock => productStock.id === productId);
      if(productToUpdate && productStock) {
        if(productToUpdate.amount + amount <= productStock.amount) {
          productToUpdate.amount += amount;
          const filteredCart = cart.filter(product => product.id !== productId);
          setCart([...filteredCart, productToUpdate]);
          localStorage.setItem(localStorageCartKey, JSON.stringify([...filteredCart, productToUpdate]));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
