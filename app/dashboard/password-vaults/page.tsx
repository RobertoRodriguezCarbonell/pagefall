import { PageWrapper } from '@/components/page-wrapper'
import React from 'react'
import { VaultInterface } from './vault-interface'
import { getVaultData } from '@/server/vaults'

const page = async () => {
    const result = await getVaultData();
    const groups = result.success && result.groups ? result.groups : [];

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Password Vaults", href: "/dashboard/password-vaults" },
        ]}>
            <VaultInterface initialGroups={groups} />
        </PageWrapper>
    )
}

export default page