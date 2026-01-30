import { PageWrapper } from '@/components/page-wrapper'
import React from 'react'
import { VaultSettingsInterface } from './vault-settings-interface'
import { getVaultSettingsData } from '@/server/vaults'
import { redirect } from 'next/navigation'

interface PageProps {
    params: Promise<{
        vaultId: string
    }>
}

const page = async ({ params }: PageProps) => {
    // Await params first as instructed by Next.js 15+ patterns usually, though params is a promise in recent types?
    // The type helper above says params is a Promise.
    const { vaultId } = await params;
    
    const result = await getVaultSettingsData(vaultId);

    if (!result.success || !result.group) {
        // Redirect or show error if not authorized or not found
        // "Unauthorized" usually means not owner here
        redirect('/dashboard/password-vaults');
    }

    // members might be undefined if error, handled by default empty array
    const members = result.members || [];

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Password Vaults", href: "/dashboard/password-vaults" },
            { label: result.group.name, href: `/dashboard/password-vaults?group=${vaultId}` }, // hypothetical link
            { label: "Settings", href: `/dashboard/password-vaults/${vaultId}/settings` },
        ]}>
            <VaultSettingsInterface 
                vault={result.group} 
                initialMembers={members} 
            />
        </PageWrapper>
    )
}

export default page
