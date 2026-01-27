"use client"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './ui/sidebar';
import { ChevronRight, File } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface SidebarDataProps {
    data: {
        navMain: {
            title: string;
            items: { title: string, url: string }[];
        }[];
    };
}

export function SidebarData({ data }: SidebarDataProps) {
    const [search] = useQueryState("search", { defaultValue: "" });
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Use full data during SSR/Hydration to ensure match, then filter on client
    const sourceData = mounted ? data.navMain : data.navMain;

    const filteredData = sourceData.filter((item) => {
        if (!mounted) return true; // Always show all on server/initial render
        const notebooksMatches = item.title.toLowerCase().includes(search.toLowerCase());
        const noteMatches = item.items.some((note) => note.title.toLowerCase().includes(search.toLowerCase()));

        return notebooksMatches || noteMatches;
    })

    return (
        <>
            {filteredData.map((item) => (
                <Collapsible
                    key={item.title}
                    title={item.title}
                    defaultOpen
                    className="group/collapsible"
                >
                    <SidebarGroup>
                        <SidebarGroupLabel
                            asChild
                            className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                        >
                            <CollapsibleTrigger>
                                {item.title}{" "}
                                {item.items.length > 0 && (
                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                )}
                            </CollapsibleTrigger>
                        </SidebarGroupLabel>
                        <CollapsibleContent>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {item.items.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild isActive={item.isActive}>
                                                <a href={item.url}>
                                                    <File />
                                                    {item.title}
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>
            ))}
            <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroup>
                    <SidebarGroupLabel
                        asChild
                        className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                    >
                        <CollapsibleTrigger>
                            Integraciones{" "}
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a href="/dashboard/settings">
                                            <Image 
                                                src={mounted && theme === 'dark' ? '/openai-dark.svg' : '/openai-light.svg'}
                                                alt="OpenAI"
                                                width={28}
                                                height={28}
                                            />
                                            OpenAI
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </SidebarGroup>
            </Collapsible>
        </>
    )
}
