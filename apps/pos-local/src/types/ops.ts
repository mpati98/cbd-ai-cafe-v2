export type OrderItemRow = {
  id: string;
  menuItemId: string | null;
  nameSnapshot: string;
  priceVndSnapshot: number;
  quantity: number;
};

export type Order = {
  id: string;
  customerName: string | null;
  customerNote: string | null;
  adminNote: string | null;
  tableLabel: string | null;
  totalVnd: number;
  isReceived: boolean;
  isPreparing: boolean;
  isPaid: boolean;
  isDelivered: boolean;
  isCancelled: boolean;
  items: OrderItemRow[];
  syncStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type TableRow = {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  createdAt: string;
};

export type PrintPhoto = {
  id: string;
  careerName: string;
  isPrinted: boolean;
  createdAt: string;
};
