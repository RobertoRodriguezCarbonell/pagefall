"use client"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
    SidebarGroup, 
    SidebarGroupContent, 
    SidebarGroupLabel, 
    SidebarMenu, 
    SidebarMenuButton, 
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem
} from './ui/sidebar';
import { ChevronRight, File, Folder, ListTodo } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarDataProps {
    data: {
        navMain: {
            title: string;
            id: string;
            url: string;
            items: { title: string, url: string }[];
        }[];
    };
}

export function SidebarData({ data }: SidebarDataProps) {
    const [search] = useQueryState("search", { defaultValue: "" });
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

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
            <SidebarGroup>
                <SidebarGroupLabel>Notebooks</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {filteredData.map((item) => (
                            <Collapsible
                                key={item.title}
                                defaultOpen
                                className="group/collapsible"
                                asChild
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton tooltip={item.title}>
                                            <Folder />
                                            <span>{item.title}</span>
                                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton asChild isActive={pathname === `/dashboard/notebook/${item.id}/tasks`}>
                                                    <a href={`/dashboard/notebook/${item.id}/tasks`}>
                                                        <ListTodo />
                                                        <span>Tasks</span>
                                                    </a>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                            {item.items.map((subItem) => (
                                                <SidebarMenuSubItem key={subItem.title}>
                                                    <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                                        <a href={subItem.url}>
                                                            <File />
                                                            <span>{subItem.title}</span>
                                                        </a>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            
            <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroup>
                    <SidebarGroupLabel
                        asChild
                        className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                    >
                        <CollapsibleTrigger>
                            Integrations{" "}
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
