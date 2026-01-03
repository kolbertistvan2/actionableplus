import { TMessage } from 'librechat-data-provider';
import Files from './Files';

const Container = ({ children, message }: { children: React.ReactNode; message?: TMessage }) => (
  <div
    className="text-message flex min-h-[20px] flex-col items-start gap-3 overflow-visible [.text-message+&]:mt-5"
    dir="auto"
  >
    {/* Show files for user uploads OR AI-generated images */}
    {(message?.isCreatedByUser === true || (message?.files && message.files.length > 0)) && (
      <Files message={message} />
    )}
    {children}
  </div>
);

export default Container;
