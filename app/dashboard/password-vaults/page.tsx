import { PageWrapper } from '@/components/page-wrapper'
import React from 'react'
import { VaultInterface } from './vault-interface'

const page = () => {
    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Password Vaults", href: "/dashboard/password-vaults" },
        ]}>
            <VaultInterface />
        </PageWrapper>
    )
}

export default page