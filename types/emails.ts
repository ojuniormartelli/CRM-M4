
export interface EmailMessage {
  id: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  body: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
  is_read: boolean;
  is_starred: boolean;
  created_at: string;
  lead_id?: string;
  company_id?: string;
  contact_id?: string;
}
