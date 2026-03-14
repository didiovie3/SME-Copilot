
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'accountant' | 'staff' | 'admin' | 'smeOwner' | 'superAdmin' | 'accountantAdmin';
  roleInCompany?: string;
  businessId?: string;
  status: 'pending' | 'active' | 'inactive';
  createdAt?: string;
  fcmTokens?: string[];
  clientList?: string[]; // List of business IDs assigned to this accountant
}

export interface TeamMember {
  id: string;
  uid?: string;
  email: string;
  role: 'owner' | 'accountant' | 'staff';
  inviteStatus: 'pending' | 'active';
  dateAdded: string;
  inviteToken?: string;
  inviteLink?: string;
  inviteExpiresAt?: string;
  businessName?: string;
  acceptedAt?: string;
}

export interface Subscription {
  tier: "free" | "pro" | "copilot";
  planName: string;
  monthlyAmount: number | null;
  status: "active" | "past_due" | "cancelled" | "trial";
  paymentStatus?: "paid" | "pending" | "overdue";
  lastPaymentDate?: string | null;
  lastPaymentAmount?: number | null;
  nextDueDate?: string | null;
  billingDate: number | null;
  nextBillingDate: string | null;
  subscribedAt: string | null;
  cancelledAt: string | null;
  businessSize?: "micro" | "small" | "medium" | "enterprise" | null;
  assignedAccountantName?: string | null;
  assignedAccountantId?: string | null;
  currency: "NGN";
}

export interface Business {
  id: string;
  ownerId: string;
  profile: {
    name: string;
    industry?: string;
    email: string;
    phone: string;
    salesPlatforms?: string[];
    companySize?: string;
    tin?: string;
    cac?: string;
    country: string;
    state: string;
    address: string;
    logoUrl?: string;
    branchOffices?: string;
  };
  subscription?: Subscription;
  createdAt?: string;
  lastActiveAt?: string;
  // Verification Fields
  tinVerified?: boolean;
  tinVerifiedAt?: string | null;
  tinRegisteredName?: string | null;
  tinVerificationError?: string | null;
  tinManuallyVerifiedBy?: string | null;
  tinManuallyVerifiedAt?: string | null;

  cacVerified?: boolean;
  cacVerifiedAt?: string | null;
  cacRegisteredName?: string | null;
  cacRegistrationDate?: string | null;
  cacStatus?: string | null;
  cacVerificationError?: string | null;
  cacManuallyVerifiedBy?: string | null;
  cacManuallyVerifiedAt?: string | null;

  isFullyVerified?: boolean;
  
  assignedAccountant?: {
    uid: string;
    name: string;
    assignedAt: string;
  };
}

export interface Client {
  id: string;
  businessId: string;
  ownerId: string;
  name: string;
  phone: string;
  email?: string;
  businessName?: string;
  type: 'individual' | 'business';
  address?: string;
  notes?: string;
  dateAdded: string;
}

export interface Transaction {
  id: string;
  businessId: string;
  ownerId: string;
  clientId?: string;
  type: 'income' | 'expense';
  amount: number;
  category: string; 
  categoryName: string;
  categoryGroup?: string;
  paymentMethod: 'cash' | 'transfer' | 'pos';
  timestamp: string;
  description?: string;
  clientName?: string;
  clientPhone?: string;
  clientOrigin?: string;
  items?: SoldItem[];
  extraDiscount?: number;
  receiptUrl?: string;
  isRecurring?: boolean; 
  isPayroll?: boolean;
  flagged?: boolean;
  flagNote?: string;
  flaggedAt?: string;
  flaggedBy?: string;
}

export interface SoldItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
}

export interface InventoryItem {
  id: string;
  businessId: string;
  ownerId: string;
  itemName: string;
  type: 'goods' | 'service';
  category: string;
  currentStock?: number;
  unitCost?: number;
  reorderPoint?: number;
  value?: number;
  imageUrl?: string;
  isArchived?: boolean;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
}

export interface Advice {
  id: string;
  businessId: string;
  content: string;
  adminName: string;
  timestamp: string;
  read: boolean;
  attachments?: Attachment[];
}

export interface Goal {
  id: string;
  businessId: string;
  amount: number;
  month: number;
  year: number;
  type: 'revenue';
}

export interface Feedback {
  id: string;
  userId: string;
  businessId: string;
  userName: string;
  businessName: string;
  type: 'bug' | 'feature' | 'improvement';
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'skipped';
  timestamp: string;
}

export interface RecurringExpense {
  id: string;
  businessId: string;
  ownerId: string;
  expenseName: string;
  categoryGroup: string;
  categoryName: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  nextDueDate: string;
  paymentMethod: 'cash' | 'transfer' | 'pos';
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface InvoiceItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  businessId: string;
  ownerId: string;
  clientId?: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  terms?: string;
  createdAt: string;
}

export interface ReportReview {
  id: string;
  businessId: string;
  businessName?: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  reviewerName?: string;
  reviewedAt?: string;
  status: 'pending' | 'approved' | 'changes_requested';
  timestamp?: string;
  reviewerNotes?: string;
  stampApplied?: boolean;
  summary?: {
    totalIncome?: number;
    totalExpense?: number;
    netIncome?: number;
  };
}

export interface PayrollStaff {
  id: string;
  businessId: string;
  ownerId: string;
  fullName: string;
  role: string;
  department?: string;
  monthlyGrossSalary: number;
  bankName: string;
  accountNumber: string;
  paymentDate: number; // Day of month (1-31)
  employmentType: 'full-time' | 'part-time' | 'contract';
  status: 'active' | 'inactive';
  dateAdded: string;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: 'low_stock' | 'goal' | 'overdue_invoice' | 'tax' | 'recurring' | 'payroll' | 'collaboration' | 'support';
  priority: 'high' | 'normal';
  link: string;
  read: boolean;
  timestamp: string;
}

export interface CollaborationItem {
  id: string;
  businessId: string;
  type: 'note' | 'flag' | 'document' | 'status_update' | 'review_complete';
  content: string;
  metadata?: {
    transactionId?: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    taskName?: string;
    reportId?: string;
  };
  createdBy: string;
  createdByName: string;
  timestamp: string;
  replies?: {
    content: string;
    createdBy: string;
    createdByName: string;
    timestamp: string;
  }[];
  readBy: string[]; // List of UIDs who have seen it
}

export interface AdminActivityLog {
  id: string;
  adminUid: string;
  adminName: string;
  action: string;
  targetType: 'business' | 'user' | 'subscription' | 'accountant' | 'report';
  targetId: string;
  targetName: string;
  details: string;
  timestamp: string;
}

export interface SupportMessage {
  id: string;
  businessId: string;
  businessName: string;
  senderUid: string;
  senderName: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: string;
  repliedAt?: string | null;
  replyMessage?: string | null;
  repliedBy?: string | null;
}
