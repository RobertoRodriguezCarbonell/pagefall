"use client"

import { getNotebooks } from '@/server/notebooks'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './ui/sidebar';
import { ChevronRight, File } from 'lucide-react';
import { useQueryState } from 'nuqs';

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

    const filteredData = data.navMain.filter((item) => {
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
        </>
    )
}
