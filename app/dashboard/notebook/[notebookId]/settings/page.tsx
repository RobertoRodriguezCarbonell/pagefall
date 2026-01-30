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

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: result.notebook.name, href: `/dashboard/notebook/${notebookId}` },
            { label: "Settings", href: `/dashboard/notebook/${notebookId}/settings` },
        ]}>
            <NotebookSettingsInterface 
                notebook={result.notebook} 
                initialMembers={members} 
            />
        </PageWrapper>
    )
}

export default page
