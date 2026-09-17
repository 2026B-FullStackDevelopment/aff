import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/shared/components/Button';
import { PageHeader } from '@/shared/components/PageHeader';
import { Panel } from '@/shared/components/Panel';
import { cn } from '@/shared/utils';
import { CreateCourierForm } from '../components/CreateCourierForm/CreateCourierForm';

/** Admin page for creating a Courier USER and profile together. */
export function CreateCourierPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
      <PageHeader
        theme="admin"
        title="Create Courier account"
        description="Add a Courier and set their sign-in credentials."
        actions={
          <Link
            to="/admin/user-directory"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-10 border-admin-border bg-white px-4 text-admin-title')}
          >
            <ArrowLeft aria-hidden="true" />
            User directory
          </Link>
        }
      />

      <Panel className="border-admin-border/50 shadow-[0_2px_8px_rgba(0,35,111,0.08)]" contentClassName="p-5 sm:p-7">
        <CreateCourierForm />
      </Panel>
    </div>
  );
}

export default CreateCourierPage;
