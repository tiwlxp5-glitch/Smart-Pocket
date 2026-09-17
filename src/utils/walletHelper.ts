export type WalletType = 'cash' | 'bank' | 'ewallet' | 'credit';

export interface Wallet {
  id: string;
  user_id?: string;
  name: string;
  type: WalletType;
  bank_name?: string | null;
  color: string;
  icon?: string | null;
  opening_balance?: number;
  balance: number;
  is_default?: boolean;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BankPreset {
  id: string;
  name: string;
  code: string;
  color: string;
  textColor: string;
  type: WalletType;
  keywords: string[];
}

export const BANK_PRESETS: BankPreset[] = [
  {
    id: 'kbank',
    name: 'ธนาคารกสิกรไทย (KBank)',
    code: 'kbank',
    color: '#138f2d',
    textColor: '#ffffff',
    type: 'bank',
    keywords: ['kbank', 'kasikorn', 'กสิกร', 'กสิกรไทย', '004'],
  },
  {
    id: 'scb',
    name: 'ธนาคารไทยพาณิชย์ (SCB)',
    code: 'scb',
    color: '#4e2a84',
    textColor: '#ffffff',
    type: 'bank',
    keywords: ['scb', 'siam commercial', 'ไทยพาณิชย์', '014'],
  },
  {
    id: 'bbl',
    name: 'ธนาคารกรุงเทพ (BBL)',
    code: 'bbl',
    color: '#1e3a8a',
    textColor: '#ffffff',
    type: 'bank',
    keywords: ['bbl', 'bangkok bank', 'กรุงเทพ', '002'],
  },
  {
    id: 'ktb',
    name: 'ธนาคารกรุงไทย (KTB)',
    code: 'ktb',
    color: '#00a5e5',
    textColor: '#ffffff',
    type: 'bank',
    keywords: ['ktb', 'krungthai', 'กรุงไทย', 'เป๋าตัง', '006'],
  },
  {
    id: 'ttb',
    name: 'ธนาคารทหารไทยธนชาต (ttb)',
    code: 'ttb',
    color: '#002d63',
    textColor: '#ffffff',
    type: 'bank',
    keywords: ['ttb', 'tmb', 'thanachart', 'ทหารไทย', 'ธนชาต', '011'],
  },
  {
    id: 'bay',
    name: 'ธนาคารกรุงศรีอยุธยา (BAY)',
    code: 'bay',
    color: '#ffbe00',
    textColor: '#451a03',
    type: 'bank',
    keywords: ['bay', 'krungsri', 'กรุงศรี', 'อยุธยา', '025'],
  },
  {
    id: 'gsb',
    name: 'ธนาคารออมสิน (GSB)',
    code: 'gsb',
    color: '#eb1985',
    textColor: '#ffffff',
    type: 'bank',
    keywords: ['gsb', 'ออมสิน', '030'],
  },
  {
    id: 'truemoney',
    name: 'TrueMoney Wallet',
    code: 'truemoney',
    color: '#ff8200',
    textColor: '#ffffff',
    type: 'ewallet',
    keywords: ['truemoney', 'true wallet', 'ทรูมันนี่'],
  },
  {
    id: 'rabbitlinepay',
    name: 'LINE Pay',
    code: 'rabbitlinepay',
    color: '#00c300',
    textColor: '#ffffff',
    type: 'ewallet',
    keywords: ['line pay', 'rabbit line pay', 'ไลน์เพย์'],
  },
  {
    id: 'shopeepay',
    name: 'ShopeePay',
    code: 'shopeepay',
    color: '#ee4d2d',
    textColor: '#ffffff',
    type: 'ewallet',
    keywords: ['shopeepay', 'airpay', 'ช้อปปี้เพย์'],
  },
  {
    id: 'cash',
    name: 'เงินสด (Cash)',
    code: 'cash',
    color: '#10b981',
    textColor: '#ffffff',
    type: 'cash',
    keywords: ['เงินสด', 'cash'],
  },
  {
    id: 'credit_general',
    name: 'บัตรเครดิต (Credit Card)',
    code: 'credit_general',
    color: '#6366f1',
    textColor: '#ffffff',
    type: 'credit',
    keywords: ['บัตรเครดิต', 'credit card', 'visa', 'mastercard'],
  },
];

export function getWalletTypeLabel(type: WalletType): string {
  switch (type) {
    case 'cash':
      return 'เงินสด';
    case 'bank':
      return 'บัญชีธนาคาร';
    case 'ewallet':
      return 'E-Wallet';
    case 'credit':
      return 'บัตรเครดิต';
    default:
      return 'ทั่วไป';
  }
}

export function detectBankFromText(text: string | null | undefined): BankPreset | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const preset of BANK_PRESETS) {
    for (const keyword of preset.keywords) {
      if (lower.includes(keyword)) {
        return preset;
      }
    }
  }
  return null;
}

export function validateTransfer(
  fromWallet: { id: string; balance: number; name: string } | null,
  toWallet: { id: string; balance: number; name: string } | null,
  amount: number,
  fee: number = 0
): { valid: boolean; error?: string } {
  if (!fromWallet) {
    return { valid: false, error: 'กรุณาเลือกกระเป๋าต้นทาง' };
  }
  if (!toWallet) {
    return { valid: false, error: 'กรุณาเลือกกระเป๋าปลายทาง' };
  }
  if (fromWallet.id === toWallet.id) {
    return { valid: false, error: 'ไม่สามารถโอนไปยังกระเป๋าเดียวกันได้' };
  }
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'จำนวนเงินที่โอนต้องมากกว่า 0 บาท' };
  }
  if (isNaN(fee) || fee < 0) {
    return { valid: false, error: 'ค่าธรรมเนียมต้องไม่ติดลบ' };
  }
  return { valid: true };
}

export function calculateNetWorth(wallets: Wallet[]): {
  totalAssets: number;
  totalDebts: number;
  netWorth: number;
} {
  let totalAssets = 0;
  let totalDebts = 0;

  for (const wallet of wallets) {
    if (wallet.is_archived) continue;
    const bal = Number(wallet.balance) || 0;

    if (wallet.type === 'credit') {
      if (bal < 0) {
        totalDebts += Math.abs(bal);
      } else {
        totalAssets += bal;
      }
    } else {
      if (bal >= 0) {
        totalAssets += bal;
      } else {
        totalDebts += Math.abs(bal);
      }
    }
  }

  return {
    totalAssets,
    totalDebts,
    netWorth: totalAssets - totalDebts,
  };
}
