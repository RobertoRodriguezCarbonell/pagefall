import { PageWrapper } from '@/components/page-wrapper'
import React from 'react'
import { VaultInterface } from './vault-interface'
import { getVaultData, getPendingInvitations } from '@/server/vaults'

const page = async () => {
    const [vaultResult, inviteResult] = await Promise.all([
        getVaultData(),
        getPendingInvitations()
    ]);

    const groups = vaultResult.success && vaultResult.groups ? vaultResult.groups : [];
    const invitations = inviteResult.success && inviteResult.invitations ? inviteResult.invitations : [];

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Password Vaults", href: "/dashboard/password-vaults" },
        ]}>
            <VaultInterface initialGroups={groups} initialInvitations={invitations} />
        </PageWrapper>
    )
}

export default page