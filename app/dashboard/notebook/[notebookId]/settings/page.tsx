import { PageWrapper } from '@/components/page-wrapper'
import React from 'react'
import { NotebookSettingsInterface } from './notebook-settings-interface'
import { getNotebookSettingsData } from '@/server/notebooks'
import { redirect } from 'next/navigation'

interface PageProps {
    params: Promise<{
        notebookId: string
    }>
}

const page = async ({ params }: PageProps) => {
    const { notebookId } = await params;
    
    // Check ownership and get data
    const result = await getNotebookSettingsData(notebookId);

    if (!result.success || !result.notebook) {
        // If not owner or not found, redirect to notebook view (or dashboard)
        redirect('/dashboard');
    }

    const members = result.members || [];
    
    // Transform dates to ensure they are strictly Date objects, handling potential nulls
    const notebookData = {
        ...result.notebook,
        createdAt: result.notebook.createdAt || new Date()
    };
    
    // Transform members similarly
    const membersData = members.map(m => ({
        ...m,
        createdAt: m.createdAt || new Date()
    }));

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: result.notebook.name, href: `/dashboard/notebook/${notebookId}` },
            { label: "Settings", href: `/dashboard/notebook/${notebookId}/settings` },
        ]}>
            <NotebookSettingsInterface 
                notebook={notebookData} 
                initialMembers={membersData} 
            />
        </PageWrapper>
    )
}

export default page
