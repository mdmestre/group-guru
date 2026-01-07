import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { useContacts } from '@/hooks/useContacts';
import { User } from 'lucide-react';
import styles from './PipelineContact.module.css';

interface PipelineContactProps {
  contactId: string;
  stageId: string;
}

export const PipelineContact: React.FC<PipelineContactProps> = ({ contactId, stageId }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `contact-${contactId}`,
  });

  const { data: contacts, isLoading } = useContacts();
  const contact = contacts?.find(c => c.id === contactId);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isLoading) {
    return (
      <div className={styles.contact}>
        <Card className={styles.card}>
          <div className={styles.content}>
            <div className={styles.avatar}>
              <div className="animate-pulse bg-gray-200 rounded-full w-10 h-10" />
            </div>
            <div className={styles.info}>
              <div className="animate-pulse bg-gray-200 rounded h-4 w-24 mb-2" />
              <div className="animate-pulse bg-gray-200 rounded h-3 w-32" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.contact}
      {...attributes}
      {...listeners}
    >
      <Card className={styles.card}>
        <div className={styles.content}>
          <div className={styles.avatar}>
            <User className={styles.icon} />
          </div>
          <div className={styles.info}>
            <div className={styles.name}>{contact.name || contact.phone}</div>
            {contact.email && (
              <div className={styles.email}>{contact.email}</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PipelineContact;

