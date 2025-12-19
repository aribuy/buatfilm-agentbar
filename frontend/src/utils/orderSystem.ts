// Order ID Generation (Format: DDMMYYXXXXXX)
export const generateOrderId = (): string => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${day}${month}${year}${random}`;
};

// Order Token Generation (32+ characters)
export const generateOrderToken = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(36))
    .join('')
    .substring(0, 32);
};

// Unique Code for Bank Transfer (3 digits)
export const generateUniqueCode = (): number => {
  return Math.floor(100 + Math.random() * 900);
};

// Calculate Final Total
export const calculateTotal = (basePrice: number, uniqueCode: number): number => {
  return basePrice - uniqueCode;
};

// Bank Account Configuration
export const bankAccounts = {
  mandiri: {
    name: "Faisal heri setiawan",
    account: "1330018381608",
    code: "MANDIRI",
    logo: "https://cdn.scalev.id/icons/MANDIRI.png"
  },
  bsi: {
    name: "Faisal heri setiawan", 
    account: "5226288510",
    code: "BSI",
    logo: "https://cdn.scalev.id/icons/BT_bankbsi.png"
  }
};

// Order Status Types
export type OrderStatus = 'created' | 'pending' | 'paid' | 'failed' | 'expired';

// Order Interface
export interface Order {
  id: string;
  token: string;
  customerName: string;
  phone: string;
  email: string;
  basePrice: number;
  uniqueCode: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: Date;
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: Date;
  }>;
}